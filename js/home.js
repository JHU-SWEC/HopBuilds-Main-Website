document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.querySelector(".theme-toggle");
  const storedTheme = localStorage.getItem("hopbuilds-theme");

  if (storedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }

  const syncThemeToggle = () => {
    if (!themeToggle) return;

    const isDark = document.body.classList.contains("dark-theme");
    themeToggle.setAttribute("aria-pressed", String(isDark));

    const label = themeToggle.querySelector(".theme-toggle-label");
    if (label) {
      label.textContent = isDark ? "Light" : "Dark";
    }
  };

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark-theme");
      localStorage.setItem("hopbuilds-theme", isDark ? "dark" : "light");
      syncThemeToggle();
    });
  }

  syncThemeToggle();

  const showcaseTabs = document.querySelectorAll(".showcase-tab");
  const showcasePanels = document.querySelectorAll(".showcase-panel");
  const showcaseAddressText = document.querySelector(".showcase-address-text");
  const showcaseUrls = {
    lost: "lostatjhu.org",
    hopparlays: "hopparlays.com",
  };

  showcaseTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.showcaseTarget;

      showcaseTabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });

      showcasePanels.forEach((panel) => {
        const isActive = panel.dataset.showcasePanel === target;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
      });

      if (showcaseAddressText && showcaseUrls[target]) {
        showcaseAddressText.textContent = showcaseUrls[target];
      }
    });
  });

  // Smooth scroll with Lenis
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Hero content load animation
  const heroTop = document.querySelector(".hero-top");

  if (heroTop) {
    // Small delay to ensure page is ready
    setTimeout(() => {
      heroTop.classList.add("animate-in");
    }, 100);
  }

  // Navigation floating state after the hero
  const nav = document.querySelector(".main-nav");

  if (nav && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.set(nav, { "--nav-progress": 0 });

    gsap.to(nav, {
      "--nav-progress": 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "+=180",
        scrub: 1.2,
      },
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", (e) => {
      const href = anchor.getAttribute("href");
      if (href === "#") return;

      e.preventDefault();
      const target = document.querySelector(href);

      if (target) {
        lenis.scrollTo(target, {
          duration: 1.5,
          offset: -80, // Account for fixed nav
        });
      }
    });
  });

});

// Page transition animation
function animateTransition() {
  return new Promise((resolve) => {
    gsap.set(".block", { visibility: "visible", scaleY: 0 });
    gsap.to(".block", {
      scaleY: 1,
      duration: 0.5,
      stagger: 0.05,
      ease: "power2.inOut",
      onComplete: resolve,
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");

      // Skip anchor links and external links
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) {
        return;
      }

      // Only animate for internal page navigation
      if (href !== window.location.pathname) {
        event.preventDefault();
        animateTransition().then(() => {
          window.location.href = href;
        });
      }
    });
  });

  gsap.set(".block", { clearProps: "all" });
});
