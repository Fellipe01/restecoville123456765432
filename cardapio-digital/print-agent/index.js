require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const net = require('net')
const { createClient } = require('@supabase/supabase-js')

const PRINTER_IP   = process.env.PRINTER_IP  || '192.168.1.100'
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT || '9100', 10)
const COLS         = 42

const REST_NOME = 'Ecoville Restaurante'
const REST_END1 = 'lote 17, n. 17 - Rua Santa Luzia'
const REST_END2 = 'Gurupi - TO, 77402-970'
const REST_TEL  = process.env.RESTAURANT_PHONE || ''

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── ESC/POS ──────────────────────────────────────────────────────────────────

const ESC = 0x1b, GS = 0x1d

const CMD = {
  init:        Buffer.from([ESC, 0x40]),
  codepage:    Buffer.from([ESC, 0x74, 0x10]),
  alignLeft:   Buffer.from([ESC, 0x61, 0x00]),
  alignCenter: Buffer.from([ESC, 0x61, 0x01]),
  boldOn:      Buffer.from([ESC, 0x45, 0x01]),
  boldOff:     Buffer.from([ESC, 0x45, 0x00]),
  sizeNormal:  Buffer.from([GS,  0x21, 0x00]),
  sizeDouble:  Buffer.from([GS,  0x21, 0x11]),
  cut:         Buffer.from([GS,  0x56, 0x41, 0x05]),
}

function txt(s)  { return Buffer.from(s + '\n', 'latin1') }

function linha(char = '-') { return txt(char.repeat(COLS)) }

function padLR(left, right, total = COLS) {
  const sp = total - left.length - right.length
  return txt(left + ' '.repeat(Math.max(1, sp)) + right)
}

function centro(s) {
  const sp = Math.max(0, Math.floor((COLS - s.length) / 2))
  return txt(' '.repeat(sp) + s)
}

function truncar(s, max) {
  return s.length > max ? s.slice(0, max - 1) + '.' : s
}

function moeda(v) { return `R$ ${Number(v).toFixed(2).replace('.', ',')}` }

function hora() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function dataHora() {
  const d = new Date()
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = meses[d.getMonth()]
  const ano = d.getFullYear()
  const h   = String(d.getHours()).padStart(2, '0')
  const m   = String(d.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${ano} ${h}:${m}`
}

// ─── Cabeçalho e rodapé comuns ────────────────────────────────────────────────

function cabecalho() {
  const parts = [
    CMD.init, CMD.codepage,
    CMD.alignCenter, CMD.boldOn,
    centro(REST_NOME),
    CMD.boldOff,
    centro(REST_END1),
    centro(REST_END2),
  ]
  if (REST_TEL) parts.push(centro(`Telefone: ${REST_TEL}`))
  parts.push(linha())
  return parts
}

function rodape() {
  return [
    CMD.alignCenter,
    txt('OBRIGADO'),
    txt('Restaurante Ecoville'),
    CMD.cut,
  ]
}

// ─── Enviar para impressora via TCP ───────────────────────────────────────────

function enviar(parts) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({ host: PRINTER_IP, port: PRINTER_PORT }, () => {
      for (const p of parts) sock.write(p)
      sock.end()
    })
    sock.on('close', resolve)
    sock.on('error', reject)
    sock.setTimeout(5000, () => {
      sock.destroy()
      reject(new Error('Timeout: impressora nao respondeu'))
    })
  })
}

// ─── Comanda da cozinha ───────────────────────────────────────────────────────

async function imprimirCozinha(pedido) {
  const p = [
    ...cabecalho(),
    CMD.alignCenter, CMD.boldOn, CMD.sizeNormal,
    txt('*** COZINHA ***'),
    CMD.sizeDouble,
    txt(`#${String(pedido.order_number).padStart(3, '0')}`),
    CMD.sizeNormal, CMD.boldOff,
    linha(),
    CMD.alignLeft, CMD.boldOn,
    txt(pedido.type === 'delivery' ? '  DELIVERY' : '  BALCAO'),
    CMD.boldOff,
    txt(`  ${dataHora()}`),
  ]

  if (pedido.table_number) p.push(txt(`  Mesa: ${pedido.table_number}`))

  p.push(
    linha(),
    CMD.boldOn, txt('QTD.  DESCRICAO'), CMD.boldOff,
    linha(),
  )

  for (const item of (pedido.items || [])) {
    p.push(CMD.boldOn, txt(`${item.quantity}x    ${item.product_name}`), CMD.boldOff)
    for (const v of (item.variations || [])) {
      p.push(txt(`        ${v.group_name}: ${v.variation_name}`))
    }
    for (const a of (item.addons || [])) {
      p.push(txt(`        + ${a.addon_name}`))
    }
    if (item.notes) p.push(txt(`        Obs: ${item.notes}`))
  }

  if (pedido.notes) {
    p.push(linha(), CMD.boldOn, txt(`OBSERVACAO: ${pedido.notes}`), CMD.boldOff)
  }

  p.push(linha(), ...rodape())

  try {
    await enviar(p)
    console.log(`[${hora()}] ✅ Cozinha #${pedido.order_number}`)
  } catch (e) {
    console.error(`[${hora()}] ❌ Erro cozinha #${pedido.order_number}:`, e.message)
  }
}

// ─── Cupom de entrega ─────────────────────────────────────────────────────────

async function imprimirEntrega(pedido) {
  const delivery_fee = Number(pedido.delivery_fee || 0)
  const total        = Number(pedido.total)
  const subtotal     = total - delivery_fee

  const p = [
    ...cabecalho(),
    CMD.alignLeft,
    txt(`Numero do pedido: ${pedido.order_number}`),
    txt(dataHora()),
    linha(),
    txt(`Nome do cliente: ${pedido.customer_name}`),
    txt(`Telefone: ${pedido.customer_phone}`),
  ]

  if (pedido.address) {
    const linhas = pedido.address.match(/.{1,38}/g) || []
    p.push(txt(`Endereco: ${linhas[0] || ''}`))
    for (let i = 1; i < linhas.length; i++) p.push(txt(`          ${linhas[i]}`))
  }

  p.push(
    linha(),
    CMD.boldOn, padLR('QTD.  DESC', 'Preco'), CMD.boldOff,
    linha(),
  )

  for (const item of (pedido.items || [])) {
    const unitPrice = item.unit_price ?? (item.total_price / item.quantity)
    const nomeLinha = truncar(`${item.quantity}x  ${item.product_name}`, 28)
    p.push(
      padLR(nomeLinha, moeda(item.total_price)),
      txt(`      Preco: ${moeda(unitPrice)}`),
      txt(`      Desconto: ${moeda(0)}`),
    )
    for (const a of (item.addons || [])) {
      p.push(padLR(`      + ${a.addon_name}`, moeda(a.price || 0)))
    }
  }

  p.push(
    linha(),
    padLR('Preco dos itens:', moeda(subtotal)),
    padLR('Impostos/IVA:', moeda(0)),
    padLR('Taxa de entrega:', moeda(delivery_fee)),
    linha(),
    CMD.boldOn, padLR('Total:', moeda(total)), CMD.boldOff,
    linha(),
  )

  const metodos = { dinheiro: 'Dinheiro', debito: 'Debito', credito: 'Credito', pix: 'PIX' }
  p.push(txt(`Pagamento: ${metodos[pedido.payment_method] || pedido.payment_method}`))
  if (pedido.troco) p.push(txt(`Troco para: ${moeda(pedido.troco)}`))

  p.push(linha(), ...rodape())

  try {
    await enviar(p)
    console.log(`[${hora()}] ✅ Entrega #${pedido.order_number}`)
  } catch (e) {
    console.error(`[${hora()}] ❌ Erro entrega #${pedido.order_number}:`, e.message)
  }
}

// ─── Buscar pedido completo ───────────────────────────────────────────────────

async function buscarPedido(id) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*, variations:order_item_variations(*), addons:order_item_addons(*))')
    .eq('id', id)
    .single()
  if (error) console.error('Erro ao buscar pedido:', error.message)
  return data
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

supabase
  .channel('print-agent')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'print_jobs' },
    async ({ new: job }) => {
      console.log(`[${hora()}] 🖨️  Impressão manual: ${job.type} pedido ${job.order_id}`)
      const completo = await buscarPedido(job.order_id)
      if (!completo) return
      if (job.type === 'cozinha') await imprimirCozinha(completo)
      if (job.type === 'entrega') await imprimirEntrega(completo)
    }
  )
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
    async ({ new: pedido }) => {
      console.log(`[${hora()}] 📥 Novo pedido #${pedido.order_number}`)
      const completo = await buscarPedido(pedido.id)
      if (completo) await imprimirCozinha(completo)
    }
  )
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' },
    async ({ new: pedido }) => {
      if (pedido.type === 'delivery' && pedido.status === 'pronto') {
        console.log(`[${hora()}] 🛵 Pronto para entrega #${pedido.order_number}`)
        const completo = await buscarPedido(pedido.id)
        if (completo) await imprimirEntrega(completo)
      }
    }
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[${hora()}] 🟢 Conectado ao Supabase — aguardando pedidos...`)
      console.log(`[${hora()}] 🖨️  Impressora: ${PRINTER_IP}:${PRINTER_PORT}`)
    }
  })

// ─── Teste de impressão ao iniciar ───────────────────────────────────────────

async function testePrinter() {
  const p = [
    CMD.init, CMD.codepage,
    CMD.alignCenter, CMD.boldOn,
    centro(REST_NOME),
    CMD.boldOff,
    txt('Print agent ativo!'),
    txt(dataHora()),
    CMD.cut,
  ]
  try {
    await enviar(p)
    console.log(`[${hora()}] 🖨️  Impressora OK`)
  } catch (e) {
    console.warn(`[${hora()}] ⚠️  Impressora nao encontrada em ${PRINTER_IP}:${PRINTER_PORT}`)
    console.warn(`         Verifique o IP e a conexao de rede.`)
  }
}

testePrinter()
