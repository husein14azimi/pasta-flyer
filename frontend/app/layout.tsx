import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Forkify - Organic Spaghetti Arcade Game',
  description: 'A lightweight, client-only arcade game built for quick restaurant wait-time sessions.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
