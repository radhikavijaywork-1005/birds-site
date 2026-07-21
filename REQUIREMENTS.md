# Birds of the World — Requirements

A north-star specification for a quiet, beautiful, free catalog of every bird species on Earth.

---

## 1. Vision & Non-Goals

A free, open, reverent catalog of every bird in the world — each with its name, a single restrained portrait, and the sound it makes — built so that a person who has never thought about birds and a person who has thought of little else can both linger here without friction. It is a reading-and-listening site, paced like a field guide left open on a windowsill.

**It is not:** eBird (no checklists, no sightings), Merlin (no ID-by-photo or ID-by-sound), iNaturalist (no community uploads), a social platform (no accounts, profiles, comments), a range-map tool (no interactive maps), or a marketplace. It does not chase engagement. It has no feed.

---

## 2. Target Users & Jobs-to-be-Done

| User | What they come for |
|---|---|
| **Casual visitor** | Two minutes of beauty. Hear a bird they've never heard. Send a friend a link. |
| **Curious learner** | "What does a hoopoe actually sound like?" Look up a name they saw in a poem or a film. |
| **Birder (intermediate)** | Reference a family or genus. Compare calls. Confirm a scientific name. |
| **Student / teacher** | Cite a species page in a project. Use the taxonomy as a learning scaffold. |
| **Designer / writer** | Mood-board source. Inspiration for naturalist illustration, editorial layouts, naming. |

Primary JTBD: **"Show me this bird the way a thoughtful person would show me this bird."**

---

## 3. Content Requirements per Species

The data model. Required fields are marked **(R)**; the rest are nice-to-have.

- **commonName (R)** — English vernacular, IOC-preferred.
- **sciName (R)** — Binomial, italicised in rendering (e.g., *Upupa epops*).
- **family (R)** — Latin family name (Upupidae) + English (Hoopoes).
- **order (R)** — e.g., Bucerotiformes.
- **iucnStatus (R)** — LC / NT / VU / EN / CR / EW / EX / DD. Surface prominently for NT and above.
- **image (R)** — One portrait. Single URL + credit + license.
- **audio (R)** — At least one recording. URL + recordist + license + type (song/call).
- **region (R)** — High-level: Palearctic, Nearctic, Neotropical, Afrotropical, Indomalayan, Australasian, Oceanian, Antarctic.
- **habitat** — 2–4 keywords (e.g., "open woodland, orchards, semi-arid plains").
- **sizeCm** — Length range as a single string ("25–29 cm").
- **distinctiveFeatures** — One sentence on what makes it visually unmistakable.
- **soundDescription** — One sentence describing the call ("a soft, hollow *hoop-hoop-hoop*").
- **blurb** — 2–3 sentences. Editorial, not encyclopaedic.
- **conservationNote** — Only if status is NT or worse, or if trend is notable.
- **citations (R)** — IOC version, image source, audio source, IUCN assessment year.
- **alsoKnownAs** — Common alternate names, including non-English where culturally important.

Rendering rule: if a nice-to-have field is missing, the section is omitted silently — never "N/A".

---

## 4. Data Sources & Attribution

Concrete recommendations, with licensing realities named honestly.

- **Taxonomy: IOC World Bird List** (https://www.worldbirdnames.org) — the spine of the site. Released as XLSX/CSV under CC-BY. Pin a version (e.g., IOC 14.2) and display it in the footer. Re-import on a 6-month cadence.
- **Images: Wikimedia Commons** (https://commons.wikimedia.org) — best free corpus. Licenses vary (CC0, CC-BY, CC-BY-SA). Store the licence string per image and render attribution inline. Use the MediaWiki API; cache aggressively. **Fallback:** Macaulay Library (https://www.macaulaylibrary.org) — beautiful, but largely all-rights-reserved; embed only, don't redistribute.
- **Sounds: Xeno-canto** (https://xeno-canto.org) — the standard. Public API, mostly CC-BY-NC-SA / CC-BY-SA. Honour the NC clause: no ads, no paid tier. Credit the recordist by full name on the page, not in a tooltip.
- **Conservation status: IUCN Red List** (https://www.iucnredlist.org) — API requires a free key and forbids bulk redistribution. **Trade-off:** scrape vs. license. **Recommendation:** request API access, cache results, refresh annually, attribute as required.
- **Range (later): eBird Status & Trends / GBIF** (https://ebird.org, https://www.gbif.org) — for v3 only; out of scope for v1.

**CORS reality:** Xeno-canto and Wikimedia serve permissive CORS; IUCN does not reliably. Plan a tiny build-time script (Node, run locally or in a GitHub Action) that fetches and writes static JSON — this side-steps both CORS and rate limits at runtime.

**Attribution UX:** every image and audio file shows credit + licence in the species page footer, in small caps, never as a tooltip. A site-wide /credits page lists every photographer and recordist alphabetically.

---

## 5. Core Features for v1

Day-one, non-negotiable:

1. **Grid of species cards** — image, common name, scientific name in italics. Hover reveals nothing; this is not a hover site.
2. **Species page** — single column, generous margins, one image, one audio player, the blurb, the facts, the citations.
3. **Search** — name (common + scientific + family). Client-side, instant.
4. **Audio playback** — one play button, one track at a time globally.
5. **Lazy image loading** — `loading="lazy"`, `decoding="async"`, intrinsic `width`/`height` to prevent CLS.
6. **Mobile-responsive** — single-column on phones, 2–3 on tablets, 4 on desktop. Max width ~1100px on the largest screens.
7. **Attribution rendered** — non-negotiable, on every page.
8. **No tracking by default** — see §16.

---

## 6. Browse & Discovery

Beyond the flat grid, ranked by what's worth building:

- **Filter by family** *(build)* — clean, taxonomic, low effort, high value.
- **Filter by region** *(build)* — the eight zoogeographic realms above.
- **Bird of the day** *(build)* — deterministic from date, so the URL is shareable.
- **Taxonomic tree view** *(build in v2)* — Order → Family → Species. A quiet sidebar, not a flashy visualisation.
- **Filter by habitat** *(later)* — only useful once habitat data is consistent.
- **Colour-based browsing** *(skip)* — beautiful in theory, miserable in execution at 11k birds without ML tagging.
- **Sound-similarity browsing** *(skip)* — that's Merlin's job.

Recommendation: ship grid + search + family filter + bird-of-the-day in v1. Resist everything else.

---

## 7. Audio UX

- **Never autoplay.** Ever. Including on the species page.
- **One track globally.** Starting a new one stops the previous. Implement with a single shared `<audio>` element.
- **Minimal control:** a hairline circular play/pause button. No waveform in v1 — waveforms are visual noise and expensive to generate. Revisit in v2 if it earns its place.
- **Duration shown** in small monospaced numerals to the right of the button.
- **Multiple recordings per bird** when available: song, call, juvenile, flight-call — listed as a vertical stack, labelled in small caps, with recordist credit beneath each.
- **Mobile data:** show file size on the button label if the user is on a metered connection (`navigator.connection.saveData`). Don't preload audio; `preload="none"`.
- **Loop:** never. A single play, then silence.

---

## 8. Search

- Match across `commonName`, `sciName`, `family`, `alsoKnownAs`.
- Fuzzy match (recommend **Fuse.js**, ~6kb gzipped) with a low threshold (0.3).
- Handle common misspellings via fuzziness, not a custom dictionary.
- Strip diacritics on both sides of the comparison.
- Show results as you type; max 20; "see all" link if more.
- **Out of scope, acknowledged:** "what was that bird that sounded like X" (audio-similarity ID) and "what bird is this photo" (visual ID). Merlin does both well; we will not.

---

## 9. Accessibility

- **Alt text at 11k scale:** generating bespoke alt text for every species is infeasible. **Recommendation:** a templated pattern — `"{commonName}, a {sizeCm} {family-english} from {region}."` — generated at build time, overridable per species when the curator has something better to say. Honest, structured, screen-reader-friendly.
- **Keyboard navigation:** every card focusable; visible focus ring (1px solid ink, 2px offset); search reachable via `/` shortcut.
- **Audio:** native `<audio controls>` available as a progressive enhancement; custom button must expose `aria-label`, `aria-pressed`, and announce state changes via a polite live region.
- **Reduced motion:** respect `prefers-reduced-motion`; disable the only animation (a 200ms fade on image load).
- **Contrast:** soft palette must still meet WCAG AA — body text against parchment background needs at least 4.5:1. Test the off-white palette; darken ink colour if needed.
- **Language:** `lang="en"` on root; `lang="la"` on the binomial wrapper so screen readers don't mangle it.

---

## 10. Performance

The 11k problem.

- **Taxonomy bundle:** ship a single `birds.json` of ~11k entries with only the fields needed for the grid and search (id, commonName, sciName, family, order, region, iucnStatus, thumb URL). Estimated ~1.5–2MB gzipped. Acceptable.
- **Full species data:** one JSON file per species, fetched on navigation (`/species/upupa-epops.json`). Small (~2–5kb), cacheable forever.
- **Images:** Wikimedia thumbnails at 480px for cards, 1200px for species pages. Serve via Wikimedia's thumb URLs — they handle resizing. `loading="lazy"`, `decoding="async"`.
- **Virtualised grid:** for >500 visible cards, virtualise (recommend a hand-rolled IntersectionObserver-based windowing — no framework needed). Below that, don't bother.
- **Service worker:** cache the taxonomy bundle, the CSS, the fonts, and visited species pages. Stale-while-revalidate. The site should work offline for anything previously visited.
- **Fonts:** self-host subsetted WOFF2; `font-display: swap`; preload the body face only.

---

## 11. Design System Primitives

Honouring the brief: rustic, natural, alive, modern fonts, minimal, thin-line.

### Type
- **Display / headings:** **Fraunces** (Google Fonts) — variable, warm, has the rustic-modern duality. Use at 300–400 weight, optical size large.
- **Body:** **Inter** at 400, 1.05rem, line-height 1.65.
- **Latin / scientific names:** Fraunces italic, the binomial set slightly smaller than body, letter-spacing 0.01em.
- **Type scale (rem):** 0.75 / 0.875 / 1 / 1.125 / 1.5 / 2.25 / 3.5.

### Palette
- `--parchment: #F4EFE6;` (background)
- `--ink: #1F1B16;` (body text)
- `--ink-soft: #5B5349;` (secondary text, captions)
- `--moss: #5C6A4E;` (accent — used sparingly, for status pills)
- `--rust: #A65A3A;` (accent — only for threatened-status indicators)
- `--hairline: #1F1B161A;` (10% ink — for all strokes and rules)

No pure black, no pure white, no saturated red. The "red CTA" of the STAGE design system does **not** apply here.

### Stroke & space
- All borders, dividers, and icons: **1px**, `--hairline`. Never thicker.
- Icons: outline only, 1.5px stroke, rounded joins. Use a tiny custom set; do not import Material or Feather wholesale.
- Spacing scale (px): 4 / 8 / 12 / 16 / 24 / 40 / 64 / 96. Generous; the site should breathe.

### Motion
- One easing: `cubic-bezier(0.2, 0.6, 0.2, 1)`.
- One duration: 200ms.
- Only two motions exist: image fade-in on load, audio button state change.
- Nothing parallaxes. Nothing slides in on scroll.

---

## 12. Voice & Copy

Naturalist, quiet, factual-with-poetry. Like Peterson's field guides, not BuzzFeed.

**Do:** "The hoopoe walks more than it flies, probing soft ground for grubs. Its crest opens and shuts like a fan."
**Don't:** "Meet the hoopoe — nature's most stylish bird! 🦅"

**Do:** "Critically endangered. Fewer than 400 mature individuals remain in the wild."
**Don't:** "Sadly, this beautiful bird is in trouble."

**Do (audio caption):** "Song recorded in Białowieża Forest, Poland, May 2019. Stanisław Kuźniak."
**Don't:** "Listen to this amazing call!"

No exclamation marks. No emojis. No second person except in the navigation and the about page.

---

## 13. Ethical & Conservation Considerations

- **Endangered locations:** never display precise GPS or specific reserve names for CR/EN species. Region-level only.
- **Status surfacing:** species at NT or worse show their status badge prominently on the card *and* the page. Use `--rust` for VU/EN/CR; never green for endangered.
- **Audio and breeding:** add a soft note on species pages during breeding season — "Recordings can disturb territorial birds. Please don't play these aloud in the field." A static line, not a popup.
- **Recordist credit:** full name, location, date — never just a handle.
- **Indigenous names:** where authoritative sources exist (e.g., Aboriginal language names for Australian birds), surface them in `alsoKnownAs`. Do not invent or crowd-source these.

---

## 14. Phased Roadmap

| Phase | Scope | Effort |
|---|---|---|
| **v1 — Curated 50** | 50 hand-picked species. Full design system live. Search, audio, attribution, family filter, bird of the day. Static JSON. | 2–3 weeks |
| **v1.5 — Search across the world** | Import IOC taxonomy (~11k names, no images/audio yet). Search returns "stub" pages for un-curated species, with a polite "no media yet" state and a link to Wikipedia. | 1 week |
| **v2 — Full catalog** | Build script pulls images (Wikimedia) + sounds (Xeno-canto) + IUCN status for all species. ~70% will have at least one image and one recording; the rest gracefully degrade. Taxonomic tree view. | 4–6 weeks (mostly data wrangling) |
| **v3 — Living catalogue** | Regional pages ("Birds of the Western Ghats"), "today in your sky" (uses geolocation + eBird occurrence data), accessibility audit, i18n scaffolding. | 4–6 weeks |

Resist scope creep between phases. v2 is the only one with real data risk.

---

## 15. Success Signals

Five honest signals for a no-account static site:

1. **Median time on species page** — target >40s. Below that, the audio isn't being played or the blurb isn't earning its place.
2. **Audio play rate per species view** — target >35%. The sound is half the point.
3. **Taxonomic coverage with media** — % of the 11k that have at least one image and one recording. Target 70% by end of v2.
4. **Share rate** — outbound links / unique visitors. A proxy for "this was worth showing someone."
5. **Return rate (7-day)** — for a content site without accounts, ~15% would be good.

Explicitly **not** tracked: scroll depth, click heatmaps, anything that needs a cookie banner.

---

## 16. Open Questions / Decisions Needed

1. **Domain name** — `.org` is recommended (this is a public-good catalogue, not a brand). Owner needs to pick and register.
2. **Hosting** — Cloudflare Pages or Netlify (both free for this scale). Recommend Cloudflare Pages for asset caching and image transforms.
3. **Analytics** — Plausible (privacy-first, ~€9/mo) vs. nothing. Recommend Plausible; it avoids cookie banners and respects the tone.
4. **Contact / contributions** — a single email address or a typeform? Will outside contributors be accepted (corrections, missing recordings)? If yes, what's the workflow?
5. **Language support** — English-only at launch is the right call. But decide now whether the data model leaves room for `commonNames: { en, es, hi, ... }` — retrofitting later is painful.
6. **IUCN license** — request API access this week; the assessment takes a few days. Without it, conservation status is stuck on a manual annual import.
7. **Editorial owner** — who writes the blurbs at scale? At 11k species, the curated blurb is the single largest content cost. Decide: stay curated for the iconic ~500 and template the rest, or accept Wikipedia-sourced summaries for the long tail.

---
