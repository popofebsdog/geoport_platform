import Joi from 'joi';

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  PORT: Joi.number()
    .default(3001),
  
  JWT_SECRET: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().default('dev-secret-not-for-production')
    }),
  
  JWT_EXPIRES_IN: Joi.string()
    .default('24h'),
  
  DB_HOST: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().default('localhost')
    }),
  
  DB_PORT: Joi.number()
    .default(5432),
  
  DB_NAME: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().default('geoport_db')
    }),
  
  DB_NAME_TEST: Joi.string()
    .default('geoport_test'),
  
  DB_USER: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().default('postgres')
    }),
  
  DB_PASSWORD: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().default('postgres')
    }),
  
  DB_SSL: Joi.string()
    .valid('true', 'false')
    .default('false'),
  
  DB_POOL_MAX: Joi.number()
    .default(10),
  
  DB_POOL_MIN: Joi.number()
    .default(0),
  
  DB_POOL_ACQUIRE: Joi.number()
    .default(30000),
  
  DB_POOL_IDLE: Joi.number()
    .default(10000),
  
  FRONTEND_URL: Joi.string()
    .uri()
    .default('http://localhost:5173'),
  
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'debug')
    .default('info'),
  
  UPLOAD_DIR: Joi.string()
    .default('./uploads'),
  
  MAX_FILE_SIZE: Joi.string()
    .default('50MB'),
  
  REDIS_HOST: Joi.string()
    .default('localhost'),
  
  REDIS_PORT: Joi.number()
    .default(6379),
  
  REDIS_PASSWORD: Joi.string()
    .allow('')
    .default(''),
  
  SMTP_HOST: Joi.string()
    .allow('')
    .default(''),
  
  SMTP_PORT: Joi.number()
    .default(587),
  
  SMTP_USER: Joi.string()
    .allow('')
    .default(''),
  
  SMTP_PASS: Joi.string()
    .allow('')
    .default(''),
  
  SMTP_FROM: Joi.string()
    .default('noreply@geoport.com'),
  
  STORAGE_TYPE: Joi.string()
    .valid('local', 's3')
    .default('local'),
  
  AWS_ACCESS_KEY_ID: Joi.string()
    .allow('')
    .default(''),
  
  AWS_SECRET_ACCESS_KEY: Joi.string()
    .allow('')
    .default(''),
  
  AWS_REGION: Joi.string()
    .default('us-east-1'),
  
  AWS_S3_BUCKET: Joi.string()
    .allow('')
    .default('')
}).unknown(true); // Allow extra env vars

function validateEnv() {
  const { error, value } = schema.validate(process.env, { abortEarly: false });
  
  if (error) {
    const msg = error.details.map(d => d.message).join('\n');
    if (process.env.NODE_ENV === 'production') {
      console.error('Environment validation failed:\n' + msg);
      process.exit(1);
    } else {
      console.warn('Environment validation warnings:\n' + msg);
    }
  }
  
  return value;
}

export default validateEnv;
