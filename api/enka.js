// Enka.Network answers browser requests with no Access-Control-Allow-Origin header and
// rejects preflight with 405, so the fetch happens here instead. Their docs also ask for a
// descriptive User-Agent, which a browser is not allowed to set on fetch.
const UID = /^\d{9}$/;
const UA = "teyvat-build-archive (+https://github.com/cagdasozbayrak/teyvat-build-archive)";

export default async function handler(req, res) {
  const uid = String(req.query?.uid ?? "");
  if (!UID.test(uid)) {
    res.status(400).json({ error: "A Genshin UID is nine digits." });
    return;
  }

  let upstream;
  try {
    upstream = await fetch(`https://enka.network/api/uid/${uid}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Covers a network failure and the abort above timing out.
    res.status(502).json({ error: "Could not reach Enka.Network." });
    return;
  }

  // Cache both outcomes at the edge. Without this, enumerating nonexistent UIDs would
  // reach Enka.Network on every request instead of being absorbed by the CDN.
  res.setHeader("Cache-Control", "s-maxage=60");

  if (!upstream.ok) {
    // Pass the status through. 404 is an unknown UID, 424 is game maintenance, 429 is a
    // rate limit, and the caller turns each into its own message.
    res.status(upstream.status).json({ error: `Enka returned ${upstream.status}.` });
    return;
  }

  let data;
  try {
    data = await upstream.json();
  } catch {
    res.status(502).json({ error: "Enka.Network returned a malformed response." });
    return;
  }

  // Keep only the showcase. Name cards, achievements and abyss progress are dropped here so
  // they never reach the browser.
  res.status(200).json({
    nickname: data?.playerInfo?.nickname ?? "",
    avatarInfoList: Array.isArray(data?.avatarInfoList) ? data.avatarInfoList : [],
  });
}
