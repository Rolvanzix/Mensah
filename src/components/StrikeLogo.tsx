import React from 'react';

interface StrikeLogoProps {
  className?: string;
  size?: number;
}

export const StrikeLogo: React.FC<StrikeLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-lg overflow-hidden select-none bg-[#00f29d] shadow-[0_0_16px_rgba(0,242,157,0.35)] ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Precision Strike stylized 'S' lightning emblem matching the brand kit */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-1"
      >
        <path
          d="M 64 8 L 52 38 L 74 38 C 76.5 38 78 40.5 76.8 42.6 L 36 92 L 48 62 L 26 62 C 23.5 62 22 59.5 23.2 57.4 L 64 8 Z"
          fill="#0B0E14"
        />
        <path
          d="M 32 30 C 32 23.5 38 18 48 18 L 68 18 L 60 30 L 48 30 C 44 30 42 32 42 35 C 42 38 44 40 48 40 L 58 40 L 50 52 L 40 52 C 34 52 32 46 32 40 Z"
          fill="#0B0E14"
          opacity="0.95"
        />
        <path
          d="M 68 70 C 68 76.5 62 82 52 82 L 32 82 L 40 70 L 52 70 C 56 70 58 68 58 65 C 58 62 56 60 52 60 L 42 60 L 50 48 L 60 48 C 66 48 68 54 68 60 Z"
          fill="#0B0E14"
          opacity="0.95"
        />
      </svg>
    </div>
  );
};
