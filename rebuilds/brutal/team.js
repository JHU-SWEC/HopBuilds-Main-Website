/**
 * The team page of the "brutal" rebuild. The roster is built from
 * team-data.js with createElement/textContent (never innerHTML). Motion is
 * GSAP through ../shared/motion.js plus Flip for the team filter; the shared
 * header, Lenis and magnetic buttons come from chrome.js. Under reduced
 * motion nothing moves and everything is visible.
 */
import { Flip } from "gsap/Flip";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import {
  gsap, SplitText, ScrollTrigger, whenMotion, batchIn, splitWords, parallax, reducedMotion,
} from "../shared/motion.js";
import { startChrome, safely } from "./chrome.js";
import { MENTORS, TEAMS, MEMBERS, PHOTO_CAPTIONS } from "./team-data.js";
import rainierUrl from "../../assets/web/team-rainier.jpg";

/* Every .jpg in team-life/ is in the gallery: add a file, it joins the loop. */
const TEAM_LIFE = import.meta.glob("../../assets/web/team-life/*.jpg", { eager: true, query: "?url", import: "default" });

gsap.registerPlugin(Flip, Draggable, InertiaPlugin);

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const initials = (name) =>
  name
    .replace(/^(professor|prof\.|dr\.)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

const FILLS = ["yellow", "pink", "mint", "orange", "lilac"];
const teamColor = (name, i = 0) => TEAMS.find((t) => t.name === name)?.color || FILLS[i % FILLS.length];

/* ---------- roster ---------- */
const renderMentors = () => {
  const host = document.querySelector("[data-mentors]");
  if (!host) return;
  MENTORS.forEach((m) => {
    const card = el("article", "card tm-mentor-card bg-paper");
    card.setAttribute("data-s", "pop");
    const avatar = el("span", "tm-avatar bg-yellow", initials(m.name));
    avatar.setAttribute("aria-hidden", "true");
    const body = el("div");
    body.append(el("h3", null, m.name), el("p", "tm-role", m.role), el("p", null, m.note));
    card.append(avatar, body);
    host.append(card);
  });
};

const renderMembers = () => {
  const grid = document.querySelector("[data-members]");
  if (!grid) return;
  MEMBERS.forEach((m, i) => {
    const li = el("li", `card tm-member${m.placeholder ? " is-placeholder" : ""}`);
    if (m.team) li.dataset.team = m.team;
    const avatar = el("span", `tm-avatar bg-${teamColor(m.team, i)}`, m.placeholder ? "?" : initials(m.name));
    avatar.setAttribute("aria-hidden", "true");
    li.append(avatar, el("h3", "tm-name", m.name), el("p", "tm-role", m.role));
    if (m.placeholder) li.append(el("p", "tm-todo", "To be added"));
    if (m.links?.length) {
      const links = el("p", "tm-links");
      m.links.forEach(({ label, href }) => {
        if (!/^https?:\/\/|^mailto:/.test(href)) return;
        const a = el("a", null, label);
        a.href = href;
        if (href.startsWith("http")) {
          a.target = "_blank";
          a.rel = "noopener";
        }
        links.append(a);
      });
      li.append(links);
    }
    if (m.team) li.append(el("p", `tm-team bg-${teamColor(m.team)}`, m.team));
    grid.append(li);
  });
  const stat = document.querySelector('[data-stat="teams"]');
  if (stat) stat.textContent = String(TEAMS.length);
};

/* ---------- roll call: one name tag per member ---------- */
const renderWall = () => {
  const wall = document.querySelector("[data-wall]");
  if (!wall) return;
  const people = MEMBERS.filter((m) => !m.placeholder);
  people.forEach((m, i) => {
    const tag = el("li", "tm-nametag");
    const top = el("span", `tm-nametag-top bg-${teamColor(m.team, i)}`);
    top.setAttribute("aria-hidden", "true");
    top.append(el("b", null, "Hello"), el("small", null, "my name is"));
    tag.append(top, el("span", "tm-nametag-name", m.name));
    wall.append(tag);
  });

  /* Scatter: every tag lands at its own random tilt and offset (and stacking
     order), so the wall reads as a pile, not a grid. Smaller on phones,
     where tags sit two to a row and a big shove would hide a name. */
  const small = matchMedia("(max-width: 640px)").matches;
  const rand = gsap.utils.random;
  /* Earlier tags stack on top, so where a tag from the next row overlaps,
     it slides under the name above and only its own "Hello" band is covered. */
  const all = wall.querySelectorAll(".tm-nametag");
  all.forEach((tag, i) => {
    gsap.set(tag, {
      rotation: small ? rand(-9, 9) : rand(-14, 14),
      x: small ? rand(-8, 8) : rand(-16, 16),
      y: small ? rand(-6, 8) : rand(-18, 20),
      zIndex: all.length - i,
    });
  });
  const count = document.querySelector("[data-count-line]");
  if (count) {
    count.textContent = `${people.length} people · ${TEAMS.length} teams · ${MENTORS.length} mentor${MENTORS.length === 1 ? "" : "s"}`;
  }
};

/* Name tags can be picked up and thrown around the hero (mouse only: on a
   touch screen the wall must scroll the page, not trap the thumb). */
const initWallDrag = () => {
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!fine || reducedMotion()) return;
  const tags = gsap.utils.toArray(".tm-nametag");
  if (!tags.length) return;
  document.documentElement.classList.add("tm-can-drag");
  let z = 10;
  Draggable.create(tags, {
    type: "x,y",
    bounds: ".tm-hero",
    inertia: true,
    edgeResistance: 0.75,
    onPress() {
      z += 1;
      this.target.style.zIndex = String(z);
      gsap.to(this.target, { scale: 1.08, duration: 0.18, ease: "power2.out" });
    },
    onDragStart() { this.target.classList.add("is-dragging"); },
    onRelease() {
      this.target.classList.remove("is-dragging");
      gsap.to(this.target, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.45)" });
    },
  });
};

/* ---------- "Off the clock": a polaroid strip running right to left ----------
   The photo set is repeated until one half of the track is wider than the
   screen (and holds an even count, so the alternating tilts line up), then
   the half is copied; CSS slides the track left by exactly 50% forever.
   The copy is aria-hidden; reduced motion hides it and shows a plain row. */
const photoList = () => {
  const name = (url) => decodeURIComponent(url.split("/").pop().split("?")[0]).replace(/-[\w-]{8}(?=\.jpg$)/, "");
  const files = Object.keys(TEAM_LIFE).sort().map((key) => ({ url: TEAM_LIFE[key], file: key.split("/").pop() }));
  return [{ url: rainierUrl, file: "team-rainier.jpg" }, ...files].map((p) => ({
    url: p.url,
    alt: PHOTO_CAPTIONS[p.file] || PHOTO_CAPTIONS[name(p.url)] || "A SWEC team photo",
  }));
};

const initGallery = () => {
  const gallery = document.querySelector("[data-gallery]");
  const track = gallery?.querySelector("[data-gallery-track]");
  if (!track) return;
  const photos = photoList();
  const SPEED = 55; /* px per second */

  const shot = (p, dup) => {
    const li = el("li", "tm-shot");
    const img = el("img");
    img.src = p.url;
    img.alt = dup ? "" : p.alt;
    img.loading = "lazy";
    img.decoding = "async";
    li.append(img);
    if (dup) {
      li.setAttribute("data-dup", "");
      li.setAttribute("aria-hidden", "true");
    }
    return li;
  };

  let builtFor = 0;
  const build = () => {
    const vw = document.documentElement.clientWidth;
    if (Math.abs(vw - builtFor) < 40) return;
    builtFor = vw;
    track.textContent = "";
    track.append(shot(photos[0], false));
    const step = track.firstChild.getBoundingClientRect().width +
      parseFloat(getComputedStyle(track.firstChild).marginRight);
    track.textContent = "";
    let count = Math.max(photos.length, Math.ceil((vw * 1.25) / step));
    if (count % 2) count += 1;
    const half = [];
    for (let i = 0; i < count; i++) half.push(photos[i % photos.length]);
    /* the first pass through the real photos is what screen readers get */
    half.forEach((p, i) => track.append(shot(p, i >= photos.length)));
    half.forEach((p) => track.append(shot(p, true)));
    gallery.style.setProperty("--tm-gallery-dur", `${((count * step) / SPEED).toFixed(1)}s`);
  };
  build();
  let t = 0;
  addEventListener("resize", () => { clearTimeout(t); t = setTimeout(build, 200); });

  const pause = document.querySelector("[data-gallery-pause]");
  pause?.addEventListener("click", () => {
    const paused = gallery.classList.toggle("is-paused");
    pause.setAttribute("aria-pressed", String(paused));
    pause.textContent = paused ? "Play photos" : "Pause photos";
  });
};

/* ---------- filter: cards glide to their new places (Flip) ---------- */
const initFilter = () => {
  const bar = document.querySelector("[data-filter]");
  const grid = document.querySelector("[data-members]");
  const status = document.querySelector("[data-status]");
  if (!bar || !grid) return;
  /* Only teams that have people get a chip; with nobody assigned yet there
     is nothing to filter, so the bar and its hint go away. */
  const staffed = TEAMS.filter((t) => MEMBERS.some((m) => m.team === t.name));
  if (!staffed.length) {
    bar.remove();
    document.querySelector("[data-filter-hint]")?.remove();
    return;
  }
  staffed.forEach((t) => {
    const b = el("button", "tm-chip", t.name);
    b.type = "button";
    b.dataset.team = t.name;
    b.setAttribute("aria-pressed", "false");
    bar.append(b);
  });
  const buttons = [...bar.querySelectorAll("[data-team]")];

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-team]");
    if (!btn || btn.getAttribute("aria-pressed") === "true") return;
    const team = btn.dataset.team;
    const cards = [...grid.children];
    const state = Flip.getState(cards);

    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    let shown = 0;
    cards.forEach((c) => {
      const show = team === "all" || c.dataset.team === team;
      c.hidden = !show;
      if (show) {
        shown += 1;
        /* a card filtered in before it scrolled into view must not stay invisible */
        gsap.set(c, { opacity: 1 });
      }
    });
    if (status) {
      status.textContent = team === "all" ? `Showing all ${shown} people` : `Showing ${shown} people on ${team}`;
    }

    if (reducedMotion()) return;
    Flip.from(state, {
      duration: 0.65,
      ease: "expo",
      absolute: true,
      stagger: 0.03,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.8, rotation: -4 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.55, ease: "back.out(1.8)", stagger: 0.04, clearProps: "transform" }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.8, duration: 0.3, ease: "power2.in" }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  });
};

/* ---------- motion ---------- */
const heroIntro = () => {
  /* The title's two lines slam in from opposite sides; then the name tags
     drop onto the wall from above and bounce as they land, in random order. */
  const tl = gsap.timeline({ defaults: { ease: "expo" } });
  tl.from(".tm-hero .tag", { x: -40, rotation: "-=8", opacity: 0, duration: 0.7, clearProps: "transform,opacity" }, 0.05)
    .from(".tm-count", { x: 40, rotation: "+=8", opacity: 0, duration: 0.7, clearProps: "transform,opacity" }, 0.1)
    .from(".tm-title-a", { xPercent: -60, opacity: 0, duration: 1.1 }, 0.1)
    .from(".tm-title-b", { xPercent: 50, rotation: 6, opacity: 0, duration: 1.2, ease: "back.out(1.6)" }, 0.22)
    .from(".tm-hero-lead", { y: 30, opacity: 0, duration: 0.8, clearProps: "transform,opacity" }, 0.5)
    .from(".tm-nametag", {
      y: () => -(window.innerHeight * 0.9),
      rotation: () => `+=${gsap.utils.random(-50, 50)}`,
      opacity: 0,
      duration: 1.15,
      ease: "bounce.out",
      stagger: { each: 0.055, from: "random" },
      clearProps: "opacity",
    }, 0.55)
    .from(".tm-wall-hint", { scale: 0, rotation: "-=40", duration: 0.6, ease: "back.out(2.4)", clearProps: "transform" }, ">-0.2");
};

const TITLES = "h2.title, .cta-title";
const initMotion = () => {
  whenMotion(() => {
    heroIntro();
    splitWords(TITLES, { stagger: 0.07 });

    const parts = gsap.utils.toArray("[data-s]").filter((n) => !n.matches(TITLES));
    batchIn(parts.filter((n) => n.dataset.s !== "pop"), { y: 70, stagger: 0.1 });
    batchIn(parts.filter((n) => n.dataset.s === "pop"), { y: 30, scale: 0.6, rotate: -8, stagger: 0.09, ease: "back.out(2)", duration: 0.8 });

    /* the roster rises in quietly, row by row as it reaches the screen */
    batchIn(".tm-member", { y: 24, stagger: 0.04, ease: "expo", duration: 0.7 });
    batchIn(".tm-chip", { y: 24, scale: 0.8, stagger: 0.05, ease: "back.out(2)", duration: 0.6 });
    /* the moving strip slides in from the right as it arrives */
    gsap.from(".tm-gallery", {
      x: 260, opacity: 0, duration: 1.2, ease: "expo", clearProps: "transform,opacity",
      scrollTrigger: { trigger: ".tm-gallery", start: "top 90%", once: true },
    });
  });

  /* Controlled parallax: decorative layers and side-by-side blocks only. */
  const layers = (k, wide) => () => {
    /* the title's lines pull apart as the roll call scrolls away */
    const hero = { trigger: ".tm-hero", start: "top top", end: "bottom top" };
    parallax(".tm-title-a", { x: [0, `${-8 * k}vw`], ...hero });
    parallax(".tm-title-b", { x: [0, `${6 * k}vw`], r: [0, -4], ...hero });
    parallax(".tm-photos .shape-star", { y: [100 * k, -100 * k], r: [-30, 30] });
    parallax(".cta .shape-ring", { y: [-60 * k, 60 * k], r: [-20, 20] });
    parallax(".cta .shape-plus", { y: [90 * k, -90 * k], r: [30, -30] });
    parallax(".ftr-tape .plx-x", { x: wide ? ["8vw", "-8vw"] : [0, 0] });
    parallax(".plx-rise", { y: ["46%", "0%"], trigger: ".ftr-giant", start: "top bottom", end: "bottom bottom" });
    parallax(".tm-mentor-card", { y: [50 * k, -40 * k], r: [2, -1] });
    if (!wide) return;
    parallax(".tm-wall", { y: [0, -70], ...hero });
  };
  const ok = "(prefers-reduced-motion: no-preference)";
  whenMotion(layers(1, true), `${ok} and (min-width: 1240px)`);
  whenMotion(layers(1, false), `${ok} and (min-width: 768px) and (max-width: 1239px)`);
  whenMotion(layers(0.5, false), `${ok} and (max-width: 767px)`);
};

/* The roster exists before the motion looks for it. */
[renderWall, renderMentors, renderMembers, initFilter, initGallery].forEach(safely);
startChrome();
safely(initMotion);
safely(initWallDrag);
