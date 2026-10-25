/* =========================================================
   "Building a bestiary", after the Figma storyboards SB3 Counter and
   SB4 Cards. The look is in css/article.css (under "Building a bestiary").

   SB3 (.bd-sort, pinned): scrubbed to the scroll, 96 balls in the four
   culture colours fall onto the bar, bounce and drop into their culture's
   container (counts from data/mythology_creatures_dataset.csv); five grey
   ones bounce off the bar into CUT. The counter and the labels count the
   balls that have landed. Then (data-step) 2: the bar goes and the counter
   grows to "96 creatures"; 3: the five attribute chips; 4: paragraph 2.
   Hovering, tapping or focusing a container lists its five most famous
   members (popularity in charts/creatures_data.js).

   SB4 (.bd-deck, pinned): step 0 the six cards in a grid; then they
   gather into one pile and grow. Each family's text box rises from the
   bottom, rests beside the pile and leaves at the top; as it comes in, its
   card is on top and the one before goes to the back. The top card turns
   over on hover, tap or Enter (the flip is unchanged).
   ========================================================= */
(() => {
  "use strict";
  const sec = document.getElementById("build");
  if (!sec) return;
  const sort = sec.querySelector(".bd-sort");
  const deck = sec.querySelector(".bd-deck");
  const sortArt = sort.querySelector(".bd-art");
  const deckArt = deck.querySelector(".bd-art");
  const num = sort.querySelector(".bd-num");
  const jarsBox = sort.querySelector(".bd-jars");
  const ballsBox = sort.querySelector(".bd-balls");
  const cardsBox = deck.querySelector(".bd-cards");
  const boxes = [...deck.querySelectorAll(".bd-box")];

  const CULTURES = ["Greek", "Hindu", "Japanese", "Norse"];
  // card order follows the script's family paragraphs
  const FAMILIES = [
    { key: "serpent or dragon", name: "Serpents and dragons", line: "The oldest fear in the book.", art: "family-serpent" },
    { key: "many-headed beast", name: "Many-headed beasts", line: "More heads, more problems.", art: "family-heads" },
    { key: "shapeshifter", name: "Shapeshifters", line: "Never trust a helpful stranger.", art: "family-shapeshifter" },
    { key: "human or animal hybrid", name: "Human hybrids", line: "Half person, half warning.", art: "family-hybrid" },
    { key: "wolf or hound", name: "Wolves and hounds", line: "Loyal to the dead, hungry for the sun.", art: "family-hound" },
    { key: "beautiful lethal woman", name: "Beautiful, lethal women", line: "Look closer.", art: "family-woman" },
  ];
  const ART = "assets/creature-cards/";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const phone = matchMedia("(max-width: 899px)");
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const short = (n) => n.replace(/\s*\(.*\)\s*$/, "");
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;

  // ---------- a small CSV reader (quoted fields may hold commas) ----------
  function parseCSV(text) {
    const rows = []; let row = [], field = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') q = false;
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const head = rows.shift();
    return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] || ""])));
  }

  // where a pinned stage is: p runs 0 -> 1 while it is pinned
  const place = (pin) => {
    const r = pin.getBoundingClientRect();
    return { top: r.top, p: -r.top / Math.max(1, r.height - innerHeight) };
  };
  const unit = (art) => art.offsetWidth / (art.closest(".bd-deck") && phone.matches ? 700 : 1280);

  fetch("data/mythology_creatures_dataset.csv")
    .then((r) => r.text())
    .then((text) => build(parseCSV(text)))
    .catch((err) => console.warn("[build] could not read the dataset", err));

  function build(rows) {
    /* =====================================================
       SB3: the balls (all positions in Figma panel units)
       ===================================================== */
    const JAR_X = [199.31, 381.95, 564.6, 747.24, 929.88];   // the five containers, left edges
    const JAR_Y = 384, JAR_W = 151.818, JAR_FLOOR = 499;     // floor: where the container's bottom line runs
    const BAR_Y = 207.8, R = 12.16;                           // the bar; ball radius
    const counts = CULTURES.map((c) => rows.filter((r) => r.mythology === c).length);
    const CUTS = 5;
    const famous = topFive();
    const jarPath = "M0.5 0V114.516L151.309 115.606L149.298 1.09068";   // Vector 59

    const labels = [];
    [...CULTURES, "Cut"].forEach((c, ci) => {
      const isCut = ci === 4;
      const jar = el(isCut ? "div" : "button", "bd-jar" + (isCut ? " is-cut" : ""));
      jar.style.left = `calc(${JAR_X[ci]} * var(--u))`;
      jar.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 151.818 116.11" preserveAspectRatio="none" aria-hidden="true"><path d="${jarPath}"/></svg>`);
      const label = el("span", "bd-jar-label", isCut ? "Cut" : `0 ${c}`);
      jar.appendChild(label);
      labels.push(label);
      if (!isCut) {
        jar.type = "button";
        jar.setAttribute("aria-expanded", "false");
        jar.setAttribute("aria-label", `${counts[ci]} ${c} creatures. Show the five most famous.`);
        const tip = el("span", "bd-famous");
        tip.append(el("b", null, `Most famous ${c}`));
        const list = el("span", "bd-famous-list");
        (famous[c] || []).forEach((n) => list.appendChild(el("span", null, n)));
        tip.appendChild(list);
        jar.appendChild(tip);
        jar.addEventListener("click", () => {          // tap or Enter: show / hide the five
          const open = jar.getAttribute("aria-expanded") !== "true";
          jarsBox.querySelectorAll("button.bd-jar").forEach((p) => p.setAttribute("aria-expanded", "false"));
          jar.setAttribute("aria-expanded", String(open));
        });
      }
      jarsBox.appendChild(jar);
    });

    // packed slots in a container: rows of 6 and 5, from the floor up
    const slot = (ji, k) => {
      let row = 0, left = k;
      while (left >= (row % 2 ? 5 : 6)) { left -= row % 2 ? 5 : 6; row++; }
      const x = JAR_X[ji] + 3 + R + (row % 2 ? R : 0) + left * 2 * R;
      const y = JAR_FLOOR - R - 1 - row * 2 * R * 0.866;
      return { x, y };
    };

    // the order balls fall in: interleaved, so the containers fill evenly;
    // the grey ones come at about 14, 33, 51, 69 and 86 of 96
    const order = [];
    const filled = [0, 0, 0, 0];
    const total = counts.reduce((a, b) => a + b, 0);
    const CUT_AT = [14, 33, 51, 69, 86];
    let cutN = 0;
    for (let k = 0; k < total; k++) {
      if (cutN < CUTS && k === CUT_AT[cutN]) {
        const s = slot(4, cutN);
        order.push({ cut: true, ji: 4, from: JAR_X[cutN % 4] + JAR_W * (0.3 + 0.1 * cutN), ...s });
        cutN++;
      }
      let best = 0, bestFrac = 2;
      counts.forEach((n, ji) => { const f = filled[ji] / n; if (filled[ji] < n && f < bestFrac) { bestFrac = f; best = ji; } });
      const s = slot(best, filled[best]++);
      order.push({ cut: false, ji: best, from: s.x, ...s });
    }
    const colour = ["var(--greek)", "var(--hindu)", "var(--japanese)", "var(--norse)", "var(--cut)"];
    order.forEach((b) => {
      b.el = el("span", "bd-ball");
      b.el.style.setProperty("--c", colour[b.ji]);
      ballsBox.appendChild(b.el);
    });

    // one ball's path at time t (0..1): fall to the bar, a small bounce, then
    // drop into its container; a grey one bounces high and arcs over to CUT
    const START_Y = -320;
    const ballAt = (b, t) => {
      const yl = BAR_Y - R;
      if (t < 0.4) { const s = t / 0.4; return [b.from, START_Y + (yl - START_Y) * s * s]; }
      if (!b.cut) {
        if (t < 0.58) { const s = (t - 0.4) / 0.18; return [b.from, yl - 26 * 4 * s * (1 - s)]; }
        const s = (t - 0.58) / 0.42; return [b.x, yl + (b.y - yl) * s * s];
      }
      const s = (t - 0.4) / 0.6;
      return [b.from + (b.x - b.from) * s, yl + (b.y - yl) * s * s - 110 * 4 * s * (1 - s)];
    };

    const FALL_FROM = 0.03, FALL_TO = 0.5, WIN = 0.07;
    const startOf = (i) => FALL_FROM + (i / (order.length - 1)) * (FALL_TO - FALL_FROM - WIN);
    let sortStep = -1, lastCount = -1;
    const perCulture = [0, 0, 0, 0];
    function updateSort() {
      const { top, p } = place(sort);
      const u = unit(sortArt);
      const pp = top > innerHeight * 0.4 ? -1 : p;
      let landed = 0;
      perCulture.fill(0);
      order.forEach((b, i) => {
        const t = clamp01((pp - startOf(i)) / WIN);
        if (reduced.matches) {
          b.el.style.transform = `translate(${b.x * u}px, ${b.y * u}px)`;
          b.el.style.opacity = t >= 1 ? "1" : "0";
        } else {
          const [x, y] = ballAt(b, t);
          b.el.style.transform = `translate(${(x * u).toFixed(1)}px, ${(y * u).toFixed(1)}px)`;
          b.el.style.opacity = t > 0 ? "1" : "0";
        }
        if (t >= 1 && !b.cut) { landed++; perCulture[b.ji]++; }
      });
      if (landed !== lastCount) {
        lastCount = landed;
        num.textContent = String(landed);
        CULTURES.forEach((c, ci) => { labels[ci].textContent = `${perCulture[ci]} ${c}`; });
      }
      const step = pp < 0 ? 0 : pp < 0.52 ? 1 : pp < 0.6 ? 2 : pp < 0.78 ? 3 : 4;
      if (step !== sortStep) { sortStep = step; sort.dataset.step = String(step); }
    }

    /* =====================================================
       SB4: the cards
       ===================================================== */
    // grid (Desktop - 1, cards 216.9 wide = 0.5477 of the pile size) and the pile
    // (SB4 panel 1: the top card, and five behind it with their own tilt)
    const LAYOUT = {
      desk: {
        grid: [[305.16, 129.7], [531.71, 129.7], [758.26, 129.7], [305.16, 428.54], [531.71, 428.54], [758.26, 428.54]],
        top: [670, 150],
      },
      phone: {
        grid: [[15, 200], [241.5, 200], [468, 200], [15, 499], [241.5, 499], [468, 499]],
        top: [152, 60],
      },
    };
    // behind the top card, front to back: [dx, dy, Figma rotation]
    const BACK = [[63, -6, -7], [2, -17, 3], [17, 27, 5], [-28, 37, 2], [54, -36, -5]];
    const GRID_S = 216.906 / 396;

    const cards = FAMILIES.map((f, i) => {
      const members = rows.filter((r) => r.families.split(";").map((s) => s.trim()).includes(f.key));
      const counts = CULTURES.map((c) => members.filter((m) => m.mythology === c).length);

      const card = el("button", "fcard");
      card.type = "button";
      card.dataset.i = String(i);
      card.setAttribute("aria-pressed", "false");
      card.setAttribute("aria-label", `${f.name}: ${members.length} creatures. Press to turn the card over.`);

      const inner = el("span", "fcard-inner");
      const front = el("span", "fcard-face fcard-front");
      const art = el("img"); art.src = ART + f.art + ".webp"; art.alt = "";
      front.append(art, el("span", "fcard-plate", f.name), el("span", "fcard-line", f.line));

      const back = el("span", "fcard-face fcard-back");
      const bart = el("img"); bart.src = ART + "card-back.webp"; bart.alt = ""; bart.loading = "lazy";
      const panel = el("span", "fcard-panel");
      const count = el("span", "fcard-count");
      count.append(el("b", null, String(members.length)), document.createTextNode(" creatures"));
      const bar = el("span", "fcard-bar");
      CULTURES.forEach((c, ci) => {
        if (!counts[ci]) return;
        const seg = el("span");
        seg.style.flex = String(counts[ci]);
        seg.style.background = `var(--c-${c.toLowerCase()})`;
        seg.title = `${c}: ${counts[ci]}`;
        bar.appendChild(seg);
      });
      const names = el("span", "fcard-names");
      CULTURES.forEach((c) => {
        const list = members.filter((m) => m.mythology === c).map((m) => short(m.creature_name));
        if (!list.length) return;
        const line = el("span", "fcard-culture");
        line.style.setProperty("--c", `var(--c-${c.toLowerCase()})`);
        line.append(el("b", null, c), document.createTextNode(" " + list.join(", ")));
        names.appendChild(line);
      });
      panel.append(count, bar, names);
      back.append(bart, panel);

      inner.append(front, back);
      card.appendChild(inner);
      card.addEventListener("click", () => {
        const on = card.getAttribute("aria-pressed") !== "true";
        card.setAttribute("aria-pressed", String(on));
      });
      cardsBox.appendChild(card);
      return card;
    });

    let deckState = "";
    function layCards(piled, topI) {
      const L = phone.matches ? LAYOUT.phone : LAYOUT.desk;
      const key = `${piled}|${topI}|${phone.matches}`;
      if (key === deckState) return;
      deckState = key;
      cards.forEach((card, i) => {
        if (!piled) {
          card.style.setProperty("--x", L.grid[i][0]);
          card.style.setProperty("--y", L.grid[i][1]);
          card.style.setProperty("--r", "0deg");
          card.style.setProperty("--s", GRID_S);
          card.style.zIndex = "1";
          card.classList.remove("is-back", "is-top");
          card.tabIndex = 0;
          return;
        }
        const rank = (i - topI + 6) % 6;
        const [dx, dy, rot] = rank ? BACK[rank - 1] : [0, 0, 0];
        card.style.setProperty("--x", L.top[0] + dx);
        card.style.setProperty("--y", L.top[1] + dy);
        card.style.setProperty("--r", `${-rot}deg`);   // Figma turns the other way
        card.style.setProperty("--s", "1");
        card.style.zIndex = rank ? String(6 - rank) : "10";
        card.classList.toggle("is-top", !rank);
        card.classList.toggle("is-back", !!rank);
        card.tabIndex = rank ? -1 : 0;
        if (rank) card.setAttribute("aria-pressed", "false");   // a card that goes to the back turns face up again
      });
    }

    const PILE_AT = 0.06, BOX_FROM = 0.1, BOX_LEN = (1 - BOX_FROM) / 6;
    function updateDeck() {
      const { top, p } = place(deck);
      const pp = top > 0 ? -1 : p;
      const piled = pp >= PILE_AT;
      const topI = Math.max(0, Math.min(5, Math.floor((pp - BOX_FROM) / BOX_LEN + 0.12)));
      layCards(piled, piled ? topI : 0);
      deck.dataset.step = piled ? String(1 + topI) : "0";

      const artTop = deckArt.getBoundingClientRect().top;
      boxes.forEach((box, k) => {
        const q = (pp - (BOX_FROM + k * BOX_LEN)) / BOX_LEN;
        const rest = box.offsetTop + artTop;               // where it sits on screen at rest
        const below = innerHeight - rest + 20;
        const above = -(rest + box.offsetHeight + 20);
        let y, o = 1;
        if (reduced.matches) { y = 0; o = q > 0 && q < 1 ? 1 : 0; }
        else if (q <= 0) y = below;
        else if (q < 0.3) y = below * (1 - easeOut(q / 0.3));
        else if (q < 0.7) y = 0;
        else if (q < 1) y = above * easeIn((q - 0.7) / 0.3);
        else y = above;
        box.style.setProperty("--by", `${y.toFixed(1)}px`);
        box.style.opacity = String(o);
      });
    }

    // live text has to fit the art: shrink each piece until it does
    const fitAll = () => sec.querySelectorAll(".fcard-plate, .fcard-line, .fcard-panel").forEach(fit);
    new ResizeObserver(fitAll).observe(deckArt);
    if (document.fonts) document.fonts.ready.then(fitAll);
    fitAll();

    let queued = false;
    const update = () => { queued = false; updateSort(); updateDeck(); };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", () => { deckState = ""; onScroll(); });
    update();
  }

  // the five most famous creatures per culture: the quadrant plot's popularity
  // scores (charts/creatures_data.js), ties broken alphabetically
  function topFive() {
    const data = typeof CREATURES_DATA !== "undefined" ? CREATURES_DATA : [];
    const out = {};
    CULTURES.forEach((c) => {
      out[c] = data.filter((d) => d.mythology === c)
        .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name))
        .slice(0, 5)
        .map((d) => short(d.name));
    });
    return out;
  }

  function fit(box) {
    box.style.fontSize = "";
    let size = parseFloat(getComputedStyle(box).fontSize);
    const min = 5;
    while (size > min && (box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1)) {
      size -= 0.5;
      box.style.fontSize = size + "px";
    }
  }
})();
