
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
  function on(el, evt, handler, opts) {
    if (!el) return;
    el.addEventListener(evt, handler, opts || false);
  }
  const isMobile = () => window.innerWidth < 992;

  // ---------------- 0) Filters horizontal scroll fades ----------------
  function initFiltersFade() {
    const box = $(".filters-form_block-wrapper");
    if (!box) return true;

    if (box.dataset.filtersFadeMounted === "1") return true;
    box.dataset.filtersFadeMounted = "1";

    function update() {
      const maxScrollLeft = box.scrollWidth - box.clientWidth;

      box.classList.toggle("scrolled-left", box.scrollLeft > 0);
      box.classList.toggle("scrolled-right", box.scrollLeft < maxScrollLeft - 1);
    }

    on(box, "scroll", update, { passive: true });
    on(window, "resize", update, { passive: true });

    // initial
    raf2(update);

    return true;
  }

  // ---------------- 1) Scroll lock toggle (hamburger) ----------------
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

  // ---------------- 2) Navbar grey state (no jQuery) ----------------
  function initNavbarGrey() {
    const links = $all(".navbar-link");
    if (!links.length) return true;

    const hasCurrent = !!$(".navbar-link.w--current");
    links.forEach((el) => el.classList.toggle("grey", hasCurrent));

    return true;
  }

  // ---------------- Boot ----------------
  raf2(() => {
    initFiltersFade();
    initScrollToggle();
    initNavbarGrey();
  });
})();
