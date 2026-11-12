// ================= COL-SAN · reconocer ubicaciones y redes =================
// Entiende links de Google Maps (largos), links de "compartir ubicación" de WhatsApp,
// coordenadas (-17.9647, -67.1060) y grados (17°57'53"S 67°06'21"W).

const valid = (a, b) => {
  a = +a; b = +b;
  if (!isFinite(a) || !isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180 || (a === 0 && b === 0)) return null;
  return { lat: +a.toFixed(6), lng: +b.toFixed(6) };
};
const decode = s => { for (let i = 0; i < 3; i++) { try { const d = decodeURIComponent(s); if (d === s) break; s = d; } catch { break; } } return s; };
const looksUrl = s => /^(https?:\/\/|www\.|maps\.|goo\.gl|g\.co)/i.test(s) || /google\.[a-z.]+\/maps/i.test(s);

export function parseLoc(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return null;
  const url = looksUrl(s) || /https?:\/\//i.test(s);
  if (url) s = decode(s).replace(/\+/g, ' ');
  const N = '(-?\\d{1,2}(?:\\.\\d+)?)', E = '(-?\\d{1,3}(?:\\.\\d+)?)';
  const tries = [
    new RegExp(`!3d${N}!4d${E}`),                                                     // pin exacto del lugar
    new RegExp(`[?&;#](?:q|query|ll|sll|destination|daddr|center|cbll|location)=\\s*(?:loc:\\s*)?${N}\\s*,\\s*${E}`, 'i'),
    new RegExp(`/maps/(?:search|place)/\\s*${N}\\s*,\\s*${E}`, 'i'),
    new RegExp(`@${N},${E}`),                                                         // centro del mapa
    new RegExp(`geo:${N},${E}`, 'i')
  ];
  for (const re of tries) { const m = s.match(re); if (m) { const v = valid(m[1], m[2]); if (v) return v; } }
  // Grados, minutos y segundos (como los muestra Google Maps)
  const dms = s.match(/(\d{1,2})\s*°\s*(\d{1,2})\s*['′’]\s*(\d{1,2}(?:[.,]\d+)?)\s*(?:["″”]|'')?\s*([NS])[\s,;]+(\d{1,3})\s*°\s*(\d{1,2})\s*['′’]\s*(\d{1,2}(?:[.,]\d+)?)\s*(?:["″”]|'')?\s*([EOW])/i);
  if (dms) {
    const f = (d, m, x, h) => (+d + +m / 60 + parseFloat(x.replace(',', '.')) / 3600) * (/[SWO]/i.test(h) ? -1 : 1);
    const v = valid(f(dms[1], dms[2], dms[3], dms[4]), f(dms[5], dms[6], dms[7], dms[8]));
    if (v) return v;
  }
  // Coordenadas sueltas: -17.9647, -67.1060
  if (!url || !/https?:\/\//i.test(String(raw))) {
    const m = s.match(/(-?\d{1,2}[.,]\d{3,})\s*[,;\s]\s*(-?\d{1,3}[.,]\d{3,})/);
    if (m) { const v = valid(m[1].replace(',', '.'), m[2].replace(',', '.')); if (v) return v; }
  }
  return null;
}

// Nombre o dirección dentro de un link de Google Maps (cuando no trae coordenadas)
export function placeFrom(raw) {
  const s = decode(String(raw ?? ''));
  const pick = re => { const m = s.match(re); return m ? m[1].replace(/\+/g, ' ').replace(/\s+/g, ' ').trim() : ''; };
  return pick(/\/maps\/place\/([^/@?#]+)/i) || pick(/[?&](?:q|query|destination|daddr)=([^&#]+)/i) || pick(/\/maps\/search\/([^/@?#]+)/i);
}

export const firstUrl = s => {
  const m = String(s ?? '').match(/https?:\/\/[^\s"'<>]+/i);
  if (m) return m[0].replace(/[).,;]+$/, '');
  const t = String(s ?? '').trim();
  return /^(www\.|maps\.|goo\.gl|g\.co)\S*$/i.test(t) ? 'https://' + t : '';
};
export const isShortLink = s => /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\//i.test(String(s ?? '').trim());
export const isGoogleUrl = s => /^https?:\/\/([a-z0-9-]+\.)*(google\.[a-z.]+|goo\.gl|g\.co)\//i.test(String(s ?? ''));

export function distKm(a, b) {
  const r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Redes: acepta el link completo o solo @usuario
const BASE = { facebook: 'https://www.facebook.com/', instagram: 'https://www.instagram.com/', tiktok: 'https://www.tiktok.com/@' };
export function socialUrl(net, v) {
  v = String(v ?? '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.|m\.)?(facebook|fb|instagram|tiktok)\.(com|me)\//i.test(v) || /^vm\.tiktok\.com\//i.test(v)) return 'https://' + v;
  const h = v.replace(/^@+/, '').replace(/\s+/g, '');
  return h ? (BASE[net] || 'https://') + h : '';
}
