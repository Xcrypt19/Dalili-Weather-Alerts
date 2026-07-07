import dotenv from 'dotenv';
dotenv.config();

const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessTtl: process.env.JWT_ACCESS_TTL || '1h',
    refreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  },

  databaseUrl: process.env.DATABASE_URL || 'postgres://dalili:dalili@localhost:5432/dalili',
  redisUrl: process.env.REDIS_URL || '',

  weather: {
    tomorrowKey: process.env.TOMORROW_API_KEY || '',
    openWeatherKey: process.env.OPENWEATHER_API_KEY || '',
    cacheTtl: num(process.env.WEATHER_CACHE_TTL_SECONDS, 900),
    pollCron: process.env.WEATHER_POLL_CRON || '*/10 * * * *',
  },

  googleMapsKey: process.env.GOOGLE_MAPS_API_KEY || '',
  fcmServerKey: process.env.FCM_SERVER_KEY || '',

  sms: {
    provider: process.env.SMS_PROVIDER || 'none',
    twilio: {
      sid: process.env.TWILIO_ACCOUNT_SID || '',
      token: process.env.TWILIO_AUTH_TOKEN || '',
      from: process.env.TWILIO_FROM_NUMBER || '',
    },
    africasTalking: {
      username: process.env.AT_USERNAME || '',
      apiKey: process.env.AT_API_KEY || '',
      senderId: process.env.AT_SENDER_ID || '',
    },
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Dalili Weather <alerts@dalili.app>',
  },
};

/** True when a real credential is present (not just a placeholder). */
export const hasKey = (v) => typeof v === 'string' && v.trim().length > 0;
