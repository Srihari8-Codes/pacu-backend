import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const getEnv = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Missing environment variable: ${key}`);
    }
    return value;
};

export const config = {
    PORT: parseInt(getEnv('PORT', '5000'), 10),
    DATABASE_URL: getEnv('DATABASE_URL'),
    JWT_SECRET: getEnv('JWT_SECRET'),
    CORS_ORIGIN: getEnv('CORS_ORIGIN', '*'),
    ADMIN_SECRET: getEnv('ADMIN_SECRET'),
};
