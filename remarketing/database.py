import sqlite3
import json
from datetime import datetime
from config import DATABASE_PATH


def get_conn():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


INSTANCIAS = [
    {"id": "38783790bac472b745bb0adbb477730e", "nome": "Bot Principal", "token": "meu-token-bot-2024"},
    {"id": "f3882c9fb4c021c90fd4724eee185c42", "nome": "Wizy",          "token": "wizyremarketing12381y2831"},
]

VARIAVEIS_DISPONIVEIS = [
    ("{nome}",         "Nome do cliente"),
    ("{produto}",      "Nome do produto"),
    ("{valor}",        "Valor do carrinho (ex: 149,00)"),
    ("{link_checkout}","Link para finalizar a compra"),
    ("{email}",        "E-mail do cliente"),
]

MENSAGEM_PADRAO = """\
Olá, {nome}! 👋

Vi que você deixou *{produto}* no carrinho e não finalizou a compra. 😊

💰 Valor: *R$ {valor}*

Clique no link abaixo para concluir agora:
{link_checkout}

Qualquer dúvida é só responder esta mensagem! 💚\
"""


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS carrinhos (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                nome          TEXT,
                telefone      TEXT,
                email         TEXT,
                produto       TEXT,
                valor         REAL,
                codigo_pix    TEXT,
                link_checkout TEXT,
                payload_raw   TEXT,
                loja_id       INTEGER,
                loja_nome     TEXT,
                status        TEXT DEFAULT 'pendente',
                tentativas    INTEGER DEFAULT 0,
                criado_em     TEXT,
                enviado_em    TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS config (
                chave TEXT PRIMARY KEY,
                valor TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS lojas (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                nome        TEXT NOT NULL,
                url_keyword TEXT NOT NULL,
                mensagem    TEXT NOT NULL,
                ativo       INTEGER DEFAULT 1,
                criado_em   TEXT
            )
        """)
        # migrations para bancos existentes
        for col, typedef in [("loja_id", "INTEGER"), ("loja_nome", "TEXT")]:
            try:
                conn.execute(f"ALTER TABLE carrinhos ADD COLUMN {col} {typedef}")
            except Exception:
                pass
        conn.commit()


# ── Lojas ─────────────────────────────────────────────────────────────────────

def listar_lojas() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM lojas ORDER BY id").fetchall()
        return [dict(r) for r in rows]


def buscar_loja(id: int) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM lojas WHERE id = ?", (id,)).fetchone()
        return dict(row) if row else None


def criar_loja(nome: str, url_keyword: str, mensagem: str) -> int:
    agora = datetime.now().isoformat()
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO lojas (nome, url_keyword, mensagem, criado_em) VALUES (?, ?, ?, ?)",
            (nome, url_keyword, mensagem, agora)
        )
        conn.commit()
        return cur.lastrowid


def atualizar_loja(id: int, nome: str, url_keyword: str, mensagem: str):
    with get_conn() as conn:
        conn.execute(
            "UPDATE lojas SET nome=?, url_keyword=?, mensagem=? WHERE id=?",
            (nome, url_keyword, mensagem, id)
        )
        conn.commit()


def deletar_loja(id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM lojas WHERE id = ?", (id,))
        conn.commit()


def resolver_loja(checkout_url: str) -> dict | None:
    if not checkout_url:
        return None
    for loja in listar_lojas():
        if loja.get("url_keyword") and loja["url_keyword"].lower() in checkout_url.lower():
            return loja
    return None


# ── Config / Instância ────────────────────────────────────────────────────────

def get_instancia_ativa() -> dict:
    with get_conn() as conn:
        row = conn.execute("SELECT valor FROM config WHERE chave='instancia_token'").fetchone()
        token = row["valor"] if row else INSTANCIAS[0]["token"]
    return next((i for i in INSTANCIAS if i["token"] == token), INSTANCIAS[0])


def set_instancia_ativa(token: str):
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO config (chave, valor) VALUES ('instancia_token', ?)", (token,)
        )
        conn.commit()


# ── Carrinhos ─────────────────────────────────────────────────────────────────

def salvar_carrinho(data: dict, loja: dict | None = None) -> int:
    agora = datetime.now().isoformat()
    with get_conn() as conn:
        cur = conn.execute("""
            INSERT INTO carrinhos
                (nome, telefone, email, produto, valor, codigo_pix,
                 link_checkout, payload_raw, loja_id, loja_nome, criado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("nome"),
            data.get("telefone"),
            data.get("email"),
            data.get("produto"),
            data.get("valor"),
            data.get("codigo_pix"),
            data.get("link_checkout"),
            json.dumps(data, ensure_ascii=False),
            loja["id"] if loja else None,
            loja["nome"] if loja else None,
            agora,
        ))
        conn.commit()
        return cur.lastrowid


def atualizar_status(id: int, status: str, tentativas: int):
    enviado_em = datetime.now().isoformat() if status == "enviado" else None
    with get_conn() as conn:
        conn.execute("""
            UPDATE carrinhos SET status=?, tentativas=?, enviado_em=? WHERE id=?
        """, (status, tentativas, enviado_em, id))
        conn.commit()


def listar_carrinhos(limit: int = 200) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM carrinhos ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


def buscar_carrinho(id: int) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM carrinhos WHERE id = ?", (id,)).fetchone()
        return dict(row) if row else None
