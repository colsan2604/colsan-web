// ================= COL-SAN · lógica de la página =================
import { FIREBASE, ADMIN } from './config.js';

/* ---------- Utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const nb = s => String(s ?? '').replace(/-/g, '‑');          // guion que no se corta
const unb = s => String(s ?? '').replace(/‑/g, '-');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const withTimeout = (p, ms, msg = 'tiempo') => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3200); };
const modal = (id, on) => $(id).classList.toggle('on', on);
const pad = n => String(n).padStart(2, '0');
const fmt = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const telWa = p => { const n = String(p || '').replace(/\D/g, ''); return n.length === 8 ? '591' + n : n; };
const money = v => +v === 0 ? '¡Gratis!' : 'Bs. ' + (+v).toLocaleString('es-BO');

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
const row = (keys, vals) => Object.fromEntries([['id', uid()], ...keys.map((k, i) => [k, vals[i]])]);
const DEF = {
  T: {},
  info: {
    nombre: 'COL-SAN', legal: 'Consultorio Dental COL-SAN', director: 'Dra. Valeria Mendoza', licencia: 'SEDES #10948',
    direccion: 'Av. Las Américas #1420, Edif. Médica Sur, Piso 3, Of. 304', referencia: 'A media cuadra de la plaza principal',
    mapa: '', telefono: '+591 700-12345', whatsapp: '59170012345', correo: 'citas@colsan.com',
    facebook: 'https://www.facebook.com/', tiktok: 'https://www.tiktok.com/', instagram: 'https://www.instagram.com/', intervalo: 45
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
  dr: [
    ['Dra. Valeria Mendoza', 'Rehabilitación oral y estética', 'Lunes a sábado'],
    ['Dr. Sebastián Rojas', 'Ortodoncia digital', 'Lun, mié, vie y sáb'],
    ['Dr. Marco Siles', 'Implantes y cirugía bucal', 'Mar, jue y sáb'],
    ['Dra. Camila Terrazas', 'Odontopediatría y endodoncia', 'Lunes a viernes (tarde)']
  ].map(v => row(['n', 's', 'h'], v)),
  sc: DAYS.map((d, i) => ({ d, a: i < 6 ? '08:30 - 12:30' : 'Solo urgencias', p: i < 5 ? '14:30 - 19:30' : i === 5 ? '' : 'por WhatsApp' }))
};
const NAV_DEF = Object.fromEntries(MODS.map(([id, , l]) => [id, l]));

/* ---------- Estado ---------- */
let S = structuredClone(DEF);
let IMG = {};                 // imágenes subidas: clave -> dataURL
const dirtyImg = new Set();
let fb = null;                // Firebase cargado
let editing = false, cur = 'inicio', busy = false, sel = '', slotToken = 0, sending = false;
let CITAS = [], citasUnsub = null, admTab = 'general', citaFilter = { date: '', st: '' };
let fails = 0, lockUntil = 0, quickKey = '';

const merge = d => ({
  ...structuredClone(DEF), ...d,
  T: { ...(d?.T || {}) },
  info: { ...DEF.info, ...(d?.info || {}) },
  frases: Array.isArray(d?.frases) && d.frases.length ? d.frases : DEF.frases,
  sc: Array.isArray(d?.sc) && d.sc.length === 7 ? d.sc : DEF.sc
});
const imgOf = k => IMG[k] || DEF_IMG[k] || '';
const navLabel = id => S.T['nav_' + id] || NAV_DEF[id];

/* ---------- Horarios y estado abierto/cerrado ---------- */
const ranges = t => [...String(t || '').matchAll(/(\d{1,2})[:.](\d{2})\s*(?:-|–|a|hasta)\s*(\d{1,2})[:.](\d{2})/gi)]
  .map(m => [+m[1] * 60 + +m[2], +m[3] * 60 + +m[4]]).filter(([s, e]) => e > s);
const dayIdx = d => (d.getDay() + 6) % 7;
const dayRanges = i => [...ranges(S.sc[i]?.a), ...ranges(S.sc[i]?.p)].sort((a, b) => a[0] - b[0]);
function status() {
  const now = new Date(), i = dayIdx(now), t = now.getHours() * 60 + now.getMinutes();
  const open = dayRanges(i).find(([s, e]) => t >= s && t < e);
  if (open) return { open: true, sub: `Atendemos hasta las ${fmt(open[1])}` };
  for (let k = 0; k < 8; k++) {
    const d = (i + k) % 7;
    const r = dayRanges(d).find(([s]) => k > 0 || s > t);
    if (r) return { open: false, sub: k === 0 ? `Abrimos hoy a las ${fmt(r[0])}` : k === 1 ? `Abrimos mañana a las ${fmt(r[0])}` : `Abrimos el ${DAYS[d].toLowerCase()} a las ${fmt(r[0])}` };
  }
  return { open: false, sub: 'Urgencias por WhatsApp' };
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

/* ---------- Render del sitio ---------- */
function applyTexts() {
  $$('[data-k]').forEach(el => { const v = S.T[el.dataset.k]; if (v != null && el !== document.activeElement) el.textContent = v; });
  $$('[data-i]').forEach(el => {
    if (el === document.activeElement) return;
    const k = el.dataset.i, v = S.info[k] ?? '';
    el.textContent = (k === 'nombre' || k === 'legal') ? nb(v) : v;
  });
  document.title = `${nb(S.info.nombre)} · Consultorio Dental`;
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
      p.onload = () => { bgCache[src] = true; $$(`[data-bg]`).forEach(e => imgOf(e.dataset.bg) === src && e.classList.remove('noimg')); };
      p.onerror = () => { bgCache[src] = false; $$(`[data-bg]`).forEach(e => imgOf(e.dataset.bg) === src && e.classList.add('noimg')); };
      p.src = src;
    } else el.classList.toggle('noimg', bgCache[src] === false);
  });
}
function buildNav() {
  const html = mobile => MODS.map(([id, ic], i) =>
    `<a href="#${id}" data-go="${id}" class="${id === cur ? 'on' : ''}" style="--i:${i}"><i class="fa-solid ${ic}"></i><span>${esc(navLabel(id))}</span></a>`).join('');
  $('#nav').innerHTML = html(false);
  $('#navM').innerHTML = html(true);
}
const schedHtml = () => {
  const today = dayIdx(new Date());
  return S.sc.map((r, i) => `<div class="r ${i === today ? 'today' : ''}"><b>${esc(r.d)}${i === today ? '<span class="tag-hoy">HOY</span>' : ''}</b><span>${esc(r.a) || 'Cerrado'}${r.p ? '<br>' + esc(r.p) : ''}</span></div>`).join('');
};
const infoRow = (ic, label, key) => `<div class="rowi"><span class="ic"><i class="fa-solid ${ic}"></i></span><span><small>${label}</small><b data-i="${key}"></b></span></div>`;
function renderHome() {
  $('#infoRows').innerHTML = infoRow('fa-hospital', 'Nombre', 'legal') + infoRow('fa-user-doctor', 'Director(a)', 'director')
    + infoRow('fa-certificate', 'Licencia', 'licencia') + infoRow('fa-location-dot', 'Dirección', 'direccion')
    + infoRow('fa-phone', 'Teléfono', 'telefono') + infoRow('fa-envelope', 'Correo', 'correo');
  $('#schedHome').innerHTML = schedHtml();
  $('#homeTr').innerHTML = S.tr.slice(0, 6).map((t, i) =>
    `<a class="mini reveal tilt" href="#reservar" data-go="reservar" data-tr="${t.id}" style="--d:${i * 70}ms"><span class="ic"><i class="fa-solid ${IC[t.c] || 'fa-tooth'}"></i></span><span>${esc(t.n)}<small>${esc(t.c)} · desde ${money(t.p)}</small></span></a>`).join('');
}
let cat = 'Todas';
function renderTr() {
  const cats = ['Todas', ...new Set(S.tr.map(t => t.c).filter(Boolean))];
  if (!cats.includes(cat)) cat = 'Todas';
  $('#cats').innerHTML = cats.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  const q = $('#q').value.trim().toLowerCase();
  const list = S.tr.filter(t => (cat === 'Todas' || t.c === cat) && (t.n + ' ' + t.x).toLowerCase().includes(q));
  $('#trats').innerHTML = list.map((t, i) => `
    <article class="item reveal tilt" style="--d:${(i % 6) * 60}ms">
      <div class="ico"><i class="fa-solid ${IC[t.c] || 'fa-tooth'}"></i></div>
      <h3>${esc(t.n)}</h3>
      <div class="meta"><span class="chip-s">${esc(t.c)}</span><span class="chip-s"><i class="fa-regular fa-clock"></i>${esc(t.d)}</span></div>
      <p class="muted" style="margin:0">${esc(t.x)}</p>
      <div class="price">${money(t.p)}</div>
      <a class="btn sm" href="#reservar" data-go="reservar" data-tr="${t.id}"><i class="fa-solid fa-calendar-plus"></i>Agendar</a>
    </article>`).join('') || '<p class="card">No encontramos ese tratamiento. Escríbenos por WhatsApp y te ayudamos.</p>';
}
function renderPr() {
  $('#promos').innerHTML = S.pr.map((p, i) => `
    <article class="item promo reveal tilt" style="--d:${i * 80}ms">
      <span class="ribbon">PROMO</span>
      <span class="tag">${esc(p.b)}</span>
      <h3>${esc(p.t)}</h3>
      <div class="price">${+p.o ? `<s>Bs. ${esc(p.o)}</s>` : ''}${money(p.p)}</div>
      <span class="chip-s" style="align-self:flex-start"><i class="fa-regular fa-calendar"></i>Hasta ${esc(p.v)}</span>
      <a class="btn sm" href="#reservar" data-go="reservar" data-pr="${p.id}"><i class="fa-solid fa-bolt"></i>Quiero esta promo</a>
    </article>`).join('') || '<p class="card">Pronto tendremos nuevas promociones.</p>';
}
const initials = n => String(n).replace(/^(Dra?\.?|Lic\.?)\s*/i, '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
function renderDr() {
  $('#docs').innerHTML = S.dr.map((d, i) => `
    <article class="item doc reveal tilt" style="--d:${i * 80}ms;align-items:center;text-align:center">
      <div class="ph">${IMG['dr_' + d.id] ? `<img src="${IMG['dr_' + d.id]}" alt="">` : `<span>${esc(initials(d.n))}</span>`}</div>
      <h3 style="margin:6px 0 0">${esc(d.n)}</h3>
      <span class="chip-s">${esc(d.s)}</span>
      <span class="muted"><i class="fa-regular fa-calendar"></i> ${esc(d.h)}</span>
      <a class="btn sm" style="align-self:center" href="#reservar" data-go="reservar" data-dr="${d.id}">Agendar con ${esc(d.n.split(' ')[0])}</a>
    </article>`).join('');
}
function renderLoc() {
  const q = S.info.mapa || S.info.direccion;
  const enc = encodeURIComponent(q);
  const src = `https://maps.google.com/maps?q=${enc}&z=16&output=embed`;
  const fr = $('#mapFrame'); if (fr.dataset.src !== src) { fr.dataset.src = src; if (cur === 'ubicacion') fr.src = src; }
  $('#dirBtn').href = `https://www.google.com/maps/dir/?api=1&destination=${enc}`;
  $('#telBtn').href = 'tel:' + String(S.info.telefono).replace(/[^\d+]/g, '');
  $('#locRows').innerHTML = infoRow('fa-location-dot', 'Dirección', 'direccion') + infoRow('fa-signs-post', 'Referencia', 'referencia')
    + infoRow('fa-phone', 'Teléfono', 'telefono') + infoRow('fa-envelope', 'Correo', 'correo');
}
function renderSocial() {
  const nets = [['facebook', 'fb', 'fa-facebook-f', 'Facebook'], ['tiktok', 'tt', 'fa-tiktok', 'TikTok'], ['instagram', 'ig', 'fa-instagram', 'Instagram']];
  $$('[data-social]').forEach(box => {
    const round = box.hasAttribute('data-round');
    box.innerHTML = nets.filter(([k]) => S.info[k]).map(([k, c, ic, l]) =>
      `<a class="soc ${c} ${round ? 'round' : ''}" href="${esc(S.info[k])}" target="_blank" rel="noopener" aria-label="${l}"><i class="fa-brands ${ic}"></i>${round ? '' : l}</a>`).join('')
      + `<button class="soc wa ${round ? 'round' : ''}" data-wa="Hola, quiero hacer una consulta." aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i>${round ? '' : 'WhatsApp'}</button>`;
  });
}
function renderSched() { $('#sched').innerHTML = schedHtml(); }

/* ---------- Reservas ---------- */
function renderBookingSelects() {
  const keep = { tr: $('#fTr').value, pr: $('#fPr').value, dr: $('#fDr').value };
  $('#fTr').innerHTML = S.tr.map(t => `<option value="${t.id}">${esc(t.n)} — ${money(t.p)}</option>`).join('');
  $('#fPr').innerHTML = '<option value="">Sin promoción</option>' + S.pr.map(p => `<option value="${p.id}">${esc(p.b)} · ${esc(p.t)}</option>`).join('');
  $('#fDr').innerHTML = S.dr.map(d => `<option value="${d.id}">${esc(d.n)}</option>`).join('');
  if (S.tr.some(t => t.id === keep.tr)) $('#fTr').value = keep.tr;
  if (S.pr.some(p => p.id === keep.pr)) $('#fPr').value = keep.pr;
  if (S.dr.some(d => d.id === keep.dr)) $('#fDr').value = keep.dr;
}
function slotsFor(date) {
  const d = new Date(date + 'T00:00'), i = dayIdx(d), step = Math.max(15, +S.info.intervalo || 45);
  const isToday = date === todayStr(), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes() + 30;
  const out = { am: [], pm: [] };
  [['am', S.sc[i]?.a], ['pm', S.sc[i]?.p]].forEach(([k, txt]) => ranges(txt).forEach(([s, e]) => {
    for (let t = s; t + step <= e; t += step) if (!isToday || t > nowM) out[k].push(fmt(t));
  }));
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
    box.innerHTML = `<p class="note" style="margin-top:14px"><i class="fa-solid fa-circle-info"></i> No hay horarios libres ese día. Prueba otra fecha o <a href="#" data-wa="Hola, quiero una cita para el ${esc(date)}.">escríbenos por WhatsApp</a>.</p>`;
    return;
  }
  box.innerHTML = '<p class="slots-h"><i class="fa-solid fa-spinner fa-spin"></i>Buscando horarios libres…</p><div class="slots">' + '<div class="sk"></div>'.repeat(10) + '</div>';
  const token = ++slotToken;
  const taken = await takenFor(date, $('#fDr').value);
  if (token !== slotToken) return;
  const sec = (title, ic, list) => list.length ? `<p class="slots-h"><i class="fa-solid ${ic}"></i>${title}</p><div class="slots">${list.map(t =>
    `<button type="button" data-slot="${t}" ${taken.has(t) ? 'disabled title="Ocupado"' : ''}>${t}</button>`).join('')}</div>` : '';
  box.innerHTML = sec('Mañana', 'fa-sun', sl.am) + sec('Tarde', 'fa-cloud-sun', sl.pm);
}
function renderSum() {
  const t = S.tr.find(x => x.id === $('#fTr').value), d = S.dr.find(x => x.id === $('#fDr').value), p = S.pr.find(x => x.id === $('#fPr').value);
  $('#sTr').textContent = t ? t.n : '—';
  $('#sDr').textContent = d ? d.n : '—';
  const date = $('#fDt').value;
  $('#sWh').textContent = date ? new Date(date + 'T00:00').toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' }) + (sel ? ` · ${sel}` : '') : 'Elige una fecha';
  $('#sPr').textContent = p ? money(p.p) : t ? money(t.p) : '—';
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
  const t = S.tr.find(x => x.id === $('#fTr').value), d = S.dr.find(x => x.id === $('#fDr').value), p = S.pr.find(x => x.id === $('#fPr').value);
  const date = $('#fDt').value, n = $('#fNm').value.trim(), ph = $('#fPh').value.trim(), nt = $('#fNt').value.trim();
  if (!t || !d) return bkError('Elige un tratamiento y un especialista.');
  if (!date) return bkError('Elige la fecha de tu cita.');
  if (!sel) return bkError('Elige un horario.');
  if (n.length < 3) return bkError('Escribe tu nombre completo.');
  if (ph.replace(/\D/g, '').length < 7) return bkError('Escribe un número de celular válido.');
  const c = {
    code: 'CS-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    n, ph, nt, date, time: sel,
    tr: t.n, trId: t.id, dr: d.n, drId: d.id, pr: p ? `${p.b} · ${p.t}` : '',
    price: p ? money(p.p) : money(t.p), st: 'pendiente'
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
  $('#okTxt').textContent = `${c.tr} con ${c.dr}, el ${new Date(c.date + 'T00:00').toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${c.time}.`;
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
  if (!MODS.some(m => m[0] === id)) id = 'inicio';
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
    const el = e.target.closest?.('.tilt');
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
  const n = telWa(S.info.whatsapp);
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(text || 'Hola, quiero hacer una consulta.')}`, '_blank', 'noopener');
}
const toggleWa = on => { $('#waPanel').classList.toggle('on', on); if (on) { $('#waTip').hidden = true; $('.wa-fab .badge')?.remove(); } };

/* ---------- Render general ---------- */
let applyQueued = 0;
function applyAll() {
  buildNav(); renderHome(); renderTr(); renderPr(); renderDr(); renderSched(); renderLoc(); renderSocial();
  renderBookingSelects(); renderSum();
  applyTexts(); applyImages(); renderStatus();
  if (editing) enableEditables();
  observeReveals();
}
const applySoon = () => { clearTimeout(applyQueued); applyQueued = setTimeout(applyAll, 160); };

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
function enableEditables() {
  $$('[data-k],[data-i]').forEach(el => { el.contentEditable = 'true'; el.spellcheck = true; });
}
function startEdit() {
  editing = true;
  document.body.classList.add('edit');
  $('#btnEdit').innerHTML = '<i class="fa-solid fa-sliders"></i>';
  enableEditables();
  listenCitas();
  toast('Modo edición activo: toca textos o imágenes');
}
async function stopEdit() {
  if (dirtyImg.size || editDirty) { if (!confirm('Tienes cambios sin guardar. ¿Salir de todas formas?')) return; }
  editing = false; editDirty = false;
  document.body.classList.remove('edit');
  $('#btnEdit').innerHTML = '<i class="fa-solid fa-lock"></i>';
  $$('[data-k],[data-i]').forEach(el => el.contentEditable = 'false');
  modal('#adm', false);
  if (citasUnsub) { citasUnsub(); citasUnsub = null; }
  if (fb) { try { await fb.au.signOut(fb.auth); } catch { } }
  // descartar lo que no se guardó
  if (fb) { const c = store.get('colsan_cache'); if (c?.S) { S = merge(c.S); IMG = c.IMG || {}; } }
  else { const w = store.get('colsan_web'); S = w ? merge(w) : structuredClone(DEF); IMG = store.get('colsan_img') || {}; }
  dirtyImg.clear();
  applyAll(); startTyped();
}
let editDirty = false;
document.addEventListener('input', e => {
  const el = e.target.closest?.('[data-k],[data-i]');
  if (!editing || !el || !el.isContentEditable) return;
  editDirty = true;
  if (el.dataset.k) { const k = el.dataset.k; S.T[k] = el.textContent.trim(); $$(`[data-k="${k}"]`).forEach(o => o !== el && (o.textContent = S.T[k])); }
  else { const k = el.dataset.i; S.info[k] = unb(el.textContent.trim()); $$(`[data-i="${k}"]`).forEach(o => o !== el && (o.textContent = (k === 'nombre' || k === 'legal') ? nb(S.info[k]) : S.info[k])); }
});
async function save(btn) {
  $$('[data-k]').forEach(el => { if (el.isContentEditable) S.T[el.dataset.k] = el.textContent.trim(); });
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
    dirtyImg.clear(); editDirty = false;
    toast('✅ Cambios guardados');
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
  try { IMG[key] = await shrink(file, max); dirtyImg.add(key); applyAll(); if ($('#adm').classList.contains('on')) renderAdm(); toast('Imagen lista. Pulsa Guardar para publicarla.'); }
  catch { toast('No se pudo leer esa imagen'); }
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
  const cols = [['code', 'Código'], ['date', 'Fecha'], ['time', 'Hora'], ['n', 'Paciente'], ['ph', 'Celular'], ['tr', 'Tratamiento'], ['dr', 'Especialista'], ['pr', 'Promoción'], ['price', 'Precio'], ['st', 'Estado'], ['nt', 'Motivo']];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const txt = '﻿' + [cols.map(c => q(c[1])).join(';'), ...filteredCitas().map(c => cols.map(([k]) => q(c[k])).join(';'))].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = `citas-colsan-${todayStr()}.csv`; a.click();
}
const filteredCitas = () => allCitas().filter(c => (!citaFilter.date || c.date === citaFilter.date) && (!citaFilter.st || c.st === citaFilter.st));

/* ---------- Panel de edición ---------- */
const TABS = [['general', 'fa-id-card', 'Datos'], ['imagenes', 'fa-image', 'Imágenes'], ['frases', 'fa-quote-left', 'Frases'], ['tr', 'fa-tooth', 'Tratamientos'], ['pr', 'fa-tags', 'Promociones'], ['dr', 'fa-user-doctor', 'Especialistas'], ['sc', 'fa-clock', 'Horarios'], ['citas', 'fa-calendar-check', 'Citas']];
const INFO_F = [
  ['nombre', 'Nombre corto (cabecera y portada)'], ['legal', 'Nombre completo'], ['director', 'Director(a)'], ['licencia', 'Licencia / registro'],
  ['direccion', 'Dirección', 1], ['referencia', 'Referencia para llegar', 1], ['mapa', 'Ubicación del mapa: dirección con ciudad, o coordenadas (ej. -17.9647,-67.1060)', 1],
  ['telefono', 'Teléfono'], ['whatsapp', 'WhatsApp con código de país (ej. 59170012345)'], ['correo', 'Correo'], ['intervalo', 'Minutos entre citas'],
  ['facebook', 'Enlace de Facebook', 1], ['tiktok', 'Enlace de TikTok', 1], ['instagram', 'Enlace de Instagram', 1]
];
const LISTS = {
  tr: { f: { n: 'Nombre', c: 'Categoría', p: 'Precio (Bs.)', d: 'Duración', x: 'Descripción corta' }, num: ['p'], add: () => row(['n', 'c', 'p', 'd', 'x'], ['Nuevo tratamiento', 'Preventiva', 0, '30 min', '']) },
  pr: { f: { b: 'Etiqueta', t: 'Título', o: 'Precio normal', p: 'Precio promo (0 = gratis)', v: 'Vigente hasta' }, num: ['o', 'p'], add: () => row(['b', 't', 'o', 'p', 'v'], ['NUEVO', 'Nueva promoción', 0, 0, '']) },
  dr: { f: { n: 'Nombre', s: 'Especialidad', h: 'Días de atención' }, num: [], add: () => row(['n', 's', 'h'], ['Dr. Nuevo', 'Especialidad', 'Lunes a viernes']) }
};
function renderAdm() {
  $('#atabs').innerHTML = TABS.map(([id, ic, l]) => `<button data-tab="${id}" class="${id === admTab ? 'on' : ''}"><i class="fa-solid ${ic}"></i> ${l}</button>`).join('');
  const b = $('#abody');
  if (admTab === 'general') {
    b.innerHTML = `${fb ? '' : '<p class="alert" style="background:#fff8e1;border-color:#f5d77a;color:#6b4e00">Firebase no está configurado: lo que guardes se queda solo en este navegador. Revisa el archivo LEEME.md.</p>'}
      <p class="hint">Estos datos aparecen en toda la página. Los cambios se ven al instante; pulsa <b>Guardar</b> para publicarlos.</p>
      <div class="form">${INFO_F.map(([k, l, full]) => `<label class="${full ? 'full' : ''}">${l}<input data-info="${k}" value="${esc(S.info[k])}" ${k === 'intervalo' ? 'type="number" min="15" max="180"' : ''}></label>`).join('')}</div>
      <h3 style="margin-top:26px">Nombres del menú</h3>
      <div class="form">${MODS.map(([id, , def]) => `<label>${def}<input data-t="nav_${id}" value="${esc(navLabel(id))}"></label>`).join('')}</div>`;
  } else if (admTab === 'imagenes') {
    b.innerHTML = `<p class="hint">Sube tus fotos o logos. Se optimizan solas para que la página cargue rápido.</p>` + IMG_SLOTS.map(([k, l]) => `
      <div class="imgrow"><div class="th ${k.startsWith('logo') ? 'contain' : ''}" style="background-image:url('${imgOf(k)}')"></div><b>${l}${IMG[k] ? ' <span class="chip-s">propia</span>' : ''}</b>
      <label class="btn sm ghost"><i class="fa-solid fa-upload"></i>Cambiar<input type="file" accept="image/*" data-imgkey="${k}" hidden></label>
      ${IMG[k] ? `<button class="btn sm ghost" data-imgreset="${k}">Restaurar</button>` : ''}</div>`).join('');
  } else if (admTab === 'frases') {
    b.innerHTML = `<p class="hint">Una frase por línea. Aparecen en la portada (efecto máquina de escribir) y en la animación al cambiar de módulo.</p>
      <textarea data-frases rows="12">${esc(S.frases.join('\n'))}</textarea>`;
  } else if (LISTS[admTab]) {
    const L = LISTS[admTab];
    b.innerHTML = (admTab === 'tr' ? '<p class="hint">La <b>categoría</b> crea los filtros del catálogo (Preventiva, Estética, Ortodoncia, Cirugía, Restauración, Niños u otra que quieras).</p>' : '')
      + S[admTab].map((r, i) => `<div class="aitem">
        ${admTab === 'dr' ? `<div style="display:flex;align-items:center;gap:10px"><div class="th" style="width:64px;height:64px;border-radius:50%;background:#dfeef7 center/cover url('${IMG['dr_' + r.id] || ''}')"></div><label class="btn sm ghost">Foto<input type="file" accept="image/*" data-imgkey="dr_${r.id}" hidden></label></div>` : ''}
        ${Object.entries(L.f).map(([f, l]) => `<label>${l}<input data-l="${admTab}" data-r="${i}" data-f="${f}" value="${esc(r[f])}" ${L.num.includes(f) ? 'type="number" min="0"' : ''}></label>`).join('')}
        <div class="acts">${i ? `<button class="btn sm ghost" data-up="${i}" title="Subir"><i class="fa-solid fa-arrow-up"></i></button>` : ''}<button class="btn sm ghost" data-del="${i}"><i class="fa-solid fa-trash"></i>Quitar</button></div>
      </div>`).join('') + `<button class="btn" data-add><i class="fa-solid fa-plus"></i>Agregar</button>`;
  } else if (admTab === 'sc') {
    b.innerHTML = `<p class="hint">Escribe las horas así: <b>08:30 - 12:30</b>. Con eso la página calcula si está ABIERTO o CERRADO y qué horarios de cita ofrecer. Cualquier otro texto (ej. "Solo urgencias") se muestra tal cual.</p>`
      + S.sc.map((r, i) => `<div class="aitem"><label>Día<input data-sc="${i}" data-f="d" value="${esc(r.d)}"></label><label>Mañana<input data-sc="${i}" data-f="a" value="${esc(r.a)}"></label><label>Tarde<input data-sc="${i}" data-f="p" value="${esc(r.p)}"></label></div>`).join('');
  } else if (admTab === 'citas') {
    const list = filteredCitas();
    b.innerHTML = `<div class="form" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:16px;align-items:end">
        <label>Fecha<input type="date" data-cf="date" value="${esc(citaFilter.date)}"></label>
        <label>Estado<select data-cf="st"><option value="">Todos</option>${['pendiente', 'confirmada', 'atendida', 'cancelada'].map(s => `<option ${s === citaFilter.st ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <button class="btn ghost" data-csv><i class="fa-solid fa-file-excel"></i>Descargar (Excel)</button>
      </div>
      <p class="hint">${list.length} cita(s)${fb ? ' · se actualiza en vivo' : ' · guardadas en este navegador'}</p>`
      + (list.length ? list.map(c => `<div class="cita">
        <div class="top-l"><b>${esc(c.code)} · ${esc(c.n)}</b><span class="st ${esc(c.st)}">${esc(c.st)}</span></div>
        <div><i class="fa-regular fa-calendar"></i> ${esc(c.date)} · ${esc(c.time)} &nbsp; <i class="fa-solid fa-tooth"></i> ${esc(c.tr)} · ${esc(c.dr)} · ${esc(c.price)}</div>
        ${c.pr ? `<div class="muted">Promo: ${esc(c.pr)}</div>` : ''}${c.nt ? `<div class="muted">Motivo: ${esc(c.nt)}</div>` : ''}
        <div class="btns" style="align-items:center">
          <select data-cst="${esc(c.id)}" style="width:auto">${['pendiente', 'confirmada', 'atendida', 'cancelada'].map(s => `<option ${s === c.st ? 'selected' : ''}>${s}</option>`).join('')}</select>
          <a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${telWa(c.ph)}?text=${encodeURIComponent(`Hola ${c.n}, te escribimos de ${S.info.nombre} para confirmar tu cita ${c.code}: ${c.tr}, el ${c.date} a las ${c.time}.`)}"><i class="fa-brands fa-whatsapp"></i>${esc(c.ph)}</a>
          <button class="btn sm ghost" data-cdel="${esc(c.id)}"><i class="fa-solid fa-trash"></i></button>
        </div></div>`).join('') : '<p class="note">No hay citas con ese filtro.</p>');
  }
}
function openAdm(tab) { if (tab) admTab = tab; modal('#adm', true); renderAdm(); }

$('#adm').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.tab) { admTab = d.tab; renderAdm(); $('#abody').scrollTop = 0; }
  else if (d.add !== undefined) { S[admTab].push(LISTS[admTab].add()); editDirty = true; renderAdm(); applySoon(); }
  else if (d.del) { if (confirm('¿Quitar este elemento?')) { S[admTab].splice(+d.del, 1); editDirty = true; renderAdm(); applySoon(); } }
  else if (d.up) { const a = S[admTab], i = +d.up; [a[i - 1], a[i]] = [a[i], a[i - 1]]; editDirty = true; renderAdm(); applySoon(); }
  else if (d.imgreset) { delete IMG[d.imgreset]; dirtyImg.add(d.imgreset); renderAdm(); applyAll(); }
  else if (d.cdel) delCita(d.cdel);
  else if (d.csv !== undefined) csv();
});
$('#adm').addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (d.info) { S.info[d.info] = d.info === 'intervalo' ? (+t.value || 45) : t.value; }
  else if (d.t) S.T[d.t] = t.value;
  else if (d.l) { S[d.l][+d.r][d.f] = LISTS[d.l].num.includes(d.f) ? (+t.value || 0) : t.value; }
  else if (d.sc) S.sc[+d.sc][d.f] = t.value;
  else if (t.matches('[data-frases]')) S.frases = t.value.split('\n').map(s => s.trim()).filter(Boolean);
  else return;
  editDirty = true; applySoon();
});
$('#adm').addEventListener('change', e => {
  const t = e.target, d = t.dataset;
  if (d.imgkey && t.files[0]) setImage(d.imgkey, t.files[0]);
  else if (d.cst) setCitaSt(d.cst, t.value);
  else if (d.cf) { citaFilter[d.cf] = t.value; renderAdm(); }
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
    const im = t.closest('[data-imgedit]');
    if (im) { e.preventDefault(); quickKey = im.dataset.imgedit; $('#quickImg').value = ''; $('#quickImg').click(); return; }
    if (t.closest('[data-k],[data-i]')) { e.preventDefault(); return; }
  }
  const el = t.closest('[data-go],[data-wa],[data-cat],[data-slot],[data-close]');
  if (!el) { if (!t.closest('#waPanel,#waFab')) toggleWa(false); return; }
  const d = el.dataset;
  if (d.go) { e.preventDefault(); go(d.go, { tr: d.tr, pr: d.pr, dr: d.dr }); }
  else if (d.wa !== undefined) { e.preventDefault(); openWa(d.wa); }
  else if (d.cat !== undefined) { cat = d.cat; renderTr(); observeReveals(); }
  else if (d.slot) { sel = d.slot; $$('[data-slot]').forEach(b => b.classList.toggle('on', b === el)); renderSum(); $('#bkErr').hidden = true; }
  else if (d.close !== undefined) el.closest('.modal').classList.remove('on');
});
$('#quickImg').addEventListener('change', e => { const f = e.target.files[0]; if (f && quickKey) setImage(quickKey, f); });
$('#q').addEventListener('input', () => { renderTr(); observeReveals(); });
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
  if (start && start !== 'inicio') swapTo(MODS.some(m => m[0] === start) ? start : 'inicio');
  refreshSlots();
  startTyped();
  setInterval(renderStatus, 30000);

  fb = await initFirebase();
  if (fb && await loadRemote() && !editing) { applyAll(); startTyped(); }
})();
