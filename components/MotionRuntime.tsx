"use client";

import { useEffect } from "react";

export default function MotionRuntime() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".siteHeader");
    const navLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("[data-nav]")
    );

    const onScroll = () => {
      header?.classList.toggle("scrolled", window.scrollY > 24);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

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
      { threshold: 0.16, rootMargin: "0px 0px -5% 0px" }
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
      revealObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  return null;
}
