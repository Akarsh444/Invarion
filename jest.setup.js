// Loads .env variables before any test file runs
// Required because tests import modules directly, bypassing src/index.js
require('dotenv').config();