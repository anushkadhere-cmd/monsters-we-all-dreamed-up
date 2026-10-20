/* =========================================================
   "Which bestiary did you grow up with?"
   The reader's tradition, in one shared variable that later
   interactions read:

     MonsterBestiary.culture            "Greek" | "Hindu" | "Japanese" | "Norse" | null
     MonsterBestiary.set(culture|null)  change it (null = "Just curious")
     MonsterBestiary.onChange(fn)       fn(culture) runs now and on every change

   It is remembered in the browser (localStorage) so it survives a
   refresh. It never changes the script's text or the charts.
   ========================================================= */
(() => {
  "use strict";

  const CULTURES = ["Greek", "Hindu", "Japanese", "Norse"];
  const KEY = "monsters-bestiary";
  const listeners = [];

  let culture = null;
  try {
    const saved = localStorage.getItem(KEY);
    if (CULTURES.includes(saved)) culture = saved;
  } catch (e) { /* storage blocked: the choice just won't be remembered */ }

  const MonsterBestiary = {
    cultures: CULTURES.slice(),
    get culture() { return culture; },
    set(next) {
      culture = CULTURES.includes(next) ? next : null;
      try { culture ? localStorage.setItem(KEY, culture) : localStorage.removeItem(KEY); } catch (e) {}
      listeners.forEach((fn) => fn(culture));
      document.dispatchEvent(new CustomEvent("bestiarychange", { detail: { culture } }));
    },
    onChange(fn) { listeners.push(fn); fn(culture); },
  };
  window.MonsterBestiary = MonsterBestiary;

  // ---------- the question ----------
  const box = document.getElementById("pick-buttons");
  if (box) {
    [...CULTURES, null].forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pick-button";
      if (c) {
        b.dataset.culture = c;
        b.style.setProperty("--c", "var(--c-" + c.toLowerCase() + ")");
        b.innerHTML = '<span class="pick-dot" aria-hidden="true"></span>';
      }
      b.append(c || "Just curious");
      b.addEventListener("click", () => MonsterBestiary.set(c));
      box.appendChild(b);
    });
  }

  // ---------- the corner tag ----------
  const tag = document.getElementById("bestiary-tag");
  const tagName = document.getElementById("bestiary-tag-name");
  const change = document.getElementById("bestiary-tag-change");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  if (change) {
    change.addEventListener("click", () => {
      const q = document.getElementById("pick");
      q.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" });
      // if a smooth scroll gets interrupted (or the browser skips it), jump there
      setTimeout(() => {
        const r = q.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) q.scrollIntoView({ block: "center" });
      }, 1200);
      const pressed = q.querySelector('[aria-pressed="true"]') || q.querySelector(".pick-button");
      pressed?.focus({ preventScroll: true });
    });
  }

  MonsterBestiary.onChange((c) => {
    if (box) {
      [...box.children].forEach((b) => b.setAttribute("aria-pressed", String(!!c && b.dataset.culture === c)));
    }
    if (tag) {
      tag.hidden = !c;
      if (c) {
        tagName.textContent = c;
        tag.style.setProperty("--c", "var(--c-" + c.toLowerCase() + ")");
      }
    }
  });
})();
