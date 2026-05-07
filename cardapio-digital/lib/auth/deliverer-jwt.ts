import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

export interface DelivererPayload {
  sub: string          // deliverer id
  name: string
  restaurant_id: string
}

function getSecret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET não configurado')
  return new TextEncoder().encode(s)
}

export async function signDelivererJWT(payload: DelivererPayload): Promise<string> {
  return new SignJWT({ name: payload.name, restaurant_id: payload.restaurant_id })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyDelivererJWT(token: string): Promise<DelivererPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return {
      sub: payload.sub as string,
      name: payload['name'] as string,
      restaurant_id: payload['restaurant_id'] as string,
    }
  } catch {
    return null
  }
}

export function extractToken(req: NextRequest): string | null {
  return req.headers.get('authorization')?.replace('Bearer ', '') ?? null
}

export async function requireDelivererAuth(req: NextRequest): Promise<DelivererPayload | null> {
  const token = extractToken(req)
  if (!token) return null
  return verifyDelivererJWT(token)
}
