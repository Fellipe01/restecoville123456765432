import logging
import json
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, RedirectResponse
from database import (init_db, salvar_carrinho, atualizar_status, listar_carrinhos, buscar_carrinho,
                      INSTANCIAS, get_instancia_ativa, set_instancia_ativa,
                      listar_lojas, buscar_loja, criar_loja, atualizar_loja, deletar_loja,
                      resolver_loja, VARIAVEIS_DISPONIVEIS, MENSAGEM_PADRAO)
from whatsapp import send_text
from config import PORT, WEBHOOK_SECRET

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Remarketing Carrinho Abandonado")
init_db()

SPY_FILE = Path("spy_payloads.json")
DOMAIN   = "https://remarketing.usemalcriada.com"


def _extrair(data: dict) -> dict:
    cliente    = data.get("client") or {}
    items      = data.get("items") or []
    payment    = data.get("payment") or {}
    nome       = cliente.get("name") or ""
    telefone   = "".join(filter(str.isdigit, cliente.get("phone") or ""))
    email      = cliente.get("email") or ""
    produto    = items[0].get("name") if items else ""
    valor      = float(data.get("amount") or 0)
    codigo_pix = payment.get("qrcode") or ""
    link       = data.get("checkout_url") or ""
    return {"nome": nome, "telefone": telefone, "email": email,
            "produto": produto, "valor": valor, "codigo_pix": codigo_pix, "link_checkout": link}


async def disparar_whatsapp(carrinho_id: int, data: dict, loja: dict | None):
    telefone = data.get("telefone", "")
    if not telefone:
        atualizar_status(carrinho_id, "sem_telefone", 1)
        return

    valor_fmt = f"{float(data.get('valor', 0)):.2f}".replace(".", ",")
    template  = (loja["mensagem"] if loja else None) or MENSAGEM_PADRAO
    try:
        mensagem = template.format(
            nome=data.get("nome", ""),
            produto=data.get("produto", ""),
            valor=valor_fmt,
            codigo_pix=data.get("codigo_pix", ""),
            link_checkout=data.get("link_checkout", ""),
            email=data.get("email", ""),
        )
    except KeyError as e:
        logger.error(f"[TEMPLATE] variável inválida {e} — usando mensagem padrão")
        mensagem = MENSAGEM_PADRAO.format(
            nome=data.get("nome", ""), produto=data.get("produto", ""),
            valor=valor_fmt, codigo_pix="", link_checkout=data.get("link_checkout", ""), email="",
        )

    instancia  = get_instancia_ativa()
    carrinho   = buscar_carrinho(carrinho_id)
    tentativas = (carrinho.get("tentativas") or 0) + 1
    ok = await send_text(telefone, mensagem, instancia["token"])
    atualizar_status(carrinho_id, "enviado" if ok else "falhou", tentativas)


# ── Webhook ───────────────────────────────────────────────────────────────────

def _salvar_spy(headers: dict, payload: dict):
    existing = []
    if SPY_FILE.exists():
        try:
            existing = json.loads(SPY_FILE.read_text())
        except Exception:
            pass
    existing.insert(0, {"headers": headers, "payload": payload})
    SPY_FILE.write_text(json.dumps(existing[:20], ensure_ascii=False, indent=2))


@app.post("/webhook/spy")
async def webhook_spy(request: Request):
    try:
        raw = await request.json()
    except Exception:
        raw = {"erro": "não foi JSON", "body": (await request.body()).decode()}
    _salvar_spy(dict(request.headers), raw)
    logger.info(f"[SPY] {json.dumps(raw, ensure_ascii=False)[:200]}")
    return {"ok": True}


@app.post("/webhook")
async def receber_webhook(request: Request, background_tasks: BackgroundTasks):
    if WEBHOOK_SECRET:
        secret = request.headers.get("X-Webhook-Secret") or request.query_params.get("secret")
        if secret != WEBHOOK_SECRET:
            raise HTTPException(status_code=401, detail="Secret inválido")
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")

    _salvar_spy(dict(request.headers), data)
    mapeado = _extrair(data)
    loja    = resolver_loja(mapeado.get("link_checkout") or "")
    logger.info(f"[WEBHOOK] {mapeado.get('nome')} — {mapeado.get('produto')} | loja={loja['nome'] if loja else '—'}")
    carrinho_id = salvar_carrinho(mapeado, loja)
    background_tasks.add_task(disparar_whatsapp, carrinho_id, mapeado, loja)
    return {"ok": True, "id": carrinho_id}


@app.get("/api/spy")
def api_spy():
    if not SPY_FILE.exists():
        return []
    try:
        return json.loads(SPY_FILE.read_text())
    except Exception:
        return []


# ── Carrinhos ─────────────────────────────────────────────────────────────────

@app.post("/api/reenviar/{id}")
async def reenviar(id: int):
    carrinho = buscar_carrinho(id)
    if not carrinho:
        raise HTTPException(status_code=404, detail="Não encontrado")
    loja = buscar_loja(carrinho["loja_id"]) if carrinho.get("loja_id") else None
    await disparar_whatsapp(id, carrinho, loja)
    return {"ok": True}


@app.get("/api/carrinhos")
def api_carrinhos():
    return listar_carrinhos()


# ── Instância ─────────────────────────────────────────────────────────────────

@app.post("/instancia/salvar")
async def instancia_salvar(request: Request):
    form  = await request.form()
    token = form.get("token", "")
    if any(i["token"] == token for i in INSTANCIAS):
        set_instancia_ativa(token)
    return RedirectResponse("/", status_code=303)


# ── Lojas ─────────────────────────────────────────────────────────────────────

@app.get("/lojas", response_class=HTMLResponse)
def pagina_lojas():
    lojas    = listar_lojas()
    vars_html = "".join(
        f'<span onclick="inserir(\'{v}\')" title="{d}" '
        f'style="background:#1e3a8a;color:#93c5fd;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:.8rem">{v}</span> '
        for v, d in VARIAVEIS_DISPONIVEIS
    )
    lojas_html = "".join(f"""
        <tr>
          <td>{l['id']}</td>
          <td><strong>{l['nome']}</strong></td>
          <td><code style="color:#4ade80;font-size:.82rem">{l['url_keyword']}</code></td>
          <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem;color:#94a3b8">{l['mensagem'][:80]}…</td>
          <td>
            <a href="/lojas/{l['id']}/editar" style="background:#1d4ed8;color:#fff;padding:5px 12px;border-radius:6px;text-decoration:none;font-size:.8rem;margin-right:6px">Editar</a>
            <form method="POST" action="/lojas/{l['id']}/deletar" style="display:inline" onsubmit="return confirm('Deletar?')">
              <button style="background:#7f1d1d;color:#fca5a5;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:.8rem">Deletar</button>
            </form>
          </td>
        </tr>""" for l in lojas)

    corpo_tabela = (
        '<table><thead><tr><th>#</th><th>Nome</th><th>Palavra-chave URL</th><th>Mensagem</th><th>Ações</th></tr></thead>'
        f'<tbody>{lojas_html}</tbody></table>' if lojas
        else '<p style="color:#475569;padding:20px 0">Nenhuma loja cadastrada ainda.</p>'
    )

    return HTMLResponse(f"""<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lojas — Remarketing</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}}
  header{{background:#1e293b;padding:16px 32px;border-bottom:1px solid #334155;display:flex;align-items:center;gap:12px}}
  .container{{padding:24px 32px}}
  .card{{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:24px}}
  h2{{font-size:1rem;margin-bottom:16px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}}
  label{{display:block;font-size:.85rem;color:#94a3b8;margin-bottom:6px;margin-top:14px}}
  input,textarea{{width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:10px 14px;border-radius:8px;font-size:.9rem;font-family:inherit}}
  textarea{{min-height:180px;resize:vertical}}
  input:focus,textarea:focus{{outline:none;border-color:#3b82f6}}
  .btn{{background:#16a34a;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:.9rem;font-weight:600;margin-top:16px}}
  table{{width:100%;border-collapse:collapse}}
  th{{background:#0f172a;padding:10px 14px;text-align:left;font-size:.78rem;color:#64748b;text-transform:uppercase;border-bottom:1px solid #334155}}
  td{{padding:12px 14px;border-bottom:1px solid #1e293b;font-size:.88rem;vertical-align:middle}}
  .vars{{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}}
  a{{color:#60a5fa;text-decoration:none;font-size:.85rem}}
</style></head>
<body>
<header>
  <a href="/">← Voltar ao painel</a>
  <span style="color:#334155;margin:0 8px">|</span>
  <span style="font-weight:600">Gerenciar Lojas</span>
</header>
<div class="container">
  <div class="card">
    <h2>Nova Loja</h2>
    <form method="POST" action="/lojas/criar">
      <label>Nome da loja</label>
      <input name="nome" placeholder="Ex: Loja de Tênis" required>
      <label>Palavra-chave da URL <span style="color:#64748b;font-size:.78rem">(trecho único da checkout_url desta loja)</span></label>
      <input name="url_keyword" placeholder="Ex: pagamento.atacadodelta" required>
      <label>Mensagem de recuperação</label>
      <div class="vars">{vars_html}</div>
      <textarea name="mensagem" id="msg-nova">{MENSAGEM_PADRAO}</textarea>
      <button type="submit" class="btn">+ Criar Loja</button>
    </form>
  </div>
  <div class="card">
    <h2>Lojas cadastradas</h2>
    {corpo_tabela}
  </div>
</div>
<script>
function inserir(v){{
  const t=document.getElementById('msg-nova');
  const s=t.selectionStart,e=t.selectionEnd;
  t.value=t.value.slice(0,s)+v+t.value.slice(e);
  t.focus();t.selectionEnd=s+v.length;
}}
</script>
</body></html>""")


@app.get("/lojas/{id}/editar", response_class=HTMLResponse)
def editar_loja_pagina(id: int):
    l = buscar_loja(id)
    if not l:
        return HTMLResponse("Não encontrado", status_code=404)
    vars_html = "".join(
        f'<span onclick="inserir(\'{v}\')" title="{d}" '
        f'style="background:#1e3a8a;color:#93c5fd;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:.8rem">{v}</span> '
        for v, d in VARIAVEIS_DISPONIVEIS
    )
    return HTMLResponse(f"""<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Editar Loja</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}}
  header{{background:#1e293b;padding:16px 32px;border-bottom:1px solid #334155}}
  a{{color:#60a5fa;text-decoration:none;font-size:.85rem}}
  .container{{padding:24px 32px;max-width:800px}}
  .card{{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px}}
  h2{{font-size:1.1rem;margin-bottom:16px}}
  label{{display:block;font-size:.85rem;color:#94a3b8;margin-bottom:6px;margin-top:14px}}
  input,textarea{{width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:10px 14px;border-radius:8px;font-size:.9rem;font-family:inherit}}
  textarea{{min-height:200px;resize:vertical}}
  .btn{{background:#16a34a;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:.9rem;font-weight:600;margin-top:16px}}
  .vars{{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}}
</style></head>
<body>
<header><a href="/lojas">← Voltar às lojas</a></header>
<div class="container">
  <div class="card">
    <h2>Editar: {l['nome']}</h2>
    <form method="POST" action="/lojas/{id}/salvar">
      <label>Nome da loja</label>
      <input name="nome" value="{l['nome']}" required>
      <label>Palavra-chave da URL</label>
      <input name="url_keyword" value="{l['url_keyword']}" required>
      <label>Mensagem de recuperação</label>
      <div class="vars">{vars_html}</div>
      <textarea name="mensagem" id="msg-edit">{l['mensagem']}</textarea>
      <button type="submit" class="btn">Salvar alterações</button>
    </form>
  </div>
</div>
<script>
function inserir(v){{
  const t=document.getElementById('msg-edit');
  const s=t.selectionStart,e=t.selectionEnd;
  t.value=t.value.slice(0,s)+v+t.value.slice(e);
  t.focus();t.selectionEnd=s+v.length;
}}
</script>
</body></html>""")


@app.post("/lojas/criar")
async def loja_criar(request: Request):
    form = await request.form()
    criar_loja(form.get("nome", ""), form.get("url_keyword", ""), form.get("mensagem", MENSAGEM_PADRAO))
    return RedirectResponse("/lojas", status_code=303)


@app.post("/lojas/{id}/salvar")
async def loja_salvar(id: int, request: Request):
    form = await request.form()
    atualizar_loja(id, form.get("nome", ""), form.get("url_keyword", ""), form.get("mensagem", ""))
    return RedirectResponse("/lojas", status_code=303)


@app.post("/lojas/{id}/deletar")
async def loja_deletar(id: int):
    deletar_loja(id)
    return RedirectResponse("/lojas", status_code=303)


# ── Dashboard ─────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
def dashboard():
    ativa   = get_instancia_ativa()
    options = "".join(
        f'<option value="{i["token"]}" {"selected" if i["token"] == ativa["token"] else ""}>{i["nome"]}</option>'
        for i in INSTANCIAS
    )
    return HTMLResponse(DASHBOARD_HTML.replace("<!-- OPTIONS -->", options).replace("<!-- DOMAIN -->", DOMAIN))


DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Remarketing — Carrinhos Abandonados</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #0f172a; color: #e2e8f0; min-height: 100vh; }
  header { background: #1e293b; padding: 18px 32px; border-bottom: 1px solid #334155;
           display: flex; align-items: center; gap: 14px; }
  header h1 { font-size: 1.15rem; font-weight: 600; }
  .stats { display: flex; gap: 16px; padding: 24px 32px; flex-wrap: wrap; }
  .stat { background: #1e293b; border: 1px solid #334155; border-radius: 10px;
          padding: 16px 24px; flex: 1; min-width: 140px; }
  .stat .n { font-size: 2rem; font-weight: 700; }
  .stat .l { font-size: .8rem; color: #94a3b8; margin-top: 4px; }
  .stat.verde .n   { color: #4ade80; }
  .stat.vermelho .n{ color: #f87171; }
  .stat.amarelo .n { color: #fbbf24; }
  .stat.azul .n    { color: #60a5fa; }
  .toolbar { padding: 0 32px 16px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .toolbar input  { background: #1e293b; border: 1px solid #334155; border-radius: 8px;
                    color: #e2e8f0; padding: 8px 14px; font-size: .9rem; width: 260px; }
  .toolbar input::placeholder { color: #475569; }
  .toolbar select { background: #1e293b; border: 1px solid #334155; border-radius: 8px;
                    color: #e2e8f0; padding: 8px 14px; font-size: .9rem; cursor: pointer; }
  table { width: 100%; border-collapse: collapse; }
  .table-wrap { margin: 0 32px 32px; background: #1e293b; border: 1px solid #334155;
                border-radius: 12px; overflow: hidden; }
  th { background: #0f172a; padding: 12px 16px; text-align: left; font-size: .75rem;
       color: #64748b; text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid #334155; }
  td { padding: 12px 16px; font-size: .87rem; border-bottom: 1px solid #1e293b; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #243047; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: .75rem; font-weight: 600; }
  .badge.enviado      { background: #14532d; color: #4ade80; }
  .badge.falhou       { background: #450a0a; color: #f87171; }
  .badge.pendente     { background: #1c1917; color: #fbbf24; }
  .badge.sem_telefone { background: #1e1b4b; color: #a5b4fc; }
  .btn-re { background: #1d4ed8; color: #fff; border: none; padding: 5px 12px;
            border-radius: 6px; cursor: pointer; font-size: .8rem; white-space: nowrap; }
  .btn-re:hover { background: #2563eb; }
  .btn-re:disabled { background: #334155; color: #64748b; cursor: not-allowed; }
  .empty { text-align: center; padding: 60px; color: #475569; }
  .valor { font-weight: 600; color: #4ade80; }
  .small { font-size: .78rem; color: #64748b; }
  .loja-tag { display:inline-block; background:#1e3a8a; color:#93c5fd;
              padding:2px 8px; border-radius:4px; font-size:.75rem; }
</style>
</head>
<body>

<header>
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2">
    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 7h13M10 20a1 1 0 1 0 2 0 1 1 0 0 0-2 0M17 20a1 1 0 1 0 2 0 1 1 0 0 0-2 0"/>
  </svg>
  <h1>Remarketing — Carrinhos Abandonados</h1>
  <a href="/lojas" style="margin-left:auto;background:#1e3a8a;color:#93c5fd;padding:7px 16px;border-radius:8px;text-decoration:none;font-size:.83rem;font-weight:600">⚙ Lojas</a>
  <span id="ultima" style="color:#475569;font-size:.78rem">—</span>
</header>

<form method="POST" action="/instancia/salvar"
  style="background:#1e293b;border-bottom:1px solid #334155;padding:10px 32px;display:flex;align-items:center;gap:12px">
  <span style="font-size:.83rem;color:#94a3b8">WhatsApp ativo:</span>
  <select name="token" style="background:#0f172a;border:1px solid #475569;color:#e2e8f0;
    padding:7px 14px;border-radius:8px;font-size:.88rem;cursor:pointer;min-width:180px">
    <!-- OPTIONS -->
  </select>
  <button type="submit" style="background:#16a34a;color:#fff;border:none;
    padding:7px 16px;border-radius:8px;cursor:pointer;font-size:.83rem;font-weight:600">Salvar</button>
  <span style="margin-left:auto;font-size:.78rem;color:#475569">
    Webhook: <code style="color:#4ade80"><!-- DOMAIN -->/webhook</code>
    &nbsp;|&nbsp;
    <button type="button" onclick="verSpy()"
      style="background:none;border:none;color:#60a5fa;cursor:pointer;font-size:.78rem;text-decoration:underline">
      Ver payload spy ↗
    </button>
  </span>
</form>

<div class="stats">
  <div class="stat azul">   <div class="n" id="s-total">0</div>   <div class="l">Total recebidos</div></div>
  <div class="stat verde">  <div class="n" id="s-enviado">0</div> <div class="l">Enviados</div></div>
  <div class="stat vermelho"><div class="n" id="s-falhou">0</div>  <div class="l">Falharam</div></div>
  <div class="stat amarelo"><div class="n" id="s-pendente">0</div> <div class="l">Pendentes</div></div>
</div>

<div class="toolbar">
  <input type="text" id="busca" placeholder="Buscar nome, telefone ou produto...">
  <select id="filtro">
    <option value="">Todos os status</option>
    <option value="enviado">Enviado</option>
    <option value="pendente">Pendente</option>
    <option value="falhou">Falhou</option>
    <option value="sem_telefone">Sem telefone</option>
  </select>
  <button style="background:#0f172a;border:1px solid #334155;color:#94a3b8;padding:8px 14px;
    border-radius:8px;cursor:pointer;font-size:.85rem;margin-left:auto" onclick="carregar()">
    ↻ Atualizar
  </button>
</div>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>#</th><th>Nome</th><th>Telefone</th><th>Produto</th>
        <th>Valor</th><th>Loja</th><th>Status</th><th>Recebido em</th><th>Ação</th>
      </tr>
    </thead>
    <tbody id="tbody"><tr><td colspan="9" class="empty">Carregando...</td></tr></tbody>
  </table>
</div>

<script>
let dados = [];

function fmt_data(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function fmt_valor(v) {
  return v == null ? '—' : 'R$ ' + parseFloat(v).toFixed(2).replace('.', ',');
}
function badge(s) {
  const l = {enviado:'Enviado', falhou:'Falhou', pendente:'Pendente', sem_telefone:'Sem tel.'};
  return `<span class="badge ${s}">${l[s]||s}</span>`;
}

function renderizar() {
  const busca  = document.getElementById('busca').value.toLowerCase();
  const filtro = document.getElementById('filtro').value;
  const tbody  = document.getElementById('tbody');
  const lista  = dados.filter(c =>
    (!filtro || c.status === filtro) &&
    (!busca  || (c.nome||'').toLowerCase().includes(busca) ||
                (c.telefone||'').includes(busca) ||
                (c.produto||'').toLowerCase().includes(busca))
  );
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty">Nenhum registro encontrado.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(c => `
    <tr>
      <td class="small">${c.id}</td>
      <td>${c.nome||'—'}</td>
      <td>${c.telefone||'—'}</td>
      <td>${c.produto||'—'}</td>
      <td class="valor">${fmt_valor(c.valor)}</td>
      <td>${c.loja_nome ? `<span class="loja-tag">${c.loja_nome}</span>` : '<span class="small">—</span>'}</td>
      <td>${badge(c.status)}</td>
      <td class="small">${fmt_data(c.criado_em)}</td>
      <td>
        <button class="btn-re" onclick="reenviar(${c.id},this)" ${c.status==='enviado'?'disabled':''}>
          ${c.status==='enviado'?'Enviado ✓':'Reenviar'}
        </button>
      </td>
    </tr>`).join('');
}

function atualizar_stats() {
  document.getElementById('s-total').textContent    = dados.length;
  document.getElementById('s-enviado').textContent  = dados.filter(c=>c.status==='enviado').length;
  document.getElementById('s-falhou').textContent   = dados.filter(c=>c.status==='falhou').length;
  document.getElementById('s-pendente').textContent = dados.filter(c=>c.status==='pendente').length;
}

async function carregar() {
  try {
    const r = await fetch('/api/carrinhos');
    dados = await r.json();
    atualizar_stats();
    renderizar();
    document.getElementById('ultima').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR');
  } catch(e) {
    document.getElementById('tbody').innerHTML = '<tr><td colspan="9" class="empty">Erro ao carregar dados.</td></tr>';
  }
}

async function reenviar(id, btn) {
  btn.disabled = true; btn.textContent = 'Enviando...';
  const r = await fetch(`/api/reenviar/${id}`, {method:'POST'});
  if (r.ok) { btn.textContent = 'Enviado ✓'; await carregar(); }
  else { btn.textContent = 'Erro'; btn.disabled = false; }
}

async function verSpy() {
  const r = await fetch('/api/spy');
  const data = await r.json();
  if (!data.length) { alert('Nenhum payload capturado ainda.'); return; }
  const win = window.open('','_blank');
  win.document.write('<pre style="background:#0f172a;color:#4ade80;padding:20px;font-size:13px;white-space:pre-wrap">'
    + JSON.stringify(data[0].payload, null, 2) + '</pre>');
}

document.getElementById('busca').addEventListener('input', renderizar);
document.getElementById('filtro').addEventListener('change', renderizar);
carregar();
setInterval(carregar, 30000);
</script>
</body>
</html>"""


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)
