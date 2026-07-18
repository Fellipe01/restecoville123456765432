import { NextResponse, type NextRequest } from 'next/server'

// Este projeto precisa que middleware.ts exista pra Vercel montar a tabela de
// rotas corretamente (sem ele, TODAS as rotas dão 404 na borda, mesmo as que
// nunca dependeram de middleware nenhum — bug/particularidade confirmada nesse
// ambiente específico). Ao mesmo tempo, qualquer código real aqui esbarra num
// bug de bundling do Edge Runtime (ReferenceError: __dirname is not defined,
// reproduzido até com um middleware vazio). Path do matcher abaixo nunca
// corresponde a nada de verdade, então a função nunca chega a ser invocada —
// resolução e auth de admin já foram movidos pra dentro dos Server Components
// (lib/restaurant.ts e app/admin/(protected)/layout.tsx).
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/__never_matches_anything__'],
}
