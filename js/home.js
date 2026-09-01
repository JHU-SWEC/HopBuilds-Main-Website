/* HopBuilds homepage — Lenis smooth scroll + GSAP scroll choreography.
   Everything degrades gracefully: content is fully visible without JS,
   pins/reveals only run on desktop with motion allowed. */

(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= hero terminal ================= */
  (function initTerminal() {
    const term = document.querySelector(".hero-terminal");
    const linesEl = document.getElementById("term-lines");
    const input = document.getElementById("term-input");
    if (!term || !linesEl || !input) return;

    const FORM_URL =
      "https://docs.google.com/forms/d/e/1FAIpQLScCDca0vhUvHgQoS_NWhagKkoFUA1jHvasKyQlkR4wZK1cF2w/viewform?usp=dialog";
    const MAX_LINES = 10;
    let userActive = false;

    const trim = () => {
      while (linesEl.children.length > MAX_LINES) linesEl.removeChild(linesEl.firstChild);
    };

    const printOut = (text) => {
      const div = document.createElement("div");
      div.className = "term-line term-out";
      div.textContent = text;
      linesEl.appendChild(div);
      trim();
    };

    const printCmd = (cmd) => {
      const div = document.createElement("div");
      div.className = "term-line";
      const p = document.createElement("span");
      p.className = "term-prompt";
      p.textContent = "hopbuilds@jhu % ";
      const c = document.createElement("span");
      c.textContent = cmd;
      div.append(p, c);
      linesEl.appendChild(div);
      trim();
    };

    const COMMANDS = {
      help: () => [
        "help       : this menu",
        "projects   : what we're shipping",
        "join       : apply to hopbuilds",
        "whoami     : ?",
        "clear      : clean slate",
      ],
      projects: () => [
        "lost@jhu       · live · lostatjhu.org",
        "hopparlays     · in progress",
        "jhu-rideshare  · in progress",
        "club-board     · in progress",
      ],
      join: () => {
        window.open(FORM_URL, "_blank", "noopener");
        return ["opening the application form…"];
      },
      whoami: () => ["future hopbuilds member"],
      madooei: () => ["professor madooei: mentor, course-credit-granter, legend."],
      clear: () => {
        linesEl.innerHTML = "";
        return [];
      },
    };

    const run = (raw) => {
      const cmd = raw.trim().toLowerCase();
      if (!cmd) return;
      printCmd(raw.trim());
      if (COMMANDS[cmd]) {
        COMMANDS[cmd]().forEach(printOut);
      } else if (cmd.startsWith("sudo")) {
        printOut("[sudo] password for jay:");
        printOut("just kidding, you're in.");
      } else {
        printOut(`command not found: ${cmd}, try 'help'`);
      }
    };

    input.addEventListener("keydown", (e) => {
      userActive = true;
      if (e.key === "Enter") {
        run(input.value);
        input.value = "";
      }
    });
    input.addEventListener("focus", () => {
      userActive = true;
    });
    term.addEventListener("click", () => input.focus());

    printOut("welcome to hopbuilds.sh, built at 3410 N Charles St.");

    /* auto-type 'help' once as a demo, unless the visitor beats us to it */
    if (reduceMotion) {
      COMMANDS.help().forEach(printOut);
      return;
    }
    const demo = "help";
    let i = 0;
    const typeNext = () => {
      if (userActive) return;
      if (i < demo.length) {
        input.value += demo[i++];
        setTimeout(typeNext, 140 + Math.random() * 120);
      } else {
        setTimeout(() => {
          if (userActive) return;
          run(input.value);
          input.value = "";
        }, 420);
      }
    };
    setTimeout(typeNext, 1600);
  })();

  /* ================= bonus round: 30-second math drill ================= */
  (function initArcade() {
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

    const loadBoard = async () => {
      try {
        const res = await fetch(API + "?limit=10");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const rows = await res.json();

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
        boardEmpty.textContent = "Could not reach the leaderboard.";
      }
    };

    const qualifies = (value) => value > 0 && (!boardFull || value > lowestOnBoard);

    loadBoard();
    refreshBtn.addEventListener("click", loadBoard);

    const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

    /* zetamac ranges: a+b and a-b over 2..100, a*b and a/b over 2..12 by 2..100 */
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
        const a = rand(2, 12);
        const b = rand(2, 100);
        answer = a * b;
        text = a + " × " + b;
      } else {
        /* multiplication in reverse, so the division is always exact */
        const a = rand(2, 12);
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
          "Addition and subtraction to 100, multiplication and division through the 12s.";
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
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "HTTP " + res.status);

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
  })();

  /* ---------- Lenis smooth scroll ---------- */
  if (typeof Lenis !== "undefined" && !reduceMotion) {
    const lenis = new Lenis();
    lenis.on("scroll", () => {
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.update();
    });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- nav state + progress bar (all viewports) ---------- */
  const nav = document.querySelector(".site-nav");
  ScrollTrigger.create({
    start: 40,
    onUpdate: (self) => nav.classList.toggle("is-scrolled", self.scroll() > 40),
    onEnter: () => nav.classList.add("is-scrolled"),
    onLeaveBack: () => nav.classList.remove("is-scrolled"),
  });

  gsap.to(".progress-bar", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 },
  });

  if (reduceMotion) return;

  /* ---------- hero intro ---------- */
  gsap.from(".hero-title-line", {
    yPercent: 60,
    opacity: 0,
    duration: 0.9,
    stagger: 0.12,
    ease: "power3.out",
  });
  gsap.from(".hero-eyebrow, .hero-tagline, .hero-actions", {
    y: 24,
    opacity: 0,
    duration: 0.8,
    stagger: 0.1,
    delay: 0.35,
    ease: "power2.out",
  });
  gsap.from(".hero-terminal", {
    y: 48,
    opacity: 0,
    scale: 0.96,
    duration: 1,
    delay: 0.55,
    ease: "power3.out",
  });

  const mm = gsap.matchMedia();

  /* ---------- desktop: pinned story chapter ---------- */
  mm.add("(min-width: 768px)", () => {
    const lines = gsap.utils.toArray(".story-line");
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".story",
        start: "top top",
        end: "+=180%",
        pin: true,
        scrub: 0.6,
      },
    });

    lines.forEach((line) => {
      tl.from(line, { y: 60, opacity: 0, duration: 1, ease: "power2.out" }).to(
        {},
        { duration: 0.5 } /* hold */
      );
    });
    tl.from(".story-detail", { y: 40, opacity: 0, duration: 1, ease: "power2.out" });
  });

  /* ---------- desktop: pinned horizontal project gallery ---------- */
  mm.add("(min-width: 768px)", () => {
    const track = document.querySelector(".builds-track");
    const cards = gsap.utils.toArray(".build-card");
    const counter = document.querySelector(".builds-counter");
    const progressFill = document.querySelector(".builds-progress-fill");
    if (!track || !cards.length) return;

    const getDistance = () => track.scrollWidth - window.innerWidth + track.offsetLeft;

    gsap.to(track, {
      x: () => -getDistance(),
      ease: "none",
      scrollTrigger: {
        trigger: ".builds",
        start: "top top",
        end: () => "+=" + getDistance(),
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          gsap.set(progressFill, { scaleX: self.progress });
          const idx = Math.min(cards.length, Math.round(self.progress * (cards.length - 1)) + 1);
          counter.textContent = String(idx).padStart(2, "0");
        },
      },
    });
  });

  /* ---------- gains: headlines fill with ink, annotations draw in ---------- */
  gsap.utils.toArray(".gain-row").forEach((row) => {
    const fill = row.querySelector(".gain-line-fill");

    gsap.fromTo(
      fill,
      { clipPath: "inset(0 100% 0 0)" },
      {
        clipPath: "inset(0 0% 0 0)",
        ease: "none",
        scrollTrigger: { trigger: row, start: "top 78%", end: "top 32%", scrub: true },
      }
    );

    gsap.from(row.querySelector(".gain-leader"), {
      scaleX: 0,
      transformOrigin: "left center",
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: { trigger: row, start: "top 58%" },
    });

    gsap.from(row.querySelectorAll(".gain-kicker, .gain-note-copy"), {
      x: 32,
      opacity: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: "back.out(1.4)",
      scrollTrigger: { trigger: row, start: "top 58%" },
    });
  });

  /* ---------- shared reveals (desktop + mobile) ---------- */
  const reveal = (targets, opts = {}) => {
    gsap.utils.toArray(targets).forEach((el) => {
      gsap.from(el, {
        y: 48,
        opacity: 0,
        duration: 0.9,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
        ...opts,
      });
    });
  };

  reveal(".builds-head, .gains .section-title, .join-head, .role-card, .arcade-head, .arcade-game");

  /* mobile: story lines reveal in normal flow instead of pinning */
  mm.add("(max-width: 767px)", () => {
    reveal(".story-line, .story-detail");
  });

  /* ---------- social photo parallax ---------- */
  gsap.to(".social-media img", {
    yPercent: -12,
    ease: "none",
    scrollTrigger: { trigger: ".social", start: "top bottom", end: "bottom top", scrub: true },
  });
  gsap.from(".social-title, .social-copy", {
    y: 40,
    opacity: 0,
    duration: 0.9,
    stagger: 0.12,
    ease: "power2.out",
    scrollTrigger: { trigger: ".social-overlay", start: "top 80%" },
  });
})();
