const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');
const {
  createProductSchema,
  updateProductSchema,
  listQuerySchema,
  idParamSchema
} = require('../validators/productSchemas');
const { validate } = require('../validators/validate');

const router = express.Router();

// TODOS os endpoints de produtos exigem autenticação
router.use(authRequired);

function findProductOr404(id, res) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) {
    res.status(404).json({ error: `Produto ${id} não encontrado.` });
    return null;
  }
  return product;
}

// GET /products - lista paginada com filtros.
// Admin vê tudo; usuário comum vê apenas os próprios produtos.
/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: Lista produtos (paginada, com filtros)
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: [true, false] }
 *     responses:
 *       200: { description: Lista com meta de paginação }
 *       401: { description: Token ausente ou inválido }
 */
router.get('/', (req, res) => {
  const q = validate(listQuerySchema, req.query);

  const where = [];
  const params = [];

  if (req.user.role !== 'admin') {
    where.push('owner_id = ?');
    params.push(req.user.id);
  }
  if (q.search) {
    where.push('(name LIKE ? OR description LIKE ? OR sku LIKE ?)');
    const like = `%${q.search}%`;
    params.push(like, like, like);
  }
  if (q.category) {
    where.push('category = ?');
    params.push(q.category);
  }
  if (q.active) {
    where.push('active = ?');
    params.push(q.active === 'true' ? 1 : 0);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM products ${whereSql}`).get(...params).n;
  const offset = (q.page - 1) * q.limit;

  const items = db
    .prepare(`SELECT * FROM products ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, q.limit, offset);

  return res.json({
    data: items,
    meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) || 1 }
  });
});

// GET /products/:id - detalhe. Dono ou admin.
/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Detalhe do produto (dono ou admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Produto, content: { application/json: { schema: { $ref: '#/components/schemas/Product' } } } }
 *       401: { description: Token ausente ou inválido }
 *       403: { description: Sem acesso a este produto }
 *       404: { description: Produto não encontrado }
 */
router.get('/:id', (req, res) => {
  const { id } = validate(idParamSchema, req.params);
  const product = findProductOr404(id, res);
  if (!product) return undefined;

  if (req.user.role !== 'admin' && product.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Você não tem acesso a este produto.' });
  }
  return res.json(product);
});

// POST /products - cria produto vinculado ao usuário autenticado
/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Cria produto (dono = usuário autenticado)
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProductInput' }
 *     responses:
 *       201: { description: Produto criado, content: { application/json: { schema: { $ref: '#/components/schemas/Product' } } } }
 *       400: { description: Dados inválidos, content: { application/json: { schema: { $ref: '#/components/schemas/ValidationError' } } } }
 *       401: { description: Token ausente ou inválido }
 *       409: { description: SKU já existe }
 */
router.post('/', (req, res) => {
  const data = validate(createProductSchema, req.body);

  const exists = db.prepare('SELECT id FROM products WHERE sku = ?').get(data.sku);
  if (exists) {
    return res.status(409).json({ error: `SKU "${data.sku}" já existe.` });
  }

  const info = db
    .prepare(`INSERT INTO products (name, description, sku, price, quantity, category, active, owner_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      data.name,
      data.description,
      data.sku,
      data.price,
      data.quantity,
      data.category,
      data.active ? 1 : 0,
      req.user.id
    );

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json(product);
});

// PUT /products/:id - atualização parcial/total. Dono ou admin.
/**
 * @openapi
 * /products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Atualiza produto (dono ou admin; envio parcial permitido)
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProductInput' }
 *     responses:
 *       200: { description: Produto atualizado, content: { application/json: { schema: { $ref: '#/components/schemas/Product' } } } }
 *       400: { description: Dados inválidos }
 *       401: { description: Token ausente ou inválido }
 *       403: { description: Sem permissão para atualizar }
 *       404: { description: Produto não encontrado }
 *       409: { description: SKU já existe em outro produto }
 */
router.put('/:id', (req, res) => {
  const { id } = validate(idParamSchema, req.params);
  const data = validate(updateProductSchema, req.body);
  const product = findProductOr404(id, res);
  if (!product) return undefined;

  if (req.user.role !== 'admin' && product.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Você não pode atualizar este produto.' });
  }

  if (data.sku && data.sku !== product.sku) {
    const clash = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(data.sku, id);
    if (clash) {
      return res.status(409).json({ error: `SKU "${data.sku}" já existe em outro produto.` });
    }
  }

  const fields = [];
  const params = [];
  for (const [key, value] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    params.push(key === 'active' ? (value ? 1 : 0) : value);
  }
  fields.push(`updated_at = datetime('now')`);
  params.push(id);

  db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  return res.json(updated);
});

// DELETE /products/:id - apenas admin
/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Exclui produto (apenas admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       204: { description: Produto excluído }
 *       401: { description: Token ausente ou inválido }
 *       403: { description: Apenas admin pode excluir }
 *       404: { description: Produto não encontrado }
 */
router.delete('/:id', requireRole('admin'), (req, res) => {
  const { id } = validate(idParamSchema, req.params);
  const product = findProductOr404(id, res);
  if (!product) return undefined;

  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return res.status(204).send();
});

module.exports = router;
