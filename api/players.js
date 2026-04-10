// api/players.js
// Vercel serverless function — returns all players from Supabase
// Age is calculated live from dob so it never goes stale

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Missing Supabase environment variables' });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/players?select=*&order=name.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Supabase error', detail: err });
    }

    const players = await response.json();

    // Calculate current age live from dob — never goes stale
    // dob stored as "YYYY-MM-DD" in Supabase
    const today = new Date();
    const withAge = players.map(p => {
      if (!p.dob) return p;
      const birth = new Date(p.dob);
      let age = today.getFullYear() - birth.getFullYear();
      const notYetHadBirthday =
        today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
      if (notYetHadBirthday) age--;
      return { ...p, age };
    });

    return res.status(200).json(withAge);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
