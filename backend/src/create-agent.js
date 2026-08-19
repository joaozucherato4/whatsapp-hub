import "dotenv/config";
import { createAgent } from "./auth.js";

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.log("Uso: node src/create-agent.js \"Nome\" email@x.com senha123");
  process.exit(1);
}

createAgent(name, email, password)
  .then((agent) => {
    console.log("Atendente criado:", agent);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Erro:", err.message);
    process.exit(1);
  });
