import { useEffect, useState } from "react";
import api from "../api";

const EVENT_LABELS = {
  purchase_approved: "Compra aprovada",
  purchase_canceled: "Compra cancelada",
  cart_abandoned: "Abandono de carrinho",
  refund: "Reembolso",
  chargeback: "Chargeback",
};

export default function AutomationsModal({ instances, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [webhookInfo, setWebhookInfo] = useState(null);
  const [platformTab, setPlatformTab] = useState("hotmart");
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    api.get("/templates").then((r) => setTemplates(r.data));
    api.get("/webhook-info").then((r) => setWebhookInfo(r.data));
  }, []);

  function updateLocal(id, field, value) {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }

  async function save(t) {
    setSaving(t.id);
    await api.patch(`/templates/${t.id}`, {
      message_body: t.message_body,
      active: t.active,
      instance_id: t.instance_id || null,
    });
    setSaving(null);
  }

  const webhookUrl = (platform) =>
    `${window.location.origin}/webhooks/${platform}?token=${webhookInfo?.[`${platform}Token`] || "..."}&instance_id=SEU_INSTANCE_ID`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 640, maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h2>Automações de compra (Hotmart / Kiwify)</h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["hotmart", "kiwify"].map((p) => (
            <button
              key={p}
              className={platformTab === p ? "btn-primary" : "btn-secondary"}
              onClick={() => setPlatformTab(p)}
              style={{ textTransform: "capitalize" }}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={{ background: "#111b21", padding: 12, borderRadius: 8, marginBottom: 20 }}>
          <p className="status-text" style={{ marginBottom: 6 }}>
            Cole esta URL no painel de webhooks do {platformTab} (troque SEU_INSTANCE_ID pelo ID da instância — veja passando o mouse sobre a bandeira na barra lateral):
          </p>
          <code style={{ color: "#00a884", fontSize: 12, wordBreak: "break-all" }}>{webhookUrl(platformTab)}</code>
        </div>

        {templates
          .filter((t) => t.platform === platformTab)
          .map((t) => (
            <div key={t.id} style={{ marginBottom: 18, borderBottom: "1px solid #2a3942", paddingBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <strong>{EVENT_LABELS[t.event_type] || t.event_type}</strong>
                <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={t.active}
                    onChange={(e) => updateLocal(t.id, "active", e.target.checked)}
                  />
                  ativo
                </label>
              </div>

              <select
                value={t.instance_id || ""}
                onChange={(e) => updateLocal(t.id, "instance_id", e.target.value ? Number(e.target.value) : null)}
                style={{ marginBottom: 6 }}
              >
                <option value="">Todas as instâncias (padrão)</option>
                {instances.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.country} · {i.language} (id: {i.id})
                  </option>
                ))}
              </select>

              <textarea
                value={t.message_body}
                onChange={(e) => updateLocal(t.id, "message_body", e.target.value)}
                rows={3}
                style={{ width: "100%", padding: 10, borderRadius: 6, border: "none", background: "#2a3942", color: "#e9edef", resize: "vertical" }}
              />
              <p className="status-text" style={{ marginTop: 4 }}>Use {"{first_name}"} para inserir o primeiro nome do cliente.</p>

              <button className="btn-primary" style={{ marginTop: 6 }} onClick={() => save(t)} disabled={saving === t.id}>
                {saving === t.id ? "Salvando..." : "Salvar"}
              </button>
            </div>
          ))}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
