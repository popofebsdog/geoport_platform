import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'GeoPort API',
      version: '1.0.0',
      description: 'GeoPort 災情資料搜集系統 API'
    },
    servers: [
      {
        url: 'http://localhost:3001'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '請在 Authorization header 使用 Bearer <token>'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

export const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
