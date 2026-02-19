
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

  // ---------------- 1) Insert HTML comment (Built by...) ----------------
  function initBuiltByComment() {
    if (document.documentElement.dataset.bmCommentMounted === "1") return true;
    document.documentElement.dataset.bmCommentMounted = "1";

    const html = document.documentElement;
    if (!html) return true;

    const madeBy = document.createComment(" BUILT BY BETTER MISTAKES - BETTERMISTAKES.COM ");
    // Insert before <html>
    document.insertBefore(madeBy, html);
    return true;
  }

  // ---------------- 2) Footer year ----------------
  function initFooterYear() {
    const els = $all(".footer-year");
    if (!els.length) return true;

    const y = String(new Date().getFullYear());
    els.forEach((el) => (el.textContent = y));
    return true;
  }

  // ---------------- 3) Skip-to-main (click + Enter) ----------------
  function initSkipToMain() {
    const link = $("#skip-link");
    const main = $("#main");
    if (!link || !main) return true;

    if (link.dataset.skipMounted === "1") return true;
    link.dataset.skipMounted = "1";

    function activate(e) {
      const isKey = e.type === "keydown";
      if (isKey && e.key !== "Enter") return;

      e.preventDefault();
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: false });
    }

    link.addEventListener("click", activate);
    link.addEventListener("keydown", activate);

    return true;
  }

  // ---------------- 4) Dropdown active state ----------------
  function initDropdownCurrentState() {
    const dropdowns = $all(".navbar-dropdown.is-dropdown");
    if (!dropdowns.length) return true;

    dropdowns.forEach((dropdown) => {
      if (dropdown.querySelector("a.w--current")) {
        dropdown.classList.add("is--current");
      } else {
        dropdown.classList.remove("is--current");
      }
    });

    return true;
  }

  // ---------------- Boot ----------------
  raf2(() => {
    initBuiltByComment();
    initFooterYear();
    initSkipToMain();
    initDropdownCurrentState();
  });

})();
