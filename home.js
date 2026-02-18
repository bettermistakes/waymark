
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

  // ---------------------------------------------------------------------------
  // 1) CounterUp
  // ---------------------------------------------------------------------------
  function initCounters() {
    if (!window.jQuery || !jQuery.fn || !jQuery.fn.counterUp) return false;

    const $counters = jQuery(".counter");
    if (!$counters.length) return false;

    // avoid double init
    if (document.documentElement.dataset.countersMounted === "1") return true;
    document.documentElement.dataset.countersMounted = "1";

    $counters.counterUp({ delay: 10, time: 2000 });
    $counters.addClass("animated fadeInDownBig");

    return true;
  }

  // ---------------------------------------------------------------------------
  // 2) Disable/enable scroll on hamburger (#scrollButton) for mobile
  // ---------------------------------------------------------------------------
  function initScrollToggle() {
    const btn = document.getElementById("scrollButton");
    if (!btn) return true; // nothing to do

    if (btn.dataset.scrollToggleMounted === "1") return true;
    btn.dataset.scrollToggleMounted = "1";

    const body = document.body;
    let locked = false;

    function applyLock(state) {
      locked = state;
      body.classList.toggle("no-scroll", locked);
    }

    function toggle() {
      if (window.innerWidth >= 992) return; // only mobile
      applyLock(!locked);
    }

    // if resize to desktop -> always unlock
    function onResize() {
      if (window.innerWidth >= 992 && locked) applyLock(false);
    }

    btn.addEventListener("click", toggle);
    window.addEventListener("resize", onResize, { passive: true });

    return true;
  }

  // ---------------------------------------------------------------------------
  // 3) Navbar color state (.navbar-link.grey if there is a current link)
  // ---------------------------------------------------------------------------
  function initNavbarGrey() {
    const links = document.querySelectorAll(".navbar-link");
    if (!links.length) return true;

    const hasCurrent = !!document.querySelector(".navbar-link.w--current");
    links.forEach((el) => el.classList.toggle("grey", hasCurrent));

    return true;
  }

  // ---------------------------------------------------------------------------
  // 4) Underline Animation (IntersectionObserver)
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
      el.addEventListener("animationend", () => {
        el.classList.add("animation-finished");
      }, { once: true });
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // 5) SVG Animation (GSAP + ScrollTrigger)
  // ---------------------------------------------------------------------------
  function initCommitmentSvg() {
    if (!window.gsap || !window.ScrollTrigger) return false;

    const triggerEl = document.querySelector(".commitment-grid");
    const paths = gsap.utils.toArray(".commitment-vector.is-1 svg path");
    if (!triggerEl || !paths.length) return true;

    if (triggerEl.dataset.gsapSvgMounted === "1") return true;
    triggerEl.dataset.gsapSvgMounted = "1";

    gsap.registerPlugin(ScrollTrigger);

    // total length
    let total = 0;
    paths.forEach((p) => {
      try { total += p.getTotalLength(); } catch (e) {}
    });
    if (!total) return true;

    let cum = 0;

    paths.forEach((path) => {
      let len = 0;
      try { len = path.getTotalLength(); } catch (e) { len = 0; }
      if (!len) return;

      const start = (cum / total) * 100;
      const end   = ((cum + len) / total) * 100;

      gsap.set(path, {
        strokeDasharray: len,
        strokeDashoffset: len
      });

      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 10,
        scrollTrigger: {
          trigger: triggerEl,
          scrub: true,
          start: `${start}% center`,
          end: `${end}% center`,
          markers: false
        }
      });

      cum += len;
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // Boot (polling like your Splide pattern)
  // ---------------------------------------------------------------------------
  mountWhenReady(initCounters,       { tries: 120, every: 100 });
  raf2(initNavbarGrey);
  raf2(initScrollToggle);
  raf2(initUnderline);
  mountWhenReady(initCommitmentSvg,  { tries: 120, every: 100 });

})();
