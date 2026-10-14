/* Reusable quiz component.
   Usage in a lesson:
     <div class="quiz" data-quiz="my-id"></div>
     <script type="application/json" id="my-id">
       [ { "type": "mc", "q": "...", "options": ["right", "wrong", ...], "answer": 0, "why": "..." },
         { "type": "recall", "q": "...", "checklist": ["item", "item"] } ]
     </script>
     <script src="../assets/quiz.js"></script>
   - "mc": options are shuffled on load; `answer` indexes the ORIGINAL options array.
   - "recall": free-text retrieval, then reveal a checklist to self-grade. */
(function () {
  const css = `
  .quiz { margin: 1.5rem 0; }
  .quiz .qcard { border: 1px solid var(--rule); border-radius: 6px; padding: 1rem 1.2rem; margin: 1rem 0; }
  .quiz .qnum { font-family: var(--sans); font-size: .7rem; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
  .quiz .qtext { margin: .3rem 0 .8rem; }
  .quiz .opts { display: grid; gap: .45rem; }
  .quiz .opt { font: inherit; font-size: .95rem; text-align: left; padding: .55rem .8rem; border: 1px solid var(--rule);
    border-radius: 4px; background: transparent; color: var(--ink); cursor: pointer; }
  .quiz .opt:hover:not(:disabled) { border-color: var(--accent); }
  .quiz .opt.right { background: var(--good-soft); border-color: var(--good); }
  .quiz .opt.wrong { background: var(--bad-soft); border-color: var(--bad); }
  .quiz .opt:disabled { cursor: default; }
  .quiz .why { margin-top: .8rem; font-size: .92rem; }
  .quiz .why b.ok { color: var(--good); } .quiz .why b.no { color: var(--bad); }
  .quiz textarea { width: 100%; min-height: 5rem; font: inherit; font-size: .95rem; padding: .6rem; border: 1px solid var(--rule);
    border-radius: 4px; background: transparent; color: var(--ink); }
  .quiz button.reveal { font-family: var(--sans); font-size: .8rem; margin-top: .6rem; padding: .45rem .9rem; border: 0;
    border-radius: 4px; background: var(--accent); color: #fff; cursor: pointer; }
  .quiz .checklist label { display: block; font-size: .95rem; margin: .3rem 0; }
  .quiz .score { font-family: var(--sans); font-size: .85rem; color: var(--muted); margin-top: 1rem; }`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  document.querySelectorAll(".quiz[data-quiz]").forEach((root) => {
    const data = JSON.parse(document.getElementById(root.dataset.quiz).textContent);
    const mcCount = data.filter((d) => d.type === "mc").length;
    let answered = 0, correct = 0;
    const score = el("div", "score");
    const updateScore = () => { score.textContent = `${correct} / ${answered} correct${answered === mcCount ? " — done. Revisit tomorrow to lock it in." : ""}`; };

    data.forEach((item, i) => {
      const card = el("div", "qcard");
      card.appendChild(el("div", "qnum", `Question ${i + 1}`));
      card.appendChild(el("p", "qtext", item.q));

      if (item.type === "mc") {
        const opts = el("div", "opts");
        const why = el("div", "why");
        shuffle(item.options.map((text, idx) => ({ text, idx }))).forEach(({ text, idx }) => {
          const b = el("button", "opt", text);
          b.dataset.idx = idx;
          b.addEventListener("click", () => {
            const ok = idx === item.answer;
            opts.querySelectorAll(".opt").forEach((o) => {
              o.disabled = true;
              if (+o.dataset.idx === item.answer) o.classList.add("right");
            });
            if (!ok) b.classList.add("wrong");
            why.innerHTML = `<b class="${ok ? "ok" : "no"}">${ok ? "Correct." : "Not quite."}</b> ${item.why}`;
            answered++; if (ok) correct++; updateScore();
          });
          opts.appendChild(b);
        });
        card.appendChild(opts); card.appendChild(why);
      } else if (item.type === "recall") {
        const ta = el("textarea"); ta.placeholder = "Type from memory, no peeking…";
        const btn = el("button", "reveal", "Reveal & self-check");
        const list = el("div", "checklist");
        btn.addEventListener("click", () => {
          list.innerHTML = item.checklist.map((c) => `<label><input type="checkbox"> ${c}</label>`).join("");
          btn.remove();
        });
        card.appendChild(ta); card.appendChild(btn); card.appendChild(list);
      }
      root.appendChild(card);
    });
    root.appendChild(score);
  });
})();
