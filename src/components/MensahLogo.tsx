import React from 'react';

interface MensahLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const MensahLogo: React.FC<MensahLogoProps> = ({
  className = '',
  size = 32,
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Geometric M Emblem from reference design */}
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Left upright/angled pillar */}
          <path
            d="M 22 25 L 22 75 C 22 81 29 85 34 81 L 50 63 L 66 81 C 71 85 78 81 78 75 L 78 25 C 78 19 71 15 66 19 L 50 37 L 34 19 C 29 15 22 19 22 25 Z"
            fill="#0f172a"
          />
          {/* Bright emerald accent left fold */}
          <path
            d="M 22 25 C 22 19 29 15 34 19 L 50 37 L 38 48 L 22 34 Z"
            fill="#10b981"
          />
          {/* Bright emerald accent right fold */}
          <circle cx="50" cy="37" r="7" fill="#059669" />
          <path
            d="M 66 81 L 50 63 L 56 56 L 72 70 C 74 72 74 76 72 78 C 70 80 68 81 66 81 Z"
            fill="#10b981"
          />
        </svg>
      </div>

      {showText && (
        <span className="font-extrabold text-xl tracking-tight text-[#0f172a] font-sans">
          MENSAH
        </span>
      )}
    </div>
  );
};
