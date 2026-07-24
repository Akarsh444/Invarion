const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'StockSync API running' });
});

const testRoutes = require('./routes/test.routes');
const authRoutes = require('./routes/auth.routes'); // Add this line
const productRoutes = require('./routes/product.routes'); // Add this
const inventoryRoutes = require('./routes/inventory.routes'); // Add this

app.use('/api', testRoutes);
app.use('/api/auth', authRoutes); // Add this line
app.use('/api/products', productRoutes); // Add this
app.use('/api/inventory', inventoryRoutes); // Add this

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;