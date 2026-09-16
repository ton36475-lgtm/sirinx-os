const body = document.body;
const menuButton = document.querySelector(".menu-button");
const navLinks = document.querySelector(".nav-links");
const langToggle = document.querySelector(".lang-toggle");

menuButton?.addEventListener("click", () => {
  const isOpen = navLinks?.classList.toggle("open") ?? false;
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

navLinks?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    navLinks.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
  }
});

langToggle?.addEventListener("click", () => {
  const nextLang = body.dataset.lang === "th" ? "en" : "th";
  body.dataset.lang = nextLang;
  document.documentElement.lang = nextLang;
});
