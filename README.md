# API Biblioteca

API simples de livros feita com **Express**, rodando no **Cloudflare Workers** com banco **Cloudflare D1**. Projeto para prática em sala de aula.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `src/index.js` | A API (todas as rotas) |
| `migrations/0001_create_livros.sql` | Cria a tabela `livros` |
| `wrangler.jsonc` | Configuração do Worker e do banco |
| `package.json` | Dependências e comandos |

## Endpoints

| Método | Rota | O que faz |
|---|---|---|
| GET | `/health` | Verifica se a API está no ar |
| GET | `/api/livros` | Lista os livros |
| GET | `/api/livros/:id` | Busca um livro |
| POST | `/api/livros` | Cadastra um livro |
| PUT | `/api/livros/:id` | Atualiza um livro |
| DELETE | `/api/livros/:id` | Exclui um livro |

## 1. Rodar no seu computador

Pré-requisito: [Node.js](https://nodejs.org/) 20 ou mais recente.

```bash
npm install
npm run db:migrate:local   # cria a tabela no banco local
npm run dev                # API em http://localhost:8787
```

Testando:

```bash
# Cadastrar
curl -X POST http://localhost:8787/api/livros \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Dom Casmurro","autor":"Machado de Assis","ano":1899}'

# Listar
curl http://localhost:8787/api/livros

# Buscar
curl http://localhost:8787/api/livros/1

# Atualizar
curl -X PUT http://localhost:8787/api/livros/1 \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Dom Casmurro","autor":"Machado de Assis","ano":1900}'

# Excluir
curl -X DELETE http://localhost:8787/api/livros/1
```

## 2. Publicar na Cloudflare

Você precisa de uma conta gratuita em https://dash.cloudflare.com/sign-up.

**Passo 1 — Fazer login** (abre o navegador para autorizar):

```bash
npx wrangler login
```

**Passo 2 — Criar o banco D1 na nuvem:**

```bash
npx wrangler d1 create biblioteca-db
```

O comando mostra um `database_id`. Copie esse valor e cole no `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "biblioteca-db",
    "database_id": "cole-aqui-o-id-que-apareceu"
  }
]
```

**Passo 3 — Criar a tabela no banco da nuvem:**

```bash
npm run db:migrate:remote
```

**Passo 4 — Publicar a API:**

```bash
npm run deploy
```

No final aparece a URL pública, algo como:

```
https://api-biblioteca.SEU-USUARIO.workers.dev
```

Teste no navegador: `https://api-biblioteca.SEU-USUARIO.workers.dev/api/livros`

## Como funciona o Express no Workers?

O Cloudflare Workers não roda um servidor Node.js comum. Por isso o `src/index.js` usa o `httpServerHandler` (do módulo `cloudflare:node`), que entrega as requisições ao Express. A flag `nodejs_compat` no `wrangler.jsonc` habilita as APIs do Node que o Express precisa.
