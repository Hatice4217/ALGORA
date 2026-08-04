import React from 'react';

export interface LogoWordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const LogoWordmark: React.FC<LogoWordmarkProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const sizes = {
    sm: { text: 'text-lg', dot: 'w-2 h-2' },
    md: { text: 'text-xl', dot: 'w-3 h-3' },
    lg: { text: 'text-2xl', dot: 'w-4 h-4' }
  };

  const config = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Wordmark Logo */}
      <div className="flex items-center gap-1">
        {/* "Al" in Purple */}
        <span className={`${config.text} font-black text-purple-600 dark:text-purple-400`}>
          Al
        </span>

        {/* "gora" in Dark Gray */}
        <span className={`${config.text} font-bold text-gray-900 dark:text-gray-100`}>
          gora
        </span>

        {/* Gradient Dot */}
        <div className={`ml-1 ${config.dot} rounded-full bg-gradient-to-br from-purple-500 to-purple-700`} />
      </div>

      {/* Subtitle - Only for md and lg */}
      {showText && (size === 'md' || size === 'lg') && (
        <div className="flex flex-col">
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium tracking-wide">
            AI PLATFORM
          </span>
        </div>
      )}
    </div>
  );
};

export default LogoWordmark;