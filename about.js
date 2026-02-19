(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function raf2(cb) {
    requestAnimationFrame(() => requestAnimationFrame(cb));
  }

  function on(el, evt, handler, opts) {
    if (!el) return;
    el.addEventListener(evt, handler, opts || false);
  }

  function $all(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  const isMobile = () => window.innerWidth < 992;

  // ---------------------------------------------------------------------------
  // 1) Disable/enable scroll by clicking on Hamburger button
  // ---------------------------------------------------------------------------
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

    on(btn, "click", toggle);
    on(window, "resize", onResize, { passive: true });

    return true;
  }

  // ---------------------------------------------------------------------------
  // 2) Navbar grey state (no jQuery)
  // ---------------------------------------------------------------------------
  function initNavbarGrey() {
    const links = $all(".navbar-link");
    if (!links.length) return true;

    const hasCurrent = !!$(".navbar-link.w--current");
    links.forEach((el) => el.classList.toggle("grey", hasCurrent));

    return true;
  }

  // ---------------------------------------------------------------------------
  // 3) Underline Animation (IntersectionObserver)
  // ---------------------------------------------------------------------------
  function initUnderlineAnimation() {
    const els = $all(".underline-colors");
    if (!els.length) return true;

    if (document.documentElement.dataset.underlineMounted === "1") return true;
    document.documentElement.dataset.underlineMounted = "1";

    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("animate");
        observer.unobserve(entry.target);
      });
    });

    els.forEach((el) => {
      obs.observe(el);
      on(
        el,
        "animationend",
        () => el.classList.add("animation-finished"),
        { once: true }
      );
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // 4) Closing Modal on ESC button (no jQuery)
  // ---------------------------------------------------------------------------
  function initEscToCloseModal() {
    if (document.documentElement.dataset.escCloseMounted === "1") return true;
    document.documentElement.dataset.escCloseMounted = "1";

    on(document, "keydown", (evt) => {
      if (evt.key !== "Escape") return;

      // Click close area if exists
      const closeArea = $(".modal-close-area");
      if (closeArea && typeof closeArea.click === "function") closeArea.click();

      // Hide #bio if exists
      const bio = document.getElementById("bio");
      if (bio) bio.style.display = "none";

      // Re-enable scroll just in case
      document.body.style.overflow = "";
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // 5) Stop scroll when opening modal via .link.is-underline,
  //    enable scroll on close buttons
  // ---------------------------------------------------------------------------
  function initModalScrollLockLinks() {
    if (document.documentElement.dataset.modalScrollLockMounted === "1") return true;
    document.documentElement.dataset.modalScrollLockMounted = "1";

    // Delegation click for links
    on(document, "click", (event) => {
      const link = event.target.closest(".link.is-underline");
      if (!link) return;

      // (Optional) keep your original behavior
      event.preventDefault();

      // If clicked element is bio-modal-wrapper, don't lock scroll
      const clickedIsBioWrapper =
        event.target.classList.contains("bio-modal-wrapper") ||
        !!event.target.closest(".bio-modal-wrapper");

      if (!clickedIsBioWrapper) {
        document.body.style.overflow = "hidden";
      }
    });

    // Delegation click for close buttons
    on(document, "click", (event) => {
      const closer = event.target.closest(".modal-close-area, .close-modal");
      if (!closer) return;

      document.body.style.overflow = "";
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // Boot (Netlify-safe)
  // ---------------------------------------------------------------------------
  raf2(() => {
    initScrollToggle();
    initNavbarGrey();
    initUnderlineAnimation();
    initEscToCloseModal();
    initModalScrollLockLinks();
  });
})();
