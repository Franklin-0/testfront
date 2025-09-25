document.addEventListener('DOMContentLoaded', () => {
  const faders = document.querySelectorAll('.fade-in-left, .fade-in-right');

  const appearOptions = {
    threshold: 0.2,
    rootMargin: "0px 0px -50px 0px"
  };

  const appearOnScroll = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // stop observing after visible
      }
    });
  }, appearOptions);

  faders.forEach(fader => appearOnScroll.observe(fader));
});
