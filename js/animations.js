import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

/* Dev-only devtools shim: ScrollTrigger is no longer a `window` global once
   it's an ES module import. Dead-code-eliminated in production builds. */
if (import.meta.env.DEV) window.ScrollTrigger = ScrollTrigger;

export default function initAnimations() {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Lenis smooth scroll ---------- */
  if (typeof Lenis !== "undefined" && !reduceMotion) {
    const lenis = new Lenis();
    lenis.on("scroll", () => {
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.update();
    });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

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
  // These MUST be fromTo, not from. The hero from-state lives in CSS
  // (css/home/redesign.css, the @media (prefers-reduced-motion: no-preference)
  // block after the base .hero-terminal rule) to prevent a flash of the final
  // layout before this deferred module script runs. gsap.from() would animate
  // TO the element's current computed state -- which that CSS has set to
  // opacity: 0 -- leaving the hero permanently invisible. Explicit end values
  // below are what actually reveal it. Keep the start values here in sync with
  // that CSS block by hand; nothing enforces it.
  gsap.fromTo(
    ".hero-title-line",
    { yPercent: 60, opacity: 0 },
    {
      yPercent: 0,
      opacity: 1,
      duration: 0.9,
      stagger: 0.12,
      ease: "power3.out",
    }
  );
  gsap.fromTo(
    ".hero-eyebrow, .hero-tagline, .hero-actions",
    { y: 24, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.8,
      stagger: 0.1,
      delay: 0.35,
      ease: "power2.out",
    }
  );
  gsap.fromTo(
    ".hero-terminal",
    { y: 48, opacity: 0, scale: 0.96 },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 1,
      delay: 0.55,
      ease: "power3.out",
    }
  );

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
}
