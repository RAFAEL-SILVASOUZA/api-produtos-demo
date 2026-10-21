require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

function upsert(email, name, password, role) {
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) {
    console.log(`usuário já existe: ${email}`);
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
    name,
    email,
    hash,
    role
  );
  console.log(`criado: ${email} (${role}) senha: ${password}`);
}

upsert('admin@test.com', 'Admin', 'admin123', 'admin');
upsert('user@test.com', 'Usuario Comum', 'user123', 'user');
