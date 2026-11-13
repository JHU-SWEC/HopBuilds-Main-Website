/**
 * The parts every page of the "brutal" rebuild shares: the header (phone
 * sheet, dark-section shadow swap, section spy), the looping decorations,
 * Lenis smooth scrolling and the magnetic buttons. Pages call startChrome()
 * first, then add their own sections' motion.
 */
import { initSmoothScroll, magnetic, reducedMotion } from "../shared/motion.js";

const hasIO = "IntersectionObserver" in window;

export const safely = (fn) => {
  try {
    fn();
  } catch (err) {
    console.error(err);
  }
};

/* ---------- header: phone sheet + section spy ---------- */
export const initHeader = () => {
  const toggle = document.querySelector(".hdr-toggle");
  const sheet = document.getElementById("nav-sheet");
  if (toggle && sheet) {
    const label = toggle.querySelector(".hdr-toggle-label");
    const setOpen = (open, { restoreFocus = false } = {}) => {
      toggle.setAttribute("aria-expanded", String(open));
      sheet.hidden = !open;
      document.body.classList.toggle("menu-open", open);
      if (label) label.textContent = open ? "Close" : "Menu";
      if (open) sheet.querySelector("a")?.focus();
      else if (restoreFocus) toggle.focus();
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    sheet.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !sheet.hidden) setOpen(false, { restoreFocus: true });
    });
    /* a sheet left open while the window widens past the phone layout would
       cover the page with its close button gone */
    matchMedia("(min-width: 1000px)").addEventListener("change", (e) => {
      if (e.matches) setOpen(false);
    });
  }

  /* over an ink section the header's black shadows would vanish; flag it */
  const hdr = document.querySelector(".hdr");
  if (hdr && hasIO) {
    const under = new Set();
    const dark = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? under.add(e.target) : under.delete(e.target)));
        hdr.classList.toggle("on-dark", under.size > 0);
      },
      { rootMargin: "-40px 0px -92% 0px" }
    );
    document.querySelectorAll("section.bg-ink, footer.bg-ink").forEach((el) => dark.observe(el));
  }

  /* mark the link of the section that currently holds the middle of the screen */
  const links = [...document.querySelectorAll(".hdr-links [data-spy]")];
  if (!links.length || !hasIO) return;
  const byId = new Map(links.map((a) => [a.dataset.spy, a]));
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = byId.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach((a) => a.removeAttribute("aria-current"));
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    },
    { rootMargin: "-45% 0px -55% 0px" }
  );
  byId.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) spy.observe(section);
  });
};

/* ---------- loops: the ticker's Pause button, and pausing loops off-screen ---------- */
export const initLoops = () => {
  const ticker = document.querySelector(".ticker");
  const button = ticker?.querySelector(".ticker-pause");
  if (button) {
    button.addEventListener("click", () => {
      const paused = ticker.classList.toggle("is-paused");
      button.setAttribute("aria-pressed", String(paused));
      button.textContent = paused ? "Play" : "Pause";
    });
  }
  if (!hasIO) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle("is-offscreen", !e.isIntersecting));
  });
  document.querySelectorAll("[data-loop]").forEach((el) => io.observe(el));
};

/* Lenis first, so ScrollTrigger measures against the smoothed scroller.
   The anchor offset comes from the CSS scroll-padding-top. */
export const startChrome = () => {
  safely(() => initSmoothScroll());
  safely(initHeader);
  safely(initLoops);
  if (!reducedMotion()) safely(() => magnetic("[data-magnetic]", { reach: 56, pull: 0.32, max: 12 }));
};
