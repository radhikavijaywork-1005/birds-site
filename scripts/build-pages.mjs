#!/usr/bin/env node
// Build-time: resolve a portrait image per bird (cached into birds.json,
// same pattern as scripts/fetch-sounds.mjs) and generate one static,
// shareable, no-JS-required page per species at bird/<slug>/index.html.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BIRDS_PATH = path.join(ROOT, 'birds.json');
const SITE_URL = 'https://birds-site-xi.vercel.app';

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function fetchWikiImage(title) {
  try {
    const u = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|info&inprop=url&titles=${encodeURIComponent(title)}&pithumbsize=800&redirects=1&origin=*`;
    const r = await fetch(u, {
      headers: { 'User-Agent': 'AvesFieldGuide/1.0 (static site build script; contact: radhikavijaywork@gmail.com)' },
    });
    const j = await r.json();
    const pages = j.query && j.query.pages;
    if (!pages) return null;
    const page = pages[Object.keys(pages)[0]];
    const url = page && page.thumbnail && page.thumbnail.source;
    if (!url) return null;
    return { url, sourcePage: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}` };
  } catch {
    return null;
  }
}

async function resolveImages(birds) {
  let resolved = 0;
  for (const bird of birds) {
    if (bird.image) continue;
    const img = await fetchWikiImage(bird.name) || await fetchWikiImage(bird.sciName);
    if (img) {
      bird.image = img;
      resolved++;
      console.log(`✓ image: ${bird.name}`);
    } else {
      console.warn(`✗ image: ${bird.name} — none found`);
    }
    await new Promise(r => setTimeout(r, 400));
  }
  return resolved;
}

function page(bird, slug) {
  const { name, sciName, family, region, blurb, image, sound } = bird;
  const title = `${escapeHtml(name)} — Aves`;
  const desc = escapeHtml(blurb || `${name} (${sciName})`);
  const canonical = `${SITE_URL}/bird/${slug}/`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${canonical}" />
  ${image ? `<meta property="og:image" content="${escapeHtml(image.url)}" />` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <nav class="species-nav"><a href="/" class="back-link">← Aves</a></nav>

  <main class="species">
    <div class="species-body">
      <figure class="species-plate">
        ${image
          ? `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(name)} (${escapeHtml(sciName)})" loading="eager" width="480"${image.position ? ` style="object-position: ${escapeHtml(image.position)}"` : ''} />`
          : `<div class="species-plate-empty"></div>`}
      </figure>

      <div class="species-panel">
        <h1 class="species-name">${escapeHtml(name)}</h1>
        <p class="species-sci">${escapeHtml(sciName)}</p>
        <p class="species-tags">
          <span>${escapeHtml(region || '')}</span>${region && family ? '<span class="dot">·</span>' : ''}<span>${escapeHtml(family || '')}</span>
        </p>

        <p class="species-blurb">${escapeHtml(blurb || '')}</p>

        ${sound ? `<div class="species-audio">
          <p class="species-label">Listen</p>
          <audio controls preload="none" src="${escapeHtml(sound.url)}"></audio>
          <p class="credit">♪ ${escapeHtml(sound.recordist)} · ${escapeHtml(sound.license)}</p>
        </div>` : ''}

        <dl class="species-citations">
          ${image ? `<div><dt>Image</dt><dd><a href="${escapeHtml(image.sourcePage)}">Wikimedia Commons</a></dd></div>` : ''}
          ${sound ? `<div><dt>Song</dt><dd><a href="${escapeHtml(sound.sourcePage)}">Xeno-canto — ${escapeHtml(sound.recordist)}, ${escapeHtml(sound.license)}</a></dd></div>` : ''}
        </dl>
      </div>
    </div>
  </main>

  <footer class="colophon">
    <p><a href="/" class="back-link">← Back to the field guide</a></p>
  </footer>
</body>
</html>
`;
}

async function main() {
  const birds = JSON.parse(await readFile(BIRDS_PATH, 'utf8'));

  const resolved = await resolveImages(birds);
  if (resolved > 0) {
    await writeFile(BIRDS_PATH, JSON.stringify(birds, null, 2) + '\n');
    console.log(`Wrote ${resolved} new image(s) to birds.json`);
  }

  const birdDir = path.join(ROOT, 'bird');
  await mkdir(birdDir, { recursive: true });

  for (const bird of birds) {
    const slug = slugify(bird.name);
    const dir = path.join(birdDir, slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), page(bird, slug));
  }
  console.log(`Generated ${birds.length} species pages in bird/`);
}

main();
