import { createClient, RedisClientType } from 'redis';

// Redis client configuration
let redisClient: RedisClientType | null = null;

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis: Too many reconnection attempts');
          return new Error('Too many reconnection attempts');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Redis Client Connected');
  });

  client.on('reconnecting', () => {
    console.log('Redis Client Reconnecting');
  });

  await client.connect();
  redisClient = client;
  return client;
};

export const closeRedisClient = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
};

// Cache utility functions
export const cacheGet = async <T = any>(key: string): Promise<T | null> => {
  try {
    const client = await getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

export const cacheSet = async (
  key: string,
  value: any,
  ttl: number = 3600 // Default 1 hour
): Promise<boolean> => {
  try {
    const client = await getRedisClient();
    await client.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
};

export const cacheDelete = async (key: string): Promise<boolean> => {
  try {
    const client = await getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
};

export const cacheDeletePattern = async (pattern: string): Promise<number> => {
  try {
    const client = await getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      return await client.del(keys);
    }
    return 0;
  } catch (error) {
    console.error('Cache delete pattern error:', error);
    return 0;
  }
};

export const cacheExists = async (key: string): Promise<boolean> => {
  try {
    const client = await getRedisClient();
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('Cache exists error:', error);
    return false;
  }
};

export const cacheTTL = async (key: string): Promise<number> => {
  try {
    const client = await getRedisClient();
    return await client.ttl(key);
  } catch (error) {
    console.error('Cache TTL error:', error);
    return -1;
  }
};
