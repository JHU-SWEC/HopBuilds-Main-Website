document.addEventListener("DOMContentLoaded", () => {
  // Fix spline-viewer positioning by triggering resize
  const splineViewer = document.querySelector("spline-viewer");
  if (splineViewer) {
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 500);

    splineViewer.addEventListener("load", () => {
      window.dispatchEvent(new Event("resize"));
    });
  }

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

  // Navigation blur-on-scroll effect
  const nav = document.querySelector(".main-nav");

  if (nav) {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        nav.classList.add("scrolled");
      } else {
        nav.classList.remove("scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state
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
