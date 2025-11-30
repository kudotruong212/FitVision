// docs/swagger.js
// Swagger/OpenAPI configuration

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FitVision API',
      version: '1.0.0',
      description: 'API documentation for FitVision Gym & Yoga AI consultation platform',
      contact: {
        name: 'FitVision Support',
        email: 'support@fitvision.com',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Profile', description: 'User profile management' },
      { name: 'Scan', description: 'Body scan and analysis' },
      { name: 'AI', description: 'AI-powered features' },
      { name: 'Coach', description: 'AI Coach chat' },
      { name: 'Exercises', description: 'Exercise library' },
      { name: 'Health', description: 'Health check endpoints' },
    ],
  },
  apis: ['./routes/*.js', './index.js'], // Paths to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerSpec, swaggerUi };



