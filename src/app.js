const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const rutas = require('./routes');
const especificacion = require('./docs');
const { noEncontrado, manejarErrores } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Documentación interactiva de la API (OpenAPI 3.0.3 + Swagger UI).
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(especificacion, {
  customSiteTitle: 'Puesto de Chance API - Swagger UI',
}));
// Especificación en formato JSON crudo, útil para importar en Postman o generar clientes.
app.get('/api-docs.json', (req, res) => res.json(especificacion));

app.get('/health', (req, res) => res.json({ estado: 'ok', hora: new Date().toISOString() }));
app.use('/api/v1', rutas);

app.use(noEncontrado);
app.use(manejarErrores);

module.exports = app;
