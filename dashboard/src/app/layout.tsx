import type { Metadata } from 'next'
import { Sidebar } from '@/components/Sidebar'
// Fonts
import { DM_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-heading' });

export const metadata: Metadata = {
  title: 'LeadVault | LinkedIn Lead Management',
  description: 'Premium dashboard to manage your parsed LinkedIn leads.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable} dark`}>
      <body className="bg-[#080c14] text-slate-200 min-h-screen font-body antialiased selection:bg-blue-500/30">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64 min-h-screen relative overflow-x-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
              <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gold/5 blur-[150px]" />
            </div>
            
            <div className="p-8 pb-20 max-w-[1600px] mx-auto min-h-screen">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
