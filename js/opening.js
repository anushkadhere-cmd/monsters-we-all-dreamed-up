/* =========================================================
   Opening: two serpents, three silhouettes, "travel" and "imagine".
   Everything is scrubbed with the scroll through the six paragraphs
   (Motion.track in js/article.js): t runs 0 -> 6, one unit per
   paragraph, so scrolling back up plays everything backwards.

     0 "In Izumo…"            Orochi glides in from the left
     1 "Thousands of km…"     Kaliya glides in from the right; Orochi moves left
     2 "Nothing in the…"      a dotted line draws between them, then three tags
     3 "Once you notice…"     serpents and tags drift up and out; the three
                              silhouettes rise in, one per third of the paragraph
     4 "So which is it?…"     "travel" and "imagine" get an underline, and copies
                              fly to the top as two labels that stay pinned until
                              the heading "Borrowed, inherited or imagined?",
                              where imagine grows and travel shrinks
     5 "To find out…"         the silhouettes sink and fade; the stage unpins
   ========================================================= */
(() => {
  "use strict";
  const sec = document.getElementById("opening");
  const M = window.Motion;
  if (!sec || !M) return;

  const $ = (s) => sec.querySelector(s);
  const $$ = (s) => [...sec.querySelectorAll(s)];
  const steps = $$(".op-step");
  const stage = $(".op-stage");
  const orochi = $(".op-orochi"), kaliya = $(".op-kaliya");
  const linkSvg = $(".op-link"), linkPath = $(".op-link-path"), reveal = $(".op-link-reveal");
  const tags = $$(".op-tag");
  const sils = $$(".op-sil");
  const words = $$(".tw-word");
  const underlines = words.map((w) => w.querySelector("path"));
  const bar = document.getElementById("tw-bar");
  const labels = bar ? [...bar.querySelectorAll(".tw-label")] : [];
  const borrowed = [...document.querySelectorAll(".article h2")].find((h) => h.textContent.startsWith("Borrowed"));
  const desktop = matchMedia("(min-width: 761px)");

  // underlines draw from 0 to 1 along their length
  underlines.forEach((p) => {
    p.setAttribute("pathLength", "1");
    p.style.strokeDasharray = "1";
    p.style.strokeDashoffset = "1";
  });

  // the three tags sit a fifth, half and four fifths of the way along the dotted line
  const placeTags = () => {
    const len = linkPath.getTotalLength();
    tags.forEach((tag, i) => {
      const pt = linkPath.getPointAtLength(len * (0.2 + 0.3 * i));
      tag.style.left = pt.x / 10 + "%";   // viewBox is 1000 x 800
      tag.style.top = pt.y / 8 + "%";
    });
  };
  placeTags();

  const win = M.win;

  function frame(t) {
    // ---- the two serpents ----
    const out = win(t, 3.0, 0.4);                 // drift up and out (paragraph 4)
    const oIn = win(t, 0.1, 0.55);
    const toLeft = win(t, 1.0, 0.55);
    orochi.style.left = 23 - 21 * toLeft + "%";   // centre -> left half
    M.enter(orochi, oIn * (1 - out), out > 0 ? { dx: 0, dy: -1 } : { dx: -1, dy: 0 });
    const kIn = win(t, 1.1, 0.55);
    M.enter(kaliya, kIn * (1 - out), out > 0 ? { dx: 0, dy: -1 } : { dx: 1, dy: 0 });

    // ---- the line and its three tags ----
    const line = win(t, 2.0, 0.45);
    reveal.setAttribute("width", String(1000 * line));
    linkSvg.style.opacity = String(1 - out);
    linkSvg.style.transform = M.reduced ? "" : `translateY(${-24 * out}px)`;
    tags.forEach((tag, i) => {
      const e = win(t, 2.35 + 0.22 * i, 0.3);
      M.enter(tag, e * (1 - out), { dx: 0, dy: out > 0 ? -1 : 1 });
    });

    // ---- the three silhouettes: one per third of paragraph 4, sink at the end ----
    const sink = win(t, 5.0, 0.6);
    sils.forEach((sil, i) => {
      const e = win(t, 3.05 + i / 3, 0.3);
      M.enter(sil, e * (1 - sink), { dx: 0, dy: 1 });   // rise in from below, sink back down
    });

    // ---- "travel" and "imagine" ----
    underlines.forEach((p, i) => {
      const u = win(t, 4.0 + 0.15 * i, 0.3);
      if (M.reduced) { p.style.strokeDashoffset = "0"; p.style.opacity = String(u); }   // reduced motion: fade, don't draw
      else { p.style.strokeDashoffset = String(1 - u); p.style.opacity = ""; }
    });
    labelsFrame(t);
  }

  // The labels live in a fixed bar. During paragraph 5 they fly from the words in
  // the text to their place in the bar; at the "Borrowed…" heading imagine grows,
  // travel shrinks, and the bar is pushed off the top with the heading.
  function labelsFrame(t) {
    if (!bar) return;
    if (desktop.matches) {              // centre the bar over the stage column
      const r = stage.getBoundingClientRect();
      bar.style.left = r.left + "px";
      bar.style.width = r.width + "px";
    } else {
      bar.style.left = "";
      bar.style.width = "";
    }

    const shown = win(t, 4.25, 0.15);
    const fly = win(t, 4.3, 0.5);

    // end state at the heading
    let end = 0, push = 0;
    if (borrowed) {
      const top = borrowed.getBoundingClientRect().top;
      const barBottom = bar.offsetTop + bar.offsetHeight;
      const dock = barBottom + 32;
      end = M.ease(M.clamp01((innerHeight * 0.9 - top) / Math.max(1, innerHeight * 0.9 - dock)));
      push = Math.min(0, top - dock);   // once the heading reaches the bar, it pushes the bar up
    }

    bar.style.visibility = shown > 0.001 ? "visible" : "hidden";
    bar.style.transform = push ? `translateY(${push}px)` : "";

    labels.forEach((label) => {
      const which = label.dataset.word;
      const word = words.find((w) => w.dataset.word === which);
      const scale = which === "imagine" ? 1 + 0.45 * end : 1 - 0.3 * end;
      label.style.opacity = String(shown * (which === "travel" ? 1 - 0.45 * end : 1));
      if (M.reduced || !word) {
        label.style.transform = `scale(${scale})`;
        return;
      }
      // where the label rests in the bar vs where its word sits in the text
      const barRect = bar.getBoundingClientRect();
      const restX = barRect.left + label.offsetLeft, restY = barRect.top + label.offsetTop;
      const w = word.getBoundingClientRect();
      const dx = (w.left - restX) * (1 - fly), dy = (w.top - restY) * (1 - fly);
      label.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    });
  }

  const ask = M.track(steps, (ps) => frame(ps.reduce((sum, p) => sum + M.clamp01(p), 0)));
  addEventListener("resize", () => { placeTags(); ask(); });
  // keep going past the opening, so the labels can dock at the "Borrowed…" heading
})();
