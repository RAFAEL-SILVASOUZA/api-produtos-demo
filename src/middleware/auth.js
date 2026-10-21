const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação: exige um header
 * `Authorization: Bearer <token>` válido.
 * Em caso de sucesso popula `req.user = { id, email, role }`.
 */
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: 'Token ausente. Envie o header "Authorization: Bearer <token>".'
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Token expirado. Faça login novamente.'
      : 'Token inválido.';
    return res.status(401).json({ error: msg });
  }
}

/**
 * Middleware de autorização: restringe o endpoint a determinados papéis.
 * Uso: router.delete('/products/:id', authRequired, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acesso negado. Papéis permitidos: ${roles.join(', ')}.`
      });
    }
    return next();
  };
}

module.exports = { authRequired, requireRole };
