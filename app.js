const today = new Date();
const dayLabel = today.toLocaleDateString("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const heading = document.querySelector(".topbar h2");
if (heading) {
  heading.textContent = `Premium fintech workspace · ${dayLabel}`;
}

const cards = document.querySelectorAll(".kpi-card, .panel");
cards.forEach((card, index) => {
  card.style.transitionDelay = `${index * 40}ms`;
});
