'use strict';

const TZ = 'America/Mexico_City';
// Mexico abolished daylight saving time in 2022: CDMX is UTC-6 all year.
const CDMX_OFFSET = '-06:00';

const DAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DAY_ES = ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'];
const DAY_RU = ['по воскресеньям', 'по понедельникам', 'по вторникам', 'по средам', 'по четвергам', 'по пятницам', 'по субботам'];
const RRULE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const STATES = {
  normal: { es: 'Clases normales', ru: 'Учимся по расписанию' },
  festivo: { es: 'Días festivos', ru: 'Праздники' },
  sin_clases: { es: 'Sin clases', ru: 'Занятий нет' },
};

// ── helpers ──────────────────────────────────────────────────────────────────

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

const ru = (text) => el('span', { class: 'ru', lang: 'ru' }, text);
const link = (href, text, cls = 'mini') => el('a', { class: cls, href, target: '_blank', rel: 'noopener' }, text);
const toDate = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').trim());
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

function toTime(v) {
  const m = String(v ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}

function safeUrl(v) {
  if (!v) return null;
  try {
    const url = new URL(String(v).trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function cdmxNow() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const dayIndex = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();

function fmtDate(date, lang) {
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

// The class time in the viewer's own zone, or null when that is CDMX time anyway.
function localTime(date, time) {
  const at = new Date(`${date}T${time}:00${CDMX_OFFSET}`);
  const fmt = (tz) => new Intl.DateTimeFormat('es-MX', {
    timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).format(at);
  const viewer = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return fmt(viewer) === fmt(TZ) ? null : fmt(viewer);
}

// ── data ─────────────────────────────────────────────────────────────────────

function normalise(raw, problems) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const c = data.clase ?? {};

  const day = DAYS.indexOf(String(c.dia ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim());
  const start = toTime(c.inicio);
  const end = toTime(c.fin);
  const cls = day >= 0 && start && end ? { day, start, end } : null;
  if (raw && !cls) problems.push('clase: revisa "dia", "inicio" y "fin".');

  const absences = [];
  (Array.isArray(data.ausencias) ? data.ausencias : []).forEach((a, i) => {
    const from = toDate(a?.desde);
    const to = toDate(a?.hasta ?? a?.desde);
    if (!isDate(from) || !isDate(to)) {
      problems.push(`ausencias #${i + 1}: las fechas deben ser AAAA-MM-DD.`);
      return;
    }
    absences.push({ from, to, type: a?.tipo === 'festivo' ? 'festivo' : 'sin_clases', reason: String(a?.motivo ?? '') });
  });

  const mode = String(data.estado?.modo ?? 'auto').trim();
  if (mode !== 'auto' && !STATES[mode]) problems.push(`estado.modo "${mode}" no existe; se usa "auto".`);

  return {
    mode: STATES[mode] ? mode : 'auto',
    message: String(data.estado?.mensaje ?? '').trim(),
    cls,
    meet: safeUrl(c.enlace),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.contacto?.correo ?? '').trim())
      ? String(data.contacto.correo).trim() : null,
    description: String(data.proyecto?.descripcion ?? '').trim(),
    absences,
    lessons: (Array.isArray(data.lecciones) ? data.lecciones : [])
      .filter((l) => l && typeof l === 'object')
      .map((l) => ({
        number: l.numero, titleEs: String(l.titulo_es ?? ''), titleRu: String(l.titulo_ru ?? ''),
        date: toDate(l.fecha), slides: safeUrl(l.presentacion), summary: safeUrl(l.resumen),
        audio: safeUrl(l.audio), homework: safeUrl(l.tarea),
      }))
      .sort((a, b) => (Number(b.number) || 0) - (Number(a.number) || 0)),
  };
}

// ── logic ────────────────────────────────────────────────────────────────────

const absenceOn = (d, date) => d.absences.find((a) => a.from <= date && date <= a.to);

function currentStatus(d, now) {
  if (d.mode !== 'auto') return { key: d.mode, message: d.message };
  const absence = absenceOn(d, now.date);
  if (!absence) return { key: 'normal', message: d.message };
  const back = nextClass(d, { date: addDays(absence.to, 1), time: '00:00' });
  return {
    key: absence.type,
    message: d.message || [absence.reason, back && `Regresamos el ${fmtDate(back.date, 'es')}.`,
      back && `Возвращаемся: ${fmtDate(back.date, 'ru')}.`].filter(Boolean).join(' '),
  };
}

// The next class that is not cancelled, starting from `now`.
function nextClass(d, now) {
  if (!d.cls) return null;
  for (let i = 0; i < 120; i++) {
    const date = addDays(now.date, i);
    if (dayIndex(date) !== d.cls.day || absenceOn(d, date)) continue;
    if (i === 0 && d.cls.end <= now.time) continue;
    return { date, live: i === 0 && d.cls.start <= now.time };
  }
  return null;
}

function calendarUrl(d, now) {
  let date = now.date;
  while (dayIndex(date) !== d.cls.day) date = addDays(date, 1);
  const stamp = (t) => `${date.replaceAll('-', '')}T${t.replace(':', '')}00`;
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Clase de ruso con Slaviana',
    dates: `${stamp(d.cls.start)}/${stamp(d.cls.end)}`,
    ctz: TZ,
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${RRULE[d.cls.day]}`,
    details: `${d.meet ?? ''}\n${location.href}`.trim(),
    location: d.meet ?? '',
  })}`;
}

// Google Slides / Canva share links → embeddable URLs; anything else as is.
function embedUrl(url) {
  const slides = url.match(/^https:\/\/docs\.google\.com\/presentation\/d\/(e\/)?([\w-]+)/);
  if (slides) return `https://docs.google.com/presentation/d/${slides[1] ?? ''}${slides[2]}/embed`;
  const canva = url.match(/^(https:\/\/www\.canva\.com\/design\/[\w-]+\/[\w-]+)\/view/);
  if (canva) return `${canva[1]}/view?embed`;
  return url;
}

// ── rendering ────────────────────────────────────────────────────────────────

function renderStatus(d, now) {
  const status = currentStatus(d, now);
  const next = status.key === 'normal' ? nextClass(d, now) : null;

  let nextLine = null;
  if (next?.live) {
    nextLine = el('p', { class: 'proxima en-vivo' }, '¡La clase está en curso! ', ru('Урок идёт!'));
  } else if (next) {
    const local = localTime(next.date, d.cls.start);
    nextLine = el('p', { class: 'proxima' },
      el('strong', {}, 'Próxima clase: '), `${fmtDate(next.date, 'es')}, ${d.cls.start} (CDMX)`,
      local && el('span', { class: 'local' }, ` — ${local} en tu zona horaria`));
  }

  const box = document.getElementById('estado');
  box.dataset.estado = status.key;
  box.replaceChildren(
    el('div', { class: 'mascota' }),
    el('div', { class: 'texto' },
      el('p', { class: `semaforo ${status.key}` }, el('span', { class: 'luz', 'aria-hidden': 'true' }), STATES[status.key].es),
      el('p', { class: 'ru grande', lang: 'ru' }, STATES[status.key].ru),
      status.message && el('p', { class: 'mensaje' }, status.message),
      nextLine),
  );
  box.querySelector('.mascota').innerHTML = Mascota[status.key]();
}

function renderClass(d, now) {
  const button = d.meet
    ? el('a', { class: 'boton-entrar', href: d.meet, target: '_blank', rel: 'noopener' },
      'Entrar a la clase', ru('Войти на урок'))
    : el('span', { class: 'boton-entrar desactivado', 'aria-disabled': 'true' },
      'Enlace pendiente', ru('Ссылка скоро появится'));

  const when = d.cls && el('div', { class: 'tarjeta horario' },
    el('p', { class: 'cuando' }, `${DAY_ES[d.cls.day]}, ${d.cls.start}–${d.cls.end}`),
    el('p', {}, ru(`${DAY_RU[d.cls.day]}, ${d.cls.start}–${d.cls.end}`)),
    el('p', { class: 'nota' }, 'Clase grupal en Google Meet · Hora del Centro de México (CDMX)'),
    link(calendarUrl(d, now), '+ Añadir a Google Calendar'));

  document.getElementById('clase').replaceChildren(button, when);
}

function renderLessons(d) {
  const container = document.getElementById('lecciones');
  if (!d.lessons.length) {
    container.replaceChildren(el('p', { class: 'vacio' }, 'Pronto habrá materiales. ', ru('Материалы скоро появятся.')));
    return;
  }
  container.replaceChildren(...d.lessons.map((l) => {
    const viewer = el('div', { class: 'visor', hidden: true });
    const toggle = l.slides && el('button', {
      type: 'button', class: 'mini',
      onclick: (e) => {
        if (!viewer.firstChild) {
          viewer.append(
            el('iframe', { src: embedUrl(l.slides), title: `Presentación: ${l.titleEs}`, loading: 'lazy', allowfullscreen: true }),
            link(l.slides, 'Abrir en otra pestaña', null),
          );
        }
        viewer.hidden = !viewer.hidden;
        e.currentTarget.textContent = viewer.hidden ? 'Ver presentación' : 'Ocultar presentación';
      },
    }, 'Ver presentación');
    const audio = l.audio && (/\.(mp3|m4a|ogg|wav)(\?|$)/i.test(l.audio)
      ? el('audio', { controls: true, preload: 'none', src: l.audio })
      : link(l.audio, 'Audio'));
    return el('article', { class: 'leccion' },
      el('p', { class: 'numero' }, l.number != null ? `Lección ${l.number}` : 'Lección',
        isDate(l.date) && el('span', { class: 'fecha' }, ` · ${fmtDate(l.date, 'es')}`)),
      el('h3', {}, l.titleEs),
      l.titleRu && el('p', { class: 'ru', lang: 'ru' }, l.titleRu),
      el('div', { class: 'acciones' },
        toggle,
        l.summary && link(l.summary, 'Descargar resumen'),
        l.homework && link(l.homework, 'Tarea'),
        audio),
      viewer);
  }));
}

// The feedback form opens the student's mail app with the message filled in:
// no server and no third-party form service.
function renderContact(d) {
  const section = document.getElementById('contacto');
  if (!d.email) {
    section.hidden = true;
    return;
  }
  document.getElementById('correo').replaceChildren(el('a', { href: `mailto:${d.email}` }, d.email));
  document.getElementById('formulario').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = form.nombre.value.trim();
    const body = `${form.mensaje.value.trim()}${name ? `\n\n— ${name}` : ''}`;
    const subject = `Clases de ruso${name ? ` — ${name}` : ''}`;
    location.href = `mailto:${d.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

function renderProblems(problems) {
  if (!problems.length) return;
  const box = document.getElementById('problemas');
  box.hidden = false;
  box.replaceChildren(el('strong', {}, 'Revisa datos.yml'), el('ul', {}, problems.map((p) => el('li', {}, p))));
}

async function main() {
  const problems = [];
  let raw;
  try {
    const response = await fetch('datos.yml', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    raw = jsyaml.load(await response.text());
  } catch (error) {
    problems.push(`No se pudo leer datos.yml: ${error.message}`);
  }
  const d = normalise(raw, problems);
  const now = cdmxNow();
  renderProblems(problems);
  renderStatus(d, now);
  renderClass(d, now);
  renderLessons(d);
  renderContact(d);
  document.getElementById('descripcion').textContent = d.description;
}

main();
