/* =========================================================
   "Guess the route" (demo §5), after "Before reading on, try it
   yourself." Four pairs, each with its illustration
   (assets/guess-the-route/). The reader answers Travelled, Inherited or
   Imagined; a red rubber stamp with the right answer drops onto the card
   with a slight turn, and the reason slides down under it. The score
   shows once all four are answered.
   ========================================================= */
(() => {
  "use strict";
  const box = document.getElementById("route");
  if (!box) return;
  const PAIRS = [
    { t: "Garuda (India) and Karura (Japan)", art: "karura", a: "Travelled", why: "Buddhism carried Garuda to Japan, where he became Karura." },
    { t: "Cerberus (Greece), Garmr (Scandinavia) and Sharvara and Shyama (India)", art: "garmr", a: "Inherited", why: "The idea of a hound at the gate of the dead may be older than all three cultures." },
    { t: "Orochi (Japan) and Kaliya (India)", art: "kaliya", a: "Imagined", why: "No known contact links these two stories." },
    { t: "Medusa (Greece) and Jorōgumo (Japan)", art: "jorogumo", a: "Imagined", why: "No route connects them. Just the same fear in a different costume." },
  ];
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  const q = el("p", "guess-q", "Travelled, inherited or imagined?");
  q.id = "route-q";
  const grid = el("div", "route-grid");
  const score = el("p", "guess-out route-score");
  score.setAttribute("aria-live", "polite");
  box.append(q, grid, score);

  let done = 0, right = 0;
  PAIRS.forEach((p, i) => {
    const card = el("article", "route-card");
    const art = el("div", "route-art");
    const img = el("img");
    img.src = "assets/guess-the-route/" + p.art + ".webp";
    img.alt = "";
    img.loading = "lazy";
    const stamp = el("span", "route-stamp", p.a);
    stamp.setAttribute("aria-hidden", "true");
    stamp.style.setProperty("--tilt", (i % 2 ? 7 : -8) + "deg");
    art.append(img, stamp);
    const title = el("h3", "route-title", p.t);
    const opts = el("div", "route-opts");
    opts.setAttribute("role", "group");
    opts.setAttribute("aria-label", p.t);
    const why = el("p", "route-why");
    why.setAttribute("aria-live", "polite");
    ["Travelled", "Inherited", "Imagined"].forEach((o) => {
      const b = el("button", null, o);
      b.type = "button";
      b.addEventListener("click", () => {
        if (card.classList.contains("answered")) return;
        card.classList.add("answered");
        [...opts.children].forEach((x) => {
          x.disabled = true;
          if (x.textContent === p.a) x.classList.add("right");
          else if (x === b) x.classList.add("wrong");
        });
        const ok = o === p.a;
        why.textContent = (ok ? "Right. " : "It was " + p.a.toLowerCase() + ". ") + p.why;
        done++;
        if (ok) right++;
        score.textContent = done === PAIRS.length ? "You got " + right + " of 4." : done + " of 4 answered";
      });
      opts.appendChild(b);
    });
    card.append(art, title, opts, why);
    grid.appendChild(card);
  });
})();
