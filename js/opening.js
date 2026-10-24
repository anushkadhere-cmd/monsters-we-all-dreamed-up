/* =========================================================
   Opening: sets the step; the CSS in css/article.css does the motion.

   - An IntersectionObserver puts data-step="1"…"6" on #opening and its
     .stage when a paragraph crosses the middle of the screen (0 before the
     first one). Every state transitions with the article's easing, so
     scrolling back up plays them in reverse.
   - During paragraph 4 the scroll progress (Motion.track) sets data-sil
     to 1, 2, 3 at 0%, 33% and 66%: the silhouettes enter one by one.
   - Entering paragraph 5, "travel" and "imagine" start where their words
     sit in the text and fly to their place on the stage.
   ========================================================= */
(() => {
  "use strict";
  const sec = document.getElementById("opening");
  if (!sec) return;
  const stage = sec.querySelector(".stage");
  const steps = [...sec.querySelectorAll(".step")];
  const labels = [...stage.querySelectorAll(".op-label")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  let current = 0;
  const setStep = (n) => {
    if (n === current) return;
    const prev = current;
    current = n;
    sec.dataset.step = stage.dataset.step = String(n);
    if (n === 5 && prev !== 5) flyLabels();
  };

  // the paragraph crossing the middle of the screen is the current step
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const n = +e.target.dataset.step;
      if (e.isIntersecting) setStep(n);
      else if (n === 1 && e.boundingClientRect.top > 0) setStep(0);   // scrolled back above the opening
    });
  }, { rootMargin: "-50% 0px -50% 0px" });
  steps.forEach((s) => io.observe(s));

  // paragraph 4: silhouettes at 0 / 33 / 66% of the way through
  if (window.Motion) {
    Motion.track([steps[3]], ([p]) => {
      stage.dataset.sil = String(p < 0 ? 0 : p < 1 / 3 ? 1 : p < 2 / 3 ? 2 : 3);
    }, { line: 0.5 });
  }

  // "travel" and "imagine": start on top of the underlined word, then let the
  // CSS transition carry each one to its place on the stage
  function flyLabels() {
    if (reduced.matches) return;
    labels.forEach((label) => {
      const word = sec.querySelector(`.mark[data-word="${label.dataset.word}"]`);
      if (!word) return;
      label.style.transition = "none";
      label.style.transform = "none";
      label.style.opacity = "1";
      const to = label.getBoundingClientRect();
      const from = word.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      const s = Math.max(0.2, from.height / to.height);
      label.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
      void label.offsetWidth;            // apply the start position before animating
      label.style.transition = "";
      label.style.transform = "";        // the step-5 rule takes over: fly home
      label.style.opacity = "";
    });
  }
})();
