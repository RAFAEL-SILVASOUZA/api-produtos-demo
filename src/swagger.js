const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'API de Produtos (experimental)',
      version: '1.0.0',
      description:
        'CRUD de produtos com autenticação JWT e SQLite. ' +
        'Fluxo: POST /auth/login (ou /auth/register) -> copie o accessToken -> ' +
        'clique em Authorize e cole o token. Todos os endpoints de /products exigem o token.'
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 3000}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Credentials: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'admin@test.com' },
            password: { type: 'string', example: 'admin123' }
          }
        },
        RegisterInput: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Novo Usuario' },
            email: { type: 'string', example: 'novo@test.com' },
            password: { type: 'string', minLength: 6, example: 'senha123' },
            role: { type: 'string', enum: ['admin', 'user'], default: 'user' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            tokenType: { type: 'string', example: 'Bearer' },
            accessToken: { type: 'string' },
            expiresIn: { type: 'string', example: '1h' },
            user: { type: 'object' }
          }
        },
        ProductInput: {
          type: 'object',
          required: ['name', 'sku', 'price'],
          properties: {
            name: { type: 'string', example: 'Teclado Mecanico' },
            description: { type: 'string', nullable: true, example: 'RGB' },
            sku: { type: 'string', example: 'TEC-001' },
            price: { type: 'number', example: 199.9 },
            quantity: { type: 'integer', minimum: 0, default: 0 },
            category: { type: 'string', nullable: true, example: 'perifericos' },
            active: { type: 'boolean', default: true }
          }
        },
        Product: {
          allOf: [
            { $ref: '#/components/schemas/ProductInput' },
            {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                owner_id: { type: 'integer' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' }
              }
            }
          ]
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } }
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  campo: { type: 'string' },
                  mensagem: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

module.exports = swaggerJsdoc(options);
