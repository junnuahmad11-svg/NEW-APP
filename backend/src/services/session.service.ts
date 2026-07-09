import { v4 as uuidv4 } from 'uuid';
import { CookieJar } from 'tough-cookie';
import { logger } from '../utils/logger';

interface SessionData {
  cookieJar: CookieJar;
  agentId: string;
  createdAt: number;
  lastActivity: number;
}

class SessionService {
  private sessions = new Map<string, SessionData>();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  createSession(agentId: string, cookieJar: CookieJar): string {
    const sessionId = uuidv4();
    this.sessions.set(sessionId, {
      cookieJar,
      agentId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });
    logger.info(`Session created for agent: ${agentId}`);
    return sessionId;
  }

  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const now = Date.now();
    if (now - session.lastActivity > this.SESSION_TIMEOUT) {
      this.destroySession(sessionId);
      logger.info(`Session expired: ${sessionId}`);
      return null;
    }

    session.lastActivity = now;
    return session;
  }

  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
    logger.info(`Session destroyed: ${sessionId}`);
  }

  // Cleanup expired sessions periodically
  startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      this.sessions.forEach((session, id) => {
        if (now - session.lastActivity > this.SESSION_TIMEOUT) {
          this.destroySession(id);
        }
      });
    }, 5 * 60 * 1000); // Run every 5 minutes
  }
}

export const sessionService = new SessionService();
sessionService.startCleanup();
