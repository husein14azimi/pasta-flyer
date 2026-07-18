import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  output: 'export',
  // Disable server-side rendering for a client-only single-page arcade game.
  // Next.js static export still compiles pages to static HTML.
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // If hosting on GitHub Pages under a sub-directory repo (e.g. username.github.io/repo),
  // Next.js static files need to use that sub-path for correct asset resolving.
  // We can dynamically resolve the base path via an environment variable or repository name.
  // Users with custom domains can set the BASE_PATH environment variable to override or clear it.
  basePath: process.env.BASE_PATH !== undefined
    ? process.env.BASE_PATH
    : (process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}` : undefined),
}

export default nextConfig
