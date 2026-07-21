#!/usr/bin/env node
// Build-time resolver: for each bird in birds.json, find a clean Xeno-canto
// song recording, trim/compress it with ffmpeg into a small local mp3, and
// bake the local path + credit into a `sound` field. The site then never
// calls any API or hotlinks a multi-megabyte remote file at runtime.
//
// Requires ffmpeg on PATH (`brew install ffmpeg`).
//
// Usage:
//   XC_API_KEY=xxxx node scripts/fetch-sounds.mjs            # full run
//   XC_API_KEY=xxxx node scripts/fetch-sounds.mjs --test "Common Blackbird"

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BIRDS_PATH = path.join(ROOT, 'birds.json');
const SOUNDS_DIR = path.join(ROOT, 'sounds');
const API_KEY = process.env.XC_API_KEY;

const CLIP_SECONDS = 30;

if (!API_KEY) {
  console.error('Set XC_API_KEY in the environment (your Xeno-canto API key).');
  process.exit(1);
}

function speciesTag(sciName) {
  const [gen, ...rest] = sciName.trim().split(/\s+/);
  const sp = rest.join(' ');
  return sp ? `gen:${gen} sp:${sp}` : `gen:${gen}`;
}

// Ordered from cleanest to most permissive.
const QUERY_TIERS = (sciName) => {
  const tag = speciesTag(sciName);
  return [
    `${tag} type:song q:A`,
    `${tag} type:song q:B`,
    `${tag} type:song`,
    `${tag} q:A`,
    `${tag}`,
  ];
};

async function searchXC(query) {
  const url = `https://xeno-canto.org/api/3/recordings?query=${encodeURIComponent(query)}&key=${API_KEY}&per_page=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`XC ${res.status} for query "${query}"`);
  return res.json();
}

function licenseLabel(lic) {
  const m = /licenses\/([a-z-]+)\/([\d.]+)/i.exec(lic || '');
  return m ? `CC ${m[1].toUpperCase()} ${m[2]}` : 'CC (see recording page)';
}

function slugify(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Read straight from the remote URL and stop once CLIP_SECONDS of trimmed
// output exist — avoids downloading a full multi-minute / multi-megabyte
// original just to use the first 30 seconds of it.
async function transcode(sourceUrl, destPath) {
  const filters = [
    'silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.1',
    `afade=t=out:st=${CLIP_SECONDS - 2}:d=2`,
  ].join(',');
  await execFileP('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-i', sourceUrl,
    '-af', filters,
    '-t', String(CLIP_SECONDS),
    '-ac', '1', '-ar', '44100', '-b:a', '96k',
    destPath,
  ], { timeout: 45_000 });
  const s = await stat(destPath);
  if (s.size < 5_000) throw new Error('output suspiciously small, likely silent/empty');
}

async function findAndTranscode(bird, slug) {
  for (const query of QUERY_TIERS(bird.sciName)) {
    let data;
    try {
      data = await searchXC(query);
    } catch (e) {
      console.warn(`  query failed (${query}): ${e.message}`);
      continue;
    }
    const candidates = (data.recordings || []).slice(0, 3);
    for (const rec of candidates) {
      const dest = path.join(SOUNDS_DIR, `${slug}.mp3`);
      try {
        await transcode(rec.file, dest);
        return {
          url: `/sounds/${slug}.mp3`,
          type: rec.type || null,
          quality: rec.q || null,
          recordist: rec.rec || null,
          license: licenseLabel(rec.lic),
          sourcePage: `https://xeno-canto.org/${rec.id}`,
        };
      } catch (e) {
        console.warn(`  candidate XC${rec.id} failed: ${e.message}`);
      }
    }
    // gentle pacing between XC metadata queries
    await new Promise(r => setTimeout(r, 300));
  }
  return null;
}

async function main() {
  await mkdir(SOUNDS_DIR, { recursive: true });
  const birds = JSON.parse(await readFile(BIRDS_PATH, 'utf8'));
  const testName = process.argv.includes('--test')
    ? process.argv[process.argv.indexOf('--test') + 1]
    : null;

  const targets = testName ? birds.filter(b => b.name === testName) : birds;
  if (testName && !targets.length) {
    console.error(`No bird named "${testName}" in birds.json`);
    process.exit(1);
  }

  let found = 0, missing = 0;
  for (const bird of targets) {
    const slug = slugify(bird.name);
    const sound = await findAndTranscode(bird, slug);
    if (sound) {
      bird.sound = sound;
      found++;
      const size = (await stat(path.join(ROOT, sound.url))).size;
      console.log(`✓ ${bird.name} — ${sound.quality || '?'} ${sound.type || ''} by ${sound.recordist} (${(size / 1024).toFixed(0)} KB)`);
    } else {
      missing++;
      console.warn(`✗ ${bird.name} — no usable recording found`);
    }
  }

  console.log(`\n${found} found, ${missing} missing (of ${targets.length})`);

  if (testName) {
    console.log(JSON.stringify(targets[0].sound, null, 2));
    return;
  }

  await writeFile(BIRDS_PATH, JSON.stringify(birds, null, 2) + '\n');
  console.log(`Wrote ${BIRDS_PATH}`);
}

main();
