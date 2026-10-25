(function () {
  "use strict";
  const C = window.FIFER_CONFIG;
  const $ = (id) => document.getElementById(id);
  const LS_KEY = "fifer.v1";
  const DAY_MS = 86400000;

  // ---------- date helpers (everyone shares the IST calendar day) ----------
  function istDateKey(d = new Date()) {
    const ist = new Date(d.getTime() + 330 * 60000);
    return ist.toISOString().slice(0, 10);
  }
  function dayIndex(key) { return Math.round(Date.parse(key + "T00:00:00Z") / DAY_MS); }
  function quizNumber(key) { return dayIndex(key) - dayIndex(C.LAUNCH_DATE) + 1; }

  // ---------- deterministic RNG ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Pick questions: the bank is shuffled once per "cycle" (seeded), and each day
  // takes the next N, so there are no repeats until the whole bank is used.
  function pickForDate(questions, key) {
    const n = C.QUESTIONS_PER_DAY;
    const sorted = questions.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
    const perCycle = Math.floor(sorted.length / n);
    const idx = Math.max(0, dayIndex(key) - dayIndex(C.LAUNCH_DATE));
    const cycle = Math.floor(idx / perCycle), slot = idx % perCycle;
    const order = shuffle(sorted, mulberry32(9173 + cycle * 7919));
    const rnd = mulberry32(dayIndex(key));
    return order.slice(slot * n, slot * n + n).map((q) => ({ ...q, options: shuffle(q.options, rnd) }));
  }

  // ---------- storage ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
  }
  function save(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) {} }
  function state() {
    const s = load();
    s.history = s.history || {};   // dateKey -> {score, marks:[1,0,...], answers:[...]}
    s.streak = s.streak || 0; s.maxStreak = s.maxStreak || 0; s.last = s.last || null;
    return s;
  }
  function currentStreak(s, today) {
    if (!s.last) return 0;
    const gap = dayIndex(today) - dayIndex(s.last);
    return gap <= 1 ? s.streak : 0;
  }

  // ---------- UI ----------
  const today = istDateKey();
  const qNo = quizNumber(today);
  let todays = [], i = 0, marks = [], answers = [];

  function show(id) { ["intro", "quiz", "result"].forEach((x) => $(x).classList.toggle("hidden", x !== id)); }

  function renderBalls() {
    $("ballTrack").innerHTML = todays.map((_, k) =>
      `<span class="b ${k < marks.length ? (marks[k] ? "ok" : "no") : k === i ? "cur" : ""}"></span>`).join("");
  }

  function renderQ() {
    const q = todays[i];
    $("qNum").textContent = `Ball ${i + 1} of ${todays.length}`;
    $("qCat").textContent = q.category;
    $("qText").textContent = q.question;
    $("fact").classList.add("hidden");
    $("btnNext").classList.add("hidden");
    const box = $("options"); box.innerHTML = "";
    q.options.forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "opt"; b.textContent = opt;
      b.addEventListener("click", () => choose(b, opt));
      box.appendChild(b);
    });
    renderBalls();
  }

  function choose(btn, opt) {
    const q = todays[i];
    const ok = opt === q.answer;
    marks.push(ok ? 1 : 0); answers.push(opt);
    [...$("options").children].forEach((b) => {
      b.disabled = true;
      if (b.textContent === q.answer) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    $("fact").textContent = (ok ? "✅ Correct. " : "❌ Not quite. ") + (q.fact || "");
    $("fact").classList.remove("hidden");
    $("btnNext").textContent = i === todays.length - 1 ? "See result →" : "Next ball →";
    $("btnNext").classList.remove("hidden");
    renderBalls();
    // Save progress after every answer so a refresh can't be used to retry.
    const s = state(); s.inProgress = { date: today, marks, answers }; save(s);
  }

  function finish() {
    const s = state();
    const score = marks.reduce((a, b) => a + b, 0);
    if (!s.history[today]) {
      s.history[today] = { score, marks, answers, n: qNo };
      const prev = currentStreak(s, today);
      s.streak = s.last === today ? s.streak : prev + 1;
      s.maxStreak = Math.max(s.maxStreak, s.streak);
      s.last = today;
    }
    delete s.inProgress; save(s);
    renderResult(s.history[today], s);
  }

  function shareText(rec, s) {
    const grid = rec.marks.map((m) => (m ? "🟩" : "🟥")).join("");
    const title = rec.score === 5 ? "FIFER! 🏆" : rec.score === 0 ? "Golden duck 🦆" : `${rec.score}/5`;
    const url = C.SITE_URL || location.href.split("#")[0].split("?")[0];
    return `🏏 Fifer Cricket Quiz #${rec.n || qNo}: ${title}\n${grid}\n🔥 Streak: ${currentStreak(s, today)}\n\nPlay today's quiz: ${url}\nvia @${C.X_HANDLE}`;
  }

  function renderResult(rec, s) {
    show("result");
    $("resLabel").textContent = `Quiz #${rec.n || qNo} · ${today}`;
    const titles = ["Golden duck 🦆", "Edged it 😬", "Decent spell", "Good spell 👏", "Four-fer! 🔥", "FIFER! 🏆"];
    $("resTitle").textContent = `${rec.score}/5: ${titles[rec.score]}`;
    $("resGrid").innerHTML = rec.marks.map((m) => `<span class="${m ? "ok" : "no"}">${m ? "🟩" : "🟥"}</span>`).join("");
    $("resMsg").textContent = `🔥 Current streak: ${currentStreak(s, today)} · Best: ${s.maxStreak}`;
    $("review").innerHTML = todays.map((q, k) =>
      `<details><summary>${rec.marks[k] ? "✅" : "❌"} ${esc(q.question)}</summary><p><b>${esc(q.answer)}</b>. ${esc(q.fact || "")}</p></details>`).join("");
    tickNext();
  }

  function esc(t) { return String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function tickNext() {
    const now = new Date();
    const nextUtc = Date.parse(istDateKey(now) + "T00:00:00Z") + DAY_MS - 330 * 60000;
    const ms = Math.max(0, nextUtc - now.getTime());
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    $("nextIn").textContent = `Next quiz in ${h}h ${m}m (midnight IST)`;
  }

  function openStats() {
    const s = state();
    const recs = Object.values(s.history);
    const played = recs.length;
    const total = recs.reduce((a, r) => a + r.score, 0);
    $("sPlayed").textContent = played;
    $("sAvg").textContent = played ? (total / played).toFixed(1) : "0";
    $("sStreak").textContent = currentStreak(s, today);
    $("sMax").textContent = s.maxStreak;
    $("sFifers").textContent = recs.filter((r) => r.score === 5).length;
    const dist = [0, 0, 0, 0, 0, 0]; recs.forEach((r) => dist[r.score]++);
    const max = Math.max(1, ...dist);
    $("dist").innerHTML = dist.map((c, k) =>
      `<div class="bar"><span>${k}</span><i style="width:${Math.max(8, (c / max) * 100)}%">${c}</i></div>`).join("");
    const d = $("statsDlg");
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
  }

  async function share(rec) {
    const text = shareText(rec, state());
    window.open("https://x.com/intent/post?text=" + encodeURIComponent(text), "_blank", "noopener");
  }

  async function init() {
    $("btnMyStats").addEventListener("click", openStats);
    $("btnPro").addEventListener("click", () => $("proNote").classList.remove("hidden"));
    if (C.SUPPORT_URL) { $("supportLink").href = C.SUPPORT_URL; $("supportLink").target = "_blank"; }
    $("quizLabel").textContent = `Daily quiz #${qNo} · ${today}`;
    let data;
    try {
      const res = await fetch("data/questions.json", { cache: "no-cache" });
      data = await res.json();
    } catch (e) {
      $("btnStart").textContent = "Could not load questions. Refresh to retry.";
      console.error(e); return;
    }
    todays = pickForDate(data.questions, today);
    const s = state();
    $("streakIntro").textContent = `🔥 Streak: ${currentStreak(s, today)}`;
    const done = s.history[today];
    $("btnShare").addEventListener("click", () => share(state().history[today]));
    $("btnCopy").addEventListener("click", async () => {
      const t = shareText(state().history[today], state());
      try { await navigator.clipboard.writeText(t); $("btnCopy").textContent = "Copied ✓"; }
      catch (e) { prompt("Copy your result:", t); }
    });
    $("btnNext").addEventListener("click", () => { i++; if (i >= todays.length) finish(); else renderQ(); });
    if (done) { $("btnStart").disabled = false; $("btnStart").textContent = "See today's result"; $("btnStart").onclick = () => renderResult(done, s); return; }
    // Resume an attempt that was interrupted (answers already locked in).
    if (s.inProgress && s.inProgress.date === today) { marks = s.inProgress.marks; answers = s.inProgress.answers; i = marks.length; }
    $("btnStart").disabled = false;
    $("btnStart").textContent = i ? "Resume quiz →" : "Start today's quiz →";
    $("btnStart").onclick = () => { if (i >= todays.length) return finish(); show("quiz"); renderQ(); };
  }

  // Expose for tests
  window.__fifer = { pickForDate, istDateKey, quizNumber };
  init();
})();
