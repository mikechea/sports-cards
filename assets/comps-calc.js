/* Reusable comps-median calculator.
   Usage in a lesson or reference doc:
     <div class="comps-calc" data-prices="118, 125, 112, 260, 130"></div>
     <script src="../assets/comps-calc.js"></script>
   - data-prices (optional) pre-fills the box with example sold prices.
   - The learner pastes recent SOLD prices for one exact card (same set, parallel, grade).
   - Shows count, median, mean, low/high, and flags sales more than 40% away from the
     median as possible outliers (a rule of thumb, not a standard), then gives the
     median of the remaining sales as the suggested fair-market value.
   - Styled only with the CSS variables from style.css. */
(function () {
  const css = `
  .comps-calc { border: 1px solid var(--rule); border-radius: 6px; padding: 1rem 1.2rem; margin: 1.4rem 0; }
  .comps-calc .cc-label { font-family: var(--sans); font-size: .7rem; letter-spacing: .1em; text-transform: uppercase; color: var(--accent); display: block; margin-bottom: .4rem; }
  .comps-calc textarea { width: 100%; min-height: 3.2rem; font: inherit; font-size: .95rem; padding: .5rem; border: 1px solid var(--rule);
    border-radius: 4px; background: transparent; color: var(--ink); }
  .comps-calc .cc-out { font-size: .92rem; margin-top: .6rem; }
  .comps-calc .cc-out table { margin: .4rem 0; }
  .comps-calc .cc-flag { color: var(--bad); }
  .comps-calc .cc-fmv { font-family: var(--sans); font-weight: 600; color: var(--good); }
  .comps-calc .cc-hint { font-size: .8rem; color: var(--muted); margin: .3rem 0 0; }`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const median = (a) => {
    const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const money = (n) => "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });

  document.querySelectorAll(".comps-calc").forEach((root) => {
    root.innerHTML = `<span class="cc-label">Comps calculator</span>
      <textarea aria-label="Sold prices, separated by commas or spaces"></textarea>
      <p class="cc-hint">Paste sold prices for one exact card (same year, set, parallel, grade), separated by commas or spaces.</p>
      <div class="cc-out"></div>`;
    const ta = root.querySelector("textarea"), out = root.querySelector(".cc-out");
    ta.value = root.dataset.prices || "";

    const render = () => {
      const prices = (ta.value.match(/\d+(\.\d+)?/g) || []).map(Number).filter((n) => n > 0);
      if (prices.length === 0) { out.innerHTML = ""; return; }
      const med = median(prices);
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const outliers = prices.filter((p) => Math.abs(p - med) / med > 0.4);
      const kept = prices.filter((p) => Math.abs(p - med) / med <= 0.4);
      const fmv = kept.length ? median(kept) : med;
      out.innerHTML = `<table>
          <tr><td>Sales</td><td>${prices.length}${prices.length < 3 ? ' <span class="cc-flag">(thin: widen the window or say so)</span>' : ""}</td></tr>
          <tr><td>Low / High</td><td>${money(Math.min(...prices))} / ${money(Math.max(...prices))}</td></tr>
          <tr><td>Mean (average)</td><td>${money(mean)}</td></tr>
          <tr><td>Median</td><td>${money(med)}</td></tr>
          <tr><td>Possible outliers</td><td>${outliers.length ? '<span class="cc-flag">' + outliers.map(money).join(", ") + "</span> (more than 40% from the median; check before dropping)" : "none"}</td></tr>
        </table>
        Suggested fair-market value (median without flagged sales): <span class="cc-fmv">${money(fmv)}</span>`;
    };
    ta.addEventListener("input", render);
    render();
  });
})();
