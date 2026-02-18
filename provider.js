
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
  // 1) Disable/enable scroll by clicking on Hamburger button (#scrollButton)
  // ---------------------------------------------------------------------------
  function initScrollToggle() {
    const btn = document.getElementById("scrollButton");
    if (!btn) return true;

    // avoid double init
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
      // if user goes desktop, always unlock
      if (!isMobile() && locked) applyLock(false);
    }

    btn.addEventListener("click", toggle);
    window.addEventListener("resize", onResize, { passive: true });

    return true;
  }

  // ---------------------------------------------------------------------------
  // 2) Navbar color state (no jQuery)
  // ---------------------------------------------------------------------------
  function initNavbarGrey() {
    const links = document.querySelectorAll(".navbar-link");
    if (!links.length) return true;

    const hasCurrent = !!document.querySelector(".navbar-link.w--current");
    links.forEach((el) => el.classList.toggle("grey", hasCurrent));

    return true;
  }

  // ---------------------------------------------------------------------------
  // 3) Underline Animation (IntersectionObserver)
  // ---------------------------------------------------------------------------
  function initUnderline() {
    const els = Array.from(document.querySelectorAll(".underline-colors"));
    if (!els.length) return true;

    // avoid double init
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
  // 4) SVG Animation (GSAP + ScrollTrigger) - sequential stroke draw
  // ---------------------------------------------------------------------------
  function initCommitmentSvg() {
    if (!window.gsap || !window.ScrollTrigger) return false;

    const triggerEl = document.querySelector(".commitment-grid");
    const vectorRoot = document.querySelector(".commitment-vector.is-1");
    if (!triggerEl || !vectorRoot) return true;

    // avoid double init
    if (vectorRoot.dataset.commitmentSvgMounted === "1") return true;
    vectorRoot.dataset.commitmentSvgMounted = "1";

    gsap.registerPlugin(ScrollTrigger);

    const paths = gsap.utils.toArray(".commitment-vector.is-1 svg path");
    if (!paths.length) return true;

    const total = paths.reduce((sum, p) => sum + (p.getTotalLength?.() || 0), 0) || 1;

    let cum = 0;

    paths.forEach((path) => {
      const len = path.getTotalLength ? path.getTotalLength() : 0;
      const startPct = (cum / total) * 100;
      const endPct = ((cum + len) / total) * 100;

      gsap.set(path, {
        strokeDasharray: len,
        strokeDashoffset: len > 0 ? len : 0,
      });

      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 10,
        ease: "none",
        scrollTrigger: {
          trigger: triggerEl,
          scrub: true,
          start: `${startPct}% center`,
          end: `${endPct}% center`,
          markers: false,
        },
      });

      cum += len > 0 ? len : 0;
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // Boot (polling pattern)
  // ---------------------------------------------------------------------------
  raf2(initScrollToggle);
  raf2(initNavbarGrey);
  raf2(initUnderline);

  // GSAP might load after DOM -> poll until available
  mountWhenReady(initCommitmentSvg, { tries: 160, every: 100 });

})();
