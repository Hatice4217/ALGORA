import React from 'react';

export interface LogoGradientWaveProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const LogoGradientWave: React.FC<LogoGradientWaveProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const sizes = {
    sm: { container: 'w-8 h-8', text: 'text-lg', aSize: 'text-lg' },
    md: { container: 'w-12 h-12', text: 'text-xl', aSize: 'text-2xl' },
    lg: { container: 'w-16 h-16', text: 'text-2xl', aSize: 'text-3xl' }
  };

  const config = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Gradient Wave Circle */}
      <div className={`relative ${config.container} rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 shadow-lg`}>
        {/* Wave Effect */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-pulse" />
        </div>

        {/* Stylized "A" */}
        <div className={`relative z-10 ${config.container} rounded-full flex items-center justify-center`}>
          <span className={`${config.aSize} font-black text-white drop-shadow-2xl`}>
            A
          </span>
        </div>

        {/* Small Dot */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full border-2 border-white dark:border-purple-900" />
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${config.text} font-bold bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 bg-clip-text text-transparent`}>
            ALGORA
          </span>
          <span className="text-xs text-purple-700 dark:text-purple-400 font-medium">
            Wave Learning
          </span>
        </div>
      )}
    </div>
  );
};

export default LogoGradientWave;