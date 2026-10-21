const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { registerSchema, loginSchema } = require('../validators/authSchemas');
const { validate } = require('../validators/validate');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

// POST /auth/register - cadastro de usuário (público)
/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Cadastro de usuário (público)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterInput' }
 *     responses:
 *       201: { description: Usuário criado }
 *       400: { description: Dados inválidos, content: { application/json: { schema: { $ref: '#/components/schemas/ValidationError' } } } }
 *       409: { description: E-mail já cadastrado }
 */
router.post('/register', (req, res) => {
  const data = validate(registerSchema, req.body);

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
  if (exists) {
    return res.status(409).json({ error: 'E-mail já cadastrado.' });
  }

  const hash = bcrypt.hashSync(data.password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
    .run(data.name, data.email, hash, data.role);

  const user = {
    id: info.lastInsertRowid,
    name: data.name,
    email: data.email,
    role: data.role
  };

  return res.status(201).json({ message: 'Usuário criado com sucesso.', user });
});

// POST /auth/login - retorna o BIA token (JWT)
/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login, retorna accessToken JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Credentials' }
 *     responses:
 *       200: { description: Token emitido, content: { application/json: { schema: { $ref: '#/components/schemas/LoginResponse' } } } }
 *       400: { description: Dados inválidos }
 *       401: { description: Credenciais inválidas }
 */
router.post('/login', (req, res) => {
  const data = validate(loginSchema, req.body);

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email);

  // Mensagem genérica de propósito: não revelar se o e-mail existe
  if (!user || !bcrypt.compareSync(data.password, user.password)) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const token = signToken(user);

  return res.json({
    tokenType: 'Bearer',
    accessToken: token,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

module.exports = router;
