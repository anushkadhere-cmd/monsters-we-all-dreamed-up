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
})();
