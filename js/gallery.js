/* =========================================================
   "The full bestiary" (demo §6), after "The rest of the bestiary is
   below. Go and meet them." All 96 creatures as cards.

   - Card picture: the creature's own image in assets/bestiary/ if there
     is one (list its file name in OWN_ART below when you add it), else
     its family's card art (assets/creature-cards/) tinted with its
     culture's colour. Pictures load lazily.
   - Filters: culture chips (the picker's icons), family chips (small
     family art), and a search box. The reader's culture comes first,
     then the most famous. Cards glide to their new places (FLIP).
   - A card opens a side panel (a bottom sheet on phones): body, heads,
     job, tied to, fame, and look-alikes; a look-alike jumps to its card.

   Data: data/mythology_creatures_dataset.csv (body = families, heads,
   tied to), charts/creatures_data.js (job from the quadrant scores, fame =
   popularity), data/creature_links.csv (look-alikes = cross-culture rows).
   ========================================================= */
(() => {
  "use strict";
  const root = document.getElementById("gallery");
  if (!root) return;

  // creatures that have their own picture in assets/bestiary/ (file name without .webp)
  const OWN_ART = new Set([]);

  const CULTURES = ["Greek", "Hindu", "Japanese", "Norse"];
  const FAMILIES = [
    { k: "serpent or dragon", label: "Serpents and dragons", art: "family-serpent" },
    { k: "many-headed beast", label: "Many-headed beasts", art: "family-heads" },
    { k: "shapeshifter", label: "Shapeshifters", art: "family-shapeshifter" },
    { k: "human or animal hybrid", label: "Human hybrids", art: "family-hybrid" },
    { k: "wolf or hound", label: "Wolves and hounds", art: "family-hound" },
    { k: "beautiful lethal woman", label: "Beautiful, lethal women", art: "family-woman" },
  ];
  const ART_OF = Object.fromEntries(FAMILIES.map((f) => [f.k, f.art]));
  const JOB = { protector: "Protector", destroyer: "Destroyer", both: "Protector and destroyer", trickster: "Trickster or obstacle" };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const short = (n) => n.replace(/\s*\(.*\)\s*$/, "");
  const slug = (n) => short(n).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const jobOf = (c) => (!c ? "" : c.helper >= 0.5 && c.antagonist >= 0.5 ? "both" : c.helper >= 0.5 ? "protector" : c.antagonist >= 0.5 ? "destroyer" : "trickster");

  Promise.all([
    fetch("data/mythology_creatures_dataset.csv").then((r) => r.text()),
    fetch("data/creature_links.csv?v=1").then((r) => r.text()),
  ]).then(([rowsText, linksText]) => {
    const rows = parse(rowsText);
    const quad = new Map((typeof CREATURES_DATA !== "undefined" ? CREATURES_DATA : []).map((c) => [c.name, c]));
    const alike = new Map();
    parse(linksText).forEach((l) => {
      if (l.cross_culture !== "TRUE") return;
      [[l.creature_a, l.creature_b], [l.creature_b, l.creature_a]].forEach(([a, b]) => { if (!alike.has(a)) alike.set(a, []); alike.get(a).push(b); });
    });
    const data = rows.map((r) => {
      const q = quad.get(r.creature_name);
      return {
        name: r.creature_name, m: r.mythology,
        families: r.families.split(";").map((s) => s.trim()).filter(Boolean),
        primary: r.family_primary, heads: r.number_of_heads, tied: r.associated_deity_or_hero,
        job: jobOf(q), fame: q ? q.popularity : 0, alike: alike.get(r.creature_name) || [],
      };
    });
    build(data);
  }).catch((e) => console.warn("[gallery] could not read the data", e));

  function build(data) {
    let cult = "All", fam = "All", q = "";
    const byName = new Map(data.map((d) => [d.name, d]));

    // ---------- filters ----------
    const filters = el("div", "gal-filters");
    const rowC = el("div", "gal-chips"), rowF = el("div", "gal-chips");
    rowC.setAttribute("role", "group"); rowC.setAttribute("aria-label", "Culture");
    rowF.setAttribute("role", "group"); rowF.setAttribute("aria-label", "Family");
    const chip = (box, item, get, set) => {
      const b = el("button", "gal-chip");
      b.type = "button";
      if (item.icon) { const i = el("img"); i.src = item.icon; i.alt = ""; b.appendChild(i); }
      b.appendChild(el("span", null, item.label));
      b.addEventListener("click", () => { set(item.k); render(); });
      box.appendChild(b);
      return () => b.setAttribute("aria-pressed", String(get() === item.k));
    };
    const syncs = [];
    syncs.push(chip(rowC, { k: "All", label: "All cultures" }, () => cult, (v) => (cult = v)));
    CULTURES.forEach((c) => syncs.push(chip(rowC, { k: c, label: c, icon: "assets/bestiary/" + c.toLowerCase() + ".png" }, () => cult, (v) => (cult = v))));
    syncs.push(chip(rowF, { k: "All", label: "All families" }, () => fam, (v) => (fam = v)));
    FAMILIES.forEach((f) => syncs.push(chip(rowF, { k: f.k, label: f.label, icon: "assets/creature-cards/" + f.art + ".webp" }, () => fam, (v) => (fam = v))));
    const search = el("input", "gal-search");
    Object.assign(search, { type: "search", placeholder: "Search by name", autocomplete: "off" });
    search.setAttribute("aria-label", "Search the bestiary by name");
    search.addEventListener("input", () => { q = search.value.trim().toLowerCase(); render(); });
    const count = el("p", "gal-count");
    count.setAttribute("aria-live", "polite");
    filters.append(rowC, rowF, search, count);

    const grid = el("div", "gal-grid");
    const empty = el("p", "gal-empty", "No creature matches. Try another filter.");
    root.append(filters, grid, empty);

    // ---------- cards (made once, reused, so they can glide) ----------
    data.forEach((d) => {
      const c = el("button", "gal-card");
      c.type = "button";
      c.style.setProperty("--c", "var(--c-" + d.m.toLowerCase() + ")");
      const pic = el("span", "gal-pic" + (OWN_ART.has(slug(d.name)) ? " own" : ""));
      const img = el("img");
      img.alt = "";
      img.loading = "lazy";
      img.src = OWN_ART.has(slug(d.name)) ? "assets/bestiary/" + slug(d.name) + ".webp" : "assets/creature-cards/" + (ART_OF[d.primary] || "card-back") + ".webp";
      pic.appendChild(img);
      c.append(pic, el("span", "gal-name", short(d.name)), el("span", "gal-culture", d.m));
      c.setAttribute("aria-label", short(d.name) + ", " + d.m + ". Open details.");
      c.addEventListener("click", () => open(d));
      d.el = c;
    });

    function render() {
      syncs.forEach((s) => s());
      const yours = window.MonsterBestiary && MonsterBestiary.culture;
      const list = data.filter((d) => (cult === "All" || d.m === cult) && (fam === "All" || d.families.includes(fam)) && (!q || short(d.name).toLowerCase().includes(q)))
        .sort((a, b) => (b.m === yours) - (a.m === yours) || b.fame - a.fame || a.name.localeCompare(b.name));
      // FLIP: where each card is now (First), reorder (Last), then play from First to Last
      const first = new Map();
      data.forEach((d) => { if (d.el.isConnected) first.set(d, d.el.getBoundingClientRect()); });
      grid.replaceChildren(...list.map((d) => d.el));
      empty.hidden = list.length > 0;
      count.textContent = list.length + " of " + data.length + " creatures";
      if (reduced.matches) return;
      list.forEach((d, i) => {
        const a = first.get(d), b = d.el.getBoundingClientRect();
        d.el.getAnimations().forEach((x) => x.cancel());
        if (a) {
          const dx = a.left - b.left, dy = a.top - b.top;
          if (dx || dy) d.el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(.22,1,.36,1)" });
        } else {
          d.el.animate([{ opacity: 0, transform: "scale(.94)" }, { opacity: 1, transform: "none" }], { duration: 400, delay: Math.min(i, 24) * 12, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
        }
      });
    }

    // ---------- the panel ----------
    const scrim = el("div", "gal-scrim");
    const panel = el("aside", "gal-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "gal-panel-name");
    panel.tabIndex = -1;
    document.body.append(scrim, panel);
    let lastFocus = null;
    scrim.addEventListener("click", close);
    addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) close(); });

    function open(d) {
      lastFocus = document.activeElement;
      grid.querySelectorAll(".gal-card.is-open").forEach((x) => x.classList.remove("is-open"));
      d.el.classList.add("is-open");
      panel.style.setProperty("--c", "var(--c-" + d.m.toLowerCase() + ")");
      panel.replaceChildren();
      const shut = el("button", "gal-close", "×");
      shut.type = "button";
      shut.setAttribute("aria-label", "Close");
      shut.addEventListener("click", close);
      const pic = d.el.querySelector(".gal-pic").cloneNode(true);
      pic.querySelector("img").loading = "eager";
      const name = el("h3", "gal-panel-name", short(d.name));
      name.id = "gal-panel-name";
      const dl = el("dl", "gal-facts");
      const fact = (k, v) => { dl.append(el("dt", null, k)); const dd = el("dd"); typeof v === "string" ? (dd.textContent = v) : dd.append(v); dl.append(dd); };
      fact("Body", d.families.length ? d.families.map((f) => (FAMILIES.find((x) => x.k === f) || { label: f }).label).join(", ") : "Its own kind");
      fact("Heads", d.heads || "—");
      fact("Job", JOB[d.job] || "—");
      fact("Tied to", d.tied || "—");
      const bar = el("span", "gal-fame");
      bar.append(el("span", "gal-fame-track"), el("span", "gal-fame-n", d.fame + " / 10"));
      bar.firstChild.appendChild(el("span", "gal-fame-fill"));
      bar.firstChild.firstChild.style.width = d.fame * 10 + "%";
      fact("Fame", bar);
      const look = el("div", "gal-alike");
      if (d.alike.length) d.alike.forEach((n) => {
        const o = byName.get(n);
        const b = el("button", "gal-alike-btn", short(n));
        b.type = "button";
        if (o) b.style.setProperty("--c", "var(--c-" + o.m.toLowerCase() + ")");
        b.addEventListener("click", () => jump(o));
        look.appendChild(b);
      });
      else look.append("No double in another culture.");
      fact("Look-alikes", look);
      panel.append(shut, pic, name, el("p", "gal-panel-culture", d.m), dl);
      panel.classList.add("open");
      scrim.classList.add("open");
      panel.scrollTop = 0;
      panel.focus({ preventScroll: true });
    }
    function close() {
      panel.classList.remove("open");
      scrim.classList.remove("open");
      grid.querySelectorAll(".gal-card.is-open").forEach((x) => x.classList.remove("is-open"));
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    }
    // a look-alike: show its card (clearing filters that hide it), scroll to it, open it
    function jump(o) {
      if (!o) return;
      if (!o.el.isConnected) { cult = "All"; fam = "All"; q = ""; search.value = ""; render(); }
      o.el.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "center" });
      o.el.classList.add("is-flash");
      setTimeout(() => o.el.classList.remove("is-flash"), 1200);
      open(o);
    }

    render();
    if (window.MonsterBestiary) MonsterBestiary.onChange(() => render());
  }

  function parse(text) {
    const rows = []; let row = [], f = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.length > 1) rows.push(row); row = []; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    const head = rows.shift();
    return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] || ""])));
  }
})();
