/* =========================================================
   Cover: "switch the lore"
   Hover a creature (tap on phones) to swap it for its twin
   from another culture, with a little burst of sparkles.

   Images come from assets/cover/:
   - while you work: full-artboard PNGs in assets/cover/full/<name>.png
   - before publishing: run tools/trim_cover.py, which writes trimmed
     images plus assets/cover/layout.json (this file then uses those).
   ========================================================= */
(() => {
  "use strict";

  // ---------------- CONFIG: edit this part ----------------
  const DIR = "assets/cover/";

  // Every image in the scene, back to front, in the same order as the
  // Illustrator layer panel (BACKGROUND, then MONSTERS 2, then MONSTERS 1).
  // Missing files are skipped.
  const STACK = [
    "sky",
    "clouds",
    "far",
    "mid",
    "orochi", // Illustrator keeps OROCHI under the ground
    "ground",
    "rock",
    "foreground",
    // MONSTERS 2 (the twins)
    "garuda",
    "cerberus",
    "fafnir",
    "futakuchi-onna",
    // MONSTERS 1 (shown first)
    "sharvara-shyama",
    "griffin",
    "ladon",
    "empousa",
    "hydra",
  ];

  // Pairs. "a" shows first; hovering the pixels of "a" fades in "b".
  // Each pair has a name tag, by default just under the feet of "a". Where that
  // spot is hidden, tag: [x, y] places the top centre of the tag instead, as a
  // fraction of the artboard (0,0 = top left, 1,1 = bottom right).
  const CREATURES = [
    { a: { file: "sharvara-shyama", name: "Sharvara and Shyama", culture: "Hindu" },
      b: { file: "cerberus", name: "Cerberus", culture: "Greek" },
      tag: [0.14, 0.805] },  // at their paws, clear of the left edge and Empousa's tag
    { a: { file: "griffin", name: "Griffin", culture: "Greek" },
      b: { file: "garuda", name: "Garuda", culture: "Hindu" } },
    { a: { file: "hydra", name: "Hydra", culture: "Greek" },
      b: { file: "orochi", name: "Yamata no Orochi", culture: "Japanese" },
      tag: [0.665, 0.36] },  // in the sky right of the heads, off the title rock
    { a: { file: "empousa", name: "Empousa", culture: "Greek" },
      b: { file: "futakuchi-onna", name: "Futakuchi-onna", culture: "Japanese" },
      tag: [0.313, 0.865] }, // between her feet, clear of the torn edge
    { a: { file: "ladon", name: "Ladon", culture: "Greek" },
      b: { file: "fafnir", name: "Fáfnir", culture: "Norse" },
      tag: [0.73, 0.865] },  // on the grass right of its back foot
  ];

  const HINT_ON = "hydra";  // which creature the first-time hint points at
  const SPARKLES = 14;      // sparkles in the burst when a creature switches
  const HIT_SCALE = 0.25;   // resolution of the hover maps (fraction of image size)
  const ALPHA_MIN = 40;     // more transparent than this = not part of the creature
  // ---------------------------------------------------------

  const $ = (id) => document.getElementById(id);
  const stage = $("cover-stage"), inner = $("cover-inner"),
        hint = $("cover-hint"), msg = $("cover-msg"), live = $("cover-live"),
        switchBtn = $("cover-switch"), help = $("cover-help");
  if (!stage) return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const canHover = matchMedia("(hover: hover) and (pointer: fine)");

  let W = 0, H = 0;           // artboard size in px
  let hitMapsOk = true;
  const creatures = [];       // { cfg, parts: {a, b}, state, pinned, btn }, in CREATURES (tab) order
  let frontToBack = [];       // the same creatures, frontmost first, for hit testing

  // ---------- loading ----------
  async function getLayout() {
    try {
      const r = await fetch(DIR + "layout.json", { cache: "no-cache" });
      if (r.ok) return await r.json();
    } catch (e) { /* no layout yet: use the full-artboard PNGs */ }
    return null;
  }

  function loadImg(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function loadPart(name, layout) {
    const entry = layout && layout.layers[name];
    if (layout && !entry) return null;      // with a layout, a layer it doesn't list doesn't exist (no request, no 404)
    const src = entry ? DIR + entry.file : DIR + "full/" + name + ".png";
    const img = await loadImg(src);
    if (!img) { console.info("[cover] skipped (not found): " + src); return null; }
    img.alt = "";
    img.draggable = false;
    img.className = "part";
    return { name, img, box: entry ? { x: entry.x, y: entry.y, w: entry.w, h: entry.h } : null };
  }

  function place(part) {
    const b = part.box || { x: 0, y: 0, w: W, h: H };
    part.box = b;
    Object.assign(part.img.style, {
      left: (b.x / W) * 100 + "%",
      top: (b.y / H) * 100 + "%",
      width: (b.w / W) * 100 + "%",
      height: (b.h / H) * 100 + "%",
    });
  }

  // ---------- hover maps: which pixels belong to a creature ----------
  function buildHitMap(part) {
    const cw = Math.max(1, Math.round(part.img.naturalWidth * HIT_SCALE));
    const ch = Math.max(1, Math.round(part.img.naturalHeight * HIT_SCALE));
    const canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(part.img, 0, 0, cw, ch);
    const data = ctx.getImageData(0, 0, cw, ch).data; // throws if opened as file://
    const alpha = new Uint8Array(cw * ch);
    let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
    for (let i = 0; i < alpha.length; i++) {
      const a = data[i * 4 + 3];
      alpha[i] = a;
      if (a > ALPHA_MIN) {
        const x = i % cw, y = (i / cw) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    part.hit = { cw, ch, alpha };
    part.bbox = x1 < 0 ? null : { x0: x0 / cw, y0: y0 / ch, x1: (x1 + 1) / cw, y1: (y1 + 1) / ch };
  }

  function partHit(part, x, y) {
    const r = part.img.getBoundingClientRect();
    if (x < r.left || x >= r.right || y < r.top || y >= r.bottom) return false;
    if (!part.hit) return !!part.trimmed; // no pixel data: fall back to the trimmed box
    const hx = Math.floor(((x - r.left) / r.width) * part.hit.cw);
    const hy = Math.floor(((y - r.top) / r.height) * part.hit.ch);
    return part.hit.alpha[hy * part.hit.cw + hx] > ALPHA_MIN;
  }

  // Only the visible picture answers: the first monster, or the twin once it is
  // kept (click, tap, Switch all). An invisible twin never catches the pointer.
  function hitTest(x, y) {
    for (const c of frontToBack) {
      const part = c.pinned && c.parts.b ? c.parts.b : c.parts.a;
      if (partHit(part, x, y)) return c;
    }
    // A hovered twin stays while the pointer is still on it, so it doesn't flicker
    // where the two pictures have different outlines.
    if (hovered && !hovered.pinned && hovered.parts.b && partHit(hovered.parts.b, x, y)) return hovered;
    return null;
  }

  // ---------- positions in stage coordinates ----------
  function stagePoint(clientX, clientY) {
    const sr = stage.getBoundingClientRect();
    return { x: clientX - sr.left + stage.scrollLeft, y: clientY - sr.top + stage.scrollTop };
  }

  function anchorOf(c) {
    const part = c.state === "b" && c.parts.b ? c.parts.b : c.parts.a;
    const r = part.img.getBoundingClientRect();
    const bb = part.bbox || { x0: 0, y0: 0, x1: 1, y1: 1 };
    return stagePoint(r.left + ((bb.x0 + bb.x1) / 2) * r.width, r.top + bb.y0 * r.height);
  }

  function boxOf(c) { return boxOfPart(c.parts.a); }

  function boxOfPart(part) {
    const r = part.img.getBoundingClientRect();
    const bb = part.bbox || { x0: 0, y0: 0, x1: 1, y1: 1 };
    const tl = stagePoint(r.left + bb.x0 * r.width, r.top + bb.y0 * r.height);
    return { x: tl.x, y: tl.y, w: (bb.x1 - bb.x0) * r.width, h: (bb.y1 - bb.y0) * r.height };
  }

  // ---------- state ----------
  let hovered = null, focused = null, interacted = false, focusTimer = 0;

  const shown = (c) => (c.state === "b" ? c.cfg.b : c.cfg.a);
  const twin = (c) => (c.state === "b" ? c.cfg.a : c.cfg.b);

  function setState(c, s) {
    if (s === "b" && !c.parts.b) return; // twin image missing
    const changed = c.state !== s;
    c.state = s;
    c.parts.a.img.classList.toggle("on", s === "a");
    if (c.parts.b) c.parts.b.img.classList.toggle("on", s === "b");
    c.btn.setAttribute("aria-label", shown(c).name + " (" + shown(c).culture + "). Press to switch to " + twin(c).name + ".");
    updateTag(c);
    if (changed) sparkle(c);
  }

  // The switch: sparkles scatter over the creature that appears, and it glows briefly.
  function sparkle(c) {
    if (reduceMotion.matches) return;
    const part = c.state === "b" ? c.parts.b : c.parts.a;
    const b = boxOfPart(part);
    const burst = document.createElement("div");
    burst.className = "cover-sparkles";
    Object.assign(burst.style, { left: b.x + "px", top: b.y + "px", width: b.w + "px", height: b.h + "px" });
    for (let i = 0; i < SPARKLES; i++) {
      const s = document.createElement("span");
      s.style.left = 10 + Math.random() * 80 + "%";
      s.style.top = 5 + Math.random() * 80 + "%";
      s.style.setProperty("--size", 10 + Math.random() * 16 + "px");
      s.style.setProperty("--delay", Math.random() * 0.2 + "s");
      s.style.setProperty("--rise", -(12 + Math.random() * 30) + "px");
      s.style.setProperty("--spin", Math.random() * 180 - 90 + "deg");
      burst.appendChild(s);
    }
    stage.appendChild(burst);
    setTimeout(() => burst.remove(), 1300);
    part.img.classList.remove("glow");
    void part.img.offsetWidth; // restart the glow if it is already running
    part.img.classList.add("glow");
  }

  function spotlight(c) {
    focused = c;
    stage.classList.toggle("has-focus", !!c);
    creatures.forEach((x) => {
      x.parts.a.img.classList.toggle("is-focus", x === c);
      if (x.parts.b) x.parts.b.img.classList.toggle("is-focus", x === c);
    });
  }

  // Name tag under each creature: shows whoever is visible right now.
  function updateTag(c) {
    if (!c.tag) return;
    c.tag.name.textContent = shown(c).name;
    c.tag.culture.textContent = shown(c).culture;
    c.tag.culture.style.setProperty("--dot", "var(--c-" + shown(c).culture.toLowerCase() + ")"); // shared culture colour
  }

  function makeTag(c) {
    const part = c.parts.a, box = part.box, bb = part.bbox || { x0: 0, y0: 0, x1: 1, y1: 1 };
    // default spot: just under the first monster's feet; CREATURES can override with tag: [x, y]
    const [x, y] = c.cfg.tag || [
      (box.x + ((bb.x0 + bb.x1) / 2) * box.w) / W,
      (box.y + bb.y1 * box.h) / H,
    ];
    const el = document.createElement("div");
    el.className = "cover-label";
    el.setAttribute("aria-hidden", "true"); // the creature buttons already say the names
    el.style.left = x * 100 + "%";
    el.style.top = y * 100 + "%";
    const pill = document.createElement("div");
    pill.className = "cover-label-pill";
    const bg = document.createElement("span");
    bg.className = "cover-label-bg";
    const name = document.createElement("b");
    const culture = document.createElement("span");
    culture.className = "cover-label-culture";
    pill.append(bg, name, culture);
    el.appendChild(pill);
    inner.appendChild(el);
    c.tag = { el, name, culture };
    updateTag(c);
  }

  // Put a label above a point, but keep it inside the visible part of the stage.
  function placeLabel(el, p) {
    const w = el.offsetWidth, h = el.offsetHeight, gap = 12, edge = 8;
    const left = stage.scrollLeft, right = stage.scrollLeft + stage.clientWidth;
    const x = Math.min(Math.max(p.x, left + w / 2 + edge), right - w / 2 - edge);
    const y = Math.max(p.y, stage.scrollTop + h + gap + edge);
    el.style.left = x + "px";
    el.style.top = y + "px";
  }

  function firstInteraction() {
    if (interacted) return;
    interacted = true;
    hint.hidden = true;
  }

  function announce(c) { live.textContent = shown(c).name + ", " + shown(c).culture + "."; }

  function updateSwitchButton() {
    const allB = creatures.every((c) => c.state === "b");
    switchBtn.querySelector(".cover-switch-label").textContent = allB ? "Switch back" : "Switch all";
    switchBtn.setAttribute("aria-pressed", String(allB));
  }

  // ---------- mouse: hover swaps, leaving swaps back, click keeps it ----------
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const hit = hitTest(e.clientX, e.clientY);
    stage.classList.toggle("is-pointing", !!hit);
    if (hit === hovered) return;
    if (hovered && !hovered.pinned) setState(hovered, "a");
    hovered = hit;
    if (hit) { setState(hit, "b"); firstInteraction(); }
    spotlight(hit);
    updateSwitchButton();
  });

  stage.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse") return;
    if (hovered && !hovered.pinned) setState(hovered, "a");
    hovered = null;
    spotlight(null);
    stage.classList.remove("is-pointing");
    updateSwitchButton();
  });

  let lastPointer = "mouse";
  stage.addEventListener("pointerdown", (e) => { lastPointer = e.pointerType; });
  stage.addEventListener("click", (e) => {
    if (lastPointer !== "mouse") return; // touch is handled below
    const hit = hitTest(e.clientX, e.clientY);
    if (!hit) return;
    hit.pinned = !hit.pinned; // click keeps the twin showing after the mouse leaves
    setState(hit, "b");
  });

  // ---------- touch: a tap toggles (a swipe just scrolls) ----------
  let down = null;
  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  stage.addEventListener("pointerup", (e) => {
    if (e.pointerType === "mouse" || !down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 600;
    down = null;
    if (moved > 10 || !quick) return;
    const hit = hitTest(e.clientX, e.clientY);
    if (!hit) { spotlight(null); return; }
    hit.pinned = hit.state !== "b";
    setState(hit, hit.pinned ? "b" : "a");
    firstInteraction();
    spotlight(hit);
    announce(hit);
    updateSwitchButton();
    clearTimeout(focusTimer);
    focusTimer = setTimeout(() => { if (focused === hit) spotlight(null); }, 3500);
  });

  // ---------- Switch all ----------
  switchBtn.addEventListener("click", () => {
    const toB = creatures.some((c) => c.state === "a" && c.parts.b);
    creatures.forEach((c) => { c.pinned = toB; setState(c, toB ? "b" : "a"); });
    firstInteraction();
    spotlight(null);
    updateSwitchButton();
    live.textContent = toB ? "Every creature switched to its twin." : "Every creature switched back.";
  });

  // ---------- keyboard: one focusable button per creature ----------
  function placeHotspots() {
    creatures.forEach((c) => {
      const b = boxOf(c);
      Object.assign(c.btn.style, { left: b.x + "px", top: b.y + "px", width: b.w + "px", height: b.h + "px" });
    });
  }

  // the scroll cue fades once the reader starts scrolling
  const scrollCue = $("cover-scroll");
  if (scrollCue) {
    const fadeCue = () => scrollCue.classList.toggle("is-gone", scrollY > 40);
    addEventListener("scroll", fadeCue, { passive: true });
    fadeCue();
  }

  const sizeTags = () => inner.style.setProperty("--art-w", inner.offsetWidth + "px");
  addEventListener("resize", () => { placeHotspots(); sizeTags(); });

  // ---------- build ----------
  function addLayer(className) {
    const el = document.createElement("div");
    el.className = "layer " + (className || "");
    inner.appendChild(el);
    return el;
  }

  async function init() {
    const layout = await getLayout();
    const parts = await Promise.all(STACK.map((name) => loadPart(name, layout)));
    const byName = {};
    parts.forEach((p) => { if (p) byName[p.name] = p; });

    const any = parts.find(Boolean);
    if (!any) { showMsg("No cover images found. Put your PNGs in assets/cover/full/ (see CLAUDE.md)."); return; }
    if (layout) { W = layout.canvas.w; H = layout.canvas.h; }
    else { W = any.img.naturalWidth; H = any.img.naturalHeight; }
    stage.style.setProperty("--ratio", String(W / H));

    if (!layout) {
      parts.forEach((p) => {
        if (p && (p.img.naturalWidth !== W || p.img.naturalHeight !== H)) {
          console.warn("[cover] " + p.name + ".png is " + p.img.naturalWidth + "×" + p.img.naturalHeight +
            ", expected " + W + "×" + H + ". Export every layer from the same artboard.");
        }
      });
    }

    // one layer per image, in Illustrator order
    const creatureFiles = new Set(CREATURES.flatMap((c) => [c.a.file, c.b.file]));
    parts.forEach((p, i) => {
      if (!p) return;
      place(p);
      p.z = i;
      const isCreature = creatureFiles.has(p.name);
      if (isCreature) { p.trimmed = !!layout; p.img.classList.add("creature-part"); }
      addLayer((isCreature ? "creature " : "plane ") + "layer-" + p.name).appendChild(p.img);
    });

    CREATURES.forEach((cfg) => {
      const a = byName[cfg.a.file], b = byName[cfg.b.file] || null;
      if (!a) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cover-hotspot";
      stage.appendChild(btn);
      const c = { cfg, parts: { a, b }, state: "a", pinned: false, btn };
      btn.addEventListener("focus", () => { placeHotspots(); spotlight(c); });
      btn.addEventListener("blur", () => { if (focused === c) spotlight(null); });
      btn.addEventListener("click", () => {
        c.pinned = c.state !== "b";
        setState(c, c.pinned ? "b" : "a");
        firstInteraction(); announce(c); updateSwitchButton();
      });
      creatures.push(c);
      setState(c, "a");
    });
    creatures.forEach(makeTag);
    sizeTags();
    frontToBack = [...creatures].sort((m, n) => n.parts.a.z - m.parts.a.z);

    // hover maps
    try {
      creatures.forEach((c) => { buildHitMap(c.parts.a); if (c.parts.b) buildHitMap(c.parts.b); });
    } catch (err) {
      hitMapsOk = false;
      creatures.forEach((c) => { c.parts.a.hit = null; if (c.parts.b) c.parts.b.hit = null; });
      if (!layout) showMsg("Hover needs the page to run on a local server, not opened as a file. In this folder run:  python3 -m http.server  and open http://localhost:8000");
    }

    // phones: start the swipeable scene centred
    if (stage.scrollWidth > stage.clientWidth) stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2;

    placeHotspots();
    help.textContent = canHover.matches
      ? "Hover over a creature to meet its twin\nClick to lock it"
      : "Tap a creature to meet its twin\nSwipe to look around";
    const h = creatures.find((c) => c.cfg.a.file === HINT_ON);
    if (h && hitMapsOk) {
      hint.textContent = canHover.matches ? "Hover over the creatures" : "Tap the creatures";
      hint.hidden = false;
      placeLabel(hint, anchorOf(h));
    }
  }

  function showMsg(text) { msg.textContent = text; msg.hidden = false; }

  init();
})();
