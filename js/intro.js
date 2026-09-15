/**
 * Intro overlay — DualSense collision + logo handoff.
 * Isolated from the main app: replace #app-shell freely without touching this file.
 *
 * Public API:
 *   window.Ps5Intro.start({ onComplete?: () => void })
 *   window.Ps5Intro.skip()
 */
(function (global) {
  const TIMING = {
    logoToCornerAt: 5900,
    fadeIntroAt: 7350,
    removeIntroAt: 8500,
  };

  let timers = [];
  let rafId = 0;
  let finished = false;

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function schedule(fn, ms) {
    timers.push(setTimeout(fn, ms));
  }

  function finish(onComplete) {
    if (finished) return;
    finished = true;
    clearTimers();

    const intro = document.getElementById("intro");
    const siteLogo = document.getElementById("site-logo");
    const appShell = document.getElementById("app-shell");

    document.body.classList.remove("intro-active");
    document.body.classList.add("intro-done");

    if (siteLogo) {
      siteLogo.classList.add("is-visible");
    }
    if (appShell) {
      appShell.classList.add("is-ready");
      appShell.removeAttribute("aria-hidden");
    }
    if (intro) {
      intro.style.opacity = "0";
      schedule(() => {
        intro.style.display = "none";
        intro.setAttribute("aria-hidden", "true");
      }, 1000);
    }

    if (typeof onComplete === "function") onComplete();
  }

  function startParticles(canvas) {
    if (!canvas) return () => {};
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => {};

    let W = 0;
    let H = 0;
    let DPR = 1;
    const particles = [];
    const animationStart = performance.now();
    let running = true;

    function resizeCanvas() {
      DPR = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    for (let i = 0; i < 450; i += 1) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 3,
        radius: 0.5 + Math.random() * 2,
        delay: Math.random() * 1.8,
      });
    }

    function renderParticles(currentTime) {
      if (!running) return;
      const elapsed = (currentTime - animationStart) / 1000;
      ctx.clearRect(0, 0, W, H);

      if (elapsed > 2.1 && elapsed < 6) {
        const time = elapsed - 2.1;
        const centerX = W / 2;
        const centerY = H / 2;

        particles.forEach((particle) => {
          if (time < particle.delay) return;
          const localTime = time - particle.delay;
          const distance = localTime * localTime * 95 * particle.speed;
          const x = centerX + Math.cos(particle.angle) * distance;
          const y = centerY + Math.sin(particle.angle) * distance;

          ctx.globalAlpha = Math.max(0, Math.min(1, 1 - localTime / 2.6));
          ctx.fillStyle = particle.speed > 2 ? "#e5b85d" : "#ffffff";
          ctx.beginPath();
          ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      rafId = requestAnimationFrame(renderParticles);
    }

    rafId = requestAnimationFrame(renderParticles);

    return function stopParticles() {
      running = false;
      window.removeEventListener("resize", resizeCanvas);
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };
  }

  function start(options) {
    const opts = options || {};
    const onComplete = opts.onComplete;
    const intro = document.getElementById("intro");
    const logo = intro && intro.querySelector(".intro-logo");
    const siteLogo = document.getElementById("site-logo");
    const appShell = document.getElementById("app-shell");

    if (
      !intro ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      finish(onComplete);
      return;
    }

    finished = false;
    document.body.classList.add("intro-active");
    if (appShell) appShell.setAttribute("aria-hidden", "true");

    const stopParticles = startParticles(document.getElementById("intro-fx"));

    // Этап 2: логотип улетает в левый верхний угол
    schedule(() => {
      if (logo) {
        logo.style.animation =
          "logoToCorner 1.4s cubic-bezier(.22,.8,.2,1) forwards";
      }
    }, TIMING.logoToCornerAt);

    // Этап 3: fade intro + показать постоянный логотип сайта
    schedule(() => {
      intro.style.opacity = "0";
      if (siteLogo) siteLogo.classList.add("is-visible");
      if (appShell) appShell.classList.add("is-ready");
      document.body.classList.remove("intro-active");
      document.body.classList.add("intro-done");
    }, TIMING.fadeIntroAt);

    // Этап 4: убрать intro из DOM-потока
    schedule(() => {
      stopParticles();
      intro.style.display = "none";
      intro.setAttribute("aria-hidden", "true");
      finished = true;
      if (typeof onComplete === "function") onComplete();
    }, TIMING.removeIntroAt);
  }

  function skip(onComplete) {
    finish(onComplete);
  }

  global.Ps5Intro = { start, skip, TIMING };

  function boot() {
    if (!global.Ps5Intro) return;
    global.Ps5Intro.start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);