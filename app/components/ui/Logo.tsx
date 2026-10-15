interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'infinity' | 'geometric-a' | 'brain-circuit';
  showText?: boolean;
  darkMode?: boolean;
}

export function Logo({ size = "md", className = "", variant, showText = true, darkMode = false }: LogoProps) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl"
  }

  if (variant === 'infinity' && showText) {
    return (
      <div className={`flex items-center gap-2 ${sizes[size]} ${className}`}>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 blur-xl opacity-50"></div>
          <span className="relative text-purple-600 dark:text-purple-400 font-bold">∞</span>
        </div>
        <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900 dark:text-slate-100'}`}>Algora</span>
      </div>
    )
  }

  return (
    <span className={`font-bold ${sizes[size]} ${className}`}>
      <span className="text-purple-600 dark:text-purple-400">Al</span>
      <span className={`${darkMode ? 'text-white' : 'text-gray-900 dark:text-slate-100'}`}>gora</span>
    </span>
  )
}