const swaggerJsdoc = require('swagger-jsdoc');

// OpenAPI spec definition — describes the whole API so Swagger UI can render
// an interactive docs page with a "Try it out" button for every endpoint
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Invarion API',
      version: '1.0.0',
      description:
        'Concurrent inventory & order engine. Guarantees no overselling under simultaneous load using Redis distributed locking, idempotency keys, and an order state machine.',
    },
    servers: [
      { url: '/api/v1', description: 'API v1' },
    ],
    components: {
      // Defines the JWT bearer auth scheme so the "Authorize" button appears
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Tells swagger-jsdoc where to find the JSDoc @openapi comments (in route files)
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;