export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import RestauranteConfigClient from '@/components/admin/restaurante-config-client'

export default async function RestauranteConfigPage() {
  const supabase = await createClient()
  const { data: restaurant } = await supabase.from('restaurants').select('*').single()
  return <RestauranteConfigClient restaurant={restaurant} />
}
