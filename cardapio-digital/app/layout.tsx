import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import QueryProvider from '@/components/shared/query-provider'
import GoogleAnalytics from '@/components/shared/google-analytics'
import MetaPixel from '@/components/shared/meta-pixel'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cardápio Digital',
  description: 'Faça seu pedido online',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        <GoogleAnalytics />
        <MetaPixel />
        <QueryProvider>
          {children}
          <Toaster position="top-center" richColors />
        </QueryProvider>
      </body>
    </html>
  )
}
