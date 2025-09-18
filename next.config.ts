import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }

    // Better handling of Monaco Editor chunks
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          monaco: {
            name: 'monaco-editor',
            chunks: 'async',
            test: /[\\/]node_modules[\\/]@?monaco-editor/,
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      },
    }

    return config
  },
}

export default nextConfig
