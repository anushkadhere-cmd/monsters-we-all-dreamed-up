/* =========================================================
   Article scroll steps. Each pinned placeholder shows the name of
   the step whose card is in the middle of the screen (the script's
   [... STEP: ...] notes), so the chart states can be built in later.
   ========================================================= */
(() => {
  "use strict";

  document.querySelectorAll("[data-scrolly]").forEach((scrolly) => {
    const label = scrolly.querySelector(".ph-step");
    const steps = [...scrolly.querySelectorAll(".step")];
    if (!label || !steps.length) return;

    const activate = (step) => {
      label.textContent = step.dataset.step || "";
      steps.forEach((s) => s.classList.toggle("is-active", s === step));
    };

    // a step counts as current when it crosses the middle of the screen
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) activate(e.target); }),
      { rootMargin: "-45% 0px -54% 0px" }
    );
    steps.forEach((s) => io.observe(s));
  });

  // Only one chart may ever be visible: a chart frame that isn't on screen is hidden
  const frames = document.querySelectorAll("[data-chart]");
  const seen = new IntersectionObserver((entries) =>
    entries.forEach((e) => e.target.classList.toggle("is-offscreen", !e.isIntersecting))
  );
  frames.forEach((f) => seen.observe(f));

  // A chart with a design size (data-design-w/h) is drawn at that size and scaled
  // as a whole to fit its box (never above full size), so nothing is cropped.
  // A chart without one (the network) simply fills its box at real size.
  const fit = (frame) => {
    const iframe = frame.querySelector("iframe");
    const w = +frame.dataset.designW, h = +frame.dataset.designH;
    if (!iframe || !w || !h) return;
    const bw = frame.clientWidth, bh = frame.clientHeight;
    const s = Math.min(1, bw / w, bh / h);
    Object.assign(iframe.style, {
      width: w + "px",
      height: h + "px",
      transform: "scale(" + s + ")",
      left: (bw - w * s) / 2 + "px",
      top: (bh - h * s) / 2 + "px",
    });
  };
  const sizer = new ResizeObserver((entries) => entries.forEach((e) => fit(e.target)));
  frames.forEach((f) => { fit(f); sizer.observe(f); });

  // The network lies under the whole screen on desktop. Tell it where the card
  // column ends, so its note, legend and starting view stay clear of the cards.
  const desktop = matchMedia("(min-width: 761px)");
  const inset = (frame) => {
    const doc = frame.querySelector("iframe").contentDocument;
    if (!doc || !doc.documentElement) return;
    let px = 0;
    const card = frame.closest(".scrolly")?.querySelector(".card");
    if (desktop.matches && card && frame.dataset.centred !== "1") {   // centred: the graph uses the whole view
      const gap = parseFloat(getComputedStyle(frame.closest(".article")).getPropertyValue("--cards-gap")) *
                  parseFloat(getComputedStyle(document.documentElement).fontSize) || 48;
      px = Math.max(0, card.getBoundingClientRect().right + gap - frame.getBoundingClientRect().left);
    }
    doc.documentElement.style.setProperty("--inset-left", px + "px");
  };
  window.updateChartInset = () => document.querySelectorAll(".chart-frame.is-bleed").forEach(inset);
  document.querySelectorAll(".chart-frame.is-bleed").forEach((frame) => {
    const iframe = frame.querySelector("iframe");
    iframe.addEventListener("load", () => inset(frame));
    new ResizeObserver(() => inset(frame)).observe(frame);
    inset(frame);
  });
})();

/* =========================================================
   Motion helpers, shared by every scroll interaction.

     Motion.ease(t)            the article's easing (--ease in css/cover.css) for t in 0..1
     Motion.reduced            true when the reader asked for reduced motion
     Motion.track(els, fn)     calls fn(progress[]) whenever the page scrolls or resizes.
                               progress[i] runs 0 -> 1 while els[i] passes the reading
                               line (55% down the screen); below 0 before, above 1 after.
                               Use it to *scrub* movement with the scroll.
     Motion.enter(el, e, opts) styles el for an entrance amount e (0 hidden, 1 shown):
                               fade + slide (24px) + scale (0.96 -> 1); reduced motion: fade only.
   ========================================================= */
(() => {
  "use strict";
  const root = getComputedStyle(document.documentElement);
  const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");

  // cubic-bezier easing read from the --ease token, solved numerically
  const nums = (root.getPropertyValue("--ease").match(/-?[\d.]+/g) || [0.22, 1, 0.36, 1]).map(Number);
  const [x1, y1, x2, y2] = nums.length === 4 ? nums : [0.22, 1, 0.36, 1];
  const bez = (a, b, t) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
  function ease(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0, hi = 1, s = t;
    for (let i = 0; i < 24; i++) {          // find s with bezier-x(s) = t
      s = (lo + hi) / 2;
      if (bez(x1, x2, s) < t) lo = s; else hi = s;
    }
    return bez(y1, y2, s);
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  function track(els, fn, { line = 0.55 } = {}) {
    let pending = false;
    const run = () => {
      pending = false;
      const y = innerHeight * line;
      fn(els.map((el) => {
        const r = el.getBoundingClientRect();
        return (y - r.top) / Math.max(1, r.height);
      }));
    };
    const ask = () => { if (!pending) { pending = true; requestAnimationFrame(run); } };
    addEventListener("scroll", ask, { passive: true });
    addEventListener("resize", ask);
    run();
    return ask;
  }

  // entrance amount e (0..1) -> opacity, slide and scale. dx/dy give the slide direction.
  function enter(el, e, { dx = 0, dy = 1, x = 0, y = 0, scale = 1 } = {}) {
    const shift = parseFloat(root.getPropertyValue("--enter-shift")) || 24;
    const s0 = parseFloat(root.getPropertyValue("--enter-scale")) || 0.96;
    el.style.opacity = String(clamp01(e));
    el.style.visibility = e <= 0.001 ? "hidden" : "visible";
    if (reducedQuery.matches) {
      el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      return;
    }
    const k = 1 - clamp01(e);
    el.style.transform =
      `translate(${x + dx * shift * k}px, ${y + dy * shift * k}px) scale(${scale * (s0 + (1 - s0) * clamp01(e))})`;
  }

  window.Motion = {
    ease, track, enter, clamp01,
    get reduced() { return reducedQuery.matches; },
    // amount of a window [start, start+len] reached at t, eased
    win: (t, start, len) => ease(clamp01((t - start) / len)),
  };
})();

/* =========================================================
   The parchment moves with the story, not with the scrollbar.
   The paper sheet (#paper, css/cover.css) slides up by the distance the
   page's content has actually moved: scrolling through a pinned scene
   (a sticky stage or chart) doesn't count, so while the visuals stand
   still the paper stands still too.
   ========================================================= */
(() => {
  "use strict";
  const sheet = document.querySelector("#paper > div");
  if (!sheet) return;
  let stickies = [];
  // the sheet only has to be tall enough; the pinned stretches are read fresh on every scroll
  const measure = () => {
    stickies = [...document.querySelectorAll(".op-stage, .bd-stage, .scrolly > .sticky")];
    sheet.style.height = document.documentElement.scrollHeight + innerHeight + "px";
    move();
  };
  // every pinned stretch: from when its sticky part reaches the top to when it lets go;
  // scrolling inside one doesn't move the paper
  const move = () => {
    const y = scrollY;
    let held = 0;
    for (const st of stickies) {
      const box = st.parentElement;
      const len = box.offsetHeight - st.offsetHeight;
      if (len <= 0) continue;
      const start = box.getBoundingClientRect().top + y;
      held += Math.min(Math.max(y - start, 0), len);
    }
    sheet.style.transform = `translate3d(0, ${-(y - held)}px, 0)`;
  };
  addEventListener("scroll", move, { passive: true });
  addEventListener("resize", measure);
  let queued = false;
  const later = () => { if (!queued) { queued = true; setTimeout(() => { queued = false; measure(); }, 60); } };
  new ResizeObserver(later).observe(document.body);
  addEventListener("load", measure);
  if (document.fonts) document.fonts.ready.then(measure);
  measure();
})();
