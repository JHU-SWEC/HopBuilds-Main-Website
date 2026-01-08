document.addEventListener("DOMContentLoaded", () => {
  // lenis smooth scroll
  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // sticky scroll
  gsap.to(".images", {
    yPercent: -80.5,
    ease: "none",
    scrollTrigger: {
      trigger: ".project-images",
      start: "top top",
      end: "+=300%",
      pin: true,
      scrub: true,
    },
  });

  // drawer animation
  const drawer = document.querySelector(".drawer");
  const drawerToggler = document.querySelector(".drawer-toggler");
  let isDrawerOpen = false;

  const drawerTl = gsap.timeline({
    paused: true,
    defaults: {
      duration: 1,
      ease: "power4.inOut",
    },
  });

  drawerTl.to(drawer, {
    x: 0,
  });

  function toggleDrawer() {
    isDrawerOpen = !isDrawerOpen;
    if (isDrawerOpen) {
      drawerTl.play();
    } else {
      drawerTl.reverse();
    }
  }

  drawerToggler.addEventListener("click", toggleDrawer);
});

console.log("Script loaded");

// page transition
function animateBlocksBeforeUnload(event) {
  event.preventDefault();

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
console.log("Script loaded");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");

  document.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      const href = link.getAttribute("href");

      if (href && !href.startsWith("#") && href !== window.location.pathname) {
        animateTransition().then(() => {
          window.location.href = href;
        });
      }
    });
  });

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

  gsap.set(".block", { clearProps: "all" });
});
