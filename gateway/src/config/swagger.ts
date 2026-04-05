import swaggerJsdoc from 'swagger-jsdoc';

const PORT = process.env.PORT || 3000;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Digital Asset Management API',
      version: '1.0.0',
      description: 'API documentation for Digital Asset Management & Media Intelligence Platform',
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api/`,
        description: 'Development server',
      },
    ],
    // Set up the authorization schema for out API end points
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
