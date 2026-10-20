// Seed: SVG art generatsiya qiladi + ko'p skin va kase'larni qo'shadi.
// Idempotent: qayta ishga tushirilsa takrorlanmaydi (weapon+skinName / name bo'yicha upsert).
// Ishga tushirish: node scripts/seed.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Skin = require('../src/models/skins.model');
const Case = require('../src/models/cases.model');

const RARITY = {
  Consumer: '#b0c3d9',
  Industrial: '#5e98d9',
  'Mil-Spec': '#4b69ff',
  Restricted: '#8847ff',
  Classified: '#d32ce6',
  Covert: '#eb4b4b',
  Contraband: '#e4ae39',
};

const SKIN_DIR = path.join(__dirname, '..', 'public', 'img', 'skins');
const CASE_DIR = path.join(__dirname, '..', 'public', 'img', 'cases');

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// [weapon, skinName, rarity, price, condition, float]
const SKINS = [
  ['AK-47', 'Asiimov', 'Covert', 55, 'Field-Tested', 0.35],
  ['AK-47', 'Redline', 'Classified', 28, 'Field-Tested', 0.24],
  ['AK-47', 'Slate', 'Restricted', 9, 'Factory New', 0.07],
  ['AK-47', 'Phantom Disruptor', 'Mil-Spec', 6, 'Minimal Wear', 0.12],
  ['AK-47', 'Elite Build', 'Industrial', 4, 'Field-Tested', 0.3],
  ['AK-47', 'Fire Serpent', 'Covert', 320, 'Field-Tested', 0.26],
  ['M4A4', 'Howl', 'Contraband', 3200, 'Field-Tested', 0.27],
  ['M4A4', 'Neo-Noir', 'Covert', 46, 'Field-Tested', 0.33],
  ['M4A4', 'Desolate Space', 'Classified', 17, 'Minimal Wear', 0.11],
  ['M4A4', 'In Living Color', 'Classified', 22, 'Field-Tested', 0.29],
  ['M4A1-S', 'Printstream', 'Covert', 90, 'Field-Tested', 0.3],
  ['M4A1-S', 'Cyrex', 'Classified', 14, 'Field-Tested', 0.28],
  ['M4A1-S', 'Guardian', 'Restricted', 8, 'Minimal Wear', 0.1],
  ['AWP', 'Dragon Lore', 'Covert', 1450, 'Field-Tested', 0.18],
  ['AWP', 'Asiimov', 'Covert', 95, 'Field-Tested', 0.27],
  ['AWP', 'Neo-Noir', 'Classified', 30, 'Field-Tested', 0.31],
  ['AWP', 'Wildfire', 'Covert', 42, 'Field-Tested', 0.25],
  ['SSG 08', 'Blood in the Water', 'Restricted', 7, 'Minimal Wear', 0.09],
  ['Desert Eagle', 'Blaze', 'Classified', 340, 'Factory New', 0.0],
  ['Desert Eagle', 'Printstream', 'Covert', 75, 'Field-Tested', 0.32],
  ['Desert Eagle', 'Code Red', 'Covert', 38, 'Field-Tested', 0.24],
  ['USP-S', 'Kill Confirmed', 'Covert', 62, 'Field-Tested', 0.26],
  ['USP-S', 'Neo-Noir', 'Classified', 24, 'Field-Tested', 0.3],
  ['USP-S', 'Cortex', 'Restricted', 9, 'Minimal Wear', 0.12],
  ['Glock-18', 'Fade', 'Covert', 210, 'Factory New', 0.0],
  ['Glock-18', 'Water Elemental', 'Classified', 13, 'Field-Tested', 0.27],
  ['Glock-18', 'Vogue', 'Restricted', 7, 'Minimal Wear', 0.13],
  ['Five-SeveN', 'Case Hardened', 'Classified', 35, 'Field-Tested', 0.4],
  ['Karambit', 'Fade', 'Covert', 1750, 'Factory New', 0.0],
  ['Karambit', 'Doppler', 'Covert', 890, 'Factory New', 0.01],
  ['Butterfly Knife', 'Marble Fade', 'Covert', 1200, 'Factory New', 0.0],
];

const key = (w, n) => `${w}|${n}`;

// [name, price, rarity, description, [[skinKey, prob], ...]]
const CASES = [
  ['Arzon kase', 50, 'Consumer', 'Boshlovchilar uchun arzon kase.', [
    [key('AK-47', 'Elite Build'), 30],
    [key('AK-47', 'Phantom Disruptor'), 25],
    [key('AK-47', 'Slate'), 20],
    [key('M4A1-S', 'Guardian'), 15],
    [key('Glock-18', 'Vogue'), 10],
  ]],
  ["Boshlang'ich kase", 100, 'Mil-Spec', 'Birinchi kasingiz — yaxshi balans.', [
    [key('AK-47', 'Slate'), 30],
    [key('AK-47', 'Phantom Disruptor'), 25],
    [key('M4A1-S', 'Guardian'), 20],
    [key('USP-S', 'Cortex'), 15],
    [key('SSG 08', 'Blood in the Water'), 10],
  ]],
  ['Pistolet kase', 250, 'Restricted', 'Faqat pistoletlar: og\'ir zarba.', [
    [key('USP-S', 'Cortex'), 25],
    [key('Glock-18', 'Vogue'), 25],
    [key('Glock-18', 'Water Elemental'), 20],
    [key('USP-S', 'Neo-Noir'), 15],
    [key('Desert Eagle', 'Code Red'), 10],
    [key('Glock-18', 'Fade'), 5],
  ]],
  ['Rifle kase', 400, 'Classified', 'Avtomatlar: Redline va Neo-Noir ichida.', [
    [key('M4A1-S', 'Cyrex'), 25],
    [key('M4A4', 'Desolate Space'), 25],
    [key('M4A4', 'In Living Color'), 20],
    [key('AK-47', 'Redline'), 15],
    [key('M4A4', 'Neo-Noir'), 10],
    [key('AK-47', 'Asiimov'), 5],
  ]],
  ['Sniper kase', 600, 'Classified', 'Snayperlar uchun: Dragon Lore g\'olib!', [
    [key('SSG 08', 'Blood in the Water'), 25],
    [key('AWP', 'Neo-Noir'), 30],
    [key('AWP', 'Wildfire'), 25],
    [key('AWP', 'Asiimov'), 15],
    [key('AWP', 'Dragon Lore'), 5],
  ]],
  ['Covert kase', 900, 'Covert', 'Yuqori daraja — faqat covertlar.', [
    [key('USP-S', 'Kill Confirmed'), 25],
    [key('Desert Eagle', 'Printstream'), 25],
    [key('M4A1-S', 'Printstream'), 20],
    [key('AWP', 'Asiimov'), 15],
    [key('AK-47', 'Asiimov'), 10],
    [key('AWP', 'Wildfire'), 5],
  ]],
  ['Pichoq kase', 2500, 'Covert', 'Bitta ochilish — katta pul.', [
    [key('Karambit', 'Doppler'), 45],
    [key('Butterfly Knife', 'Marble Fade'), 35],
    [key('Karambit', 'Fade'), 20],
  ]],
  ['Kontraband kase', 1500, 'Contraband', 'Howl va boshqa noyoblar.', [
    [key('M4A4', 'Howl'), 40],
    [key('AK-47', 'Fire Serpent'), 30],
    [key('AWP', 'Dragon Lore'), 15],
    [key('Karambit', 'Fade'), 10],
    [key('AWP', 'Asiimov'), 5],
  ]],
];

// ---------- SVG: skin art ----------
function skinSVG(weapon, skinName, rarity, condition) {
  const c = RARITY[rarity] || '#4b69ff';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="260" viewBox="0 0 480 260">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c}"/>
      <stop offset="1" stop-color="#0b0f1f"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c}"/>
      <stop offset="1" stop-color="${c}00"/>
    </linearGradient>
  </defs>
  <rect width="480" height="260" rx="18" fill="#0b0f1f"/>
  <circle cx="430" cy="30" r="130" fill="${c}" opacity="0.16"/>
  <circle cx="40" cy="240" r="100" fill="${c}" opacity="0.12"/>
  <g opacity="0.35" fill="${c}">
    <polygon points="330,0 360,0 240,260 210,260"/>
    <polygon points="380,0 395,0 275,260 260,260"/>
  </g>
  <text x="240" y="132" text-anchor="middle" font-family="Arial Black, Arial, sans-serif"
    font-size="64" font-weight="900" fill="none" stroke="${c}" stroke-width="1.6" opacity="0.55"
    letter-spacing="4">${escapeXml(weapon)}</text>
  <text x="240" y="190" text-anchor="middle" font-family="Arial, sans-serif"
    font-size="30" font-weight="800" fill="url(#g)" letter-spacing="1">${escapeXml(skinName)}</text>
  <text x="240" y="222" text-anchor="middle" font-family="Arial, sans-serif"
    font-size="14" fill="#9aa4cc" letter-spacing="3">${escapeXml(condition.toUpperCase())} · ${escapeXml(rarity.toUpperCase())}</text>
  <rect x="0" y="252" width="480" height="8" fill="url(#bar)"/>
</svg>`;
}

// ---------- SVG: case art ----------
function caseSVG(name, rarity) {
  const c = RARITY[rarity] || '#4b69ff';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="300" viewBox="0 0 440 300">
  <defs>
    <linearGradient id="lid" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c}" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#1a2140"/>
    </linearGradient>
    <linearGradient id="front" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b2244"/>
      <stop offset="1" stop-color="#10152c"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${c}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${c}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="440" height="300" rx="18" fill="#0b0f1f"/>
  <circle cx="220" cy="150" r="150" fill="url(#glow)"/>
  <g transform="translate(220,120)">
    <polygon points="-100,-36 0,-92 100,-36 0,20" fill="url(#lid)"/>
    <polygon points="-100,-36 0,20 0,132 -100,76" fill="url(#front)"/>
    <polygon points="100,-36 0,20 0,132 100,76" fill="#141a36"/>
    <polygon points="-100,-36 0,-92 100,-36 0,20" fill="none" stroke="${c}" stroke-width="3"/>
    <line x1="0" y1="20" x2="0" y2="132" stroke="${c}" stroke-width="3" opacity="0.8"/>
    <text x="-50" y="90" text-anchor="middle" font-family="Arial Black, Arial" font-size="46" font-weight="900" fill="${c}" opacity="0.95">?</text>
  </g>
  <text x="220" y="268" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#eef1ff" letter-spacing="2">${escapeXml(name)}</text>
  <rect x="0" y="292" width="440" height="8" fill="${c}"/>
</svg>`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

(async () => {
  require('dotenv').config();
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

  fs.mkdirSync(SKIN_DIR, { recursive: true });
  fs.mkdirSync(CASE_DIR, { recursive: true });

  // 1) Skins + SVG art
  const ids = {};
  for (const [weapon, skinName, rarity, price, condition, floatValue] of SKINS) {
    const img = `/img/skins/${slug(weapon)}-${slug(skinName)}.svg`;
    fs.writeFileSync(
      path.join(SKIN_DIR, path.basename(img)),
      skinSVG(weapon, skinName, rarity, condition)
    );
    const doc = await Skin.findOneAndUpdate(
      { weapon, skinName },
      {
        $set: {
          skinRarity: rarity,
          skinPrice: price,
          condition,
          floatValue,
          image: img,
          description: `CS2 ${weapon} | ${skinName} — ${rarity} darajasidagi skin.`,
        },
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );
    ids[key(weapon, skinName)] = doc._id;
  }

  // 2) Cases + SVG art
  let casesCreated = 0;
  for (const [name, price, rarity, description, items] of CASES) {
    const img = `/img/cases/${slug(name)}.svg`;
    fs.writeFileSync(path.join(CASE_DIR, path.basename(img)), caseSVG(name, rarity));
    const before = await Case.findOne({ name });
    if (!before) casesCreated++;
    await Case.findOneAndUpdate(
      { name },
      {
        $set: {
          price,
          rarity,
          description,
          image: img,
          isActive: true,
          items: items.map(([k, probability]) => ({ skin: ids[k], probability })),
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  const skinCount = await Skin.countDocuments();
  const caseCount = await Case.countDocuments();
  console.log(`Seed done: skins=${skinCount}, cases=${caseCount} (yangi kase'lar: ${casesCreated})`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
