# BotyZap — Central de WhatsApp Multi-Instância

Sistema de suporte com múltiplas instâncias de WhatsApp (uma por país/idioma), interface
estilo WhatsApp Web, e recebimento de webhooks do Hotmart/Kiwify com mensagens automáticas.

100% self-hosted na sua VPS. Sem mensalidade de ferramenta terceira — só o custo da VPS que você já tem.

## Passo a passo (rodar UMA vez na VPS)

### 1. Aponte o DNS
No painel de domínio, crie um registro:
- Tipo: `A`
- Nome: `app`
- Valor: IP da sua VPS

Espera propagar (geralmente 5-30 min). Confirme com `ping 179-198-120-137.sslip.io` do seu computador.

### 2. Acesse a VPS via SSH
No terminal do seu Mac:
```bash
ssh root@SEU_IP_DA_VPS
```
(a senha/chave você pega no painel da Hostinger)

### 3. Envie os arquivos deste projeto para a VPS
Do seu Mac, na pasta onde está a pasta `whatsapp-hub`:
```bash
scp -r whatsapp-hub root@SEU_IP_DA_VPS:/root/
```

### 4. Rode o deploy
Já dentro da VPS (via SSH):
```bash
cd /root/whatsapp-hub
chmod +x deploy.sh
./deploy.sh
```

Isso instala Docker (se não tiver), gera senhas/tokens seguros automaticamente, e sobe:
- PostgreSQL (banco de dados)
- Evolution API (motor do WhatsApp)
- Backend (Node.js)
- Frontend (React)
- Caddy (HTTPS automático)

### 5. Crie seu usuário de login
Ainda na VPS:
```bash
docker compose exec backend node src/create-agent.js "Seu Nome" voce@email.com sua_senha
```
Repita pra cada atendente da equipe (2-5 pessoas), trocando nome/email/senha.

### 6. Acesse o painel
Abra `https://179-198-120-137.sslip.io` no navegador, faça login, e clique em **+** na barra
lateral esquerda pra criar sua primeira instância (ex: Estados Unidos / en).
Escaneie o QR Code com o WhatsApp daquele país.

### 7. Configure os webhooks do Hotmart/Kiwify

No .env gerado na VPS (`cat /root/whatsapp-hub/.env`), copie os valores de
`HOTMART_WEBHOOK_TOKEN` e `KIWIFY_WEBHOOK_TOKEN`.

**Hotmart:** Painel Hotmart → Ferramentas → Webhook → URL:
```
https://179-198-120-137.sslip.io/webhooks/hotmart?token=SEU_TOKEN&instance_id=1
```
(troque `instance_id=1` pelo ID da instância certa daquele produto — aparece na lista de instâncias)

**Kiwify:** Painel Kiwify → Webhooks → URL:
```
https://179-198-120-137.sslip.io/webhooks/kiwify?token=SEU_TOKEN&instance_id=1
```

### 8. Personalize as mensagens automáticas
As mensagens padrão (compra aprovada, cancelada, abandono de carrinho, reembolso, chargeback)
já vêm pré-configuradas com `{first_name}`. Editáveis direto no banco por enquanto — na Fase 2
eu coloco uma tela no painel pra editar isso visualmente.

## Comandos úteis

```bash
# ver logs
docker compose logs -f backend

# reiniciar tudo
docker compose restart

# atualizar depois de qualquer mudança de código
docker compose up -d --build
```

## Roadmap (próximas fases)
- Fase 2: tela de edição de templates + status/tags de conversa no painel
- Fase 3: distribuição automática de conversas entre atendentes
- Fase 4: respostas rápidas por idioma
- Fase 5: histórico/busca avançada + chatbot básico
