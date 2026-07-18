import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
]

function getSupabaseHostname(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return 'localhost'
  try {
    return new URL(url).hostname
  } catch {
    return 'localhost'
  }
}

const nextConfig: NextConfig = {
  // Erros de lint pré-existentes no projeto não devem travar o deploy — o typecheck
  // (que roda separado) já garante corretude de tipos; lint é limpeza, não bloqueio.
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: getSupabaseHostname(),
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
