
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function raf2(cb) {
    requestAnimationFrame(() => requestAnimationFrame(cb));
  }

  const isMobile = () => window.innerWidth < 992;

  // ---------------------------------------------------------------------------
  // 1) Disable/enable scroll by clicking on Hamburger button
  // ---------------------------------------------------------------------------
  function initScrollToggle() {
    const btn = document.getElementById("scrollButton");
    if (!btn) return;

    if (btn.dataset.scrollToggleMounted === "1") return;
    btn.dataset.scrollToggleMounted = "1";

    const body = document.body;
    let locked = body.classList.contains("no-scroll");

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
  }

  // ---------------------------------------------------------------------------
  // 2) Navbar grey state (no jQuery)
  // ---------------------------------------------------------------------------
  function initNavbarGrey() {
    const links = document.querySelectorAll(".navbar-link");
    if (!links.length) return;

    const hasCurrent = !!document.querySelector(".navbar-link.w--current");
    links.forEach((el) => el.classList.toggle("grey", hasCurrent));
  }

  // ---------------------------------------------------------------------------
  // 3) Underline Animation (IntersectionObserver)
  // ---------------------------------------------------------------------------
  function initUnderlineAnimation() {
    const elements = document.querySelectorAll(".underline-colors");
    if (!elements.length) return;

    if (document.documentElement.dataset.underlineMounted === "1") return;
    document.documentElement.dataset.underlineMounted = "1";

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("animate");
        obs.unobserve(entry.target);
      });
    });

    elements.forEach((el) => {
      observer.observe(el);

      el.addEventListener(
        "animationend",
        () => el.classList.add("animation-finished"),
        { once: true }
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Boot (Netlify-safe)
  // ---------------------------------------------------------------------------
  raf2(() => {
    initScrollToggle();
    initNavbarGrey();
    initUnderlineAnimation();
  });
})();
