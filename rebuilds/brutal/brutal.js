/**
 * Entry for the "brutal" rebuild. The functional widgets are the site's own
 * modules, found by id/class; everything else here is this variant's motion.
 *
 * Motion is GSAP (ScrollTrigger, SplitText) with Lenis smooth scrolling, set
 * up through ../shared/motion.js. Every effect leaves the page complete when
 * it cannot run (no script, reduced motion, coarse pointer, missing API). Dynamic styles go through
 * the CSSOM (el.style.x / setProperty), which the site's CSP allows; nothing
 * writes a style="" attribute.
 */
import initTerminal from "../../js/terminal.js";
import initArcade from "../../js/arcade.js";
import initLifeBoard from "../../js/life-board.js";

import {
  gsap, SplitText, whenMotion, batchIn, splitWords, parallax, countUp,
} from "../shared/motion.js";
import { startChrome, safely } from "./chrome.js";

/* ---------- hero entrance (load-time, never waits for scroll) ---------- */
const heroIntro = () => {
  const title = SplitText.create(".hero-title", { type: "words", wordsClass: "split-word" });
  const tl = gsap.timeline({ defaults: { ease: "expo" } });
  tl.from(".hero .tag", { x: -40, rotation: "-=8", opacity: 0, duration: 0.7, clearProps: "transform,opacity" }, 0.05)
    .from(title.words, {
      y: 90, rotation: "-=10", opacity: 0, duration: 0.9, ease: "back.out(2.2)",
      stagger: 0.07,
    }, 0.12)
    .from(".hero-title .hl", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.7, ease: "back.out(1.6)", clearProps: "transform" }, 0.35)
    .from(".hero-lead", { y: 30, opacity: 0, duration: 0.8, clearProps: "transform,opacity" }, 0.45)
    .from(".hero-actions > .btn", { y: 40, scale: 0.85, opacity: 0, duration: 0.7, ease: "back.out(2)", stagger: 0.1, clearProps: "transform,opacity" }, 0.55)
    .from(".hero-stats > div", { y: 70, rotation: "+=6", opacity: 0, duration: 0.8, ease: "back.out(1.8)", stagger: 0.09, clearProps: "transform,opacity" }, 0.65)
    .from(".hero-stage", { scale: 0.86, rotation: "-=6", opacity: 0, duration: 0.9, ease: "back.out(1.5)", clearProps: "transform,opacity" }, 0.3)
    .from(".hero-stage .sticker, .hero-stage .sticker-jay", { scale: 0, rotation: "-=40", duration: 0.7, ease: "back.out(2.4)", stagger: 0.12, clearProps: "transform" }, 0.8)
    .from(".hero .shape", { scale: 0, rotation: "+=90", duration: 1, ease: "back.out(1.4)", stagger: 0.1, clearProps: "transform" }, 0.4);
};

/* ---------- staggered scroll ----------
   Section titles rise word by word. Everything else marked [data-s] enters
   in batches: parts that cross the line together stagger in sequence, later
   arrivals on arrival. [data-s="pop"] parts (stat tiles, tags, network
   nodes) pop and twist instead of rising. Runs once. */
const TITLES = "h2.title, .statement, .cta-title";
const initScrollMotion = () => {
  whenMotion(() => {
    heroIntro();
    splitWords(TITLES, { stagger: 0.07 });

    const parts = gsap.utils.toArray("[data-s]").filter((el) => !el.matches(TITLES));
    batchIn(parts.filter((el) => el.dataset.s !== "pop"), { y: 70, stagger: 0.1, ease: "expo" });
    batchIn(parts.filter((el) => el.dataset.s === "pop"), { y: 30, scale: 0.55, rotate: -10, stagger: 0.09, ease: "back.out(2)", duration: 0.8 });

    /* lists inside cards ripple in after their card */
    batchIn(".alumni-logos li", { y: 30, scale: 0.8, stagger: 0.06, ease: "back.out(1.8)" });
    batchIn(".perks > li .perk-icon, .role .role-icon", { scale: 0, rotate: -30, stagger: 0.1, ease: "back.out(2.4)", start: "top 92%" });

    countUp("[data-count]");
  });

  /* ---------- controlled parallax ----------
     Bounded, decorative or whole-block layers only, never under text that is
     being read. Full travel on wide screens; on phones half the travel and
     no sideways moves (the page must never get wider than the screen). */
  const layers = (k, { sideways = false, wide = false } = {}) => () => {
    parallax(".hero .plx-slow", { y: [-50 * k, 60 * k], r: [-6, 6] });
    parallax(".hero .plx-mid", { y: [40 * k, -50 * k], r: [8, -8] });
    parallax(".hero .plx-fast", { y: [90 * k, -90 * k], r: [-14, 14] });

    parallax(".plx-img", { y: [-18 * k, 18 * k] });
    if (sideways) {
      parallax(".ftr-tape .plx-x", { x: ["-8vw", "8vw"] });
    }

    parallax(".life .plx-fast", { y: [100 * k, -100 * k], r: [-30, 30] });
    parallax(".life-photo", { y: [60 * k, -60 * k], r: [-3, 3] });
    /* the mentorship orbit turns on its own (CSS), so its nodes get no scroll parallax */
    parallax(".sponsor", { y: [50 * k, -30 * k] });

    parallax(".cta .plx-slow", { y: [-60 * k, 60 * k], r: [-20, 20] });
    parallax(".cta .plx-fast", { y: [90 * k, -90 * k], r: [30, -30] });
    parallax(".plx-rise", { y: ["46%", "0%"], trigger: ".ftr-giant", start: "top bottom", end: "bottom bottom" });

    /* Side-by-side layouts only: these move blocks that sit next to each
       other, so different speeds can never push one into another. */
    if (!wide) return;
    const hero = { trigger: ".hero", start: "top top", end: "bottom top" };
    parallax(".hero-stage", { y: [0, -90], ...hero });
    parallax(".hero-text", { y: [0, -40], ...hero });
    gsap.utils.toArray(".step").forEach((step, i) =>
      parallax(step, { y: [30 + i * 22, -(30 + i * 22)], trigger: ".steps" })
    );
    gsap.utils.toArray(".role").forEach((role, i) =>
      parallax(role, { y: [i * 40, -i * 30], trigger: ".roles" })
    );
    gsap.utils.toArray(".ftr-key").forEach((key, i) =>
      parallax(key, { y: [40 + i * 30, 0], trigger: ".ftr", start: "top bottom", end: "top 30%" })
    );
  };
  /* "Shipped for campus": while the line is on screen, one whole phrase
     slides past, so "campus" always comes through. The travel is the
     phrase's measured width (it depends on the font size, so it is
     re-measured on resize), over only the scroll during which the line is
     visible. Runs at every width; the line is clipped by .bigtype. */
  whenMotion(() => {
    const line = document.querySelector(".bigtype .plx-x");
    const text = line?.firstChild;
    if (!text || text.nodeType !== Node.TEXT_NODE) return;
    const phraseWidth = () => {
      const end = text.data.indexOf("\u2022");
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, end > 0 ? end + 1 : text.data.length);
      return range.getBoundingClientRect().width + parseFloat(getComputedStyle(line).fontSize) * 0.3;
    };
    line.setAttribute("data-plx", "");
    gsap.fromTo(line, { "--plx-x": "0px" }, {
      "--plx-x": () => `${-phraseWidth()}px`,
      ease: "none",
      scrollTrigger: { trigger: line, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
    });
  });

  const motionOk = "(prefers-reduced-motion: no-preference)";
  whenMotion(layers(1, { sideways: true, wide: true }), `${motionOk} and (min-width: 1040px)`);
  whenMotion(layers(1, { sideways: true }), `${motionOk} and (min-width: 768px) and (max-width: 1039px)`);
  whenMotion(layers(0.5), `${motionOk} and (max-width: 767px)`);
};

startChrome();

const initProjectTerminal = () =>
  initTerminal({
    extraProjects: [["barkoff", "in progress"], ["slopkins", "in progress"]],
    extraCommands: {
      "our team": {
        help: "meet the people",
        aliases: ["team", "ourteam", "our-team"],
        run: () => {
          setTimeout(() => location.assign("./team.html"), 450);
          return ["opening the team page…"];
        },
      },
    },
  });

[initProjectTerminal, initArcade, initLifeBoard, initScrollMotion].forEach(safely);
