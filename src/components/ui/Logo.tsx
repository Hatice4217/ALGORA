export function Logo({ size = "md", className = "" }) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl"
  }

  return (
    <span className={`font-bold ${sizes[size]} ${className}`}>
      <span className="text-purple-600">Al</span>
      <span className="text-gray-900 dark:text-white">gora</span>
    </span>
  )
}