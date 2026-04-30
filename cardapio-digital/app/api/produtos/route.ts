import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('category_id')

  let query = supabase
    .from('products')
    .select('*, category:categories(name), variation_groups(*, variations(*)), addon_groups(*, addons(*))')
    .order('sort_order')

  if (categoryId) query = query.eq('category_id', categoryId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ products: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { id, ...updates } = await request.json()

  const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ product: data })
}
