
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Helpers (Netlify-safe: no DOMContentLoaded, use polling + raf)
  // ---------------------------------------------------------------------------
  function raf2(cb) {
    requestAnimationFrame(() => requestAnimationFrame(cb));
  }

  function mountWhenReady(fn, opts) {
    const tries = (opts && opts.tries) || 140;  // ~14s
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

  // ---------------------------------------------------------------------------
  // 2) GSAP Motion Path Animation for .solution_wrap around #orbitPath (desktop)
  // ---------------------------------------------------------------------------
  function initMotionPathSolutions() {
    if (!window.gsap || !window.MotionPathPlugin) return false;

    const orbitPath = document.querySelector("#orbitPath");
    if (!orbitPath) return true;

    if (orbitPath.dataset.motionPathMounted === "1") return true;
    orbitPath.dataset.motionPathMounted = "1";

    gsap.registerPlugin(MotionPathPlugin);

    const mm = gsap.matchMedia();
    const DURATION = 72;

    mm.add("(min-width: 769px)", () => {
      const buttons = gsap.utils.toArray(".solution_wrap");
      if (!buttons.length) return () => {};

      const total = buttons.length;
      const tweens = buttons.map((btn, i) => {
        const tween = gsap.to(btn, {
          duration: DURATION,
          repeat: -1,
          ease: "none",
          immediateRender: true,
          motionPath: {
            path: orbitPath,
            align: orbitPath,
            autoRotate: false,
            alignOrigin: [0.5, 0.5],
          },
        });
        tween.progress(i / total);
        return tween;
      });

      return () => {
        tweens.forEach((t) => t.kill());
        gsap.set(buttons, { clearProps: "transform,motionPath" });
      };
    });

    mm.add("(max-width: 768px)", () => {
      const buttons = gsap.utils.toArray(".solution_wrap");
      gsap.set(buttons, { clearProps: "transform,motionPath" });
      return () => {};
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // 3) GSAP Dropdown Animation for Solution Items
  // ---------------------------------------------------------------------------
  function initSolutionDropdowns() {
    if (!window.gsap) return false;

    const wrappers = gsap.utils.toArray(".solution_wrap");
    if (!wrappers.length) return true;

    if (document.documentElement.dataset.solutionDropdownMounted === "1") return true;
    document.documentElement.dataset.solutionDropdownMounted = "1";

    wrappers.forEach((wrapper) => {
      const toggle = wrapper.querySelector(".solution_toggle");
      const dropdownList = wrapper.querySelector(".solution_dropdown");
      if (!toggle || !dropdownList) return;

      // avoid double init per toggle
      if (toggle.dataset.dropdownMounted === "1") return;
      toggle.dataset.dropdownMounted = "1";

      const mobileIcon = toggle.querySelector(".mobile-icon");
      const items = dropdownList.querySelectorAll(".solution_item");

      gsap.set(items, { opacity: 0, y: "-1rem", filter: "blur(2px)", visibility: "hidden" });
      if (mobileIcon) gsap.set(mobileIcon, { rotation: 0 });

      let isAnimating = false;
      let closeTimeout = null;

      toggle.addEventListener("click", () => {
        if (isAnimating) return;

        const isOpen = toggle.classList.contains("w--open");
        isAnimating = true;
        toggle.style.pointerEvents = "none";

        if (!isOpen) {
          // OPENING -> close other opened dropdowns first
          const closingPromises = [];

          wrappers.forEach((otherWrapper) => {
            if (otherWrapper === wrapper) return;

            const otherToggle = otherWrapper.querySelector(".solution_toggle");
            if (!otherToggle || !otherToggle.classList.contains("w--open")) return;

            const otherDropdown = otherWrapper.querySelector(".solution_dropdown");
            const otherItems = otherDropdown ? otherDropdown.querySelectorAll(".solution_item") : [];
            const otherMobileIcon = otherToggle.querySelector(".mobile-icon");

            otherWrapper.classList.add("disabled");
            setTimeout(() => otherWrapper.classList.remove("disabled"), 1000);

            otherToggle.dataset.programmaticClose = "true";
            otherToggle.classList.remove("w--open");
            otherToggle.style.pointerEvents = "auto";

            if (otherMobileIcon) {
              gsap.to(otherMobileIcon, { rotation: 0, duration: 0.8, ease: "power2.in" });
            }

            if (otherItems.length) {
              closingPromises.push(
                new Promise((resolve) => {
                  gsap.to(otherItems, {
                    opacity: 0,
                    y: "-1rem",
                    filter: "blur(2px)",
                    duration: 0.4,
                    stagger: { each: 0.05, from: "end" },
                    ease: "power2.in",
                    overwrite: "auto",
                    onComplete: () => {
                      gsap.set(otherItems, { visibility: "hidden" });
                      resolve();
                    },
                  });
                })
              );
            }
          });

          Promise.all(closingPromises)
            .then(() => {
              setTimeout(() => {
                if (mobileIcon) gsap.to(mobileIcon, { rotation: 45, duration: 0.8, ease: "power2.out" });

                gsap.fromTo(
                  items,
                  { opacity: 0, y: "-1rem", filter: "blur(2px)", visibility: "visible" },
                  {
                    opacity: 1,
                    y: "0rem",
                    filter: "blur(0px)",
                    duration: 0.6,
                    stagger: 0.08,
                    ease: "power2.out",
                    overwrite: "auto",
                    onComplete: () => {
                      gsap.set(items, { filter: "none" });
                      toggle.style.pointerEvents = "auto";
                      isAnimating = false;
                    },
                  }
                );
              }, 10);
            })
            .catch(() => {
              toggle.style.pointerEvents = "auto";
              isAnimating = false;
            });
        } else {
          // CLOSING
          wrapper.classList.add("disabled");
          if (closeTimeout) clearTimeout(closeTimeout);
          closeTimeout = setTimeout(() => wrapper.classList.remove("disabled"), 1000);

          if (mobileIcon) gsap.to(mobileIcon, { rotation: 0, duration: 0.8, ease: "power2.in" });

          gsap.to(items, {
            opacity: 0,
            y: "-1rem",
            filter: "blur(2px)",
            duration: 0.4,
            stagger: { each: 0.05, from: "end" },
            ease: "power2.in",
            overwrite: "auto",
            onComplete: () => {
              gsap.set(items, { visibility: "hidden" });
              toggle.style.pointerEvents = "auto";
              isAnimating = false;
            },
          });
        }
      });

      // Keep styles consistent if Webflow closes dropdown externally
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          if (m.attributeName !== "class") return;

          const target = m.target;
          if (target.dataset.programmaticClose === "true") {
            delete target.dataset.programmaticClose;
            return;
          }

          const wasOpen = (m.oldValue || "").includes("w--open");
          const isNowOpen = target.classList.contains("w--open");

          if (wasOpen && !isNowOpen && !isAnimating) {
            gsap.set(items, { opacity: 0, y: "-1rem", filter: "blur(2px)", visibility: "hidden" });
            if (mobileIcon) gsap.set(mobileIcon, { rotation: 0 });
            toggle.style.pointerEvents = "auto";
            wrapper.classList.remove("disabled");
            if (closeTimeout) clearTimeout(closeTimeout);
          }
        });
      });

      observer.observe(toggle, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // 4) Commitment Grid SVG Path Animation (deduped)
  // ---------------------------------------------------------------------------
  function initCommitmentGridSvg() {
    if (!window.gsap || !window.ScrollTrigger) return false;

    const grids = gsap.utils.toArray(".commitment-grid");
    if (!grids.length) return true;

    gsap.registerPlugin(ScrollTrigger);

    grids.forEach((grid) => {
      if (grid.dataset.commitmentGridMounted === "1") return;
      grid.dataset.commitmentGridMounted = "1";

      const paths = gsap.utils.toArray("svg path", grid);
      if (!paths.length) return;

      const lengths = [];
      let total = 0;

      for (let i = 0; i < paths.length; i++) {
        const p = paths[i];
        let len = 0;
        try { len = p.getTotalLength(); } catch (e) { len = 0; }
        lengths.push(len);
        total += len;
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      }

      const safeTotal = total > 0 ? total : 1;
      let cum = 0;

      paths.forEach((p, i) => {
        const len = lengths[i] > 0 ? lengths[i] : 0;
        const startPct = (cum / safeTotal) * 100;
        const endPct = ((cum + len) / safeTotal) * 100;

        gsap.to(p, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: grid,
            scrub: true,
            start: `${startPct}% center`,
            end: `${endPct}% center`,
            markers: false,
            invalidateOnRefresh: true,
          },
        });

        cum += len;
      });
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // 5) Navbar grey state (no jQuery)
  // ---------------------------------------------------------------------------
  function initNavbarGrey() {
    const links = document.querySelectorAll(".navbar-link");
    if (!links.length) return true;

    const hasCurrent = !!document.querySelector(".navbar-link.w--current");
    links.forEach((el) => el.classList.toggle("grey", hasCurrent));

    return true;
  }

  // ---------------------------------------------------------------------------
  // 6) Underline Animation (IntersectionObserver)
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
      el.addEventListener("animationend", () => el.classList.add("animation-finished"), { once: true });
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  raf2(initScrollToggle);
  raf2(initNavbarGrey);
  raf2(initUnderline);

  // GSAP-dependent parts: poll until GSAP is ready
  mountWhenReady(() => {
    const a = initMotionPathSolutions();
    const b = initSolutionDropdowns();
    const c = initCommitmentGridSvg();
    return a && b && c;
  }, { tries: 180, every: 100 });

})();




