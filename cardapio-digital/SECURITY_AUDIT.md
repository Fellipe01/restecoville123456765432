# Relatório de Auditoria de Segurança — Cardápio Digital

**Data:** 01/05/2026  
**Metodologia:** Análise estática de código + revisão de políticas RLS  
**Sistema:** cardapio-digital (Next.js 16 + Supabase)

---

## Resumo Executivo

Foram identificadas **6 vulnerabilidades críticas**, **5 altas** e **3 médias** que, combinadas, permitem: fraude de entregas, roubo de dados pessoais de clientes (LGPD), manipulação de pedidos e bypass total do sistema de autenticação de entregadores.

A raiz do problema é arquitetural: **o sistema confia no cliente para identificar quem ele é** (o `deliverer_id` vem do body do request, não de um token assinado server-side), tornando toda a lógica de entregador explorável.

---

## Vulnerabilidades Críticas

---

### [C-1] Spoofing de Identidade de Entregador

**Severidade:** CRÍTICA  
**Arquivos:**
- [app/api/entregador/confirmar/route.ts](app/api/entregador/confirmar/route.ts) — linhas 5–6
- [app/api/entregador/grupos/route.ts](app/api/entregador/grupos/route.ts) — linhas 37–58
- [app/api/entregador/transferir/route.ts](app/api/entregador/transferir/route.ts) — linhas 6, 24–26

**Descrição:**
Todas as rotas de entregador recebem o `deliverer_id` diretamente do body do request. O servidor verifica se esse ID *existe* no banco, mas **não verifica se o requisitante é realmente aquele entregador**. Qualquer pessoa com um `deliverer_id` válido pode se passar por esse entregador.

**Como explorar:**
```bash
# Descobrir um deliverer_id válido (tabela deliverers é pública — ver C-4)
# Confirmar entrega de pedido alheio:
curl -X POST https://cardapio-digital-mu-two.vercel.app/api/entregador/confirmar \
  -H "Content-Type: application/json" \
  -d '{"order_id": "<qualquer_order_id>", "deliverer_id": "<deliverer_id_roubado>"}'
# Resultado: pedido marcado como entregue sem entrega real
```

**Impacto:**
- Fraude: marcar pedidos como entregues sem entregar → restaurante paga entregador sem serviço
- Clientes não recebem produto mas o sistema mostra "entregue"
- Impossível auditar quem entregou o quê

**Correção:**
Gerar um JWT assinado no login e validar em cada rota. Extrair `deliverer_id` do token, nunca do body.

```typescript
// login/route.ts — retornar JWT assinado
const token = await sign({ sub: deliverer.id, exp: ... }, process.env.JWT_SECRET!)
return NextResponse.json({ deliverer, token })

// confirmar/route.ts — verificar token
const token = req.headers.get('authorization')?.replace('Bearer ', '')
const { sub: deliverer_id } = await verify(token, process.env.JWT_SECRET!)
// sub é o deliverer_id real — impossível falsificar
```

---

### [C-2] IDOR — Roubo e Transferência de Pedidos

**Severidade:** CRÍTICA  
**Arquivo:** [app/api/entregador/transferir/route.ts](app/api/entregador/transferir/route.ts)

**Descrição:**
A rota de transferência não autentica o requisitante. Qualquer pessoa pode transferir pedidos *de* qualquer entregador *para* qualquer outro, bastando conhecer os IDs.

Além disso, a RLS `public_transfer_order` (migration 015) permite que anônimos atualizem diretamente no Supabase pedidos com `status = 'saindo'`, **bypassando completamente a API**:

```bash
# Roubar pedido do entregador A diretamente pelo Supabase REST:
curl -X PATCH 'https://<project>.supabase.co/rest/v1/orders?id=eq.<order_id>' \
  -H "apikey: <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"deliverer_id": "<meu_id>", "status": "saindo"}'
# RLS permite porque status continua 'saindo'
```

**Impacto:**
- Entregador rouba pedidos de alto valor de colegas
- Caos na distribuição de pedidos
- Sabotagem de entregadores

**Correção:**
1. Autenticar via JWT (ver C-1)
2. Remover `public_transfer_order` ou restringir com validação de `deliverer_id` via custom claim

---

### [C-3] IDOR — Reivindicar Grupos para Outro Entregador

**Severidade:** CRÍTICA  
**Arquivo:** [app/api/entregador/grupos/route.ts](app/api/entregador/grupos/route.ts) — linhas 37–71

**Descrição:**
O campo `deliverer_id` no body do POST `/api/entregador/grupos` não é verificado contra o requisitante. Um atacante pode reivindicar pedidos e atribuí-los a qualquer entregador sem sua ciência.

**Como explorar:**
```bash
# Atacante sobrecarrega entregador concorrente
curl -X POST /api/entregador/grupos \
  -d '{"order_ids": ["id1","id2","id3"], "deliverer_id": "<entregador_alvo>"}'
# Entregador alvo fica com fila cheia sem ter pedido nada
```

**Correção:** Extrair `deliverer_id` do JWT, ignorar o valor do body.

---

### [C-4] Exposição de Dados Pessoais — GET /api/pedidos sem Auth

**Severidade:** CRÍTICA | LGPD  
**Arquivo:** [app/api/pedidos/route.ts](app/api/pedidos/route.ts) — método GET

**Descrição:**
O endpoint GET `/api/pedidos` retorna todos os pedidos sem nenhuma autenticação. A RLS da migration 004 permitia acesso anônimo a pedidos das últimas 48h. Isso expõe:

- Nome completo e telefone de clientes
- Endereço residencial completo
- Valor pago e método (quem está com dinheiro vivo)
- Horários de entrega (quando a pessoa está em casa)

```bash
curl https://cardapio-digital-mu-two.vercel.app/api/pedidos
# Retorna centenas de pedidos com dados pessoais completos
```

**Impacto:**
- Vazamento massivo de dados → multa LGPD (art. 52: até 2% do faturamento)
- Clientes expostos a roubos direcionados
- Venda de leads para concorrentes ou terceiros

**Correção:**
```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  // ... continua
}
```

---

### [C-5] RLS Bypass — Acesso Cross-Tenant (Admin)

**Severidade:** CRÍTICA  
**Arquivo:** [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) — linhas 224–233

**Descrição:**
As políticas RLS das tabelas `restaurants`, `products`, `categories`, `orders` etc. usam apenas `auth.role() = 'authenticated'` sem validar `restaurant_id`. Em um cenário multi-tenant, um admin autenticado de qualquer restaurante pode ler/modificar dados de todos os outros.

```sql
-- Política atual (insegura):
CREATE POLICY "admin_all_products" ON products
  FOR ALL USING (auth.role() = 'authenticated');

-- Qualquer admin autenticado pode:
UPDATE products SET base_price = 0.01 WHERE restaurant_id != 'meu-restaurant-id';
DELETE FROM categories WHERE true;
```

**Correção:**
```sql
CREATE POLICY "admin_own_products" ON products
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    restaurant_id = (SELECT restaurant_id FROM admins WHERE id = auth.uid())
  );
```

---

### [C-6] RLS Bypass Direto via API Supabase (public_transfer_order)

**Severidade:** CRÍTICA  
**Arquivo:** [supabase/migrations/015_entregador_rls.sql](supabase/migrations/015_entregador_rls.sql) — linhas 12–16

**Descrição:**
A policy `public_transfer_order` permite que qualquer anônimo faça UPDATE em pedidos com `status = 'saindo'`, desde que o resultado continue `status = 'saindo'`. Isso permite alterar o `deliverer_id` de qualquer pedido em rota **diretamente no Supabase**, sem passar pela API do Next.js.

A validação de `from_deliverer_id` existe apenas na API route, que pode ser bypassada chamando o Supabase diretamente.

**Correção:**
Remover `public_transfer_order`. Transferências devem ser feitas apenas por admins autenticados via API protegida por JWT.

---

## Vulnerabilidades Altas

---

### [A-1] Rate Limit Bypassável via X-Forwarded-For Falso

**Severidade:** ALTA  
**Arquivo:** [app/api/pedidos/route.ts](app/api/pedidos/route.ts) — linha 44

**Descrição:**
O rate limiting usa o header `x-forwarded-for` do cliente para identificar o IP. Esse header é falsificável por qualquer cliente.

```bash
# Sem bypass: bloqueado após 8 pedidos
# Com bypass: ilimitado
for i in {1..1000}; do
  curl -X POST /api/pedidos \
    -H "X-Forwarded-For: 1.2.3.$((RANDOM % 256))" \
    -d '{...pedido...}'
done
```

**Impacto:** Rate limiting ineficaz, possível DoS/spam de pedidos.

**Correção:** Usar o IP real do servidor (Vercel injeta `x-real-ip`) ou implementar rate limit por Vercel Edge Config/Upstash Redis.

---

### [A-2] Falta de Autenticação em PATCH /api/produtos

**Severidade:** ALTA  
**Arquivo:** [app/api/produtos/route.ts](app/api/produtos/route.ts)

**Descrição:**
O endpoint `PATCH /api/produtos` não verifica autenticação. Qualquer pessoa pode alterar preço, nome, disponibilidade de qualquer produto.

```bash
curl -X PATCH /api/produtos \
  -d '{"id": "<product_id>", "base_price": 1.00, "is_available": false}'
```

**Correção:** Verificar `supabase.auth.getUser()` e validar que o produto pertence ao restaurante do admin.

---

### [A-3] Entregador Vê Pedidos de Todos os Outros Entregadores

**Severidade:** ALTA  
**Arquivo:** [supabase/migrations/010_deliverers_public_select.sql](supabase/migrations/010_deliverers_public_select.sql) — linha 7

**Descrição:**
A policy `public_select_saindo_orders` retorna TODOS os pedidos em `status = 'saindo'` para qualquer anônimo, não só os do entregador autenticado. Um entregador vê endereços e clientes dos pedidos de colegas.

**Correção:**
```sql
DROP POLICY "public_select_saindo_orders" ON orders;
-- Acesso a pedidos 'saindo' deve exigir token JWT com deliverer_id
```

---

### [A-4] Timing Attack — Enumeração de Entregadores no Login

**Severidade:** ALTA  
**Arquivo:** [app/api/entregador/login/route.ts](app/api/entregador/login/route.ts)

**Descrição:**
As mensagens de erro e o tempo de resposta revelam se um nome de entregador existe:

| Situação | Mensagem | Tempo |
|---|---|---|
| Nome não existe | "Entregador não encontrado" | ~50ms |
| Conta desativada | "Conta desativada" | ~50ms |
| Senha errada | "Senha incorreta" | ~200ms (bcrypt) |

Isso permite enumerar entregadores válidos para ataques de força bruta direcionados.

**Correção:** Usar mensagem genérica + sempre executar `bcrypt.compare` (mesmo quando user não existe, para equalizar o tempo):

```typescript
const fakeHash = '$2b$10$invalidhashfortimingequaliz'
const hash = deliverer?.password_hash ?? fakeHash
const valid = await bcrypt.compare(password, hash)
if (!deliverer || !valid) {
  return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
}
```

---

### [A-5] Storage Bucket sem Validação de Restaurante

**Severidade:** ALTA  
**Arquivo:** [supabase/migrations/016_product_images_bucket.sql](supabase/migrations/016_product_images_bucket.sql)

**Descrição:**
Qualquer admin autenticado pode fazer upload de imagens e atualizar `image_url` de produtos de outros restaurantes, incluindo substituir imagens por conteúdo impróprio.

**Correção:**
```sql
CREATE POLICY "auth_insert_product_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] = (
      SELECT restaurant_id::text FROM admins WHERE id = auth.uid()
    )
  );
```

---

## Vulnerabilidades Médias

---

### [M-1] Leitura Pública de Pedidos via Supabase REST API

**Severidade:** MÉDIA  
**Arquivo:** [supabase/migrations/004_rls_orders_select_and_minimum.sql](supabase/migrations/004_rls_orders_select_and_minimum.sql)

**Descrição:**
A policy `public_read_orders` (posteriormente dropada e parcialmente substituída) permite acesso público a pedidos das últimas 48h diretamente via API Supabase, bypassando o Next.js. Mesmo que o GET /api/pedidos seja protegido, o Supabase REST está acessível.

**Correção:** Auditar todas as policies SELECT anônimas e remover acesso a dados pessoais.

---

### [M-2] RPC `create_order` Executável por Anônimos

**Severidade:** MÉDIA  
**Arquivo:** [supabase/migrations/002_payment_method.sql](supabase/migrations/002_payment_method.sql)

**Descrição:**
```sql
GRANT EXECUTE ON FUNCTION public.create_order(JSONB) TO anon, authenticated;
```
A função é callable sem autenticação, permitindo spam de pedidos falsos diretamente via API Supabase.

**Correção:**
```sql
REVOKE EXECUTE ON FUNCTION public.create_order(JSONB) FROM anon;
```

---

### [M-3] Dados Pessoais sem Expiração Curta nas Policies

**Severidade:** MÉDIA  
**Arquivo:** [supabase/migrations/004_rls_orders_select_and_minimum.sql](supabase/migrations/004_rls_orders_select_and_minimum.sql)

**Descrição:**
A janela de 48h de leitura pública é muito ampla. Um pedido de entrega às 18h expõe o endereço residencial até as 18h do dia seguinte.

**Correção:** Reduzir para 2h ou exigir número do pedido + telefone para consulta pública.

---

## Tabela Resumo

| ID | Vulnerabilidade | Severidade | Arquivo |
|----|----------------|-----------|---------|
| C-1 | Spoofing de identidade de entregador | **CRÍTICA** | confirmar, grupos, transferir |
| C-2 | IDOR — roubo/transferência de pedidos | **CRÍTICA** | transferir/route.ts + RLS |
| C-3 | IDOR — reivindicar grupos para outro | **CRÍTICA** | grupos/route.ts |
| C-4 | Exposição de dados pessoais sem auth | **CRÍTICA** | pedidos/route.ts GET |
| C-5 | RLS bypass cross-tenant no admin | **CRÍTICA** | migration 001 |
| C-6 | RLS bypass direto via Supabase REST | **CRÍTICA** | migration 015 |
| A-1 | Rate limit bypassável (X-Forwarded-For) | **ALTA** | pedidos/route.ts |
| A-2 | PATCH /api/produtos sem autenticação | **ALTA** | produtos/route.ts |
| A-3 | Entregador vê pedidos de todos | **ALTA** | migration 010 |
| A-4 | Timing attack no login do entregador | **ALTA** | entregador/login |
| A-5 | Storage sem validação de restaurante | **ALTA** | migration 016 |
| M-1 | Leitura pública via Supabase REST | **MÉDIA** | migration 004 |
| M-2 | RPC create_order acessível por anon | **MÉDIA** | migration 002 |
| M-3 | Janela de dados pessoais muito longa | **MÉDIA** | migration 004 |

---

## Plano de Remediação

### Imediato (hoje)

1. **Implementar JWT para entregadores** — a raiz de C-1, C-2, C-3
2. **Proteger GET /api/pedidos com auth** — C-4
3. **Remover `public_transfer_order`** da migration 015 — C-6
4. **Adicionar auth em PATCH /api/produtos** — A-2

### Esta semana

5. Restringir `public_select_saindo_orders` a pedidos do próprio entregador — A-3
6. Padronizar mensagens de erro no login + timing equalizado — A-4
7. Validar restaurant_id nas policies RLS do admin — C-5
8. Revogar `GRANT EXECUTE ... TO anon` na RPC — M-2

### Próximas 2 semanas

9. Adicionar validação de pasta por restaurant_id no Storage — A-5
10. Revisar todas as policies anônimas e reduzir janela de dados públicos — M-1, M-3
11. Implementar audit log de operações críticas (confirmar, transferir, claim)
12. Penetration test após as correções

---

*Relatório gerado por análise automatizada de dois agentes especializados — Agente API/Auth + Agente DB/RLS — em 01/05/2026.*
