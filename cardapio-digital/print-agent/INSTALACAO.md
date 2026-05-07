# Agente de Impressão — Epson TM-T20

Roda em qualquer PC do restaurante conectado na mesma rede da impressora.

## Pré-requisitos

- Node.js LTS instalado (https://nodejs.org)
- Epson TM-T20 ligada e conectada via cabo de rede no roteador
- PC na mesma rede da impressora

## Como descobrir o IP da impressora

1. Desligue a impressora
2. Segure o botão **FEED** e ligue
3. Ela imprime uma folha com as configurações de rede
4. Anote o **IP Address** (ex: `10.1.1.14`)

## Configuração

Edite o arquivo `.env` com os dados corretos:

```
PRINTER_IP=10.1.1.14
PRINTER_PORT=9100
RESTAURANT_PHONE=(63) XXXXX-XXXX
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Instalação e execução

```
npm install
npm start
```

Ao iniciar imprime uma folha de teste. Se não imprimir, verifique o IP no `.env`.

## O que imprime

| Evento | Cupom |
|--------|-------|
| Cliente faz um pedido | Cozinha — itens e observações |
| Admin marca como "Pronto" | Entrega — cliente, endereço, valores, pagamento |

## Auto-start no Windows (pm2)

```
npm install -g pm2
pm2 start index.js --name "print-agent"
schtasks /create /tn "PrintAgent" /tr "\"C:\Users\USUARIO\AppData\Roaming\npm\pm2.cmd\" start \"CAMINHO_COMPLETO\print-agent\index.js\" --name print-agent" /sc onlogon /f
```
