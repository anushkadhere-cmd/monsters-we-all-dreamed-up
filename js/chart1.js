/* =========================================================
   Chart 1, "Every monster has a job".

   - The guess (demo §2, restyled as in Figma): "Which culture's monsters
     are most likely to protect you?" Four cream cards, as in the bestiary
     picker. The reader picks one; then the bars grow to each culture's
     share of protectors and the answer is marked.
   - SB5: the pinned chart starts blank; when it is centred on screen its
     axes draw in and the circles pop in (c1Reveal in charts/index.html).
   - The pinned quadrant plot (demo §3): the script's paragraph is one
     card; the next four (empty) steps each fade in one culture's pin
     on a transparent layer over the chart. Pins ring that culture's
     own dots and carry one label. Pointer events are off on the layer,
     so the chart's own hover still works underneath.

   Every number is counted from charts/creatures_data.js with the job
   rules in CLAUDE.md (nothing typed by hand):
     protector  helper >= 0.5 (antagonist < 0.5, or both >= 0.5)
     destroyer  antagonist >= 0.5 (helper < 0.5, or both >= 0.5)
     trickster or obstacle  everything else
   ========================================================= */
(() => {
  "use strict";
  if (typeof CREATURES_DATA === "undefined") return;

  const CULTURES = ["Greek", "Hindu", "Japanese", "Norse"];
  const isProtector = (c) => c.helper >= 0.5;                       // incl. both >= 0.5
  const isTrickster = (c) => c.helper < 0.5 && c.antagonist < 0.5;
  const of = (culture) => CREATURES_DATA.filter((c) => c.mythology === culture);

  // ---------- the guess ----------
  const box = document.getElementById("guess-protect");
  if (box) {
    const opts = CULTURES.map((k) => {
      const rows = of(k);
      return { k, v: Math.round((100 * rows.filter(isProtector).length) / rows.length) };
    });
    const max = Math.max(...opts.map((o) => o.v));
    const best = opts.find((o) => o.v === max);

    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };
    const q = el("p", "guess-q", "Which culture’s monsters are most likely to protect you?");
    q.id = "guess-protect-q";
    const list = el("div", "guess-opts");
    const out = el("p", "guess-out");
    out.setAttribute("aria-live", "polite");
    box.append(el("p", "guess-kicker", "Your guess"), q, list, out);

    opts.forEach((o) => {
      const b = el("button");
      b.type = "button";
      b.style.setProperty("--c", "var(--c-" + o.k.toLowerCase() + ")");
      b.style.setProperty("--w", (100 * o.v) / max + "%");
      const tag = el("span", "opt-tag");
      const icon = el("img", "opt-icon");                  // the bestiary picker's icon for this culture
      icon.src = "assets/bestiary/" + o.k.toLowerCase() + ".png";
      icon.alt = "";
      b.append(el("span", "bar"), icon, el("span", "opt-name", o.k), el("span", "opt-val", o.v + "%"), tag);
      if (o === best) b.classList.add("answer");
      b.addEventListener("click", () => {
        if (box.classList.contains("revealed")) return;
        box.classList.add("revealed");
        b.classList.add("picked");
        [...list.children].forEach((x) => x.setAttribute("aria-disabled", "true"));
        tag.textContent = o === best ? "Your guess · right" : "Your guess";
        if (o !== best) list.children[opts.indexOf(best)].querySelector(".opt-tag").textContent = "Answer";
        let text = (o === best ? "Right. " : "Not quite. ") + best.k + ": " + best.v + "% of its monsters are protectors.";
        const yours = window.MonsterBestiary && MonsterBestiary.culture;
        const mine = yours && yours !== best.k && opts.find((x) => x.k === yours);
        if (mine) text += " Yours, " + mine.k + ": " + mine.v + "%.";
        out.textContent = text;
      });
      list.appendChild(b);
    });
  }

  // ---------- the pinned chart and its pins ----------
  const sec = document.getElementById("chart1");
  if (!sec) return;
  const frame = sec.querySelector(".chart-frame");
  const iframe = frame.querySelector("iframe");
  const layer = frame.querySelector(".c1-pins");

  const PINS = [
    { k: "Hindu", test: isProtector, say: (n, t) => n + " of " + t + " protect" },
    { k: "Norse", test: isProtector, say: (n, t) => n + " of " + t + " protect" },
    { k: "Greek", test: isTrickster, say: (n, t) => n + " of " + t + " trickster or obstacle" },
    { k: "Japanese", test: isTrickster, say: (n, t) => n + " of " + t + " trickster or obstacle" },
  ].map((p) => {
    const rows = of(p.k);
    const members = rows.filter(p.test);
    return { ...p, names: new Set(members.map((c) => c.name)), label: p.say(members.length, rows.length) };
  });
  window.Chart1Pins = PINS.map((p) => ({ culture: p.k, label: p.label, creatures: [...p.names] }));  // for checking

  // keep the layer exactly on top of the scaled chart (js/article.js sizes the iframe)
  const follow = () => {
    ["left", "top", "width", "height", "transform"].forEach((k) => (layer.style[k] = iframe.style[k]));
  };
  new ResizeObserver(() => requestAnimationFrame(follow)).observe(frame);

  // build the pins from the chart's own dots, in its own coordinates
  const build = () => {
    const doc = iframe.contentDocument;
    const dots = doc && [...doc.querySelectorAll("circle.dot")];
    if (!dots || !dots.length) return false;
    const byName = new Map(dots.map((d) => [d.querySelector("title").textContent.split(" — ")[0], d]));
    const d0 = dots[0];
    const W = +frame.dataset.designW, H = +frame.dataset.designH;
    const NS = "http://www.w3.org/2000/svg";
    layer.textContent = "";
    PINS.forEach((p) => {
      const g = document.createElement("div");
      g.className = "c1-pin";
      g.dataset.pin = p.k;
      g.style.setProperty("--c", "var(--c-" + p.k.toLowerCase() + ")");
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      // rings never cross: a mask hides every ring inside any other ring's circle,
      // so only the outside edge of a group of rings is drawn
      const maskId = "c1-mask-" + p.k;
      const mask = document.createElementNS(NS, "mask");
      mask.setAttribute("id", maskId);
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      const all = document.createElementNS(NS, "rect");
      Object.entries({ x: 0, y: 0, width: W, height: H, fill: "#fff" }).forEach(([k, v]) => all.setAttribute(k, v));
      mask.appendChild(all);
      const defs = document.createElementNS(NS, "defs");
      defs.appendChild(mask);
      const rings = document.createElementNS(NS, "g");
      rings.setAttribute("mask", "url(#" + maskId + ")");
      svg.append(defs, rings);
      let minY = Infinity, sx = 0, n = 0;
      // from the circles' own geometry (they may still be hidden, scaled to 0, before the reveal);
      // the iframe is unscrolled and the plot is drawn 1:1, so client px = design px
      const plot = d0.ownerSVGElement.getBoundingClientRect();
      p.names.forEach((name) => {
        const d = byName.get(name);
        if (!d) return;
        const rr = +d.getAttribute("r");
        const cx = plot.left + +d.getAttribute("cx"), cy = plot.top + +d.getAttribute("cy");
        const r = { top: cy - rr };
        const ring = document.createElementNS(NS, "circle");
        ring.setAttribute("cx", cx);
        ring.setAttribute("cy", cy);
        ring.setAttribute("r", rr + 5);
        ring.setAttribute("class", "c1-ring");
        rings.appendChild(ring);
        const hole = document.createElementNS(NS, "circle");
        Object.entries({ cx, cy, r: rr + 5, fill: "#000" }).forEach(([k, v]) => hole.setAttribute(k, v));
        mask.appendChild(hole);
        minY = Math.min(minY, r.top);
        sx += cx;
        n++;
      });
      const call = document.createElement("span");
      call.className = "c1-call";
      call.textContent = p.label;
      // label above the group, centred on it, kept inside the chart
      call.style.left = Math.min(Math.max((sx / n / W) * 100, 14), 86) + "%";
      call.style.top = Math.max(((minY - 14) / H) * 100, 4) + "%";
      g.append(svg, call);
      layer.appendChild(g);
    });
    follow();
    return true;
  };
  const tryBuild = () => { if (!build()) setTimeout(tryBuild, 200); };
  iframe.addEventListener("load", () => { tryBuild(); shown = null; reveal(); });
  tryBuild();

  // SB5: the chart waits on a blank screen; once it is pinned (centred on screen)
  // its axes draw in and the circles pop in. Scrolling back above blanks it again.
  const sticky = sec.querySelector(".sticky");
  let shown = null;
  function reveal() {
    const on = sticky.getBoundingClientRect().top <= 2;
    if (on === shown) return;
    const w = iframe.contentWindow;
    if (!w || !w.c1Reveal) return;
    shown = on;
    w.c1Reveal(on);
  }
  let queued = false;
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; reveal(); }); } }, { passive: true });

  // the step crossing the middle of the screen picks the pin (none on the paragraph)
  const steps = [...sec.querySelectorAll(".step[data-pin]")];
  const setPin = (k) => { layer.dataset.pin = k; };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) setPin(e.target.dataset.pin);
      else if (e.target === steps[0] && e.boundingClientRect.top > 0) setPin("");      // back above
      else if (e.target === steps[steps.length - 1] && e.boundingClientRect.top < 0) setPin("");  // past the end
    });
  }, { rootMargin: "-50% 0px -50% 0px" });
  steps.forEach((s) => io.observe(s));
})();
