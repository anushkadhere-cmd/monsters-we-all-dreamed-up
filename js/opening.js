/* =========================================================
   Opening, after the Figma storyboards SB1 Serpents and SB2 Silhouettes.
   The CSS in css/article.css (under "Opening") does the look; this file:

   - sets data-step on each pinned stage from how far it has been scrolled
     (SB1: 1–3, one per paragraph; SB2: 1–3 one per creature, 4 the question);
   - types each paragraph in, letter by letter, when its step starts, and
     draws the underline under a key word once it is typed. The full text is
     in the page all along, so screen readers and search see it unchanged;
   - slides each SB2 text box in from the right with the scroll (scrubbed,
     so scrolling back slides it out again);
   - when the question has typed in, "Travel" and "Imagine" float out of the
     underlined words to the sides and stay there.
   Reduced motion: paragraphs appear whole, boxes fade in place, labels fade.
   ========================================================= */
(() => {
  "use strict";
  const sec = document.getElementById("opening");
  if (!sec) return;
  const serp = sec.querySelector(".op-serp");
  const sils = sec.querySelector(".op-sils");
  const serpTexts = [...serp.querySelectorAll(".op-type")];
  const which = sils.querySelector(".op-which");
  const boxes = [...sils.querySelectorAll(".op-box")];
  const labels = [...sils.querySelectorAll(".op-label")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const clamp01 = (t) => Math.max(0, Math.min(1, t));

  /* ---------- typewriter ---------- */
  // wrap every letter in a span; spaces stay where they are, so lines wrap
  // exactly as they will when fully typed and nothing jumps
  function prep(p) {
    const chars = [];
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          // each word in a no-wrap span: lines only break at spaces, never at a
          // hyphen ("head-on" stays whole, as in Figma)
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            const word = /\s/.test(tok) ? frag : frag.appendChild(Object.assign(document.createElement("span"), { className: "w" }));
            for (const c of tok) {
              const s = document.createElement("span");
              s.className = "ch";
              s.textContent = c;
              word.appendChild(s);
              chars.push(s);
            }
          });
          n.replaceWith(frag);
        } else walk(n);
      });
    };
    walk(p);
    p._chars = chars;
    p._kws = [...p.querySelectorAll(".kw")].map((el) => ({ el, last: [...el.querySelectorAll(".ch")].pop() }));
  }
  [...serpTexts, which].forEach(prep);

  function type(p, done) {
    if (p._on) return;
    p._on = true;
    clearTimeout(p._reset);
    p.classList.add("is-on");
    const n = p._chars.length;
    if (reduced.matches) {
      p._chars.forEach((c) => c.classList.add("v"));
      p._kws.forEach((k) => k.el.classList.add("on"));
      if (done) p._done = setTimeout(done, 300);
      return;
    }
    const dur = Math.min(2600, Math.max(1200, n * 12));
    const t0 = performance.now();
    let shown = 0;
    const tick = (t) => {
      const k = Math.min(n, Math.ceil(((t - t0) / dur) * n));
      for (; shown < k; shown++) p._chars[shown].classList.add("v");
      p._kws.forEach((kw) => { if (kw.last.classList.contains("v")) kw.el.classList.add("on"); });
      if (shown < n) p._raf = requestAnimationFrame(tick);
      else { p._raf = 0; if (done) p._done = setTimeout(done, 650); }   // after the last underline has drawn
    };
    p._raf = requestAnimationFrame(tick);
  }
  function untype(p) {
    if (!p._on) return;
    p._on = false;
    cancelAnimationFrame(p._raf);
    clearTimeout(p._done);
    p.classList.remove("is-on");                    // fade the paragraph out…
    p._reset = setTimeout(() => {                   // …then clear it for the next time
      p._chars.forEach((c) => c.classList.remove("v"));
      p._kws.forEach((k) => k.el.classList.remove("on"));
    }, 420);
  }

  /* ---------- "Travel" and "Imagine" float out of the text ---------- */
  function flyLabels() {
    labels.forEach((label) => {
      const word = which.querySelector(`.kw[data-word="${label.dataset.word}"]`);
      if (!reduced.matches && word) {
        label.style.transition = "none";
        label.style.transform = "none";
        const to = label.getBoundingClientRect();
        const from = word.getBoundingClientRect();
        const dx = from.left + from.width / 2 - (to.left + to.width / 2);
        const dy = from.top + from.height / 2 - (to.top + to.height / 2);
        const s = Math.max(0.2, from.height / to.height);
        label.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
        void label.offsetWidth;                     // apply the start before animating
        label.style.transition = "";
        label.style.transform = "";
      }
      label.classList.add("flown");
    });
  }
  const dropLabels = () => labels.forEach((l) => l.classList.remove("flown"));

  /* ---------- steps from the scroll position ---------- */
  let serpStep = -1, silStep = -1;
  function setSerp(n) {
    if (n === serpStep) return;
    serpStep = n;
    serp.dataset.step = String(n);
    serpTexts.forEach((p, i) => (i + 1 === n ? type(p) : untype(p)));
  }
  function setSils(n) {
    if (n === silStep) return;
    silStep = n;
    sils.dataset.step = String(n);
    if (n === 4) type(which, flyLabels);
    else { untype(which); dropLabels(); }
  }
  // where a pinned stage is: p runs 0 → 1 while it is pinned
  function place(pin) {
    const r = pin.getBoundingClientRect();
    const vh = innerHeight;
    return { top: r.top, p: -r.top / Math.max(1, r.height - vh) };
  }

  const BOX_AT = [0.1, 0.32, 0.54];                 // SB2: where each box starts sliding in
  const BOX_LEN = 0.14;

  function update() {
    const vh = innerHeight;
    const a = place(serp);
    setSerp(a.top > vh * 0.3 ? 0 : a.p < 1 / 3 ? 1 : a.p < 2 / 3 ? 2 : 3);

    const b = place(sils);
    const p = b.top > 0 ? -1 : b.p;
    setSils(p < BOX_AT[0] ? 0 : p < BOX_AT[1] ? 1 : p < BOX_AT[2] ? 2 : p < 0.76 ? 3 : 4);

    // boxes: from just off the right edge of the screen to their place, scrubbed
    const artLeft = sils.querySelector(".op-art").getBoundingClientRect().left;
    boxes.forEach((box, i) => {
      const t = clamp01((p - BOX_AT[i]) / BOX_LEN);
      const e = ease(t);
      const from = innerWidth + 20 - (artLeft + box.offsetLeft);
      box.style.setProperty("--bx", reduced.matches ? "0px" : `${((1 - e) * from).toFixed(1)}px`);
      box.style.setProperty("--bo", reduced.matches ? (t > 0 ? 1 : 0) : Math.min(1, e * 1.4).toFixed(3));
    });
  }

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  update();
})();
