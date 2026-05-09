/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Required for optimized Docker/k8s image
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      }
    ]
  },
}

export default nextConfig
