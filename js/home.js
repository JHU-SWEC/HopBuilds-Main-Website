document.addEventListener("DOMContentLoaded", () => {
  // Fix spline-viewer positioning by triggering resize
  const splineViewer = document.querySelector("spline-viewer");
  if (splineViewer) {
    // Trigger resize after short delay to initialize properly
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 500);
    
    // Also trigger when spline finishes loading
    splineViewer.addEventListener("load", () => {
      window.dispatchEvent(new Event("resize"));
    });
  }

  // lenis smooth scroll
  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // create info carousel (full-screen slides)
  const infoCarouselWrapper = document.querySelector(".info-carousel");

  info.forEach((item) => {
    const infoElement = document.createElement("div");
    infoElement.className = "info-slide";
    infoElement.id = `info-${item.id}`;

    infoElement.innerHTML = `
      <div class="info-bg"></div>
      <div class="info-content">
        <p class="info-index">[${item.id}]</p>
        <h2>${item.title}</h2>
        <p class="info-copy">${item.copy}</p>
      </div>
    `;

    infoCarouselWrapper.appendChild(infoElement);
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
                <div class="project-tags-row">
                  <div class="project-tags">
                  ${item.tags[0]
                    .split(", ")
                    .map((tag) => `<p>${tag}</p>`)
                    .join("")}
                  </div>
                  <a href="${item.url}" class="view-project-btn">View Project</a>
                </div>
            </div>
         </a>
        `;

    carouselwrapper.appendChild(projectElement);
  });

  // create upcoming projects carousel
  const upcomingCarouselWrapper = document.querySelector(".upcoming-carousel");

  upcomingProjects.forEach((item) => {
    const projectElement = document.createElement("div");
    projectElement.className = "upcoming-project";
    projectElement.id = `upcoming-${item.id}`;

    projectElement.innerHTML = `
          <div class="project-bg"></div>
          <div class="project-main">
              <img src="${item.main}" alt="" />
          </div>
          <div class="project-header">
              <h2>${item.title}</h2>
              <p class="project-description">${item.description}</p>
          </div>
        `;

    upcomingCarouselWrapper.appendChild(projectElement);
  });

  // About section content is now in HTML, no need to generate dynamically

  // scroll driven animations
  gsap.registerPlugin(ScrollTrigger);
  const heroSectionPinnedHeight = window.innerHeight * 2; // HopBuilds title - shorter duration
  const finishAboutHeaderClipReveal = window.innerHeight;
  const portraitsSectionPinnedHeight = window.innerHeight * 1;
  const infoSectionPinnedHeight = window.innerHeight * 8; // 4 info slides + slower transitions
  const carouselSectionPinnedHeight = window.innerHeight * 2;
  const upcomingSectionPinnedHeight = window.innerHeight * 3; // 2 projects + transition

  // Single project is always visible
  if (document.querySelector("#project-01")) {
    gsap.set("#project-01", {
      clipPath: "polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)",
    });
  }

  // First upcoming project is always visible
  if (document.querySelector("#upcoming-01")) {
    gsap.set("#upcoming-01", {
      clipPath: "polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)",
    });
  }

  // handle nav color changes
  const nav = document.querySelector("nav");

  ScrollTrigger.create({
    trigger: ".hero",
    start: "-1% top",
    end: `+=${window.innerHeight}`,
    onEnter: () => {
      nav.classList.add("dark");
      nav.classList.remove("light");
    },
    onLeave: () => {
      nav.classList.remove("dark");
      nav.classList.add("light");
    },
    onEnterBack: () => {
      nav.classList.add("dark");
      nav.classList.remove("light");
    },
    onLeaveBack: () => {
      nav.classList.remove("dark");
      nav.classList.add("light");
    },
  });

  // Nav color change for contact section is handled in the work progress ScrollTrigger below

  // nav-item scroll progress animations
  const infoProgress = document.querySelector(
    ".nav-item:first-child .progress"
  );
  const workProgress = document.querySelector(
    ".nav-item:nth-child(2) .progress"
  );
  const upcomingProgress = document.querySelector(
    ".nav-item:nth-child(3) .progress"
  );
  const contactProgress = document.querySelector(
    ".nav-item:nth-child(4) .progress"
  );

  gsap.set([infoProgress, workProgress, upcomingProgress, contactProgress], {
    scaleX: 0,
    transformOrigin: "left",
  });

  // Calculate section boundaries based on pinned heights
  const infoEnd = heroSectionPinnedHeight + infoSectionPinnedHeight;
  const projectsEnd = infoEnd + carouselSectionPinnedHeight;
  const upcomingEnd = projectsEnd + upcomingSectionPinnedHeight;
  const totalScrollHeight = upcomingEnd + window.innerHeight; // + footer

  // Single scroll listener for all progress bars
  ScrollTrigger.create({
    trigger: "body",
    start: "top top",
    end: "bottom bottom",
    onUpdate: () => {
      const scrollY = window.scrollY;
      
      // Info progress (0 to infoEnd)
      if (scrollY < infoEnd) {
        const progress = scrollY / infoEnd;
        gsap.set(infoProgress, { scaleX: progress, transformOrigin: "left" });
        gsap.set(workProgress, { scaleX: 0 });
        gsap.set(upcomingProgress, { scaleX: 0 });
        gsap.set(contactProgress, { scaleX: 0 });
      } 
      // Projects progress (infoEnd to projectsEnd)
      else if (scrollY < projectsEnd) {
        gsap.set(infoProgress, { scaleX: 0, transformOrigin: "right" });
        const progress = (scrollY - infoEnd) / carouselSectionPinnedHeight;
        gsap.set(workProgress, { scaleX: progress, transformOrigin: "left" });
        gsap.set(upcomingProgress, { scaleX: 0 });
        gsap.set(contactProgress, { scaleX: 0 });
      }
      // Upcoming progress (projectsEnd to upcomingEnd)
      else if (scrollY < upcomingEnd) {
        gsap.set(infoProgress, { scaleX: 0 });
        gsap.set(workProgress, { scaleX: 0, transformOrigin: "right" });
        const progress = (scrollY - projectsEnd) / upcomingSectionPinnedHeight;
        gsap.set(upcomingProgress, { scaleX: progress, transformOrigin: "left" });
        gsap.set(contactProgress, { scaleX: 0 });
        nav.classList.add("light");
        nav.classList.remove("dark");
      }
      // Contact progress (upcomingEnd onwards)
      else {
        gsap.set(infoProgress, { scaleX: 0 });
        gsap.set(workProgress, { scaleX: 0 });
        gsap.set(upcomingProgress, { scaleX: 0, transformOrigin: "right" });
        const progress = Math.min(1, (scrollY - upcomingEnd) / window.innerHeight);
        gsap.set(contactProgress, { scaleX: progress, transformOrigin: "left" });
        nav.classList.remove("light");
        nav.classList.add("dark");
      }
    },
  });

  // reveal about section inside hero - reveal during first part of hero pinned section
  ScrollTrigger.create({
    trigger: ".hero",
    start: "top top",
    end: `+=${heroSectionPinnedHeight * 0.3}`, // Reveal in first 30% of hero section
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

  // about header fades in during reveal
  ScrollTrigger.create({
    trigger: ".hero",
    start: "top top",
    end: `+=${heroSectionPinnedHeight * 0.3}`,
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

  // about header fades out at end of hero section
  const isMobile = window.innerWidth <= 900;
  ScrollTrigger.create({
    trigger: ".hero",
    start: `top+=${heroSectionPinnedHeight * 0.7} top`, // Start fading at 70% of hero section
    end: `+=${heroSectionPinnedHeight * 0.3}`, // Fade out over last 30%
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
    pinSpacing: true, // Info carousel waits until hero pinning ends
  });

  // portraits section removed - no pinning needed

  // Pin info carousel section
  ScrollTrigger.create({
    trigger: ".info-carousel",
    start: "top top",
    end: `+=${infoSectionPinnedHeight}`,
    pin: true,
    pinSpacing: true,
  });

  // First info slide is always visible
  gsap.set("#info-01", {
    clipPath: "polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)",
  });

  // Info slide animations (reveal slides 2, 3, 4) based on scroll progress
  ScrollTrigger.create({
    trigger: ".info-carousel",
    start: "top top",
    end: `+=${infoSectionPinnedHeight}`,
    scrub: 1,
    onUpdate: (self) => {
      const progress = self.progress;
      
      // Slide 2: 0% to 33%
      if (progress <= 0.33) {
        const slideProgress = progress / 0.33;
        const clipTop = gsap.utils.interpolate(100, 0, slideProgress);
        gsap.set("#info-02", {
          clipPath: `polygon(0% ${clipTop}%, 100% ${clipTop}%, 100% 100%, 0% 100%)`,
        });
      } else {
        gsap.set("#info-02", {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        });
      }
      
      // Slide 3: 33% to 66%
      if (progress > 0.33 && progress <= 0.66) {
        const slideProgress = (progress - 0.33) / 0.33;
        const clipTop = gsap.utils.interpolate(100, 0, slideProgress);
        gsap.set("#info-03", {
          clipPath: `polygon(0% ${clipTop}%, 100% ${clipTop}%, 100% 100%, 0% 100%)`,
        });
      } else if (progress > 0.66) {
        gsap.set("#info-03", {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        });
      }
      
      // Slide 4: 66% to 100%
      if (progress > 0.66) {
        const slideProgress = (progress - 0.66) / 0.34;
        const clipTop = gsap.utils.interpolate(100, 0, slideProgress);
        gsap.set("#info-04", {
          clipPath: `polygon(0% ${clipTop}%, 100% ${clipTop}%, 100% 100%, 0% 100%)`,
        });
      }
    },
  });

  ScrollTrigger.create({
    trigger: ".carousel",
    start: "top top",
    end: `+=${carouselSectionPinnedHeight}`,
    pin: true,
    pinSpacing: true,
  });

  // Pin upcoming projects section
  ScrollTrigger.create({
    trigger: ".upcoming-carousel",
    start: "top top",
    end: `+=${upcomingSectionPinnedHeight}`,
    pin: true,
    pinSpacing: true,
  });

  // Upcoming project slide animation (reveal second project)
  ScrollTrigger.create({
    trigger: ".upcoming-carousel",
    start: "top top",
    end: `+=${upcomingSectionPinnedHeight * 0.5}`,
    scrub: 1,
    onUpdate: (self) => {
      const clipTop = gsap.utils.interpolate(100, 0, self.progress);
      gsap.set("#upcoming-02", {
        clipPath: `polygon(0% ${clipTop}%, 100% ${clipTop}%, 100% 100%, 0% 100%)`,
      });
    },
  });

  // portraits section removed - no animations needed



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
          scrollTarget = infoSectionEnd;
          break;
        case "upcoming":
          scrollTarget = projectsSectionEnd;
          break;
        case "footer":
          scrollTarget = upcomingSectionEnd;
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
