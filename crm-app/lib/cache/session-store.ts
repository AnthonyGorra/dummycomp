import { getRedisClient } from './redis';

export interface SessionData {
  userId: string;
  email: string;
  role?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  lastAccessedAt: number;
}

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 86400; // 24 hours in seconds

export class RedisSessionStore {
  private async getClient() {
    return await getRedisClient();
  }

  async createSession(sessionId: string, data: Omit<SessionData, 'createdAt' | 'lastAccessedAt'>): Promise<boolean> {
    try {
      const client = await this.getClient();
      const sessionData: SessionData = {
        ...data,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      await client.setEx(
        `${SESSION_PREFIX}${sessionId}`,
        SESSION_TTL,
        JSON.stringify(sessionData)
      );

      return true;
    } catch (error) {
      console.error('Error creating session:', error);
      return false;
    }
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const client = await this.getClient();
      const data = await client.get(`${SESSION_PREFIX}${sessionId}`);

      if (!data) {
        return null;
      }

      const sessionData: SessionData = JSON.parse(data);

      // Update last accessed time
      sessionData.lastAccessedAt = Date.now();
      await client.setEx(
        `${SESSION_PREFIX}${sessionId}`,
        SESSION_TTL,
        JSON.stringify(sessionData)
      );

      return sessionData;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async updateSession(sessionId: string, data: Partial<SessionData>): Promise<boolean> {
    try {
      const client = await this.getClient();
      const existingData = await this.getSession(sessionId);

      if (!existingData) {
        return false;
      }

      const updatedData: SessionData = {
        ...existingData,
        ...data,
        lastAccessedAt: Date.now(),
      };

      await client.setEx(
        `${SESSION_PREFIX}${sessionId}`,
        SESSION_TTL,
        JSON.stringify(updatedData)
      );

      return true;
    } catch (error) {
      console.error('Error updating session:', error);
      return false;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.del(`${SESSION_PREFIX}${sessionId}`);
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  async deleteUserSessions(userId: string): Promise<number> {
    try {
      const client = await this.getClient();
      const keys = await client.keys(`${SESSION_PREFIX}*`);
      let deletedCount = 0;

      for (const key of keys) {
        const data = await client.get(key);
        if (data) {
          const sessionData: SessionData = JSON.parse(data);
          if (sessionData.userId === userId) {
            await client.del(key);
            deletedCount++;
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error deleting user sessions:', error);
      return 0;
    }
  }

  async extendSession(sessionId: string, ttl: number = SESSION_TTL): Promise<boolean> {
    try {
      const client = await this.getClient();
      const exists = await client.exists(`${SESSION_PREFIX}${sessionId}`);

      if (!exists) {
        return false;
      }

      await client.expire(`${SESSION_PREFIX}${sessionId}`, ttl);
      return true;
    } catch (error) {
      console.error('Error extending session:', error);
      return false;
    }
  }
}

export const sessionStore = new RedisSessionStore();
