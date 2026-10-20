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
    if (desktop.matches && card) {
      const gap = parseFloat(getComputedStyle(frame.closest(".article")).getPropertyValue("--cards-gap")) *
                  parseFloat(getComputedStyle(document.documentElement).fontSize) || 48;
      px = Math.max(0, card.getBoundingClientRect().right + gap - frame.getBoundingClientRect().left);
    }
    doc.documentElement.style.setProperty("--inset-left", px + "px");
  };
  document.querySelectorAll(".chart-frame.is-bleed").forEach((frame) => {
    const iframe = frame.querySelector("iframe");
    iframe.addEventListener("load", () => inset(frame));
    new ResizeObserver(() => inset(frame)).observe(frame);
    inset(frame);
  });
})();
