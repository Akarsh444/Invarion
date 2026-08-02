const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { generalLimiter } = require('./middlewares/rateLimit.middleware');

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(generalLimiter); 

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'StockSync API running' });
});

const testRoutes = require('./routes/test.routes');
const authRoutes = require('./routes/auth.routes'); // Add this line
const productRoutes = require('./routes/product.routes'); // Add this
const inventoryRoutes = require('./routes/inventory.routes'); // Add this

const API_VERSION = '/api/v1';

app.use(API_VERSION, testRoutes);
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/products`, productRoutes);
app.use(`${API_VERSION}/inventory`, inventoryRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;