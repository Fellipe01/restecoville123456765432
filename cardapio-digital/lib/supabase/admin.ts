import { createClient } from '@supabase/supabase-js'

// Usa service_role key — bypassa RLS
// NUNCA importar em código do cliente (client components)
// Usar apenas em API routes server-side após validação de auth
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key || key === 'ADICIONAR_AQUI') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
