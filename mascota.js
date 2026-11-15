'use strict';

// The bear mascot, drawn as inline SVG. One variant per class status.
// eslint-disable-next-line no-unused-vars
const Mascota = (() => {
  const FUR = '#9A6340';
  const FUR_DARK = '#7A4A2E';
  const MUZZLE = '#F0D2AA';
  const INK = '#3B2418';

  const ears = `
    <circle cx="52" cy="66" r="21" fill="${FUR}"/><circle cx="52" cy="66" r="11" fill="${FUR_DARK}"/>
    <circle cx="148" cy="66" r="21" fill="${FUR}"/><circle cx="148" cy="66" r="11" fill="${FUR_DARK}"/>`;
  const head = `<circle cx="100" cy="112" r="60" fill="${FUR}"/>`;
  const muzzle = `
    <ellipse cx="100" cy="136" rx="30" ry="22" fill="${MUZZLE}"/>
    <ellipse cx="100" cy="125" rx="9" ry="6" fill="${INK}"/>`;
  const cheeks = `
    <circle cx="65" cy="130" r="9" fill="#F29C9C" opacity=".7"/>
    <circle cx="135" cy="130" r="9" fill="#F29C9C" opacity=".7"/>`;
  const openEyes = `
    <circle cx="78" cy="106" r="6.5" fill="${INK}"/><circle cx="80" cy="104" r="2" fill="#fff"/>
    <circle cx="122" cy="106" r="6.5" fill="${INK}"/><circle cx="124" cy="104" r="2" fill="#fff"/>`;
  const smile = `<path d="M91 139 Q100 148 109 139" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;

  // Classes as usual: a sombrero.
  const sombrero = `
    <ellipse cx="100" cy="60" rx="92" ry="17" fill="#E0A43A"/>
    <path d="M14 60 Q100 92 186 60" stroke="#C8553D" stroke-width="4" fill="none"/>
    <path d="M68 60 Q70 14 100 12 Q130 14 132 60 Z" fill="#EBBB52"/>
    <path d="M70 47 Q100 54 130 47 L131 57 Q100 64 69 57 Z" fill="#C8553D"/>
    <path d="M78 52 l5 -4 l5 4 l5 -4 l5 4 l5 -4 l5 4 l5 -4 l5 4" stroke="#3E9C9B" stroke-width="2" fill="none"/>`;

  // Holiday: party hat, papel picado and confetti.
  const fiesta = `
    <path d="M0 18 L200 18" stroke="#7A6A5A" stroke-width="1.5"/>
    <path d="M14 18 h26 v16 l-4 -3 l-5 3 l-4 -3 l-5 3 l-4 -3 l-4 3 Z" fill="#C8553D"/>
    <path d="M160 18 h26 v16 l-4 -3 l-5 3 l-4 -3 l-5 3 l-4 -3 l-4 3 Z" fill="#3E9C9B"/>
    <path d="M100 6 L124 60 L76 60 Z" fill="#3E9C9B"/>
    <path d="M88 33 L112 33 M82 47 L118 47" stroke="#EBBB52" stroke-width="4"/>
    <circle cx="100" cy="6" r="7" fill="#C8553D"/>
    <rect x="30" y="100" width="7" height="7" fill="#EBBB52" transform="rotate(20 33 103)"/>
    <rect x="165" y="92" width="7" height="7" fill="#C8553D" transform="rotate(-25 168 95)"/>
    <rect x="22" y="150" width="6" height="6" fill="#3E9C9B" transform="rotate(40 25 153)"/>
    <rect x="172" y="150" width="6" height="6" fill="#EBBB52" transform="rotate(10 175 153)"/>`;
  const openSmile = `<path d="M89 138 Q100 154 111 138 Z" fill="${INK}"/><path d="M95 145 Q100 150 105 145" fill="#E77"/>`;

  // No classes: sleepy, under a blanket, with a thermometer.
  const sleepyEyes = `
    <path d="M70 107 Q78 101 86 107" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M114 107 Q122 101 130 107" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  const thermometer = `
    <path d="M106 142 L148 156" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    <path d="M106 142 L126 149" stroke="#D9473A" stroke-width="3" stroke-linecap="round"/>
    <circle cx="149" cy="156" r="5" fill="#D9473A"/>`;
  const blanket = `
    <path d="M8 200 Q20 150 58 160 Q100 176 142 160 Q180 150 192 200 Z" fill="#3E9C9B"/>
    <g fill="#FBF3E4" opacity=".85">
      <circle cx="40" cy="182" r="4"/><circle cx="75" cy="178" r="4"/><circle cx="110" cy="184" r="4"/>
      <circle cx="145" cy="176" r="4"/><circle cx="170" cy="188" r="4"/><circle cx="58" cy="194" r="4"/>
      <circle cx="128" cy="196" r="4"/>
    </g>
    <text x="174" y="38" font-family="Nunito, sans-serif" font-weight="800" font-size="22" fill="#7A6A5A">z</text>
    <text x="188" y="20" font-family="Nunito, sans-serif" font-weight="800" font-size="16" fill="#7A6A5A">z</text>`;

  const svg = (body, label) =>
    `<svg viewBox="0 0 200 200" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

  return {
    normal: () => svg(ears + head + sombrero + muzzle + cheeks + openEyes + smile, 'Osito con sombrero'),
    festivo: () => svg(fiesta + ears + head + muzzle + cheeks + openEyes + openSmile, 'Osito de fiesta'),
    sin_clases: () => svg(ears + head + muzzle + cheeks + sleepyEyes + thermometer + blanket, 'Osito enfermo bajo una cobija'),
  };
})();
