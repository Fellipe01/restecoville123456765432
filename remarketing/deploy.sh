#!/usr/bin/env bash
set -e

PROJECT_DIR="/root/remarketing"
SERVICE="remarketing"

echo "==> Enviando arquivos..."
rsync -avz --exclude='.env' --exclude='*.db' --exclude='venv' \
  /Users/teste/remarketing/ root@2.24.90.175:$PROJECT_DIR/

echo "==> Conectando no servidor..."
ssh root@2.24.90.175 << 'EOF'
set -e
cd /root/remarketing

echo "==> Criando .env se não existir..."
if [ ! -f .env ]; then
  cat > .env << 'ENVEOF'
WUZAPI_BASE_URL=http://localhost:8080
WUZAPI_USER_TOKEN=meu-token-bot-2024
PORT=3001
DATABASE_PATH=/root/remarketing/remarketing.db
WEBHOOK_SECRET=
ENVEOF
fi

echo "==> Criando ambiente virtual..."
python3 -m venv venv
venv/bin/pip install --upgrade pip -q
venv/bin/pip install -r requirements.txt -q

echo "==> Instalando serviço..."
cp remarketing.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable remarketing
systemctl restart remarketing

echo "==> Status:"
systemctl status remarketing --no-pager
EOF

echo ""
echo "✅ Deploy concluído!"
echo "   Painel: http://2.24.90.175:3001"
echo "   Webhook URL: http://2.24.90.175:3001/webhook"
