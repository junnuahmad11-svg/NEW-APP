import axios, { AxiosInstance } from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import * as cheerio from 'cheerio';
import NodeRSA from 'node-rsa';
import { logger } from '../utils/logger';

const BASE_URL = 'https://dopagent.indiapost.gov.in';
const LOGIN_URL = `${BASE_URL}/corp/AuthenticationController`;

const LOGIN_PARAMS = {
  FORMSGROUP_ID__: 'AuthenticationFG',
  START_TRAN_FLAG: 'Y',
  FG_BUTTONS: 'LOAD',
  'ACTION.LOAD': 'Y',
  'AuthenticationFG.LOGIN_FLAG': '3',
  BANK_ID: 'DOP',
  AGENT_FLAG: 'Y',
};

export interface LoginPageData {
  captchaBase64: string;
  rsaKey: string;
  hiddenFields: Record<string, string>;
  sessionCookie: string;
}

export interface LoginResult {
  success: boolean;
  sessionId?: string;
  agentName?: string;
  error?: string;
}

class PortalService {
  createAxiosInstance(cookieJar: CookieJar): AxiosInstance {
    const instance = wrapper(
      axios.create({
        jar: cookieJar,
        withCredentials: true,
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
        },
      })
    );
    return instance;
  }

  async fetchLoginPage(cookieJar: CookieJar): Promise<LoginPageData> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(LOGIN_URL, {
        params: LOGIN_PARAMS,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Extract RSA Key
      const rsaKey = this.extractRSAKey(html);

      // Extract captcha image
      const captchaBase64 = await this.extractCaptcha(client, $);

      // Extract hidden fields
      const hiddenFields = this.extractHiddenFields($);

      // Get JSESSIONID from cookies
      const cookies = await cookieJar.getCookies(BASE_URL);
      const sessionCookie =
        cookies.find((c) => c.key === 'JSESSIONID')?.value || '';

      logger.info('Login page fetched successfully');
      return { captchaBase64, rsaKey, hiddenFields, sessionCookie };
    } catch (error) {
      logger.error(`Failed to fetch login page: ${error}`);
      throw new Error('Failed to connect to India Post portal');
    }
  }

  private extractRSAKey(html: string): string {
    // Extract RSA key from JavaScript variable __JS_ENCRYPT_KEY__
    const match = html.match(/__JS_ENCRYPT_KEY__\s*=\s*["']([^"']+)["']/);
    if (!match) {
      // Try alternate pattern
      const altMatch = html.match(/var\s+rsaKey\s*=\s*["']([^"']+)["']/);
      return altMatch ? altMatch[1] : '';
    }
    return match[1];
  }

  private async extractCaptcha(
    client: AxiosInstance,
    $: cheerio.CheerioAPI
  ): Promise<string> {
    try {
      // Find captcha image src
      const captchaSrc = $('img[src*="captcha"], img[src*="CAPTCHA"]').attr(
        'src'
      );

      if (!captchaSrc) return '';

      const captchaUrl = captchaSrc.startsWith('http')
        ? captchaSrc
        : `${BASE_URL}${captchaSrc}`;

      const captchaResponse = await client.get(captchaUrl, {
        responseType: 'arraybuffer',
      });

      const base64 = Buffer.from(captchaResponse.data).toString('base64');
      const contentType =
        captchaResponse.headers['content-type'] || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      logger.error(`Captcha extraction failed: ${error}`);
      return '';
    }
  }

  private extractHiddenFields($: cheerio.CheerioAPI): Record<string, string> {
    const fields: Record<string, string> = {};
    $('input[type="hidden"]').each((_, el) => {
      const name = $(el).attr('name');
      const value = $(el).attr('value') || '';
      if (name) fields[name] = value;
    });
    return fields;
  }

  encryptPassword(password: string, rsaKeyString: string): string {
    try {
      const key = new NodeRSA();
      key.importKey(rsaKeyString, 'pkcs8-public-pem');
      key.setOptions({ encryptionScheme: 'pkcs1' });
      return key.encrypt(password, 'base64');
    } catch (error) {
      logger.error(`RSA encryption failed: ${error}`);
      throw new Error('Password encryption failed');
    }
  }

  async performLogin(
    cookieJar: CookieJar,
    agentId: string,
    encryptedPassword: string,
    captcha: string,
    hiddenFields: Record<string, string>
  ): Promise<{ success: boolean; agentName?: string; error?: string }> {
    const client = this.createAxiosInstance(cookieJar);

    const formData = new URLSearchParams({
      ...hiddenFields,
      'AuthenticationFG.USER_PRINCIPAL': agentId,
      'AuthenticationFG.ACCESS_CODE': encryptedPassword,
      'AuthenticationFG.VERIFICATION_CODE': captcha,
      'AuthenticationFG.LOGIN_FLAG': '1',
      FORMSGROUP_ID__: 'AuthenticationFG',
      FG_BUTTONS: 'SUBMIT',
      'ACTION.SUBMIT': 'Y',
      BANK_ID: 'DOP',
      AGENT_FLAG: 'Y',
    });

    try {
      const response = await client.post(LOGIN_URL, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: LOGIN_URL,
        },
        maxRedirects: 5,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Check for error messages
      const errorMsg = $(
        '.errorMessage, .error-msg, #errorMessage'
      ).first().text().trim();
      if (errorMsg) {
        return { success: false, error: errorMsg };
      }

      // Check for successful login indicators
      const isLoggedIn =
        html.includes('Logout') ||
        html.includes('logout') ||
        html.includes('Welcome') ||
        response.url?.includes('Dashboard') ||
        response.url?.includes('dashboard');

      if (!isLoggedIn) {
        return {
          success: false,
          error: 'Login failed. Check credentials or captcha.',
        };
      }

      // Extract agent name
      const agentName =
        $('.agent-name, #agentName, .user-name').first().text().trim() ||
        $('span:contains("Welcome")').text().replace('Welcome', '').trim();

      logger.info(`Login successful for agent: ${agentId}`);
      return { success: true, agentName: agentName || agentId };
    } catch (error) {
      logger.error(`Login failed: ${error}`);
      throw new Error('Login request failed');
    }
  }

  async fetchDashboardData(
    cookieJar: CookieJar
  ): Promise<Record<string, unknown>> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(
        `${BASE_URL}/corp/DashboardController`,
        {
          params: {
            FORMSGROUP_ID__: 'DashboardFG',
            START_TRAN_FLAG: 'Y',
            FG_BUTTONS: 'LOAD',
            'ACTION.LOAD': 'Y',
          },
        }
      );

      return this.parseDashboard(response.data);
    } catch (error) {
      logger.error(`Dashboard fetch failed: ${error}`);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  private parseDashboard(html: string): Record<string, unknown> {
    const $ = cheerio.load(html);

    // Parse dashboard statistics
    const stats: Record<string, string | number> = {};

    // Extract numbers from dashboard cards/widgets
    $('[class*="count"], [class*="total"], [class*="stat"]').each((_, el) => {
      const label = $(el).find('[class*="label"], [class*="title"]').text().trim();
      const value = $(el).find('[class*="value"], [class*="count"]').text().trim();
      if (label && value) stats[label] = value;
    });

    // Try table-based extraction
    const tableData: Array<Record<string, string>> = [];
    $('table tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        tableData.push({
          label: $(cells[0]).text().trim(),
          value: $(cells[1]).text().trim(),
        });
      }
    });

    return {
      stats,
      tableData,
      rawLength: html.length,
    };
  }

  async fetchAccounts(
    cookieJar: CookieJar,
    accountType: string = 'RD'
  ): Promise<unknown[]> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.post(
        `${BASE_URL}/corp/AccountListController`,
        new URLSearchParams({
          FORMSGROUP_ID__: 'AccountListFG',
          FG_BUTTONS: 'SEARCH',
          'ACTION.SEARCH': 'Y',
          'AccountListFG.ACCOUNT_TYPE': accountType,
          BANK_ID: 'DOP',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return this.parseAccountsList(response.data, accountType);
    } catch (error) {
      logger.error(`Accounts fetch failed: ${error}`);
      throw new Error('Failed to fetch accounts');
    }
  }

  private parseAccountsList(html: string, type: string): unknown[] {
    const $ = cheerio.load(html);
    const accounts: Array<Record<string, string>> = [];

    $('table.account-list tr, table#accountTable tr, table tr').each(
      (i, row) => {
        if (i === 0) return;
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        accounts.push({
          accountNo: $(cells[0]).text().trim(),
          accountHolder: $(cells[1]).text().trim(),
          balance: $(cells[2]).text().trim(),
          status: $(cells[3])?.text().trim() || 'Active',
          type,
        });
      }
    );

    return accounts;
  }

  async fetchCaptchaRefresh(cookieJar: CookieJar): Promise<string> {
    const client = this.createAxiosInstance(cookieJar);
    try {
      const response = await client.get(
        `${BASE_URL}/corp/AuthenticationController`,
        {
          params: {
            FORMSGROUP_ID__: 'AuthenticationFG',
            'ACTION.REFRESH_CAPTCHA': 'Y',
            FG_BUTTONS: 'REFRESH_CAPTCHA',
          },
          responseType: 'arraybuffer',
        }
      );
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch {
      throw new Error('Failed to refresh captcha');
    }
  }
}

export const portalService = new PortalService();import axios, { AxiosInstance } from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import * as cheerio from 'cheerio';
import NodeRSA from 'node-rsa';
import { logger } from '../utils/logger';

const BASE_URL = 'https://dopagent.indiapost.gov.in';
const LOGIN_URL = `${BASE_URL}/corp/AuthenticationController`;

const LOGIN_PARAMS = {
  FORMSGROUP_ID__: 'AuthenticationFG',
  START_TRAN_FLAG: 'Y',
  FG_BUTTONS: 'LOAD',
  'ACTION.LOAD': 'Y',
  'AuthenticationFG.LOGIN_FLAG': '3',
  BANK_ID: 'DOP',
  AGENT_FLAG: 'Y',
};

export interface LoginPageData {
  captchaBase64: string;
  rsaKey: string;
  hiddenFields: Record<string, string>;
  sessionCookie: string;
}

export interface LoginResult {
  success: boolean;
  sessionId?: string;
  agentName?: string;
  error?: string;
}

class PortalService {
  createAxiosInstance(cookieJar: CookieJar): AxiosInstance {
    const instance = wrapper(
      axios.create({
        jar: cookieJar,
        withCredentials: true,
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
        },
      })
    );
    return instance;
  }

  async fetchLoginPage(cookieJar: CookieJar): Promise<LoginPageData> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(LOGIN_URL, {
        params: LOGIN_PARAMS,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Extract RSA Key
      const rsaKey = this.extractRSAKey(html);

      // Extract captcha image
      const captchaBase64 = await this.extractCaptcha(client, $);

      // Extract hidden fields
      const hiddenFields = this.extractHiddenFields($);

      // Get JSESSIONID from cookies
      const cookies = await cookieJar.getCookies(BASE_URL);
      const sessionCookie =
        cookies.find((c) => c.key === 'JSESSIONID')?.value || '';

      logger.info('Login page fetched successfully');
      return { captchaBase64, rsaKey, hiddenFields, sessionCookie };
    } catch (error) {
      logger.error(`Failed to fetch login page: ${error}`);
      throw new Error('Failed to connect to India Post portal');
    }
  }

  private extractRSAKey(html: string): string {
    // Extract RSA key from JavaScript variable __JS_ENCRYPT_KEY__
    const match = html.match(/__JS_ENCRYPT_KEY__\s*=\s*["']([^"']+)["']/);
    if (!match) {
      // Try alternate pattern
      const altMatch = html.match(/var\s+rsaKey\s*=\s*["']([^"']+)["']/);
      return altMatch ? altMatch[1] : '';
    }
    return match[1];
  }

  private async extractCaptcha(
    client: AxiosInstance,
    $: cheerio.CheerioAPI
  ): Promise<string> {
    try {
      // Find captcha image src
      const captchaSrc = $('img[src*="captcha"], img[src*="CAPTCHA"]').attr(
        'src'
      );

      if (!captchaSrc) return '';

      const captchaUrl = captchaSrc.startsWith('http')
        ? captchaSrc
        : `${BASE_URL}${captchaSrc}`;

      const captchaResponse = await client.get(captchaUrl, {
        responseType: 'arraybuffer',
      });

      const base64 = Buffer.from(captchaResponse.data).toString('base64');
      const contentType =
        captchaResponse.headers['content-type'] || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      logger.error(`Captcha extraction failed: ${error}`);
      return '';
    }
  }

  private extractHiddenFields($: cheerio.CheerioAPI): Record<string, string> {
    const fields: Record<string, string> = {};
    $('input[type="hidden"]').each((_, el) => {
      const name = $(el).attr('name');
      const value = $(el).attr('value') || '';
      if (name) fields[name] = value;
    });
    return fields;
  }

  encryptPassword(password: string, rsaKeyString: string): string {
    try {
      const key = new NodeRSA();
      key.importKey(rsaKeyString, 'pkcs8-public-pem');
      key.setOptions({ encryptionScheme: 'pkcs1' });
      return key.encrypt(password, 'base64');
    } catch (error) {
      logger.error(`RSA encryption failed: ${error}`);
      throw new Error('Password encryption failed');
    }
  }

  async performLogin(
    cookieJar: CookieJar,
    agentId: string,
    encryptedPassword: string,
    captcha: string,
    hiddenFields: Record<string, string>
  ): Promise<{ success: boolean; agentName?: string; error?: string }> {
    const client = this.createAxiosInstance(cookieJar);

    const formData = new URLSearchParams({
      ...hiddenFields,
      'AuthenticationFG.USER_PRINCIPAL': agentId,
      'AuthenticationFG.ACCESS_CODE': encryptedPassword,
      'AuthenticationFG.VERIFICATION_CODE': captcha,
      'AuthenticationFG.LOGIN_FLAG': '1',
      FORMSGROUP_ID__: 'AuthenticationFG',
      FG_BUTTONS: 'SUBMIT',
      'ACTION.SUBMIT': 'Y',
      BANK_ID: 'DOP',
      AGENT_FLAG: 'Y',
    });

    try {
      const response = await client.post(LOGIN_URL, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: LOGIN_URL,
        },
        maxRedirects: 5,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Check for error messages
      const errorMsg = $(
        '.errorMessage, .error-msg, #errorMessage'
      ).first().text().trim();
      if (errorMsg) {
        return { success: false, error: errorMsg };
      }

      // Check for successful login indicators
      const isLoggedIn =
        html.includes('Logout') ||
        html.includes('logout') ||
        html.includes('Welcome') ||
        response.url?.includes('Dashboard') ||
        response.url?.includes('dashboard');

      if (!isLoggedIn) {
        return {
          success: false,
          error: 'Login failed. Check credentials or captcha.',
        };
      }

      // Extract agent name
      const agentName =
        $('.agent-name, #agentName, .user-name').first().text().trim() ||
        $('span:contains("Welcome")').text().replace('Welcome', '').trim();

      logger.info(`Login successful for agent: ${agentId}`);
      return { success: true, agentName: agentName || agentId };
    } catch (error) {
      logger.error(`Login failed: ${error}`);
      throw new Error('Login request failed');
    }
  }

  async fetchDashboardData(
    cookieJar: CookieJar
  ): Promise<Record<string, unknown>> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(
        `${BASE_URL}/corp/DashboardController`,
        {
          params: {
            FORMSGROUP_ID__: 'DashboardFG',
            START_TRAN_FLAG: 'Y',
            FG_BUTTONS: 'LOAD',
            'ACTION.LOAD': 'Y',
          },
        }
      );

      return this.parseDashboard(response.data);
    } catch (error) {
      logger.error(`Dashboard fetch failed: ${error}`);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  private parseDashboard(html: string): Record<string, unknown> {
    const $ = cheerio.load(html);

    // Parse dashboard statistics
    const stats: Record<string, string | number> = {};

    // Extract numbers from dashboard cards/widgets
    $('[class*="count"], [class*="total"], [class*="stat"]').each((_, el) => {
      const label = $(el).find('[class*="label"], [class*="title"]').text().trim();
      const value = $(el).find('[class*="value"], [class*="count"]').text().trim();
      if (label && value) stats[label] = value;
    });

    // Try table-based extraction
    const tableData: Array<Record<string, string>> = [];
    $('table tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        tableData.push({
          label: $(cells[0]).text().trim(),
          value: $(cells[1]).text().trim(),
        });
      }
    });

    return {
      stats,
      tableData,
      rawLength: html.length,
    };
  }

  async fetchAccounts(
    cookieJar: CookieJar,
    accountType: string = 'RD'
  ): Promise<unknown[]> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.post(
        `${BASE_URL}/corp/AccountListController`,
        new URLSearchParams({
          FORMSGROUP_ID__: 'AccountListFG',
          FG_BUTTONS: 'SEARCH',
          'ACTION.SEARCH': 'Y',
          'AccountListFG.ACCOUNT_TYPE': accountType,
          BANK_ID: 'DOP',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return this.parseAccountsList(response.data, accountType);
    } catch (error) {
      logger.error(`Accounts fetch failed: ${error}`);
      throw new Error('Failed to fetch accounts');
    }
  }

  private parseAccountsList(html: string, type: string): unknown[] {
    const $ = cheerio.load(html);
    const accounts: Array<Record<string, string>> = [];

    $('table.account-list tr, table#accountTable tr, table tr').each(
      (i, row) => {
        if (i === 0) return;
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        accounts.push({
          accountNo: $(cells[0]).text().trim(),
          accountHolder: $(cells[1]).text().trim(),
          balance: $(cells[2]).text().trim(),
          status: $(cells[3])?.text().trim() || 'Active',
          type,
        });
      }
    );

    return accounts;
  }

  async fetchCaptchaRefresh(cookieJar: CookieJar): Promise<string> {
    const client = this.createAxiosInstance(cookieJar);
    try {
      const response = await client.get(
        `${BASE_URL}/corp/AuthenticationController`,
        {
          params: {
            FORMSGROUP_ID__: 'AuthenticationFG',
            'ACTION.REFRESH_CAPTCHA': 'Y',
            FG_BUTTONS: 'REFRESH_CAPTCHA',
          },
          responseType: 'arraybuffer',
        }
      );
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch {
      throw new Error('Failed to refresh captcha');
    }
  }
}

export const portalService = new PortalService();import axios, { AxiosInstance } from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import * as cheerio from 'cheerio';
import NodeRSA from 'node-rsa';
import { logger } from '../utils/logger';

const BASE_URL = 'https://dopagent.indiapost.gov.in';
const LOGIN_URL = `${BASE_URL}/corp/AuthenticationController`;

const LOGIN_PARAMS = {
  FORMSGROUP_ID__: 'AuthenticationFG',
  START_TRAN_FLAG: 'Y',
  FG_BUTTONS: 'LOAD',
  'ACTION.LOAD': 'Y',
  'AuthenticationFG.LOGIN_FLAG': '3',
  BANK_ID: 'DOP',
  AGENT_FLAG: 'Y',
};

export interface LoginPageData {
  captchaBase64: string;
  rsaKey: string;
  hiddenFields: Record<string, string>;
  sessionCookie: string;
}

export interface LoginResult {
  success: boolean;
  sessionId?: string;
  agentName?: string;
  error?: string;
}

class PortalService {
  createAxiosInstance(cookieJar: CookieJar): AxiosInstance {
    const instance = wrapper(
      axios.create({
        jar: cookieJar,
        withCredentials: true,
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
        },
      })
    );
    return instance;
  }

  async fetchLoginPage(cookieJar: CookieJar): Promise<LoginPageData> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(LOGIN_URL, {
        params: LOGIN_PARAMS,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Extract RSA Key
      const rsaKey = this.extractRSAKey(html);

      // Extract captcha image
      const captchaBase64 = await this.extractCaptcha(client, $);

      // Extract hidden fields
      const hiddenFields = this.extractHiddenFields($);

      // Get JSESSIONID from cookies
      const cookies = await cookieJar.getCookies(BASE_URL);
      const sessionCookie =
        cookies.find((c) => c.key === 'JSESSIONID')?.value || '';

      logger.info('Login page fetched successfully');
      return { captchaBase64, rsaKey, hiddenFields, sessionCookie };
    } catch (error) {
      logger.error(`Failed to fetch login page: ${error}`);
      throw new Error('Failed to connect to India Post portal');
    }
  }

  private extractRSAKey(html: string): string {
    // Extract RSA key from JavaScript variable __JS_ENCRYPT_KEY__
    const match = html.match(/__JS_ENCRYPT_KEY__\s*=\s*["']([^"']+)["']/);
    if (!match) {
      // Try alternate pattern
      const altMatch = html.match(/var\s+rsaKey\s*=\s*["']([^"']+)["']/);
      return altMatch ? altMatch[1] : '';
    }
    return match[1];
  }

  private async extractCaptcha(
    client: AxiosInstance,
    $: cheerio.CheerioAPI
  ): Promise<string> {
    try {
      // Find captcha image src
      const captchaSrc = $('img[src*="captcha"], img[src*="CAPTCHA"]').attr(
        'src'
      );

      if (!captchaSrc) return '';

      const captchaUrl = captchaSrc.startsWith('http')
        ? captchaSrc
        : `${BASE_URL}${captchaSrc}`;

      const captchaResponse = await client.get(captchaUrl, {
        responseType: 'arraybuffer',
      });

      const base64 = Buffer.from(captchaResponse.data).toString('base64');
      const contentType =
        captchaResponse.headers['content-type'] || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      logger.error(`Captcha extraction failed: ${error}`);
      return '';
    }
  }

  private extractHiddenFields($: cheerio.CheerioAPI): Record<string, string> {
    const fields: Record<string, string> = {};
    $('input[type="hidden"]').each((_, el) => {
      const name = $(el).attr('name');
      const value = $(el).attr('value') || '';
      if (name) fields[name] = value;
    });
    return fields;
  }

  encryptPassword(password: string, rsaKeyString: string): string {
    try {
      const key = new NodeRSA();
      key.importKey(rsaKeyString, 'pkcs8-public-pem');
      key.setOptions({ encryptionScheme: 'pkcs1' });
      return key.encrypt(password, 'base64');
    } catch (error) {
      logger.error(`RSA encryption failed: ${error}`);
      throw new Error('Password encryption failed');
    }
  }

  async performLogin(
    cookieJar: CookieJar,
    agentId: string,
    encryptedPassword: string,
    captcha: string,
    hiddenFields: Record<string, string>
  ): Promise<{ success: boolean; agentName?: string; error?: string }> {
    const client = this.createAxiosInstance(cookieJar);

    const formData = new URLSearchParams({
      ...hiddenFields,
      'AuthenticationFG.USER_PRINCIPAL': agentId,
      'AuthenticationFG.ACCESS_CODE': encryptedPassword,
      'AuthenticationFG.VERIFICATION_CODE': captcha,
      'AuthenticationFG.LOGIN_FLAG': '1',
      FORMSGROUP_ID__: 'AuthenticationFG',
      FG_BUTTONS: 'SUBMIT',
      'ACTION.SUBMIT': 'Y',
      BANK_ID: 'DOP',
      AGENT_FLAG: 'Y',
    });

    try {
      const response = await client.post(LOGIN_URL, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: LOGIN_URL,
        },
        maxRedirects: 5,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Check for error messages
      const errorMsg = $(
        '.errorMessage, .error-msg, #errorMessage'
      ).first().text().trim();
      if (errorMsg) {
        return { success: false, error: errorMsg };
      }

      // Check for successful login indicators
      const isLoggedIn =
        html.includes('Logout') ||
        html.includes('logout') ||
        html.includes('Welcome') ||
        response.url?.includes('Dashboard') ||
        response.url?.includes('dashboard');

      if (!isLoggedIn) {
        return {
          success: false,
          error: 'Login failed. Check credentials or captcha.',
        };
      }

      // Extract agent name
      const agentName =
        $('.agent-name, #agentName, .user-name').first().text().trim() ||
        $('span:contains("Welcome")').text().replace('Welcome', '').trim();

      logger.info(`Login successful for agent: ${agentId}`);
      return { success: true, agentName: agentName || agentId };
    } catch (error) {
      logger.error(`Login failed: ${error}`);
      throw new Error('Login request failed');
    }
  }

  async fetchDashboardData(
    cookieJar: CookieJar
  ): Promise<Record<string, unknown>> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(
        `${BASE_URL}/corp/DashboardController`,
        {
          params: {
            FORMSGROUP_ID__: 'DashboardFG',
            START_TRAN_FLAG: 'Y',
            FG_BUTTONS: 'LOAD',
            'ACTION.LOAD': 'Y',
          },
        }
      );

      return this.parseDashboard(response.data);
    } catch (error) {
      logger.error(`Dashboard fetch failed: ${error}`);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  private parseDashboard(html: string): Record<string, unknown> {
    const $ = cheerio.load(html);

    // Parse dashboard statistics
    const stats: Record<string, string | number> = {};

    // Extract numbers from dashboard cards/widgets
    $('[class*="count"], [class*="total"], [class*="stat"]').each((_, el) => {
      const label = $(el).find('[class*="label"], [class*="title"]').text().trim();
      const value = $(el).find('[class*="value"], [class*="count"]').text().trim();
      if (label && value) stats[label] = value;
    });

    // Try table-based extraction
    const tableData: Array<Record<string, string>> = [];
    $('table tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        tableData.push({
          label: $(cells[0]).text().trim(),
          value: $(cells[1]).text().trim(),
        });
      }
    });

    return {
      stats,
      tableData,
      rawLength: html.length,
    };
  }

  async fetchAccounts(
    cookieJar: CookieJar,
    accountType: string = 'RD'
  ): Promise<unknown[]> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.post(
        `${BASE_URL}/corp/AccountListController`,
        new URLSearchParams({
          FORMSGROUP_ID__: 'AccountListFG',
          FG_BUTTONS: 'SEARCH',
          'ACTION.SEARCH': 'Y',
          'AccountListFG.ACCOUNT_TYPE': accountType,
          BANK_ID: 'DOP',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return this.parseAccountsList(response.data, accountType);
    } catch (error) {
      logger.error(`Accounts fetch failed: ${error}`);
      throw new Error('Failed to fetch accounts');
    }
  }

  private parseAccountsList(html: string, type: string): unknown[] {
    const $ = cheerio.load(html);
    const accounts: Array<Record<string, string>> = [];

    $('table.account-list tr, table#accountTable tr, table tr').each(
      (i, row) => {
        if (i === 0) return;
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        accounts.push({
          accountNo: $(cells[0]).text().trim(),
          accountHolder: $(cells[1]).text().trim(),
          balance: $(cells[2]).text().trim(),
          status: $(cells[3])?.text().trim() || 'Active',
          type,
        });
      }
    );

    return accounts;
  }

  async fetchCaptchaRefresh(cookieJar: CookieJar): Promise<string> {
    const client = this.createAxiosInstance(cookieJar);
    try {
      const response = await client.get(
        `${BASE_URL}/corp/AuthenticationController`,
        {
          params: {
            FORMSGROUP_ID__: 'AuthenticationFG',
            'ACTION.REFRESH_CAPTCHA': 'Y',
            FG_BUTTONS: 'REFRESH_CAPTCHA',
          },
          responseType: 'arraybuffer',
        }
      );
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch {
      throw new Error('Failed to refresh captcha');
    }
  }
}

export const portalService = new PortalService();import axios, { AxiosInstance } from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import * as cheerio from 'cheerio';
import NodeRSA from 'node-rsa';
import { logger } from '../utils/logger';

const BASE_URL = 'https://dopagent.indiapost.gov.in';
const LOGIN_URL = `${BASE_URL}/corp/AuthenticationController`;

const LOGIN_PARAMS = {
  FORMSGROUP_ID__: 'AuthenticationFG',
  START_TRAN_FLAG: 'Y',
  FG_BUTTONS: 'LOAD',
  'ACTION.LOAD': 'Y',
  'AuthenticationFG.LOGIN_FLAG': '3',
  BANK_ID: 'DOP',
  AGENT_FLAG: 'Y',
};

export interface LoginPageData {
  captchaBase64: string;
  rsaKey: string;
  hiddenFields: Record<string, string>;
  sessionCookie: string;
}

export interface LoginResult {
  success: boolean;
  sessionId?: string;
  agentName?: string;
  error?: string;
}

class PortalService {
  createAxiosInstance(cookieJar: CookieJar): AxiosInstance {
    const instance = wrapper(
      axios.create({
        jar: cookieJar,
        withCredentials: true,
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
        },
      })
    );
    return instance;
  }

  async fetchLoginPage(cookieJar: CookieJar): Promise<LoginPageData> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(LOGIN_URL, {
        params: LOGIN_PARAMS,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Extract RSA Key
      const rsaKey = this.extractRSAKey(html);

      // Extract captcha image
      const captchaBase64 = await this.extractCaptcha(client, $);

      // Extract hidden fields
      const hiddenFields = this.extractHiddenFields($);

      // Get JSESSIONID from cookies
      const cookies = await cookieJar.getCookies(BASE_URL);
      const sessionCookie =
        cookies.find((c) => c.key === 'JSESSIONID')?.value || '';

      logger.info('Login page fetched successfully');
      return { captchaBase64, rsaKey, hiddenFields, sessionCookie };
    } catch (error) {
      logger.error(`Failed to fetch login page: ${error}`);
      throw new Error('Failed to connect to India Post portal');
    }
  }

  private extractRSAKey(html: string): string {
    // Extract RSA key from JavaScript variable __JS_ENCRYPT_KEY__
    const match = html.match(/__JS_ENCRYPT_KEY__\s*=\s*["']([^"']+)["']/);
    if (!match) {
      // Try alternate pattern
      const altMatch = html.match(/var\s+rsaKey\s*=\s*["']([^"']+)["']/);
      return altMatch ? altMatch[1] : '';
    }
    return match[1];
  }

  private async extractCaptcha(
    client: AxiosInstance,
    $: cheerio.CheerioAPI
  ): Promise<string> {
    try {
      // Find captcha image src
      const captchaSrc = $('img[src*="captcha"], img[src*="CAPTCHA"]').attr(
        'src'
      );

      if (!captchaSrc) return '';

      const captchaUrl = captchaSrc.startsWith('http')
        ? captchaSrc
        : `${BASE_URL}${captchaSrc}`;

      const captchaResponse = await client.get(captchaUrl, {
        responseType: 'arraybuffer',
      });

      const base64 = Buffer.from(captchaResponse.data).toString('base64');
      const contentType =
        captchaResponse.headers['content-type'] || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      logger.error(`Captcha extraction failed: ${error}`);
      return '';
    }
  }

  private extractHiddenFields($: cheerio.CheerioAPI): Record<string, string> {
    const fields: Record<string, string> = {};
    $('input[type="hidden"]').each((_, el) => {
      const name = $(el).attr('name');
      const value = $(el).attr('value') || '';
      if (name) fields[name] = value;
    });
    return fields;
  }

  encryptPassword(password: string, rsaKeyString: string): string {
    try {
      const key = new NodeRSA();
      key.importKey(rsaKeyString, 'pkcs8-public-pem');
      key.setOptions({ encryptionScheme: 'pkcs1' });
      return key.encrypt(password, 'base64');
    } catch (error) {
      logger.error(`RSA encryption failed: ${error}`);
      throw new Error('Password encryption failed');
    }
  }

  async performLogin(
    cookieJar: CookieJar,
    agentId: string,
    encryptedPassword: string,
    captcha: string,
    hiddenFields: Record<string, string>
  ): Promise<{ success: boolean; agentName?: string; error?: string }> {
    const client = this.createAxiosInstance(cookieJar);

    const formData = new URLSearchParams({
      ...hiddenFields,
      'AuthenticationFG.USER_PRINCIPAL': agentId,
      'AuthenticationFG.ACCESS_CODE': encryptedPassword,
      'AuthenticationFG.VERIFICATION_CODE': captcha,
      'AuthenticationFG.LOGIN_FLAG': '1',
      FORMSGROUP_ID__: 'AuthenticationFG',
      FG_BUTTONS: 'SUBMIT',
      'ACTION.SUBMIT': 'Y',
      BANK_ID: 'DOP',
      AGENT_FLAG: 'Y',
    });

    try {
      const response = await client.post(LOGIN_URL, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: LOGIN_URL,
        },
        maxRedirects: 5,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Check for error messages
      const errorMsg = $(
        '.errorMessage, .error-msg, #errorMessage'
      ).first().text().trim();
      if (errorMsg) {
        return { success: false, error: errorMsg };
      }

      // Check for successful login indicators
      const isLoggedIn =
        html.includes('Logout') ||
        html.includes('logout') ||
        html.includes('Welcome') ||
        response.url?.includes('Dashboard') ||
        response.url?.includes('dashboard');

      if (!isLoggedIn) {
        return {
          success: false,
          error: 'Login failed. Check credentials or captcha.',
        };
      }

      // Extract agent name
      const agentName =
        $('.agent-name, #agentName, .user-name').first().text().trim() ||
        $('span:contains("Welcome")').text().replace('Welcome', '').trim();

      logger.info(`Login successful for agent: ${agentId}`);
      return { success: true, agentName: agentName || agentId };
    } catch (error) {
      logger.error(`Login failed: ${error}`);
      throw new Error('Login request failed');
    }
  }

  async fetchDashboardData(
    cookieJar: CookieJar
  ): Promise<Record<string, unknown>> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(
        `${BASE_URL}/corp/DashboardController`,
        {
          params: {
            FORMSGROUP_ID__: 'DashboardFG',
            START_TRAN_FLAG: 'Y',
            FG_BUTTONS: 'LOAD',
            'ACTION.LOAD': 'Y',
          },
        }
      );

      return this.parseDashboard(response.data);
    } catch (error) {
      logger.error(`Dashboard fetch failed: ${error}`);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  private parseDashboard(html: string): Record<string, unknown> {
    const $ = cheerio.load(html);

    // Parse dashboard statistics
    const stats: Record<string, string | number> = {};

    // Extract numbers from dashboard cards/widgets
    $('[class*="count"], [class*="total"], [class*="stat"]').each((_, el) => {
      const label = $(el).find('[class*="label"], [class*="title"]').text().trim();
      const value = $(el).find('[class*="value"], [class*="count"]').text().trim();
      if (label && value) stats[label] = value;
    });

    // Try table-based extraction
    const tableData: Array<Record<string, string>> = [];
    $('table tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        tableData.push({
          label: $(cells[0]).text().trim(),
          value: $(cells[1]).text().trim(),
        });
      }
    });

    return {
      stats,
      tableData,
      rawLength: html.length,
    };
  }

  async fetchAccounts(
    cookieJar: CookieJar,
    accountType: string = 'RD'
  ): Promise<unknown[]> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.post(
        `${BASE_URL}/corp/AccountListController`,
        new URLSearchParams({
          FORMSGROUP_ID__: 'AccountListFG',
          FG_BUTTONS: 'SEARCH',
          'ACTION.SEARCH': 'Y',
          'AccountListFG.ACCOUNT_TYPE': accountType,
          BANK_ID: 'DOP',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return this.parseAccountsList(response.data, accountType);
    } catch (error) {
      logger.error(`Accounts fetch failed: ${error}`);
      throw new Error('Failed to fetch accounts');
    }
  }

  private parseAccountsList(html: string, type: string): unknown[] {
    const $ = cheerio.load(html);
    const accounts: Array<Record<string, string>> = [];

    $('table.account-list tr, table#accountTable tr, table tr').each(
      (i, row) => {
        if (i === 0) return;
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        accounts.push({
          accountNo: $(cells[0]).text().trim(),
          accountHolder: $(cells[1]).text().trim(),
          balance: $(cells[2]).text().trim(),
          status: $(cells[3])?.text().trim() || 'Active',
          type,
        });
      }
    );

    return accounts;
  }

  async fetchCaptchaRefresh(cookieJar: CookieJar): Promise<string> {
    const client = this.createAxiosInstance(cookieJar);
    try {
      const response = await client.get(
        `${BASE_URL}/corp/AuthenticationController`,
        {
          params: {
            FORMSGROUP_ID__: 'AuthenticationFG',
            'ACTION.REFRESH_CAPTCHA': 'Y',
            FG_BUTTONS: 'REFRESH_CAPTCHA',
          },
          responseType: 'arraybuffer',
        }
      );
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch {
      throw new Error('Failed to refresh captcha');
    }
  }
}

export const portalService = new PortalService();import axios, { AxiosInstance } from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import * as cheerio from 'cheerio';
import NodeRSA from 'node-rsa';
import { logger } from '../utils/logger';

const BASE_URL = 'https://dopagent.indiapost.gov.in';
const LOGIN_URL = `${BASE_URL}/corp/AuthenticationController`;

const LOGIN_PARAMS = {
  FORMSGROUP_ID__: 'AuthenticationFG',
  START_TRAN_FLAG: 'Y',
  FG_BUTTONS: 'LOAD',
  'ACTION.LOAD': 'Y',
  'AuthenticationFG.LOGIN_FLAG': '3',
  BANK_ID: 'DOP',
  AGENT_FLAG: 'Y',
};

export interface LoginPageData {
  captchaBase64: string;
  rsaKey: string;
  hiddenFields: Record<string, string>;
  sessionCookie: string;
}

export interface LoginResult {
  success: boolean;
  sessionId?: string;
  agentName?: string;
  error?: string;
}

class PortalService {
  createAxiosInstance(cookieJar: CookieJar): AxiosInstance {
    const instance = wrapper(
      axios.create({
        jar: cookieJar,
        withCredentials: true,
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
        },
      })
    );
    return instance;
  }

  async fetchLoginPage(cookieJar: CookieJar): Promise<LoginPageData> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(LOGIN_URL, {
        params: LOGIN_PARAMS,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Extract RSA Key
      const rsaKey = this.extractRSAKey(html);

      // Extract captcha image
      const captchaBase64 = await this.extractCaptcha(client, $);

      // Extract hidden fields
      const hiddenFields = this.extractHiddenFields($);

      // Get JSESSIONID from cookies
      const cookies = await cookieJar.getCookies(BASE_URL);
      const sessionCookie =
        cookies.find((c) => c.key === 'JSESSIONID')?.value || '';

      logger.info('Login page fetched successfully');
      return { captchaBase64, rsaKey, hiddenFields, sessionCookie };
    } catch (error) {
      logger.error(`Failed to fetch login page: ${error}`);
      throw new Error('Failed to connect to India Post portal');
    }
  }

  private extractRSAKey(html: string): string {
    // Extract RSA key from JavaScript variable __JS_ENCRYPT_KEY__
    const match = html.match(/__JS_ENCRYPT_KEY__\s*=\s*["']([^"']+)["']/);
    if (!match) {
      // Try alternate pattern
      const altMatch = html.match(/var\s+rsaKey\s*=\s*["']([^"']+)["']/);
      return altMatch ? altMatch[1] : '';
    }
    return match[1];
  }

  private async extractCaptcha(
    client: AxiosInstance,
    $: cheerio.CheerioAPI
  ): Promise<string> {
    try {
      // Find captcha image src
      const captchaSrc = $('img[src*="captcha"], img[src*="CAPTCHA"]').attr(
        'src'
      );

      if (!captchaSrc) return '';

      const captchaUrl = captchaSrc.startsWith('http')
        ? captchaSrc
        : `${BASE_URL}${captchaSrc}`;

      const captchaResponse = await client.get(captchaUrl, {
        responseType: 'arraybuffer',
      });

      const base64 = Buffer.from(captchaResponse.data).toString('base64');
      const contentType =
        captchaResponse.headers['content-type'] || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      logger.error(`Captcha extraction failed: ${error}`);
      return '';
    }
  }

  private extractHiddenFields($: cheerio.CheerioAPI): Record<string, string> {
    const fields: Record<string, string> = {};
    $('input[type="hidden"]').each((_, el) => {
      const name = $(el).attr('name');
      const value = $(el).attr('value') || '';
      if (name) fields[name] = value;
    });
    return fields;
  }

  encryptPassword(password: string, rsaKeyString: string): string {
    try {
      const key = new NodeRSA();
      key.importKey(rsaKeyString, 'pkcs8-public-pem');
      key.setOptions({ encryptionScheme: 'pkcs1' });
      return key.encrypt(password, 'base64');
    } catch (error) {
      logger.error(`RSA encryption failed: ${error}`);
      throw new Error('Password encryption failed');
    }
  }

  async performLogin(
    cookieJar: CookieJar,
    agentId: string,
    encryptedPassword: string,
    captcha: string,
    hiddenFields: Record<string, string>
  ): Promise<{ success: boolean; agentName?: string; error?: string }> {
    const client = this.createAxiosInstance(cookieJar);

    const formData = new URLSearchParams({
      ...hiddenFields,
      'AuthenticationFG.USER_PRINCIPAL': agentId,
      'AuthenticationFG.ACCESS_CODE': encryptedPassword,
      'AuthenticationFG.VERIFICATION_CODE': captcha,
      'AuthenticationFG.LOGIN_FLAG': '1',
      FORMSGROUP_ID__: 'AuthenticationFG',
      FG_BUTTONS: 'SUBMIT',
      'ACTION.SUBMIT': 'Y',
      BANK_ID: 'DOP',
      AGENT_FLAG: 'Y',
    });

    try {
      const response = await client.post(LOGIN_URL, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: LOGIN_URL,
        },
        maxRedirects: 5,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Check for error messages
      const errorMsg = $(
        '.errorMessage, .error-msg, #errorMessage'
      ).first().text().trim();
      if (errorMsg) {
        return { success: false, error: errorMsg };
      }

      // Check for successful login indicators
      const isLoggedIn =
        html.includes('Logout') ||
        html.includes('logout') ||
        html.includes('Welcome') ||
        response.url?.includes('Dashboard') ||
        response.url?.includes('dashboard');

      if (!isLoggedIn) {
        return {
          success: false,
          error: 'Login failed. Check credentials or captcha.',
        };
      }

      // Extract agent name
      const agentName =
        $('.agent-name, #agentName, .user-name').first().text().trim() ||
        $('span:contains("Welcome")').text().replace('Welcome', '').trim();

      logger.info(`Login successful for agent: ${agentId}`);
      return { success: true, agentName: agentName || agentId };
    } catch (error) {
      logger.error(`Login failed: ${error}`);
      throw new Error('Login request failed');
    }
  }

  async fetchDashboardData(
    cookieJar: CookieJar
  ): Promise<Record<string, unknown>> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(
        `${BASE_URL}/corp/DashboardController`,
        {
          params: {
            FORMSGROUP_ID__: 'DashboardFG',
            START_TRAN_FLAG: 'Y',
            FG_BUTTONS: 'LOAD',
            'ACTION.LOAD': 'Y',
          },
        }
      );

      return this.parseDashboard(response.data);
    } catch (error) {
      logger.error(`Dashboard fetch failed: ${error}`);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  private parseDashboard(html: string): Record<string, unknown> {
    const $ = cheerio.load(html);

    // Parse dashboard statistics
    const stats: Record<string, string | number> = {};

    // Extract numbers from dashboard cards/widgets
    $('[class*="count"], [class*="total"], [class*="stat"]').each((_, el) => {
      const label = $(el).find('[class*="label"], [class*="title"]').text().trim();
      const value = $(el).find('[class*="value"], [class*="count"]').text().trim();
      if (label && value) stats[label] = value;
    });

    // Try table-based extraction
    const tableData: Array<Record<string, string>> = [];
    $('table tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        tableData.push({
          label: $(cells[0]).text().trim(),
          value: $(cells[1]).text().trim(),
        });
      }
    });

    return {
      stats,
      tableData,
      rawLength: html.length,
    };
  }

  async fetchAccounts(
    cookieJar: CookieJar,
    accountType: string = 'RD'
  ): Promise<unknown[]> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.post(
        `${BASE_URL}/corp/AccountListController`,
        new URLSearchParams({
          FORMSGROUP_ID__: 'AccountListFG',
          FG_BUTTONS: 'SEARCH',
          'ACTION.SEARCH': 'Y',
          'AccountListFG.ACCOUNT_TYPE': accountType,
          BANK_ID: 'DOP',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return this.parseAccountsList(response.data, accountType);
    } catch (error) {
      logger.error(`Accounts fetch failed: ${error}`);
      throw new Error('Failed to fetch accounts');
    }
  }

  private parseAccountsList(html: string, type: string): unknown[] {
    const $ = cheerio.load(html);
    const accounts: Array<Record<string, string>> = [];

    $('table.account-list tr, table#accountTable tr, table tr').each(
      (i, row) => {
        if (i === 0) return;
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        accounts.push({
          accountNo: $(cells[0]).text().trim(),
          accountHolder: $(cells[1]).text().trim(),
          balance: $(cells[2]).text().trim(),
          status: $(cells[3])?.text().trim() || 'Active',
          type,
        });
      }
    );

    return accounts;
  }

  async fetchCaptchaRefresh(cookieJar: CookieJar): Promise<string> {
    const client = this.createAxiosInstance(cookieJar);
    try {
      const response = await client.get(
        `${BASE_URL}/corp/AuthenticationController`,
        {
          params: {
            FORMSGROUP_ID__: 'AuthenticationFG',
            'ACTION.REFRESH_CAPTCHA': 'Y',
            FG_BUTTONS: 'REFRESH_CAPTCHA',
          },
          responseType: 'arraybuffer',
        }
      );
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch {
      throw new Error('Failed to refresh captcha');
    }
  }
}

export const portalService = new PortalService();import axios, { AxiosInstance } from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import * as cheerio from 'cheerio';
import NodeRSA from 'node-rsa';
import { logger } from '../utils/logger';

const BASE_URL = 'https://dopagent.indiapost.gov.in';
const LOGIN_URL = `${BASE_URL}/corp/AuthenticationController`;

const LOGIN_PARAMS = {
  FORMSGROUP_ID__: 'AuthenticationFG',
  START_TRAN_FLAG: 'Y',
  FG_BUTTONS: 'LOAD',
  'ACTION.LOAD': 'Y',
  'AuthenticationFG.LOGIN_FLAG': '3',
  BANK_ID: 'DOP',
  AGENT_FLAG: 'Y',
};

export interface LoginPageData {
  captchaBase64: string;
  rsaKey: string;
  hiddenFields: Record<string, string>;
  sessionCookie: string;
}

export interface LoginResult {
  success: boolean;
  sessionId?: string;
  agentName?: string;
  error?: string;
}

class PortalService {
  createAxiosInstance(cookieJar: CookieJar): AxiosInstance {
    const instance = wrapper(
      axios.create({
        jar: cookieJar,
        withCredentials: true,
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
        },
      })
    );
    return instance;
  }

  async fetchLoginPage(cookieJar: CookieJar): Promise<LoginPageData> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(LOGIN_URL, {
        params: LOGIN_PARAMS,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Extract RSA Key
      const rsaKey = this.extractRSAKey(html);

      // Extract captcha image
      const captchaBase64 = await this.extractCaptcha(client, $);

      // Extract hidden fields
      const hiddenFields = this.extractHiddenFields($);

      // Get JSESSIONID from cookies
      const cookies = await cookieJar.getCookies(BASE_URL);
      const sessionCookie =
        cookies.find((c) => c.key === 'JSESSIONID')?.value || '';

      logger.info('Login page fetched successfully');
      return { captchaBase64, rsaKey, hiddenFields, sessionCookie };
    } catch (error) {
      logger.error(`Failed to fetch login page: ${error}`);
      throw new Error('Failed to connect to India Post portal');
    }
  }

  private extractRSAKey(html: string): string {
    // Extract RSA key from JavaScript variable __JS_ENCRYPT_KEY__
    const match = html.match(/__JS_ENCRYPT_KEY__\s*=\s*["']([^"']+)["']/);
    if (!match) {
      // Try alternate pattern
      const altMatch = html.match(/var\s+rsaKey\s*=\s*["']([^"']+)["']/);
      return altMatch ? altMatch[1] : '';
    }
    return match[1];
  }

  private async extractCaptcha(
    client: AxiosInstance,
    $: cheerio.CheerioAPI
  ): Promise<string> {
    try {
      // Find captcha image src
      const captchaSrc = $('img[src*="captcha"], img[src*="CAPTCHA"]').attr(
        'src'
      );

      if (!captchaSrc) return '';

      const captchaUrl = captchaSrc.startsWith('http')
        ? captchaSrc
        : `${BASE_URL}${captchaSrc}`;

      const captchaResponse = await client.get(captchaUrl, {
        responseType: 'arraybuffer',
      });

      const base64 = Buffer.from(captchaResponse.data).toString('base64');
      const contentType =
        captchaResponse.headers['content-type'] || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      logger.error(`Captcha extraction failed: ${error}`);
      return '';
    }
  }

  private extractHiddenFields($: cheerio.CheerioAPI): Record<string, string> {
    const fields: Record<string, string> = {};
    $('input[type="hidden"]').each((_, el) => {
      const name = $(el).attr('name');
      const value = $(el).attr('value') || '';
      if (name) fields[name] = value;
    });
    return fields;
  }

  encryptPassword(password: string, rsaKeyString: string): string {
    try {
      const key = new NodeRSA();
      key.importKey(rsaKeyString, 'pkcs8-public-pem');
      key.setOptions({ encryptionScheme: 'pkcs1' });
      return key.encrypt(password, 'base64');
    } catch (error) {
      logger.error(`RSA encryption failed: ${error}`);
      throw new Error('Password encryption failed');
    }
  }

  async performLogin(
    cookieJar: CookieJar,
    agentId: string,
    encryptedPassword: string,
    captcha: string,
    hiddenFields: Record<string, string>
  ): Promise<{ success: boolean; agentName?: string; error?: string }> {
    const client = this.createAxiosInstance(cookieJar);

    const formData = new URLSearchParams({
      ...hiddenFields,
      'AuthenticationFG.USER_PRINCIPAL': agentId,
      'AuthenticationFG.ACCESS_CODE': encryptedPassword,
      'AuthenticationFG.VERIFICATION_CODE': captcha,
      'AuthenticationFG.LOGIN_FLAG': '1',
      FORMSGROUP_ID__: 'AuthenticationFG',
      FG_BUTTONS: 'SUBMIT',
      'ACTION.SUBMIT': 'Y',
      BANK_ID: 'DOP',
      AGENT_FLAG: 'Y',
    });

    try {
      const response = await client.post(LOGIN_URL, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: LOGIN_URL,
        },
        maxRedirects: 5,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Check for error messages
      const errorMsg = $(
        '.errorMessage, .error-msg, #errorMessage'
      ).first().text().trim();
      if (errorMsg) {
        return { success: false, error: errorMsg };
      }

      // Check for successful login indicators
      const isLoggedIn =
        html.includes('Logout') ||
        html.includes('logout') ||
        html.includes('Welcome') ||
        response.url?.includes('Dashboard') ||
        response.url?.includes('dashboard');

      if (!isLoggedIn) {
        return {
          success: false,
          error: 'Login failed. Check credentials or captcha.',
        };
      }

      // Extract agent name
      const agentName =
        $('.agent-name, #agentName, .user-name').first().text().trim() ||
        $('span:contains("Welcome")').text().replace('Welcome', '').trim();

      logger.info(`Login successful for agent: ${agentId}`);
      return { success: true, agentName: agentName || agentId };
    } catch (error) {
      logger.error(`Login failed: ${error}`);
      throw new Error('Login request failed');
    }
  }

  async fetchDashboardData(
    cookieJar: CookieJar
  ): Promise<Record<string, unknown>> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(
        `${BASE_URL}/corp/DashboardController`,
        {
          params: {
            FORMSGROUP_ID__: 'DashboardFG',
            START_TRAN_FLAG: 'Y',
            FG_BUTTONS: 'LOAD',
            'ACTION.LOAD': 'Y',
          },
        }
      );

      return this.parseDashboard(response.data);
    } catch (error) {
      logger.error(`Dashboard fetch failed: ${error}`);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  private parseDashboard(html: string): Record<string, unknown> {
    const $ = cheerio.load(html);

    // Parse dashboard statistics
    const stats: Record<string, string | number> = {};

    // Extract numbers from dashboard cards/widgets
    $('[class*="count"], [class*="total"], [class*="stat"]').each((_, el) => {
      const label = $(el).find('[class*="label"], [class*="title"]').text().trim();
      const value = $(el).find('[class*="value"], [class*="count"]').text().trim();
      if (label && value) stats[label] = value;
    });

    // Try table-based extraction
    const tableData: Array<Record<string, string>> = [];
    $('table tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        tableData.push({
          label: $(cells[0]).text().trim(),
          value: $(cells[1]).text().trim(),
        });
      }
    });

    return {
      stats,
      tableData,
      rawLength: html.length,
    };
  }

  async fetchAccounts(
    cookieJar: CookieJar,
    accountType: string = 'RD'
  ): Promise<unknown[]> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.post(
        `${BASE_URL}/corp/AccountListController`,
        new URLSearchParams({
          FORMSGROUP_ID__: 'AccountListFG',
          FG_BUTTONS: 'SEARCH',
          'ACTION.SEARCH': 'Y',
          'AccountListFG.ACCOUNT_TYPE': accountType,
          BANK_ID: 'DOP',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return this.parseAccountsList(response.data, accountType);
    } catch (error) {
      logger.error(`Accounts fetch failed: ${error}`);
      throw new Error('Failed to fetch accounts');
    }
  }

  private parseAccountsList(html: string, type: string): unknown[] {
    const $ = cheerio.load(html);
    const accounts: Array<Record<string, string>> = [];

    $('table.account-list tr, table#accountTable tr, table tr').each(
      (i, row) => {
        if (i === 0) return;
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        accounts.push({
          accountNo: $(cells[0]).text().trim(),
          accountHolder: $(cells[1]).text().trim(),
          balance: $(cells[2]).text().trim(),
          status: $(cells[3])?.text().trim() || 'Active',
          type,
        });
      }
    );

    return accounts;
  }

  async fetchCaptchaRefresh(cookieJar: CookieJar): Promise<string> {
    const client = this.createAxiosInstance(cookieJar);
    try {
      const response = await client.get(
        `${BASE_URL}/corp/AuthenticationController`,
        {
          params: {
            FORMSGROUP_ID__: 'AuthenticationFG',
            'ACTION.REFRESH_CAPTCHA': 'Y',
            FG_BUTTONS: 'REFRESH_CAPTCHA',
          },
          responseType: 'arraybuffer',
        }
      );
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch {
      throw new Error('Failed to refresh captcha');
    }
  }
}

export const portalService = new PortalService();import axios, { AxiosInstance } from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import * as cheerio from 'cheerio';
import NodeRSA from 'node-rsa';
import { logger } from '../utils/logger';

const BASE_URL = 'https://dopagent.indiapost.gov.in';
const LOGIN_URL = `${BASE_URL}/corp/AuthenticationController`;

const LOGIN_PARAMS = {
  FORMSGROUP_ID__: 'AuthenticationFG',
  START_TRAN_FLAG: 'Y',
  FG_BUTTONS: 'LOAD',
  'ACTION.LOAD': 'Y',
  'AuthenticationFG.LOGIN_FLAG': '3',
  BANK_ID: 'DOP',
  AGENT_FLAG: 'Y',
};

export interface LoginPageData {
  captchaBase64: string;
  rsaKey: string;
  hiddenFields: Record<string, string>;
  sessionCookie: string;
}

export interface LoginResult {
  success: boolean;
  sessionId?: string;
  agentName?: string;
  error?: string;
}

class PortalService {
  createAxiosInstance(cookieJar: CookieJar): AxiosInstance {
    const instance = wrapper(
      axios.create({
        jar: cookieJar,
        withCredentials: true,
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
        },
      })
    );
    return instance;
  }

  async fetchLoginPage(cookieJar: CookieJar): Promise<LoginPageData> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(LOGIN_URL, {
        params: LOGIN_PARAMS,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Extract RSA Key
      const rsaKey = this.extractRSAKey(html);

      // Extract captcha image
      const captchaBase64 = await this.extractCaptcha(client, $);

      // Extract hidden fields
      const hiddenFields = this.extractHiddenFields($);

      // Get JSESSIONID from cookies
      const cookies = await cookieJar.getCookies(BASE_URL);
      const sessionCookie =
        cookies.find((c) => c.key === 'JSESSIONID')?.value || '';

      logger.info('Login page fetched successfully');
      return { captchaBase64, rsaKey, hiddenFields, sessionCookie };
    } catch (error) {
      logger.error(`Failed to fetch login page: ${error}`);
      throw new Error('Failed to connect to India Post portal');
    }
  }

  private extractRSAKey(html: string): string {
    // Extract RSA key from JavaScript variable __JS_ENCRYPT_KEY__
    const match = html.match(/__JS_ENCRYPT_KEY__\s*=\s*["']([^"']+)["']/);
    if (!match) {
      // Try alternate pattern
      const altMatch = html.match(/var\s+rsaKey\s*=\s*["']([^"']+)["']/);
      return altMatch ? altMatch[1] : '';
    }
    return match[1];
  }

  private async extractCaptcha(
    client: AxiosInstance,
    $: cheerio.CheerioAPI
  ): Promise<string> {
    try {
      // Find captcha image src
      const captchaSrc = $('img[src*="captcha"], img[src*="CAPTCHA"]').attr(
        'src'
      );

      if (!captchaSrc) return '';

      const captchaUrl = captchaSrc.startsWith('http')
        ? captchaSrc
        : `${BASE_URL}${captchaSrc}`;

      const captchaResponse = await client.get(captchaUrl, {
        responseType: 'arraybuffer',
      });

      const base64 = Buffer.from(captchaResponse.data).toString('base64');
      const contentType =
        captchaResponse.headers['content-type'] || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      logger.error(`Captcha extraction failed: ${error}`);
      return '';
    }
  }

  private extractHiddenFields($: cheerio.CheerioAPI): Record<string, string> {
    const fields: Record<string, string> = {};
    $('input[type="hidden"]').each((_, el) => {
      const name = $(el).attr('name');
      const value = $(el).attr('value') || '';
      if (name) fields[name] = value;
    });
    return fields;
  }

  encryptPassword(password: string, rsaKeyString: string): string {
    try {
      const key = new NodeRSA();
      key.importKey(rsaKeyString, 'pkcs8-public-pem');
      key.setOptions({ encryptionScheme: 'pkcs1' });
      return key.encrypt(password, 'base64');
    } catch (error) {
      logger.error(`RSA encryption failed: ${error}`);
      throw new Error('Password encryption failed');
    }
  }

  async performLogin(
    cookieJar: CookieJar,
    agentId: string,
    encryptedPassword: string,
    captcha: string,
    hiddenFields: Record<string, string>
  ): Promise<{ success: boolean; agentName?: string; error?: string }> {
    const client = this.createAxiosInstance(cookieJar);

    const formData = new URLSearchParams({
      ...hiddenFields,
      'AuthenticationFG.USER_PRINCIPAL': agentId,
      'AuthenticationFG.ACCESS_CODE': encryptedPassword,
      'AuthenticationFG.VERIFICATION_CODE': captcha,
      'AuthenticationFG.LOGIN_FLAG': '1',
      FORMSGROUP_ID__: 'AuthenticationFG',
      FG_BUTTONS: 'SUBMIT',
      'ACTION.SUBMIT': 'Y',
      BANK_ID: 'DOP',
      AGENT_FLAG: 'Y',
    });

    try {
      const response = await client.post(LOGIN_URL, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: LOGIN_URL,
        },
        maxRedirects: 5,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Check for error messages
      const errorMsg = $(
        '.errorMessage, .error-msg, #errorMessage'
      ).first().text().trim();
      if (errorMsg) {
        return { success: false, error: errorMsg };
      }

      // Check for successful login indicators
      const isLoggedIn =
        html.includes('Logout') ||
        html.includes('logout') ||
        html.includes('Welcome') ||
        response.url?.includes('Dashboard') ||
        response.url?.includes('dashboard');

      if (!isLoggedIn) {
        return {
          success: false,
          error: 'Login failed. Check credentials or captcha.',
        };
      }

      // Extract agent name
      const agentName =
        $('.agent-name, #agentName, .user-name').first().text().trim() ||
        $('span:contains("Welcome")').text().replace('Welcome', '').trim();

      logger.info(`Login successful for agent: ${agentId}`);
      return { success: true, agentName: agentName || agentId };
    } catch (error) {
      logger.error(`Login failed: ${error}`);
      throw new Error('Login request failed');
    }
  }

  async fetchDashboardData(
    cookieJar: CookieJar
  ): Promise<Record<string, unknown>> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(
        `${BASE_URL}/corp/DashboardController`,
        {
          params: {
            FORMSGROUP_ID__: 'DashboardFG',
            START_TRAN_FLAG: 'Y',
            FG_BUTTONS: 'LOAD',
            'ACTION.LOAD': 'Y',
          },
        }
      );

      return this.parseDashboard(response.data);
    } catch (error) {
      logger.error(`Dashboard fetch failed: ${error}`);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  private parseDashboard(html: string): Record<string, unknown> {
    const $ = cheerio.load(html);

    // Parse dashboard statistics
    const stats: Record<string, string | number> = {};

    // Extract numbers from dashboard cards/widgets
    $('[class*="count"], [class*="total"], [class*="stat"]').each((_, el) => {
      const label = $(el).find('[class*="label"], [class*="title"]').text().trim();
      const value = $(el).find('[class*="value"], [class*="count"]').text().trim();
      if (label && value) stats[label] = value;
    });

    // Try table-based extraction
    const tableData: Array<Record<string, string>> = [];
    $('table tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        tableData.push({
          label: $(cells[0]).text().trim(),
          value: $(cells[1]).text().trim(),
        });
      }
    });

    return {
      stats,
      tableData,
      rawLength: html.length,
    };
  }

  async fetchAccounts(
    cookieJar: CookieJar,
    accountType: string = 'RD'
  ): Promise<unknown[]> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.post(
        `${BASE_URL}/corp/AccountListController`,
        new URLSearchParams({
          FORMSGROUP_ID__: 'AccountListFG',
          FG_BUTTONS: 'SEARCH',
          'ACTION.SEARCH': 'Y',
          'AccountListFG.ACCOUNT_TYPE': accountType,
          BANK_ID: 'DOP',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return this.parseAccountsList(response.data, accountType);
    } catch (error) {
      logger.error(`Accounts fetch failed: ${error}`);
      throw new Error('Failed to fetch accounts');
    }
  }

  private parseAccountsList(html: string, type: string): unknown[] {
    const $ = cheerio.load(html);
    const accounts: Array<Record<string, string>> = [];

    $('table.account-list tr, table#accountTable tr, table tr').each(
      (i, row) => {
        if (i === 0) return;
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        accounts.push({
          accountNo: $(cells[0]).text().trim(),
          accountHolder: $(cells[1]).text().trim(),
          balance: $(cells[2]).text().trim(),
          status: $(cells[3])?.text().trim() || 'Active',
          type,
        });
      }
    );

    return accounts;
  }

  async fetchCaptchaRefresh(cookieJar: CookieJar): Promise<string> {
    const client = this.createAxiosInstance(cookieJar);
    try {
      const response = await client.get(
        `${BASE_URL}/corp/AuthenticationController`,
        {
          params: {
            FORMSGROUP_ID__: 'AuthenticationFG',
            'ACTION.REFRESH_CAPTCHA': 'Y',
            FG_BUTTONS: 'REFRESH_CAPTCHA',
          },
          responseType: 'arraybuffer',
        }
      );
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch {
      throw new Error('Failed to refresh captcha');
    }
  }
}

export const portalService = new PortalService();import axios, { AxiosInstance } from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import * as cheerio from 'cheerio';
import NodeRSA from 'node-rsa';
import { logger } from '../utils/logger';

const BASE_URL = 'https://dopagent.indiapost.gov.in';
const LOGIN_URL = `${BASE_URL}/corp/AuthenticationController`;

const LOGIN_PARAMS = {
  FORMSGROUP_ID__: 'AuthenticationFG',
  START_TRAN_FLAG: 'Y',
  FG_BUTTONS: 'LOAD',
  'ACTION.LOAD': 'Y',
  'AuthenticationFG.LOGIN_FLAG': '3',
  BANK_ID: 'DOP',
  AGENT_FLAG: 'Y',
};

export interface LoginPageData {
  captchaBase64: string;
  rsaKey: string;
  hiddenFields: Record<string, string>;
  sessionCookie: string;
}

export interface LoginResult {
  success: boolean;
  sessionId?: string;
  agentName?: string;
  error?: string;
}

class PortalService {
  createAxiosInstance(cookieJar: CookieJar): AxiosInstance {
    const instance = wrapper(
      axios.create({
        jar: cookieJar,
        withCredentials: true,
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
        },
      })
    );
    return instance;
  }

  async fetchLoginPage(cookieJar: CookieJar): Promise<LoginPageData> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(LOGIN_URL, {
        params: LOGIN_PARAMS,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Extract RSA Key
      const rsaKey = this.extractRSAKey(html);

      // Extract captcha image
      const captchaBase64 = await this.extractCaptcha(client, $);

      // Extract hidden fields
      const hiddenFields = this.extractHiddenFields($);

      // Get JSESSIONID from cookies
      const cookies = await cookieJar.getCookies(BASE_URL);
      const sessionCookie =
        cookies.find((c) => c.key === 'JSESSIONID')?.value || '';

      logger.info('Login page fetched successfully');
      return { captchaBase64, rsaKey, hiddenFields, sessionCookie };
    } catch (error) {
      logger.error(`Failed to fetch login page: ${error}`);
      throw new Error('Failed to connect to India Post portal');
    }
  }

  private extractRSAKey(html: string): string {
    // Extract RSA key from JavaScript variable __JS_ENCRYPT_KEY__
    const match = html.match(/__JS_ENCRYPT_KEY__\s*=\s*["']([^"']+)["']/);
    if (!match) {
      // Try alternate pattern
      const altMatch = html.match(/var\s+rsaKey\s*=\s*["']([^"']+)["']/);
      return altMatch ? altMatch[1] : '';
    }
    return match[1];
  }

  private async extractCaptcha(
    client: AxiosInstance,
    $: cheerio.CheerioAPI
  ): Promise<string> {
    try {
      // Find captcha image src
      const captchaSrc = $('img[src*="captcha"], img[src*="CAPTCHA"]').attr(
        'src'
      );

      if (!captchaSrc) return '';

      const captchaUrl = captchaSrc.startsWith('http')
        ? captchaSrc
        : `${BASE_URL}${captchaSrc}`;

      const captchaResponse = await client.get(captchaUrl, {
        responseType: 'arraybuffer',
      });

      const base64 = Buffer.from(captchaResponse.data).toString('base64');
      const contentType =
        captchaResponse.headers['content-type'] || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      logger.error(`Captcha extraction failed: ${error}`);
      return '';
    }
  }

  private extractHiddenFields($: cheerio.CheerioAPI): Record<string, string> {
    const fields: Record<string, string> = {};
    $('input[type="hidden"]').each((_, el) => {
      const name = $(el).attr('name');
      const value = $(el).attr('value') || '';
      if (name) fields[name] = value;
    });
    return fields;
  }

  encryptPassword(password: string, rsaKeyString: string): string {
    try {
      const key = new NodeRSA();
      key.importKey(rsaKeyString, 'pkcs8-public-pem');
      key.setOptions({ encryptionScheme: 'pkcs1' });
      return key.encrypt(password, 'base64');
    } catch (error) {
      logger.error(`RSA encryption failed: ${error}`);
      throw new Error('Password encryption failed');
    }
  }

  async performLogin(
    cookieJar: CookieJar,
    agentId: string,
    encryptedPassword: string,
    captcha: string,
    hiddenFields: Record<string, string>
  ): Promise<{ success: boolean; agentName?: string; error?: string }> {
    const client = this.createAxiosInstance(cookieJar);

    const formData = new URLSearchParams({
      ...hiddenFields,
      'AuthenticationFG.USER_PRINCIPAL': agentId,
      'AuthenticationFG.ACCESS_CODE': encryptedPassword,
      'AuthenticationFG.VERIFICATION_CODE': captcha,
      'AuthenticationFG.LOGIN_FLAG': '1',
      FORMSGROUP_ID__: 'AuthenticationFG',
      FG_BUTTONS: 'SUBMIT',
      'ACTION.SUBMIT': 'Y',
      BANK_ID: 'DOP',
      AGENT_FLAG: 'Y',
    });

    try {
      const response = await client.post(LOGIN_URL, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: LOGIN_URL,
        },
        maxRedirects: 5,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // Check for error messages
      const errorMsg = $(
        '.errorMessage, .error-msg, #errorMessage'
      ).first().text().trim();
      if (errorMsg) {
        return { success: false, error: errorMsg };
      }

      // Check for successful login indicators
      const isLoggedIn =
        html.includes('Logout') ||
        html.includes('logout') ||
        html.includes('Welcome') ||
        response.url?.includes('Dashboard') ||
        response.url?.includes('dashboard');

      if (!isLoggedIn) {
        return {
          success: false,
          error: 'Login failed. Check credentials or captcha.',
        };
      }

      // Extract agent name
      const agentName =
        $('.agent-name, #agentName, .user-name').first().text().trim() ||
        $('span:contains("Welcome")').text().replace('Welcome', '').trim();

      logger.info(`Login successful for agent: ${agentId}`);
      return { success: true, agentName: agentName || agentId };
    } catch (error) {
      logger.error(`Login failed: ${error}`);
      throw new Error('Login request failed');
    }
  }

  async fetchDashboardData(
    cookieJar: CookieJar
  ): Promise<Record<string, unknown>> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.get(
        `${BASE_URL}/corp/DashboardController`,
        {
          params: {
            FORMSGROUP_ID__: 'DashboardFG',
            START_TRAN_FLAG: 'Y',
            FG_BUTTONS: 'LOAD',
            'ACTION.LOAD': 'Y',
          },
        }
      );

      return this.parseDashboard(response.data);
    } catch (error) {
      logger.error(`Dashboard fetch failed: ${error}`);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  private parseDashboard(html: string): Record<string, unknown> {
    const $ = cheerio.load(html);

    // Parse dashboard statistics
    const stats: Record<string, string | number> = {};

    // Extract numbers from dashboard cards/widgets
    $('[class*="count"], [class*="total"], [class*="stat"]').each((_, el) => {
      const label = $(el).find('[class*="label"], [class*="title"]').text().trim();
      const value = $(el).find('[class*="value"], [class*="count"]').text().trim();
      if (label && value) stats[label] = value;
    });

    // Try table-based extraction
    const tableData: Array<Record<string, string>> = [];
    $('table tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        tableData.push({
          label: $(cells[0]).text().trim(),
          value: $(cells[1]).text().trim(),
        });
      }
    });

    return {
      stats,
      tableData,
      rawLength: html.length,
    };
  }

  async fetchAccounts(
    cookieJar: CookieJar,
    accountType: string = 'RD'
  ): Promise<unknown[]> {
    const client = this.createAxiosInstance(cookieJar);

    try {
      const response = await client.post(
        `${BASE_URL}/corp/AccountListController`,
        new URLSearchParams({
          FORMSGROUP_ID__: 'AccountListFG',
          FG_BUTTONS: 'SEARCH',
          'ACTION.SEARCH': 'Y',
          'AccountListFG.ACCOUNT_TYPE': accountType,
          BANK_ID: 'DOP',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return this.parseAccountsList(response.data, accountType);
    } catch (error) {
      logger.error(`Accounts fetch failed: ${error}`);
      throw new Error('Failed to fetch accounts');
    }
  }

  private parseAccountsList(html: string, type: string): unknown[] {
    const $ = cheerio.load(html);
    const accounts: Array<Record<string, string>> = [];

    $('table.account-list tr, table#accountTable tr, table tr').each(
      (i, row) => {
        if (i === 0) return;
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        accounts.push({
          accountNo: $(cells[0]).text().trim(),
          accountHolder: $(cells[1]).text().trim(),
          balance: $(cells[2]).text().trim(),
          status: $(cells[3])?.text().trim() || 'Active',
          type,
        });
      }
    );

    return accounts;
  }

  async fetchCaptchaRefresh(cookieJar: CookieJar): Promise<string> {
    const client = this.createAxiosInstance(cookieJar);
    try {
      const response = await client.get(
        `${BASE_URL}/corp/AuthenticationController`,
        {
          params: {
            FORMSGROUP_ID__: 'AuthenticationFG',
            'ACTION.REFRESH_CAPTCHA': 'Y',
            FG_BUTTONS: 'REFRESH_CAPTCHA',
          },
          responseType: 'arraybuffer',
        }
      );
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch {
      throw new Error('Failed to refresh captcha');
    }
  }
}

export const portalService = new PortalService();
