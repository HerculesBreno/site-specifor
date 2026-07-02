/* ============================================================
   ACESSIBILIDADE — prefers-reduced-motion
   ============================================================ */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reducedMotion) {
  document.querySelectorAll('.anim-hero').forEach(el => { el.style.opacity = '1'; });
  document.querySelectorAll('.anim-fade').forEach(el => { el.style.opacity = '1'; });
  document.querySelectorAll('.anim-slide').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
  document.querySelectorAll('.anim-stagger').forEach(el => el.classList.add('build-in'));
}

/* ============================================================
   HERO — fade ao carregar o DOM
   ============================================================ */
if (!reducedMotion) {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.anim-hero').forEach(el => el.classList.add('show'));
  });
}

/* ============================================================
   HEADER — is-scrolled via IntersectionObserver
   ============================================================ */
const header   = document.querySelector('.site-header');
const sentinel = document.getElementById('inicio');

if (header && sentinel) {
  const io = new IntersectionObserver(
    ([entry]) => header.classList.toggle('is-scrolled', !entry.isIntersecting),
    { rootMargin: `-${getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim()} 0px 0px 0px` }
  );
  io.observe(sentinel);
}

/* ============================================================
   HAMBURGER — mobile navigation
   ============================================================ */
const navToggle  = document.querySelector('.nav-toggle');
const mobileMenu = document.getElementById('mobile-menu');

if (navToggle && mobileMenu) {
  function openMenu() {
    navToggle.setAttribute('aria-expanded', 'true');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    navToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  navToggle.addEventListener('click', () => {
    navToggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });
  mobileMenu.querySelectorAll('a').forEach(l => l.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
      closeMenu(); navToggle.focus();
    }
  });
  document.addEventListener('click', e => {
    if (navToggle.getAttribute('aria-expanded') === 'true' && !header.contains(e.target)) closeMenu();
  });
}

/* ============================================================
   SCROLL ENGINE

   Convenção de coordenadas:
   startVh: offset em % de vh adicionado à viewport height
     startVh = 0   → startPx = vh  (borda inferior da viewport)
     startVh = -15 → startPx = 0.85*vh (85% do topo)
     startVh = 5   → startPx = 1.05*vh (5% abaixo da borda inferior)

   Para animações que entram por baixo: startPx > endPx
   Ou seja: startVh > endVh
   ============================================================ */
if (!reducedMotion) {

  class ScrollEngine {
    constructor() {
      this.keyframes = [];
      this.ticking   = false;
      window.addEventListener('scroll', () => this.requestTick(), { passive: true });
      window.addEventListener('resize', () => this.update(),      { passive: true });
    }

    add(options) {
      this.keyframes.push(options);
      return this;
    }

    requestTick() {
      if (this.ticking) return;
      this.ticking = true;
      requestAnimationFrame(() => { this.update(); this.ticking = false; });
    }

    // startPx > endPx → progress 0→1 conforme rect.top decresce (elemento sobe)
    getScrollProgress(anchor, startVh, endVh) {
      const ref = typeof anchor === 'string' ? document.querySelector(anchor) : anchor;
      if (!ref) return 0;
      const rect    = ref.getBoundingClientRect();
      const vh      = window.innerHeight;
      const startPx = vh + startVh * vh / 100;  // threshold onde progress = 0
      const endPx   = vh + endVh   * vh / 100;  // threshold onde progress = 1
      const raw     = (startPx - rect.top) / (startPx - endPx);
      return Math.min(Math.max(raw, 0), 1);
    }

    lerp(a, b, t) { return a + (b - a) * t; }

    applyEase(t, ease = 0) {
      if (ease === 0) return t;
      return t + Math.sin(t * Math.PI) * ease;
    }

    update() {
      this.keyframes.forEach(kf => {
        const progress = this.getScrollProgress(
          kf.relativeTo || kf.el,
          kf.startVh ?? 0,
          kf.endVh   ?? -40
        );
        const t = this.applyEase(progress, kf.ease ?? 0.2);

        if (kf.fromY !== undefined && kf.toY !== undefined) {
          kf.el.style.transform = `translateY(${this.lerp(kf.fromY, kf.toY, t)}px)`;
        }

        if (kf.fromOpacity !== undefined && kf.toOpacity !== undefined) {
          kf.el.style.opacity = String(this.lerp(kf.fromOpacity, kf.toOpacity, t));
        }

        if (kf.cssClass) {
          if (progress > 0) {
            kf.el.classList.add(kf.cssClass);
          } else if (kf.toggle) {
            kf.el.classList.remove(kf.cssClass);
          }
        }
      });
    }
  }

  const engine = new ScrollEngine();

  /* ----------------------------------------------------------
     PADRÃO 1 ADAPTADO — Hero bg parallax simples
     Usa scrollY diretamente (hero está sempre no topo da página)
     ---------------------------------------------------------- */
  const heroBg = document.querySelector('.hero__bg');
  if (heroBg) {
    let heroPending = false;
    function updateHeroParallax() {
      if (heroPending) return;
      heroPending = true;
      requestAnimationFrame(() => {
        heroBg.style.transform = `translateY(${window.scrollY * 0.25}px)`;
        heroPending = false;
      });
    }
    window.addEventListener('scroll', updateHeroParallax, { passive: true });
  }

  /* ----------------------------------------------------------
     PADRÃO 2 — Fade-in simples (.anim-fade)
     startVh=-15 → trigger quando topo do el está a 85% do topo
     startVh > endVh → startPx (0.85*vh) > endPx (0.4*vh) ✓
     ---------------------------------------------------------- */
  document.querySelectorAll('.anim-fade').forEach(el => {
    // will-change quando el está próximo de entrar na viewport
    engine.add({
      el,
      startVh:  10,   // startPx = 1.1*vh (ligeiramente abaixo)
      endVh:   -30,   // endPx   = 0.7*vh
      cssClass: 'will-change',
      toggle:   true
    });
    // fade real: dispara quando el está a 85% do topo
    engine.add({
      el,
      startVh:  -15,  // startPx = 0.85*vh
      endVh:    -60,  // endPx   = 0.4*vh
      cssClass: 'show',
      toggle:   false
    });
  });

  /* ----------------------------------------------------------
     PADRÃO 3 — Slide-up + Fade (.anim-slide)
     startVh (5) > endVh (-25) → startPx > endPx ✓
     Elemento começa abaixo e sobe para posição normal
     ---------------------------------------------------------- */
  document.querySelectorAll('.anim-slide').forEach(el => {
    engine.add({
      el,
      relativeTo:   el,
      startVh:      5,    // startPx = 1.05*vh — just below viewport
      endVh:       -30,   // endPx   = 0.70*vh — 70% from top
      fromY:        28,
      toY:          0,
      fromOpacity:  0,
      toOpacity:    1,
      ease:         0.25
    });
  });

  /* ----------------------------------------------------------
     PADRÃO 4 — Parallax de seção para imagens de produto
     startVh (50) > endVh (-100) → startPx > endPx ✓
     ---------------------------------------------------------- */
  const productImage = document.querySelector('.product-image');
  if (productImage) {
    const py = window.innerWidth > 1068 ? -40 : window.innerWidth > 735 ? -25 : -15;
    engine.add({
      el:         productImage,
      relativeTo: '.product-section',
      startVh:    50,    // startPx = 1.5*vh
      endVh:     -100,   // endPx   = 0
      fromY:      0,
      toY:        py,
      ease:       0
    });
  }

  const splitVisual = document.querySelector('.split-visual');
  if (splitVisual) {
    const py = window.innerWidth > 1068 ? -60 : window.innerWidth > 735 ? -40 : -20;
    engine.add({
      el:         splitVisual,
      relativeTo: '.split-section',
      startVh:    50,
      endVh:     -100,
      fromY:      0,
      toY:        py,
      ease:       0
    });
  }

  /* ----------------------------------------------------------
     PADRÃO 5 — Stagger (.anim-stagger)
     Mesmo critério do Padrão 2: trigger a 85% do topo
     ---------------------------------------------------------- */
  document.querySelectorAll('.anim-stagger').forEach(el => {
    engine.add({
      el,
      startVh:  -15,  // startPx = 0.85*vh
      endVh:    -60,
      cssClass: 'build-in',
      toggle:   false
    });
  });

  /* ----------------------------------------------------------
     PADRÃO 6 — Slide-up pesado para seção CTA
     Cascata: cada elemento termina com janela ligeiramente menor
     ---------------------------------------------------------- */
  [
    { sel: '.cta-title',       endVh: -45 },
    { sel: '.cta-body',        endVh: -40 },
    { sel: '.cta-section .btn', endVh: -35 }
  ].forEach(({ sel, endVh }) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.classList.remove('anim-fade', 'anim-slide');
    engine.add({
      el,
      relativeTo:  '.cta-section',
      startVh:      5,
      endVh,
      fromY:        36,
      toY:          0,
      fromOpacity:  0,
      toOpacity:    1,
      ease:         0.25
    });
  });

  // Primeira passagem — elementos já visíveis ao carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => engine.update());
  } else {
    engine.update();
  }
}
