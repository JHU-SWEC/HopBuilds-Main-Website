document.addEventListener("DOMContentLoaded", () => {
  // Handle 3D model iframe loading with cross-browser support
  const canvas3d = document.getElementById("canvas3d");
  const iframe = canvas3d?.querySelector("iframe");
  const fallback = canvas3d?.querySelector(".iframe-fallback");
  
  if (iframe && fallback) {
    let loadTimeout;
    let hasLoaded = false;
    
    // Success handler
    const handleLoad = () => {
      hasLoaded = true;
      if (loadTimeout) clearTimeout(loadTimeout);
      fallback.style.display = "none";
      console.log("3D model loaded successfully");
    };
    
    // Error handler
    const handleError = () => {
      if (!hasLoaded) {
        console.warn("3D model iframe failed to load - showing fallback");
        fallback.style.display = "block";
        iframe.style.display = "none";
      }
    };
    
    // Set timeout to detect if iframe doesn't load (cross-browser issue)
    loadTimeout = setTimeout(() => {
      if (!hasLoaded) {
        // Try to detect if iframe actually loaded by checking dimensions
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iframeDoc) {
            // Can't access (cross-origin) - assume it might be loading
            // But if it's been too long, show fallback
            setTimeout(() => {
              if (!hasLoaded) {
                handleError();
              }
            }, 2000);
          }
        } catch (e) {
          // Cross-origin - this is expected, iframe might still be loading
          // Give it more time
          setTimeout(() => {
            if (!hasLoaded) {
              handleError();
            }
          }, 3000);
        }
      }
    }, 5000);
    
    iframe.addEventListener("load", handleLoad);
    iframe.addEventListener("error", handleError);
    
    // Also check if iframe is blocked by checking if it's still in DOM after a delay
    setTimeout(() => {
      if (iframe.offsetHeight === 0 && iframe.offsetWidth === 0 && !hasLoaded) {
        console.warn("3D model iframe appears to be blocked or hidden");
        handleError();
      }
    }, 3000);
  }

  // lenis smooth scroll
  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // time and date
  updateDateTime();
  setInterval(updateDateTime, 1000);

  function updateDateTime() {
    const now = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeZoneAbbr = timeZone.split("/").pop().replace("_", " ");

    const timeOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    const timeStr =
      now.toLocaleTimeString("en-US", timeOptions) + ` [${timeZoneAbbr}]`;
    document.getElementById("current-time").textContent = timeStr;

    const dateOptions = {
      month: "long",
      day: "numeric",
      year: "numeric",
    };
    const dateStr = now.toLocaleDateString("en-US", dateOptions);
    document.getElementById("current-date").textContent = dateStr;
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);

  // create services
  const serviceswrapper = document.querySelector(".services .wrapper");
  serviceswrapper.innerHTML = "";

  services.forEach((service) => {
    const serviceElement = document.createElement("div");
    serviceElement.className = "service";

    serviceElement.innerHTML = `
      <div class="index">
        <p>[${service.id}]</p>
      </div>
      <div class="title">
        <h3>${service.title}</h3>
      </div>
      <div class="copy">
        <p>${service.copy}</p>
      </div>
    `;

    serviceswrapper.appendChild(serviceElement);
  });

  // create carousel
  const carouselwrapper = document.querySelector(".carousel");

  carouselItems.forEach((item) => {
    const projectElement = document.createElement("div");
    projectElement.className = "project";
    projectElement.id = `project-${item.id}`;

    projectElement.innerHTML = `
          <a href="${item.url}">
            <div class="project-bg">
                <img src="${item.bg}" alt="" />
            </div>
            <div class="project-main">
                <img src="${item.main}" alt="" />
            </div>
            <div class="project-header">
                <h2>${item.title}</h2>
                <div class="project-tags">
                ${item.tags[0]
                  .split(", ")
                  .map((tag) => `<p>${tag}</p>`)
                  .join("")}
                </div>
            </div>
            <div class="project-info">
                <div class="project-url">
                <a href="${item.url}">View Project</a>
                </div>
            </div>
         </a>
        `;

    carouselwrapper.appendChild(projectElement);
  });

  // About section content is now in HTML, no need to generate dynamically

  // scroll driven animations
  gsap.registerPlugin(ScrollTrigger);
  const heroSectionPinnedHeight = window.innerHeight * 3;
  const finishAboutHeaderClipReveal = window.innerHeight;
  const portraitsSectionPinnedHeight = window.innerHeight * 1;
  const carouselSectionPinnedHeight = window.innerHeight * 2;

  // Single project is always visible
  if (document.querySelector("#project-01")) {
    gsap.set("#project-01", {
      clipPath: "polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)",
    });
  }

  // handle nav + site info color changes
  const nav = document.querySelector("nav");
  const siteIntro = document.querySelector(".site-intro");

  ScrollTrigger.create({
    trigger: ".hero",
    start: "-1% top",
    end: `+=${window.innerHeight}`,
    onEnter: () => {
      nav.classList.add("dark");
      nav.classList.remove("light");
      siteIntro.classList.add("dark");
      siteIntro.classList.remove("light");
    },
    onLeave: () => {
      nav.classList.remove("dark");
      nav.classList.add("light");
      siteIntro.classList.remove("dark");
      siteIntro.classList.add("light");
    },
    onEnterBack: () => {
      nav.classList.add("dark");
      nav.classList.remove("light");
      siteIntro.classList.add("dark");
      siteIntro.classList.remove("light");
    },
    onLeaveBack: () => {
      nav.classList.remove("dark");
      nav.classList.add("light");
      siteIntro.classList.remove("dark");
      siteIntro.classList.add("light");
    },
  });

  ScrollTrigger.create({
    trigger: ".carousel",
    start: `top+=${window.innerHeight * 0}px top`,
    onEnter: () => {
      nav.classList.remove("light");
      nav.classList.add("dark");
      siteIntro.classList.remove("light");
      siteIntro.classList.add("dark");
    },
    onLeaveBack: () => {
      nav.classList.add("light");
      nav.classList.remove("dark");
      siteIntro.classList.add("light");
      siteIntro.classList.remove("dark");
    },
  });

  // nav-item scroll progress animations
  const infoProgress = document.querySelector(
    ".nav-item:first-child .progress"
  );
  const workProgress = document.querySelector(
    ".nav-item:nth-child(2) .progress"
  );
  const contactProgress = document.querySelector(
    ".nav-item:nth-child(3) .progress"
  );

  gsap.set([infoProgress, workProgress, contactProgress], {
    scaleX: 0,
    transformOrigin: "left",
  });

  // Info section progress (hero + portraits + services)
  ScrollTrigger.create({
    trigger: ".hero",
    start: "top top",
    endTrigger: ".carousel",
    end: "top top",
    scrub: true,
    onUpdate: (self) => {
      if (self.direction > 0) {
        if (self.progress === 1) {
          gsap.set(infoProgress, { transformOrigin: "right" });
          gsap.to(infoProgress, {
            scaleX: 0,
            duration: 0.5,
            ease: "power2.inOut",
          });
        } else {
          gsap.set(infoProgress, { transformOrigin: "left" });
          gsap.to(infoProgress, {
            scaleX: self.progress,
            duration: 0,
          });
        }
      } else if (self.direction < 0) {
        if (self.progress === 0) {
          gsap.set(infoProgress, { transformOrigin: "left" });
          gsap.to(infoProgress, {
            scaleX: 0,
            duration: 0.5,
            ease: "power2.inOut",
          });
        } else {
          gsap.set(infoProgress, { transformOrigin: "left" });
          gsap.to(infoProgress, {
            scaleX: self.progress,
            duration: 0,
          });
        }
      }
    },
  });

  // Work section progress (carousel) - tracks the pinned carousel scroll
  ScrollTrigger.create({
    trigger: ".carousel",
    start: "top top",
    end: `+=${carouselSectionPinnedHeight}`,
    scrub: true,
    onUpdate: (self) => {
      if (self.direction > 0) {
        if (self.progress === 1) {
          gsap.set(workProgress, { transformOrigin: "right" });
          gsap.to(workProgress, {
            scaleX: 0,
            duration: 0.5,
            ease: "power2.inOut",
          });
        } else {
          gsap.set(workProgress, { transformOrigin: "left" });
          gsap.to(workProgress, {
            scaleX: self.progress,
            duration: 0,
          });
        }
      } else if (self.direction < 0) {
        if (self.progress === 0) {
          gsap.set(workProgress, { transformOrigin: "left" });
          gsap.to(workProgress, {
            scaleX: 0,
            duration: 0.5,
            ease: "power2.inOut",
          });
        } else {
          gsap.set(workProgress, { transformOrigin: "left" });
          gsap.to(workProgress, {
            scaleX: self.progress,
            duration: 0,
          });
        }
      }
    },
  });

  // Contact section progress (footer) - starts only after carousel pinning ends
  // Get footer height for proper scroll tracking
  const footerElement = document.querySelector(".footer");
  const footerHeight = footerElement ? footerElement.offsetHeight : window.innerHeight;
  
  ScrollTrigger.create({
    trigger: ".carousel",
    start: `top+=${carouselSectionPinnedHeight} top`,
    end: `+=${footerHeight}`,
    scrub: true,
    onUpdate: (self) => {
      gsap.set(contactProgress, { transformOrigin: "left" });
      gsap.to(contactProgress, {
        scaleX: self.progress,
        duration: 0,
      });
    },
    onLeaveBack: () => {
      gsap.set(contactProgress, { transformOrigin: "left", scaleX: 0 });
    },
  });

  // reveal about section inside hero
  ScrollTrigger.create({
    trigger: ".hero",
    start: "1% top",
    end: `+=${finishAboutHeaderClipReveal}`,
    scrub: 1,
    onUpdate: (self) => {
      const startTop = gsap.utils.interpolate(50, 0, self.progress);
      const endBottom = gsap.utils.interpolate(50, 100, self.progress);

      const clipPath = `polygon(0% ${startTop}%, 100% ${startTop}%, 100% ${endBottom}%, 0% ${endBottom}%)`;
      gsap.set(".about-header", {
        clipPath: clipPath,
      });
    },
  });

  // about header fades in
  ScrollTrigger.create({
    trigger: ".hero",
    start: "25% top",
    end: `+=${finishAboutHeaderClipReveal}`,
    scrub: 1,
    onUpdate: (self) => {
      const scale = gsap.utils.interpolate(0.75, 1, self.progress);
      const opacity = gsap.utils.interpolate(0, 1, self.progress);

      gsap.set(".about-header h1", {
        scale: scale,
        opacity: opacity,
      });
    },
  });

  // about header fades out completely by end of info section
  // Use different timing for mobile vs desktop
  const isMobile = window.innerWidth <= 900;
  ScrollTrigger.create({
    trigger: ".services",
    start: isMobile ? "top top" : "top 80%",
    endTrigger: isMobile ? ".carousel" : ".services",
    end: isMobile ? "top top" : "center center",
    scrub: 1,
    onUpdate: (self) => {
      const opacity = gsap.utils.interpolate(1, 0, self.progress);

      gsap.set(".about-header h1", {
        opacity: opacity,
      });
    },
  });

  // Since we only have one project now, no need for slide animations

  // pin sections
  ScrollTrigger.create({
    trigger: ".hero",
    start: "top top",
    end: `+=${heroSectionPinnedHeight}`,
    pin: true,
    pinSpacing: false,
  });

  // portraits section removed - no pinning needed

  ScrollTrigger.create({
    trigger: ".carousel",
    start: "top top",
    end: `+=${carouselSectionPinnedHeight}`,
    pin: true,
    pinSpacing: true,
  });

  // portraits section removed - no animations needed

  // services section copy reveal animation
  services.forEach((service, index) => {
    const serviceElement = document.querySelector(
      `.service:nth-child(${index + 1})`
    );
    new SplitType(serviceElement.querySelector(".copy p"), {
      types: "lines",
      lineClass: "line",
    });
    new SplitType(serviceElement.querySelector(".title h3"), {
      types: "chars",
      charClass: "char",
    });
  });

  gsap.set(".line", {
    position: "relative",
    opacity: 0,
    y: 20,
    willChange: "transform, opacity",
  });

  gsap.set(".char", {
    position: "relative",
    opacity: 0,
    willChange: "opacity",
  });

  services.forEach((service, index) => {
    const serviceElement = document.querySelector(
      `.service:nth-child(${index + 1})`
    );
    const index_el = serviceElement.querySelector(".index");
    const chars = serviceElement.querySelectorAll(".char");
    const lines = serviceElement.querySelectorAll(".line");

    ScrollTrigger.create({
      trigger: serviceElement,
      start: "top 100%",
      end: "bottom top",
      scrub: false,
      onEnter: () => {
        gsap.to(index_el, { opacity: 1, duration: 0.5 });
        gsap.to(chars, {
          opacity: 1,
          duration: 0.05,
          stagger: { amount: 0.3 },
          delay: 0.1,
        });
        gsap.to(lines, {
          opacity: 1,
          y: 0,
          duration: 0.25,
          stagger: { amount: 0.15 },
          delay: 0.2,
        });
      },
      onEnterBack: () => {
        gsap.to(index_el, { opacity: 1, duration: 0.5 });
        gsap.to(chars, {
          opacity: 1,
          duration: 0.05,
          stagger: { amount: 0.3 },
          delay: 0.1,
        });
        gsap.to(lines, {
          opacity: 1,
          y: 0,
          duration: 0.25,
          stagger: { amount: 0.15 },
          delay: 0.2,
        });
      },
      onLeaveBack: (self) => {
        if (self.direction < 0) {
          gsap.to(index_el, { opacity: 0, duration: 0.3 });
          gsap.to(chars, {
            opacity: 0,
            duration: 0.25,
          });
          gsap.to(lines, {
            opacity: 0,
            y: 20,
            duration: 0.25,
          });
        }
      },
    });
  });



  // navigation click handling
  document.querySelectorAll(".nav-item").forEach((navItem) => {
    navItem.addEventListener("click", (e) => {
      e.preventDefault();

      const sectionId = navItem.id;
      let scrollTarget = 0;

      switch (sectionId) {
        case "hero":
          scrollTarget = 0;
          break;
        case "carousel":
          scrollTarget = window.innerHeight * 4;
          break;
        case "footer":
          scrollTarget = window.innerHeight * 6;
          break;
      }

      lenis.scrollTo(scrollTarget, {
        duration: 2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    });
  });
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
