import React from 'react';

export interface LogoHexagonProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const LogoHexagon: React.FC<LogoHexagonProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const sizes = {
    sm: { svg: 'w-8 h-8', text: 'text-lg' },
    md: { svg: 'w-12 h-12', text: 'text-xl' },
    lg: { svg: 'w-16 h-16', text: 'text-2xl' }
  };

  const config = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* SVG Hexagon */}
      <div className={`relative ${config.svg}`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-lg"
        >
          {/* Main Hexagon */}
          <defs>
            <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="50%" stopColor="#9333EA" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Outer Hexagon */}
          <polygon
            points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
            fill="url(#hexGradient)"
            filter="url(#glow)"
          />

          {/* Inner Hexagon Border */}
          <polygon
            points="50,15 80,32.5 80,67.5 50,85 20,67.5 20,32.5"
            fill="none"
            stroke="white"
            strokeWidth="2"
            opacity="0.3"
          />

          {/* Circuit Lines */}
          <line x1="50" y1="15" x2="50" y2="35" stroke="white" strokeWidth="1" opacity="0.5" />
          <line x1="20" y1="67.5" x2="35" y2="60" stroke="white" strokeWidth="1" opacity="0.5" />
          <line x1="80" y1="67.5" x2="65" y2="60" stroke="white" strokeWidth="1" opacity="0.5" />

          {/* "A" Letter */}
          <text
            x="50"
            y="65"
            className="fill-white font-black"
            fontSize="40"
            fontWeight="900"
            textAnchor="middle"
            filter="url(#glow)"
          >
            A
          </text>

          {/* Tech Dots */}
          <circle cx="50" cy="10" r="3" fill="#A855F7" opacity="0.8" />
          <circle cx="85" cy="30" r="2" fill="#A855F7" opacity="0.6" />
          <circle cx="15" cy="30" r="2" fill="#A855F7" opacity="0.6" />
        </svg>

        {/* Tech Badge */}
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center border-2 border-purple-900 shadow-lg">
          <span className="text-white text-xs">✓</span>
        </div>
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${config.text} font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent`}>
            ALGORA
          </span>
          <span className="text-xs text-green-700 dark:text-green-400 font-medium">
            Tech Powered
          </span>
        </div>
      )}
    </div>
  );
};

export default LogoHexagon;