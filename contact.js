
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

  // ---------------- 3) Contact form button + filled inputs ----------------
  function initContactFormUI() {
    // IDs from your code
    const firstName = document.getElementById("FirstName");
    const lastName  = document.getElementById("LastName");
    const email     = document.getElementById("EmailAddress");
    const textField = document.getElementById("TextField");
    const btn       = document.getElementById("button-contact");

    // Guard: if not on that page, do nothing
    if (!firstName || !lastName || !email || !textField || !btn) return true;

    if (btn.dataset.contactUIMounted === "1") return true;
    btn.dataset.contactUIMounted = "1";

    // Button state: add/remove "black" when all filled
    function updateButton() {
      const ok =
        firstName.value.trim() !== "" &&
        lastName.value.trim()  !== "" &&
        email.value.trim()     !== "" &&
        textField.value.trim() !== "";

      btn.classList.toggle("black", ok);

      // If you also want default "grey" on empty:
      // btn.classList.toggle("grey", !ok);
    }

    // Field state: add/remove "filled" per input
    function updateFilled(el) {
      el.classList.toggle("filled", el.value.trim() !== "");
    }

    function bindField(el) {
      updateFilled(el);
      on(el, "input", () => {
        updateFilled(el);
        updateButton();
      });
      on(el, "change", () => {
        updateFilled(el);
        updateButton();
      });
    }

    [firstName, lastName, email, textField].forEach(bindField);

    // Initial state
    updateButton();

    return true;
  }

  // ---------------- Boot (Netlify-safe) ----------------
  raf2(() => {
    initScrollToggle();
    initNavbarGrey();
    initContactFormUI();
  });
})();

