// Erros de validação viram 400 com lista de problemas
function handleValidationError(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err && typeof err.issues === 'object' && Array.isArray(err.issues)) {
    return res.status(400).json({
      error: 'Dados inválidos.',
      details: err.issues.map((i) => ({
        campo: i.path.join('.') || '(body)',
        mensagem: i.message
      }))
    });
  }
  return next(err);
}

// Erro inesperado -> 500 genérico (sem vazar stack no ambiente local)
function handleUnexpectedError(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[erro não tratado]', err);
  return res.status(500).json({ error: 'Erro interno do servidor.' });
}

module.exports = { handleValidationError, handleUnexpectedError };
