/* =========================================================
   Chart 3, "Who shares, and who stands alone".

   - The guess: "Which two traditions share the most monsters?" Six pair
     tiles (two culture icons each, from the bestiary picker); the reader
     picks one and locks it in. Then six bars grow to each pair's number
     of parallels, counted the way the chord diagram counts them: one per
     cross-tradition row of data/creature_links.csv (Greek–Hindu 25 …
     Japanese–Norse 9). The reader's pick is ringed; the top pair is
     highlighted.
   - The pinned chord: each text card drives one chart state (see
     charts/chord.html): intro, pairs (Greek–Hindu, then Japanese–Norse
     halfway through the card), originals, living, then free explore.
   ========================================================= */
(() => {
  "use strict";
  const CULTURES = ["Greek", "Hindu", "Japanese", "Norse"];
  const PAIRS = [];
  CULTURES.forEach((a, i) => CULTURES.slice(i + 1).forEach((b) => PAIRS.push([a, b])));
  const key = (a, b) => [a, b].sort().join("|");
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // ---------- the guess ----------
  const box = document.getElementById("guess-pair");
  if (box) {
    fetch("data/creature_links.csv?v=1").then((r) => r.text()).then((text) => {
      const count = new Map();
      text.trim().split(/\r?\n/).slice(1).forEach((line) => {
        const [, ma, , mb] = line.split(",");
        if (ma && mb && ma !== mb) count.set(key(ma, mb), (count.get(key(ma, mb)) || 0) + 1);
      });
      const n = ([a, b]) => count.get(key(a, b)) || 0;
      const max = Math.max(...PAIRS.map(n));

      const q = el("p", "guess-q", "Which two traditions share the most monsters?");
      q.id = "guess-pair-q";
      const list = el("div", "guess-opts");
      list.setAttribute("role", "group");
      list.setAttribute("aria-labelledby", q.id);
      const go = el("button", "guess-lock", "Lock it in");
      go.type = "button";
      go.disabled = true;
      const bars = el("div", "pair-bars");
      const out = el("p", "guess-out");
      out.setAttribute("aria-live", "polite");
      box.append(q, list, go, bars, out);

      let chosen = null;
      const rows = PAIRS.map((p) => {
        const [a, b] = p;
        const label = a + "–" + b;
        const t = el("button");
        t.type = "button";
        t.setAttribute("aria-pressed", "false");
        t.setAttribute("aria-label", label);
        const icons = el("span", "pair-icons");
        [a, b].forEach((c) => {
          const img = el("img", "opt-icon");
          img.src = "assets/bestiary/" + c.toLowerCase() + ".png";
          img.alt = "";
          icons.appendChild(img);
        });
        t.append(icons, el("span", "opt-name", a + " · " + b));
        t.addEventListener("click", () => {
          if (box.classList.contains("revealed")) return;
          chosen = p;
          [...list.children].forEach((x) => x.setAttribute("aria-pressed", String(x === t)));
          go.disabled = false;
        });
        list.appendChild(t);

        const row = el("div", "pair-bar");
        row.style.setProperty("--a", "var(--c-" + a.toLowerCase() + ")");
        row.style.setProperty("--b", "var(--c-" + b.toLowerCase() + ")");
        row.style.setProperty("--w", (100 * n(p)) / max + "%");
        const track = el("span", "pair-track");
        track.appendChild(el("span", "pair-fill"));
        row.append(el("span", "pair-name", label), track, el("span", "pair-n", String(n(p))));
        bars.appendChild(row);
        return { p, t, row };
      });

      go.addEventListener("click", () => {
        if (!chosen || box.classList.contains("revealed")) return;
        box.classList.add("revealed");
        go.disabled = true;
        rows.forEach(({ p, t, row }) => {
          t.setAttribute("aria-disabled", "true");
          const best = n(p) === max, mine = p === chosen;
          t.classList.toggle("answer", best);
          t.classList.toggle("picked", mine);
          row.classList.toggle("answer", best);
          row.classList.toggle("picked", mine);
        });
        const top = PAIRS.filter((p) => n(p) === max).map((p) => p.join("–")).join(" and ");
        out.textContent = n(chosen) === max
          ? "Right. " + top + ": " + max + " parallels."
          : "Not quite. " + chosen.join("–") + " share " + n(chosen) + ". " + top + " share the most: " + max + ".";
      });
    });
  }

  // ---------- the chord: each text card drives one chart state ----------
  // (chordState in charts/chord.html draws it with 700ms d3 transitions; every
  // state is complete in itself, so scrolling back up plays it in reverse)
  const sec = document.getElementById("chart3");
  if (!sec) return;
  const iframe = sec.querySelector("iframe");
  const steps = [...sec.querySelectorAll(".step[data-state]")];
  const pairsStep = sec.querySelector(".step[data-state='pairs']");
  let current = "hidden", part = "gh";
  const send = () => { const w = iframe.contentWindow; if (w && w.chordState) w.chordState(current, part); };
  iframe.addEventListener("load", () => {
    const w = iframe.contentWindow;
    if (w.chordReady) send(); else w.addEventListener("chordready", send);
  });
  // the card crossing the middle of the screen is the current state
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { current = e.target.dataset.state; send(); }
    else if (e.target === steps[0] && e.boundingClientRect.top > innerHeight / 2) { current = "hidden"; send(); }   // back above the chart
  }), { rootMargin: "-50% 0px -50% 0px" });
  steps.forEach((st) => io.observe(st));
  // the pairs card: Greek–Hindu for its first half, Japanese–Norse for its second
  addEventListener("scroll", () => {
    if (current !== "pairs") return;
    const r = pairsStep.getBoundingClientRect();
    const p = (innerHeight / 2 - r.top) / r.height;
    const next = p < 0.5 ? "gh" : "jn";
    if (next !== part) { part = next; send(); }
  }, { passive: true });
})();
