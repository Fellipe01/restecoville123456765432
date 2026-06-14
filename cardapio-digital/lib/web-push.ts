import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_SUBJECT ?? 'admin@cardapio.app'}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function sendPushToRestaurant(
  restaurantId: string,
  payload: { title: string; body: string; tag?: string; url?: string },
) {
  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('restaurant_id', restaurantId)

  if (!subs || subs.length === 0) return

  const dead: string[] = []
  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription as webpush.PushSubscription, JSON.stringify(payload))
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) dead.push(row.id)
      }
    })
  )

  if (dead.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', dead)
  }
}
