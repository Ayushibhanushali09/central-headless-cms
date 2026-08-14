import Joi from 'joi';

const tokenTtlPattern = /^\d+[smhd]$/;

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(
      'development',
      'test',
      'staging',
      'production',
    )
    .default('development'),

  PORT: Joi.number()
    .integer()
    .min(1)
    .max(65_535)
    .default(4000),

  ADMIN_ORIGIN: Joi.string()
    .uri({
      scheme: ['http', 'https'],
    })
    .required(),

  MONGODB_URI: Joi.string()
    .uri({
      scheme: [
        'mongodb',
        'mongodb+srv',
      ],
    })
    .required(),

  REDIS_URL: Joi.string()
    .uri({
      scheme: ['redis', 'rediss'],
    })
    .required(),

  JWT_ACCESS_SECRET: Joi.string()
    .min(32)
    .required(),

  JWT_ACCESS_TTL: Joi.string()
    .pattern(tokenTtlPattern)
    .default('15m'),

  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required(),

  JWT_REFRESH_TTL_DAYS: Joi.number()
    .integer()
    .min(1)
    .max(90)
    .default(7),

  ACCESS_KEY_PEPPER: Joi.string()
    .min(32)
    .required(),

  ACCESS_KEY_BYTES: Joi.number()
    .integer()
    .min(32)
    .max(64)
    .default(32),

  MAX_SCHEMA_BYTES: Joi.number()
    .integer()
    .min(1_000)
    .max(1_000_000)
    .default(100_000),

  MAX_CONTENT_BYTES: Joi.number()
    .integer()
    .min(10_000)
    .max(16_000_000)
    .default(1_000_000),

  MAX_SCHEMA_DEPTH: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(12),

  MAX_CONTENT_DEPTH: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),

  DELIVERY_CACHE_TTL_SECONDS: Joi.number()
    .integer()
    .min(1)
    .max(86_400)
    .default(3_600),
})
  .unknown(true)
  .required();