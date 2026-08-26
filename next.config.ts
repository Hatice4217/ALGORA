import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  productionBrowserSourceMaps: false, // Disable source maps in production for smaller bundle size
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
  // Webpack optimizations for unused JavaScript removal
  webpack: (config, { dev, isServer }) => {
    // Production only optimizations
    if (!dev && !isServer) {
      // Remove development tools
      config.resolve.alias = {
        ...config.resolve.alias,
        '@next-devtools': false,
      };

      // Tree shaking optimizations
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: true,
      };

      // Remove console.logs in production
      config.optimization = {
        ...config.optimization,
        minimizer: [
          ...((config.optimization?.minimizer as any[]) || []),
          {
            apply: (compiler: any) => {
              compiler.hooks.processAssets.tap(
                { name: 'remove-console' },
                (assets: any) => {
                  for (const name in assets) {
                    if (name.endsWith('.js')) {
                      // Remove debug console logs but keep error logs for production debugging
                      assets[name] = assets[name].replace(
                        /console\.(log|warn|debug|info)\([^)]*\);?/g,
                        '// Console removed for production'
                      );
                      // Keep error logs but minimize them
                      assets[name] = assets[name].replace(
                        /console\.error\([^)]*\);?/g,
                        'console.error && console.error(...arguments);'
                      );
                    }
                  }
                }
              );
            },
          },
        ],
      };
    }

    return config;
  },
};

export default nextConfig;
