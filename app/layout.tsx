import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Ranjan Kumar — Creative Frontend Developer & Designer',
  description: 'Thoughtful design. Exceptional digital experiences. Explore the frontend development, React, web design, and creative services of Ranjan Kumar.',
  openGraph: { title: 'Ranjan Kumar — Ideas into digital experiences', description: 'Creative frontend development, React, and design. Available for freelance collaborations.', type: 'website' },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
