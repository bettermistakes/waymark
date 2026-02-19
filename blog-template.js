
(function () {
  "use strict";

  // ---------------- Helpers ----------------
  function raf2(cb) {
    requestAnimationFrame(() => requestAnimationFrame(cb));
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  const isMobile = () => window.innerWidth < 992;

  // ---------------- 1) Scroll lock toggle (Hamburger) ----------------
  function initScrollToggle() {
    const btn = document.getElementById("scrollButton");
    if (!btn) return true;

    if (btn.dataset.scrollToggleMounted === "1") return true;
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

    return true;
  }

  // ---------------- 2) Navbar grey state (no jQuery) ----------------
  function initNavbarGrey() {
    const links = $all(".navbar-link");
    if (!links.length) return true;

    const hasCurrent = !!$(".navbar-link.w--current");
    links.forEach((el) => el.classList.toggle("grey", hasCurrent));

    return true;
  }

  // ---------------- Boot ----------------
  raf2(initScrollToggle);
  raf2(initNavbarGrey);

})();
