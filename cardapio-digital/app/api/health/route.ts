import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('restaurants').select('id').limit(1).single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { status: 'degraded', db: 'error', error: error.message, ts: new Date().toISOString() },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      db: 'ok',
      latency_ms: Date.now() - start,
      ts: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', error: String(err), ts: new Date().toISOString() },
      { status: 503 }
    )
  }
}
