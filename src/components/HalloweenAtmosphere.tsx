import type { ReactNode } from "react";

type HalloweenSectionBadgeProps = {
  children: ReactNode;
  className?: string;
};

export function HalloweenSectionBadge({ children, className = "" }: HalloweenSectionBadgeProps) {
  return (
    <div className={`halloween-section-badge ${className}`} role="note">
      <span className="halloween-badge-icon" aria-hidden="true">🕸️</span>
      <span>{children}</span>
      <span className="halloween-badge-pumpkin" aria-hidden="true">🎃</span>
    </div>
  );
}

export default function HalloweenAtmosphere() {
  return (
    <div className="halloween-atmosphere" aria-hidden="true">
      <span className="halloween-orb halloween-orb-one" />
      <span className="halloween-orb halloween-orb-two" />
      <span className="halloween-deco halloween-deco-bat">🦇</span>
      <span className="halloween-deco halloween-deco-moon">🌙</span>
      <span className="halloween-deco halloween-deco-ghost">👻</span>
      <span className="halloween-deco halloween-deco-star">✦</span>
      <div className="halloween-season-pill liquid-glass">
        <span className="halloween-pumpkin">🎃</span>
        <span>spooky season</span>
        <span className="halloween-sparkle">✦</span>
      </div>
    </div>
  );
}
