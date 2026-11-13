/**
 * The page's small visual effects. Each one leaves the content fully visible
 * when it cannot run: without script, under reduced motion, or when
 * IntersectionObserver is missing.
 *
 * - reveal: `.reveal` blocks rise in once as they enter the screen, with a
 *   short stagger among siblings. Only armed (html.reveal-armed) when it can run.
 * - spotlight: `.spot` cards light up under the pointer (--mx / --my).
 * - count-up: `[data-count]` numbers roll from 0 to their value once.
 * - ticker: the pause button for the hero's moving word row.
 *
 * Styles set from here go through the CSSOM (style.setProperty), which the
 * site's Content-Security-Policy allows; never write a style="" attribute.
 */
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const initReveal = () => {
  const items = [...document.querySelectorAll(".reveal")];
  if (!items.length || reduced() || !("IntersectionObserver" in window)) return;

  /* stagger siblings that enter together */
  items.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    const i = siblings.indexOf(el);
    if (i > 0) el.style.setProperty("--d", `${Math.min(i, 5) * 0.08}s`);
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );
  document.documentElement.classList.add("reveal-armed");
  items.forEach((el) => io.observe(el));
};

const initSpotlight = () => {
  if (!matchMedia("(hover: hover)").matches) return;
  document.querySelectorAll(".spot").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
};

const initCountUp = () => {
  const nums = [...document.querySelectorAll("[data-count]")];
  if (!nums.length || reduced() || !("IntersectionObserver" in window)) return;

  const run = (el) => {
    const target = Number(el.dataset.count);
    const start = performance.now();
    const duration = 1400;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.6 }
  );
  nums.forEach((el) => io.observe(el));
};

const initTicker = () => {
  const ticker = document.querySelector(".ticker");
  const button = ticker?.querySelector(".ticker-pause");
  if (!button) return;
  button.addEventListener("click", () => {
    const paused = ticker.classList.toggle("is-paused");
    button.setAttribute("aria-pressed", String(paused));
    button.textContent = paused ? "Play" : "Pause";
  });
};

export default function initEffects() {
  initReveal();
  initSpotlight();
  initCountUp();
  initTicker();
}
