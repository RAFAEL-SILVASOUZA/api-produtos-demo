/**
 * Helper para validar a entrada com um schema zod.
 * Joga o erro adiante (virou 400 no middleware de erros) e devolve
 * os dados já parseados/coeridos.
 */
function validate(schema, source) {
  return schema.parse(source);
}

module.exports = { validate };
