/**
 * Entry script for the "watts" rebuild.
 *
 * The working widgets (terminal, drill, photo board) are the site's existing
 * modules. Motion is GSAP (ScrollTrigger, SplitText) with Lenis smooth
 * scrolling, set up through ../shared/motion.js; the hero sky is Vanta
 * clouds, loaded after the page is interactive.
 *
 * Rules this file keeps:
 * - Nothing is hidden unless this script is running AND motion is allowed;
 *   under reduced motion no tween is created and Lenis/Vanta never start.
 * - Dynamic styles go through the CSSOM (GSAP, style.setProperty) or WAAPI;
 *   the production CSP forbids style="" attributes.
 * - Pointer-driven effects are fine-pointer only and never touch keyboard focus.
 */
import initTerminal from "../../js/terminal.js";
import initArcade from "../../js/arcade.js";
import initLifeBoard from "../../js/life-board.js";
import {
  gsap, whenMotion, initSmoothScroll, staggerIn, batchIn, splitWords,
  parallax, countUp, magnetic, reducedMotion,
} from "../shared/motion.js";

const root = document.documentElement;
const reduced = reducedMotion();
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const hasIO = "IntersectionObserver" in window;

root.classList.add("js");

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* ---------- hero: intro timeline ----------
   The wordmark's letters rise from below the card, overshoot upward and
   bounce down into place, one after another. Resolves when it has played, so
   heavy work (the WebGL sky) can wait instead of stealing its frames. */
let introDone;
const introFinished = new Promise((resolve) => { introDone = resolve; });

const heroIntro = () => {
  const letters = gsap.utils.toArray(".hero__word span");
  const tl = gsap.timeline({ defaults: { ease: "expo" }, onComplete: () => introDone() });
  tl.from(".hero__media", { scale: 1.12, duration: 2.4 }, 0)
    .from(".hero .line-in", { yPercent: 110, duration: 1.1, stagger: 0.09 }, 0.1)
    .from(".hero__lead, .hero__actions > *", { y: 28, opacity: 0, duration: 1, stagger: 0.1, ease: "enter", clearProps: "transform,opacity" }, 0.45)
    .set(letters, { yPercent: 125, opacity: 0 }, 0)
    .to(letters, {
      keyframes: [
        { yPercent: -34, opacity: 1, duration: 0.42, ease: "power3.out" },
        { yPercent: 0, duration: 0.8, ease: "bounce.out" },
      ],
      stagger: 0.075,
    }, 0.55);
  return tl;
};

/* ---------- staggered scroll + parallax ---------- */

/* Repeated items enter in batches as they reach the screen (not as part of
   their section's sequence), so a row of cards ripples in. */
const BATCHED = ".pcard, .proof__logos li, .role, .lcard, .ftr__list li, .ftr__social li, .stats > div";
const SPLIT = "main h2.animate, .ftr__title";

const initScrollMotion = () => {
  whenMotion(() => {
    heroIntro();

    /* headings rise word by word */
    splitWords(SPLIT);
    splitWords(".values__title");

    /* every section's remaining parts enter in order, 100ms apart */
    gsap.utils.toArray(".js-animate").forEach((group) => {
      const parts = [...group.querySelectorAll(".animate")].filter(
        (el) => !el.matches(BATCHED) && !el.matches(SPLIT)
      );
      staggerIn(group, parts, { y: 48, stagger: 0.1 });
    });

    batchIn(".pcard", { y: 90, rotate: 3, stagger: 0.12 });
    batchIn(".proof__logos li", { y: 30, scale: 0.85, stagger: 0.06 });
    batchIn(".role", { y: 80, stagger: 0.12 });
    batchIn(".lcard", { y: 70, stagger: 0.09 });
    batchIn(".stats > div", { y: 40, stagger: 0.1 });
    batchIn(".ftr__list li, .ftr__social li", { y: 24, stagger: 0.05 });

    /* mentor chips pop from nothing, in a scattered order */
    staggerIn(".values", ".values__chip", {
      y: 0, scale: 0, opacity: 1, duration: 1.3, ease: "back.out(1.8)",
      stagger: { each: 0.12, from: "random" }, start: "top 70%",
    });

    countUp("[data-count]");
  });

  /* Parallax: full travel on wide screens, half on phones, none under reduced motion. */
  const scrollParallax = (k) => () => {
    const hero = { trigger: ".hero", start: "top top", end: "bottom top" };
    parallax(".hero__content", { y: [0, -110 * k], ...hero });
    parallax(".hero__word", { y: [0, 80 * k], ...hero });
    parallax(".hero__media", { y: [0, 140 * k], ...hero });

    parallax(".chip--live", { y: [50 * k, -50 * k], trigger: ".feature" });
    parallax(".chip--type", { y: [-30 * k, 60 * k], trigger: ".feature" });
    parallax(".feature__jay", { y: [70 * k, -50 * k], trigger: ".feature" });

    gsap.utils.toArray(".pcard__image img").forEach((img) =>
      parallax(img, { y: [-26 * k, 26 * k], trigger: img.closest(".pcard") })
    );

    gsap.utils.toArray(".values__chip > span").forEach((chip) => {
      const d = Number(chip.parentElement.dataset.depth) || 16;
      parallax(chip, { y: [d * 2.4 * k, -d * 2.4 * k], trigger: ".values" });
    });

    parallax(".perks__deco", { y: [90 * k, -90 * k], r: [-14, 14], trigger: ".perks" });
    parallax(".perks__wheel", { r: [-24, 24], trigger: ".perks" });
    parallax(".proof__visa img", { y: [30 * k, -30 * k], trigger: ".proof" });

    const depth = { near: 200, mid: 110, far: 50 };
    gsap.utils.toArray(".cut").forEach((cut, i) => {
      const d = depth[cut.dataset.depth] ?? 80;
      parallax(cut, { y: [d * k, -d * k], r: [i % 2 ? -10 : 10, i % 2 ? 10 : -10], trigger: ".roles" });
    });
    gsap.utils.toArray(".roles__title > span").forEach((line, i) => {
      const dir = i % 2 ? -1 : 1;
      parallax(line, { x: [`${dir * -6 * k}vw`, `${dir * 4 * k}vw`], trigger: ".roles" });
    });

    gsap.utils.toArray(".lcard--photo img").forEach((img) =>
      parallax(img, { y: [-22 * k, 22 * k], trigger: ".life" })
    );

    parallax(".ftr__word", { y: [160 * k, 0], trigger: ".ftr", start: "top bottom", end: "bottom bottom" });
  };
  whenMotion(scrollParallax(1), "(prefers-reduced-motion: no-preference) and (min-width: 901px)");
  whenMotion(scrollParallax(0.5), "(prefers-reduced-motion: no-preference) and (max-width: 900px)");
};

/* ---------- hero sky: Vanta clouds ----------
   three.js and Vanta load only when motion is allowed, and only after the
   intro has played: compiling the shaders blocks the main thread, which
   would freeze the bouncing letters. The sky then fades in over the Rainier
   photo, which stays underneath as the fallback. */
const initSky = () => {
  const el = document.querySelector("[data-vanta]");
  const hero = el?.closest(".hero");
  if (!el || reduced) return;
  const start = async () => {
    try {
      const [THREE, mod] = await Promise.all([
        import("three"),
        import("vanta/dist/vanta.clouds.min.js"),
      ]);
      const CLOUDS = mod.default?.default ?? mod.default ?? mod;
      CLOUDS({
        el,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        backgroundColor: 0x08090f, /* midnight black */
        skyColor: 0x2c5cff, /* electric blue */
        cloudColor: 0x8fa3e8,
        cloudShadowColor: 0x0b1030,
        sunColor: 0xff9f5a, /* cantaloupe */
        sunGlareColor: 0xff8a3d,
        sunlightColor: 0xffb27a,
        speed: 0.9,
      });
      gsap.fromTo(el, { opacity: 0 }, {
        opacity: 1, duration: 1.6, ease: "power2.out",
        onComplete: () => hero.classList.add("has-sky"),
      });
    } catch (err) {
      /* no WebGL or the chunk failed: the photo stays */
      console.warn("Hero sky unavailable:", err);
    }
  };
  /* the intro, then the page's load, then one idle moment */
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  Promise.race([introFinished, new Promise((r) => setTimeout(r, 3500))])
    .then(() => (document.readyState === "complete" ? null : new Promise((r) => addEventListener("load", r, { once: true }))))
    .then(() => idle(start, { timeout: 1500 }));
};

/* ---------- buttons: blob origin ---------- */

const initBlob = () => {
  if (!finePointer) return;
  document.querySelectorAll(".btn").forEach((btn) => {
    const place = (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty("--blob-x", `${e.clientX - r.left}px`);
      btn.style.setProperty("--blob-y", `${e.clientY - r.top}px`);
    };
    btn.addEventListener("pointerenter", place);
    btn.addEventListener("pointerleave", place);
  });
};

/* ---------- header: phone menu ---------- */

const initMenu = () => {
  const toggle = document.querySelector(".hdr__toggle");
  const sheet = document.getElementById("nav-sheet");
  if (!toggle || !sheet) return;
  const label = toggle.querySelector(".sr-only");
  sheet.inert = true;

  const setOpen = (open, { restoreFocus = false } = {}) => {
    toggle.setAttribute("aria-expanded", String(open));
    sheet.inert = !open;
    root.classList.toggle("menu-open", open);
    document.body.classList.toggle("menu-open", open);
    if (label) label.textContent = open ? "Close menu" : "Menu";
    if (open) sheet.querySelector("a")?.focus({ preventScroll: true });
    else if (restoreFocus) toggle.focus();
  };
  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";

  toggle.addEventListener("click", () => setOpen(!isOpen()));
  sheet.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) setOpen(false, { restoreFocus: true });
  });
  matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
    if (e.matches && isOpen()) setOpen(false);
  });
};

/* ---------- marquee: pause control, and no work off-screen ---------- */

const initMarquee = () => {
  const marquee = document.querySelector(".marquee");
  if (!marquee) return;
  const button = marquee.querySelector(".marquee__pause");
  button?.addEventListener("click", () => {
    const paused = marquee.classList.toggle("is-paused");
    button.setAttribute("aria-pressed", String(paused));
    button.textContent = paused ? "Play" : "Pause";
  });
  if (!hasIO) return;
  new IntersectionObserver(([entry]) => {
    marquee.classList.toggle("is-offscreen", !entry.isIntersecting);
  }).observe(marquee);
};

/* ---------- project cards: fold the picture away, show the write-up ---------- */

const initCards = () => {
  document.querySelectorAll("[data-card]").forEach((card) => {
    const toggle = card.querySelector(".pcard__toggle");
    const image = card.querySelector(".pcard__image");
    if (!toggle) return;
    const set = (open) => {
      card.classList.toggle("is-expanded", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", () => set(!card.classList.contains("is-expanded")));
    /* the picture is a second, pointer-only way in; the button is the control */
    image?.addEventListener("click", () => set(!card.classList.contains("is-expanded")));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && card.classList.contains("is-expanded")) {
        set(false);
        toggle.focus();
      }
    });
  });
};

/* ---------- semester: card stack + scrubber ---------- */

const initSteps = () => {
  const host = document.querySelector("[data-steps]");
  if (!host) return;
  const items = [...host.querySelectorAll("[data-step]")];
  const cards = items.map((item) => item.querySelector("[data-stack-card]"));
  const counts = [...host.querySelectorAll(".steps__roll [data-roll]")];
  const stops = [...host.querySelectorAll("[data-goto]")];
  const track = host.querySelector("[data-track]");
  const runner = host.querySelector("[data-runner]");
  const thumb = host.querySelector("[data-thumb]");
  const n = items.length;
  let active = 0;

  const render = () => {
    items.forEach((item, i) => {
      item.dataset.state = i === active ? "active" : i < active ? "before" : "after";
    });
    cards.forEach((card, i) => {
      card.dataset.pos = String((i - active + n) % n);
    });
    counts.forEach((el, i) => {
      el.style.setProperty("transform", `translateY(${(i - active) * 100}%)`);
    });
    stops.forEach((stop, i) => {
      if (i === active) stop.setAttribute("aria-current", "step");
      else stop.removeAttribute("aria-current");
    });
    runner.style.setProperty("transform", `translateX(${(active / (n - 1)) * 100}%)`);
  };

  /* The outgoing top card swings out to the side, then tucks in at the back. */
  const throwCard = (card, dir) => {
    if (reduced || !card.animate) return;
    const out = `translate(${dir * 112}%, -6%) rotate(${dir * 16}deg)`;
    card.animate(
      [
        { transform: getComputedStyle(card).transform, zIndex: 5 },
        { transform: out, zIndex: 5, offset: 0.45 },
        { transform: out, zIndex: 0, offset: 0.46 },
        { zIndex: 0 },
      ],
      { duration: 760, easing: "cubic-bezier(0.33, 1, 0.68, 1)" }
    );
  };

  const go = (next, dir = 1) => {
    next = clamp(next, 0, n - 1);
    if (next === active) return;
    const leaving = cards[active];
    active = next;
    render();
    throwCard(leaving, dir);
  };

  stops.forEach((stop) => {
    stop.addEventListener("click", () => go(Number(stop.dataset.goto)));
    stop.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const next = clamp(active + (e.key === "ArrowRight" ? 1 : -1), 0, n - 1);
      go(next);
      stops[next].focus();
    });
  });

  /* scrubber: the thumb follows the pointer and the stack snaps to the nearest step */
  const fromPointer = (e) => {
    const r = track.getBoundingClientRect();
    const pad = 18;
    const t = clamp((e.clientX - r.left - pad) / (r.width - pad * 2), 0, 1);
    return { t, step: Math.round(t * (n - 1)) };
  };
  let scrubbing = false;
  track.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    scrubbing = true;
    track.setPointerCapture(e.pointerId);
    track.classList.add("is-dragging");
    const { t, step } = fromPointer(e);
    runner.style.setProperty("transform", `translateX(${t * 100}%)`);
    go(step);
  });
  track.addEventListener("pointermove", (e) => {
    if (!scrubbing) return;
    const { t, step } = fromPointer(e);
    runner.style.setProperty("transform", `translateX(${t * 100}%)`);
    if (step !== active) {
      const leaving = cards[active];
      active = step;
      render();
      runner.style.setProperty("transform", `translateX(${t * 100}%)`);
      throwCard(leaving, 1);
    }
  });
  const endScrub = () => {
    if (!scrubbing) return;
    scrubbing = false;
    track.classList.remove("is-dragging");
    render();
  };
  track.addEventListener("pointerup", endScrub);
  track.addEventListener("pointercancel", endScrub);

  /* the top card can be flicked sideways: it tracks the pointer 1:1, then
     either flies to the back or springs home */
  cards.forEach((card) => {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dragging = false;
    card.addEventListener("pointerdown", (e) => {
      if (card.dataset.pos !== "0" || e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      card.setPointerCapture(e.pointerId);
    });
    card.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      const dy = (e.clientY - startY) * 0.25;
      if (Math.abs(dx) > 4) card.classList.add("is-dragging");
      card.style.setProperty("transform", `translate(${dx}px, ${dy}px) rotate(${-2 + dx * 0.05}deg)`);
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      card.classList.remove("is-dragging");
      const far = Math.abs(dx) > 90;
      const tapped = Math.abs(dx) < 5;
      if (far || tapped) {
        const dir = dx < 0 ? -1 : 1;
        const next = (active + 1) % n;
        const from = getComputedStyle(card).transform;
        card.style.removeProperty("transform");
        active = next;
        render();
        if (!reduced && card.animate) {
          const out = `translate(${dir * 112}%, -6%) rotate(${dir * 16}deg)`;
          card.animate(
            [
              { transform: from, zIndex: 5 },
              { transform: out, zIndex: 5, offset: 0.45 },
              { transform: out, zIndex: 0, offset: 0.46 },
              { zIndex: 0 },
            ],
            { duration: 760, easing: "cubic-bezier(0.33, 1, 0.68, 1)" }
          );
        }
      } else {
        card.style.removeProperty("transform"); /* CSS transition springs it home */
      }
    };
    card.addEventListener("pointerup", release);
    card.addEventListener("pointercancel", release);
  });

  render();
};

/* ---------- mentors: chips drift with the pointer ---------- */

const initParallax = () => {
  const host = document.querySelector("[data-parallax]");
  if (!host || !finePointer || reduced) return;
  const chips = [...host.querySelectorAll("[data-depth]")].map((el) => ({
    el, depth: Number(el.dataset.depth) || 0,
  }));
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0;

  const frame = () => {
    x += (tx - x) * 0.08;
    y += (ty - y) * 0.08;
    chips.forEach(({ el, depth }) => {
      el.style.setProperty("translate", `${(x * depth).toFixed(2)}px ${(y * depth).toFixed(2)}px`);
    });
    raf = Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001 ? requestAnimationFrame(frame) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  host.addEventListener("pointermove", (e) => {
    const r = host.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    kick();
  });
  host.addEventListener("pointerleave", () => { tx = 0; ty = 0; kick(); });
};

/* ---------- perks slider + icon wheel ---------- */

const initPerks = () => {
  const host = document.querySelector("[data-perks]");
  if (!host) return;
  const slides = [...host.querySelectorAll("[data-slide]")];
  const ring = host.querySelector("[data-ring]");
  const prev = host.querySelector("[data-prev]");
  const next = host.querySelector("[data-next]");
  const status = host.querySelector("[data-status]");
  const n = slides.length;
  let active = 0;

  const render = (announce) => {
    slides.forEach((slide, i) => {
      slide.dataset.state = i === active ? "active" : i < active ? "before" : "after";
      slide.inert = i !== active;
    });
    ring.style.setProperty("transform", `rotate(${-active * (360 / n)}deg)`);
    prev.disabled = active === 0;
    next.disabled = active === n - 1;
    const text = `${active + 1} / ${n}`;
    if (announce) status.textContent = text;
    else status.textContent = text;
  };
  prev.addEventListener("click", () => {
    active = Math.max(0, active - 1);
    render(true);
    if (prev.disabled) next.focus();
  });
  next.addEventListener("click", () => {
    active = Math.min(n - 1, active + 1);
    render(true);
    if (next.disabled) prev.focus();
  });
  render(false);
};

/* ---------- footer: click the slab, leave a sticker ---------- */

const initStickers = () => {
  const slab = document.querySelector("[data-stickers]");
  if (!slab || !finePointer || reduced) return;
  const MAX = 8;
  const live = [];
  slab.addEventListener("click", (e) => {
    if (e.target.closest("a, button, input, .ftr__container")) return;
    const r = slab.getBoundingClientRect();
    const sticker = document.createElement("span");
    sticker.className = "sticker";
    sticker.setAttribute("aria-hidden", "true");
    sticker.style.setProperty("--x", `${e.clientX - r.left}px`);
    sticker.style.setProperty("--y", `${e.clientY - r.top}px`);
    sticker.style.setProperty("--r", `${Math.round(Math.random() * 50 - 25)}deg`);
    const img = document.createElement("img");
    img.src = document.querySelector(".hdr__logo-mark").src;
    img.alt = "";
    sticker.append(img);
    slab.append(sticker);
    live.push(sticker);
    if (live.length > MAX) live.shift().remove();
  });
};

/* ---------- boot ---------- */

const safely = (fn) => {
  try { fn(); } catch (err) { console.error(err); }
};

/* Lenis first, so ScrollTrigger measures against the smoothed scroller. */
safely(() => initSmoothScroll()); /* anchor offset comes from CSS scroll-padding-top */

[
  initScrollMotion, initBlob, initMenu, initMarquee,
  initCards, initSteps, initParallax, initPerks, initStickers,
  initTerminal, initArcade, initLifeBoard, initSky,
].forEach(safely);

if (!reduced) safely(() => magnetic("[data-magnetic]", { reach: 40, pull: 0.32, max: 14 }));
