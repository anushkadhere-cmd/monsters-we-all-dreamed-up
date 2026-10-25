/* =========================================================
   "Dream up a monster" (demo §4), just before "Borrowed, inherited or
   imagined?". The reader picks a body (the six families, with their card
   art) and a job (protector, destroyer, trickster or obstacle). The
   bestiary answers: "Already dreamed up N times, in X of 4 cultures"
   (the number counts up), and the matching creatures slide in as small
   cards grouped by culture, the reader's own tradition first.

   Body = the `families` column of data/mythology_creatures_dataset.csv
   (a creature can be in several). Job = the quadrant plot's scores in
   charts/creatures_data.js: protector = helper >= 0.5 and antagonist < 0.5;
   destroyer = the reverse; both >= 0.5 counts for either; the rest are
   tricksters or obstacles.
   ========================================================= */
(() => {
  "use strict";
  const box = document.getElementById("dream");
  if (!box || typeof CREATURES_DATA === "undefined") return;

  const CULTURES = ["Greek", "Hindu", "Japanese", "Norse"];
  const BODIES = [
    { k: "serpent or dragon", label: "Serpent or dragon", art: "family-serpent" },
    { k: "many-headed beast", label: "Many heads", art: "family-heads" },
    { k: "shapeshifter", label: "Shapeshifter", art: "family-shapeshifter" },
    { k: "human or animal hybrid", label: "Human hybrid", art: "family-hybrid" },
    { k: "wolf or hound", label: "Wolf or hound", art: "family-hound" },
    { k: "beautiful lethal woman", label: "Beautiful, lethal woman", art: "family-woman" },
  ];
  const JOBS = [
    { k: "protector", label: "Protector", art: "job-protector" },
    { k: "destroyer", label: "Destroyer", art: "job-destroyer" },
    { k: "trickster", label: "Trickster or obstacle", art: "job-trickster" },
  ];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const short = (n) => n.replace(/\s*\(.*\)\s*$/, "");
  const jobOf = (c) => (c.helper >= 0.5 && c.antagonist >= 0.5 ? "both" : c.helper >= 0.5 ? "protector" : c.antagonist >= 0.5 ? "destroyer" : "trickster");
  const jobOk = (c, job) => { const j = jobOf(c); return j === job || (j === "both" && job !== "trickster"); };

  // the CSV's families, joined to the chart data by name
  fetch("data/mythology_creatures_dataset.csv").then((r) => r.text()).then((text) => {
    const fam = new Map();
    const lines = text.trim().split(/\r?\n/);
    const head = splitCSV(lines[0]);
    const iName = head.indexOf("creature_name"), iFam = head.indexOf("families");
    lines.slice(1).forEach((l) => { const r = splitCSV(l); fam.set(r[iName], (r[iFam] || "").split(";").map((s) => s.trim()).filter(Boolean)); });
    build(CREATURES_DATA.map((c) => ({ ...c, families: fam.get(c.name) || [] })));
  });

  function build(data) {
    let body = null, job = null;
    const q = el("p", "guess-q", "Dream up a monster");
    q.id = "dream-q";
    const hint = el("p", "dream-hint", "Pick a body and a job.");
    const rowB = el("div", "dream-row"), rowJ = el("div", "dream-row");
    const labB = el("span", "dream-label", "Body"), labJ = el("span", "dream-label", "Job");
    const tilesB = el("div", "guess-opts dream-tiles"), tilesJ = el("div", "guess-opts dream-tiles");
    tilesB.setAttribute("role", "group"); tilesB.setAttribute("aria-label", "Body");
    tilesJ.setAttribute("role", "group"); tilesJ.setAttribute("aria-label", "Job");
    rowB.append(labB, tilesB); rowJ.append(labJ, tilesJ);
    const verdict = el("p", "dream-verdict");
    verdict.setAttribute("aria-live", "polite");
    const groups = el("div", "dream-groups");
    box.append(q, hint, rowB, rowJ, verdict, groups);

    const tile = (o, folder, onPick, list) => {
      const b = el("button", "dream-tile");
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      const img = el("img");
      img.src = folder + o.art + ".webp";
      img.alt = "";
      b.append(img, el("span", "opt-name", o.label));
      b.addEventListener("click", () => { onPick(o.k); [...list.children].forEach((x) => x.setAttribute("aria-pressed", String(x === b))); render(); });
      list.appendChild(b);
    };
    BODIES.forEach((o) => tile(o, "assets/creature-cards/", (k) => (body = k), tilesB));
    JOBS.forEach((o) => tile(o, "assets/dream/", (k) => (job = k), tilesJ));

    let counter = 0;
    function render() {
      if (!body || !job) return;
      box.classList.add("has-result");
      const hit = data.filter((c) => c.families.includes(body) && jobOk(c, job));
      const by = Object.fromEntries(CULTURES.map((c) => [c, hit.filter((d) => d.mythology === c).sort((a, b) => b.popularity - a.popularity)]));
      const nC = CULTURES.filter((c) => by[c].length).length;
      const yours = window.MonsterBestiary && MonsterBestiary.culture;

      // "Already dreamed up N times, in X of 4 cultures", the number counting up
      verdict.textContent = "";
      if (!hit.length) { verdict.textContent = "Nobody has dreamed this one up yet."; groups.replaceChildren(); return; }
      const num = el("b", "dream-num", reduced.matches ? String(hit.length) : "0");
      verdict.append("Already dreamed up ", num, (hit.length === 1 ? " time" : " times") + ", in " + nC + " of 4 cultures");
      const id = ++counter;
      if (!reduced.matches) {
        const t0 = performance.now(), dur = 700;
        const tick = (t) => {
          if (id !== counter) return;
          const k = Math.min(1, (t - t0) / dur);
          num.textContent = String(Math.round(hit.length * (1 - Math.pow(1 - k, 3))));
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        setTimeout(() => { if (id === counter) num.textContent = String(hit.length); }, dur + 60);   // always lands on the total
      }

      // the matches as small cards, grouped by culture (the reader's first), sliding in one after another
      groups.replaceChildren();
      const order = CULTURES.filter((c) => by[c].length).sort((a, b) => (b === yours) - (a === yours));
      let i = 0;
      order.forEach((c) => {
        const g = el("div", "dream-group" + (c === yours ? " is-yours" : ""));
        g.style.setProperty("--c", "var(--c-" + c.toLowerCase() + ")");
        const h = el("p", "dream-group-head");
        h.append(el("span", "dot"), c + (c === yours ? " · your bestiary" : ""), el("span", "n", String(by[c].length)));
        const cards = el("div", "dream-cards");
        by[c].forEach((d) => {
          const k = el("div", "dream-card");
          k.style.setProperty("--i", String(i++));
          k.append(el("span", "dream-card-name", short(d.name)), el("span", "dream-card-job", ({ protector: "Protector", destroyer: "Destroyer", trickster: "Trickster or obstacle", both: "Protector and destroyer" })[jobOf(d)]));
          cards.appendChild(k);
        });
        g.append(h, cards);
        groups.appendChild(g);
      });
      void groups.offsetWidth;                      // start hidden, then slide in
      groups.classList.remove("in");
      requestAnimationFrame(() => groups.classList.add("in"));
    }
    if (window.MonsterBestiary) MonsterBestiary.onChange(() => render());
  }

  function splitCSV(line) {
    const out = []; let f = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
      else if (c === '"') q = true; else if (c === ",") { out.push(f); f = ""; } else f += c;
    }
    out.push(f);
    return out;
  }
})();
