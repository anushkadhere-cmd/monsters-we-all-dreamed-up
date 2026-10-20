# The Monsters We All Dreamed Up

A scrollytelling data-visualisation article by Anushka Dhere (NID). Anushka is a designer, not a developer: explain changes in plain words, run commands yourself, and ask before installing anything. It compares 96 monsters from four mythologies (Greek, Hindu, Japanese, Norse) and asks whether shared monsters travelled between cultures or were imagined independently. It's a data-vis assignment: **the charts keep their data, chart types and interactions exactly as they are; their visual style matches the rest of the article.** Never change what data a chart shows, what kind of chart it is, or how it responds to hover, drag and zoom. Restyling is allowed and expected: paper background, the article's fonts, the shared culture colours, ink linework, the article's grid. The only other changes inside a chart are the visual states the script asks for at each scroll step (highlight, zoom, glow, a halo, a dotted edge, an inset); other new interactions sit before, beside or on top of the charts.

**The three charts are non-negotiable:** the quadrant plot (`charts/index.html`), the network (`charts/graph2_network.html`) and the chord diagram (`charts/chord.html`) all stay in the piece, with their titles, legends and built-in interactions, restyled to match the article. Script cards must never cover a chart's title, legend or key labels: on desktop the cards run in a column to the left of the pinned chart; on phones the chart pins to the top and the cards pass underneath. Chart 1 has no cards and scrolls past like the rest of the page (no internal scroll).

**The article script is final: `docs/script.md`.** Use it word for word and in the same order. Lines in [brackets] are placement notes (what appears on screen), not reader text. Don't reword, shorten, move or remove anything, and don't drop any step the notes describe. New interactions are only *added* between paragraphs. If something seems to need a wording change, ask Anushka first.

Previous version: https://anushkadhere-cmd.github.io/Submission/story.html (repo `anushkadhere-cmd/Submission`, which has the original chart code: `index.html`, `graph2_network.html`, `chord.html`, `cards.html`).

## Where things are

| Path | What |
| --- | --- |
| `index.html`, `css/cover.css`, `js/cover.js` | The page and the cover (built) |
| `js/bestiary.js` | "Which bestiary did you grow up with?" (built). The reader's tradition lives in one shared variable for the later interactions: `MonsterBestiary.culture` ("Greek", "Hindu", "Japanese", "Norse" or null), `MonsterBestiary.onChange(fn)`, and a `bestiarychange` event on `document`. Remembered in localStorage (`monsters-bestiary`). The five choices are cream paper cards with an icon (`assets/bestiary/greek.png` etc., cut from Anushka's card design; swap in full-resolution exports with the same names) and a Disney Heroic label. Shows a fixed "Your bestiary: … · change" tag; never changes the script or the charts |
| `charts/` | The three charts: `index.html` (quadrant), `graph2_network.html` (network), `chord.html` (chord), plus `creatures_data.js`. Data, chart types and interactions as in the old repo; restyled to the article (paper, ink, Hubballi titles and labels, shared culture colours from `css/tokens.css`). The quadrant has no internal scroll steps (its three story-text images are gone); the network fills its area at real size (no inner box); on desktop it lies under the whole screen below its pinned title, with its note, legend and starting view kept right of the card column (`--inset-left`, set by `js/article.js`), so zoomed or dragged dots are never cut off; the chord keeps its arc labels plus a small colour key and the script's note (side-panel image, stats and ranking rows and "Reading the chart" box removed). Chart titles are ordinary article headings (`h2.chart-title`, same size and alignment as every other heading), with the chart's note under them as body text (`.chart-head`); they scroll away, then the chart pins full-screen and the cards scroll fully off the top. Each chart hides its own title and note when loaded with `?embed`. Each is shown in its own frame at a fixed design size (`data-design-w/h`) and scaled down to fit (`js/article.js`); a frame that's off screen is hidden, so only one chart is ever visible |
| `css/article.css`, `js/article.js` | The article under the cover: the whole script verbatim, with a grey placeholder box (labelled with its bracketed name) for every interaction and chart. Pinned boxes keep their paragraphs as scroll cards and show the current [… STEP] name. Replace each box with the real thing |
| `assets/cover/full/` | Cover art: one full-artboard PNG per layer (the real art) |
| `tools/trim_cover.py` | Publishing step: trims the cover PNGs and writes `assets/cover/layout.json`. Needs Python + Pillow (both installed) |
| `data/mythology_creatures_dataset.csv` | 96 creatures, one row each. New columns at the end: `family_primary`, `families`, `unique_to_tradition`, `cross_culture_matches` |
| `data/creature_links.csv` | 109 matches between creatures (`strength` = near-identical or loose; `cross_culture` TRUE/FALSE). Feeds the network lines and chord ribbons |
| `docs/script.md` | **The final text.** Anushka's script, word for word |
| `docs/scrollytelling-format.html` | **The layout spec.** The whole article in order, with the script verbatim and the three charts pinned as they are. Follow this structure |
| `assets/cover/edge.svg` | The torn-paper bottom edge of the cover |
| `docs/wireframe.html` | Older layout reference. Where it differs from `docs/script.md` or the scrollytelling format, those win |
| `docs/interactions-demo.html` | **The new-interaction spec.** Working versions of the interactions added to the script, on the real data. Copy their behaviour and logic; restyle them to match the cover |

## Tech choices

- Plain HTML, CSS and JavaScript. No build step, no framework. Deployed on GitHub Pages.
- Charts: the three charts from the old repo, each in its own iframe, restyled to the article. Their own hover, drag and zoom must keep working.
- Scroll steps: IntersectionObserver, as in `docs/wireframe.html` (Scrollama is fine too).
- Article text system (after The Pudding's "Pockets"; set at the top of `css/article.css`): one 40rem reading column with 16px side padding, script paragraphs left-aligned; body Hubballi 17px on phones / 18px wider, line height 1.7, 1.5rem between paragraphs; headings Hubballi (Anushka's choice over Disney Heroic) with 4rem above and 1rem below; charts and pinned illustrations up to 64rem; scroll cards up to 30rem with a thin ink border (22rem beside the charts); chart notes 14px; chart legends and labels in small spaced capitals.
- Colours and fonts live as CSS variables in `css/tokens.css` (paper, ink, fonts, and the four culture colours shared by the cover tags and all three charts). The page and every chart load it; reuse them everywhere.
- Every animation needs a `prefers-reduced-motion` fallback. Everything must work on a 390px-wide phone, by tap as well as hover.
- Preview through a local static server that you start (use whatever is available on the machine), never by opening the file: the cover's hover detection reads image pixels, which browsers block for `file://`. In the Claude desktop app, start it from the shell (`python3 -m http.server 8000` in this folder): the app's own preview launcher is blocked by macOS from reading the Downloads folder.

## The cover (built)

A Greek landscape with five creatures. Hovering a creature's own pixels fades it into its twin from another culture, with a burst of sparkles; moving away swaps it back. Each creature has a pill name tag (Hubballi, black box at 56% in multiply mode) showing whichever of the pair is visible; tag positions are in `CREATURES` in `js/cover.js`. Click keeps the twin showing. On phones, a tap swaps it, and the scene is wider than the screen so readers swipe across it. A "Switch all" button (same pill as the tags) sits in the top left corner of the scene, "By Anushka Dhere" in the top right, and an animated white scroll cue (mouse and dotted arrow) at the bottom centre, which fades once the reader scrolls. The help line ("Hover a creature…" or, on touch screens, "Tap a creature…") sits under the button; the old floating "Hover over the creatures" hint is switched off in `css/cover.css`. The title is lettered on the rock in the art (the page's `<h1>` is visually hidden); below the scene there is only the intro line. Fonts: headings in Hubballi at heading size, sentence case (`--font-heading`; Figma shows "Font Awesome 5 Brands", an icon font with no letters, which falls back to this); body and tags in Hubballi; Disney Heroic (`assets/fonts/DisneyHeroic.ttf`, `--font-display`) only for decorative lettering such as the bestiary card labels. The scene is static (no parallax). Its bottom edge is torn paper (`assets/cover/edge.svg`).

| Shown first (layer group MONSTERS 1) | Twin (MONSTERS 2) |
| --- | --- |
| Sharvara and Shyama (Hindu) | Cerberus (Greek) |
| Griffin (Greek) | Garuda (Hindu) |
| Hydra (Greek) | Yamata no Orochi (Japanese) |
| Empousa (Greek) | Futakuchi-onna (Japanese) |
| Ladon (Greek) | Fáfnir (Norse) |

Config (file names, pairs, stacking order) is at the top of `js/cover.js`.

**Asset rules:** every PNG is exported from the same artboard at the same size, with a transparent background and only its own layer visible. Each creature's contact shadow is part of its own PNG. File names: `sky, clouds, far, mid, ground, rock (optional), foreground (optional)`, plus `sharvara-shyama, cerberus, griffin, garuda, hydra, orochi, empousa, futakuchi-onna, ladon, fafnir`. Run `python3 tools/trim_cover.py` (needs Pillow) before previewing as well as before publishing: the full 5317×3366 PNGs decode to ~1 GB and browsers drop parts of them, so creatures flicker or vanish. Re-run it after changing any image, or delete `assets/cover/layout.json` to go back to the full PNGs.

## Build order (what's next)

Each step is one Claude Code conversation. Check it in the preview, then commit and push. "Script" = `docs/script.md` (final text); "demo" = `docs/interactions-demo.html` (added interactions).

1. **Cover**: done, with the real art.
2. **Reading layout** and the four sky colours: dusk (opening) → daylight (bestiary, Chart 1) → night (Chart 2) → dawn (Chart 3, ending). The background shifts as the reader scrolls.
3. **Added: "Which bestiary did you grow up with?"**: done (`js/bestiary.js`), right after the cover (demo §1). One shared variable; only the added interactions read it.
4. **Opening**, as in the script: two-serpents and three-silhouettes scroll steps, and the pinned "travel · imagine" labels.
5. **Building a bestiary**, as in the script: the counter and the six family flip cards.
6. **Chart 1, quadrant plot**, unchanged, under the heading "Every monster has a job" and its one paragraph. Added: a guess just before it (demo §2). The script's Chart 1 paragraphs become scroll-step cards beside the pinned chart, with pins on a transparent layer (demo §3).
7. **Chart 2, network**, same data. Added: a guess before it ("which has the most look-alikes?", answer Medusa, 10, revealed only when the reader reaches "Then comes the surprise"). The script's paragraphs are step cards, and each [CHART 2 STEP] note is a visual state of the chart:
   - all 109 lines draw in; solid = near-identical, dashed = loose; unmatched dots drift to the edges
   - serpent knot: zoom to the serpent cluster, each serpent's slayer named beside it (Apollo, Zeus, Indra, Susanoo, Thor)
   - same body, opposite job: highlight the Shesha–Jörmungandr line, with a small inset of the two on the quadrant plot (protector vs destroyer)
   - beautiful, lethal woman: Medusa, Lamia and Yakshini glow, then the whole cluster across all four colours, with one illustrated figure per culture sliding in beside the chart
   - loners: unlinked dots drift out with a soft halo; hovering one says why it has no match
   - free explore: drag, hover, zoom, pan, and tap a family card to light up only that family's links
8. **Chart 3, chord**, same data. Added guess before it (Greek–Hindu, 25). Step states: arcs then ribbons draw in, with the note "ribbons are symmetric" under the chart; highlight Greek–Hindu, then Japanese–Norse; highlight the self-loops with 39% and 21% on the Greek and Hindu arcs; a dotted outer edge on the Japanese arc. Free explore: hover an arc to isolate it, click a ribbon to list its pairs.
9. **Added: Dream up a monster** (demo §4), inserted just before the heading "Borrowed, inherited or imagined?".
10. **Guess the route** goes where the script says "Before reading on, try it yourself." (four pairs; demo §5). **The full bestiary** goes after "The rest of the bestiary is below. Go and meet them." (demo §6: culture and family filters, search, yours first). Then "About this bestiary" exactly as written. The script has no download line, so don't add one.
11. Polish: phone layout, reduced motion, image sizes, a "Skip to the bestiary" link near the top.

**Data rules for the new interactions** (all read-only):
- Body = the `families` column (a creature can belong to several).
- Job = the quadrant plot's scores in `creatures_data.js` from the old repo: protector = helper ≥ 0.5 and antagonist < 0.5; destroyer = the reverse; both ≥ 0.5 counts for either; the rest are "trickster or obstacle".
- Fame = `popularity` in `creatures_data.js`. Look-alikes = cross-culture rows in `data/creature_links.csv`.

## Known fixes when porting the old charts

- Label Japanese creatures "Japanese", never "Shinto" (done in the quadrant and network; the one "Shinto folk belief" left in `creatures_data.js` is a source citation).
- The old chord side panel shows `$39\%$`; write plain `39%`.
- Only one chart may be visible at a time (the old page let the network chart's title show behind the quadrant plot).
- Yama's dogs are "Sharvara and Shyama" everywhere. Don't claim Cerberus's name comes from them: most linguists reject that etymology.
