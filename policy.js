
(function () {
  "use strict";

  // Netlify-safe: no DOMContentLoaded, just wait 2 RAFs
  function raf2(cb) {
    requestAnimationFrame(() => requestAnimationFrame(cb));
  }

  const isMobile = () => window.innerWidth < 992;

  // ---------------------------------------------------------------------------
  // 1) Disable/enable scroll by clicking on Hamburger button (#scrollButton)
  // ---------------------------------------------------------------------------
  function initScrollToggle() {
    const btn = document.getElementById("scrollButton");
    if (!btn) return;

    // avoid double init
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
      // if we leave mobile, always unlock
      if (!isMobile() && locked) applyLock(false);
    }

    btn.addEventListener("click", toggle);
    window.addEventListener("resize", onResize, { passive: true });
  }

  // ---------------------------------------------------------------------------
  // 2) Navbar color's state (no jQuery)
  // ---------------------------------------------------------------------------
  function initNavbarGrey() {
    const links = document.querySelectorAll(".navbar-link");
    if (!links.length) return;

    const hasCurrent = !!document.querySelector(".navbar-link.w--current");
    links.forEach((el) => el.classList.toggle("grey", hasCurrent));
  }

  // Boot
  raf2(() => {
    initScrollToggle();
    initNavbarGrey();
  });
})();

