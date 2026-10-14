/* Reusable cash-drawer counter (blind count, then compare).
   Usage in a lesson or reference doc:
     <div class="drawer-counter"
          data-bank="200" data-sales="1145" data-refunds="40"
          data-out="500" data-in="0"></div>
     <script src="../assets/drawer-counter.js"></script>
   - All data-* attributes are optional dollar amounts used as starting values:
       data-bank    starting bank / float put in the drawer at open
       data-sales   cash sales from the POS report
       data-refunds cash refunds paid from the drawer
       data-out     cash removed: safe drops, paid-outs (e.g. cash paid for a buy)
       data-in      cash added: paid-ins, change-fund top-ups
   - The learner types how many of each bill/coin they counted. The counted total
     updates live, but expected and over/short stay hidden until "Compare" is
     pressed, so the count is blind (counter doesn't see the expected first).
   - Expected = bank + sales - refunds - out + in.  Over/short = counted - expected.
     Deposit = counted - the bank you leave for the next shift.
   - All math is done in integer cents to avoid floating-point drift.
   Styled with the CSS variables from style.css. */
(function () {
  const css = `
  .drawer-counter { border: 1px solid var(--rule); border-radius: 6px; padding: 1rem 1.2rem; margin: 1.4rem 0; font-size: .95rem; }
  .drawer-counter .dc-title { font-family: var(--sans); font-size: .7rem; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin: 0 0 .5rem; }
  .drawer-counter .dc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr)); gap: .45rem .8rem; margin-bottom: .9rem; }
  .drawer-counter label { display: flex; align-items: center; justify-content: space-between; gap: .4rem; }
  .drawer-counter label span { font-family: var(--sans); font-size: .8rem; color: var(--ink); white-space: nowrap; }
  .drawer-counter input { width: 4.6rem; font: inherit; font-size: .9rem; padding: .25rem .4rem; border: 1px solid var(--rule);
    border-radius: 4px; background: transparent; color: var(--ink); text-align: right; }
  .drawer-counter input:focus { outline: none; border-color: var(--accent); }
  .drawer-counter .dc-pos label span { white-space: normal; }
  .drawer-counter .dc-pos input { width: 5.6rem; }
  .drawer-counter .dc-out { font-family: var(--sans); font-size: .85rem; border-top: 1px solid var(--rule); padding-top: .7rem; display: grid; gap: .25rem; }
  .drawer-counter .dc-row { display: flex; justify-content: space-between; }
  .drawer-counter .dc-row b { font-weight: 600; }
  .drawer-counter .dc-verdict { margin-top: .4rem; padding: .45rem .7rem; border-radius: 4px; }
  .drawer-counter .dc-verdict.ok { background: var(--good-soft); color: var(--good); }
  .drawer-counter .dc-verdict.off { background: var(--bad-soft); color: var(--bad); }
  .drawer-counter button { font-family: var(--sans); font-size: .8rem; margin-top: .6rem; margin-right: .4rem; padding: .45rem .9rem; border: 0;
    border-radius: 4px; background: var(--accent); color: #fff; cursor: pointer; }
  .drawer-counter button.ghost { background: transparent; color: var(--accent); border: 1px solid var(--rule); }
  @media print { .drawer-counter { display: none; } }`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const DENOMS = [
    ["$100", 10000], ["$50", 5000], ["$20", 2000], ["$10", 1000], ["$5", 500], ["$1", 100],
    ["Quarters", 25], ["Dimes", 10], ["Nickels", 5], ["Pennies", 1],
  ];
  const POS_FIELDS = [
    ["bank", "Starting bank"], ["sales", "+ Cash sales"], ["refunds", "− Cash refunds"],
    ["out", "− Drops / paid-outs"], ["in", "+ Paid-ins"],
  ];
  const toCents = (v) => { const n = parseFloat(String(v).replace(/[$,\s]/g, "")); return isFinite(n) ? Math.round(n * 100) : 0; };
  const fmt = (c) => (c < 0 ? "−" : "") + "$" + (Math.abs(c) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  document.querySelectorAll(".drawer-counter").forEach((root) => {
    const countInputs = [], posInputs = {};

    root.appendChild(el("p", "dc-title", "1 · Count the drawer (blind)"));
    const grid = el("div", "dc-grid");
    DENOMS.forEach(([name, cents]) => {
      const lab = el("label");
      lab.appendChild(el("span", null, name));
      const inp = el("input"); inp.type = "number"; inp.min = "0"; inp.step = "1"; inp.inputMode = "numeric"; inp.placeholder = "0";
      inp.setAttribute("aria-label", name + " count");
      inp.dataset.cents = cents;
      lab.appendChild(inp); grid.appendChild(lab); countInputs.push(inp);
    });
    root.appendChild(grid);

    root.appendChild(el("p", "dc-title", "2 · From the POS report"));
    const pos = el("div", "dc-grid dc-pos");
    POS_FIELDS.forEach(([key, name]) => {
      const lab = el("label");
      lab.appendChild(el("span", null, name));
      const inp = el("input"); inp.type = "text"; inp.inputMode = "decimal"; inp.placeholder = "0.00";
      inp.setAttribute("aria-label", name);
      if (root.dataset[key] != null) inp.value = root.dataset[key];
      lab.appendChild(inp); pos.appendChild(lab); posInputs[key] = inp;
    });
    root.appendChild(pos);

    const out = el("div", "dc-out");
    const rowCounted = el("div", "dc-row", "<span>Counted</span><b>$0.00</b>");
    const hidden = el("div");
    hidden.hidden = true;
    const rowExpected = el("div", "dc-row", "<span>Expected</span><b></b>");
    const rowDeposit = el("div", "dc-row", "<span>Deposit (counted − bank you leave)</span><b></b>");
    const verdict = el("div", "dc-verdict");
    hidden.append(rowExpected, rowDeposit, verdict);
    out.append(rowCounted, hidden);
    root.appendChild(out);

    const compare = el("button", null, "Compare to expected");
    const clear = el("button", "ghost", "Clear count");
    root.append(compare, clear);

    const counted = () => countInputs.reduce((s, i) => s + Math.max(0, Math.floor(+i.value || 0)) * +i.dataset.cents, 0);
    const expected = () => { const v = (k) => toCents(posInputs[k].value); return v("bank") + v("sales") - v("refunds") - v("out") + v("in"); };

    const render = () => {
      const c = counted(), e = expected(), diff = c - e;
      rowCounted.querySelector("b").textContent = fmt(c);
      rowExpected.querySelector("b").textContent = fmt(e);
      rowDeposit.querySelector("b").textContent = fmt(c - toCents(posInputs.bank.value));
      if (diff === 0) { verdict.className = "dc-verdict ok"; verdict.textContent = "Balanced. Pull the deposit, leave the bank, log it."; }
      else {
        verdict.className = "dc-verdict off";
        verdict.textContent = `${fmt(Math.abs(diff))} ${diff < 0 ? "SHORT" : "OVER"}. Recount by denomination, check refunds, drops and paid-outs, then log it and tell your manager.`;
      }
    };
    root.addEventListener("input", render);
    compare.addEventListener("click", () => { hidden.hidden = false; render(); });
    clear.addEventListener("click", () => { countInputs.forEach((i) => (i.value = "")); hidden.hidden = true; render(); });
    render();
  });
})();
