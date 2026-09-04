export default function initArcade() {
  const game = document.getElementById("arcade-game");
  const play = document.getElementById("arcade-play");
  const panel = document.getElementById("arcade-panel");
  const input = document.getElementById("arcade-input");
  const problemEl = document.getElementById("arcade-problem");
  const scoreEl = document.getElementById("arcade-score");
  const timeEl = document.getElementById("arcade-time");
  const bestEl = document.getElementById("arcade-best");
  const fill = document.getElementById("arcade-timer-fill");
  const panelTitle = document.getElementById("arcade-panel-title");
  const panelSub = document.getElementById("arcade-panel-sub");
  const startBtn = document.getElementById("arcade-start");
  const saveForm = document.getElementById("arcade-save");
  const saveTitle = document.getElementById("arcade-save-title");
  const saveError = document.getElementById("arcade-save-error");
  const submitBtn = document.getElementById("arcade-submit");
  const nameInput = document.getElementById("arcade-name");
  const emailInput = document.getElementById("arcade-email");
  const skipBtn = document.getElementById("arcade-skip");
  const boardList = document.getElementById("arcade-board-list");
  const boardEmpty = document.getElementById("arcade-board-empty");
  const refreshBtn = document.getElementById("arcade-refresh");
  if (!game || !play || !panel || !input || !startBtn) return;

  /* The API ships with the site as a Vercel function, so this is same-origin
     and needs no host or CORS. Run `vercel dev` locally to serve both. */
  const API = "/api/scores";

  const DURATION = 30000;
  const BEST_KEY = "hopbuilds:arcade-best";
  const NAME_KEY = "hopbuilds:arcade-name";
  const EMAIL_KEY = "hopbuilds:arcade-email";

  let answer = 0;
  let score = 0;
  let endsAt = 0;
  let ticker = null;
  let pendingScore = 0;
  let lowestOnBoard = 0;
  let boardFull = false;
  let highlight = null;

  const readStore = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw;
    } catch (err) {
      return fallback;
    }
  };
  const writeStore = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      /* private mode or blocked storage: value just won't persist */
    }
  };

  const readBest = () => parseInt(readStore(BEST_KEY, "0"), 10) || 0;
  const writeBest = (value) => writeStore(BEST_KEY, String(value));

  let best = readBest();
  if (best) bestEl.textContent = best;

  const showPanel = (which) => {
    panel.hidden = which !== "panel";
    play.hidden = which !== "play";
    saveForm.hidden = which !== "save";
  };

  /* ---------- leaderboard ---------- */

  const renderBoard = (rows) => {
    boardList.textContent = "";
    rows.forEach((row, i) => {
      const li = document.createElement("li");
      const isNew =
        highlight && row.name === highlight.name && row.score === highlight.score;
      li.className = "arcade-row" + (isNew ? " arcade-row-new" : "");

      const rank = document.createElement("span");
      rank.className = "arcade-row-rank";
      rank.textContent = String(i + 1).padStart(2, "0");

      /* textContent, never innerHTML: names come from other players */
      const name = document.createElement("span");
      name.className = "arcade-row-name";
      name.textContent = row.name;

      const points = document.createElement("span");
      points.className = "arcade-row-score";
      points.textContent = row.score;

      li.append(rank, name, points);
      boardList.appendChild(li);
    });
  };

  /* Set once the board has loaded, so a failed fetch does not offer to save
     a score into a leaderboard we cannot reach. */
  let boardReady = false;

  /**
   * Reads a JSON body, or explains what arrived instead. A host that cannot
   * run the function answers with an HTML page, and letting res.json() fail
   * on that produces an unreadable "Unexpected token '<'".
   */
  const readJson = async (res) => {
    const type = res.headers.get("content-type") || "";
    if (!type.includes("application/json")) {
      throw new Error("Leaderboard API is not running at this address.");
    }
    return res.json();
  };

  const loadBoard = async () => {
    try {
      const res = await fetch(API + "?limit=10");

      if (!res.ok) {
        /* Surface what actually went wrong. A 404 means the function is not
           deployed; a 500 usually means the database is unconfigured. Both
           are fixed in the host's settings, so saying so beats a generic
           "could not reach" that sends people hunting through the code. */
        const detail = await res.json().catch(() => null);
        if (detail?.error) throw new Error(detail.error);
        if (res.status === 404) throw new Error("Leaderboard API not found (404).");
        throw new Error("Leaderboard error (" + res.status + ").");
      }

      const rows = await readJson(res);

      boardReady = true;
      boardFull = rows.length >= 10;
      lowestOnBoard = rows.length ? rows[rows.length - 1].score : 0;

      renderBoard(rows);
      boardEmpty.hidden = rows.length > 0;
      if (!rows.length) boardEmpty.textContent = "No scores yet. Be the first on the board.";
    } catch (err) {
      boardReady = false;
      boardList.textContent = "";
      boardEmpty.hidden = false;
      boardEmpty.textContent = err.message || "Could not reach the leaderboard.";
    }
  };

  const qualifies = (value) => value > 0 && (!boardFull || value > lowestOnBoard);

  loadBoard();
  refreshBtn.addEventListener("click", loadBoard);

  const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

  /* zetamac ranges: a+b and a-b over 2..100, a*b and a/b over 2..10 by 2..100 */
  const nextProblem = () => {
    const mode = rand(1, 4);
    let text;
    if (mode === 1) {
      const a = rand(2, 100);
      const b = rand(2, 100);
      answer = a + b;
      text = a + " + " + b;
    } else if (mode === 2) {
      /* addition in reverse, so the answer stays in 2..100 */
      const a = rand(2, 100);
      const b = rand(2, 100);
      answer = b;
      text = a + b + " − " + a;
    } else if (mode === 3) {
      const a = rand(2, 10);
      const b = rand(2, 100);
      answer = a * b;
      text = a + " × " + b;
    } else {
      /* multiplication in reverse, so the division is always exact */
      const a = rand(2, 10);
      const b = rand(2, 100);
      answer = b;
      text = a * b + " ÷ " + a;
    }
    problemEl.textContent = text;
    input.value = "";
  };

  const showResult = () => {
    const isRecord = pendingScore > best;
    if (isRecord) {
      best = pendingScore;
      bestEl.textContent = best;
      writeBest(best);
    }
    panelTitle.textContent =
      pendingScore + (pendingScore === 1 ? " problem." : " problems.");
    panelSub.textContent = isRecord
      ? "New personal best. The bar just moved."
      : "Your best is " + best + ". Run it back.";
    startBtn.textContent = "Play again";
    showPanel("panel");
  };

  const stop = (finished) => {
    clearInterval(ticker);
    ticker = null;
    game.classList.remove("is-urgent");
    fill.style.transform = "scaleX(1)";
    timeEl.textContent = "30";
    pendingScore = score;

    if (!finished) {
      panelTitle.textContent = "30 seconds on the clock.";
      panelSub.textContent =
        "Addition and subtraction to 100, multiplication and division through the 10s.";
      startBtn.textContent = "Start drill";
      showPanel("panel");
      return;
    }

    if (boardReady && qualifies(pendingScore)) {
      saveTitle.textContent =
        pendingScore +
        (pendingScore === 1 ? " problem. " : " problems. ") +
        "You made the board.";
      nameInput.value = readStore(NAME_KEY, "");
      emailInput.value = readStore(EMAIL_KEY, "");
      saveError.hidden = true;
      submitBtn.disabled = false;
      submitBtn.textContent = "Save score";
      showPanel("save");
      nameInput.focus();
      return;
    }

    showResult();
  };

  const tick = () => {
    const left = Math.max(0, endsAt - Date.now());
    timeEl.textContent = Math.ceil(left / 1000);
    fill.style.transform = "scaleX(" + left / DURATION + ")";
    game.classList.toggle("is-urgent", left <= 5000);
    if (left <= 0) stop(true);
  };

  const start = () => {
    score = 0;
    scoreEl.textContent = "0";
    highlight = null;
    showPanel("play");
    endsAt = Date.now() + DURATION;
    nextProblem();
    input.focus();
    tick();
    ticker = setInterval(tick, 100);
  };

  /* zetamac advances the moment the typed value matches, no Enter needed */
  input.addEventListener("input", () => {
    const raw = input.value.replace(/[^0-9-]/g, "");
    if (raw !== input.value) input.value = raw;
    if (raw === "" || raw === "-") return;
    if (Number(raw) === answer) {
      score += 1;
      scoreEl.textContent = score;
      nextProblem();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") stop(false);
  });

  saveForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim().slice(0, 16);
    const email = emailInput.value.trim();
    if (!name) {
      saveError.textContent = "Enter a name first.";
      saveError.hidden = false;
      nameInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
    saveError.hidden = true;

    const payload = { name: name, score: pendingScore };
    if (email) payload.email = email;

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJson(res).catch((err) => {
        if (!res.ok) return {};
        throw err;
      });
      if (!res.ok) throw new Error(data.error || "Could not save (" + res.status + ").");

      writeStore(NAME_KEY, name);
      if (email) writeStore(EMAIL_KEY, email);
      highlight = { name: data.name || name, score: pendingScore };
      await loadBoard();
      showResult();
    } catch (err) {
      saveError.textContent = err.message || "Could not save. Try again.";
      saveError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Save score";
    }
  });

  skipBtn.addEventListener("click", showResult);

  startBtn.addEventListener("click", start);
}
