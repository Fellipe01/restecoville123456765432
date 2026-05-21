import os

WUZAPI_BASE_URL   = os.getenv("WUZAPI_BASE_URL",   "http://localhost:8080")
WUZAPI_USER_TOKEN = os.getenv("WUZAPI_USER_TOKEN",  "meu-token-bot-2024")
PORT              = int(os.getenv("PORT", "3001"))
DATABASE_PATH     = os.getenv("DATABASE_PATH", "remarketing.db")
WEBHOOK_SECRET    = os.getenv("WEBHOOK_SECRET", "")  # se quiser validar origem

MESSAGE_TEMPLATE = os.getenv("MESSAGE_TEMPLATE", """\
Olá, {nome}! 👋

Vi que você deixou *{produto}* no carrinho e não finalizou a compra. 😊

💰 Valor: *R$ {valor}*

Clique no link abaixo para concluir agora:
{link_checkout}

Qualquer dúvida é só responder esta mensagem! 💚\
""")
