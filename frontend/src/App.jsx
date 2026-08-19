import { useEffect, useRef, useState } from "react";
import api, { authApi } from "./api";
import NewInstanceModal from "./components/NewInstanceModal.jsx";

const COUNTRY_FLAGS = {
  US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺", IE: "🇮🇪",
  PT: "🇵🇹", BR: "🇧🇷", FR: "🇫🇷", IT: "🇮🇹", ES: "🇪🇸", ID: "🇮🇩",
};

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

  if (!agent) return <LoginScreen onLogin={setAgent} />;

  return (
    <div className="app">
      <div className="instances-rail">
        {instances.map((inst) => (
          <div
            key={inst.id}
            className={`instance-icon ${activeInstance?.id === inst.id ? "active" : ""}`}
            title={`${inst.country} - ${inst.language} (${inst.status})`}
            onClick={() => selectInstance(inst)}
          >
            {inst.flag_emoji || COUNTRY_FLAGS[inst.country] || inst.country}
          </div>
        ))}
        <div className="instance-icon add" title="Nova instancia" onClick={() => setShowNewInstance(true)}>
          +
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
              <div className="avatar">{(c.contact_name || "?")[0].toUpperCase()}</div>
              <div className="conv-meta">
                <div className="conv-name">{c.contact_name || c.contact_jid}</div>
                <div className="conv-preview">{c.status}</div>
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
