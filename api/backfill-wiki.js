// api/backfill-wiki.js
// One-shot admin endpoint: backfill bio fields from Wikipedia/Wikidata sources.
//
// What it updates in Supabase (players table):
// - hand: Right/Left
// - bh: 1HBH/2HBH
// - height_cm: integer (cm)
//
// Auth: Authorization: Bearer <CRON_SECRET>
// Query params:
// - force=1  -> overwrite existing values
// - limit=50 -> max players processed
//
// This intentionally avoids RapidAPI usage (quota-friendly).

const WIKI_API = 'https://en.wikipedia.org/w/api.php';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWithRetry(url, options = {}, maxAttempts = 5) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    const res = await fetch(url, options);
    if (res.status !== 429) return res;

    // Exponential backoff with jitter for Wikipedia rate limits.
    const delayMs = Math.min(8000, 400 * (2 ** (attempt - 1))) + Math.floor(Math.random() * 250);
    await sleep(delayMs);
  }
  throw new Error('Wikipedia rate limit persisted after retries (429)');
}

function normalizeNameForSearch(name) {
  return `${name} tennis`;
}

function parsePlaysField(playsRaw) {
  if (!playsRaw) return { hand: null, bh: null };
  const text = String(playsRaw).toLowerCase();

  let hand = null;
  if (text.includes('left')) hand = 'Left';
  if (text.includes('right')) hand = 'Right';

  let bh = null;
  if (text.includes('one-handed') || text.includes('one handed') || text.includes('1-handed') || text.includes('1 handed')) {
    bh = '1HBH';
  }
  if (text.includes('two-handed') || text.includes('two handed') || text.includes('2-handed') || text.includes('2 handed')) {
    bh = '2HBH';
  }

  return { hand, bh };
}

function parseHeightCm(heightRaw) {
  if (!heightRaw) return null;
  const text = String(heightRaw);

  // Prefer explicit cm if present: "1.88 m (6 ft 2 in)" or "188 cm"
  const cmMatch = text.match(/(\d{3})\s*cm/i);
  if (cmMatch) return Number.parseInt(cmMatch[1], 10);

  // meters: "1.88 m"
  const mMatch = text.match(/(\d(?:\.\d+)?)\s*m\b/i);
  if (mMatch) return Math.round(Number.parseFloat(mMatch[1]) * 100);

  return null;
}

function extractInfoboxParam(wikitext, paramName) {
  // Simple (but robust enough) infobox param extraction:
  // matches lines like: | plays = Right-handed (two-handed backhand)
  // supports whitespace and capitalization.
  const re = new RegExp(`\\n\\|\\s*${paramName}\\s*=\\s*([^\\n\\r]+)`, 'i');
  const m = wikitext.match(re);
  return m ? m[1].trim() : null;
}

function stripWikiMarkup(value) {
  if (!value) return null;
  let v = String(value);
  v = v.replace(/<ref[^>]*>.*?<\/ref>/gi, '');
  v = v.replace(/<ref[^/>]*\/>/gi, '');
  v = v.replace(/\{\{.*?\}\}/g, ''); // remove templates (best-effort)
  v = v.replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1'); // [[a|b]] -> b
  v = v.replace(/''+/g, '');
  v = v.replace(/\s+/g, ' ').trim();
  return v || null;
}

async function wikiSearchTitle(query) {
  const url = `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Wikipedia search failed: ${res.status}`);
  const json = await res.json();
  const results = json?.query?.search || [];
  return results[0]?.title || null;
}

async function wikiGetWikitextByTitle(title) {
  const url = `${WIKI_API}?action=query&prop=revisions&rvprop=content&rvslots=main&formatversion=2&format=json&origin=*&titles=${encodeURIComponent(title)}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Wikipedia page fetch failed: ${res.status}`);
  const json = await res.json();
  const page = json?.query?.pages?.[0];
  const wikitext = page?.revisions?.[0]?.slots?.main?.content;
  return wikitext || null;
}

module.exports = async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  const force = req.query.force === '1';
  const limit = Math.max(1, Math.min(200, Number.parseInt(req.query.limit || '40', 10) || 40));
  const offset = Math.max(0, Number.parseInt(req.query.offset || '0', 10) || 0);

  try {
    // Fetch all players (we backfill bios regardless of rapid_id).
    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/players?select=id,name,hand,bh,height_cm&order=name.asc`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (!dbRes.ok) throw new Error(`Supabase fetch failed: ${dbRes.status}`);
    const players = await dbRes.json();

    const report = {
      ok: true,
      force,
      limit,
      offset,
      processed: 0,
      updated: 0,
      skipped: [],
      errors: [],
      changes: [],
    };

    for (const player of players.slice(offset, offset + limit)) {
      report.processed++;

      try {
        const title = await wikiSearchTitle(normalizeNameForSearch(player.name));
        if (!title) {
          report.skipped.push(`${player.name} (no Wikipedia match)`);
          continue;
        }

        const wikitext = await wikiGetWikitextByTitle(title);
        if (!wikitext) {
          report.skipped.push(`${player.name} (no wikitext)`);
          continue;
        }

        const playsRaw = stripWikiMarkup(extractInfoboxParam(wikitext, 'plays'));
        const heightRaw = stripWikiMarkup(extractInfoboxParam(wikitext, 'height'));

        const { hand, bh } = parsePlaysField(playsRaw);
        const heightCm = parseHeightCm(heightRaw);

        const patch = {};
        if (force || !player.hand) {
          if (hand) patch.hand = hand;
        }
        if (force || !player.bh) {
          if (bh) patch.bh = bh;
        }
        if (force || !player.height_cm) {
          if (heightCm) patch.height_cm = heightCm;
        }

        if (!Object.keys(patch).length) {
          report.skipped.push(`${player.name} (no new bio data from Wikipedia)`);
          continue;
        }

        patch.updated_at = new Date().toISOString();

        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/players?id=eq.${player.id}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(patch),
        });
        if (!patchRes.ok) throw new Error(`Supabase PATCH failed: ${patchRes.status}`);

        report.updated++;
        report.changes.push({ name: player.name, wiki_title: title, ...patch });

        // Be polite to Wikipedia to avoid 429 responses.
        await sleep(650);
      } catch (err) {
        report.errors.push({ name: player.name, error: err.message });
      }
    }

    report.timestamp = new Date().toISOString();
    return res.status(200).json(report);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

