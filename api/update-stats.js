// api/update-stats.js
// Vercel cron — every Monday 6am UTC
// Uses RapidAPI tennis-api-atp-wta-itf
// Updates ranking + career titles for all active players

module.exports = async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, RAPIDAPI_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RAPIDAPI_KEY) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  const HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com';
  const HEADERS = {
    'x-rapidapi-key': RAPIDAPI_KEY,
    'x-rapidapi-host': HOST,
    'Content-Type': 'application/json',
  };

  // Title categories we count — matches what ATP website shows as official titles
  // 2 = Main tour (250/500), 3 = Masters 1000, 4 = Grand Slams, 7 = Tour Finals
  const TITLE_IDS = new Set([2, 3, 4, 7]);

  try {
    // ── 1. GET CURRENT RANKINGS ───────────────────────────────────────────────
    const rankRes = await fetch(`https://${HOST}/tennis/v2/atp/ranking/singles/`, { headers: HEADERS });
    if (!rankRes.ok) throw new Error(`Rankings fetch failed: ${rankRes.status}`);
    const { data: rankings } = await rankRes.json();

    // Map rapid_id -> current ranking position
    const idToRanking = {};
    for (const entry of rankings) {
      if (entry.player?.id) idToRanking[entry.player.id] = entry.position;
    }

    // ── 2. GET OUR ACTIVE PLAYERS FROM SUPABASE ──────────────────────────────
    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/players?select=id,name,ranking,titles,rapid_id&active=eq.true`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    if (!dbRes.ok) throw new Error('Supabase fetch failed');
    const players = await dbRes.json();

    // ── 3. UPDATE EACH PLAYER ─────────────────────────────────────────────────
    const results = { updated: [], skipped: [], errors: [] };

    for (const player of players) {
      if (!player.rapid_id) {
        results.skipped.push(`${player.name} (no rapid_id)`);
        continue;
      }

      try {
        // Fetch career titles breakdown
        const titlesRes = await fetch(
          `https://${HOST}/tennis/v2/atp/getPlayerTitles/?playerId=${player.rapid_id}`,
          { headers: HEADERS }
        );
        if (!titlesRes.ok) throw new Error(`Titles fetch failed: ${titlesRes.status}`);
        const { data: breakdown } = await titlesRes.json();

        const totalTitles = (breakdown || [])
          .filter(t => TITLE_IDS.has(t.tourRankId))
          .reduce((sum, t) => sum + parseInt(t.titlesWon || 0), 0);

        const newRanking = idToRanking[player.rapid_id] || player.ranking;

        const patch = {};
        if (newRanking !== player.ranking) patch.ranking = newRanking;
        if (totalTitles !== player.titles) patch.titles = totalTitles;
        if (!Object.keys(patch).length) continue;

        patch.updated_at = new Date().toISOString();

        await fetch(`${SUPABASE_URL}/rest/v1/players?id=eq.${player.id}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(patch),
        });

        results.updated.push({ name: player.name, ...patch });

        // 200ms pause between players to respect rate limits
        await new Promise(r => setTimeout(r, 200));

      } catch (err) {
        results.errors.push({ name: player.name, error: err.message });
      }
    }

    return res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      updated: results.updated.length,
      skipped: results.skipped,
      errors: results.errors,
      changes: results.updated,
    });

  } catch (err) {
    console.error('Cron job failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
