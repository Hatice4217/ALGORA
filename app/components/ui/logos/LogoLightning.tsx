import React from 'react';

export interface LogoLightningProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const LogoLightning: React.FC<LogoLightningProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-lg', container: 'w-8 h-8' },
    md: { icon: 'w-8 h-8', text: 'text-xl', container: 'w-12 h-12' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', container: 'w-16 h-16' }
  };

  const config = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Hexagon Container with Lightning */}
      <div className={`relative ${config.container} bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800`}>
        {/* Hexagon Shape */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`bg-gradient-to-br from-purple-600 to-purple-800 clip-hexagon`}
            style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            }}
          />
        </div>

        {/* Lightning Icon */}
        <div className={`relative z-10 flex items-center justify-center ${config.container}`}>
          <span className={`${config.icon} text-white drop-shadow-lg`}>⚡</span>
        </div>

        {/* "A" Badge */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-purple-600 shadow-lg">
          <span className="text-purple-900 font-bold text-xs">A</span>
        </div>
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${config.text} font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent`}>
            ALGORA
          </span>
          <span className="text-xs text-purple-700 dark:text-purple-400 font-medium">
            ⚡ Powered by AI
          </span>
        </div>
      )}
    </div>
  );
};

export default LogoLightning;