import { WebSocketServer } from "ws";

let wss;

export function initWs(server) {
  wss = new WebSocketServer({ server, path: "/ws" });
}

export function broadcast(payload) {
  if (!wss) return;
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(data);
  });
}
