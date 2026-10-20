require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Skin = require('../src/models/skins.model');
const Case = require('../src/models/cases.model');

const SKIN_DIR = path.join(__dirname, '..', 'public', 'img', 'skins');
const CASE_DIR = path.join(__dirname, '..', 'public', 'img', 'cases');

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const SKINS = [
  ['AK-47', 'Asiimov'],
  ['AK-47', 'Redline'],
  ['AK-47', 'Slate'],
  ['AK-47', 'Phantom Disruptor'],
  ['AK-47', 'Elite Build'],
  ['AK-47', 'Fire Serpent'],
  ['M4A4', 'Howl'],
  ['M4A4', 'Neo-Noir'],
  ['M4A4', 'Desolate Space'],
  ['M4A4', 'In Living Color'],
  ['M4A1-S', 'Printstream'],
  ['M4A1-S', 'Cyrex'],
  ['M4A1-S', 'Guardian'],
  ['AWP', 'Dragon Lore'],
  ['AWP', 'Asiimov'],
  ['AWP', 'Neo-Noir'],
  ['AWP', 'Wildfire'],
  ['SSG 08', 'Blood in the Water'],
  ['Desert Eagle', 'Blaze'],
  ['Desert Eagle', 'Printstream'],
  ['Desert Eagle', 'Code Red'],
  ['USP-S', 'Kill Confirmed'],
  ['USP-S', 'Neo-Noir'],
  ['USP-S', 'Cortex'],
  ['Glock-18', 'Fade'],
  ['Glock-18', 'Water Elemental'],
  ['Glock-18', 'Vogue'],
  ['Five-SeveN', 'Case Hardened'],
  ['Karambit', 'Fade'],
  ['Karambit', 'Doppler'],
  ['Butterfly Knife', 'Marble Fade'],
];

const CASE_MAPPING = {
  'Arzon kase': 'Clutch Case',
  "Boshlang'ich kase": 'Prisma Case',
  'Pistolet kase': 'CS:GO Weapon Case 3',
  'Rifle kase': 'Chroma 2 Case',
  'Sniper kase': 'Kilowatt Case',
  'Covert kase': 'Dreams & Nightmares Case',
  'Pichoq kase': 'CS:GO Weapon Case',
  'Kontraband kase': 'Huntsman Weapon Case',
};

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

async function run() {
  fs.mkdirSync(SKIN_DIR, { recursive: true });
  fs.mkdirSync(CASE_DIR, { recursive: true });

  console.log('Fetching skins and crates metadata from CSGO-API...');
  const [skinsRes, cratesRes] = await Promise.all([
    fetch('https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json'),
    fetch('https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json'),
  ]);

  const allSkins = await skinsRes.json();
  const allCrates = await cratesRes.json();

  console.log(`Loaded ${allSkins.length} skins and ${allCrates.length} crates from API.`);

  // Connect to DB if available
  let dbConnected = false;
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      dbConnected = true;
      console.log('Connected to MongoDB database.');
    } catch (e) {
      console.warn('MongoDB connection failed, continuing with file download only:', e.message);
    }
  }

  // 1. Download skins images
  console.log('\n--- Downloading Skin Images ---');
  let downloadedSkins = 0;
  for (const [weapon, skinName] of SKINS) {
    const match = allSkins.find((s) => {
      const weaponMatches =
        s.weapon?.name?.toLowerCase() === weapon.toLowerCase() ||
        (weapon.includes('Karambit') && s.name.toLowerCase().includes('karambit')) ||
        (weapon.includes('Butterfly') && s.name.toLowerCase().includes('butterfly'));
      const nameMatches =
        s.pattern?.name?.toLowerCase() === skinName.toLowerCase() ||
        s.name.toLowerCase().includes(skinName.toLowerCase());
      return weaponMatches && nameMatches;
    });

    if (!match || !match.image) {
      console.warn(`[WARNING] No image found for skin: ${weapon} | ${skinName}`);
      continue;
    }

    const fileName = `${slug(weapon)}-${slug(skinName)}.png`;
    const localFilePath = path.join(SKIN_DIR, fileName);
    const publicUrl = `/img/skins/${fileName}`;

    try {
      await downloadFile(match.image, localFilePath);
      downloadedSkins++;
      console.log(`[OK] Saved skin: ${weapon} | ${skinName} -> ${publicUrl}`);

      if (dbConnected) {
        await Skin.updateOne(
          { weapon, skinName },
          { $set: { image: publicUrl } }
        );
      }
    } catch (err) {
      console.error(`[ERROR] Failed to download ${weapon} | ${skinName}:`, err.message);
    }
  }

  // 2. Download case images
  console.log('\n--- Downloading Case Images ---');
  let downloadedCases = 0;
  for (const [ourCaseName, officialCaseName] of Object.entries(CASE_MAPPING)) {
    const match = allCrates.find(
      (c) => c.name.toLowerCase() === officialCaseName.toLowerCase()
    );

    if (!match || !match.image) {
      console.warn(`[WARNING] No image found for case: ${ourCaseName} (${officialCaseName})`);
      continue;
    }

    const fileName = `${slug(ourCaseName)}.png`;
    const localFilePath = path.join(CASE_DIR, fileName);
    const publicUrl = `/img/cases/${fileName}`;

    try {
      await downloadFile(match.image, localFilePath);
      downloadedCases++;
      console.log(`[OK] Saved case: ${ourCaseName} (${officialCaseName}) -> ${publicUrl}`);

      if (dbConnected) {
        await Case.updateOne(
          { name: ourCaseName },
          { $set: { image: publicUrl } }
        );
      }
    } catch (err) {
      console.error(`[ERROR] Failed to download case ${ourCaseName}:`, err.message);
    }
  }

  console.log(`\nFinished: downloaded ${downloadedSkins}/${SKINS.length} skins, ${downloadedCases}/${Object.keys(CASE_MAPPING).length} cases.`);

  if (dbConnected) {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
