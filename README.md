# Aves — a quiet field guide

A small, static field guide to the birds of the world: name, portrait, and voice for 51 curated species — paced like a field guide left open on a windowsill, not a feed.

**Live:** https://birdssong.vercel.app

## What it does

- Browse a grid of birds by name, with a live search across name / family / region
- Every bird has its own permalink page (`/bird/<slug>/`) with a larger portrait, description, and audio player — built for sharing
- Click play to hear the bird's actual voice

## How it's built

Static HTML/CSS/vanilla JS, no framework, no backend, deployed on Vercel.

The interesting part is what happens *before* deploy, in `scripts/`:

- **`fetch-sounds.mjs`** — queries the [Xeno-canto](https://xeno-canto.org) API for a clean `song`-type recording per species (falling back gracefully to lower-quality or `call`-type recordings when no song exists), then uses `ffmpeg` to trim leading silence, cap each clip at 30s, and compress it to a small mono mp3 — down from ~20MB raw WAV files to a few hundred KB each. Recordist and license are baked in for attribution.
- **`build-pages.mjs`** — resolves a portrait per species from Wikimedia Commons and statically generates every `/bird/<slug>/` page at build time, including Open Graph tags for link previews.

Both scripts write their results into `birds.json`, so the live site never calls any external API at runtime — it just serves pre-resolved, pre-optimized static files.

## Credits

Portraits from Wikimedia Commons. Recordings from Xeno-canto, credited by recordist on each species page. Taxonomy and species selection are illustrative, not exhaustive.
