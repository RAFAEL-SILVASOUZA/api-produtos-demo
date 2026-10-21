require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const {
  handleValidationError,
  handleUnexpectedError
} = require('./middleware/errors');

const app = express();

app.use(express.json());

// Healthcheck público
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Documentação interativa (Swagger UI) e o JSON da spec
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/docs.json', (req, res) => res.json(swaggerSpec));

// Rotas públicas de autenticação
app.use('/auth', authRoutes);

// Rotas protegidas (autenticação aplicada dentro do próprio router)
app.use('/products', productRoutes);

// 404 para rotas inexistentes
app.use((req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.path} não encontrada.` });
});

// Tratadores de erro (validação zod + inesperados)
app.use(handleValidationError);
app.use(handleUnexpectedError);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});

module.exports = app;
