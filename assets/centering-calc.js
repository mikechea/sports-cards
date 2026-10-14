/* Reusable centering calculator (PSA tolerances).
   Usage in a lesson or reference doc:
     <div class="centering-calc"></div>
     <script src="../assets/centering-calc.js"></script>
   Optional presets (any unit works, as long as all four borders on a side use the same unit:
   mm, 1/32", or pixels measured on a scan):
     <div class="centering-calc" data-front="3.2,1.8,2.5,2.5" data-back="2,2,2,2"></div>
     Order is left,right,top,bottom.
   Behaviour:
   - Ratio per axis = bigger border / (left + right) or (top + bottom), shown like "60/40" (rounded to whole %).
   - The worst axis on each side sets that side's cap; the overall cap is the lower of front and back.
   - Tolerances follow PSA's published grade definitions (front: 10 ≈55/45, 9 ≈60/40, 8 ≈65/35,
     7 ≈70/30, 6 ≈80/20, 5–4 ≈85/15, 3–1 ≈90/10; back: 10 ≈75/25, 9 and below ≈90/10).
     PSA's PSA 10 front wording has varied between "55/45" and "55/45 to 60/40", so 56–60 on the
     front is flagged as borderline instead of being treated as a clean 10.
   - It is a CENTERING cap only: corners, edges, and surface can pull the grade lower, never higher.
   Styled with the CSS variables from style.css. */
(function () {
  // [max allowed bigger-side %, grade label] — checked in order, first match wins.
  const FRONT = [[55, "PSA 10"], [60, "PSA 9"], [65, "PSA 8"], [70, "PSA 7"], [80, "PSA 6"], [85, "PSA 5"], [90, "PSA 3 or lower"]];
  const BACK = [[75, "PSA 10"], [90, "PSA 9"]];
  const ORDER = ["PSA 10", "PSA 9", "PSA 8", "PSA 7", "PSA 6", "PSA 5", "PSA 3 or lower", "OC"];

  const css = `
  .ccalc { border: 1px solid var(--rule); border-radius: 6px; padding: 1rem 1.2rem; margin: 1.4rem 0; }
  .ccalc .ctitle { font-family: var(--sans); font-size: .7rem; letter-spacing: .1em; text-transform: uppercase; color: var(--accent); margin-bottom: .6rem; }
  .ccalc .cgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .ccalc fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
  .ccalc legend { font-family: var(--sans); font-size: .78rem; font-weight: 600; color: var(--ink); margin-bottom: .3rem; }
  .ccalc .cinputs { display: grid; grid-template-columns: 1fr 1fr; gap: .35rem .6rem; }
  .ccalc label { font-family: var(--sans); font-size: .72rem; color: var(--muted); display: flex; flex-direction: column; }
  .ccalc input { font: inherit; font-family: var(--serif); font-size: .95rem; padding: .3rem .45rem; border: 1px solid var(--rule);
    border-radius: 4px; background: transparent; color: var(--ink); width: 100%; }
  .ccalc input:focus { outline: none; border-color: var(--accent); }
  .ccalc .cside { display: flex; gap: .7rem; align-items: center; margin-top: .6rem; }
  .ccalc svg { flex: none; width: 52px; height: 72px; }
  .ccalc svg .outer { fill: var(--paper); stroke: var(--muted); stroke-width: 1.5; }
  .ccalc svg .inner { fill: var(--accent-soft); stroke: var(--accent); stroke-width: 1.5; }
  .ccalc .cread { font-size: .9rem; line-height: 1.45; }
  .ccalc .cread b { font-family: var(--sans); font-size: .82rem; }
  .ccalc .cresult { margin-top: .9rem; padding: .6rem .8rem; border-radius: 4px; background: var(--accent-soft); font-size: .95rem; }
  .ccalc .cresult.ok { background: var(--good-soft); }
  .ccalc .cnote { font-size: .8rem; color: var(--muted); margin: .5rem 0 0; }
  @media (max-width: 560px) { .ccalc .cgrid { grid-template-columns: 1fr; } }`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const capFor = (pct, table) => { for (const [max, g] of table) if (pct <= max) return g; return "OC"; };
  const worse = (a, b) => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);
  const ratio = (a, b) => { const big = Math.round((Math.max(a, b) / (a + b)) * 100); return { big, text: `${big}/${100 - big}` }; };

  const side = (name, preset) => {
    const vals = (preset || "").split(",").map((s) => { const n = parseFloat(s); return isNaN(n) ? "" : String(n); });
    const f = (key, i, label) => `<label>${label}<input type="number" min="0" step="any" inputmode="decimal" data-k="${key}" value="${vals[i] || ""}"></label>`;
    return `<fieldset data-side="${name}"><legend>${name === "front" ? "Front" : "Back (optional)"}</legend>
      <div class="cinputs">${f("l", 0, "Left border")}${f("r", 1, "Right border")}${f("t", 2, "Top border")}${f("b", 3, "Bottom border")}</div>
      <div class="cside"><svg viewBox="0 0 50 70" aria-hidden="true"><rect class="outer" x="1" y="1" width="48" height="68" rx="2"/><rect class="inner" x="9" y="9" width="32" height="52"/></svg>
      <div class="cread"></div></div></fieldset>`;
  };

  document.querySelectorAll(".centering-calc").forEach((root) => {
    root.classList.add("ccalc");
    root.innerHTML = `<div class="ctitle">Centering calculator</div>
      <div class="cgrid">${side("front", root.dataset.front)}${side("back", root.dataset.back)}</div>
      <div class="cresult" aria-live="polite"></div>
      <p class="cnote">Measure each border with a ruler or on a scan; any unit works if it's the same on all four sides. This is a centering cap only: corners, edges, and surface can pull the grade lower, never higher.</p>`;
    const result = root.querySelector(".cresult");

    const read = (fs) => {
      const v = {};
      fs.querySelectorAll("input").forEach((i) => { v[i.dataset.k] = i.value === "" ? null : parseFloat(i.value); });
      return v;
    };

    const evalSide = (fs, table) => {
      const v = read(fs), out = fs.querySelector(".cread"), inner = fs.querySelector(".inner");
      const axes = [];
      const bad = Object.values(v).some((x) => x !== null && (isNaN(x) || x < 0));
      if (bad) { out.innerHTML = "Use numbers zero or above."; return null; }
      if (v.l !== null && v.r !== null && v.l + v.r > 0) axes.push({ name: "L/R", ...ratio(v.l, v.r) });
      if (v.t !== null && v.b !== null && v.t + v.b > 0) axes.push({ name: "T/B", ...ratio(v.t, v.b) });
      // Draw the inner image box: 16 units of free space per axis, split by the border ratio.
      const lr = v.l !== null && v.r !== null && v.l + v.r > 0 ? v.l / (v.l + v.r) : 0.5;
      const tb = v.t !== null && v.b !== null && v.t + v.b > 0 ? v.t / (v.t + v.b) : 0.5;
      inner.setAttribute("x", (1 + 16 * lr).toFixed(2));
      inner.setAttribute("y", (1 + 16 * tb).toFixed(2));
      if (!axes.length) { out.innerHTML = "Enter left + right and/or top + bottom."; return null; }
      const worst = axes.reduce((a, b) => (b.big > a.big ? b : a));
      const cap = capFor(worst.big, table);
      out.innerHTML = axes.map((a) => `${a.name}: <b>${a.text}</b>`).join("<br>") +
        `<br>Cap: <b>${cap === "OC" ? "beyond 90/10" : cap}</b>`;
      return { cap, worst };
    };

    const update = () => {
      const front = evalSide(root.querySelector('[data-side="front"]'), FRONT);
      const back = evalSide(root.querySelector('[data-side="back"]'), BACK);
      result.classList.remove("ok");
      if (!front && !back) { result.innerHTML = "Enter border measurements to see the ratio and the best PSA grade that centering allows."; return; }
      let cap = front && back ? worse(front.cap, back.cap) : (front || back).cap;
      let msg;
      if (cap === "OC") msg = "Centering is worse than 90/10. Expect a low grade or an <strong>OC</strong> (off-center) qualifier.";
      else msg = `Best grade centering allows: <strong>${cap}</strong>.`;
      const limiter = front && back && front.cap !== back.cap ? (ORDER.indexOf(front.cap) > ORDER.indexOf(back.cap) ? "front" : "back") : null;
      if (limiter) msg += ` The ${limiter} is the limiting side.`;
      if (front && front.worst.big > 55 && front.worst.big <= 60 && (!back || back.cap === "PSA 10"))
        msg += " Borderline: PSA's 10 wording has at times read \"55/45 to 60/40\", so a 10 isn't impossible, but price it as a 9.";
      if (!back && front) msg += " (Back not measured: the back allows up to 75/25 for a 10.)";
      if (cap === "PSA 10" && !(front && front.worst.big > 55)) result.classList.add("ok");
      result.innerHTML = msg;
    };

    root.addEventListener("input", update);
    update();
  });
})();
