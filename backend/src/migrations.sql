CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS instances (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,                -- nome interno na Evolution API
    country TEXT NOT NULL,             -- ex: "US", "PT", "ID"
    language TEXT NOT NULL,            -- ex: "en", "pt-PT", "id"
    flag_emoji TEXT,
    phone_number TEXT,
    status TEXT DEFAULT 'disconnected', -- disconnected | connecting | connected
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER REFERENCES instances(id) ON DELETE CASCADE,
    contact_jid TEXT NOT NULL,         -- numero@s.whatsapp.net
    contact_name TEXT,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'open',        -- open | pending | resolved
    assigned_agent_id INTEGER REFERENCES agents(id),
    UNIQUE(instance_id, contact_jid)
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL,           -- in | out
    body TEXT,
    sent_by_agent_id INTEGER REFERENCES agents(id),
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Templates de mensagem por evento de plataforma de pagamento (Hotmart/Kiwify)
CREATE TABLE IF NOT EXISTS event_templates (
    id SERIAL PRIMARY KEY,
    platform TEXT NOT NULL,            -- hotmart | kiwify
    event_type TEXT NOT NULL,          -- purchase_approved | purchase_canceled | cart_abandoned | refund | chargeback
    instance_id INTEGER REFERENCES instances(id) ON DELETE SET NULL,
    message_body TEXT NOT NULL,        -- pode conter {first_name}, {product_name}
    active BOOLEAN DEFAULT true,
    UNIQUE(platform, event_type, instance_id)
);

CREATE TABLE IF NOT EXISTS webhook_events_log (
    id SERIAL PRIMARY KEY,
    platform TEXT NOT NULL,
    event_type TEXT,
    payload JSONB,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO event_templates (platform, event_type, message_body) VALUES
('hotmart', 'purchase_approved', 'Oi {first_name}! Sua compra foi aprovada com sucesso. Seja bem-vindo(a)! Qualquer duvida estamos por aqui.'),
('hotmart', 'purchase_canceled', 'Oi {first_name}, notamos que sua compra foi cancelada. Podemos te ajudar com alguma coisa?'),
('hotmart', 'cart_abandoned', 'Oi {first_name}! Vi que voce nao finalizou sua compra. Posso te ajudar a concluir?'),
('hotmart', 'refund', 'Oi {first_name}, confirmamos o reembolso da sua compra. Se mudar de ideia, estamos aqui.'),
('hotmart', 'chargeback', 'Oi {first_name}, identificamos um chargeback na sua compra. Podemos conversar sobre isso?'),
('kiwify', 'purchase_approved', 'Oi {first_name}! Sua compra foi aprovada com sucesso. Seja bem-vindo(a)!'),
('kiwify', 'purchase_canceled', 'Oi {first_name}, sua compra foi cancelada. Podemos te ajudar?'),
('kiwify', 'cart_abandoned', 'Oi {first_name}! Voce deixou o carrinho pela metade, posso te ajudar a finalizar?'),
('kiwify', 'refund', 'Oi {first_name}, seu reembolso foi confirmado.'),
('kiwify', 'chargeback', 'Oi {first_name}, identificamos um chargeback na sua compra. Podemos conversar?')
ON CONFLICT DO NOTHING;
