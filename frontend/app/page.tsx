'use client'

import dynamic from 'next/dynamic'

// Use next/dynamic with ssr: false to load the client-only arcade game.
// This completely avoids hydration mismatches since the component relies on
// client-only APIs (window.innerWidth, canvas drawing, Date.now(), and localStorage).
const ForkifyPage = dynamic(() => import('../components/ForkifyPage'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
      <div className="animate-pulse text-lg font-medium">Loading Forkify...</div>
    </div>
  ),
})

export default function Home() {
  return <ForkifyPage />
}
