import { useEffect, useRef, useState } from "react";
import api, { authApi } from "./api";
import NewInstanceModal from "./components/NewInstanceModal.jsx";
import AutomationsModal from "./components/AutomationsModal.jsx";

const COUNTRY_FLAGS = {
  US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺", IE: "🇮🇪",
  PT: "🇵🇹", BR: "🇧🇷", FR: "🇫🇷", IT: "🇮🇹", ES: "🇪🇸", ID: "🇮🇩",
};

function displayName(conv) {
  if (conv.contact_name && conv.contact_name !== conv.contact_jid) return conv.contact_name;
  if (conv.contact_jid?.includes("@lid")) return "Contato (WhatsApp)";
  const digits = conv.contact_jid?.split("@")[0] || "";
  return digits.length >= 8 ? `+${digits}` : conv.contact_jid;
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      const { data } = await authApi.post("/login", { email, password });
      localStorage.setItem("token", data.token);
      onLogin(data.agent);
    } catch {
      setError("Email ou senha invalidos");
    }
  }

  return (
    <div className="login-screen">
      <form className="login-box" onSubmit={submit}>
        <h1>BotyZap</h1>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p style={{ color: "#e0a458", marginBottom: 10 }}>{error}</p>}
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}

export default function App() {
  const [agent, setAgent] = useState(null);
  const [instances, setInstances] = useState([]);
  const [activeInstance, setActiveInstance] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showNewInstance, setShowNewInstance] = useState(false);
  const [showAutomations, setShowAutomations] = useState(false);
  const [draft, setDraft] = useState("");
  const wsRef = useRef(null);

  useEffect(() => {
    if (localStorage.getItem("token")) setAgent({});
  }, []);

  useEffect(() => {
    if (!agent) return;
    loadInstances();
    const ws = new WebSocket(`wss://${window.location.host}/ws`);
    ws.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      if (payload.type === "new_message") {
        setMessages((prev) =>
          payload.conversationId === activeConv?.id ? [...prev, payload.message] : prev
        );
        loadConversations(activeInstance?.id);
      }
    };
    wsRef.current = ws;
    return () => ws.close();
    // eslint-disable-next-line
  }, [agent]);

  async function loadInstances() {
    const { data } = await api.get("/instances");
    setInstances(data);
    if (!activeInstance && data.length) selectInstance(data[0]);
  }

  async function loadConversations(instanceId) {
    if (!instanceId) return;
    const { data } = await api.get("/conversations", { params: { instance_id: instanceId } });
    setConversations(data);
  }

  function selectInstance(inst) {
    setActiveInstance(inst);
    setActiveConv(null);
    setMessages([]);
    loadConversations(inst.id);
  }

  async function openConversation(conv) {
    setActiveConv(conv);
    const { data } = await api.get(`/conversations/${conv.id}/messages`);
    setMessages(data);
  }

  async function sendMessage() {
    if (!draft.trim() || !activeConv) return;
    const { data } = await api.post(`/conversations/${activeConv.id}/messages`, { body: draft });
    setMessages((prev) => [...prev, data]);
    setDraft("");
  }

  async function deleteInstance(inst, e) {
    e.stopPropagation();
    const ok = window.confirm(`Excluir a instância ${inst.country} · ${inst.language}? Isso desconecta o WhatsApp e apaga as conversas dela.`);
    if (!ok) return;
    await api.delete(`/instances/${inst.id}`);
    if (activeInstance?.id === inst.id) {
      setActiveInstance(null);
      setConversations([]);
      setActiveConv(null);
    }
    loadInstances();
  }

  if (!agent) return <LoginScreen onLogin={setAgent} />;

  return (
    <div className="app">
      <div className="instances-rail">
        {instances.map((inst) => (
          <div
            key={inst.id}
            className={`instance-icon ${activeInstance?.id === inst.id ? "active" : ""}`}
            title={`${inst.country} - ${inst.language} (id: ${inst.id}, ${inst.status})`}
            onClick={() => selectInstance(inst)}
            style={{ position: "relative" }}
          >
            {inst.flag_emoji || COUNTRY_FLAGS[inst.country] || inst.country}
            <span
              onClick={(e) => deleteInstance(inst, e)}
              title="Excluir instância"
              style={{
                position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: "50%",
                background: "#e0555a", color: "white", fontSize: 11, display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
                border: "2px solid var(--bg-deep)", fontWeight: 700, opacity: 0.9,
              }}
            >
              ×
            </span>
          </div>
        ))}
        <div className="instance-icon add" title="Nova instancia" onClick={() => setShowNewInstance(true)}>
          +
        </div>
        <div className="instance-icon" title="Automações desta instância" onClick={() => activeInstance ? setShowAutomations(true) : alert("Selecione uma instância primeiro")} style={{ marginTop: "auto", marginBottom: 12 }}>
          ⚙
        </div>
      </div>

      <div className="sidebar">
        <div className="sidebar-header">
          <span>{activeInstance ? `${activeInstance.country} · ${activeInstance.language}` : "Selecione uma instancia"}</span>
        </div>
        <div className="conv-list">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`conv-item ${activeConv?.id === c.id ? "active" : ""}`}
              onClick={() => openConversation(c)}
            >
              <div className="avatar">{displayName(c)[0].toUpperCase()}</div>
              <div className="conv-meta">
                <div className="conv-name">{displayName(c)}</div>
                <div className="conv-preview">{c.last_message_preview || "Sem mensagens"}</div>
              </div>
              <span className={`conv-status ${c.status}`}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-area">
        {activeConv ? (
          <>
            <div className="chat-header">
              <strong>{activeConv.contact_name || activeConv.contact_jid}</strong>
            </div>
            <div className="messages">
              {messages.map((m) => (
                <div key={m.id} className={`bubble ${m.direction === "out" ? "out" : "in"}`}>
                  {m.body}
                </div>
              ))}
            </div>
            <div className="composer">
              <input
                placeholder="Digite uma mensagem"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button onClick={sendMessage}>Enviar</button>
            </div>
          </>
        ) : (
          <div className="chat-empty">Selecione uma conversa para comecar</div>
        )}
      </div>

      {showAutomations && activeInstance && (
        <AutomationsModal instance={activeInstance} onClose={() => setShowAutomations(false)} />
      )}

      {showNewInstance && (
        <NewInstanceModal
          onClose={() => setShowNewInstance(false)}
          onCreated={() => {
            setShowNewInstance(false);
            loadInstances();
          }}
        />
      )}
    </div>
  );
}
