/**
 * O.C.E.A.N - High-End Interaction & Atmosphere Layer
 * Smooth entrance orchestration, responsive cursor reticle,
 * magnetic physics for primary actions, and atmospheric ambient lighting.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  /* ── 1. Coordinated Entrance Sequence ───────────────────── */
  function runEntrance() {
    var enterElements = document.querySelectorAll('.enter');
    enterElements.forEach(function (el) {
      el.classList.add('in');
    });
  }

  // Trigger when satellite frames complete preloading
  document.addEventListener('ocean:ready', runEntrance, { once: true });
  window.addEventListener('load', function () {
    setTimeout(runEntrance, 700);
  });

  /* ── 2. Scroll-Reveal Observer ──────────────────────────── */
  var revealTargets = document.querySelectorAll('[data-reveal]');
  if (revealTargets.length) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var delay = entry.target.getAttribute('data-delay') || 0;
            entry.target.style.setProperty('--rd', delay);
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealTargets.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ── 3. Mobile Navigation Menu ──────────────────────────── */
  var hamburger = document.getElementById('navHamburger');
  var navbarEl = document.getElementById('navbar');
  if (hamburger && navbarEl) {
    hamburger.addEventListener('click', function () {
      var open = navbarEl.classList.toggle('menu-open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    navbarEl.querySelectorAll('.nav-links a').forEach(function (link) {
      link.addEventListener('click', function () {
        navbarEl.classList.remove('menu-open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── 4. Interactive Precision Cursor (Desktop Only) ─────── */
  var reticle = document.getElementById('cursorReticle');
  if (reticle && !isCoarsePointer && !reduceMotion) {
    var cursorX = -100, cursorY = -100;
    var targetX = -100, targetY = -100;
    var isHoveringInteractive = false;

    window.addEventListener('mousemove', function (e) {
      targetX = e.clientX;
      targetY = e.clientY;
    }, { passive: true });

    function renderCursor() {
      // Smooth interpolation for reticle ring
      cursorX += (targetX - cursorX) * 0.22;
      cursorY += (targetY - cursorY) * 0.22;

      reticle.style.transform = 'translate3d(' + cursorX + 'px, ' + cursorY + 'px, 0)';

      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    // Interactive target detection
    var interactiveElements = 'a, button, .prog-dot, [role="button"], input, .cta-feature';
    document.addEventListener('mouseover', function (e) {
      if (e.target && e.target.closest && e.target.closest(interactiveElements)) {
        if (!isHoveringInteractive) {
          isHoveringInteractive = true;
          reticle.classList.add('cursor-active');
        }
      } else {
        if (isHoveringInteractive) {
          isHoveringInteractive = false;
          reticle.classList.remove('cursor-active');
        }
      }
    });

    document.addEventListener('mouseleave', function () {
      reticle.style.opacity = '0';
    });
    document.addEventListener('mouseenter', function () {
      reticle.style.opacity = '1';
    });
  }

  /* ── 5. Ambient Atmospheric Lighting & Parallax ─────────── */
  var heroSection = document.getElementById('hero');
  var cursorGlow = document.getElementById('heroCursorGlow');
  var depthEls = document.querySelectorAll('[data-depth]');

  if (heroSection && !reduceMotion && !isCoarsePointer) {
    var mouseX = 0, mouseY = 0;
    var currentGlowX = 0, currentGlowY = 0;
    var isTicking = false;

    heroSection.addEventListener('mousemove', function (e) {
      var rect = heroSection.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;

      if (!isTicking) {
        isTicking = true;
        requestAnimationFrame(updateAmbientLighting);
      }
    }, { passive: true });

    heroSection.addEventListener('mouseleave', function () {
      if (cursorGlow) {
        cursorGlow.style.opacity = '0';
      }
    });

    heroSection.addEventListener('mouseenter', function () {
      if (cursorGlow) {
        cursorGlow.style.opacity = '1';
      }
    });

    function updateAmbientLighting() {
      currentGlowX += (mouseX - currentGlowX) * 0.12;
      currentGlowY += (mouseY - currentGlowY) * 0.12;

      if (cursorGlow) {
        cursorGlow.style.transform = 'translate3d(' + currentGlowX + 'px, ' + currentGlowY + 'px, 0)';
      }

      var rect = heroSection.getBoundingClientRect();
      var normalizedX = (currentGlowX / rect.width - 0.5) * 2;
      var normalizedY = (currentGlowY / rect.height - 0.5) * 2;

      depthEls.forEach(function (el) {
        var depth = parseFloat(el.getAttribute('data-depth')) || 0;
        var maxTravel = 12; // Controlled max displacement
        var tx = normalizedX * maxTravel * depth;
        var ty = normalizedY * maxTravel * depth;
        el.style.transform = 'translate3d(' + tx.toFixed(2) + 'px, ' + ty.toFixed(2) + 'px, 0)';
      });

      isTicking = false;
    }
  }

  /* ── 6. Subtle Magnetic Physics for Primary CTAs ────────── */
  if (!reduceMotion && !isCoarsePointer) {
    var magneticBtns = document.querySelectorAll('.hero-cta-btn, .demo-button, .nav-cta');
    magneticBtns.forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = 'translate3d(' + (x * 0.18).toFixed(1) + 'px, ' + (y * 0.18).toFixed(1) + 'px, 0)';
      });

      btn.addEventListener('mouseleave', function () {
        btn.style.transform = 'translate3d(0, 0, 0)';
      });
    });
  }

  /* ── 7. Architectural Feature Tilt ──────────────────────── */
  if (!reduceMotion && !isCoarsePointer) {
    var tiltCards = document.querySelectorAll('.cta-feature[data-tilt]');
    tiltCards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var dx = (e.clientX - rect.left) / rect.width - 0.5;
        var dy = (e.clientY - rect.top) / rect.height - 0.5;
        var maxRot = parseFloat(card.getAttribute('data-tilt')) || 4;
        card.style.transform =
          'perspective(800px) rotateX(' + (-dy * maxRot).toFixed(2) + 'deg) rotateY(' + (dx * maxRot).toFixed(2) + 'deg) translateY(-2px)';
      });

      card.addEventListener('mouseleave', function () {
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0)';
      });
    });
  }

})();
