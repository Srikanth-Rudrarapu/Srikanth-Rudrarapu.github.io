(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const hasGSAP = typeof gsap !== "undefined";

  /* ---------------- 1. HARDWARE-ACCELERATED LENIS ---------------- */
  let lenis = null;
  if (!reduceMotion && typeof Lenis !== "undefined") {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.1
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -25, duration: 1.15 });
        }
      });
    });
  }

  /* ---------------- 2. REPEATABLE CONTINUOUS MAGNETIC DRIFT ---------------- */
  if (!isTouch && hasGSAP && !reduceMotion) {
    const magneticEls = Array.from(document.querySelectorAll("[data-magnetic]"));

    magneticEls.forEach((el) => {
      let isHovered = false;
      let mouseRelX = 0;
      let mouseRelY = 0;
      let loopId = null;
      let angle = 0;

      function renderMotion() {
        if (!isHovered) return;
        angle += 0.055;
        const orbitX = Math.cos(angle) * 5.5;
        const orbitY = Math.sin(angle * 1.3) * 5.5;

        gsap.to(el, {
          x: mouseRelX + orbitX,
          y: mouseRelY + orbitY,
          duration: 0.25,
          ease: "power2.out",
          overwrite: "auto"
        });

        loopId = requestAnimationFrame(renderMotion);
      }

      function updateTarget(e) {
        const r = el.getBoundingClientRect();
        mouseRelX = (e.clientX - (r.left + r.width / 2)) * 0.42;
        mouseRelY = (e.clientY - (r.top + r.height / 2)) * 0.42;
      }

      el.addEventListener("mouseenter", (e) => {
        gsap.killTweensOf(el);
        if (loopId) cancelAnimationFrame(loopId);

        isHovered = true;
        angle = Math.random() * Math.PI * 2;
        updateTarget(e);

        gsap.to(el, { scale: 1.05, duration: 0.25, ease: "power2.out" });
        renderMotion();
      });

      el.addEventListener("mousemove", (e) => {
        if (!isHovered) {
          isHovered = true;
          renderMotion();
        }
        updateTarget(e);
      });

      el.addEventListener("mouseleave", () => {
        isHovered = false;
        if (loopId) {
          cancelAnimationFrame(loopId);
          loopId = null;
        }

        gsap.to(el, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.7,
          ease: "elastic.out(1.2, 0.44)",
          overwrite: "auto"
        });
      });
    });

    window.addEventListener("mousemove", (e) => {
      const PROXIMITY_RADIUS = 48;
      magneticEls.forEach((el) => {
        if (el.matches(":hover")) return;

        const r = el.getBoundingClientRect();
        const centerX = r.left + r.width / 2;
        const centerY = r.top + r.height / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const distance = Math.hypot(dx, dy);

        if (distance < r.width / 2 + PROXIMITY_RADIUS) {
          const strength = 0.24 * (1 - distance / (r.width / 2 + PROXIMITY_RADIUS));
          gsap.to(el, {
            x: dx * strength,
            y: dy * strength,
            duration: 0.35,
            ease: "power2.out",
            overwrite: "auto"
          });
        }
      });
    }, { passive: true });
  }

  /* ---------------- 2.1 ELASTIC 3D PERSPECTIVE TILT FOR ALL CARDS & WINDOWS ---------------- */
  if (!isTouch && !reduceMotion) {
    const tiltElements = document.querySelectorAll(
      ".audit-card, .system-card, .academic-paper-deck, .pub-cite, .feat-box, .metric-item, .firmlens__visual"
    );

    tiltElements.forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6.5;
        const rotateY = ((x - centerX) / centerX) * 6.5;

        card.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px) translateZ(10px)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0) translateZ(0)";
      });
    });
  }

  /* ---------------- 3. SLIDING "SLIPPER" NAV INDICATOR ---------------- */
  const indicator = document.getElementById("nav-indicator");
  const navLinks = Array.from(document.querySelectorAll(".nav__link"));
  const navMenu = document.getElementById("nav-menu");

  function moveIndicator(targetEl) {
    if (!indicator || !targetEl || window.innerWidth <= 768) return;
    const parentRect = navMenu.getBoundingClientRect();
    const rect = targetEl.getBoundingClientRect();

    indicator.style.left = `${rect.left - parentRect.left}px`;
    indicator.style.width = `${rect.width}px`;
    indicator.style.opacity = "1";
  }

  navLinks.forEach((link) => {
    link.addEventListener("mouseenter", () => moveIndicator(link));
  });

  if (navMenu) {
    navMenu.addEventListener("mouseleave", () => {
      const activeLink = document.querySelector(".nav__link.is-active");
      if (activeLink) moveIndicator(activeLink);
      else if (indicator) indicator.style.opacity = "0";
    });
  }

  /* ---------------- 4. SCROLL PROGRESS & ACTIVE SPY ---------------- */
  const progressEl = document.getElementById("progress");
  const trackedSections = navLinks.map((l) => document.getElementById(l.getAttribute("data-target"))).filter(Boolean);

  function handleScroll() {
    const h = document.documentElement;
    const scrollTop = window.pageYOffset || h.scrollTop;
    const pct = (scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    if (progressEl) progressEl.style.width = `${pct}%`;

    let currentSectionId = "home";
    trackedSections.forEach((section) => {
      const top = section.offsetTop - 130;
      if (scrollTop >= top) {
        currentSectionId = section.id;
      }
    });

    navLinks.forEach((link) => {
      const match = link.getAttribute("data-target") === currentSectionId;
      link.classList.toggle("is-active", match);
      if (match && !navMenu.matches(":hover")) {
        moveIndicator(link);
      }
    });
  }

  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("load", () => {
    handleScroll();
    const active = document.querySelector(".nav__link.is-active");
    if (active) moveIndicator(active);
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.refresh();
    }
  });
  window.addEventListener("resize", () => {
    const active = document.querySelector(".nav__link.is-active");
    if (active) moveIndicator(active);
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.refresh();
    }
  });

  /* ---------------- 5. MOBILE NAV DRAWER ---------------- */
  const toggleBtn = document.getElementById("nav-toggle");
  const siteNav = document.getElementById("site-nav");
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = navMenu.classList.toggle("is-open");
      toggleBtn.classList.toggle("is-active", open);
      toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    navMenu.querySelectorAll(".nav__link").forEach((item) => {
      item.addEventListener("click", () => {
        navMenu.classList.remove("is-open");
        toggleBtn.classList.remove("is-active");
        toggleBtn.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (e) => {
      if (siteNav && !siteNav.contains(e.target) && navMenu.classList.contains("is-open")) {
        navMenu.classList.remove("is-open");
        toggleBtn.classList.remove("is-active");
        toggleBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------------- 6. BIBTEX CLIPBOARD COPY ---------------- */
  const btnCopy = document.getElementById("btn-copy-cite");
  const citeText = document.getElementById("cite-text");
  if (btnCopy && citeText) {
    btnCopy.addEventListener("click", () => {
      navigator.clipboard.writeText(citeText.innerText).then(() => {
        btnCopy.innerText = "Copied!";
        btnCopy.style.borderColor = "var(--neon)";
        btnCopy.style.color = "var(--neon)";
        setTimeout(() => {
          btnCopy.innerText = "Copy";
          btnCopy.style.borderColor = "";
          btnCopy.style.color = "";
        }, 2000);
      });
    });
  }

  /* ---------------- 7. GSAP REVEALS & METRICS COUNTER ---------------- */
  if (hasGSAP && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);

    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
    }

    gsap.utils.toArray(".gs-fade").forEach((elem) => {
      gsap.fromTo(elem,
        { opacity: 0, y: 18 },
        {
          opacity: 1, y: 0, duration: 0.6, ease: "power2.out",
          scrollTrigger: { trigger: elem, start: "top 92%" }
        }
      );
    });

    gsap.utils.toArray(".count-up").forEach((item) => {
      const target = parseFloat(item.getAttribute("data-val"));
      const decimals = parseInt(item.getAttribute("data-decimals") || "0", 10);
      const obj = { val: 0 };

      ScrollTrigger.create({
        trigger: item,
        start: "top 94%",
        once: true,
        onEnter: () => {
          gsap.to(obj, {
            val: target,
            duration: 1.2,
            ease: "power2.out",
            onUpdate: () => {
              item.innerText = decimals > 0 ? obj.val.toFixed(decimals) : Math.round(obj.val);
            }
          });
        }
      });
    });
  }

  /* ---------------- 8. THREE.JS (HERO & ESP32 MODULE) ---------------- */
  if (typeof THREE !== "undefined" && !reduceMotion) {
    const NEON = 0x38ef7d;
    const CYAN = 0x11e8eb;
    const GOLD = 0xf0aa48;
    const RED_BLINK = 0xff3838;
    const RED_DARK = 0x2e0606;

    /* SCENE A: Hero Visual */
    const heroCanvas = document.getElementById("canvas-hero");
    if (heroCanvas) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, heroCanvas.clientWidth / heroCanvas.clientHeight, 0.1, 50);

      function updateHeroCamera() {
        const width = window.innerWidth;
        if (width <= 480) {
          camera.position.z = 7.2;
        } else if (width <= 768) {
          camera.position.z = 6.4;
        } else {
          camera.position.z = 5.4;
        }
      }
      updateHeroCamera();

      const renderer = new THREE.WebGLRenderer({ canvas: heroCanvas, alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.setSize(heroCanvas.clientWidth, heroCanvas.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));

      const globeGroup = new THREE.Group();
      function updateHeroPosition() {
        if (window.innerWidth <= 768) {
          globeGroup.position.x = 0;
          globeGroup.position.y = -0.2;
        } else {
          globeGroup.position.x = 1.65;
          globeGroup.position.y = 0;
        }
      }
      updateHeroPosition();
      scene.add(globeGroup);

      const innerCore = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.9, 2),
        new THREE.MeshBasicMaterial({ color: NEON, wireframe: true, transparent: true, opacity: 0.65 })
      );
      globeGroup.add(innerCore);

      const ringsGroup = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.15, 0.01, 6, 32),
          new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.6 })
        );
        ring.rotation.x = (Math.PI / 3) * i;
        ring.rotation.y = (Math.PI / 4) * i;
        ringsGroup.add(ring);
      }
      globeGroup.add(ringsGroup);

      const isSmall = window.innerWidth <= 768;
      const pCount = isSmall ? 140 : 320;
      const pos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        const r = 1.35 + Math.random() * 0.65;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const particles = new THREE.Points(
        pGeo,
        new THREE.PointsMaterial({ color: GOLD, size: 0.036, transparent: true, opacity: 0.85 })
      );
      globeGroup.add(particles);

      let isHeroActive = true;
      const heroObserver = new IntersectionObserver((entries) => {
        isHeroActive = entries[0].isIntersecting;
      }, { threshold: 0.05 });
      heroObserver.observe(heroCanvas);

      function loopHero() {
        if (isHeroActive) {
          globeGroup.rotation.y += 0.0035;
          globeGroup.rotation.x += 0.0015;
          ringsGroup.rotation.z += 0.002;
          particles.rotation.y -= 0.0025;
          renderer.render(scene, camera);
        }
        requestAnimationFrame(loopHero);
      }
      loopHero();

      window.addEventListener("resize", () => {
        updateHeroCamera();
        updateHeroPosition();
        camera.aspect = heroCanvas.clientWidth / heroCanvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(heroCanvas.clientWidth, heroCanvas.clientHeight);
      }, { passive: true });
    }

    /* SCENE B: Detailed ESP32 Board Stage (Position Centered) */
    const flCanvas = document.getElementById("canvas-firmlens");
    if (flCanvas) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, flCanvas.clientWidth / flCanvas.clientHeight, 0.1, 50);

      function updateFLCamera() {
        const w = window.innerWidth;
        if (w <= 480) {
          camera.position.set(2.5, 2.8, 3.1);
        } else if (w <= 768) {
          camera.position.set(2.7, 2.5, 3.2);
        } else {
          camera.position.set(2.8, 2.0, 3.2);
        }
        camera.lookAt(0, 0, 0);
      }
      updateFLCamera();

      const renderer = new THREE.WebGLRenderer({ canvas: flCanvas, alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.setSize(flCanvas.clientWidth, flCanvas.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));

      const stageGroup = new THREE.Group();
      stageGroup.position.set(0, 0, 0);
      scene.add(stageGroup);

      const chipGroup = new THREE.Group();
      stageGroup.add(chipGroup);

      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 0.08, 1.7),
        new THREE.MeshBasicMaterial({ color: 0x090e14 })
      );
      chipGroup.add(pcb);

      const pcbEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(pcb.geometry),
        new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.6 })
      );
      pcb.add(pcbEdges);

      const antGroup = new THREE.Group();
      antGroup.position.set(-0.92, 0.05, 0);
      for (let i = -3; i <= 3; i++) {
        const trace = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.02, 0.32),
          new THREE.MeshBasicMaterial({ color: GOLD })
        );
        trace.position.set(0, 0, i * 0.17);
        antGroup.add(trace);
      }
      const spine = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.02, 1.2),
        new THREE.MeshBasicMaterial({ color: GOLD })
      );
      antGroup.add(spine);
      chipGroup.add(antGroup);

      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.15, 1.3),
        new THREE.MeshBasicMaterial({ color: 0x222b38 })
      );
      shield.position.set(0.15, 0.1, 0);
      chipGroup.add(shield);

      const shieldBorder = new THREE.LineSegments(
        new THREE.EdgesGeometry(shield.geometry),
        new THREE.LineBasicMaterial({ color: CYAN })
      );
      shield.add(shieldBorder);

      const pinGeo = new THREE.BoxGeometry(0.08, 0.03, 0.14);
      const pinMat = new THREE.MeshBasicMaterial({ color: GOLD });
      for (let i = -4; i <= 4; i++) {
        const pinNorth = new THREE.Mesh(pinGeo, pinMat);
        pinNorth.position.set(i * 0.21, 0.02, 0.83);
        chipGroup.add(pinNorth);

        const pinSouth = new THREE.Mesh(pinGeo, pinMat);
        pinSouth.position.set(i * 0.21, 0.02, -0.83);
        chipGroup.add(pinSouth);
      }

      /* Blinking Status LED */
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, 0.06),
        new THREE.MeshBasicMaterial({ color: RED_BLINK })
      );
      led.position.set(0.85, 0.08, 0.6);
      chipGroup.add(led);

      const orbitRing = new THREE.Mesh(
        new THREE.TorusGeometry(2.1, 0.009, 6, 36),
        new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.35 })
      );
      orbitRing.rotation.x = Math.PI / 2.3;
      stageGroup.add(orbitRing);

      let isFLActive = true;
      const flObserver = new IntersectionObserver((entries) => {
        isFLActive = entries[0].isIntersecting;
      }, { threshold: 0.05 });
      flObserver.observe(flCanvas);

      let t = 0;
      function loopFL() {
        if (isFLActive) {
          t += 0.03;
          chipGroup.rotation.y += 0.005;
          orbitRing.rotation.z += 0.003;
          led.material.color.setHex(Math.sin(t * 3) > 0 ? RED_BLINK : RED_DARK);
          camera.lookAt(0, 0, 0);
          renderer.render(scene, camera);
        }
        requestAnimationFrame(loopFL);
      }
      loopFL();

      window.addEventListener("resize", () => {
        updateFLCamera();
        camera.aspect = flCanvas.clientWidth / flCanvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(flCanvas.clientWidth, flCanvas.clientHeight);
      }, { passive: true });
    }
  }
})();