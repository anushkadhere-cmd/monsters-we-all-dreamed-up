/* =========================================================
   Chart 2, "Same beast, different lore".

   - The guess (demo §2, restyled as in Figma: four portrait cards, a name
     field and a "Lock it in" button): "Which creature has the most look-alikes?"
     Four choices, or name any creature. Look-alikes = rows in
     data/creature_links.csv (all 109, the count the script uses:
     "each tied to ten others"). The reader's pick is locked in and
     only revealed when "Then comes the surprise" reaches the middle of
     the screen. Medusa, Lamia and the yakshini (10 each) all count as right.
   - SB6: the dots wait clustered in the centre until the chart comes up
     into view, then burst outward and the links draw in ("intro"); the
     whole graph stays on screen for a while before the serpent zoom.
     The free-explore screen centres the graph in the whole view.
   - The pinned network: each step's data-state is passed to the chart
     (netState in charts/graph2_network.html), which draws the visual
     state. States are complete in themselves, so scrolling back up
     plays them in reverse.
   ========================================================= */
(() => {
  "use strict";
  const sec = document.getElementById("chart2");
  if (!sec) return;

  // ---------- the chart's state follows the step in the middle of the screen ----------
  const iframe = sec.querySelector("iframe");
  const steps = [...sec.querySelectorAll(".step[data-state]")];
  let current = "hidden";
  const send = () => {
    const w = iframe.contentWindow;
    if (w && w.netState) w.netState(current);
  };
  iframe.addEventListener("load", () => {
    const w = iframe.contentWindow;
    if (w.netReady) send(); else w.addEventListener("netready", send);
  });
  const sticky = sec.querySelector(".sticky");
  const frame = sec.querySelector(".chart-frame");
  // the burst starts as the chart comes up into view (its top above 45% of the screen), not only once pinned
  const pinned = () => sticky.getBoundingClientRect().top <= innerHeight * 0.45;
  const setState = (s) => {
    if (s === "intro" && !pinned()) s = "hidden";        // SB6: the dots wait, clustered, until the chart is centred
    if (s === current) return;
    current = s;
    send();
    // the final, free-explore screen: the graph centred in the whole view (no room kept for the cards)
    frame.dataset.centred = s === "explore" ? "1" : "";
    if (window.updateChartInset) updateChartInset();
    if (s === "women1" || s === "women2" || s === "loners" || s === "explore") revealGuess();
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) setState(e.target.dataset.state);
      else if (steps[0].getBoundingClientRect().top > innerHeight / 2) setState("hidden");   // back above the chart (even after a fast jump)
    });
  }, { rootMargin: "-50% 0px -50% 0px" });
  steps.forEach((s) => io.observe(s));
  // the first step is already in the middle as the chart arrives: explode once it pins
  const check = () => {
    const first = steps[0].getBoundingClientRect();
    const inFirst = first.bottom >= innerHeight / 2;             // not yet past the first (empty) step
    if (current === "hidden" && inFirst && pinned()) setState("intro");
    else if (current === "intro" && !pinned()) setState("hidden");
  };
  addEventListener("scroll", check, { passive: true });          // two rect reads per scroll: cheap enough to run directly

  // ---------- the guess ----------
  const box = document.getElementById("guess-lookalike");
  let revealGuess = () => {};
  if (!box) return;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const CHOICES = ["Medusa", "Cerberus", "Garuda", "Jörmungandr"];   // Figma's order
  // each card's portrait, placed as in Figma (percent of the 233 × 152 card; the card clips it)
  const ART = {
    "Medusa": { src: "assets/lethal-women/woman-medusa.webp", l: 2.41, t: -16.64, w: 126.0, h: 157.55 },
    "Cerberus": { src: "assets/cover/cerberus.webp", l: 1.53, t: 1.6, w: 80.62, h: 179.48, r: 1.51, label: 56.5 },
    "Garuda": { src: "assets/cover/garuda.webp", l: 18.26, t: 0, w: 88.82, h: 176.38 },
    "Jörmungandr": { src: "assets/guess/jormungandr.webp", l: -15.78, t: -0.19, w: 121.41, h: 124.56, r: 18.3, label: 13.1 },
  };
  const short = (n) => n.replace(/ \(.*\)$/, "");

  fetch("data/creature_links.csv?v=1").then((r) => r.text()).then((text) => {
    // count every link a creature is part of
    const count = new Map();
    text.trim().split(/\r?\n/).slice(1).forEach((line) => {
      const [a, , b] = line.split(",");
      count.set(a, (count.get(a) || 0) + 1);
      count.set(b, (count.get(b) || 0) + 1);
    });
    const names = (typeof CREATURES_DATA !== "undefined" ? CREATURES_DATA.map((c) => c.name) : [...count.keys()]).sort((a, b) => a.localeCompare(b));
    const n = (name) => count.get(name) || 0;
    const max = Math.max(...count.values());
    const winners = names.filter((x) => n(x) === max).sort((a, b) => (b === "Medusa") - (a === "Medusa"));   // Medusa, Lamia, Yakshini (the script's order)
    const winText = winners.map((w, i) => (w === "Yakshini" && i ? "the yakshini" : short(w)));
    const tie = winText.slice(0, -1).join(", ") + " and " + winText[winText.length - 1];

    const q = el("p", "guess-q", "Which creature has the most look-alikes?");
    q.id = "guess-lookalike-q";
    const list = el("div", "guess-opts");
    const other = el("form", "guess-other");
    const lab = el("label", null, "Or name another creature");
    lab.htmlFor = "guess-lookalike-name";
    const input = el("input");
    Object.assign(input, { id: "guess-lookalike-name", type: "text", autocomplete: "off", spellcheck: false });
    input.setAttribute("list", "guess-lookalike-names");
    const dl = el("datalist");
    dl.id = "guess-lookalike-names";
    names.forEach((x) => dl.appendChild(Object.assign(document.createElement("option"), { value: x })));
    const go = el("button", null, "Lock it in");
    go.type = "submit";
    other.append(lab, el("span", "guess-other-row"), dl);
    other.lastChild.previousSibling.append(input, go);
    const out = el("p", "guess-out");
    out.setAttribute("aria-live", "polite");
    box.append(el("p", "guess-kicker", "Your guess"), q, list, other, out);

    const opts = CHOICES.map((k) => {
      const c = (typeof CREATURES_DATA !== "undefined" && CREATURES_DATA.find((x) => x.name === k)) || {};
      const b = el("button");
      b.type = "button";
      b.style.setProperty("--c", "var(--c-" + String(c.mythology || "greek").toLowerCase() + ")");
      b.style.setProperty("--w", (100 * n(k)) / max + "%");
      const tag = el("span", "opt-tag");
      b.dataset.k = k;
      const a = ART[k];
      const art = el("img", "opt-art");
      Object.assign(art, { src: a.src, alt: "" });
      Object.assign(art.style, { left: a.l + "%", top: a.t + "%", width: a.w + "%", height: a.h + "%", transform: a.r ? `rotate(${a.r}deg)` : "" });
      const nameEl = el("span", "opt-name", short(k));
      if (a.label) nameEl.style.left = a.label + "%";
      b.append(art, el("span", "bar"), nameEl, el("span", "opt-val", String(n(k))), tag);
      if (n(k) === max) b.classList.add("answer");
      b.addEventListener("click", () => pick(k, b));
      list.appendChild(b);
      return { k, b, tag };
    });

    let picked = null;
    function pick(name, button) {
      if (picked || box.classList.contains("revealed")) return;
      picked = name;
      [...list.children].forEach((x) => x.setAttribute("aria-disabled", "true"));
      input.disabled = go.disabled = true;
      if (button) { button.classList.add("picked"); button.querySelector(".opt-tag").textContent = "Your guess"; }
      else input.value = name;
      box.classList.add("locked");
      out.textContent = "Locked in. Keep reading: the chart answers it.";
    }
    other.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value.trim().toLowerCase();
      const name = names.find((x) => x.toLowerCase() === v) || names.find((x) => short(x).toLowerCase() === v) ||
                   names.find((x) => x.toLowerCase().startsWith(v));
      if (!v || !name) { out.textContent = "That one isn't in the bestiary. Try another name."; return; }
      pick(name, opts.find((o) => o.k === name)?.b);
    });

    revealGuess = () => {
      if (box.classList.contains("revealed")) return;
      box.classList.add("revealed");
      [...list.children].forEach((x) => x.setAttribute("aria-disabled", "true"));
      input.disabled = go.disabled = true;
      opts.forEach((o) => { if (n(o.k) === max && o.k !== picked) o.tag.textContent = "Answer"; });
      const right = picked && n(picked) === max;
      if (right) {
        const o = opts.find((x) => x.k === picked);
        if (o) o.tag.textContent = "Your guess · right";
      }
      out.textContent = !picked
        ? tie + " each have " + max + "."
        : right
          ? "Right. " + short(picked) + " has " + max + ", tied with " + winText.filter((w) => w !== short(picked)).join(" and ") + "."
          : "Not quite. " + short(picked) + " has " + n(picked) + ". " + tie + " have " + max + " each.";
    };
    if (current === "women1" || current === "women2" || current === "loners" || current === "explore") revealGuess();
  });
})();
