import express from 'express';

process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'geoport_test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.PORT = '3099';

express.application.listen = function mockedListen() {
  return {
    close() {}
  };
};
