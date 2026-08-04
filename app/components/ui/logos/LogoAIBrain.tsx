import React from 'react';

export interface LogoAIBrainProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const LogoAIBrain: React.FC<LogoAIBrainProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const sizes = {
    sm: { container: 'w-8 h-8', brain: 'text-lg', text: 'text-lg', badge: 'w-4 h-4' },
    md: { container: 'w-12 h-12', brain: 'text-2xl', text: 'text-xl', badge: 'w-5 h-5' },
    lg: { container: 'w-16 h-16', brain: 'text-3xl', text: 'text-2xl', badge: 'w-6 h-6' }
  };

  const config = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Main Container */}
      <div className={`relative ${config.container} bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg`}>
        {/* Brain Icon */}
        <div className={`relative z-10 ${config.container} rounded-xl flex items-center justify-center`}>
          <span className={`${config.brain} drop-shadow-lg`}>🧠</span>
        </div>

        {/* Circuit/Neural Pattern */}
        <div className="absolute inset-0 rounded-xl overflow-hidden opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400" />
        </div>

        {/* AI Badge with "A" */}
        <div className={`absolute -bottom-1 -right-1 ${config.badge} bg-white dark:bg-purple-900 rounded-full flex items-center justify-center border-2 border-purple-600 shadow-lg`}>
          <span className="text-purple-600 dark:text-purple-300 font-bold text-xs">A</span>
        </div>

        {/* Tech Dots */}
        <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-400 rounded-full opacity-60" />
        <div className="absolute -top-1 -right-2 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-40" />
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${config.text} font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent`}>
            ALGORA
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            🧠 AI Learning
          </span>
        </div>
      )}
    </div>
  );
};

export default LogoAIBrain;