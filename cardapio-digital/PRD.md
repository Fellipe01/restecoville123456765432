# PRD — Cardápio Digital
**Versão:** 2.0  
**Atualizado:** Maio 2026  
**Responsável:** Fellipe Lopes Tavares  
**URL produção:** https://cardapio-digital-mu-two.vercel.app

---

## 1. Visão geral

Sistema de cardápio digital e gestão de pedidos para restaurantes. O cliente acessa pelo celular, escolhe produtos com variações e adicionais, faz o pedido e acompanha o status em tempo real. A cozinha recebe os pedidos automaticamente, imprime cupons via agente local, e entregadores gerenciam as rotas pelo próprio celular.

**Stack:** Next.js 16 (App Router) · Supabase (PostgreSQL + Realtime + Auth + Storage) · Vercel · Node.js (agente de impressão local)

---

## 2. Problema que resolve

| Sem o sistema | Com o sistema |
|---|---|
| Cliente espera atendente para pedir | Cliente pede sozinho pelo celular |
| Pedidos escritos à mão, sujeitos a erro | Pedido digitalizado sem erro de transcrição |
| Cozinha não sabe a fila em tempo real | Kanban atualizado ao vivo |
| Cliente liga para saber status | Cliente acompanha pelo celular |
| Cupom impresso manualmente | Impressão automática assim que o pedido chega |
| Entregador não tem visão das rotas | App do entregador com agrupamento por bairro |

---

## 3. Personas

**Cliente**
- Acessa pelo celular, sem criar conta, sem instalar app
- Quer pedir rápido, escolher variações (sabor, ponto) e acompanhar o status

**Cozinheiro / Atendente**
- Usa tela Cozinha em tablet ou monitor fixo
- Precisa ver claramente o que preparar e em que ordem
- Não tem familiaridade técnica — interface precisa ser óbvia

**Entregador**
- Acessa `/entregador` pelo celular durante o turno
- Reivindica grupos de pedidos por proximidade, confirma entrega, transfere para outro entregador

**Dono / Gerente**
- Acessa o painel admin pelo navegador
- Gerencia cardápio, configura restaurante, acompanha faturamento e pedidos em tempo real

---

## 4. Funcionalidades implementadas

### 4.1 Área do cliente (mobile-first, estilo iFood/Rappi)

| Funcionalidade | Status |
|---|---|
| Cardápio com categorias, busca e filtro | ✅ Produção |
| Foto, descrição e preço do produto | ✅ Produção |
| Variações por produto (sabor, ponto, tamanho) com foto | ✅ Produção |
| Adicionais por produto | ✅ Produção |
| Nome e foto da variação como identidade principal no carrinho | ✅ Produção |
| Carrinho persistente (Zustand + localStorage) | ✅ Produção |
| Upsell / cross-sell no carrinho | ✅ Produção |
| Checkout em 3 passos (Entrega → Pagamento → Confirmar) | ✅ Produção |
| Suporte a delivery e balcão | ✅ Produção |
| Mapa interativo para pino de endereço de entrega (Leaflet) | ✅ Produção |
| Zonas de entrega com taxa e pedido mínimo | ✅ Produção |
| Formas de pagamento (dinheiro/débito/crédito) | ✅ Produção |
| Troco obrigatório com validação de valor | ✅ Produção |
| Máscara de telefone progressiva no checkout e acompanhar | ✅ Produção |
| Confirmação de pedido com número e timeline | ✅ Produção |
| Acompanhamento em tempo real por telefone | ✅ Produção |
| Mensagens de status contextuais (reduzem ansiedade) | ✅ Produção |
| Botão WhatsApp para suporte | ✅ Produção |
| FAB do carrinho flutuante com badge | ✅ Produção |
| Restaurante aberto/fechado com badge pulsante | ✅ Produção |

### 4.2 Painel Admin

| Funcionalidade | Status |
|---|---|
| Login com autenticação Supabase Auth | ✅ Produção |
| Dashboard com faturamento e volume do dia | ✅ Produção |
| Filtro de período no dashboard | ✅ Produção |
| Alerta sonoro de novo pedido | ✅ Produção |
| Kanban de pedidos em tempo real (5 colunas) | ✅ Produção |
| Avanço de status com update otimista | ✅ Produção |
| Cancelamento de pedido | ✅ Produção |
| Atribuição de entregador a pedidos | ✅ Produção |
| Visão Cozinha (tela escura, foco nos itens) | ✅ Produção |
| Botões de impressão manual (cozinha e entrega) | ✅ Produção |
| 86-list (ativar/desativar produtos) | ✅ Produção |
| Gestão de categorias (criar/editar/reordenar) | ✅ Produção |
| Toggle "Mostrar no carrinho" por categoria | ✅ Produção |
| Gestão de produtos com upload de foto | ✅ Produção |
| Gestão de variações com upload de foto por variação | ✅ Produção |
| Gestão de adicionais | ✅ Produção |
| Gestão de zonas de entrega | ✅ Produção |
| Gestão de entregadores (criar/ativar/desativar) | ✅ Produção |
| Configurações do restaurante | ✅ Produção |
| Configurações de horário de funcionamento | ✅ Produção |
| Número WhatsApp para suporte ao cliente | ✅ Produção |

### 4.3 App do Entregador

| Funcionalidade | Status |
|---|---|
| Login com nome + senha (bcrypt) + JWT 7 dias | ✅ Produção |
| Listagem de grupos de pedidos disponíveis | ✅ Produção |
| Agrupamento de pedidos por bairro/proximidade | ✅ Produção |
| Reivindicar grupo de pedidos (atomic claim) | ✅ Produção |
| Visualizar pedidos atribuídos com endereço e valor | ✅ Produção |
| Confirmar entrega de pedido | ✅ Produção |
| Transferir pedido para outro entregador | ✅ Produção |

### 4.4 Agente de Impressão (computador do restaurante)

| Funcionalidade | Status |
|---|---|
| Impressão automática ao receber pedido (INSERT) | ✅ Funcionando |
| Impressão de cupom de entrega ao marcar "pronto" | ✅ Funcionando |
| Impressão manual via botão no painel (print_jobs) | ✅ Funcionando |
| Layout: cabeçalho do restaurante + itens + totais | ✅ Funcionando |
| Conexão TCP/IP direta ESC/POS (sem dependência externa) | ✅ Funcionando |
| Auto-start via Task Scheduler do Windows | ✅ Configurado |
| Variável de ambiente com path absoluto do .env | ✅ Corrigido |

**Localização:** `C:\Users\USUARIO\Desktop\nao excluir\print-agent\`  
**Impressora:** Epson TM-T20 · IP: 10.1.1.14 · Porta: 9100

### 4.5 Segurança

| Item | Status |
|---|---|
| JWT assinado (HS256) para entregadores | ✅ Ativo |
| Rate limit por IP com namespace (pedidos: 8/min, login: 5/min) | ✅ Ativo |
| Rate limit usando `x-real-ip` (não falsificável via header) | ✅ Ativo |
| Recálculo server-side de todos os preços | ✅ Ativo |
| Whitelist de campos no PATCH /api/produtos | ✅ Ativo |
| Validação de coordenadas geocode (range + NaN) | ✅ Ativo |
| Timing constante no login do entregador (FAKE_HASH) | ✅ Ativo |
| Auth obrigatória em GET /api/pedidos (LGPD) | ✅ Ativo |
| Auth obrigatória em PATCH /api/produtos | ✅ Ativo |
| Busca de pedidos via .in() sanitizado (sem .or() injetável) | ✅ Ativo |
| Validação de telefone mínimo 10 dígitos | ✅ Ativo |
| RLS permissivas de entregador removidas (migration 017) | ✅ Aplicado |
| Storage restrito por pasta de restaurante (migration 018) | ✅ Aplicado |
| Janela pública de pedidos reduzida de 48h para 2h (migration 021) | ✅ Aplicado |
| RPC create_order revogada para anon (migration 017) | ✅ Aplicado |
| Audit log de operações críticas do entregador | ✅ Ativo |

---

## 5. Arquitetura técnica

```
┌─────────────────────────────────────────────────────┐
│              CLIENTE / ENTREGADOR (celular)          │
│   Next.js App Router · Zustand · Tailwind · Leaflet  │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────┐
│                      VERCEL                          │
│   Server Components · API Routes · Edge Middleware   │
│   JWT validation · Rate limiting · Zod validation    │
└────────────────────┬────────────────────────────────┘
                     │ REST + Realtime WebSocket
┌────────────────────▼────────────────────────────────┐
│                    SUPABASE                          │
│   PostgreSQL · RLS · Realtime · Auth · Storage       │
│   service_role key (server-side only, nunca client)  │
└────────────────────┬────────────────────────────────┘
                     │ Realtime WebSocket (print_jobs)
┌────────────────────▼────────────────────────────────┐
│         AGENTE LOCAL (computador do restaurante)     │
│   Node.js · net (TCP) · ESC/POS · dotenv             │
│                    │                                 │
│         Impressora Epson TM-T20 (WiFi/TCP)           │
└─────────────────────────────────────────────────────┘
```

---

## 6. Banco de dados — tabelas

| Tabela | Descrição |
|---|---|
| `restaurants` | Configurações do restaurante (nome, logo, modo, coords) |
| `business_hours` | Horários de funcionamento por dia da semana |
| `categories` | Categorias do cardápio com ordem e visibilidade |
| `products` | Produtos com preço, disponibilidade e imagem |
| `variation_groups` / `variations` | Variações por produto com image_url |
| `addon_groups` / `addons` | Adicionais por produto |
| `delivery_zones` | Bairros com taxa, tempo estimado e pedido mínimo |
| `orders` | Pedidos com status, totais, coords e entregador |
| `order_items` | Itens de cada pedido |
| `order_item_addons` | Adicionais escolhidos por item |
| `order_item_variations` | Variações escolhidas por item |
| `customer_sessions` | Sessões de cliente por telefone e restaurante |
| `deliverers` | Entregadores com nome, senha hash e status |
| `print_jobs` | Fila de impressão manual (cozinha ou entrega) |
| `audit_log` | Log de operações críticas do entregador |

---

## 7. Migrations — estado atual

| Arquivo | O que faz | Status |
|---|---|---|
| `001_initial_schema.sql` | Schema completo inicial + RLS base | ✅ Aplicado |
| `002_payment_method.sql` | Campo payment_method + RPC create_order | ✅ Aplicado |
| `003_fix_rls.sql` | Correção das políticas RLS iniciais | ✅ Aplicado |
| `004_rls_orders_select_and_minimum.sql` | RLS select público de pedidos | ✅ Aplicado |
| `005_customer_sessions.sql` | Tabela de sessões de cliente | ✅ Aplicado |
| `006_add_saindo_status.sql` | Status "saindo" no CHECK constraint | ✅ Aplicado |
| `007_category_show_in_cart.sql` | Campo show_in_cart nas categorias | ✅ Aplicado |
| `008_printed_at.sql` | Campo printed_at nos pedidos | ✅ Aplicado |
| `009_deliverers.sql` | Tabela de entregadores com senha hash | ✅ Aplicado |
| `010_deliverers_public_select.sql` | SELECT público de entregadores (login) | ✅ Aplicado |
| `011_restaurant_city.sql` | Campo city no restaurante | ✅ Aplicado |
| `012_orders_coordinates.sql` | Campos latitude/longitude nos pedidos | ✅ Aplicado |
| `013_restaurant_coords.sql` | Campos lat/lng no restaurante | ✅ Aplicado |
| `014_orders_deliverer.sql` | Campos deliverer_id e group_id nos pedidos | ✅ Aplicado |
| `015_entregador_rls.sql` | RLS originais do entregador (substituídas por 017) | ✅ Aplicado |
| `016_product_images_bucket.sql` | Bucket product-images no Storage | ✅ Aplicado |
| `017_fix_security.sql` | Remove RLS permissivas; revoga RPC anon | ✅ Aplicado |
| `018_storage_policy_fix.sql` | Restringe upload por pasta de restaurante | ✅ Aplicado |
| `019_print_jobs.sql` | Tabela print_jobs para impressão manual | ✅ Aplicado |
| `020_variation_image.sql` | Campo image_url nas variações | ✅ Aplicado |
| `021_tighten_security.sql` | Janela pública de pedidos: 48h → 2h | ✅ Aplicado |
| `022_audit_log.sql` | Tabela audit_log para operações críticas | ✅ Aplicado |

---

## 8. Variáveis de ambiente

### Vercel (produção)
| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role (server-side apenas) |
| `JWT_SECRET` | Secret para assinar tokens dos entregadores |

### Agente de impressão (.env local)
| Variável | Descrição |
|---|---|
| `PRINTER_IP` | IP da impressora (10.1.1.14) |
| `PRINTER_PORT` | Porta TCP (9100) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave pública |
| `RESTAURANT_NAME` | Nome exibido no cabeçalho do cupom |
| `RESTAURANT_ADDRESS` | Endereço no cabeçalho |
| `RESTAURANT_PHONE` | Telefone no cabeçalho |

---

## 9. Fluxo principal do cliente

```
Acessa o link → Vê cardápio com categorias e busca
  → Clica no produto → Escolhe variações (sabor, ponto) e adicionais
  → Clica "Adicionar · R$ X,XX" → Vai para o carrinho
  → Vê sugestões de upsell no carrinho
  → Clica "Continuar"
  → Step 1: preenche nome, WhatsApp (com máscara), endereço/bairro
  → Step 2: escolhe forma de pagamento / troco
  → Step 3: revisa e confirma
  → Tela de confirmação com número do pedido
  → /acompanhar para ver status em tempo real
```

---

## 10. Fluxo operacional do restaurante

```
Pedido entra
  → Alarme sonoro no painel admin
  →  imprime cupom de cozinha 
  → Cozinha vê na Visão Cozinha
  → Clica "Preparando" → "Pronto"
  →  imprime cupom de entrega 
  → Admin atribui entregador (ou entregador reivindica no app)
  → Status vai para "Saindo"
  → Entregador confirma entrega no app → "Entregue"
  → Cliente vê atualização em tempo real
```

---

## 11. Decisões técnicas relevantes

| Decisão | Motivo |
|---|---|
| Agente de impressão separado | Impressora é hardware local — não acessível pela Vercel |
| ESC/POS via `net` (TCP nativo) | node-thermal-printer incompatível com Node.js v24 |
| `dotenv({ path: __dirname + '/.env' })` | Task Scheduler não herda o working directory |
| print_jobs table pattern | Admin insere → agente escuta via Realtime → imprime |
| JWT HS256 para entregadores | Supabase Auth não suporta entregadores como user type separado |
| `deliverer_id` extraído do JWT (nunca do body) | Previne spoofing de identidade |
| Admin client (service_role) nas rotas de entregador | RLS das policies de entregador foram removidas; autorização via WHERE clauses |
| Whitelist de campos no PATCH | Previne mass assignment — só campos permitidos chegam ao banco |
| `.in()` em vez de `.or()` com interpolação | Previne injeção no filtro PostgREST |
| Timing constante no login (FAKE_HASH) | Previne enumeração de entregadores por timing |
| Máscara progressiva no telefone | Garante formato consistente entre checkout e busca |
| `force-dynamic` nas páginas de produto | Garante que novas variações aparecem imediatamente |
| Update otimista no kanban | Evita delay visual enquanto aguarda Realtime round-trip |
| Realtime INSERT rebusca o pedido completo | Payload do Realtime não inclui joins (order_items) |

---

## 12. Funcionalidades planejadas

### Prioridade média

| Funcionalidade | Descrição |
|---|---|
| Relatório por período | Faturamento e volume por dia/semana/mês — exportável CSV |
| Produtos mais pedidos | Ranking de itens para decisão de cardápio |
| Histórico de pedidos do cliente | Cliente vê pedidos anteriores no /acompanhar |
| Notificações WhatsApp (WuzAPI) | Mensagem automática ao cliente quando status muda |

### Prioridade baixa / futuro

| Funcionalidade | Descrição |
|---|---|
| Multi-restaurante | Uma conta gerencia vários restaurantes (requer RLS com admins table) |
| App nativo (PWA) | Instalável no celular do cliente com notificações push |
| Pagamento online (Pix) | Integração com gateway de pagamento |
| Avaliações de pedido | Cliente avalia após entrega |
| Cardápio por QR code de mesa | QR code por mesa que identifica o número automaticamente |

---

## 13. Pendências abertas

| Item | Detalhe |
|---|---|
| Atualizar agente de impressão | Copiar `print-agent/index.js` novo para o PC do restaurante; adicionar `RESTAURANT_PHONE` no `.env`; rodar `pm2 restart print-agent` |
| C-5 RLS cross-tenant | Quando migrar para multi-tenant: criar tabela `admins` (user_id → restaurant_id) e filtrar todas as policies admin por restaurant_id |
