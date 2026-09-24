/**
 * Eden Gil — personal studio mark
 * Copy this file into any React app.
 *
 * Usage:
 *   import { EdenGilMark, EdenGilLogo } from "./EdenGilLogo";
 *   <EdenGilLogo size={40} subtitle="My App Name" />
 *   <EdenGilMark size={28} />   // icon only
 */

import React from "react";

export function EdenGilMark({ size = 40, className, style }) {
  const uid = React.useId
    ? React.useId().replace(/:/g, "")
    : Math.random().toString(36).slice(2, 8);
  const ink = `egInk_${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Eden Gil"
      role="img"
      className={className}
      style={{
        flexShrink: 0,
        display: "block",
        filter: "drop-shadow(0 2px 8px rgba(15, 118, 110, 0.28))",
        ...style,
      }}
    >
      <defs>
        <linearGradient
          id={ink}
          x1="8"
          y1="4"
          x2="56"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0f766e" />
          <stop offset="0.55" stopColor="#115e59" />
          <stop offset="1" stopColor="#134e4a" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#${ink})`} />
      <circle
        cx="32"
        cy="32"
        r="26.5"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1"
      />
      <path
        fill="#fff"
        d="M15.5 20h14.2c.85 0 1.45.55 1.45 1.35v1.55c0 .8-.6 1.35-1.45 1.35H19.4v4.35h8.6c.8 0 1.35.5 1.35 1.25v1.4c0 .75-.55 1.25-1.35 1.25h-8.6v4.55h10.5c.85 0 1.45.55 1.45 1.35v1.55c0 .8-.6 1.35-1.45 1.35H15.5c-.85 0-1.45-.55-1.45-1.35V21.35c0-.8.6-1.35 1.45-1.35z"
      />
      <path
        fill="#fff"
        d="M47.8 22.1c-2.2-2.55-5.55-4.05-9.3-4.05-7.35 0-12.85 5.35-12.85 13.05S31.15 44.1 38.5 44.1c3.55 0 6.75-1.3 9.05-3.55.55-.55.55-1.4.05-1.9l-1.45-1.4c-.5-.5-1.3-.5-1.8.05-1.55 1.5-3.55 2.3-5.85 2.3-4.55 0-7.7-3.2-7.7-7.95s3.15-7.95 7.7-7.95c2.2 0 4.1.75 5.55 2.1.45.4 1.15.4 1.6-.05l1.5-1.5c.5-.5.5-1.3 0-1.8z"
      />
      <path
        fill="#fff"
        d="M48.2 31.2h-7.4c-.85 0-1.45.6-1.45 1.4v1.7c0 .8.6 1.4 1.45 1.4H45v3.35c0 .75.55 1.3 1.3 1.3h1.55c.75 0 1.3-.55 1.3-1.3V32.6c0-.8-.6-1.4-1.4-1.4z"
      />
      <circle cx="50.5" cy="47.5" r="2.2" fill="#f59e0b" />
    </svg>
  );
}

export function EdenGilLogo({
  size = 40,
  subtitle = "Studio",
  compact = false,
  className,
  style,
}) {
  const titleSize = size >= 44 ? 20 : size >= 40 ? 18 : 15;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minWidth: 0,
        ...style,
      }}
    >
      <EdenGilMark size={size} />
      {!compact && (
        <div style={{ minWidth: 0, lineHeight: 1.05 }}>
          <div
            style={{
              fontFamily: "'Outfit', 'Sora', system-ui, sans-serif",
              fontWeight: 800,
              fontSize: titleSize,
              letterSpacing: "-0.04em",
              color: "#134e4a",
            }}
          >
            Eden Gil
          </div>
          <div
            style={{
              fontFamily: "'Outfit', system-ui, sans-serif",
              fontWeight: 600,
              fontSize: size >= 40 ? 10.5 : 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#94a3b8",
              marginTop: 5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subtitle}
          </div>
        </div>
      )}
    </div>
  );
}

export default EdenGilLogo;
