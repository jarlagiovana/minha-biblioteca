// API simples de biblioteca: Express rodando no Cloudflare Workers com banco D1.
import { env } from "cloudflare:workers"; // dá acesso ao banco D1 (env.DB)
import { httpServerHandler } from "cloudflare:node"; // conecta o Express ao Workers
import express from "express";

const app = express();
app.use(express.json());

// Verifica se a API está no ar
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Lista todos os livros
app.get("/api/livros", async (req, res) => {
  const { results } = await env.DB.prepare("SELECT * FROM livros").all();
  res.json(results);
});

// Busca um livro pelo id
app.get("/api/livros/:id", async (req, res) => {
  const livro = await env.DB.prepare("SELECT * FROM livros WHERE id = ?")
    .bind(req.params.id)
    .first();

  if (!livro) return res.status(404).json({ erro: "Livro não encontrado" });
  res.json(livro);
});

// Cadastra um livro
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

// Atualiza um livro
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

// Exclui um livro
app.delete("/api/livros/:id", async (req, res) => {
  const resultado = await env.DB.prepare("DELETE FROM livros WHERE id = ?")
    .bind(req.params.id)
    .run();

  if (resultado.meta.changes === 0) {
    return res.status(404).json({ erro: "Livro não encontrado" });
  }
  res.json({ mensagem: "Livro excluído" });
});

// Qualquer erro inesperado cai aqui
app.use((erro, req, res, next) => {
  if (erro.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "JSON inválido" });
  }
  console.error(erro);
  res.status(500).json({ erro: "Erro interno do servidor" });
});

// No Workers não existe servidor real: o httpServerHandler entrega as
// requisições ao Express que "escuta" nesta porta.
app.listen(3000);
export default httpServerHandler({ port: 3000 });
