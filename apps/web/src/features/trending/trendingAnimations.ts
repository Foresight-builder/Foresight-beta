import type React from "react";
import { TRENDING_CATEGORIES } from "./trendingModel";

export const createSmartClickEffect = (event: React.MouseEvent) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;
  const button = event.currentTarget as HTMLElement;
  const rect = button.getBoundingClientRect();
  const buttonSize = Math.max(rect.width, rect.height);
  const glowColor = "rgba(139, 92, 246, 0.15)";
  const baseColor = "#8B5CF6";

  const sizeMultiplier = Math.max(0.8, Math.min(2.0, buttonSize / 50));
  const rippleSize = Math.max(rect.width, rect.height) * (1.5 + sizeMultiplier * 0.3);
  const glowSize = 1.5 + sizeMultiplier * 0.5;

  const glow = document.createElement("div");
  glow.style.position = "fixed";
  glow.style.top = "0";
  glow.style.left = "0";
  glow.style.width = "100%";
  glow.style.height = "100%";
  glow.style.background = `radial-gradient(circle at ${event.clientX}px ${
    event.clientY
  }px, ${glowColor} 0%, ${glowColor.replace("0.15", "0.1")} 25%, ${glowColor.replace(
    "0.15",
    "0.05"
  )} 40%, transparent 70%)`;
  glow.style.pointerEvents = "none";
  glow.style.zIndex = "9999";
  glow.style.opacity = "0";
  document.body.appendChild(glow);
  glow.animate(
    [
      { opacity: 0, transform: "scale(0.8)" },
      { opacity: 0.6, transform: `scale(${glowSize})` },
      { opacity: 0, transform: `scale(${glowSize * 1.2})` },
    ],
    { duration: 600, easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" }
  );
  setTimeout(() => glow.remove(), 600);

  const buttonRect = button.getBoundingClientRect();
  const clickX = event.clientX - buttonRect.left;
  const clickY = event.clientY - buttonRect.top;

  const ripple = document.createElement("span");
  ripple.className = "absolute rounded-full pointer-events-none";
  ripple.style.width = ripple.style.height = rippleSize + "px";
  ripple.style.left = clickX - rippleSize / 2 + "px";
  ripple.style.top = clickY - rippleSize / 2 + "px";
  ripple.style.background = `radial-gradient(circle, rgba(255,255,255,0.8) 0%, ${baseColor}40 40%, ${baseColor}20 70%, transparent 95%)`;
  ripple.style.boxShadow = `0 0 20px ${baseColor}30`;
  ripple.style.transform = "scale(0)";

  const originalPosition = button.style.position;
  if (getComputedStyle(button).position === "static") {
    button.style.position = "relative";
  }
  button.appendChild(ripple);

  const rippleDuration = Math.max(400, Math.min(800, 500 + sizeMultiplier * 100));
  ripple.animate(
    [
      { transform: "scale(0)", opacity: 0.8 },
      { transform: "scale(1)", opacity: 0.4 },
      { transform: "scale(1.5)", opacity: 0 },
    ],
    { duration: rippleDuration, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
  );

  setTimeout(() => {
    ripple.remove();
    button.style.position = originalPosition;
  }, rippleDuration);

  let scaleAmount = Math.max(0.85, Math.min(0.98, 0.95 - sizeMultiplier * 0.03));
  const bounceAmount = 1.05;
  button.style.transition = "transform 150ms ease-out";
  button.style.transform = `scale(${scaleAmount})`;
  setTimeout(() => {
    button.style.transform = `scale(${bounceAmount})`;
    setTimeout(() => {
      button.style.transform = "scale(1)";
      setTimeout(() => {
        button.style.transition = "";
      }, 150);
    }, 75);
  }, 75);
};

export const createHeartParticles = (button: HTMLElement, isUnfollowing: boolean) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const rect = button.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const particlesContainer = document.createElement("div");
  particlesContainer.className = "fixed pointer-events-none z-50";
  particlesContainer.style.left = "0";
  particlesContainer.style.top = "0";
  particlesContainer.style.width = "100vw";
  particlesContainer.style.height = "100vh";

  document.body.appendChild(particlesContainer);

  const particleCount = isUnfollowing ? 8 : 12;
  const particles: HTMLDivElement[] = [];

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.className = "absolute w-2 h-2 rounded-full";
    particle.style.background = isUnfollowing ? "#9ca3af" : "#ef4444";
    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;
    particle.style.transform = "translate(-50%, -50%)";

    particlesContainer.appendChild(particle);
    particles.push(particle);
  }

  particles.forEach((particle, index) => {
    const angle = (index / particleCount) * Math.PI * 2;
    const distance = isUnfollowing ? 40 : 80;
    const duration = isUnfollowing ? 600 : 800;

    const targetX = centerX + Math.cos(angle) * distance;
    const targetY = centerY + Math.sin(angle) * distance;

    particle.animate(
      [
        {
          transform: "translate(-50%, -50%) scale(1)",
          opacity: 1,
        },
        {
          transform: `translate(${targetX - centerX}px, ${targetY - centerY}px) scale(0.5)`,
          opacity: 0,
        },
      ],
      {
        duration,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      }
    );
  });

  setTimeout(() => {
    particlesContainer.remove();
  }, 1000);
};

export const createCategoryParticlesAtCardClick = (event: React.MouseEvent, category?: string) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const x = event.clientX;
  const y = event.clientY;

  const categoryConfig = TRENDING_CATEGORIES.find((c) => c.name === category);
  const icon = categoryConfig?.icon || "✨";

  const getColor = (cat: string) => {
    switch (cat) {
      case "科技":
        return ["#60A5FA", "#22D3EE"]; // blue-400, cyan-400
      case "娱乐":
        return ["#F472B6", "#FB7185"]; // pink-400, rose-400
      case "时政":
        return ["#C084FC", "#818CF8"]; // purple-400, indigo-400
      case "天气":
        return ["#4ADE80", "#34D399"]; // green-400, emerald-400
      case "体育":
        return ["#FB923C", "#F87171"]; // orange-400, red-400
      case "商业":
        return ["#94A3B8", "#6B7280"]; // slate-400, gray-500
      case "加密货币":
        return ["#FACC15", "#F59E0B"]; // yellow-400, amber-500
      default:
        return ["#8B5CF6", "#A78BFA"];
    }
  };

  const colors = getColor(category || "");

  const particlesContainer = document.createElement("div");
  particlesContainer.className = "fixed pointer-events-none z-[9999]";
  particlesContainer.style.left = "0";
  particlesContainer.style.top = "0";
  particlesContainer.style.width = "100vw";
  particlesContainer.style.height = "100vh";
  document.body.appendChild(particlesContainer);

  // 1. Shockwave
  const shockwave = document.createElement("div");
  shockwave.style.position = "absolute";
  shockwave.style.left = `${x}px`;
  shockwave.style.top = `${y}px`;
  shockwave.style.width = "0px";
  shockwave.style.height = "0px";
  shockwave.style.border = `2px solid ${colors[0]}`;
  shockwave.style.borderRadius = "50%";
  shockwave.style.transform = "translate(-50%, -50%)";
  shockwave.style.opacity = "0.8";
  particlesContainer.appendChild(shockwave);

  shockwave.animate(
    [
      { width: "0px", height: "0px", opacity: 0.8, borderWidth: "10px" },
      { width: "300px", height: "300px", opacity: 0, borderWidth: "0px" },
    ],
    {
      duration: 600,
      easing: "cubic-bezier(0, 0, 0.2, 1)",
    }
  );

  // 2. Icon Particles
  const iconCount = 8;
  for (let i = 0; i < iconCount; i++) {
    const p = document.createElement("div");
    p.innerText = icon;
    p.style.position = "absolute";
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.fontSize = "20px";
    p.style.transform = "translate(-50%, -50%) scale(0)";
    particlesContainer.appendChild(p);

    const angle = (i / iconCount) * Math.PI * 2 + (Math.random() - 0.5);
    const velocity = 100 + Math.random() * 100;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;

    p.animate(
      [
        { transform: "translate(-50%, -50%) scale(0) rotate(0deg)", opacity: 0 },
        { transform: "translate(-50%, -50%) scale(1.5) rotate(0deg)", opacity: 1, offset: 0.2 },
        {
          transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1) rotate(${
            Math.random() * 90 - 45
          }deg)`,
          opacity: 0,
        },
      ],
      {
        duration: 800 + Math.random() * 400,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "forwards",
      }
    );
  }

  // 3. Confetti Particles
  const confettiCount = 16;
  for (let i = 0; i < confettiCount; i++) {
    const p = document.createElement("div");
    p.style.position = "absolute";
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.width = "8px";
    p.style.height = "8px";
    p.style.backgroundColor = colors[i % colors.length];
    p.style.borderRadius = i % 2 === 0 ? "50%" : "2px";
    particlesContainer.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const velocity = 50 + Math.random() * 150;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;

    p.animate(
      [
        { transform: "translate(-50%, -50%) scale(0)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1)`,
          opacity: 0,
        },
      ],
      {
        duration: 600 + Math.random() * 400,
        easing: "cubic-bezier(0, 0.9, 0.57, 1)",
        fill: "forwards",
      }
    );
  }

  setTimeout(() => {
    particlesContainer.remove();
  }, 1500);
};
