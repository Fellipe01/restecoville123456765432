import type { Order } from '@/types'

const RESTAURANTE = 'Ecoville Restaurante'
const ENDERECO1   = 'Rua Santa Luzia, lote 17, n. 17'
const ENDERECO2   = 'Gurupi - TO, 77402-970'

function moeda(v: number | string) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

function dataHora() {
  return new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const BASE_STYLE = `
  @page { size: 80mm auto; margin: 4mm 3mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 11px; width: 72mm; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .big { font-size: 15px; font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 5px 0; }
  .row { display: flex; justify-content: space-between; }
  .indent { padding-left: 10px; }
  .mt { margin-top: 4px; }
`

function wrap(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>${BASE_STYLE}</style>
</head>
<body>
${body}
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  }
</script>
</body>
</html>`
}

export function printCozinha(order: Order) {
  const num = String(order.order_number).padStart(3, '0')
  const tipo = order.type === 'delivery' ? 'DELIVERY' : 'BALCÃO'

  let itensHtml = ''
  for (const item of order.items ?? []) {
    itensHtml += `<div class="bold mt">${item.quantity}x  ${item.product_name}</div>`
    for (const v of item.variations ?? []) {
      itensHtml += `<div class="indent">${v.group_name}: ${v.variation_name}</div>`
    }
    for (const a of item.addons ?? []) {
      itensHtml += `<div class="indent">+ ${a.addon_name}</div>`
    }
    if (item.notes) {
      itensHtml += `<div class="indent"><em>Obs: ${item.notes}</em></div>`
    }
  }

  const body = `
<div class="center bold">${RESTAURANTE}</div>
<div class="center">${ENDERECO1}</div>
<div class="center">${ENDERECO2}</div>
<div class="line"></div>
<div class="center">*** COZINHA ***</div>
<div class="center big">#${num}</div>
<div class="center bold">${tipo}</div>
<div class="center">${dataHora()}</div>
${order.table_number ? `<div class="center">Mesa: ${order.table_number}</div>` : ''}
<div class="line"></div>
<div class="bold">QTD.  DESCRIÇÃO</div>
<div class="line"></div>
${itensHtml}
${order.notes ? `<div class="line"></div><div class="bold">OBSERVAÇÃO:</div><div>${order.notes}</div>` : ''}
<div class="line"></div>
<div class="center mt">— FIM DA COMANDA —</div>
`
  openPrint(`Cozinha #${num}`, body)
}

export function printEntrega(order: Order) {
  const num = String(order.order_number).padStart(3, '0')
  const deliveryFee = Number(order.delivery_fee ?? 0)
  const total       = Number(order.total)
  const subtotal    = total - deliveryFee

  const metodos: Record<string, string> = {
    dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito',
  }

  let itensHtml = ''
  for (const item of order.items ?? []) {
    const unitPrice = item.unit_price ?? (item.total_price / item.quantity)
    itensHtml += `
<div class="row mt">
  <span class="bold">${item.quantity}x ${item.product_name}</span>
  <span>${moeda(item.total_price)}</span>
</div>
<div class="indent row"><span>Preço unit.:</span><span>${moeda(unitPrice)}</span></div>`
    for (const a of item.addons ?? []) {
      itensHtml += `<div class="indent row"><span>+ ${a.addon_name}</span><span>${moeda(a.price ?? 0)}</span></div>`
    }
  }

  const body = `
<div class="center bold">${RESTAURANTE}</div>
<div class="center">${ENDERECO1}</div>
<div class="center">${ENDERECO2}</div>
<div class="line"></div>
<div class="row"><span>Pedido nº:</span><span class="bold">${num}</span></div>
<div class="row"><span>Data/hora:</span><span>${dataHora()}</span></div>
<div class="line"></div>
<div class="row"><span>Cliente:</span><span class="bold">${order.customer_name}</span></div>
<div class="row"><span>Telefone:</span><span>${order.customer_phone}</span></div>
${order.address ? `<div class="mt"><span>Endereço: </span><span>${order.address}</span></div>` : ''}
<div class="line"></div>
<div class="row bold"><span>QTD  DESCRIÇÃO</span><span>PREÇO</span></div>
<div class="line"></div>
${itensHtml}
<div class="line"></div>
<div class="row"><span>Subtotal:</span><span>${moeda(subtotal)}</span></div>
<div class="row"><span>Taxa de entrega:</span><span>${moeda(deliveryFee)}</span></div>
<div class="line"></div>
<div class="row bold"><span>TOTAL:</span><span>${moeda(total)}</span></div>
<div class="line"></div>
<div class="row"><span>Pagamento:</span><span>${metodos[order.payment_method] ?? order.payment_method}</span></div>
${order.troco ? `<div class="row"><span>Troco para:</span><span>${moeda(order.troco)}</span></div>` : ''}
<div class="line"></div>
<div class="center mt">OBRIGADO!</div>
<div class="center">Restaurante Ecoville</div>
`
  openPrint(`Recibo #${num}`, body)
}

function openPrint(title: string, body: string) {
  const html = wrap(title, body)
  const w = window.open('', '_blank', 'width=420,height=700')
  if (!w) {
    alert('Permita popups para este site para imprimir.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}
