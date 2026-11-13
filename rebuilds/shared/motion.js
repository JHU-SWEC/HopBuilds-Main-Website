/**
 * Motion shared by the rebuild pages: Lenis smooth scrolling driven from
 * GSAP's ticker, and GSAP ScrollTrigger helpers for staggered reveals,
 * word-by-word headings and scrubbed parallax.
 *
 * Rules every helper keeps:
 * - Under prefers-reduced-motion nothing here runs: native scrolling, no
 *   travel, everything visible. gsap.matchMedia reverts all tweens if the
 *   setting changes while the page is open.
 * - Content is only hidden by a tween that is created by this script, so a
 *   page that fails to load its JS shows everything.
 * - Reveals clear their inline transform/opacity when done, so the page's
 *   own CSS hover and press transforms keep working afterwards.
 * - Parallax never writes `transform`. It marks its targets with
 *   [data-plx] and tweens the custom properties --plx-x / --plx-y / --plx-r,
 *   which each page's CSS maps onto the independent `translate` and `rotate`
 *   properties. That way it composes with the element's own transform, tilt
 *   or CSS animation.
 * - Styles go through the CSSOM (GSAP sets el.style), which the site's CSP
 *   allows; nothing writes a style="" attribute.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

export { gsap, ScrollTrigger, SplitText, CustomEase };

export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Named curves, matching the ui-animation skill's enter / move / expo curves. */
CustomEase.create("enter", "0.22, 1, 0.36, 1");
CustomEase.create("move", "0.25, 1, 0.5, 1");
CustomEase.create("expo", "0.19, 1, 0.22, 1");

/**
 * Smooth scrolling. Lenis runs on GSAP's ticker so ScrollTrigger and the
 * scroll position are read in the same frame. In-page anchor links are
 * handled by Lenis, which already honours the page's CSS
 * scroll-padding-top; `anchorOffset` is only for anything beyond that. Lenis stops while an
 * overlay that locks the page is open (the phone menu, the photo board), so
 * the page underneath cannot drift.
 */
export function initSmoothScroll({ anchorOffset = 0, lockClasses = ["menu-open", "life-board-open"] } = {}) {
  if (reducedMotion()) return null;

  const lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 1,
    anchors: { offset: -anchorOffset },
    autoRaf: false,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  const html = document.documentElement;
  const body = document.body;
  const locked = () =>
    lockClasses.some((c) => body.classList.contains(c) || html.classList.contains(c)) ||
    !!document.querySelector("dialog[open]");
  const sync = () => (locked() ? lenis.stop() : lenis.start());
  const watch = new MutationObserver(sync);
  watch.observe(body, { attributes: true, attributeFilter: ["class"] });
  watch.observe(html, { attributes: true, attributeFilter: ["class"] });
  document.querySelectorAll("dialog").forEach((d) => watch.observe(d, { attributes: true, attributeFilter: ["open"] }));

  /* The skip link must move focus, not just the viewport. */
  document.querySelectorAll('a.skip-link[href^="#"]').forEach((a) => {
    a.addEventListener("click", () => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });

  /* Images and fonts change the page's height after load. */
  addEventListener("load", () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return lenis;
}

/**
 * Runs `setup` only while motion is allowed; everything it creates is
 * reverted if the visitor switches reduced motion on.
 */
export function whenMotion(setup, query = MOTION_OK) {
  const mm = gsap.matchMedia();
  mm.add(query, setup);
  return mm;
}

/**
 * Staggered entrance for a group: its parts rise in one after another when
 * the group reaches the lower part of the screen. Runs once.
 */
export function staggerIn(trigger, targets, {
  y = 40, x = 0, scale = 1, rotate = 0, opacity = 0,
  duration = 0.9, stagger = 0.09, ease = "expo", start = "top 84%", delay = 0,
} = {}) {
  const list = gsap.utils.toArray(targets);
  if (!list.length) return null;
  return gsap.from(list, {
    ...fromVars({ x, y, scale, rotate }), opacity, duration, ease, delay,
    stagger: typeof stagger === "number" ? { each: stagger } : stagger,
    clearProps: "transform,opacity",
    scrollTrigger: { trigger, start, once: true },
  });
}

/* From-values that respect an element's own CSS transform: a rotation is
   added to whatever tilt the element already has, not substituted for it. */
function fromVars({ x = 0, y = 0, scale = 1, rotate = 0 }) {
  const v = {};
  if (x) v.x = x;
  if (y) v.y = y;
  if (scale !== 1) v.scale = scale;
  if (rotate) v.rotation = `+=${rotate}`;
  return v;
}

/**
 * Items that sit in a list or grid enter in batches: whatever crosses the
 * line in the same frame staggers together, later arrivals on arrival.
 */
export function batchIn(targets, { x = 0, y = 50, scale = 1, rotate = 0, stagger = 0.08, duration = 0.85, ease = "expo", start = "top 88%" } = {}) {
  const list = gsap.utils.toArray(targets);
  if (!list.length) return;
  gsap.set(list, { opacity: 0 });
  ScrollTrigger.batch(list, {
    start,
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, { opacity: 1, duration: duration * 0.6, ease: "power1.out", stagger: { each: stagger }, clearProps: "opacity" });
      gsap.from(batch, { ...fromVars({ x, y, scale, rotate }), duration, ease, stagger: { each: stagger }, clearProps: "transform" });
    },
  });
}

/**
 * Headings rise word by word out of a clip. SplitText keeps the heading's
 * accessible name (aria-label on the heading, the word spans aria-hidden).
 */
export function splitWords(targets, { stagger = 0.06, duration = 1, start = "top 86%", ease = "expo" } = {}) {
  gsap.utils.toArray(targets).forEach((el) => {
    const split = SplitText.create(el, { type: "words", mask: "words", wordsClass: "split-word" });
    gsap.from(split.words, {
      yPercent: 115, rotate: 4, duration, ease, stagger,
      scrollTrigger: { trigger: el, start, once: true },
    });
  });
}

/**
 * Scrubbed parallax on one element: it travels from `from` to `to` (px,
 * or any unit for x) while its trigger crosses the screen. Values are
 * deliberately small; the caller picks them per layer.
 */
export function parallax(el, { y = [0, 0], x = [0, 0], r = [0, 0], trigger, start = "top bottom", end = "bottom top", scrub = true } = {}) {
  const unit = (v) => (typeof v === "number" ? `${v}px` : v);
  const list = gsap.utils.toArray(el);
  if (!list.length) return null;
  list.forEach((node) => node.setAttribute("data-plx", ""));
  return gsap.fromTo(
    list,
    { "--plx-x": unit(x[0]), "--plx-y": unit(y[0]), "--plx-r": `${r[0]}deg` },
    {
      "--plx-x": unit(x[1]), "--plx-y": unit(y[1]), "--plx-r": `${r[1]}deg`,
      ease: "none",
      scrollTrigger: { trigger: trigger || list[0], start, end, scrub },
    }
  );
}

/** Numbers roll from 0 to their value once they are on screen. */
export function countUp(targets) {
  gsap.utils.toArray(targets).forEach((el) => {
    const target = Number(el.dataset.count);
    const state = { v: 0 };
    gsap.to(state, {
      v: target, duration: 1.4, ease: "power3.out",
      onUpdate: () => { el.textContent = String(Math.round(state.v)); },
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });
}

/**
 * Magnetic pull with GSAP: the element leans toward a mouse pointer that is
 * near it and springs back (elastic) when the pointer leaves. Mouse only;
 * touch and keyboard focus never move it. Writes `translate` (via
 * --mag-x/--mag-y on the page's [data-magnetic] rule) so it composes with
 * the button's own hover and press transforms.
 */
export function magnetic(targets, { reach = 56, pull = 0.35, max = 14 } = {}) {
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  if (!fine.matches) return;
  /* The offset lives in a plain object; onUpdate copies it to the element.
     The elastic ease gives the pull its spring and the release its overshoot. */
  const items = gsap.utils.toArray(targets).map((el) => {
    const s = { x: 0, y: 0 };
    const write = () => {
      el.style.setProperty("--mag-x", `${s.x.toFixed(2)}px`);
      el.style.setProperty("--mag-y", `${s.y.toFixed(2)}px`);
    };
    const opts = { duration: 0.9, ease: "elastic.out(1, 0.4)", onUpdate: write };
    return { el, s, x: gsap.quickTo(s, "x", opts), y: gsap.quickTo(s, "y", opts), near: false };
  });
  const home = (m) => {
    m.near = false;
    m.x(0);
    m.y(0);
  };
  const clamp = gsap.utils.clamp(-max, max);
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    items.forEach((m) => {
      const r = m.el.getBoundingClientRect();
      /* the rect includes the current offset; aim from the resting centre */
      const cx = r.left + r.width / 2 - m.s.x;
      const cy = r.top + r.height / 2 - m.s.y;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const inside = Math.abs(dx) < r.width / 2 + reach && Math.abs(dy) < r.height / 2 + reach;
      if (inside) {
        m.near = true;
        m.x(clamp(dx * pull));
        m.y(clamp(dy * pull));
      } else if (m.near) {
        home(m);
      }
    });
  }, { passive: true });
  const releaseAll = () => items.forEach((m) => m.near && home(m));
  document.documentElement.addEventListener("pointerleave", releaseAll);
  addEventListener("blur", releaseAll);
}
