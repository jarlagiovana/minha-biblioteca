import { env } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";
import express from "express";
import cors from "cors";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// Serve os arquivos estáticos da pasta "public" na raiz do site
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "public")));

// --- ROTAS DA API ---

app.get("/health", (req, res) => {
  res.json({ status: "API-Jarla" });
});

// Rate limit: no máximo 3 requisições por minuto para cada IP.
// O limite fica configurado no wrangler.jsonc (binding RATE_LIMITER).
app.use(async (req, res, next) => {
  const ip = req.get("cf-connecting-ip") ?? "desconhecido";
  const { success } = await env.RATE_LIMITER.limit({ key: ip });
  if (!success) {
    res.set("Retry-After", "60");
    return res
      .status(429)
      .json({ erro: "Muitas requisições. Tente novamente em 1 minuto." });
  }
  next();
});

app.get("/api/livros", async (req, res) => {
  const { results } = await env.DB.prepare("SELECT * FROM livros").all();
  res.json(results);
});

app.get("/api/livros/:id", async (req, res) => {
  const livro = await env.DB.prepare("SELECT * FROM livros WHERE id = ?")
    .bind(req.params.id)
    .first();

  if (!livro) return res.status(404).json({ erro: "Livro não encontrado" });
  res.json(livro);
});

app.post("/api/livros", async (req, res) => {
  const { titulo, autor, ano } = req.body ?? {};
  if (!titulo || !autor) {
    return res.status(400).json({ erro: "titulo e autor são obrigatórios" });
  }

  const livro = await env.DB.prepare(
    "INSERT INTO livros (titulo, autor, ano) VALUES (?, ?, ?) RETURNING *"
  )
    .bind(titulo, autor, ano ?? null)
    .first();

  res.status(201).json(livro);
});

app.put("/api/livros/:id", async (req, res) => {
  const { titulo, autor, ano } = req.body ?? {};
  if (!titulo || !autor) {
    return res.status(400).json({ erro: "titulo e autor são obrigatórios" });
  }

  const livro = await env.DB.prepare(
    "UPDATE livros SET titulo = ?, autor = ?, ano = ? WHERE id = ? RETURNING *"
  )
    .bind(titulo, autor, ano ?? null, req.params.id)
    .first();

  if (!livro) return res.status(404).json({ erro: "Livro não encontrado" });
  res.json(livro);
});

app.delete("/api/livros/:id", async (req, res) => {
  const resultado = await env.DB.prepare("DELETE FROM livros WHERE id = ?")
    .bind(req.params.id)
    .run();

  if (resultado.meta.changes === 0) {
    return res.status(404).json({ erro: "Livro não encontrado" });
  }
  res.json({ mensagem: "Livro excluído" });
});

// Tratamento de erros
app.use((erro, req, res, next) => {
  if (erro.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "JSON inválido" });
  }
  console.error(erro);
  res.status(500).json({ erro: "Erro interno do servidor" });
});

app.listen(3000);
export default httpServerHandler({ port: 3000 });