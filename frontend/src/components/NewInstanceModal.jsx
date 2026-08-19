import { useEffect, useRef, useState } from "react";
import api from "../api";

const COUNTRIES = [
  { code: "US", label: "🇺🇸 Estados Unidos", lang: "en" },
  { code: "GB", label: "🇬🇧 Reino Unido", lang: "en" },
  { code: "CA", label: "🇨🇦 Canada", lang: "en" },
  { code: "AU", label: "🇦🇺 Australia", lang: "en" },
  { code: "IE", label: "🇮🇪 Irlanda", lang: "en" },
  { code: "PT", label: "🇵🇹 Portugal", lang: "pt-PT" },
  { code: "BR", label: "🇧🇷 Brasil", lang: "pt-BR" },
  { code: "FR", label: "🇫🇷 Franca", lang: "fr" },
  { code: "IT", label: "🇮🇹 Italia", lang: "it" },
  { code: "ES", label: "🇪🇸 Espanha / LATAM", lang: "es" },
  { code: "ID", label: "🇮🇩 Indonesia", lang: "id" },
];

export default function NewInstanceModal({ onClose, onCreated }) {
  const [country, setCountry] = useState(COUNTRIES[0].code);
  const [language, setLanguage] = useState(COUNTRIES[0].lang);
  const [step, setStep] = useState("form"); // form | qrcode | connected
  const [instance, setInstance] = useState(null);
  const [qr, setQr] = useState(null);
  const pollRef = useRef(null);

  function handleCountryChange(code) {
    setCountry(code);
    const c = COUNTRIES.find((c) => c.code === code);
    setLanguage(c.lang);
  }

  async function createInstance() {
    const c = COUNTRIES.find((c) => c.code === country);
    const { data } = await api.post("/instances", { country, language, flag_emoji: c.label.split(" ")[0] });
    setInstance(data);
    const { data: qrData } = await api.get(`/instances/${data.id}/qrcode`);
    setQr(qrData.base64 || qrData.qrcode?.base64);
    setStep("qrcode");
    pollRef.current = setInterval(async () => {
      const { data: statusData } = await api.get(`/instances/${data.id}/status`);
      if (statusData.status === "connected") {
        clearInterval(pollRef.current);
        setStep("connected");
      }
    }, 3000);
  }

  useEffect(() => () => clearInterval(pollRef.current), []);

  return (
    <div className="modal-overlay">
      <div className="modal">
        {step === "form" && (
          <>
            <h2>Nova instancia de WhatsApp</h2>
            <label>Pais</label>
            <select value={country} onChange={(e) => handleCountryChange(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <label>Idioma</label>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>Cancelar</button>
              <button className="btn-primary" onClick={createInstance}>Criar e conectar</button>
            </div>
          </>
        )}

        {step === "qrcode" && (
          <div className="qr-box">
            <h2>Escaneie o QR Code</h2>
            {qr ? <img src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`} alt="QR Code" /> : <p>Gerando QR Code...</p>}
            <p className="status-text">Abra o WhatsApp no celular deste pais → Aparelhos conectados → Conectar aparelho</p>
            <button className="btn-secondary" onClick={onClose}>Fechar</button>
          </div>
        )}

        {step === "connected" && (
          <div className="qr-box">
            <h2>✅ Conectado!</h2>
            <button className="btn-primary" onClick={onCreated}>Concluir</button>
          </div>
        )}
      </div>
    </div>
  );
}
