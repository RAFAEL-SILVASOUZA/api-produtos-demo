# API de Produtos (experimental)

API CRUD de produtos com autenticação JWT e SQLite. Feita para testes locais.

## Rodar

```bash
npm install
npm run seed     # cria admin@test.com / user@test.com (opcional)
npm run dev      # ou npm start
```

Servidor em `http://localhost:3000`. Banco criado em `./data.db`.

## Swagger

- UI interativa: `http://localhost:3000/docs`
- Spec OpenAPI 3.0: `http://localhost:3000/docs.json`

Na UI: faça login em `/auth/login`, copie o `accessToken`, clique em **Authorize** e cole o token para testar os endpoints de `/products`.

## Testes

```bash
powershell -File test-api.ps1   # 22 testes end-to-end (auth, CRUD, autorização, swagger)
```

## Autenticação

| Método | Rota | Acesso |
|---|---|---|
| POST | `/auth/register` | público |
| POST | `/auth/login` | público, retorna `accessToken` (JWT) |

Envie o token nos demais endpoints: `Authorization: Bearer <token>`.

## Produtos (todos exigem token)

| Método | Rota | Quem pode |
|---|---|---|
| GET | `/products` | admin vê tudo, user vê os próprios |
| GET | `/products/:id` | dono ou admin |
| POST | `/products` | qualquer autenticado (vira dono) |
| PUT | `/products/:id` | dono ou admin |
| DELETE | `/products/:id` | apenas admin |

Filtros da listagem: `?page=1&limit=20&search=...&category=...&active=true|false`

## Papéis

- `admin`: acesso total, único que pode excluir.
- `user`: CRUD nos próprios produtos (exceto delete).

Para criar um admin no cadastro, envie `"role": "admin"` no register.

## Exemplo

```bash
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@test.com\",\"password\":\"admin123\"}"

curl -X POST http://localhost:3000/products -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"name\":\"Teclado\",\"sku\":\"TEC-001\",\"price\":199.9,\"quantity\":10,\"category\":\"perifericos\"}"
```
