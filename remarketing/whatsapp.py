import logging
import httpx
from config import WUZAPI_BASE_URL

logger = logging.getLogger(__name__)
TIMEOUT = 20.0


def _jid(phone: str) -> str:
    digits = "".join(filter(str.isdigit, phone))
    return f"{digits}@s.whatsapp.net"


async def send_text(phone: str, message: str, token: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(
                f"{WUZAPI_BASE_URL}/chat/send/text",
                json={"phone": _jid(phone), "body": message},
                headers={"Token": token},
            )
            r.raise_for_status()
            logger.info(f"[REMARKETING] enviado → {phone}")
            return True
    except httpx.HTTPError as e:
        logger.error(f"[REMARKETING] erro → {phone}: {e}")
        return False
