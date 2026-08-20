import { useEffect, useState } from "react";
import api from "../api";

const EVENTS = [
  { key: "purchase_approved", label: "Compra aprovada", icon: "✅" },
  { key: "purchase_canceled", label: "Compra cancelada", icon: "🚫" },
  { key: "cart_abandoned", label: "Abandono de carrinho", icon: "🛒" },
  { key: "refund", label: "Reembolso", icon: "↩️" },
  { key: "chargeback", label: "Chargeback", icon: "⚠️" },
];

export default function AutomationsModal({ instances, onClose }) {
  const [platform, setPlatform] = useState("hotmart");
  const [selectedInstanceId, setSelectedInstanceId] = useState(instances[0]?.id || null);
  const [templates, setTemplates] = useState([]);
  const [webhookInfo, setWebhookInfo] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    api.get("/templates").then((r) => setTemplates(r.data));
    api.get("/webhook-info").then((r) => setWebhookInfo(r.data));
  }, []);

  const selectedInstance = instances.find((i) => i.id === selectedInstanceId);

  function templateFor(eventKey) {
    const specific = templates.find(
      (t) => t.platform === platform && t.event_type === eventKey && t.instance_id === selectedInstanceId
    );
    if (specific) return { ...specific, isCustom: true };
    const global = templates.find(
      (t) => t.platform === platform && t.event_type === eventKey && t.instance_id === null
    );
    return global ? { ...global, isCustom: false } : { message_body: "", active: true, isCustom: false };
  }

  function draftKey(eventKey) {
    return `${platform}:${eventKey}:${selectedInstanceId}`;
  }

  function getValue(eventKey) {
    const key = draftKey(eventKey);
    if (drafts[key] !== undefined) return drafts[key];
    return templateFor(eventKey).message_body;
  }

  function setValue(eventKey, value) {
    setDrafts((prev) => ({ ...prev, [draftKey(eventKey)]: value }));
  }

  async function saveForInstance(eventKey) {
    setSaving(eventKey);
    const { data } = await api.post("/templates/upsert", {
      platform,
      event_type: eventKey,
      instance_id: selectedInstanceId,
      message_body: getValue(eventKey),
      active: true,
    });
    setTemplates((prev) => {
      const others = prev.filter((t) => !(t.platform === platform && t.event_type === eventKey && t.instance_id === selectedInstanceId));
      return [...others, data];
    });
    setSaving(null);
  }

  async function resetToDefault(eventKey) {
    await api.delete("/templates/instance-override", {
      data: { platform, event_type: eventKey, instance_id: selectedInstanceId },
    });
    setTemplates((prev) => prev.filter((t) => !(t.platform === platform && t.event_type === eventKey && t.instance_id === selectedInstanceId)));
    setDrafts((prev) => {
      const copy = { ...prev };
      delete copy[draftKey(eventKey)];
      return copy;
    });
  }

  const webhookUrl = selectedInstanceId
    ? `${window.location.origin}/webhooks/${platform}?token=${webhookInfo?.[`${platform}Token`] || "..."}&instance_id=${selectedInstanceId}`
    : "";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="automations-panel" onClick={(e) => e.stopPropagation()}>
        <div className="automations-header">
          <div>
            <h2>Automações de compra</h2>
            <p className="status-text">Cada instância (idioma) tem suas próprias mensagens automáticas</p>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="automations-body">
          <div className="automations-sidebar">
            <p className="automations-section-label">Instância</p>
            {instances.map((inst) => (
              <div
                key={inst.id}
                className={`automations-instance-item ${selectedInstanceId === inst.id ? "active" : ""}`}
                onClick={() => setSelectedInstanceId(inst.id)}
              >
                <span className="automations-flag">{inst.flag_emoji}</span>
                <div>
                  <div className="automations-instance-name">{inst.country}</div>
                  <div className="automations-instance-lang">{inst.language}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="automations-content">
            {!selectedInstance ? (
              <div className="chat-empty">Crie uma instância primeiro</div>
            ) : (
              <>
                <div className="automations-tabs">
                  {["hotmart", "kiwify"].map((p) => (
                    <button
                      key={p}
                      className={`automations-tab ${platform === p ? "active" : ""}`}
                      onClick={() => setPlatform(p)}
                    >
                      {p === "hotmart" ? "Hotmart" : "Kiwify"}
                    </button>
                  ))}
                </div>

                <div className="webhook-url-card">
                  <p className="status-text" style={{ marginBottom: 6 }}>
                    URL de webhook para <strong>{selectedInstance.country} · {selectedInstance.language}</strong> nesta plataforma:
                  </p>
                  <div className="webhook-url-row">
                    <code>{webhookUrl}</code>
                    <button className="btn-icon" onClick={() => navigator.clipboard.writeText(webhookUrl)} title="Copiar">📋</button>
                  </div>
                </div>

                {EVENTS.map((ev) => {
                  const t = templateFor(ev.key);
                  return (
                    <div key={ev.key} className="automation-event-card">
                      <div className="automation-event-header">
                        <span>{ev.icon} <strong>{ev.label}</strong></span>
                        {t.isCustom ? (
                          <span className="badge-custom">personalizado para {selectedInstance.language}</span>
                        ) : (
                          <span className="badge-default">usando padrão global</span>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        value={getValue(ev.key)}
                        onChange={(e) => setValue(ev.key, e.target.value)}
                      />
                      <div className="automation-event-actions">
                        <span className="status-text">Use {"{first_name}"} para o nome do cliente</span>
                        <div style={{ display: "flex", gap: 8 }}>
                          {t.isCustom && (
                            <button className="btn-secondary" onClick={() => resetToDefault(ev.key)}>
                              Usar padrão
                            </button>
                          )}
                          <button className="btn-primary" onClick={() => saveForInstance(ev.key)} disabled={saving === ev.key}>
                            {saving === ev.key ? "Salvando..." : `Salvar para ${selectedInstance.language}`}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
