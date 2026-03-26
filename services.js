(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Helpers (Netlify-safe, no DOMContentLoaded)
  // ---------------------------------------------------------------------------
  function raf2(cb) {
    requestAnimationFrame(() => requestAnimationFrame(cb));
  }

  function mountWhenReady(fn, opts) {
    const tries = (opts && opts.tries) || 120;  // ~12s
    const every = (opts && opts.every) || 100;  // 100ms
    let n = 0;

    const t = setInterval(() => {
      n++;
      const ok = fn();
      if (ok || n >= tries) clearInterval(t);
    }, every);
  }

  const isMobile = () => window.innerWidth < 992;

  // ---------------------------------------------------------------------------
  // 1) Mobile rods animation (GSAP + ScrollTrigger) - sequential master timeline
  // ---------------------------------------------------------------------------
  function initMobileRods() {
    if (!isMobile()) return true; // only mobile
    if (!window.gsap || !window.ScrollTrigger) return false;

    const section = document.querySelector(".section-providers-founded");
    const processItems = Array.from(document.querySelectorAll(".process-item"));
    if (!section || !processItems.length) return true;

    // avoid double init
    if (section.dataset.mobileRodsMounted === "1") return true;
    section.dataset.mobileRodsMounted = "1";

    gsap.registerPlugin(ScrollTrigger);

    const allRod1s = section.querySelectorAll(".mobile-rod-1");
    const allRod2s = section.querySelectorAll(".mobile-rod-2");

    gsap.set(allRod1s, { y: "-100%", opacity: 0 });
    gsap.set(allRod2s, { y: "-200%", opacity: 0 });

    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 60%",
        end: "bottom 40%",
        scrub: 1,
        markers: false,
      },
    });

    processItems.forEach((item) => {
      const rod1 = item.querySelector(".mobile-rod-1");
      const rod2 = item.querySelector(".mobile-rod-2");
      if (!rod1 || !rod2) return;

      masterTl.to(rod1, { y: "0%", opacity: 1, duration: 0.6, ease: "none" });
      masterTl.to(rod2, { y: "0%", opacity: 1, duration: 0.6, ease: "none" });
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // 2) Reload on breakpoint cross (mobile <-> desktop)
  // ---------------------------------------------------------------------------
  function initBreakpointReload() {
    if (window.__bmBreakpointReloadMounted) return true;
    window.__bmBreakpointReloadMounted = true;

    let prevWidth = window.innerWidth;

    window.addEventListener(
      "resize",
      () => {
        const w = window.innerWidth;
        const crossed =
          (w < 992 && prevWidth >= 992) || (w >= 992 && prevWidth < 992);

        prevWidth = w;
        if (crossed) location.reload();
      },
      { passive: true }
    );

    return true;
  }

  // ---------------------------------------------------------------------------
  // 3) Disable/enable scroll by clicking on Hamburger button (#scrollButton)
  // ---------------------------------------------------------------------------
  function initScrollToggle() {
    const btn = document.getElementById("scrollButton");
    if (!btn) return true;

    if (btn.dataset.scrollToggleMounted === "1") return true;
    btn.dataset.scrollToggleMounted = "1";

    const body = document.body;
    let locked = false;

    function applyLock(state) {
      locked = state;
      body.classList.toggle("no-scroll", locked);
    }

    function toggle() {
      if (!isMobile()) return;
      applyLock(!locked);
    }

    function onResize() {
      if (!isMobile() && locked) applyLock(false);
    }

    btn.addEventListener("click", toggle);
    window.addEventListener("resize", onResize, { passive: true });

    return true;
  }

  // ---------------------------------------------------------------------------
  // 4) Navbar color state (no jQuery)
  // ---------------------------------------------------------------------------
  function initNavbarGrey() {
    const links = document.querySelectorAll(".navbar-link");
    if (!links.length) return true;

    const hasCurrent = !!document.querySelector(".navbar-link.w--current");
    links.forEach((el) => el.classList.toggle("grey", hasCurrent));

    return true;
  }

  // ---------------------------------------------------------------------------
  // 5) Underline Animation (IntersectionObserver) - safe
  // ---------------------------------------------------------------------------
  function initUnderline() {
    const els = Array.from(document.querySelectorAll(".underline-colors"));
    if (!els.length) return true;

    if (document.documentElement.dataset.underlineMounted === "1") return true;
    document.documentElement.dataset.underlineMounted = "1";

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("animate");
        obs.unobserve(entry.target);
      });
    });

    els.forEach((el) => {
      obs.observe(el);
      el.addEventListener(
        "animationend",
        () => el.classList.add("animation-finished"),
        { once: true }
      );
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // Boot (polling like your Splide pattern)
  // ---------------------------------------------------------------------------
  initBreakpointReload();
  raf2(initNavbarGrey);
  raf2(initScrollToggle);
  raf2(initUnderline);
  mountWhenReady(initMobileRods, { tries: 120, every: 100 });

})();

