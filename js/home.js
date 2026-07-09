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
        "help       — this menu",
        "projects   — what we're shipping",
        "join       — apply to hopbuilds",
        "whoami     — ?",
        "clear      — clean slate",
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
        printOut("just kidding — you're in.");
      } else {
        printOut(`command not found: ${cmd} — try 'help'`);
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

    printOut("welcome to hopbuilds.sh — built at 3410 N Charles St.");

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

  reveal(".builds-head, .gains .section-title, .join-head, .role-card");

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
