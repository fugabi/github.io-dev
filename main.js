(() => {
  const root = document.documentElement;
  const page = document.getElementById('page');
  const desktop = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // ---- horizontal scroll: vertical scroll position drives a translateX ----
  let current = 0, raf = null, ro = null;
  let goal = null, goalTimer = null; // anchor we're travelling to

  const goTo = () => { if (goal) scrollTo(0, goal.offsetLeft); };
  const cancelGoal = () => { goal = null; };

  const measure = () => {
    document.body.style.height = (page.scrollWidth - innerWidth + innerHeight) + 'px';
    goTo(); // layout grew (an image loaded)? re-aim at the target's new position
  };

  const tick = () => {
    const target = scrollY;
    current += (target - current) * (reduce.matches ? 1 : 0.1);
    if (Math.abs(target - current) < 0.1) current = target;
    page.style.transform = `translate3d(${-current}px,0,0)`;
    raf = current === target ? null : requestAnimationFrame(tick); // loop stops once settled
  };

  const onScroll = () => { raf ??= requestAnimationFrame(tick); };

  const enable = () => {
    root.classList.add('hscroll');
    current = scrollY;
    ro = new ResizeObserver(measure);
    ro.observe(page); // re-measures when images/fonts change the page width
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', measure);
    measure();
    tick();
  };

  const disable = () => {
    root.classList.remove('hscroll');
    ro?.disconnect();
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', measure);
    cancelAnimationFrame(raf); raf = null;
    page.style.transform = '';
    document.body.style.height = '';
  };

  const apply = () => (desktop.matches ? enable() : disable());
  desktop.addEventListener('change', apply);
  apply();

  // in-page links: map horizontal position to scroll position when hijacked
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !root.classList.contains('hscroll')) return;
    const t = document.querySelector(a.hash);
    if (!t) return;
    e.preventDefault();
    // lazy images between here and the target have no width yet, so the target
    // would drift right as they load: load them now and keep re-aiming
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
    goal = t;
    clearTimeout(goalTimer);
    goalTimer = setTimeout(cancelGoal, 4000);
    goTo();
  });
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((ev) =>
    addEventListener(ev, cancelGoal, { passive: true }));

  // ---- one-shot reveals + play videos only while visible ----
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (target.tagName === 'VIDEO') {
        if (isIntersecting && !reduce.matches) target.play().catch(() => {});
        else target.pause();
      } else if (isIntersecting) {
        target.classList.add('is-visible');
        io.unobserve(target);
      }
    });
  }, { rootMargin: '0px 10% 0px 10%' });

  document.querySelectorAll('.reveal, video').forEach((el) => io.observe(el));
})();
