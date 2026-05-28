const menuToggle = document.getElementById("menuToggle");
const menuLinks = document.getElementById("menuLinks");

if (menuToggle && menuLinks) {
  menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    menuLinks.classList.toggle("open");
  });

  menuLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      menuLinks.classList.remove("open");
    });
  });
}

const revealItems = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach(item => observer.observe(item));

const carousels = document.querySelectorAll("[data-carousel]");

carousels.forEach(carousel => {
  const viewport = carousel.querySelector("[data-carousel-viewport]");
  const track = carousel.querySelector(".carousel-track");
  const prevBtn = carousel.querySelector(".carousel-arrow.prev");
  const nextBtn = carousel.querySelector(".carousel-arrow.next");
  const dotsWrap = carousel.querySelector(".carousel-dots");

  if (!viewport || !track || !prevBtn || !nextBtn || !dotsWrap) return;

  const slides = Array.from(track.children);
  let index = 0;
  let dots = [];

  const getVisibleCount = () => {
    const firstSlide = slides[0];
    if (!firstSlide) return 1;
    const slideWidth = firstSlide.getBoundingClientRect().width;
    const viewportWidth = viewport.getBoundingClientRect().width;
    return Math.max(1, Math.round(viewportWidth / slideWidth));
  };

  const getMaxIndex = () => {
    const visible = getVisibleCount();
    return Math.max(0, slides.length - visible);
  };

  const renderDots = () => {
    const maxIndex = getMaxIndex();
    const dotCount = maxIndex + 1;
    dotsWrap.innerHTML = "";
    dots = [];

    for (let i = 0; i < dotCount; i += 1) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel-dot";
      dot.setAttribute("aria-label", `Ir para posição ${i + 1}`);
      dot.addEventListener("click", () => {
        index = i;
        update();
      });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    }
  };

  const update = () => {
    const maxIndex = getMaxIndex();
    if (index > maxIndex) index = maxIndex;
    if (index < 0) index = 0;

    const firstSlide = slides[0];
    const slideWidth = firstSlide ? firstSlide.getBoundingClientRect().width : viewport.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).gap || "0");
    const offset = index * (slideWidth + gap);
    track.style.transform = `translateX(-${offset}px)`;

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index >= maxIndex;

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  };

  prevBtn.addEventListener("click", () => {
    index -= 1;
    update();
  });

  nextBtn.addEventListener("click", () => {
    index += 1;
    update();
  });

  renderDots();
  update();

  window.addEventListener("resize", () => {
    renderDots();
    update();
  });
});
