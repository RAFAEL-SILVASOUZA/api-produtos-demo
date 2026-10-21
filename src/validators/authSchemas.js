const { z } = require('zod');

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Nome é obrigatório.' })
    .trim()
    .min(2, 'Nome deve ter ao menos 2 caracteres.')
    .max(80, 'Nome deve ter no máximo 80 caracteres.')
    .regex(/^[A-Za-zÀ-ÿ' -]+$/, 'Nome deve conter apenas letras.'),
  email: z
    .string({ required_error: 'E-mail é obrigatório.' })
    .trim()
    .toLowerCase()
    .email('E-mail inválido.'),
  password: z
    .string({ required_error: 'Senha é obrigatória.' })
    .min(6, 'Senha deve ter ao menos 6 caracteres.')
    .max(72, 'Senha deve ter no máximo 72 caracteres.'),
  // Papel opcional. Para testes locais é assim que se cria um admin.
  role: z.enum(['admin', 'user']).optional().default('user')
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'E-mail é obrigatório.' })
    .trim()
    .toLowerCase()
    .email('E-mail inválido.'),
  password: z
    .string({ required_error: 'Senha é obrigatória.' })
    .min(1, 'Senha é obrigatória.')
});

module.exports = { registerSchema, loginSchema };
