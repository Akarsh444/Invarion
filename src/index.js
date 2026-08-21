const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const fs = require('fs');
require('dotenv').config();

const { generalLimiter } = require('./middlewares/rateLimit.middleware');

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

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
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const orderRoutes = require('./routes/order.routes');

const API_VERSION = '/api/v1';

app.use(API_VERSION, testRoutes);
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/products`, productRoutes);
app.use(`${API_VERSION}/inventory`, inventoryRoutes);
app.use(`${API_VERSION}/orders`, orderRoutes);

// Serve the built React frontend only if it exists.
// In CI (and when running the API standalone) there is no frontend build,
// so registering these routes would make every non-API request 404 on a
// missing index.html — including /health, which breaks health checks.
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(path.join(publicDir, 'index.html'))) {
  app.use(express.static(publicDir));

  // SPA fallback so client-side routing works on refresh
  app.get(/^\/(?!api|health|api-docs).*/, (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;