/* =========================================================
   "Building a bestiary": the counter and the six family cards.
   Same structure as the opening: section.scrolly > .stage + .steps,
   data-step set by an IntersectionObserver, motion in css/article.css.

     step 1 "The bestiary holds 96…"   "Who made the cut": the count runs 0 -> 96,
                                       scrubbed to the scroll, as 96 dots fall and sort
                                       into four jars (one per culture), each labelled
                                       when it fills; five grey dots bounce off a rim
                                       into a "cut" heap. Hovering, tapping or focusing
                                       a jar shows its five most famous members.
     step 2 "The bar for entry…"       the full counter stays
     step 3 "Strip away the names…"    the counter leaves; the six cards enter, staggered
     steps 4–9 (one per family)        that family's card lifts, the others dim

   The cards are built from the families column of
   data/mythology_creatures_dataset.csv (a creature can be in several).
   Hover, tap or Enter turns a card over.
   ========================================================= */
(() => {
  "use strict";
  const sec = document.getElementById("build");
  if (!sec) return;
  const stage = sec.querySelector(".stage");
  const steps = [...sec.querySelectorAll(".step")];
  const num = sec.querySelector(".bd-num");
  const pilesBox = sec.querySelector(".bd-piles");
  const cardsBox = sec.querySelector(".bd-cards");

  const CULTURES = ["Greek", "Hindu", "Japanese", "Norse"];
  // card order follows the script's family paragraphs
  const FAMILIES = [
    { key: "serpent or dragon", name: "Serpents and dragons", line: "The oldest fear in the book.", art: "family-serpent" },
    { key: "many-headed beast", name: "Many-headed beasts", line: "More heads, more problems.", art: "family-heads" },
    { key: "shapeshifter", name: "Shapeshifters", line: "Never trust a helpful stranger.", art: "family-shapeshifter" },
    { key: "human or animal hybrid", name: "Human hybrids", line: "Half person, half warning.", art: "family-hybrid" },
    { key: "wolf or hound", name: "Wolves and hounds", line: "Loyal to the dead, hungry for the sun.", art: "family-hound" },
    { key: "beautiful lethal woman", name: "Beautiful, lethal women", line: "Look closer.", art: "family-woman" },
  ];
  const ART = "assets/creature-cards/";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const short = (n) => n.replace(/\s*\(.*\)\s*$/, "");

  // ---------- a small CSV reader (quoted fields may hold commas) ----------
  function parseCSV(text) {
    const rows = []; let row = [], field = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') q = false;
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const head = rows.shift();
    return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] || ""])));
  }

  // ---------- step: the paragraph crossing the reading line ----------
  // Desktop: the middle of the screen. Phone: lower down (78%), so each text
  // card sits below the pinned stage while its step plays, not over it.
  const LINE = matchMedia("(max-width: 899px)").matches ? 0.78 : 0.5;
  let current = 0;
  const setStep = (n) => {
    if (n === current) return;
    current = n;
    sec.dataset.step = stage.dataset.step = String(n);
    stage.dataset.family = n >= 4 ? String(n - 4) : "";
  };
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    const n = +e.target.dataset.step;
    if (e.isIntersecting) setStep(n);
    else if (n === 1 && e.boundingClientRect.top > 0) setStep(0);
  }), { rootMargin: `-${LINE * 100}% 0px -${100 - LINE * 100}% 0px` });
  steps.forEach((s) => io.observe(s));

  fetch("data/mythology_creatures_dataset.csv")
    .then((r) => r.text())
    .then((text) => build(parseCSV(text)))
    .catch((err) => console.warn("[build] could not read the dataset", err));

  function build(rows) {
    // ---------- "Who made the cut": 96 dots fall and sort into four jars ----------
    const byCulture = CULTURES.map((c) => rows.filter((r) => r.mythology === c).length);
    const famous = topFive();
    const jars = CULTURES.map((c, ci) => {
      const pile = el("button", "bd-pile");
      pile.type = "button";
      pile.style.setProperty("--c", `var(--c-${c.toLowerCase()})`);
      pile.setAttribute("aria-expanded", "false");
      pile.setAttribute("aria-label", `${byCulture[ci]} ${c} creatures. Show the five most famous.`);
      const jar = el("span", "bd-jar");
      const dots = [];
      for (let i = 0; i < byCulture[ci]; i++) { const d = el("span", "bd-dot"); jar.appendChild(d); dots.push(d); }
      const label = el("span", "bd-pile-label", `${byCulture[ci]} ${c}`);
      const tip = el("span", "bd-famous");
      tip.append(el("b", null, `Most famous ${c}`));
      const list = el("span", "bd-famous-list");
      (famous[c] || []).forEach((n) => list.appendChild(el("span", null, n)));
      tip.appendChild(list);
      pile.append(tip, jar, label);
      pile.addEventListener("click", () => {          // tap or Enter: show / hide the five
        const open = pile.getAttribute("aria-expanded") !== "true";
        pilesBox.querySelectorAll(".bd-pile").forEach((p) => p.setAttribute("aria-expanded", "false"));
        pile.setAttribute("aria-expanded", String(open));
      });
      pilesBox.appendChild(pile);
      return { pile, jar, dots, label, n: byCulture[ci] };
    });
    const cutZone = el("span", "bd-cutzone");
    cutZone.appendChild(el("span", "bd-cut-label", "cut"));
    pilesBox.appendChild(cutZone);

    // the order dots fall in: interleaved, so they sort into the jars as they come
    const order = [];
    const filled = jars.map(() => 0);
    for (let k = 0; k < jars.reduce((a, j) => a + j.n, 0); k++) {
      let best = -1, bestFrac = 2;
      jars.forEach((j, ji) => { const f = filled[ji] / j.n; if (filled[ji] < j.n && f < bestFrac) { bestFrac = f; best = ji; } });
      order.push(jars[best].dots[filled[best]++]);
    }
    const total = order.length;   // 96
    const ends = jars.map((j) => order.lastIndexOf(j.dots[j.n - 1]) + 1);   // count at which each jar is full

    // a few creatures that didn't make the cut: grey dots that bounce off a rim into the "cut" heap
    const CUT_AT = [14, 33, 51, 69, 86];   // counts at which they drop
    const cuts = CUT_AT.map((at, i) => {
      const d = el("span", "bd-dot bd-cut");
      d.style.setProperty("--n", String(i));
      pilesBox.appendChild(d);
      return { d, at, jar: jars[i % jars.length].jar };
    });
    const placeCuts = () => {
      const box = pilesBox.getBoundingClientRect();
      const zone = cutZone.getBoundingClientRect();
      cuts.forEach(({ d, jar }, i) => {
        const r = jar.getBoundingClientRect();
        d.style.setProperty("--x0", `${r.left + r.width * (0.3 + 0.1 * i) - box.left}px`);   // falls toward this jar
        d.style.setProperty("--rim", `${r.top - box.top - 4}px`);                              // hits its rim
        d.style.setProperty("--x1", `${zone.left - box.left + 6 + (i % 3) * 11}px`);           // lands in the heap
        d.style.setProperty("--y1", `${zone.bottom - box.top - 12 - Math.floor(i / 3) * 11}px`);
      });
    };
    placeCuts();
    new ResizeObserver(placeCuts).observe(pilesBox);

    let shown = -1;
    const setCount = (n) => {
      if (n === shown) return;
      shown = n;
      num.textContent = String(n);
      order.forEach((d, i) => d.classList.toggle("on", i < n));
      jars.forEach((j, ji) => j.label.classList.toggle("on", n >= ends[ji]));
      cuts.forEach((c) => c.d.classList.toggle("on", n >= c.at));
      cutZone.classList.toggle("on", n >= CUT_AT[0]);
    };
    if (window.Motion) {
      // the count finishes a little before the paragraph does
      Motion.track([steps[0]], ([p]) => setCount(Math.round(total * Math.max(0, Math.min(1, p / 0.85)))), { line: LINE });
    } else setCount(total);

    // ---------- the six cards ----------
    FAMILIES.forEach((f, i) => {
      const members = rows.filter((r) => r.families.split(";").map((s) => s.trim()).includes(f.key));
      const counts = CULTURES.map((c) => members.filter((m) => m.mythology === c).length);

      const card = el("button", "fcard");
      card.type = "button";
      card.dataset.i = String(i);
      card.style.setProperty("--i", String(i));
      card.setAttribute("aria-pressed", "false");
      card.setAttribute("aria-label", `${f.name}: ${members.length} creatures. Press to turn the card over.`);

      const inner = el("span", "fcard-inner");

      const front = el("span", "fcard-face fcard-front");
      const art = el("img"); art.src = ART + f.art + ".webp"; art.alt = ""; art.loading = "lazy";
      front.append(art, el("span", "fcard-plate", f.name), el("span", "fcard-line", f.line));

      const back = el("span", "fcard-face fcard-back");
      const bart = el("img"); bart.src = ART + "card-back.webp"; bart.alt = ""; bart.loading = "lazy";
      const panel = el("span", "fcard-panel");
      const count = el("span", "fcard-count");
      count.append(el("b", null, String(members.length)), document.createTextNode(" creatures"));
      const bar = el("span", "fcard-bar");
      CULTURES.forEach((c, ci) => {
        if (!counts[ci]) return;
        const seg = el("span");
        seg.style.flex = String(counts[ci]);
        seg.style.background = `var(--c-${c.toLowerCase()})`;
        seg.title = `${c}: ${counts[ci]}`;
        bar.appendChild(seg);
      });
      const names = el("span", "fcard-names");
      CULTURES.forEach((c) => {
        const list = members.filter((m) => m.mythology === c).map((m) => short(m.creature_name));
        if (!list.length) return;
        const line = el("span", "fcard-culture");
        line.style.setProperty("--c", `var(--c-${c.toLowerCase()})`);
        line.append(el("b", null, c), document.createTextNode(" " + list.join(", ")));
        names.appendChild(line);
      });
      panel.append(count, bar, names);
      back.append(bart, panel);

      inner.append(front, back);
      card.appendChild(inner);
      card.addEventListener("click", () => {
        const on = card.getAttribute("aria-pressed") !== "true";
        card.setAttribute("aria-pressed", String(on));
      });
      cardsBox.appendChild(card);
    });

    // live text has to fit the art: shrink each piece until it does
    const fitAll = () => sec.querySelectorAll(".fcard-plate, .fcard-line, .fcard-panel").forEach(fit);
    new ResizeObserver(fitAll).observe(cardsBox);
    if (document.fonts) document.fonts.ready.then(fitAll);
    fitAll();
  }

  // the five most famous creatures per culture: the quadrant plot's popularity
  // scores (charts/creatures_data.js), ties broken alphabetically
  function topFive() {
    const data = typeof CREATURES_DATA !== "undefined" ? CREATURES_DATA : [];
    const out = {};
    CULTURES.forEach((c) => {
      out[c] = data.filter((d) => d.mythology === c)
        .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name))
        .slice(0, 5)
        .map((d) => short(d.name));
    });
    return out;
  }

  function fit(box) {
    box.style.fontSize = "";
    let size = parseFloat(getComputedStyle(box).fontSize);
    const min = 5;
    while (size > min && (box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1)) {
      size -= 0.5;
      box.style.fontSize = size + "px";
    }
  }
})();
