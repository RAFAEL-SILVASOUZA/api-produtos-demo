const { z } = require('zod');

// Campos aceitos no CREATE
const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Nome do produto é obrigatório.' })
    .trim()
    .min(2, 'Nome deve ter ao menos 2 caracteres.')
    .max(120, 'Nome deve ter no máximo 120 caracteres.'),
  description: z
    .string()
    .trim()
    .max(500, 'Descrição deve ter no máximo 500 caracteres.')
    .optional()
    .nullable()
    .default(null),
  sku: z
    .string({ required_error: 'SKU é obrigatório.' })
    .trim()
    .min(3, 'SKU deve ter ao menos 3 caracteres.')
    .max(40, 'SKU deve ter no máximo 40 caracteres.')
    .regex(/^[A-Za-z0-9._-]+$/, 'SKU deve conter apenas letras, números, ponto, hífen ou underscore.'),
  price: z
    .number({
      required_error: 'Preço é obrigatório.',
      invalid_type_error: 'Preço deve ser um número.'
    })
    .positive('Preço deve ser maior que zero.')
    .max(1_000_000, 'Preço não pode passar de 1.000.000.'),
  quantity: z
    .number({ invalid_type_error: 'Quantidade deve ser um número.' })
    .int('Quantidade deve ser um número inteiro.')
    .min(0, 'Quantidade não pode ser negativa.')
    .optional()
    .default(0),
  category: z
    .string()
    .trim()
    .max(60, 'Categoria deve ter no máximo 60 caracteres.')
    .optional()
    .nullable()
    .default(null),
  active: z
    .boolean()
    .optional()
    .default(true)
});

// UPDATE: tudo opcional, mas ao menos um campo precisa vir
const updateProductSchema = createProductSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envie ao menos um campo para atualizar.'
  });

// Filtros da listagem (?page=&limit=&search=&category=&active=)
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  active: z.enum(['true', 'false']).optional()
});

// Parâmetro de rota (:id)
const idParamSchema = z.object({
  id: z.coerce.number().int().positive('id deve ser um inteiro positivo.')
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  listQuerySchema,
  idParamSchema
};
