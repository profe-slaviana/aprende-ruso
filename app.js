'use strict';

const TZ = 'America/Mexico_City';
// Mexico abolished daylight saving time in 2022: CDMX is UTC-6 all year.
const CDMX_OFFSET = '-06:00';

const DAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const WEEK_ORDER = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DAY_LABELS = {
  lunes: ['Lunes', 'Понедельник'], martes: ['Martes', 'Вторник'], miercoles: ['Miércoles', 'Среда'],
  jueves: ['Jueves', 'Четверг'], viernes: ['Viernes', 'Пятница'], sabado: ['Sábado', 'Суббота'],
  domingo: ['Domingo', 'Воскресенье'],
};
const RRULE_DAYS = { lunes: 'MO', martes: 'TU', miercoles: 'WE', jueves: 'TH', viernes: 'FR', sabado: 'SA', domingo: 'SU' };

const STATES = {
  normal: { es: 'Clases normales', ru: 'Учимся по расписанию' },
  festivo: { es: 'Días festivos', ru: 'Праздники' },
  sin_clases: { es: 'Sin clases', ru: 'Занятий нет' },
};
const TYPES = {
  grupo: ['Grupo', 'Группа'],
  individual: ['Individual', 'Индивидуально'],
  disponible: ['Disponible', 'Свободно'],
};

// ── small helpers ────────────────────────────────────────────────────────────

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
const normDay = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
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
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const weekday = (date) => DAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
const instant = (date, time) => new Date(`${date}T${time}:00${CDMX_OFFSET}`);

function fmtDate(date, lang) {
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

// "18:00 (CDMX)" plus the viewer's own time when they are elsewhere.
function localHint(date, time) {
  const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmt = (tz) => new Intl.DateTimeFormat('es-MX', {
    timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).format(instant(date, time));
  return fmt(viewerTz) === fmt(TZ) ? null : `${fmt(viewerTz)} en tu zona horaria`;
}

// ── data normalisation ──────────────────────────────────────────────────────

function normalise(raw, problems) {
  const data = raw && typeof raw === 'object' ? raw : {};

  const slots = [];
  (Array.isArray(data.horario) ? data.horario : []).forEach((s, i) => {
    const slot = {
      day: normDay(s?.dia), start: toTime(s?.inicio), end: toTime(s?.fin),
      level: String(s?.nivel ?? ''), type: String(s?.tipo ?? 'grupo').trim(),
    };
    if (!DAY_LABELS[slot.day] || !slot.start || !slot.end || !TYPES[slot.type]) {
      problems.push(`horario #${i + 1}: revisa "dia", "inicio", "fin" y "tipo".`);
      return;
    }
    slots.push(slot);
  });

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

  const lessons = (Array.isArray(data.lecciones) ? data.lecciones : [])
    .filter((l) => l && typeof l === 'object')
    .map((l) => ({
      number: l.numero, titleEs: String(l.titulo_es ?? ''), titleRu: String(l.titulo_ru ?? ''),
      date: toDate(l.fecha), slides: safeUrl(l.presentacion), summary: safeUrl(l.resumen),
      audio: safeUrl(l.audio), cards: safeUrl(l.tarjetas), homework: safeUrl(l.tarea),
    }))
    .sort((a, b) => (Number(b.number) || 0) - (Number(a.number) || 0));

  const mode = String(data.estado?.modo ?? 'auto').trim();
  if (mode !== 'auto' && !STATES[mode]) problems.push(`estado.modo "${mode}" no existe; se usa "auto".`);

  return {
    mode: STATES[mode] ? mode : 'auto',
    message: String(data.estado?.mensaje ?? '').trim(),
    link: safeUrl(data.clase?.enlace),
    platform: String(data.clase?.plataforma ?? '').trim(),
    code: String(data.clase?.codigo ?? '').trim(),
    whatsapp: String(data.contacto?.whatsapp ?? '').replace(/\D/g, ''),
    description: String(data.proyecto?.descripcion ?? '').trim(),
    slots, absences, lessons,
  };
}

// ── logic ────────────────────────────────────────────────────────────────────

const absenceOn = (d, date) => d.absences.find((a) => a.from <= date && date <= a.to);

function currentStatus(d, now) {
  if (d.mode !== 'auto') return { key: d.mode, message: d.message };
  const absence = absenceOn(d, now.date);
  if (!absence) return { key: 'normal', message: d.message };
  const back = addDays(absence.to, 1);
  return {
    key: absence.type,
    message: d.message || [absence.reason, `Regresamos el ${fmtDate(back, 'es')}.`, `Возвращаемся: ${fmtDate(back, 'ru')}.`]
      .filter(Boolean).join(' '),
  };
}

function nextClass(d, now) {
  if (d.mode === 'festivo' || d.mode === 'sin_clases') return null;
  for (let i = 0; i < 28; i++) {
    const date = addDays(now.date, i);
    if (absenceOn(d, date)) continue;
    const today = d.slots
      .filter((s) => s.day === weekday(date) && s.type !== 'disponible')
      .sort((a, b) => a.start.localeCompare(b.start));
    for (const slot of today) {
      if (i === 0 && slot.end <= now.time) continue;
      return { slot, date, live: i === 0 && slot.start <= now.time };
    }
  }
  return null;
}

function calendarUrl(slot, d, now) {
  let date = now.date;
  while (weekday(date) !== slot.day) date = addDays(date, 1);
  const stamp = (t) => `${date.replaceAll('-', '')}T${t.replace(':', '')}00`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Clase de ruso — ${slot.level}`.trim(),
    dates: `${stamp(slot.start)}/${stamp(slot.end)}`,
    ctz: TZ,
    recur: `RRULE:FREQ=WEEKLY;BYDAY=${RRULE_DAYS[slot.day]}`,
    details: `${location.href}${d.link ? `\n${d.link}` : ''}`,
    location: d.link ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
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
  const label = STATES[status.key];
  const next = status.key === 'normal' ? nextClass(d, now) : null;

  let nextLine = null;
  if (next?.live) {
    nextLine = el('p', { class: 'proxima en-vivo' }, '¡La clase está en curso! ', ru('Урок идёт!'));
  } else if (next) {
    const hint = localHint(next.date, next.slot.start);
    nextLine = el('p', { class: 'proxima' },
      el('strong', {}, 'Próxima clase: '),
      `${fmtDate(next.date, 'es')}, ${next.slot.start} (CDMX) · ${next.slot.level}`,
      hint && el('span', { class: 'local' }, ` — ${hint}`));
  }

  document.getElementById('estado').replaceChildren(
    el('div', { class: 'mascota' }),
    el('div', { class: 'texto' },
      el('p', { class: `semaforo ${status.key}` }, el('span', { class: 'luz', 'aria-hidden': 'true' }), label.es),
      el('p', { class: 'ru grande', lang: 'ru' }, label.ru),
      status.message && el('p', { class: 'mensaje' }, status.message),
      nextLine),
  );
  document.querySelector('#estado .mascota').innerHTML = Mascota[status.key]();
  document.getElementById('estado').dataset.estado = status.key;
}

function renderJoin(d) {
  const button = d.link
    ? el('a', { class: 'boton-entrar', href: d.link, target: '_blank', rel: 'noopener' },
      'Entrar a la clase', ru('Войти на урок'))
    : el('span', { class: 'boton-entrar desactivado', 'aria-disabled': 'true' },
      'Enlace pendiente', ru('Ссылка скоро появится'));
  document.getElementById('entrar').replaceChildren(
    button,
    el('p', { class: 'nota' },
      d.platform && `${d.platform}. `,
      d.code && el('span', {}, 'Código de acceso: ', el('code', {}, d.code), '. '),
      'Horario: Centro de México (CDMX).'),
  );
}

function renderSchedule(d, now) {
  const container = document.getElementById('horario');
  const filters = document.getElementById('filtros');
  const present = Object.keys(TYPES).filter((t) => d.slots.some((s) => s.type === t));
  let active = 'todos';

  const draw = () => {
    const shown = d.slots.filter((s) => active === 'todos' || s.type === active);
    const days = WEEK_ORDER.filter((day) => shown.some((s) => s.day === day));
    if (!days.length) {
      container.replaceChildren(el('p', { class: 'vacio' }, 'Aún no hay horario. ', ru('Расписание скоро появится.')));
      return;
    }
    container.replaceChildren(...days.map((day) => el('article', { class: 'dia' },
      el('h3', {}, DAY_LABELS[day][0], ' ', ru(DAY_LABELS[day][1])),
      shown.filter((s) => s.day === day).sort((a, b) => a.start.localeCompare(b.start)).map((s) => {
        const ask = s.type === 'disponible' && d.whatsapp
          ? el('a', {
            class: 'mini', target: '_blank', rel: 'noopener',
            href: `https://wa.me/${d.whatsapp}?text=${encodeURIComponent(`¡Hola! Me gustaría el horario del ${DAY_LABELS[day][0].toLowerCase()} ${s.start}.`)}`,
          }, 'Pedir este horario')
          : null;
        const add = s.type !== 'disponible'
          ? el('a', { class: 'mini', href: calendarUrl(s, d, now), target: '_blank', rel: 'noopener' }, '+ Google Calendar')
          : null;
        return el('div', { class: `franja ${s.type}` },
          el('span', { class: 'hora' }, `${s.start}–${s.end}`),
          el('span', { class: 'nivel' }, s.level),
          el('span', { class: `etiqueta ${s.type}` }, TYPES[s.type][0]),
          add, ask);
      }))));
  };

  filters.replaceChildren();
  if (present.length > 1) {
    for (const key of ['todos', ...present]) {
      const text = key === 'todos' ? 'Todos' : TYPES[key][0];
      filters.append(el('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(key === active),
        onclick: (e) => {
          active = key;
          filters.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
          draw();
        },
      }, text));
    }
  }
  draw();
}

function renderLessons(d) {
  const container = document.getElementById('lecciones');
  if (!d.lessons.length) {
    container.replaceChildren(el('p', { class: 'vacio' }, 'Pronto habrá materiales. ', ru('Материалы скоро появятся.')));
    return;
  }
  container.replaceChildren(...d.lessons.map((l) => {
    const viewer = el('div', { class: 'visor', hidden: true });
    const links = [
      l.slides && el('button', {
        type: 'button', class: 'mini',
        onclick: (e) => {
          const open = viewer.hidden;
          if (open && !viewer.firstChild) {
            viewer.append(
              el('iframe', { src: embedUrl(l.slides), title: `Presentación: ${l.titleEs}`, loading: 'lazy', allowfullscreen: true }),
              el('a', { href: l.slides, target: '_blank', rel: 'noopener' }, 'Abrir en otra pestaña'),
            );
          }
          viewer.hidden = !open;
          e.currentTarget.textContent = open ? 'Ocultar presentación' : 'Ver presentación';
        },
      }, 'Ver presentación'),
      l.summary && el('a', { class: 'mini', href: l.summary, target: '_blank', rel: 'noopener' }, 'Descargar resumen'),
      l.cards && el('a', { class: 'mini', href: l.cards, target: '_blank', rel: 'noopener' }, 'Tarjetas'),
      l.homework && el('a', { class: 'mini', href: l.homework, target: '_blank', rel: 'noopener' }, 'Tarea'),
    ];
    const audio = l.audio && (/\.(mp3|m4a|ogg|wav)(\?|$)/i.test(l.audio)
      ? el('audio', { controls: true, preload: 'none', src: l.audio })
      : el('a', { class: 'mini', href: l.audio, target: '_blank', rel: 'noopener' }, 'Audio'));
    return el('article', { class: 'leccion' },
      el('p', { class: 'numero' }, l.number != null ? `Lección ${l.number}` : 'Lección',
        isDate(l.date) && el('span', { class: 'fecha' }, ` · ${fmtDate(l.date, 'es')}`)),
      el('h3', {}, l.titleEs),
      l.titleRu && el('p', { class: 'ru', lang: 'ru' }, l.titleRu),
      el('div', { class: 'acciones' }, links, audio),
      viewer);
  }));
}

function renderProblems(problems) {
  const box = document.getElementById('problemas');
  if (!problems.length) return;
  box.hidden = false;
  box.replaceChildren(
    el('strong', {}, 'Revisa datos.yml'),
    el('ul', {}, problems.map((p) => el('li', {}, p))),
  );
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
  renderJoin(d);
  renderSchedule(d, now);
  renderLessons(d);
  document.getElementById('descripcion').textContent = d.description;
}

main();
