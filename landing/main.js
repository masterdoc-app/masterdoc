/**
 * Mobile nav + footer year
 */
(function () {
  const toggle = document.querySelector(".mobile-menu-toggle");
  const navLinks = document.getElementById("nav-links");
  const yearEl = document.getElementById("year");

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  if (!toggle || !navLinks) return;

  toggle.addEventListener("click", function () {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    toggle.setAttribute("aria-label", open ? "Открыть меню" : "Закрыть меню");
    navLinks.classList.toggle("is-open", !open);
  });

  navLinks.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Открыть меню");
      navLinks.classList.remove("is-open");
    });
  });
})();
