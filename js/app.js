// ================= COL-SAN · lógica de la página =================
import { FIREBASE, ADMIN } from './config.js';
import { parseLoc, placeFrom, firstUrl, isShortLink, isGoogleUrl, distKm, socialUrl } from './ubicacion.js';

/* ---------- Utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const nb = s => String(s ?? '').replace(/-/g, '‑');          // guion que no se corta: COL‑SAN siempre junto
const unb = s => String(s ?? '').replace(/‑/g, '-');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const withTimeout = (p, ms, msg = 'tiempo') => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3600); };
const modal = (id, on) => $(id).classList.toggle('on', on);
const pad = n => String(n).padStart(2, '0');
const fmt = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const telWa = p => { const n = String(p || '').replace(/\D/g, ''); return n.length === 8 ? '591' + n : n; };
const money = v => +v === 0 ? '¡Gratis!' : 'Bs. ' + (+v).toLocaleString('es-BO');
// it.op = true -> el precio está oculto para el público
const priceOf = it => it?.op ? 'A consultar' : money(it?.p);
const longDate = d => new Date(d + 'T00:00').toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });

/* ---------- Datos por defecto (todo es editable) ---------- */
const MODS = [
  ['inicio', 'fa-house', 'Inicio'],
  ['tratamientos', 'fa-tooth', 'Tratamientos'],
  ['promociones', 'fa-tags', 'Promociones'],
  ['especialistas', 'fa-user-doctor', 'Especialistas'],
  ['horarios', 'fa-clock', 'Horarios'],
  ['ubicacion', 'fa-location-dot', 'Ubicación'],
  ['reservar', 'fa-calendar-check', 'Reservar']
];
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const IC = { 'Preventiva': 'fa-shield-heart', 'Estética': 'fa-wand-magic-sparkles', 'Ortodoncia': 'fa-teeth', 'Cirugía': 'fa-syringe', 'Restauración': 'fa-tooth', 'Niños': 'fa-child-reaching' };
const U = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=70`;
const DEF_IMG = {
  logo: 'assets/logo-circulo.webp',
  logoHero: 'assets/logo-cuadro.webp',
  inicio: U('1643660527071-52e37cf7c7ea'),
  tratamientos: U('1663182234283-28941e7612da'),
  promociones: U('1586749902049-5c855d0c9d4c'),
  especialistas: U('1684607633251-8a4a8d94ddd2'),
  horarios: U('1643660527071-52e37cf7c7ea'),
  ubicacion: U('1684607633251-8a4a8d94ddd2'),
  reservar: U('1586749902049-5c855d0c9d4c')
};
const ORURO = { lat: -17.9647, lng: -67.1060 };
const row = (keys, vals) => Object.fromEntries([['id', uid()], ...keys.map((k, i) => [k, vals[i]])]);
const DEF = {
  v: 2,
  T: {},
  info: {
    nombre: 'COL-SAN', legal: 'Consultorio Dental COL-SAN', director: 'Dra. Monica Victoria Colque Sanchez', licencia: '',
    direccion: '1ro de Mayo #500 entre Tomas Frias y Rengel', ciudad: 'Oruro, Bolivia', referencia: '',
    telefono: '74138036', whatsapp: '59174138036', correo: '',
    facebook: '', instagram: '', tiktok: '',
    ubLat: '', ubLng: '', ubQ: '', ubLink: '',
    intervalo: 45, verEsp: false
  },
  frases: [
    'Tu sonrisa es nuestra mejor carta de presentación.',
    'Sonreír con confianza cambia tu día.',
    'Cuidamos cada diente como si fuera el único.',
    'Tecnología moderna, trato de familia.',
    'Una sonrisa sana empieza con una visita.',
    'Sin miedo, sin dolor, con mucho cariño.',
    'Hoy es un gran día para sonreír.',
    'Pequeños cuidados, grandes sonrisas.',
    'Tu sonrisa en Oruro, en buenas manos.',
    'Agenda hoy y presume tu sonrisa mañana.'
  ],
  tr: [
    ['Consulta y diagnóstico', 'Preventiva', 180, '30 min', 'Revisión completa y un plan de tratamiento claro.'],
    ['Limpieza dental ultrasónica', 'Preventiva', 200, '45 min', 'Elimina sarro y manchas sin dolor.'],
    ['Blanqueamiento LED', 'Estética', 1200, '60 min', 'Varios tonos más blanco en una sola sesión.'],
    ['Carillas de porcelana', 'Estética', 2100, '2 citas', 'Sonrisa natural, diseñada a tu medida.'],
    ['Brackets de autoligado', 'Ortodoncia', 1000, '45 min', 'Más rápidos y cómodos que los tradicionales.'],
    ['Alineadores invisibles', 'Ortodoncia', 2400, 'Plan 3D', 'Corrige tu sonrisa sin que nadie lo note.'],
    ['Implante dental', 'Cirugía', 4200, '90 min', 'Recupera la pieza perdida con titanio de calidad.'],
    ['Muelas del juicio', 'Cirugía', 650, '60 min', 'Extracción segura con anestesia y control posterior.'],
    ['Resina estética', 'Restauración', 220, '40 min', 'Repara caries con el color de tu diente.'],
    ['Endodoncia', 'Restauración', 750, '75 min', 'Salva tu diente tratando el conducto.'],
    ['Sellantes y flúor infantil', 'Niños', 240, '35 min', 'Protección extra contra caries para los peques.'],
    ['Pulpotomía infantil', 'Niños', 320, '45 min', 'Tratamiento del nervio en dientes de leche.']
  ].map(v => row(['n', 'c', 'p', 'd', 'x'], v)),
  pr: [
    ['100% GRATIS', 'Consulta + diagnóstico al reservar en la web', 180, 0, '30 de diciembre'],
    ['2x1', 'Limpieza dental para dos personas', 400, 200, '30 de diciembre'],
    ['-25%', 'Blanqueamiento LED + limpieza', 1200, 900, '15 de enero'],
    ['-50%', 'Cuota inicial de ortodoncia', 1000, 500, '20 de enero']
  ].map(v => row(['b', 't', 'o', 'p', 'v'], v)),
  dr: [row(['n', 's', 'h'], ['Dra. Monica Victoria Colque Sanchez', 'Odontología general y estética', 'Lunes a viernes'])],
  sc: DAYS.map((d, i) => ({ d, a: i < 5 ? '15:30 - 20:30' : '', p: '' }))
};
const NAV_DEF = Object.fromEntries(MODS.map(([id, , l]) => [id, l]));

/* ---------- Actualizar datos guardados con versiones anteriores ---------- */
// Valores de ejemplo de versiones anteriores: si siguen guardados, se reemplazan por los reales.
const OLD_INFO = {
  director: 'Dra. Valeria Mendoza', licencia: 'SEDES #10948', direccion: 'Av. Las Américas #1420, Edif. Médica Sur, Piso 3, Of. 304',
  referencia: 'A media cuadra de la plaza principal', telefono: '+591 700-12345', whatsapp: '59170012345', correo: 'citas@colsan.com',
  facebook: 'https://www.facebook.com/', tiktok: 'https://www.tiktok.com/', instagram: 'https://www.instagram.com/'
};
const OLD_T = {
  s4: '24/7', s4l: 'urgencias', ur_k: 'Emergencias', ur_t: 'Urgencias 24/7',
  ur_p: 'Dolor fuerte, diente roto o sangrado: escríbenos y te atendemos lo antes posible, también domingos y feriados.',
  tr_t: 'Tratamientos', pr_t: 'Promociones', dr_t: 'Especialistas', ho_t: 'Horarios', ub_p: 'Estamos más cerca de lo que crees.'
};
const OLD_DR = ['Dra. Valeria Mendoza', 'Dr. Sebastián Rojas', 'Dr. Marco Siles', 'Dra. Camila Terrazas'];
function migrate(src) {
  const d = JSON.parse(JSON.stringify(src || {}));
  d.info = d.info || {}; d.T = d.T || {};
  for (const [k, v] of Object.entries(OLD_INFO)) if (d.info[k] === v) delete d.info[k];
  if (d.info.mapa != null) {
    const m = String(d.info.mapa).trim();
    if (m && d.info.ubLat == null && d.info.ubQ == null) { const p = parseLoc(m); if (p) { d.info.ubLat = p.lat; d.info.ubLng = p.lng; } else d.info.ubQ = m; }
    delete d.info.mapa;
  }
  if ((d.v || 1) < 2) {
    delete d.sc;                                                     // nuevo horario: lunes a viernes 15:30 - 20:30
    for (const [k, v] of Object.entries(OLD_T)) if (d.T[k] === v) delete d.T[k];
    for (const [o, n] of [['tr_t', 'nav_tratamientos'], ['pr_t', 'nav_promociones'], ['dr_t', 'nav_especialistas'], ['ho_t', 'nav_horarios']]) {
      if (d.T[o] && !d.T[n]) d.T[n] = d.T[o];
      delete d.T[o];
    }
    if (Array.isArray(d.dr)) { d.dr = d.dr.filter(x => !OLD_DR.includes(x.n)); if (!d.dr.length) delete d.dr; }
  }
  d.v = 2;
  return d;
}
const arr = (a, def) => Array.isArray(a) ? a.map(x => ({ ...x, id: x.id || uid() })) : structuredClone(def);
function merge(src) {
  const d = migrate(src);
  return {
    v: 2,
    T: { ...d.T },
    info: { ...DEF.info, ...d.info },
    frases: Array.isArray(d.frases) && d.frases.length ? d.frases : [...DEF.frases],
    tr: arr(d.tr, DEF.tr), pr: arr(d.pr, DEF.pr), dr: arr(d.dr, DEF.dr),
    sc: Array.isArray(d.sc) && d.sc.length === 7 ? d.sc.map((r, i) => ({ d: r.d || DAYS[i], a: r.a || '', p: r.p || '' })) : structuredClone(DEF.sc)
  };
}

/* ---------- Estado ---------- */
let S = structuredClone(DEF);
let IMG = {};                 // imágenes subidas: clave -> dataURL
const dirtyImg = new Set();
const DEFT = {};              // textos originales de la página (para guardar solo lo que cambió)
let fb = null;                // Firebase cargado
let editing = false, editDirty = false, cur = 'inicio', busy = false, sel = '', slotToken = 0, sending = false;
let CITAS = [], citasUnsub = null, admTab = 'datos', citaFilter = { date: '', st: '' };
let fails = 0, lockUntil = 0, quickKey = '', cat = 'Todas';

const imgOf = k => IMG[k] || DEF_IMG[k] || '';
const navLabel = id => S.T['nav_' + id] || NAV_DEF[id];
const visibleMods = () => MODS.filter(m => m[0] !== 'especialistas' || S.info.verEsp);
const PRINCIPAL = () => ({ id: 'principal', n: S.info.director || 'Odontóloga' });
const curDr = () => S.info.verEsp ? (S.dr.find(d => d.id === $('#fDr').value) || S.dr[0] || PRINCIPAL()) : PRINCIPAL();
const markDirty = () => { editDirty = true; $$('#eSave,#aSave').forEach(b => b.classList.add('dirty')); };
const clearDirty = () => { editDirty = false; dirtyImg.clear(); $$('#eSave,#aSave').forEach(b => b.classList.remove('dirty')); };

/* ---------- Ubicación ---------- */
const hasCoords = () => { const i = S.info; return i.ubLat !== '' && i.ubLat != null && i.ubLng !== '' && i.ubLng != null && isFinite(+i.ubLat) && isFinite(+i.ubLng); };
const fullAddr = () => [S.info.direccion, S.info.ciudad].filter(x => String(x || '').trim()).join(', ');
const mapTarget = () => hasCoords() ? `${(+S.info.ubLat).toFixed(6)},${(+S.info.ubLng).toFixed(6)}` : (S.info.ubQ || fullAddr() || 'Oruro, Bolivia');
const embedUrl = t => `https://maps.google.com/maps?q=${encodeURIComponent(t)}&z=17&hl=es&output=embed`;
const viewUrl = () => /^https?:\/\//i.test(S.info.ubLink) ? S.info.ubLink : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapTarget())}`;
const dirUrl = () => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapTarget())}`;

/* ---------- Horarios y estado abierto/cerrado ---------- */
const ranges = t => [...String(t || '').matchAll(/(\d{1,2})[:.h](\d{2})\s*(?:-|–|a|hasta)\s*(\d{1,2})[:.h](\d{2})/gi)]
  .map(m => [+m[1] * 60 + +m[2], +m[3] * 60 + +m[4]]).filter(([s, e]) => e > s);
const dayIdx = d => (d.getDay() + 6) % 7;
const dayRanges = i => [...ranges(S.sc[i]?.a), ...ranges(S.sc[i]?.p)].sort((a, b) => a[0] - b[0]);
const hoursOf = r => [r.a, r.p].map(s => String(s || '').trim()).filter(Boolean);
function status() {
  const now = new Date(), i = dayIdx(now), t = now.getHours() * 60 + now.getMinutes();
  const open = dayRanges(i).find(([s, e]) => t >= s && t < e);
  if (open) return { open: true, sub: `Atendemos hasta las ${fmt(open[1])}` };
  for (let k = 0; k < 8; k++) {
    const d = (i + k) % 7;
    const r = dayRanges(d).find(([s]) => k > 0 || s > t);
    if (r) return { open: false, sub: k === 0 ? `Abrimos hoy a las ${fmt(r[0])}` : k === 1 ? `Abrimos mañana a las ${fmt(r[0])}` : `Abrimos el ${DAYS[d].toLowerCase()} a las ${fmt(r[0])}` };
  }
  return { open: false, sub: 'Escríbenos por WhatsApp' };
}
function renderStatus() {
  const st = status();
  ['#estado', '#estado2'].forEach(s => {
    const el = $(s); if (!el) return;
    el.classList.toggle('open', st.open); el.classList.toggle('closed', !st.open);
    el.querySelector('.ic i').className = st.open ? 'fa-solid fa-door-open' : 'fa-solid fa-moon';
    el.querySelector('[data-st]').textContent = st.open ? 'ABIERTO' : 'CERRADO';
    el.querySelector('[data-sub]').textContent = st.sub;
  });
}

/* ---------- Ayudas para editar en la tarjeta ---------- */
// En modo edición, cada dato se vuelve un texto que se puede tocar y cambiar.
const ed = (L, id, f, v, ph, num) => editing
  ? `<span data-e="${L}:${id}:${f}"${num ? ' data-num' : ''} data-ph="${esc(ph)}">${esc(v)}</span>`
  : esc(v);
const eyeBtn = (L, it) => editing
  ? `<button class="peye ${it.op ? 'off' : ''}" data-peye="${L}:${it.id}" title="El público ${it.op ? 'NO ve' : 've'} este precio"><i class="fa-solid ${it.op ? 'fa-eye-slash' : 'fa-eye'}"></i>${it.op ? 'Precio oculto · tocar para mostrar' : 'Precio visible · tocar para ocultar'}</button>`
  : '';
const askBtn = name => `<button class="ask" data-wa="Hola, quiero saber el precio de: ${esc(name)}."><i class="fa-brands fa-whatsapp"></i>Consultar precio</button>`;
const tools = (L, id) => editing
  ? `<div class="tools"><button data-pup="${L}:${id}" title="Mover antes" aria-label="Mover antes"><i class="fa-solid fa-arrow-left"></i></button><button data-pdel="${L}:${id}" title="Quitar" aria-label="Quitar"><i class="fa-solid fa-trash"></i></button></div>`
  : '';

/* ---------- Render del sitio ---------- */
function applyTexts() {
  $$('[data-k]').forEach(el => {
    const k = el.dataset.k;
    if (!(k in DEFT)) DEFT[k] = el.textContent;
    if (el === document.activeElement) return;
    const v = S.T[k] ?? (k.startsWith('nav_') ? NAV_DEF[k.slice(4)] : DEFT[k]);
    if (el.textContent !== v) el.textContent = v;
  });
  $$('[data-i]').forEach(el => {
    if (el === document.activeElement) return;
    const k = el.dataset.i, v = S.info[k] ?? '';
    el.textContent = (k === 'nombre' || k === 'legal') ? nb(v) : v;
  });
  $$('.nb-name').forEach(el => el.textContent = nb(S.info.nombre));
  $$('.nb-legal').forEach(el => el.textContent = nb(S.info.legal));
  $('#fDir').textContent = fullAddr();
  $('#fTel').textContent = S.info.telefono;
  $('#fMail').textContent = S.info.correo; $('#fMailP').hidden = !S.info.correo;
  $('#fCity').textContent = S.info.ciudad;
  document.title = `${nb(S.info.nombre)} · Consultorio Dental${S.info.ciudad ? ' en ' + S.info.ciudad : ''}`;
}
const bgCache = {};
function applyImages() {
  $$('img[data-img]').forEach(im => { const src = imgOf(im.dataset.img); if (im.getAttribute('src') !== src) im.src = src; });
  $$('[data-bg]').forEach(el => {
    const src = imgOf(el.dataset.bg);
    el.style.setProperty('--img', `url("${src}")`);
    if (bgCache[src] === undefined) {
      bgCache[src] = 'loading';
      const p = new Image();
      p.onload = () => { bgCache[src] = true; $$('[data-bg]').forEach(e => imgOf(e.dataset.bg) === src && e.classList.remove('noimg')); };
      p.onerror = () => { bgCache[src] = false; $$('[data-bg]').forEach(e => imgOf(e.dataset.bg) === src && e.classList.add('noimg')); };
      p.src = src;
    } else el.classList.toggle('noimg', bgCache[src] === false);
  });
}
function buildNav() {
  const html = visibleMods().map(([id, ic], i) =>
    `<a href="#${id}" data-go="${id}" class="${id === cur ? 'on' : ''}" style="--i:${i}"><i class="fa-solid ${ic}"></i><span>${esc(navLabel(id))}</span></a>`).join('');
  $('#nav').innerHTML = html;
  $('#navM').innerHTML = html;
}
const schedHtml = () => {
  const today = dayIdx(new Date());
  return S.sc.map((r, i) => {
    const h = hoursOf(r);
    return `<div class="r ${i === today ? 'today' : ''} ${h.length ? '' : 'off'}"><b>${esc(r.d)}${i === today ? '<span class="tag-hoy">HOY</span>' : ''}</b><span>${h.length ? h.map(esc).join('<br>') : 'Cerrado'}</span></div>`;
  }).join('');
};
const INFO_ROWS = {
  legal: ['fa-hospital', 'lbl_nombre', 'Nombre'],
  director: ['fa-user-doctor', 'lbl_dir', 'Odontóloga'],
  licencia: ['fa-certificate', 'lbl_lic', 'Licencia'],
  direccion: ['fa-location-dot', 'lbl_dirx', 'Dirección'],
  ciudad: ['fa-city', 'lbl_ciudad', 'Ciudad'],
  referencia: ['fa-signs-post', 'lbl_ref', 'Referencia'],
  telefono: ['fa-phone', 'lbl_tel', 'Teléfono'],
  correo: ['fa-envelope', 'lbl_mail', 'Correo']
};
const infoRows = keys => keys.filter(k => editing || String(S.info[k] ?? '').trim()).map(k => {
  const [ic, lk, lbl] = INFO_ROWS[k];
  return `<div class="rowi"><span class="ic"><i class="fa-solid ${ic}"></i></span><span><small data-k="${lk}">${lbl}</small><b data-i="${k}" data-ph="Escribe aquí…"></b></span></div>`;
}).join('');
function renderHome() {
  $('#infoRows').innerHTML = infoRows(['legal', 'director', 'licencia', 'direccion', 'ciudad', 'telefono', 'correo']);
  $('#schedHome').innerHTML = schedHtml();
  $('#homeTr').innerHTML = S.tr.slice(0, 6).map((t, i) =>
    `<a class="mini reveal tilt" href="#reservar" data-go="reservar" data-tr="${t.id}" style="--d:${i * 70}ms"><span class="ic"><i class="fa-solid ${IC[t.c] || 'fa-tooth'}"></i></span><span>${esc(t.n)}<small>${esc(t.c)}${t.op ? '' : ' · desde ' + money(t.p)}</small></span></a>`).join('');
  $('#btnTeam').hidden = !S.info.verEsp;
  $('#btnHours').hidden = !!S.info.verEsp;
}
function renderTr() {
  const cats = ['Todas', ...new Set(S.tr.map(t => t.c).filter(Boolean))];
  if (!cats.includes(cat)) cat = 'Todas';
  $('#cats').innerHTML = cats.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  const q = $('#q').value.trim().toLowerCase();
  const list = S.tr.filter(t => (cat === 'Todas' || t.c === cat) && (t.n + ' ' + t.x).toLowerCase().includes(q));
  $('#trats').innerHTML = list.map((t, i) => `
    <article class="item reveal tilt" style="--d:${(i % 6) * 60}ms">${tools('tr', t.id)}
      <div class="ico"><i class="fa-solid ${IC[t.c] || 'fa-tooth'}"></i></div>
      <h3>${ed('tr', t.id, 'n', t.n, 'Nombre del tratamiento')}</h3>
      <div class="meta"><span class="chip-s">${ed('tr', t.id, 'c', t.c, 'Categoría')}</span><span class="chip-s"><i class="fa-regular fa-clock"></i>${ed('tr', t.id, 'd', t.d, 'Duración')}</span></div>
      ${editing || t.x ? `<p class="muted" style="margin:0">${ed('tr', t.id, 'x', t.x, 'Descripción corta')}</p>` : ''}
      ${editing ? `<div class="price ${t.op ? 'price-off' : ''}">Bs. ${ed('tr', t.id, 'p', t.p, '0', 1)}</div>${eyeBtn('tr', t)}`
        : t.op ? askBtn(t.n) : `<div class="price">${money(t.p)}</div>`}
      <a class="btn sm" href="#reservar" data-go="reservar" data-tr="${t.id}"><i class="fa-solid fa-calendar-plus"></i>Agendar</a>
    </article>`).join('') || '<p class="card">No encontramos ese tratamiento. Escríbenos por WhatsApp y te ayudamos.</p>';
}
function renderPr() {
  $('#promos').innerHTML = S.pr.map((p, i) => `
    <article class="item promo reveal tilt" style="--d:${i * 80}ms">${tools('pr', p.id)}
      <span class="ribbon">PROMO</span>
      <span class="tag">${ed('pr', p.id, 'b', p.b, 'Etiqueta')}</span>
      <h3>${ed('pr', p.id, 't', p.t, 'Título de la promoción')}</h3>
      ${editing
        ? `<div class="price ${p.op ? 'price-off' : ''}"><small class="lbl">Antes</small><s>Bs. ${ed('pr', p.id, 'o', p.o, '0', 1)}</s><small class="lbl">Ahora</small>Bs. ${ed('pr', p.id, 'p', p.p, '0', 1)}</div>${eyeBtn('pr', p)}`
        : p.op ? '' : `<div class="price">${+p.o ? `<s>Bs. ${esc(p.o)}</s>` : ''}${money(p.p)}</div>`}
      <span class="chip-s" style="align-self:flex-start"><i class="fa-regular fa-calendar"></i>Hasta ${ed('pr', p.id, 'v', p.v, 'fecha')}</span>
      <a class="btn sm" href="#reservar" data-go="reservar" data-pr="${p.id}"><i class="fa-solid fa-bolt"></i>Quiero esta promo</a>
    </article>`).join('') || '<p class="card">Pronto tendremos nuevas promociones.</p>';
}
const initials = n => String(n).replace(/^(Dra?\.?|Lic\.?)\s*/i, '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
function renderDr() {
  $('#docs').innerHTML = S.dr.map((d, i) => `
    <article class="item doc reveal tilt" style="--d:${i * 80}ms;align-items:center;text-align:center">${tools('dr', d.id)}
      <div class="ph" data-imgedit="dr_${d.id}">${IMG['dr_' + d.id] ? `<img src="${IMG['dr_' + d.id]}" alt="">` : `<span>${esc(initials(d.n))}</span>`}</div>
      <h3 style="margin:6px 0 0">${ed('dr', d.id, 'n', d.n, 'Nombre')}</h3>
      <span class="chip-s">${ed('dr', d.id, 's', d.s, 'Especialidad')}</span>
      <span class="muted"><i class="fa-regular fa-calendar"></i> ${ed('dr', d.id, 'h', d.h, 'Días de atención')}</span>
      <a class="btn sm" style="align-self:center" href="#reservar" data-go="reservar" data-dr="${d.id}">Agendar</a>
    </article>`).join('');
}
let lastMap = '';
function renderLoc() {
  const src = embedUrl(mapTarget());
  if (src !== lastMap) { lastMap = src; const fr = $('#mapFrame'); fr.dataset.src = src; if (cur === 'ubicacion') fr.src = src; }
  $('#dirBtn').href = dirUrl();
  $('#viewBtn').href = viewUrl();
  $('#telBtn').href = 'tel:' + String(S.info.telefono).replace(/[^\d+]/g, '');
  $('#locRows').innerHTML = infoRows(['direccion', 'ciudad', 'referencia', 'telefono', 'correo']);
}
const NETS = [['facebook', 'fb', 'fa-facebook-f', 'Facebook'], ['instagram', 'ig', 'fa-instagram', 'Instagram'], ['tiktok', 'tt', 'fa-tiktok', 'TikTok']];
function socialHtml(round) {
  return NETS.filter(([k]) => S.info[k]).map(([k, c, ic, l]) =>
    `<a class="soc ${c} ${round ? 'round' : ''}" href="${esc(socialUrl(k, S.info[k]))}" target="_blank" rel="noopener" aria-label="${l}"><i class="fa-brands ${ic}"></i>${round ? '' : l}</a>`).join('')
    + `<button class="soc wa ${round ? 'round' : ''}" data-wa="Hola, quiero hacer una consulta." aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i>${round ? '' : 'WhatsApp'}</button>`;
}
function renderSocial() { $$('[data-social]').forEach(box => box.innerHTML = socialHtml(box.hasAttribute('data-round'))); }
function renderSched() { $('#sched').innerHTML = schedHtml(); }
function renderLd() {
  const i = S.info, ld = {
    '@context': 'https://schema.org', '@type': 'Dentist', name: unb(i.legal), telephone: i.telefono,
    address: { '@type': 'PostalAddress', streetAddress: i.direccion, addressLocality: String(i.ciudad).split(',')[0].trim(), addressCountry: 'BO' },
    sameAs: NETS.map(([k]) => socialUrl(k, i[k])).filter(Boolean)
  };
  if (hasCoords()) ld.geo = { '@type': 'GeoCoordinates', latitude: +i.ubLat, longitude: +i.ubLng };
  $('#ld').textContent = JSON.stringify(ld);
}

/* ---------- Reservas ---------- */
function renderBookingSelects() {
  const keep = { tr: $('#fTr').value, pr: $('#fPr').value, dr: $('#fDr').value };
  $('#fTr').innerHTML = S.tr.map(t => `<option value="${t.id}">${esc(t.n)}${t.op ? '' : ' — ' + money(t.p)}</option>`).join('');
  $('#fPr').innerHTML = '<option value="">Sin promoción</option>' + S.pr.map(p => `<option value="${p.id}">${esc(p.b)} · ${esc(p.t)}</option>`).join('');
  $('#fDr').innerHTML = S.dr.map(d => `<option value="${d.id}">${esc(d.n)}</option>`).join('');
  if (S.tr.some(t => t.id === keep.tr)) $('#fTr').value = keep.tr;
  if (S.pr.some(p => p.id === keep.pr)) $('#fPr').value = keep.pr;
  if (S.dr.some(d => d.id === keep.dr)) $('#fDr').value = keep.dr;
  const esp = !!S.info.verEsp && S.dr.length > 0;
  $('#fDrWrap').hidden = !esp;
  $('#drFixed').hidden = esp;
  $('#fPrWrap').classList.toggle('full', !esp);
  $('#drFixed').innerHTML = `<i class="fa-solid fa-user-doctor"></i> Te atiende <b>${esc(S.info.director || 'nuestra odontóloga')}</b>`;
}
function slotsFor(date) {
  const i = dayIdx(new Date(date + 'T00:00')), step = Math.max(15, +S.info.intervalo || 45);
  const isToday = date === todayStr(), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes() + 30;
  const out = { am: [], pm: [] };
  dayRanges(i).forEach(([s, e]) => {
    for (let t = s; t + step <= e; t += step) if (!isToday || t > nowM) (t < 720 ? out.am : out.pm).push(fmt(t));
  });
  return out;
}
const localCitas = () => store.get('colsan_citas') || [];
async function takenFor(date, drId) {
  if (fb) {
    try {
      const { fs, db } = fb;
      const snap = await withTimeout(fs.getDocs(fs.query(fs.collection(db, 'ocupados'), fs.where('date', '==', date))), 6000);
      return new Set(snap.docs.map(d => d.data()).filter(o => o.dr === drId).map(o => o.time));
    } catch { return new Set(); }   // si falla, igual mostramos horarios; la base de datos evita duplicados
  }
  return new Set(localCitas().filter(c => c.date === date && c.drId === drId && c.st !== 'cancelada').map(c => c.time));
}
async function refreshSlots() {
  const box = $('#slotBox'), date = $('#fDt').value;
  sel = ''; renderSum();
  if (!date) { box.innerHTML = '<p class="note" style="margin-top:14px"><i class="fa-regular fa-calendar"></i> Elige una fecha para ver los horarios libres.</p>'; return; }
  if (date < todayStr()) { box.innerHTML = '<p class="alert">Elige una fecha desde hoy en adelante.</p>'; return; }
  const sl = slotsFor(date);
  if (!sl.am.length && !sl.pm.length) {
    box.innerHTML = `<p class="note" style="margin-top:14px"><i class="fa-solid fa-circle-info"></i> Ese día no atendemos o ya no quedan horarios. Prueba otra fecha o <a href="#" data-wa="Hola, quiero una cita para el ${esc(date)}.">escríbenos por WhatsApp</a>.</p>`;
    return;
  }
  box.innerHTML = '<p class="slots-h"><i class="fa-solid fa-spinner fa-spin"></i>Buscando horarios libres…</p><div class="slots">' + '<div class="sk"></div>'.repeat(8) + '</div>';
  const token = ++slotToken;
  const taken = await takenFor(date, curDr().id);
  if (token !== slotToken) return;
  const sec = (title, ic, list) => list.length ? `<p class="slots-h"><i class="fa-solid ${ic}"></i>${title}</p><div class="slots">${list.map(t =>
    `<button type="button" data-slot="${t}" ${taken.has(t) ? 'disabled title="Ocupado"' : ''}>${t}</button>`).join('')}</div>` : '';
  box.innerHTML = sec('Mañana', 'fa-sun', sl.am) + sec('Tarde', 'fa-cloud-sun', sl.pm);
}
function renderSum() {
  const t = S.tr.find(x => x.id === $('#fTr').value), p = S.pr.find(x => x.id === $('#fPr').value);
  $('#sTr').textContent = t ? t.n : '—';
  $('#sDr').textContent = curDr().n;
  const date = $('#fDt').value;
  $('#sWh').textContent = date ? longDate(date) + (sel ? ` · ${sel}` : '') : 'Elige una fecha';
  $('#sPr').textContent = p ? priceOf(p) : t ? priceOf(t) : '—';
}
function bkError(html) { const e = $('#bkErr'); e.innerHTML = html; e.hidden = false; e.style.animation = 'none'; e.offsetHeight; e.style.animation = ''; }
function setSending(on) {
  sending = on;
  const b = $('#bkSend'); b.disabled = on;
  b.innerHTML = on ? '<span class="spin"></span><span>Registrando tu cita…</span>' : '<i class="fa-solid fa-paper-plane"></i><span>Confirmar cita</span>';
}
async function submitCita(e) {
  e.preventDefault();
  if (sending) return;
  $('#bkErr').hidden = true;
  const t = S.tr.find(x => x.id === $('#fTr').value), d = curDr(), p = S.pr.find(x => x.id === $('#fPr').value);
  const date = $('#fDt').value, n = $('#fNm').value.trim(), ph = $('#fPh').value.trim(), nt = $('#fNt').value.trim();
  if (!t) return bkError('Elige un tratamiento.');
  if (!date) return bkError('Elige la fecha de tu cita.');
  if (!sel) return bkError('Elige un horario.');
  if (n.length < 3) return bkError('Escribe tu nombre completo.');
  if (ph.replace(/\D/g, '').length < 7) return bkError('Escribe un número de celular válido.');
  const c = {
    code: 'CS-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    n, ph, nt, date, time: sel,
    tr: t.n, trId: t.id, dr: d.n, drId: d.id, pr: p ? `${p.b} · ${p.t}` : '',
    price: p ? priceOf(p) : priceOf(t), st: 'pendiente'
  };
  c.slot = `${date}_${sel.replace(':', '')}_${d.id}`;
  setSending(true);
  try {
    if (fb) {
      const { fs, db } = fb;
      const b = fs.writeBatch(db);
      b.set(fs.doc(db, 'ocupados', c.slot), { date: c.date, time: c.time, dr: c.drId });
      b.set(fs.doc(fs.collection(db, 'citas')), { ...c, at: fs.serverTimestamp() });
      await withTimeout(b.commit(), 12000, 'lento');
    } else {
      const list = localCitas();
      if (list.some(x => x.slot === c.slot && x.st !== 'cancelada')) { const er = new Error(); er.code = 'permission-denied'; throw er; }
      list.unshift({ ...c, id: c.code, at: new Date().toISOString() });
      store.set('colsan_citas', list);
    }
    showOk(c);
  } catch (err) {
    const wa = `<br><button type="button" class="btn sm wa" style="margin-top:10px" data-wa="${esc(`Hola, soy ${n}. Quiero una cita de ${t.n} el ${date} a las ${sel}.`)}"><i class="fa-brands fa-whatsapp"></i>Reservar por WhatsApp</button>`;
    if (err.code === 'permission-denied') { bkError('Ese horario acaba de ser reservado. Elige otro, por favor.'); refreshSlots(); }
    else if (err.message === 'lento') bkError('La conexión está lenta y no pudimos confirmar tu cita. Revisa tu internet e intenta otra vez.' + wa);
    else bkError('No pudimos registrar tu cita en este momento.' + wa);
  } finally { setSending(false); }
}
function showOk(c) {
  $('#okCode').textContent = c.code;
  $('#okTxt').textContent = `${c.tr} con ${c.dr}, el ${longDate(c.date)} a las ${c.time}.`;
  $('#okWa').href = `https://wa.me/${telWa(S.info.whatsapp)}?text=${encodeURIComponent(`Hola, soy ${c.n}. Reservé una cita (código ${c.code}): ${c.tr}, ${c.date} a las ${c.time}.`)}`;
  $('#bkWrap').hidden = true; $('#okBox').hidden = false;
  $('#bk').reset(); sel = '';
  window.scrollTo({ top: $('#okBox').getBoundingClientRect().top + scrollY - 120, behavior: 'smooth' });
  confetti();
}
function confetti() {
  if (RM) return;
  const box = document.createElement('div'); box.className = 'confetti';
  const cols = ['#29b6f6', '#0288d1', '#ffffff', '#b9c5d0', '#b3e5fc', '#34d36b'];
  box.innerHTML = Array.from({ length: 70 }, () => `<i style="left:${Math.random() * 100}%;background:${cols[Math.floor(Math.random() * cols.length)]};--t:${2 + Math.random() * 2}s;animation-delay:${Math.random() * .6}s"></i>`).join('');
  document.body.appendChild(box); setTimeout(() => box.remove(), 4800);
}

/* ---------- Navegación con frases ---------- */
const randFrase = () => { const l = S.frases.length ? S.frases : DEF.frases; return l[Math.floor(Math.random() * l.length)]; };
function swapTo(id, d = {}) {
  cur = id;
  $$('.mod').forEach(m => m.classList.toggle('on', m.id === 'm-' + id));
  $$('#nav a, #navM a').forEach(a => a.classList.toggle('on', a.dataset.go === id));
  window.scrollTo(0, 0);
  if (id === 'ubicacion') { const fr = $('#mapFrame'); if (fr.dataset.src && fr.src !== fr.dataset.src) fr.src = fr.dataset.src; }
  if (id === 'reservar') {
    $('#okBox').hidden = true; $('#bkWrap').hidden = false;
    if (d.tr) $('#fTr').value = d.tr;
    if (d.pr) $('#fPr').value = d.pr;
    if (d.dr) { $('#fDr').value = d.dr; refreshSlots(); }
    renderSum();
  }
  if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  observeReveals();
}
function go(id, d = {}) {
  if (!visibleMods().some(m => m[0] === id)) id = 'inicio';
  closeMenu();
  if (id === cur && !d.tr && !d.pr && !d.dr) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (RM || editing || d.instant) return swapTo(id, d);
  if (busy) return;
  busy = true;
  const c = $('#curtain');
  $('#curtainTxt').textContent = randFrase();
  c.classList.remove('out'); c.classList.add('in');
  setTimeout(() => {
    swapTo(id, d);
    c.classList.add('out');
    setTimeout(() => { c.classList.remove('in', 'out'); busy = false; }, 620);
  }, 900);
}
const closeMenu = () => $('#menu').classList.remove('on');

/* ---------- Efectos ---------- */
let io;
function observeReveals() {
  if (RM || !('IntersectionObserver' in window)) { $$('.reveal').forEach(e => e.classList.add('in')); return; }
  io = io || new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in'); io.unobserve(en.target);
    $$('[data-count]', en.target).forEach(countUp);
  }), { threshold: .12 });
  $$('.reveal:not(.in)').forEach(e => io.observe(e));
}
function countUp(el) {
  if (editing || RM) return;
  const txt = el.textContent, m = txt.match(/^(\D*)([\d.,]+)(.*)$/); if (!m) return;
  const target = parseFloat(m[2].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')); if (!target) return;
  const t0 = performance.now(), dur = 1400;
  const tick = now => {
    if (editing) { el.textContent = txt; return; }
    const k = Math.min(1, (now - t0) / dur), v = Math.round(target * (1 - Math.pow(1 - k, 3)));
    el.textContent = m[1] + v.toLocaleString('es-BO') + m[3];
    if (k < 1) requestAnimationFrame(tick); else el.textContent = txt;
  };
  requestAnimationFrame(tick);
}
function buildFx() {
  if (RM) return;
  $$('[data-fx]').forEach(fx => {
    if (fx.childElementCount) return;
    let h = '';
    for (let i = 0; i < 9; i++) { const s = 8 + Math.random() * 26; h += `<i style="left:${Math.random() * 100}%;width:${s}px;height:${s}px;--t:${9 + Math.random() * 9}s;--dl:${-Math.random() * 12}s"></i>`; }
    for (let i = 0; i < 7; i++) h += `<b style="left:${Math.random() * 95}%;top:${Math.random() * 80}%;--dl:${Math.random() * 3}s"></b>`;
    fx.innerHTML = h;
  });
}
let typedTimer;
function startTyped() {
  clearTimeout(typedTimer);
  const el = $('#typed'); let fi = 0, ci = 0, del = false;
  const step = () => {
    const list = S.frases.length ? S.frases : DEF.frases, f = list[fi % list.length];
    if (RM) { el.textContent = f; fi++; typedTimer = setTimeout(step, 4500); return; }
    if (!del) { ci++; el.textContent = f.slice(0, ci); if (ci >= f.length) { del = true; typedTimer = setTimeout(step, 2400); return; } typedTimer = setTimeout(step, 42); }
    else { ci--; el.textContent = f.slice(0, ci); if (ci <= 0) { del = false; fi++; typedTimer = setTimeout(step, 300); return; } typedTimer = setTimeout(step, 18); }
  };
  step();
}
function initTilt() {
  if (RM || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  let last = null, raf = 0;
  document.addEventListener('pointermove', e => {
    const el = editing ? null : e.target.closest?.('.tilt');
    if (last && last !== el) { last.style.removeProperty('--rx'); last.style.removeProperty('--ry'); }
    last = el; if (!el || raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0; const r = el.getBoundingClientRect();
      el.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 10 + 'deg');
      el.style.setProperty('--rx', -((e.clientY - r.top) / r.height - .5) * 10 + 'deg');
    });
  }, { passive: true });
}

/* ---------- WhatsApp ---------- */
function openWa(text) {
  window.open(`https://wa.me/${telWa(S.info.whatsapp)}?text=${encodeURIComponent(text || 'Hola, quiero hacer una consulta.')}`, '_blank', 'noopener');
}
const toggleWa = on => { $('#waPanel').classList.toggle('on', on); if (on) { $('#waTip').hidden = true; $('.wa-fab .badge')?.remove(); } };

/* ---------- Render general ---------- */
let applyQueued = 0;
function setEditable(el, on) {
  if (!on) { if (el.isContentEditable) el.contentEditable = 'false'; return; }
  el.contentEditable = 'plaintext-only';
  if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
  el.spellcheck = true;
}
function applyAll() {
  if (!visibleMods().some(m => m[0] === cur)) swapTo('inicio');
  buildNav(); renderHome(); renderTr(); renderPr(); renderDr(); renderSched(); renderLoc(); renderSocial();
  renderBookingSelects(); renderSum();
  applyTexts(); applyImages(); renderStatus(); renderLd();
  $$('[data-k],[data-i],[data-e]').forEach(el => setEditable(el, editing));
  observeReveals();
}
// Vuelve a dibujar la página, pero nunca mientras alguien escribe en un texto
const applySoon = () => {
  clearTimeout(applyQueued);
  applyQueued = setTimeout(() => { if (document.activeElement?.isContentEditable) return applySoon(); applyAll(); }, 220);
};

/* ---------- Firebase ---------- */
async function initFirebase() {
  if (!FIREBASE.projectId) return null;
  try {
    const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
    const [appM, fs, au] = await withTimeout(Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-firestore.js'), import(base + 'firebase-auth.js')]), 10000);
    const app = appM.initializeApp(FIREBASE);
    return { fs, au, db: fs.getFirestore(app), auth: au.getAuth(app) };
  } catch (e) {
    console.warn('Firebase no disponible:', e);
    toast('Sin conexión con la base de datos. Las citas se guardarán en este navegador.');
    return null;
  }
}
async function loadRemote() {
  const { fs, db } = fb;
  try {
    const [w, imgs] = await withTimeout(Promise.all([fs.getDoc(fs.doc(db, 'sitio', 'web')), fs.getDocs(fs.collection(db, 'imagenes'))]), 10000);
    if (w.exists()) S = merge(w.data());
    IMG = {}; imgs.forEach(d => { if (d.data().src) IMG[d.id] = d.data().src; });
    store.set('colsan_cache', { S, IMG });
    return true;
  } catch (e) { console.warn(e); return false; }
}

/* ---------- Modo edición ---------- */
function startEdit() {
  editing = true;
  document.body.classList.add('edit');
  $('#btnEdit').innerHTML = '<i class="fa-solid fa-sliders"></i>';
  applyAll();
  listenCitas();
  toast('Modo edición: toca cualquier texto, precio o imagen');
}
async function stopEdit() {
  if ((dirtyImg.size || editDirty) && !confirm('Tienes cambios sin guardar. ¿Salir y descartarlos?')) return;
  editing = false;
  document.body.classList.remove('edit');
  $('#btnEdit').innerHTML = '<i class="fa-solid fa-lock"></i>';
  modal('#adm', false);
  if (citasUnsub) { citasUnsub(); citasUnsub = null; }
  if (fb) { try { await fb.au.signOut(fb.auth); } catch { } }
  // descartar lo que no se guardó
  if (fb) { const c = store.get('colsan_cache'); if (c?.S) { S = merge(c.S); IMG = c.IMG || {}; } }
  else { const w = store.get('colsan_web'); S = w ? merge(w) : structuredClone(DEF); IMG = store.get('colsan_img') || {}; }
  clearDirty();
  applyAll(); startTyped();
}
const sync = (sel, from, txt) => $$(sel).forEach(o => { if (o !== from) o.textContent = txt ?? from.textContent; });
document.addEventListener('input', e => {
  if (!editing) return;
  const el = e.target.closest?.('[data-k],[data-i],[data-e]');
  if (!el || !el.isContentEditable) return;
  const v = el.textContent.replace(/\s+/g, ' ').trim();
  markDirty();
  if (el.dataset.k) { const k = el.dataset.k; S.T[k] = v; sync(`[data-k="${k}"]`, el); }
  else if (el.dataset.i) { const k = el.dataset.i; S.info[k] = unb(v); sync(`[data-i="${k}"]`, el, (k === 'nombre' || k === 'legal') ? nb(S.info[k]) : S.info[k]); }
  else {
    const [L, id, f] = el.dataset.e.split(':'), it = S[L]?.find(x => x.id === id);
    if (!it) return;
    it[f] = el.hasAttribute('data-num') ? (parseFloat(v.replace(',', '.').replace(/[^\d.]/g, '')) || 0) : v;
    sync(`[data-e="${el.dataset.e}"]`, el);
  }
});
document.addEventListener('focusout', e => { if (editing && e.target.isContentEditable) applySoon(); });
document.addEventListener('keydown', e => {
  if (editing && e.key === 'Enter' && e.target.isContentEditable) { e.preventDefault(); e.target.blur(); }
});
document.addEventListener('paste', e => {
  if (!editing || !e.target.isContentEditable || e.target.contentEditable === 'plaintext-only') return;
  e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
});
async function save(btn) {
  for (const k of Object.keys(S.T)) if (S.T[k] === DEFT[k] || (k.startsWith('nav_') && S.T[k] === NAV_DEF[k.slice(4)]) || !S.T[k]) delete S.T[k];
  const old = btn?.innerHTML; if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span>Guardando…'; }
  try {
    const data = JSON.parse(JSON.stringify(S));
    if (fb) {
      const { fs, db } = fb;
      await withTimeout(Promise.all([
        fs.setDoc(fs.doc(db, 'sitio', 'web'), data),
        ...[...dirtyImg].map(k => IMG[k] ? fs.setDoc(fs.doc(db, 'imagenes', k), { src: IMG[k] }) : fs.deleteDoc(fs.doc(db, 'imagenes', k)))
      ]), 20000, 'lento');
      store.set('colsan_cache', { S, IMG });
    } else {
      store.set('colsan_web', data);
      if (!store.set('colsan_img', IMG)) toast('Las imágenes son muy pesadas para guardarlas sin Firebase');
    }
    clearDirty();
    toast('✅ Cambios guardados y publicados');
    startTyped();
  } catch (e) {
    toast(e.message === 'lento' ? 'La conexión está lenta. Intenta guardar otra vez.' : 'No se pudo guardar: ' + (e.code || e.message));
  } finally { if (btn) { btn.disabled = false; btn.innerHTML = old; } }
}
function shrink(file, max, q = .85) {
  return new Promise((res, rej) => {
    const im = new Image(), url = URL.createObjectURL(file);
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let out = c.toDataURL('image/webp', q);
      while (out.length > 850000 && q > .4) { q -= .1; out = c.toDataURL('image/webp', q); }
      res(out);
    };
    im.onerror = rej; im.src = url;
  });
}
const IMG_SLOTS = [
  ['logo', 'Logo de la cabecera', 400], ['logoHero', 'Logo grande de la portada', 700],
  ...MODS.map(([id, , l]) => [id, 'Fondo de ' + l, 1600])
];
async function setImage(key, file) {
  const max = key.startsWith('dr_') ? 360 : (IMG_SLOTS.find(s => s[0] === key)?.[2] || 1600);
  try { IMG[key] = await shrink(file, max); dirtyImg.add(key); markDirty(); applyAll(); if ($('#adm').classList.contains('on')) renderAdm(); toast('Imagen lista. Pulsa Guardar para publicarla.'); }
  catch { toast('No se pudo leer esa imagen'); }
}

/* ---------- Agregar, quitar y mover tarjetas desde la página ---------- */
const LISTS = {
  tr: { title: 'n', f: { n: 'Nombre', c: 'Categoría', p: 'Precio (Bs.)', d: 'Duración', x: 'Descripción corta' }, num: ['p'], add: () => ({ ...row(['n', 'c', 'p', 'd', 'x'], ['Nuevo tratamiento', 'Preventiva', 0, '30 min', '']), op: false }) },
  pr: { title: 't', f: { b: 'Etiqueta', t: 'Título', o: 'Precio antes (Bs.)', p: 'Precio promo (Bs., 0 = gratis)', v: 'Vigente hasta' }, num: ['o', 'p'], add: () => ({ ...row(['b', 't', 'o', 'p', 'v'], ['NUEVO', 'Nueva promoción', 0, 0, '']), op: false }) },
  dr: { title: 'n', f: { n: 'Nombre', s: 'Especialidad', h: 'Días de atención' }, num: [], add: () => row(['n', 's', 'h'], ['Dr(a). Nombre', 'Especialidad', 'Lunes a viernes']) }
};
function selectAll(el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
function pageTool(d) {
  if (d.padd) {
    const L = d.padd, it = LISTS[L].add();
    S[L].push(it); if (L === 'tr') { cat = 'Todas'; $('#q').value = ''; }
    markDirty(); applyAll();
    const el = $(`[data-e="${L}:${it.id}:${LISTS[L].title}"]`);
    if (el) { el.closest('.item')?.classList.add('in'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => { el.focus(); selectAll(el); }, 350); }
    return;
  }
  const [L, id] = (d.pdel || d.pup).split(':'), a = S[L], i = a.findIndex(x => x.id === id);
  if (i < 0) return;
  if (d.pdel) { if (!confirm(`¿Quitar "${a[i][LISTS[L].title]}"?`)) return; a.splice(i, 1); }
  else if (i > 0) [a[i - 1], a[i]] = [a[i], a[i - 1]];
  markDirty(); applyAll();
}

function togglePrice(L, id, show) {
  const it = S[L]?.find(x => x.id === id); if (!it) return;
  it.op = show === undefined ? !it.op : !show;
  markDirty(); applyAll();
  if ($('#adm').classList.contains('on')) renderAdm();
  toast(it.op ? 'Precio oculto: el público verá "Consultar precio". Pulsa Guardar.' : 'Precio visible. Pulsa Guardar.');
}
function setAllPrices(L, show) {
  S[L].forEach(x => x.op = !show);
  markDirty(); applyAll(); renderAdm();
  toast(show ? 'Todos los precios visibles. Pulsa Guardar.' : 'Todos los precios ocultos. Pulsa Guardar.');
}

/* ---------- Citas (panel) ---------- */
function listenCitas() {
  if (!fb || citasUnsub) return;
  const { fs, db } = fb;
  citasUnsub = fs.onSnapshot(fs.query(fs.collection(db, 'citas'), fs.orderBy('at', 'desc'), fs.limit(400)),
    s => { CITAS = s.docs.map(d => ({ id: d.id, ...d.data() })); if (admTab === 'citas' && $('#adm').classList.contains('on')) renderAdm(); },
    e => toast('No se pudieron leer las citas: ' + e.code));
}
const allCitas = () => fb ? CITAS : localCitas();
async function setCitaSt(id, st) {
  const c = allCitas().find(x => x.id === id); if (!c) return;
  try {
    if (fb) {
      const { fs, db } = fb;
      await fs.updateDoc(fs.doc(db, 'citas', id), { st });
      if (st === 'cancelada' && c.slot) await fs.deleteDoc(fs.doc(db, 'ocupados', c.slot)).catch(() => { });
    } else { const l = localCitas(); const x = l.find(y => y.id === id); if (x) x.st = st; store.set('colsan_citas', l); renderAdm(); }
    toast('Estado actualizado');
  } catch (e) { toast('No se pudo actualizar: ' + (e.code || e.message)); }
}
async function delCita(id) {
  const c = allCitas().find(x => x.id === id); if (!c || !confirm(`¿Eliminar la cita ${c.code} de ${c.n}?`)) return;
  try {
    if (fb) {
      const { fs, db } = fb;
      await fs.deleteDoc(fs.doc(db, 'citas', id));
      if (c.slot) await fs.deleteDoc(fs.doc(db, 'ocupados', c.slot)).catch(() => { });
    } else { store.set('colsan_citas', localCitas().filter(x => x.id !== id)); renderAdm(); }
    toast('Cita eliminada');
  } catch (e) { toast('No se pudo eliminar: ' + (e.code || e.message)); }
}
function csv() {
  const cols = [['code', 'Código'], ['date', 'Fecha'], ['time', 'Hora'], ['n', 'Paciente'], ['ph', 'Celular'], ['tr', 'Tratamiento'], ['dr', 'Atiende'], ['pr', 'Promoción'], ['price', 'Precio'], ['st', 'Estado'], ['nt', 'Motivo']];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const txt = '﻿' + [cols.map(c => q(c[1])).join(';'), ...filteredCitas().map(c => cols.map(([k]) => q(c[k])).join(';'))].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = `citas-colsan-${todayStr()}.csv`; a.click();
}
const filteredCitas = () => allCitas().filter(c => (!citaFilter.date || c.date === citaFilter.date) && (!citaFilter.st || c.st === citaFilter.st));

/* ---------- Ubicación (panel) ---------- */
function locSummary() {
  if (hasCoords()) return `<b>Punto exacto en el mapa</b><span class="muted">${(+S.info.ubLat).toFixed(6)}, ${(+S.info.ubLng).toFixed(6)}</span>`;
  if (S.info.ubQ) return `<b>Buscando: "${esc(S.info.ubQ)}"</b><span class="muted">Google Maps elige el lugar con ese texto</span>`;
  return `<b>Buscando por la dirección</b><span class="muted">${esc(fullAddr() || 'Oruro, Bolivia')}</span>`;
}
function renderLocPanel() {
  const box = $('#locNow'); if (!box) return;
  box.innerHTML = locSummary();
  const fr = $('#admMap'), src = embedUrl(mapTarget());
  if (fr && fr.dataset.src !== src) { fr.dataset.src = src; fr.src = src; }
}
function locMsg(html, kind = 'ok') { const m = $('#locMsg'); if (!m) return; m.className = 'locmsg ' + kind; m.innerHTML = html; m.hidden = false; }
function setLoc(r, msg) {
  S.info.ubLat = r.lat ?? ''; S.info.ubLng = r.lng ?? ''; S.info.ubQ = r.q || ''; S.info.ubLink = r.link || '';
  markDirty(); applySoon(); renderLocPanel();
  let warn = '';
  if (r.lat != null) { const km = distKm(r, ORURO); if (km > 40) warn = `<br><b>Atención:</b> este punto está a ${Math.round(km)} km de Oruro. Revisa que sea el link correcto.`; }
  locMsg(`<i class="fa-solid fa-circle-check"></i> ${msg}${warn}<br>Pulsa <b>Guardar</b> para publicarla.`, warn ? 'warn' : 'ok');
}
async function recognizeLoc(raw) {
  raw = String(raw || '').trim();
  if (!raw) return { err: 'Pega un link de Google Maps, de WhatsApp o escribe las coordenadas.' };
  const url = firstUrl(raw);
  let p = parseLoc(raw) || (url && parseLoc(url)), final = url;
  if (!p && url && isGoogleUrl(url)) {
    try {
      const r = await withTimeout(fetch('/api/ubicacion?url=' + encodeURIComponent(url)), 9000);
      if (r.ok) { const j = await r.json(); if (j.url) { final = j.url; p = parseLoc(final); } }
    } catch { }
    if (!p && final === url && isShortLink(url)) return { err: 'short' };
  }
  if (p) return { ...p, link: url };
  const name = url ? placeFrom(final) : raw;
  if (name) return { q: name, link: url };
  return { err: 'No encontramos una ubicación en ese link. Prueba con otra opción de abajo.' };
}
async function runRecognize(btn) {
  const raw = $('#locIn').value, old = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span>Reconociendo…';
  try {
    const r = await recognizeLoc(raw);
    if (r.err === 'short') locMsg(`<i class="fa-solid fa-circle-info"></i> Es un link corto (maps.app.goo.gl). Se reconoce solo cuando la página ya está publicada en Vercel.<br>Por ahora: ábrelo en el navegador, copia la dirección larga de arriba y pégala aquí, o usa <b>Usar mi ubicación actual</b>.`, 'warn');
    else if (r.err) locMsg(`<i class="fa-solid fa-circle-xmark"></i> ${r.err}`, 'bad');
    else if (r.lat != null) setLoc(r, 'Ubicación reconocida.');
    else setLoc(r, `Se buscará "${esc(r.q)}" en el mapa. Si no queda exacto, usa un link con el punto marcado.`);
  } finally { btn.disabled = false; btn.innerHTML = old; }
}
function useGps(btn) {
  if (!navigator.geolocation) return locMsg('Este navegador no permite ubicar. Usa otra opción.', 'bad');
  if (!isSecureContext) return locMsg('La ubicación por GPS solo funciona con la página publicada (https).', 'bad');
  const old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin dk"></span>Buscando dónde estás…';
  const done = () => { btn.disabled = false; btn.innerHTML = old; };
  navigator.geolocation.getCurrentPosition(
    p => { setLoc({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }, `Ubicación tomada de tu GPS (precisión ±${Math.round(p.coords.accuracy)} m).`); done(); },
    err => { locMsg(err.code === 1 ? 'No diste permiso. Toca el candado de la barra de direcciones, permite la ubicación e intenta otra vez.' : 'No se pudo obtener la ubicación. Intenta de nuevo o pega un link.', 'bad'); done(); },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

/* ---------- Panel de edición ---------- */
const TABS = [
  ['datos', 'fa-id-card', 'Datos'], ['ubic', 'fa-map-pin', 'Ubicación'], ['redes', 'fa-share-nodes', 'Redes'], ['sc', 'fa-clock', 'Horarios'],
  ['tr', 'fa-tooth', 'Tratamientos'], ['pr', 'fa-tags', 'Promociones'], ['dr', 'fa-user-doctor', 'Especialistas'],
  ['textos', 'fa-heading', 'Menú y frases'], ['imagenes', 'fa-image', 'Imágenes'], ['citas', 'fa-calendar-check', 'Citas']
];
const INFO_F = [
  ['nombre', 'Nombre corto (cabecera y portada)'], ['legal', 'Nombre completo'],
  ['director', 'Odontóloga principal (atiende todas las citas)'], ['licencia', 'Licencia / registro (vacío = no se muestra)'],
  ['direccion', 'Dirección', 1], ['ciudad', 'Ciudad y país'], ['referencia', 'Referencia para llegar (opcional)'],
  ['telefono', 'Teléfono'], ['correo', 'Correo (vacío = no se muestra)']
];
const sw = (attr, on, label) => `<label class="sw"><input type="checkbox" ${attr} ${on ? 'checked' : ''}><span class="knob"></span><span>${label}</span></label>`;
const tval = s => { const r = ranges(s)[0]; return r ? [fmt(r[0]), fmt(r[1])] : ['', '']; };
const allBtns = L => `<div class="btns" style="margin-bottom:14px"><button class="btn sm ghost" data-allop="${L}:1"><i class="fa-solid fa-eye"></i>Mostrar todos los precios</button><button class="btn sm ghost" data-allop="${L}:0"><i class="fa-solid fa-eye-slash"></i>Ocultar todos los precios</button></div>`;
function listHtml(L) {
  const F = LISTS[L];
  return S[L].map((r, i) => `<div class="aitem">
      ${L === 'dr' ? `<div style="display:flex;align-items:center;gap:10px"><div class="th" style="width:64px;height:64px;border-radius:50%;background:#dfeef7 center/cover url('${IMG['dr_' + r.id] || ''}')"></div><label class="btn sm ghost">Foto<input type="file" accept="image/*" data-imgkey="dr_${r.id}" hidden></label></div>` : ''}
      ${Object.entries(F.f).map(([f, l]) => `<label class="${f === 'x' || f === 't' ? 'wide' : ''}">${l}<input data-l="${L}" data-r="${i}" data-f="${f}" value="${esc(r[f])}" ${F.num.includes(f) ? 'type="number" min="0" step="1" inputmode="numeric"' : ''}></label>`).join('')}
      ${L !== 'dr' ? `<div class="full-row">${sw(`data-lop="${L}:${r.id}"`, !r.op, r.op ? 'Precio oculto al público' : 'Mostrar precio al público')}</div>` : ''}
      <div class="acts">${i ? `<button class="btn sm ghost" data-up="${i}" title="Subir"><i class="fa-solid fa-arrow-up"></i></button>` : ''}<button class="btn sm ghost" data-del="${i}"><i class="fa-solid fa-trash"></i>Quitar</button></div>
    </div>`).join('') + `<button class="btn" data-add><i class="fa-solid fa-plus"></i>Agregar</button>`;
}
function renderAdm() {
  const tb = $('#atabs'), sl = tb.scrollLeft;
  tb.innerHTML = TABS.map(([id, ic, l]) => `<button data-tab="${id}" class="${id === admTab ? 'on' : ''}"><i class="fa-solid ${ic}"></i> ${l}</button>`).join('');
  tb.scrollLeft = sl;
  const on = $('.on', tb); if (on && (on.offsetLeft < tb.scrollLeft || on.offsetLeft + on.offsetWidth > tb.scrollLeft + tb.clientWidth)) tb.scrollLeft = on.offsetLeft - (tb.clientWidth - on.offsetWidth) / 2;
  const b = $('#abody');
  const warnFb = fb ? '' : '<p class="alert" style="background:#fff8e1;border-color:#f5d77a;color:#6b4e00;margin-top:0">Firebase no está configurado: lo que guardes se queda solo en este navegador. Revisa la guía.</p>';
  if (admTab === 'datos') {
    b.innerHTML = `${warnFb}<p class="hint">Estos datos aparecen en toda la página. También puedes tocarlos directamente en la página.</p>
      <div class="form">${INFO_F.map(([k, l, full]) => `<label class="${full ? 'full' : ''}">${l}<input data-info="${k}" value="${esc(S.info[k])}"></label>`).join('')}</div>`;
  } else if (admTab === 'ubic') {
    b.innerHTML = `<div class="loc-now"><div class="admmap"><iframe id="admMap" title="Vista previa del mapa"></iframe></div><div id="locNow"></div></div>
      <p class="locmsg" id="locMsg" hidden></p>
      <h4><span class="num">1</span> Pega un link o coordenadas</h4>
      <div class="inrow"><input id="locIn" placeholder="https://maps.app.goo.gl/…   o   -17.9647, -67.1060" autocomplete="off"><button class="btn" data-locgo><i class="fa-solid fa-wand-magic-sparkles"></i>Reconocer</button></div>
      <details class="how"><summary>¿Cómo copio el link?</summary>
        <ol><li><b>Google Maps (celular):</b> busca o mantén presionado el consultorio → <b>Compartir</b> → <b>Copiar</b>.</li>
        <li><b>Google Maps (computadora):</b> busca el consultorio → <b>Compartir</b> → <b>Copiar vínculo</b>. También sirve la dirección de la barra de arriba.</li>
        <li><b>WhatsApp:</b> abre el chat donde enviaste la ubicación, mantén presionado el mensaje → <b>Reenviar</b> o copia el link que aparece.</li>
        <li><b>Coordenadas:</b> en Google Maps toca el punto rojo; abajo aparecen números como <code>-17.9647, -67.1060</code>.</li></ol>
        <p>Acepta: links largos y cortos de Google Maps, links de WhatsApp, coordenadas y grados (17°57'53"S 67°06'21"W).</p></details>
      <h4><span class="num">2</span> Estoy en el consultorio</h4>
      <button class="btn ghost" data-locgps><i class="fa-solid fa-location-crosshairs"></i>Usar mi ubicación actual</button>
      <p class="hint" style="margin-top:6px">Usa el GPS del celular. Hazlo dentro del consultorio y acepta el permiso.</p>
      <h4><span class="num">3</span> Usar solo la dirección escrita</h4>
      <button class="btn ghost" data-locaddr><i class="fa-solid fa-signs-post"></i>Buscar "${esc(fullAddr())}"</button>`;
    renderLocPanel();
  } else if (admTab === 'redes') {
    b.innerHTML = `<p class="hint">Pega el link de tu página o escribe solo el usuario (por ejemplo <b>@colsan.oruro</b>). Si dejas una vacía, ese botón no aparece.</p>
      <div class="form" style="grid-template-columns:1fr">
        <label><span><i class="fa-brands fa-whatsapp" style="color:#128c4a"></i> Número de WhatsApp</span><input data-info="whatsapp" inputmode="tel" value="${esc(S.info.whatsapp)}" placeholder="74138036"><small class="hint">Con o sin 591. Aquí llegan las consultas y confirmaciones.</small></label>
        ${NETS.map(([k, , ic, l]) => `<label><span><i class="fa-brands ${ic}"></i> ${l}</span><input data-soc="${k}" value="${esc(S.info[k])}" placeholder="https://www.${k}.com/…  o  @usuario"></label>`).join('')}
      </div>
      <h4 style="margin-top:20px">Así se verán</h4><div class="social" id="socPrev">${socialHtml(false)}</div>`;
  } else if (admTab === 'sc') {
    b.innerHTML = `<p class="hint">Marca los días que atiendes y elige la hora de entrada y salida. Con esto la página muestra <b>ABIERTO</b> o <b>CERRADO</b> y ofrece las horas para reservar.</p>`
      + S.sc.map((r, i) => {
        const open = dayRanges(i).length > 0, [a0, a1] = tval(r.a), [p0, p1] = tval(r.p);
        return `<div class="hrow ${open ? '' : 'off'}">
          <b class="day">${esc(r.d)}</b>
          ${sw(`data-hopen="${i}"`, open, open ? 'Atiende' : 'Cerrado')}
          <div class="shifts">
            <span class="sh"><small>Turno 1</small><input type="time" step="300" data-hs="${i}:a:0" value="${a0}" ${open ? '' : 'disabled'}> a <input type="time" step="300" data-hs="${i}:a:1" value="${a1}" ${open ? '' : 'disabled'}></span>
            <span class="sh"><small>Turno 2 (opcional)</small><input type="time" step="300" data-hs="${i}:p:0" value="${p0}" ${open ? '' : 'disabled'}> a <input type="time" step="300" data-hs="${i}:p:1" value="${p1}" ${open ? '' : 'disabled'}></span>
          </div></div>`;
      }).join('')
      + `<div class="btns" style="margin-top:14px"><button class="btn ghost" data-hcopy><i class="fa-solid fa-copy"></i>Copiar el horario del lunes a martes–viernes</button></div>
      <label style="max-width:320px;margin-top:18px">Duración de cada cita (minutos)<input type="number" min="15" max="180" step="5" data-info="intervalo" value="${esc(S.info.intervalo)}"></label>`;
  } else if (admTab === 'tr') {
    b.innerHTML = '<p class="hint">Cambia nombres y <b>precios</b> aquí o tocándolos en la página. La <b>categoría</b> crea los filtros del catálogo. Si ocultas un precio, el público ve el botón <b>Consultar precio</b> (abre WhatsApp).</p>' + allBtns('tr') + listHtml('tr');
  } else if (admTab === 'pr') {
    b.innerHTML = '<p class="hint">Precio promo en 0 = aparece como <b>¡Gratis!</b> Si ocultas el precio, solo se ve la etiqueta (por ejemplo <b>2x1</b> o <b>100% de descuento</b>) y el título.</p>' + allBtns('pr') + listHtml('pr');
  } else if (admTab === 'dr') {
    b.innerHTML = `<div class="switchbox">${sw('data-esp', S.info.verEsp, '<b>Mostrar el módulo Especialistas</b>')}
        <p class="hint" style="margin:6px 0 0">${S.info.verEsp
          ? 'Encendido: aparece en el menú y el paciente elige especialista al reservar.'
          : `Apagado: no aparece en el menú y <b>todas las citas son con ${esc(S.info.director || 'la odontóloga principal')}</b> (se cambia en Datos).`}</p></div>`
      + listHtml('dr');
  } else if (admTab === 'textos') {
    b.innerHTML = `<h4>Nombres del menú</h4><p class="hint">También puedes tocar el título grande de cada módulo en la página.</p>
      <div class="form">${MODS.map(([id, , def]) => `<label>${def}<input data-t="nav_${id}" value="${esc(navLabel(id))}"></label>`).join('')}</div>
      <h4 style="margin-top:22px">Frases</h4><p class="hint">Una por línea. Aparecen en la portada y al cambiar de módulo.</p>
      <textarea data-frases rows="10">${esc(S.frases.join('\n'))}</textarea>`;
  } else if (admTab === 'imagenes') {
    b.innerHTML = `<p class="hint">Sube tus fotos o logos. Se optimizan solas para que la página cargue rápido.</p>` + IMG_SLOTS.map(([k, l]) => `
      <div class="imgrow"><div class="th ${k.startsWith('logo') ? 'contain' : ''}" style="background-image:url('${imgOf(k)}')"></div><b>${l}${IMG[k] ? ' <span class="chip-s">propia</span>' : ''}</b>
      <label class="btn sm ghost"><i class="fa-solid fa-upload"></i>Cambiar<input type="file" accept="image/*" data-imgkey="${k}" hidden></label>
      ${IMG[k] ? `<button class="btn sm ghost" data-imgreset="${k}">Restaurar</button>` : ''}</div>`).join('');
  } else if (admTab === 'citas') {
    const list = filteredCitas();
    b.innerHTML = `${warnFb}<div class="form" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:16px;align-items:end">
        <label>Fecha<input type="date" data-cf="date" value="${esc(citaFilter.date)}"></label>
        <label>Estado<select data-cf="st"><option value="">Todos</option>${['pendiente', 'confirmada', 'atendida', 'cancelada'].map(s => `<option ${s === citaFilter.st ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <button class="btn ghost" data-csv><i class="fa-solid fa-file-excel"></i>Descargar (Excel)</button>
      </div>
      <p class="hint">${list.length} cita(s)${fb ? ' · se actualiza en vivo' : ' · guardadas en este navegador'}</p>`
      + (list.length ? list.map(c => `<div class="cita">
        <div class="top-l"><b>${esc(c.code)} · ${esc(c.n)}</b><span class="st ${esc(c.st)}">${esc(c.st)}</span></div>
        <div><i class="fa-regular fa-calendar"></i> ${esc(c.date)} · ${esc(c.time)} &nbsp; <i class="fa-solid fa-tooth"></i> ${esc(c.tr)} · ${esc(c.price)}</div>
        ${c.pr ? `<div class="muted">Promo: ${esc(c.pr)}</div>` : ''}${c.nt ? `<div class="muted">Motivo: ${esc(c.nt)}</div>` : ''}
        <div class="btns" style="align-items:center">
          <select data-cst="${esc(c.id)}" style="width:auto">${['pendiente', 'confirmada', 'atendida', 'cancelada'].map(s => `<option ${s === c.st ? 'selected' : ''}>${s}</option>`).join('')}</select>
          <a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${telWa(c.ph)}?text=${encodeURIComponent(`Hola ${c.n}, te escribimos de ${unb(S.info.legal)} para confirmar tu cita ${c.code}: ${c.tr}, el ${c.date} a las ${c.time}.`)}"><i class="fa-brands fa-whatsapp"></i>${esc(c.ph)}</a>
          <button class="btn sm ghost" data-cdel="${esc(c.id)}" aria-label="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </div></div>`).join('') : '<p class="note">No hay citas con ese filtro.</p>');
  }
}
function openAdm(tab) { if (tab) admTab = tab; modal('#adm', true); renderAdm(); $('#abody').scrollTop = 0; }

$('#adm').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.tab) { admTab = d.tab; renderAdm(); $('#abody').scrollTop = 0; }
  else if (d.add !== undefined) { S[admTab].push(LISTS[admTab].add()); markDirty(); renderAdm(); applySoon(); $('#abody').scrollTop = 1e6; }
  else if (d.del) { if (confirm('¿Quitar este elemento?')) { S[admTab].splice(+d.del, 1); markDirty(); renderAdm(); applySoon(); } }
  else if (d.up) { const a = S[admTab], i = +d.up; [a[i - 1], a[i]] = [a[i], a[i - 1]]; markDirty(); renderAdm(); applySoon(); }
  else if (d.imgreset) { delete IMG[d.imgreset]; dirtyImg.add(d.imgreset); markDirty(); renderAdm(); applyAll(); }
  else if (d.cdel) delCita(d.cdel);
  else if (d.csv !== undefined) csv();
  else if (d.allop) { const [L, v] = d.allop.split(':'); setAllPrices(L, v === '1'); }
  else if (d.locgo !== undefined) runRecognize(t);
  else if (d.locgps !== undefined) useGps(t);
  else if (d.locaddr !== undefined) setLoc({ q: fullAddr() }, 'Se usará la dirección escrita.');
  else if (d.hcopy !== undefined) { for (let i = 1; i < 5; i++) S.sc[i] = { ...S.sc[i], a: S.sc[0].a, p: S.sc[0].p }; markDirty(); renderAdm(); applySoon(); toast('Horario copiado de lunes a viernes'); }
});
$('#adm').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'locIn') { e.preventDefault(); runRecognize($('[data-locgo]')); } });
$('#adm').addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (d.info) S.info[d.info] = d.info === 'intervalo' ? (Math.max(15, +t.value) || 45) : t.value;
  else if (d.t) S.T[d.t] = t.value;
  else if (d.l) S[d.l][+d.r][d.f] = LISTS[d.l].num.includes(d.f) ? (+t.value || 0) : t.value;
  else if (t.matches('[data-frases]')) S.frases = t.value.split('\n').map(s => s.trim()).filter(Boolean);
  else return;
  markDirty(); applySoon();
});
$('#adm').addEventListener('change', e => {
  const t = e.target, d = t.dataset;
  if (d.imgkey && t.files[0]) setImage(d.imgkey, t.files[0]);
  else if (d.cst) setCitaSt(d.cst, t.value);
  else if (d.cf) { citaFilter[d.cf] = t.value; renderAdm(); }
  else if (d.soc) { S.info[d.soc] = socialUrl(d.soc, t.value); t.value = S.info[d.soc]; markDirty(); $('#socPrev').innerHTML = socialHtml(false); applySoon(); }
  else if (d.hopen) {
    const i = +d.hopen;
    if (t.checked) { if (!dayRanges(i).length) S.sc[i] = { ...S.sc[i], a: '15:30 - 20:30', p: '' }; }
    else S.sc[i] = { ...S.sc[i], a: '', p: '' };
    markDirty(); renderAdm(); applySoon();
  }
  else if (d.hs) {
    const [i, f] = d.hs.split(':'), [x0, x1] = $$(`[data-hs^="${i}:${f}:"]`, $('#abody')).map(x => x.value);
    if (x0 && x1 && x1 <= x0) { t.classList.add('bad'); toast('La hora de salida debe ser después de la de entrada'); return; }
    $$(`[data-hs^="${i}:${f}:"]`, $('#abody')).forEach(x => x.classList.remove('bad'));
    S.sc[+i][f] = x0 && x1 ? `${x0} - ${x1}` : '';
    markDirty(); applySoon();
  }
  else if (d.lop) { const [L, id] = d.lop.split(':'); togglePrice(L, id, t.checked); }
  else if (d.esp !== undefined) { S.info.verEsp = t.checked; markDirty(); applyAll(); renderAdm(); }
});

/* ---------- Login ---------- */
async function doLogin(e) {
  e.preventDefault();
  const err = m => { $('#lErr').textContent = m; $('#lErr').hidden = false; };
  if (Date.now() < lockUntil) return err('Demasiados intentos. Espera 30 segundos.');
  const u = $('#lUser').value.trim().toLowerCase(), p = $('#lPin').value.trim();
  const bad = () => { if (++fails >= 5) { fails = 0; lockUntil = Date.now() + 30000; } $('#lPin').value = ''; return err('Usuario o PIN incorrectos.'); };
  // Con Firebase, el PIN lo verifica Firebase (no hace falta escribirlo en config.js)
  if (u !== String(ADMIN.usuario).toLowerCase() || !p || (!fb && p !== String(ADMIN.pin))) return bad();
  if (fb) {
    const b = $('#lGo'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Entrando…';
    try { await withTimeout(fb.au.signInWithEmailAndPassword(fb.auth, ADMIN.correo, 'colsan' + p), 12000, 'lento'); }
    catch (x) {
      const c = x.code || '';
      if (/invalid|user-not-found|wrong-password/.test(c)) return bad();
      return err(x.message === 'lento' ? 'Firebase no respondió. Revisa tu internet.'
        : c === 'auth/operation-not-allowed' ? 'Activa "Correo electrónico/contraseña" en Firebase Authentication.'
        : c === 'auth/too-many-requests' ? 'Demasiados intentos. Espera unos minutos.'
        : 'No se pudo entrar: ' + (c || x.message));
    } finally { b.disabled = false; b.textContent = 'Entrar'; }
  }
  fails = 0; $('#lErr').hidden = true; $('#lPin').value = '';
  modal('#login', false); startEdit();
}

/* ---------- Eventos ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  if (editing && !t.closest('.modal,.editbar')) {
    const eye = t.closest('[data-peye]');
    if (eye) { e.preventDefault(); togglePrice(...eye.dataset.peye.split(':')); return; }
    const tool = t.closest('[data-pdel],[data-pup],[data-padd]');
    if (tool) { e.preventDefault(); pageTool(tool.dataset); return; }
    const op = t.closest('[data-open]');
    if (op) { e.preventDefault(); openAdm(op.dataset.open); return; }
    const im = t.closest('[data-imgedit]');
    if (im) { e.preventDefault(); quickKey = im.dataset.imgedit; $('#quickImg').value = ''; $('#quickImg').click(); return; }
    if (t.closest('[data-k],[data-i],[data-e]')) { e.preventDefault(); return; }
  }
  const el = t.closest('[data-go],[data-wa],[data-cat],[data-slot],[data-close]');
  if (!el) { if (!t.closest('#waPanel,#waFab')) toggleWa(false); return; }
  const d = el.dataset;
  if (d.go) { e.preventDefault(); go(d.go, { tr: d.tr, pr: d.pr, dr: d.dr }); }
  else if (d.wa !== undefined) { e.preventDefault(); openWa(d.wa); }
  else if (d.cat !== undefined) { cat = d.cat; renderTr(); if (editing) $$('#trats [data-e]').forEach(x => setEditable(x, true)); observeReveals(); }
  else if (d.slot) { sel = d.slot; $$('[data-slot]').forEach(b => b.classList.toggle('on', b === el)); renderSum(); $('#bkErr').hidden = true; }
  else if (d.close !== undefined) el.closest('.modal').classList.remove('on');
});
$('#quickImg').addEventListener('change', e => { const f = e.target.files[0]; if (f && quickKey) setImage(quickKey, f); });
$('#q').addEventListener('input', () => { renderTr(); if (editing) $$('#trats [data-e]').forEach(x => setEditable(x, true)); observeReveals(); });
$('#fTr').addEventListener('change', renderSum);
$('#fPr').addEventListener('change', renderSum);
$('#fDr').addEventListener('change', refreshSlots);
$('#fDt').addEventListener('change', refreshSlots);
$('#bk').addEventListener('submit', submitCita);
$('#okNew').addEventListener('click', () => { $('#okBox').hidden = true; $('#bkWrap').hidden = false; refreshSlots(); });
$('#burger').addEventListener('click', () => $('#menu').classList.add('on'));
$('#menuClose').addEventListener('click', closeMenu);
$('#waFab').addEventListener('click', () => toggleWa(!$('#waPanel').classList.contains('on')));
$('#waClose').addEventListener('click', () => toggleWa(false));
$('#waForm').addEventListener('submit', e => { e.preventDefault(); openWa($('#waMsg').value.trim()); $('#waMsg').value = ''; });
$('#btnEdit').addEventListener('click', () => { if (editing) openAdm(); else { $('#lErr').hidden = true; modal('#login', true); setTimeout(() => $('#lUser').focus(), 50); } });
$('#loginForm').addEventListener('submit', doLogin);
$('#ePanel').addEventListener('click', () => openAdm());
$('#eSave').addEventListener('click', e => save(e.currentTarget));
$('#aSave').addEventListener('click', e => save(e.currentTarget));
$('#eOut').addEventListener('click', stopEdit);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); toggleWa(false); $$('.modal.on').forEach(m => m.classList.remove('on')); } });
addEventListener('scroll', () => $('#top').classList.toggle('scrolled', scrollY > 10), { passive: true });
addEventListener('hashchange', () => { const id = location.hash.slice(1); if (id && id !== cur) go(id); });
addEventListener('beforeunload', e => { if (editing && (editDirty || dirtyImg.size)) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- Arranque ---------- */
(async function boot() {
  $('#year').textContent = new Date().getFullYear();
  const cache = FIREBASE.projectId ? store.get('colsan_cache') : null;
  if (cache?.S) { S = merge(cache.S); IMG = cache.IMG || {}; }
  else if (!FIREBASE.projectId) { const w = store.get('colsan_web'); if (w) S = merge(w); IMG = store.get('colsan_img') || {}; }
  $('#fDt').min = todayStr();
  buildFx(); initTilt();
  applyAll();
  const start = location.hash.slice(1);
  if (start && start !== 'inicio') swapTo(visibleMods().some(m => m[0] === start) ? start : 'inicio');
  refreshSlots();
  startTyped();
  setInterval(renderStatus, 30000);

  fb = await initFirebase();
  if (fb && await loadRemote() && !editing) { applyAll(); startTyped(); }
})();
