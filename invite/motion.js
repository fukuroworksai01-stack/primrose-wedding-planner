(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const body = document.body;
  const toggle = document.querySelector('.motion-toggle');
  const revealNodes = [...document.querySelectorAll('.reveal')];
  let revealObserver;
  function revealAll() {
    revealObserver?.disconnect();
    revealNodes.forEach(node => node.classList.remove('is-ready'));
  }
  if ('IntersectionObserver' in window && !reduced.matches) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    revealNodes.forEach(node => {
      node.classList.add('is-ready');
      revealObserver.observe(node);
    });
    // Anchor navigation and keyboard focus must never land on invisible content.
    document.addEventListener('focusin', event => {
      const node = event.target.closest('.reveal');
      if (node) node.classList.add('is-visible');
    });
  }
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      const paused = body.classList.toggle('motion-paused');
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.setAttribute('aria-label', paused ? 'アニメーションを再生' : 'アニメーションを停止');
      toggle.querySelector('span').textContent = paused ? '▷' : 'Ⅱ';
      if (paused) revealAll();
    });
  }
  reduced.addEventListener('change', event => { if (event.matches) revealAll(); });
  document.addEventListener('visibilitychange', () => {
    body.classList.toggle('page-hidden', document.hidden);
  });
  const nav = document.querySelector('.guest-nav');
  const cover = document.querySelector('.cover');
  const rsvp = document.querySelector('#rsvp');
  const footer = document.querySelector('.footer');
  if (nav && cover && rsvp && footer && 'IntersectionObserver' in window) {
    const visible = new Set();
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      nav.hidden = visible.has(cover) || visible.has(rsvp) || visible.has(footer);
    });
    [cover, rsvp, footer].forEach(node => navObserver.observe(node));
  }
})();
