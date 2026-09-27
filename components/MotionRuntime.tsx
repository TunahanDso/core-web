"use client";

import { useEffect } from "react";

export default function MotionRuntime() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const header = document.querySelector<HTMLElement>(".siteHeader");
    const scrollProgress =
      document.querySelector<HTMLElement>("[data-scroll-progress]");
    const navLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("[data-nav]")
    );
    const progressBars = Array.from(
      document.querySelectorAll<HTMLElement>("[data-progress]")
    );
    const tiltCards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-tilt]")
    );

    root.classList.add("motion-ready");

    const onScroll = () => {
      header?.classList.toggle("scrolled", window.scrollY > 24);

      if (scrollProgress) {
        const max = Math.max(
          document.documentElement.scrollHeight - window.innerHeight,
          1
        );
        scrollProgress.style.transform = `scaleX(${Math.min(
          Math.max(window.scrollY / max, 0),
          1
        )})`;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      root.style.setProperty("--mouse-x", `${event.clientX}px`);
      root.style.setProperty("--mouse-y", `${event.clientY}px`);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const tiltCleanups = tiltCards.map((card) => {
      const move = (event: PointerEvent) => {
        if (reducedMotion) return;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        card.style.setProperty("--tilt-x", `${((0.5 - y) * 4).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${((x - 0.5) * 5).toFixed(2)}deg`);
        card.style.setProperty("--spot-x", `${(x * 100).toFixed(1)}%`);
        card.style.setProperty("--spot-y", `${(y * 100).toFixed(1)}%`);
      };
      const leave = () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      };
      card.addEventListener("pointermove", move);
      card.addEventListener("pointerleave", leave);
      return () => {
        card.removeEventListener("pointermove", move);
        card.removeEventListener("pointerleave", leave);
      };
    });

    if (reducedMotion) {
      document
        .querySelectorAll<HTMLElement>("[data-reveal]")
        .forEach((element) => element.classList.add("is-visible"));

      progressBars.forEach((bar) => {
        bar.style.width = `${bar.dataset.progress}%`;
      });
    } else {
      progressBars.forEach((bar) => {
        bar.style.width = "0%";
      });

      const revealObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const element = entry.target as HTMLElement;
            element.classList.add("is-visible");

            const progress = element.querySelector<HTMLElement>("[data-progress]");
            if (progress) {
              progress.style.width = `${progress.dataset.progress}%`;
            }

            const counter = element.querySelector<HTMLElement>("[data-count]");
            if (counter && !counter.dataset.animated) {
              counter.dataset.animated = "true";
              const target = Number(counter.dataset.count ?? "0");
              const duration = 850;
              const start = performance.now();

              const tick = (now: number) => {
                const progressValue = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progressValue, 3);
                const value = Math.round(target * eased);
                counter.textContent = String(value).padStart(2, "0");
                if (progressValue < 1) requestAnimationFrame(tick);
              };

              requestAnimationFrame(tick);
            }

            revealObserver.unobserve(element);
          }
        },
        { threshold: 0.13, rootMargin: "0px 0px -4% 0px" }
      );

      document
        .querySelectorAll<HTMLElement>("[data-reveal]")
        .forEach((element) => revealObserver.observe(element));

      const sections = navLinks
        .map((link) => {
          const href = link.getAttribute("href");
          if (!href?.startsWith("#")) return null;
          return document.querySelector<HTMLElement>(href);
        })
        .filter((section): section is HTMLElement => Boolean(section));

      const sectionObserver = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

          if (!visible) return;

          navLinks.forEach((link) => {
            link.classList.toggle(
              "active",
              link.getAttribute("href") === `#${visible.target.id}`
            );
          });
        },
        { threshold: [0.25, 0.45, 0.65], rootMargin: "-20% 0px -55% 0px" }
      );

      sections.forEach((section) => sectionObserver.observe(section));

      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("pointermove", onPointerMove);
        tiltCleanups.forEach((cleanup) => cleanup());
        revealObserver.disconnect();
        sectionObserver.disconnect();
        root.classList.remove("motion-ready");
      };
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      tiltCleanups.forEach((cleanup) => cleanup());
      root.classList.remove("motion-ready");
    };
  }, []);

  return null;
}
