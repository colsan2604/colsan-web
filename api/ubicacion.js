// ================= COL-SAN · servicio de Vercel =================
// Abre los links cortos de Google Maps (maps.app.goo.gl/...) y devuelve el link largo,
// que trae las coordenadas. Solo acepta direcciones de Google, para que nadie lo use para otra cosa.
// Se publica solo: Vercel convierte esta carpeta "api" en /api/ubicacion.

const GOOGLE = /^([a-z0-9-]+\.)*(google\.[a-z]{2,3}(\.[a-z]{2})?|goo\.gl|g\.co)$/i;

async function step(u) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    return await fetch(u, {
      redirect: 'manual',
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', 'accept-language': 'es-BO,es;q=0.9' }
    });
  } finally { clearTimeout(t); }
}

async function resolve(raw) {
  let u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
  for (let i = 0; i < 6; i++) {
    if (!/^https?:$/.test(u.protocol) || !GOOGLE.test(u.hostname)) break;
    if (/^consent\./i.test(u.hostname) && u.searchParams.get('continue')) { u = new URL(u.searchParams.get('continue')); continue; }
    let r;
    try { r = await step(u); } catch { break; }
    const loc = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && loc) { u = new URL(loc, u); continue; }
    // Algunos links cortos responden con una página que redirige por código
    if (r.status === 200 && /goo\.gl|g\.co/i.test(u.hostname)) {
      const html = (await r.text()).slice(0, 200000);
      const m = html.match(/https?:\/\/(?:www\.|maps\.)?google\.[a-z.]+\/maps[^"'<>\s\\]*/i);
      if (m) { u = new URL(m[0].replace(/&amp;/g, '&')); continue; }
    }
    break;
  }
  return u.toString();
}

module.exports = async function handler(req, res) {
  const raw = String((req.query && req.query.url) || '').trim().slice(0, 800);
  if (!raw) return res.status(400).json({ error: 'Falta el link' });
  try {
    const host = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw).hostname;
    if (!GOOGLE.test(host)) return res.status(400).json({ error: 'Solo links de Google Maps' });
    const url = await resolve(raw);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    return res.status(200).json({ url });
  } catch {
    return res.status(400).json({ error: 'Link no válido' });
  }
};
module.exports.resolve = resolve;
