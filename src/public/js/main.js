const revealBlocks = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

revealBlocks.forEach((block) => revealObserver.observe(block));

const counters = document.querySelectorAll('[data-counter]');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    const el = entry.target;
    const target = Number(el.dataset.counter);
    const duration = 1200;
    const start = performance.now();

    function update(ts) {
      const progress = Math.min((ts - start) / duration, 1);
      el.textContent = Math.floor(progress * target).toLocaleString('uk-UA');
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.4 });

counters.forEach((counter) => counterObserver.observe(counter));
