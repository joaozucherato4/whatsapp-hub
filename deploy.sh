#!/usr/bin/env bash
set -e

echo "=== BotyZap - Deploy automatico ==="

# 1. Instala Docker se necessario
if ! command -v docker &> /dev/null; then
  echo "Docker nao encontrado. Instalando..."
  curl -fsSL https://get.docker.com | sh
fi

if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
  echo "Instalando Docker Compose plugin..."
  apt-get update && apt-get install -y docker-compose-plugin
fi

# 2. Gera .env se nao existir
if [ ! -f .env ]; then
  echo "Gerando .env com segredos aleatorios..."
  cp .env.example .env
  sed -i "s/troque_esta_senha/$(openssl rand -hex 16)/" .env
  sed -i "s/troque_esta_chave/$(openssl rand -hex 16)/" .env
  sed -i "s/troque_este_segredo/$(openssl rand -hex 24)/" .env
  sed -i "0,/troque_este_token/s//$(openssl rand -hex 12)/" .env
  sed -i "0,/troque_este_token/s//$(openssl rand -hex 12)/" .env
  echo ""
  echo ">>> ANOTE os tokens de webhook gerados em .env (HOTMART_WEBHOOK_TOKEN e KIWIFY_WEBHOOK_TOKEN)"
  echo ""
fi

# 3. Sobe tudo
docker compose up -d --build

echo ""
echo "=== Deploy concluido! ==="
echo "Painel disponivel em: https://179-198-120-137.sslip.io (aguarde 1-2 min para o certificado SSL)"
echo ""
echo "Para criar o primeiro atendente, rode:"
echo "  docker compose exec backend node src/create-agent.js \"Seu Nome\" voce@email.com sua_senha"
