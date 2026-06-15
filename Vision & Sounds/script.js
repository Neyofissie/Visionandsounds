const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const nav = document.querySelector("[data-nav]");
const filterButtons = document.querySelectorAll("[data-filter]");
const projectCards = document.querySelectorAll("[data-category]");
const planButtons = document.querySelectorAll("[data-plan]");
const priceCards = document.querySelectorAll(".price-card");
const form = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");
const reveals = document.querySelectorAll(".reveal");
const hero = document.querySelector(".hero");
const scrollPanel = document.querySelector("[data-scroll-panel]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function closeMenu() {
  document.body.classList.remove("nav-open");
  nav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open menu");
}

function updateHeader() {
  header.classList.toggle("scrolled", window.scrollY > 24);
}

function updateScrollPanel() {
  if (!hero || !scrollPanel || reduceMotion.matches || window.innerWidth <= 960) {
    scrollPanel?.style.setProperty("--panel-scroll-lift", "0px");
    return;
  }

  const heroHeight = hero.offsetHeight || window.innerHeight;
  const progress = Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
  scrollPanel.style.setProperty("--panel-scroll-lift", `${Math.round(progress * -34)}px`);
}

menuToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  document.body.classList.toggle("nav-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    closeMenu();
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    projectCards.forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.category !== filter;
    });
  });
});

planButtons.forEach((button) => {
  button.addEventListener("click", () => {
    priceCards.forEach((card) => card.classList.remove("selected"));
    button.closest(".price-card").classList.add("selected");

    const plan = button.dataset.plan;
    formStatus.textContent = `${plan} selected. Add your details below and we will prepare your enquiry.`;
    document.querySelector("#contact").scrollIntoView({ behavior: "smooth" });
    form.elements.project.value = "Headshot Day";
    form.elements.message.value = `I am interested in the ${plan} Headshot Day package.`;
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const name = data.get("name").trim();
  const project = data.get("project");
  const message = data.get("message").trim();

  if (!name || !project || !message) {
    formStatus.textContent = "Please add your name, project type, and message.";
    return;
  }

  const subject = encodeURIComponent(`Vision and Sounds enquiry from ${name}`);
  const body = encodeURIComponent(`Name: ${name}\nProject type: ${project}\n\n${message}`);
  formStatus.innerHTML = `Ready. <a href="mailto:visionandsoundssng@gmail.com?subject=${subject}&body=${body}">Open email enquiry</a> or WhatsApp 07876013922.`;
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

reveals.forEach((item) => observer.observe(item));
window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("scroll", updateScrollPanel, { passive: true });
window.addEventListener("resize", () => {
  if (window.innerWidth > 960) {
    closeMenu();
  }
  updateScrollPanel();
});

updateHeader();
updateScrollPanel();
