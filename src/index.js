const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('dotenv').config();

const { generalLimiter } = require('./middlewares/rateLimit.middleware');

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Serve the built React frontend from /public (created by the Docker build)
app.use(express.static(path.join(__dirname, '../public')));

// SPA fallback — any non-API route returns index.html so client-side
// routing works and refreshing a page doesn't 404
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Interactive API documentation — visit /api-docs in a browser
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check must come BEFORE the rate limiter so Render's frequent
// health polling is never rate-limited (which would cause false restarts)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Invarion API running' });
});

// Rate limiter applies only to API routes, not health checks
app.use('/api', generalLimiter);

const testRoutes = require('./routes/test.routes');
const authRoutes = require('./routes/auth.routes'); // Add this line
const productRoutes = require('./routes/product.routes'); // Add this
const inventoryRoutes = require('./routes/inventory.routes'); // Add this
const orderRoutes = require('./routes/order.routes');

const API_VERSION = '/api/v1';

app.use(`${API_VERSION}/orders`, orderRoutes);
app.use(API_VERSION, testRoutes);
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/products`, productRoutes);
app.use(`${API_VERSION}/inventory`, inventoryRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;