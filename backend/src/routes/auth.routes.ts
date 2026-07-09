import { Router, Request, Response } from 'express';
import { CookieJar } from 'tough-cookie';
import { portalService } from '../services/portal.service';
import { sessionService } from '../services/session.service';
import { logger } from '../utils/logger';

export const authRoutes = Router();

// In-memory store for pre-login cookie jars (keyed by temp token)
const pendingLogins = new Map<string, { cookieJar: CookieJar; rsaKey: string; hiddenFields: Record<string, string> }>();

// GET /api/auth/init - Initialize login, get captcha
authRoutes.get('/init', async (req: Request, res: Response) => {
  try {
    const cookieJar = new CookieJar();
    const loginData = await portalService.fetchLoginPage(cookieJar);

    // Generate temp token
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    pendingLogins.set(tempToken, {
      cookieJar,
      rsaKey: loginData.rsaKey,
      hiddenFields: loginData.hiddenFields,
    });

    // Cleanup after 5 minutes
    setTimeout(() => pendingLogins.delete(tempToken), 5 * 60 * 1000);

    res.json({
      success: true,
      tempToken,
      captchaImage: loginData.captchaBase64,
      sessionCookie: loginData.sessionCookie,
    });
  } catch (error) {
    logger.error(`Init failed: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to initialize login' });
  }
});

// POST /api/auth/refresh-captcha
authRoutes.post('/refresh-captcha', async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  const pending = pendingLogins.get(tempToken);

  if (!pending) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  try {
    const captchaBase64 = await portalService.fetchCaptchaRefresh(pending.cookieJar);
    res.json({ success: true, captchaImage: captchaBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response) => {
  const { tempToken, agentId, password, captcha } = req.body;

  if (!tempToken || !agentId || !password || !captcha) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pending = pendingLogins.get(tempToken);
  if (!pending) {
    return res.status(400).json({ error: 'Session expired. Please refresh captcha.' });
  }

  try {
    // Encrypt password with RSA
    const encryptedPassword = portalService.encryptPassword(password, pending.rsaKey);

    // Perform login
    const loginResult = await portalService.performLogin(
      pending.cookieJar,
      agentId,
      encryptedPassword,
      captcha,
      pending.hiddenFields
    );

    if (!loginResult.success) {
      return res.status(401).json({ success: false, error: loginResult.error });
    }

    // Create session
    const sessionId = sessionService.createSession(agentId, pending.cookieJar);
    pendingLogins.delete(tempToken);

    res.json({
      success: true,
      sessionId,
      agentId,
      agentName: loginResult.agentName,
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessionService.destroySession(sessionId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});import { Router, Request, Response } from 'express';
import { CookieJar } from 'tough-cookie';
import { portalService } from '../services/portal.service';
import { sessionService } from '../services/session.service';
import { logger } from '../utils/logger';

export const authRoutes = Router();

// In-memory store for pre-login cookie jars (keyed by temp token)
const pendingLogins = new Map<string, { cookieJar: CookieJar; rsaKey: string; hiddenFields: Record<string, string> }>();

// GET /api/auth/init - Initialize login, get captcha
authRoutes.get('/init', async (req: Request, res: Response) => {
  try {
    const cookieJar = new CookieJar();
    const loginData = await portalService.fetchLoginPage(cookieJar);

    // Generate temp token
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    pendingLogins.set(tempToken, {
      cookieJar,
      rsaKey: loginData.rsaKey,
      hiddenFields: loginData.hiddenFields,
    });

    // Cleanup after 5 minutes
    setTimeout(() => pendingLogins.delete(tempToken), 5 * 60 * 1000);

    res.json({
      success: true,
      tempToken,
      captchaImage: loginData.captchaBase64,
      sessionCookie: loginData.sessionCookie,
    });
  } catch (error) {
    logger.error(`Init failed: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to initialize login' });
  }
});

// POST /api/auth/refresh-captcha
authRoutes.post('/refresh-captcha', async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  const pending = pendingLogins.get(tempToken);

  if (!pending) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  try {
    const captchaBase64 = await portalService.fetchCaptchaRefresh(pending.cookieJar);
    res.json({ success: true, captchaImage: captchaBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response) => {
  const { tempToken, agentId, password, captcha } = req.body;

  if (!tempToken || !agentId || !password || !captcha) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pending = pendingLogins.get(tempToken);
  if (!pending) {
    return res.status(400).json({ error: 'Session expired. Please refresh captcha.' });
  }

  try {
    // Encrypt password with RSA
    const encryptedPassword = portalService.encryptPassword(password, pending.rsaKey);

    // Perform login
    const loginResult = await portalService.performLogin(
      pending.cookieJar,
      agentId,
      encryptedPassword,
      captcha,
      pending.hiddenFields
    );

    if (!loginResult.success) {
      return res.status(401).json({ success: false, error: loginResult.error });
    }

    // Create session
    const sessionId = sessionService.createSession(agentId, pending.cookieJar);
    pendingLogins.delete(tempToken);

    res.json({
      success: true,
      sessionId,
      agentId,
      agentName: loginResult.agentName,
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessionService.destroySession(sessionId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});import { Router, Request, Response } from 'express';
import { CookieJar } from 'tough-cookie';
import { portalService } from '../services/portal.service';
import { sessionService } from '../services/session.service';
import { logger } from '../utils/logger';

export const authRoutes = Router();

// In-memory store for pre-login cookie jars (keyed by temp token)
const pendingLogins = new Map<string, { cookieJar: CookieJar; rsaKey: string; hiddenFields: Record<string, string> }>();

// GET /api/auth/init - Initialize login, get captcha
authRoutes.get('/init', async (req: Request, res: Response) => {
  try {
    const cookieJar = new CookieJar();
    const loginData = await portalService.fetchLoginPage(cookieJar);

    // Generate temp token
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    pendingLogins.set(tempToken, {
      cookieJar,
      rsaKey: loginData.rsaKey,
      hiddenFields: loginData.hiddenFields,
    });

    // Cleanup after 5 minutes
    setTimeout(() => pendingLogins.delete(tempToken), 5 * 60 * 1000);

    res.json({
      success: true,
      tempToken,
      captchaImage: loginData.captchaBase64,
      sessionCookie: loginData.sessionCookie,
    });
  } catch (error) {
    logger.error(`Init failed: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to initialize login' });
  }
});

// POST /api/auth/refresh-captcha
authRoutes.post('/refresh-captcha', async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  const pending = pendingLogins.get(tempToken);

  if (!pending) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  try {
    const captchaBase64 = await portalService.fetchCaptchaRefresh(pending.cookieJar);
    res.json({ success: true, captchaImage: captchaBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response) => {
  const { tempToken, agentId, password, captcha } = req.body;

  if (!tempToken || !agentId || !password || !captcha) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pending = pendingLogins.get(tempToken);
  if (!pending) {
    return res.status(400).json({ error: 'Session expired. Please refresh captcha.' });
  }

  try {
    // Encrypt password with RSA
    const encryptedPassword = portalService.encryptPassword(password, pending.rsaKey);

    // Perform login
    const loginResult = await portalService.performLogin(
      pending.cookieJar,
      agentId,
      encryptedPassword,
      captcha,
      pending.hiddenFields
    );

    if (!loginResult.success) {
      return res.status(401).json({ success: false, error: loginResult.error });
    }

    // Create session
    const sessionId = sessionService.createSession(agentId, pending.cookieJar);
    pendingLogins.delete(tempToken);

    res.json({
      success: true,
      sessionId,
      agentId,
      agentName: loginResult.agentName,
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessionService.destroySession(sessionId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});import { Router, Request, Response } from 'express';
import { CookieJar } from 'tough-cookie';
import { portalService } from '../services/portal.service';
import { sessionService } from '../services/session.service';
import { logger } from '../utils/logger';

export const authRoutes = Router();

// In-memory store for pre-login cookie jars (keyed by temp token)
const pendingLogins = new Map<string, { cookieJar: CookieJar; rsaKey: string; hiddenFields: Record<string, string> }>();

// GET /api/auth/init - Initialize login, get captcha
authRoutes.get('/init', async (req: Request, res: Response) => {
  try {
    const cookieJar = new CookieJar();
    const loginData = await portalService.fetchLoginPage(cookieJar);

    // Generate temp token
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    pendingLogins.set(tempToken, {
      cookieJar,
      rsaKey: loginData.rsaKey,
      hiddenFields: loginData.hiddenFields,
    });

    // Cleanup after 5 minutes
    setTimeout(() => pendingLogins.delete(tempToken), 5 * 60 * 1000);

    res.json({
      success: true,
      tempToken,
      captchaImage: loginData.captchaBase64,
      sessionCookie: loginData.sessionCookie,
    });
  } catch (error) {
    logger.error(`Init failed: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to initialize login' });
  }
});

// POST /api/auth/refresh-captcha
authRoutes.post('/refresh-captcha', async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  const pending = pendingLogins.get(tempToken);

  if (!pending) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  try {
    const captchaBase64 = await portalService.fetchCaptchaRefresh(pending.cookieJar);
    res.json({ success: true, captchaImage: captchaBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response) => {
  const { tempToken, agentId, password, captcha } = req.body;

  if (!tempToken || !agentId || !password || !captcha) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pending = pendingLogins.get(tempToken);
  if (!pending) {
    return res.status(400).json({ error: 'Session expired. Please refresh captcha.' });
  }

  try {
    // Encrypt password with RSA
    const encryptedPassword = portalService.encryptPassword(password, pending.rsaKey);

    // Perform login
    const loginResult = await portalService.performLogin(
      pending.cookieJar,
      agentId,
      encryptedPassword,
      captcha,
      pending.hiddenFields
    );

    if (!loginResult.success) {
      return res.status(401).json({ success: false, error: loginResult.error });
    }

    // Create session
    const sessionId = sessionService.createSession(agentId, pending.cookieJar);
    pendingLogins.delete(tempToken);

    res.json({
      success: true,
      sessionId,
      agentId,
      agentName: loginResult.agentName,
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessionService.destroySession(sessionId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});import { Router, Request, Response } from 'express';
import { CookieJar } from 'tough-cookie';
import { portalService } from '../services/portal.service';
import { sessionService } from '../services/session.service';
import { logger } from '../utils/logger';

export const authRoutes = Router();

// In-memory store for pre-login cookie jars (keyed by temp token)
const pendingLogins = new Map<string, { cookieJar: CookieJar; rsaKey: string; hiddenFields: Record<string, string> }>();

// GET /api/auth/init - Initialize login, get captcha
authRoutes.get('/init', async (req: Request, res: Response) => {
  try {
    const cookieJar = new CookieJar();
    const loginData = await portalService.fetchLoginPage(cookieJar);

    // Generate temp token
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    pendingLogins.set(tempToken, {
      cookieJar,
      rsaKey: loginData.rsaKey,
      hiddenFields: loginData.hiddenFields,
    });

    // Cleanup after 5 minutes
    setTimeout(() => pendingLogins.delete(tempToken), 5 * 60 * 1000);

    res.json({
      success: true,
      tempToken,
      captchaImage: loginData.captchaBase64,
      sessionCookie: loginData.sessionCookie,
    });
  } catch (error) {
    logger.error(`Init failed: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to initialize login' });
  }
});

// POST /api/auth/refresh-captcha
authRoutes.post('/refresh-captcha', async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  const pending = pendingLogins.get(tempToken);

  if (!pending) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  try {
    const captchaBase64 = await portalService.fetchCaptchaRefresh(pending.cookieJar);
    res.json({ success: true, captchaImage: captchaBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response) => {
  const { tempToken, agentId, password, captcha } = req.body;

  if (!tempToken || !agentId || !password || !captcha) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pending = pendingLogins.get(tempToken);
  if (!pending) {
    return res.status(400).json({ error: 'Session expired. Please refresh captcha.' });
  }

  try {
    // Encrypt password with RSA
    const encryptedPassword = portalService.encryptPassword(password, pending.rsaKey);

    // Perform login
    const loginResult = await portalService.performLogin(
      pending.cookieJar,
      agentId,
      encryptedPassword,
      captcha,
      pending.hiddenFields
    );

    if (!loginResult.success) {
      return res.status(401).json({ success: false, error: loginResult.error });
    }

    // Create session
    const sessionId = sessionService.createSession(agentId, pending.cookieJar);
    pendingLogins.delete(tempToken);

    res.json({
      success: true,
      sessionId,
      agentId,
      agentName: loginResult.agentName,
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessionService.destroySession(sessionId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});import { Router, Request, Response } from 'express';
import { CookieJar } from 'tough-cookie';
import { portalService } from '../services/portal.service';
import { sessionService } from '../services/session.service';
import { logger } from '../utils/logger';

export const authRoutes = Router();

// In-memory store for pre-login cookie jars (keyed by temp token)
const pendingLogins = new Map<string, { cookieJar: CookieJar; rsaKey: string; hiddenFields: Record<string, string> }>();

// GET /api/auth/init - Initialize login, get captcha
authRoutes.get('/init', async (req: Request, res: Response) => {
  try {
    const cookieJar = new CookieJar();
    const loginData = await portalService.fetchLoginPage(cookieJar);

    // Generate temp token
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    pendingLogins.set(tempToken, {
      cookieJar,
      rsaKey: loginData.rsaKey,
      hiddenFields: loginData.hiddenFields,
    });

    // Cleanup after 5 minutes
    setTimeout(() => pendingLogins.delete(tempToken), 5 * 60 * 1000);

    res.json({
      success: true,
      tempToken,
      captchaImage: loginData.captchaBase64,
      sessionCookie: loginData.sessionCookie,
    });
  } catch (error) {
    logger.error(`Init failed: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to initialize login' });
  }
});

// POST /api/auth/refresh-captcha
authRoutes.post('/refresh-captcha', async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  const pending = pendingLogins.get(tempToken);

  if (!pending) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  try {
    const captchaBase64 = await portalService.fetchCaptchaRefresh(pending.cookieJar);
    res.json({ success: true, captchaImage: captchaBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response) => {
  const { tempToken, agentId, password, captcha } = req.body;

  if (!tempToken || !agentId || !password || !captcha) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pending = pendingLogins.get(tempToken);
  if (!pending) {
    return res.status(400).json({ error: 'Session expired. Please refresh captcha.' });
  }

  try {
    // Encrypt password with RSA
    const encryptedPassword = portalService.encryptPassword(password, pending.rsaKey);

    // Perform login
    const loginResult = await portalService.performLogin(
      pending.cookieJar,
      agentId,
      encryptedPassword,
      captcha,
      pending.hiddenFields
    );

    if (!loginResult.success) {
      return res.status(401).json({ success: false, error: loginResult.error });
    }

    // Create session
    const sessionId = sessionService.createSession(agentId, pending.cookieJar);
    pendingLogins.delete(tempToken);

    res.json({
      success: true,
      sessionId,
      agentId,
      agentName: loginResult.agentName,
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessionService.destroySession(sessionId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});import { Router, Request, Response } from 'express';
import { CookieJar } from 'tough-cookie';
import { portalService } from '../services/portal.service';
import { sessionService } from '../services/session.service';
import { logger } from '../utils/logger';

export const authRoutes = Router();

// In-memory store for pre-login cookie jars (keyed by temp token)
const pendingLogins = new Map<string, { cookieJar: CookieJar; rsaKey: string; hiddenFields: Record<string, string> }>();

// GET /api/auth/init - Initialize login, get captcha
authRoutes.get('/init', async (req: Request, res: Response) => {
  try {
    const cookieJar = new CookieJar();
    const loginData = await portalService.fetchLoginPage(cookieJar);

    // Generate temp token
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    pendingLogins.set(tempToken, {
      cookieJar,
      rsaKey: loginData.rsaKey,
      hiddenFields: loginData.hiddenFields,
    });

    // Cleanup after 5 minutes
    setTimeout(() => pendingLogins.delete(tempToken), 5 * 60 * 1000);

    res.json({
      success: true,
      tempToken,
      captchaImage: loginData.captchaBase64,
      sessionCookie: loginData.sessionCookie,
    });
  } catch (error) {
    logger.error(`Init failed: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to initialize login' });
  }
});

// POST /api/auth/refresh-captcha
authRoutes.post('/refresh-captcha', async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  const pending = pendingLogins.get(tempToken);

  if (!pending) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  try {
    const captchaBase64 = await portalService.fetchCaptchaRefresh(pending.cookieJar);
    res.json({ success: true, captchaImage: captchaBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response) => {
  const { tempToken, agentId, password, captcha } = req.body;

  if (!tempToken || !agentId || !password || !captcha) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pending = pendingLogins.get(tempToken);
  if (!pending) {
    return res.status(400).json({ error: 'Session expired. Please refresh captcha.' });
  }

  try {
    // Encrypt password with RSA
    const encryptedPassword = portalService.encryptPassword(password, pending.rsaKey);

    // Perform login
    const loginResult = await portalService.performLogin(
      pending.cookieJar,
      agentId,
      encryptedPassword,
      captcha,
      pending.hiddenFields
    );

    if (!loginResult.success) {
      return res.status(401).json({ success: false, error: loginResult.error });
    }

    // Create session
    const sessionId = sessionService.createSession(agentId, pending.cookieJar);
    pendingLogins.delete(tempToken);

    res.json({
      success: true,
      sessionId,
      agentId,
      agentName: loginResult.agentName,
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessionService.destroySession(sessionId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});import { Router, Request, Response } from 'express';
import { CookieJar } from 'tough-cookie';
import { portalService } from '../services/portal.service';
import { sessionService } from '../services/session.service';
import { logger } from '../utils/logger';

export const authRoutes = Router();

// In-memory store for pre-login cookie jars (keyed by temp token)
const pendingLogins = new Map<string, { cookieJar: CookieJar; rsaKey: string; hiddenFields: Record<string, string> }>();

// GET /api/auth/init - Initialize login, get captcha
authRoutes.get('/init', async (req: Request, res: Response) => {
  try {
    const cookieJar = new CookieJar();
    const loginData = await portalService.fetchLoginPage(cookieJar);

    // Generate temp token
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    pendingLogins.set(tempToken, {
      cookieJar,
      rsaKey: loginData.rsaKey,
      hiddenFields: loginData.hiddenFields,
    });

    // Cleanup after 5 minutes
    setTimeout(() => pendingLogins.delete(tempToken), 5 * 60 * 1000);

    res.json({
      success: true,
      tempToken,
      captchaImage: loginData.captchaBase64,
      sessionCookie: loginData.sessionCookie,
    });
  } catch (error) {
    logger.error(`Init failed: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to initialize login' });
  }
});

// POST /api/auth/refresh-captcha
authRoutes.post('/refresh-captcha', async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  const pending = pendingLogins.get(tempToken);

  if (!pending) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  try {
    const captchaBase64 = await portalService.fetchCaptchaRefresh(pending.cookieJar);
    res.json({ success: true, captchaImage: captchaBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response) => {
  const { tempToken, agentId, password, captcha } = req.body;

  if (!tempToken || !agentId || !password || !captcha) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pending = pendingLogins.get(tempToken);
  if (!pending) {
    return res.status(400).json({ error: 'Session expired. Please refresh captcha.' });
  }

  try {
    // Encrypt password with RSA
    const encryptedPassword = portalService.encryptPassword(password, pending.rsaKey);

    // Perform login
    const loginResult = await portalService.performLogin(
      pending.cookieJar,
      agentId,
      encryptedPassword,
      captcha,
      pending.hiddenFields
    );

    if (!loginResult.success) {
      return res.status(401).json({ success: false, error: loginResult.error });
    }

    // Create session
    const sessionId = sessionService.createSession(agentId, pending.cookieJar);
    pendingLogins.delete(tempToken);

    res.json({
      success: true,
      sessionId,
      agentId,
      agentName: loginResult.agentName,
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessionService.destroySession(sessionId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});import { Router, Request, Response } from 'express';
import { CookieJar } from 'tough-cookie';
import { portalService } from '../services/portal.service';
import { sessionService } from '../services/session.service';
import { logger } from '../utils/logger';

export const authRoutes = Router();

// In-memory store for pre-login cookie jars (keyed by temp token)
const pendingLogins = new Map<string, { cookieJar: CookieJar; rsaKey: string; hiddenFields: Record<string, string> }>();

// GET /api/auth/init - Initialize login, get captcha
authRoutes.get('/init', async (req: Request, res: Response) => {
  try {
    const cookieJar = new CookieJar();
    const loginData = await portalService.fetchLoginPage(cookieJar);

    // Generate temp token
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    pendingLogins.set(tempToken, {
      cookieJar,
      rsaKey: loginData.rsaKey,
      hiddenFields: loginData.hiddenFields,
    });

    // Cleanup after 5 minutes
    setTimeout(() => pendingLogins.delete(tempToken), 5 * 60 * 1000);

    res.json({
      success: true,
      tempToken,
      captchaImage: loginData.captchaBase64,
      sessionCookie: loginData.sessionCookie,
    });
  } catch (error) {
    logger.error(`Init failed: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to initialize login' });
  }
});

// POST /api/auth/refresh-captcha
authRoutes.post('/refresh-captcha', async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  const pending = pendingLogins.get(tempToken);

  if (!pending) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  try {
    const captchaBase64 = await portalService.fetchCaptchaRefresh(pending.cookieJar);
    res.json({ success: true, captchaImage: captchaBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response) => {
  const { tempToken, agentId, password, captcha } = req.body;

  if (!tempToken || !agentId || !password || !captcha) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pending = pendingLogins.get(tempToken);
  if (!pending) {
    return res.status(400).json({ error: 'Session expired. Please refresh captcha.' });
  }

  try {
    // Encrypt password with RSA
    const encryptedPassword = portalService.encryptPassword(password, pending.rsaKey);

    // Perform login
    const loginResult = await portalService.performLogin(
      pending.cookieJar,
      agentId,
      encryptedPassword,
      captcha,
      pending.hiddenFields
    );

    if (!loginResult.success) {
      return res.status(401).json({ success: false, error: loginResult.error });
    }

    // Create session
    const sessionId = sessionService.createSession(agentId, pending.cookieJar);
    pendingLogins.delete(tempToken);

    res.json({
      success: true,
      sessionId,
      agentId,
      agentName: loginResult.agentName,
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessionService.destroySession(sessionId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});import { Router, Request, Response } from 'express';
import { CookieJar } from 'tough-cookie';
import { portalService } from '../services/portal.service';
import { sessionService } from '../services/session.service';
import { logger } from '../utils/logger';

export const authRoutes = Router();

// In-memory store for pre-login cookie jars (keyed by temp token)
const pendingLogins = new Map<string, { cookieJar: CookieJar; rsaKey: string; hiddenFields: Record<string, string> }>();

// GET /api/auth/init - Initialize login, get captcha
authRoutes.get('/init', async (req: Request, res: Response) => {
  try {
    const cookieJar = new CookieJar();
    const loginData = await portalService.fetchLoginPage(cookieJar);

    // Generate temp token
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    pendingLogins.set(tempToken, {
      cookieJar,
      rsaKey: loginData.rsaKey,
      hiddenFields: loginData.hiddenFields,
    });

    // Cleanup after 5 minutes
    setTimeout(() => pendingLogins.delete(tempToken), 5 * 60 * 1000);

    res.json({
      success: true,
      tempToken,
      captchaImage: loginData.captchaBase64,
      sessionCookie: loginData.sessionCookie,
    });
  } catch (error) {
    logger.error(`Init failed: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to initialize login' });
  }
});

// POST /api/auth/refresh-captcha
authRoutes.post('/refresh-captcha', async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  const pending = pendingLogins.get(tempToken);

  if (!pending) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  try {
    const captchaBase64 = await portalService.fetchCaptchaRefresh(pending.cookieJar);
    res.json({ success: true, captchaImage: captchaBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response) => {
  const { tempToken, agentId, password, captcha } = req.body;

  if (!tempToken || !agentId || !password || !captcha) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pending = pendingLogins.get(tempToken);
  if (!pending) {
    return res.status(400).json({ error: 'Session expired. Please refresh captcha.' });
  }

  try {
    // Encrypt password with RSA
    const encryptedPassword = portalService.encryptPassword(password, pending.rsaKey);

    // Perform login
    const loginResult = await portalService.performLogin(
      pending.cookieJar,
      agentId,
      encryptedPassword,
      captcha,
      pending.hiddenFields
    );

    if (!loginResult.success) {
      return res.status(401).json({ success: false, error: loginResult.error });
    }

    // Create session
    const sessionId = sessionService.createSession(agentId, pending.cookieJar);
    pendingLogins.delete(tempToken);

    res.json({
      success: true,
      sessionId,
      agentId,
      agentName: loginResult.agentName,
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessionService.destroySession(sessionId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});import { Router, Request, Response } from 'express';
import { CookieJar } from 'tough-cookie';
import { portalService } from '../services/portal.service';
import { sessionService } from '../services/session.service';
import { logger } from '../utils/logger';

export const authRoutes = Router();

// In-memory store for pre-login cookie jars (keyed by temp token)
const pendingLogins = new Map<string, { cookieJar: CookieJar; rsaKey: string; hiddenFields: Record<string, string> }>();

// GET /api/auth/init - Initialize login, get captcha
authRoutes.get('/init', async (req: Request, res: Response) => {
  try {
    const cookieJar = new CookieJar();
    const loginData = await portalService.fetchLoginPage(cookieJar);

    // Generate temp token
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    pendingLogins.set(tempToken, {
      cookieJar,
      rsaKey: loginData.rsaKey,
      hiddenFields: loginData.hiddenFields,
    });

    // Cleanup after 5 minutes
    setTimeout(() => pendingLogins.delete(tempToken), 5 * 60 * 1000);

    res.json({
      success: true,
      tempToken,
      captchaImage: loginData.captchaBase64,
      sessionCookie: loginData.sessionCookie,
    });
  } catch (error) {
    logger.error(`Init failed: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to initialize login' });
  }
});

// POST /api/auth/refresh-captcha
authRoutes.post('/refresh-captcha', async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  const pending = pendingLogins.get(tempToken);

  if (!pending) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  try {
    const captchaBase64 = await portalService.fetchCaptchaRefresh(pending.cookieJar);
    res.json({ success: true, captchaImage: captchaBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response) => {
  const { tempToken, agentId, password, captcha } = req.body;

  if (!tempToken || !agentId || !password || !captcha) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pending = pendingLogins.get(tempToken);
  if (!pending) {
    return res.status(400).json({ error: 'Session expired. Please refresh captcha.' });
  }

  try {
    // Encrypt password with RSA
    const encryptedPassword = portalService.encryptPassword(password, pending.rsaKey);

    // Perform login
    const loginResult = await portalService.performLogin(
      pending.cookieJar,
      agentId,
      encryptedPassword,
      captcha,
      pending.hiddenFields
    );

    if (!loginResult.success) {
      return res.status(401).json({ success: false, error: loginResult.error });
    }

    // Create session
    const sessionId = sessionService.createSession(agentId, pending.cookieJar);
    pendingLogins.delete(tempToken);

    res.json({
      success: true,
      sessionId,
      agentId,
      agentName: loginResult.agentName,
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessionService.destroySession(sessionId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});import { Router, Request, Response } from 'express';
import { CookieJar } from 'tough-cookie';
import { portalService } from '../services/portal.service';
import { sessionService } from '../services/session.service';
import { logger } from '../utils/logger';

export const authRoutes = Router();

// In-memory store for pre-login cookie jars (keyed by temp token)
const pendingLogins = new Map<string, { cookieJar: CookieJar; rsaKey: string; hiddenFields: Record<string, string> }>();

// GET /api/auth/init - Initialize login, get captcha
authRoutes.get('/init', async (req: Request, res: Response) => {
  try {
    const cookieJar = new CookieJar();
    const loginData = await portalService.fetchLoginPage(cookieJar);

    // Generate temp token
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    pendingLogins.set(tempToken, {
      cookieJar,
      rsaKey: loginData.rsaKey,
      hiddenFields: loginData.hiddenFields,
    });

    // Cleanup after 5 minutes
    setTimeout(() => pendingLogins.delete(tempToken), 5 * 60 * 1000);

    res.json({
      success: true,
      tempToken,
      captchaImage: loginData.captchaBase64,
      sessionCookie: loginData.sessionCookie,
    });
  } catch (error) {
    logger.error(`Init failed: ${error}`);
    res.status(500).json({ success: false, error: 'Failed to initialize login' });
  }
});

// POST /api/auth/refresh-captcha
authRoutes.post('/refresh-captcha', async (req: Request, res: Response) => {
  const { tempToken } = req.body;
  const pending = pendingLogins.get(tempToken);

  if (!pending) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  try {
    const captchaBase64 = await portalService.fetchCaptchaRefresh(pending.cookieJar);
    res.json({ success: true, captchaImage: captchaBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh captcha' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response) => {
  const { tempToken, agentId, password, captcha } = req.body;

  if (!tempToken || !agentId || !password || !captcha) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pending = pendingLogins.get(tempToken);
  if (!pending) {
    return res.status(400).json({ error: 'Session expired. Please refresh captcha.' });
  }

  try {
    // Encrypt password with RSA
    const encryptedPassword = portalService.encryptPassword(password, pending.rsaKey);

    // Perform login
    const loginResult = await portalService.performLogin(
      pending.cookieJar,
      agentId,
      encryptedPassword,
      captcha,
      pending.hiddenFields
    );

    if (!loginResult.success) {
      return res.status(401).json({ success: false, error: loginResult.error });
    }

    // Create session
    const sessionId = sessionService.createSession(agentId, pending.cookieJar);
    pendingLogins.delete(tempToken);

    res.json({
      success: true,
      sessionId,
      agentId,
      agentName: loginResult.agentName,
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessionService.destroySession(sessionId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});
