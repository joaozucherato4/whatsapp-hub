import axios from "axios";

const client = axios.create({
  baseURL: process.env.EVOLUTION_URL,
  headers: { apikey: process.env.EVOLUTION_API_KEY },
});

export async function createInstance(instanceName) {
  const { data } = await client.post("/instance/create", {
    instanceName,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
  });
  return data;
}

export async function getQrCode(instanceName) {
  const { data } = await client.get(`/instance/connect/${instanceName}`);
  return data; // contains base64 QR
}

export async function getInstanceStatus(instanceName) {
  const { data } = await client.get(`/instance/connectionState/${instanceName}`);
  return data;
}

export async function deleteInstance(instanceName) {
  await client.delete(`/instance/delete/${instanceName}`);
}

export async function sendText(instanceName, jid, text) {
  const { data } = await client.post(`/message/sendText/${instanceName}`, {
    number: jid,
    text,
  });
  return data;
}
