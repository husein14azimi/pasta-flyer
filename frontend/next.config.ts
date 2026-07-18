import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  // Disable server-side rendering for a client-only single-page arcade game.
  // Next.js static export still compiles pages to static HTML.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
