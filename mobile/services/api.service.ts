import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Request interceptor - attach session
    this.client.interceptors.request.use(async (config) => {
      const sessionId = await SecureStore.getItemAsync('sessionId');
      if (sessionId) {
        config.headers['x-session-id'] = sessionId;
      }
      return config;
    });

    // Response interceptor - handle session expiry
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (
          error.response?.status === 401 &&
          error.response?.data?.code === 'SESSION_EXPIRED'
        ) {
          // Clear stored session
          await SecureStore.deleteItemAsync('sessionId');
          // Signal session expiry (handled by app)
          error.isSessionExpired = true;
        }
        return Promise.reject(error);
      }
    );
  }

  // ─── Auth ────────────────────────────────────────────────────────────────
  async initLogin() {
    const { data } = await this.client.get('/auth/init');
    return data;
  }

  async refreshCaptcha(tempToken: string) {
    const { data } = await this.client.post('/auth/refresh-captcha', { tempToken });
    return data;
  }

  async login(payload: {
    tempToken: string;
    agentId: string;
    password: string;
    captcha: string;
  }) {
    const { data } = await this.client.post('/auth/login', payload);
    return data;
  }

  async logout(sessionId: string) {
    const { data } = await this.client.post('/auth/logout', { sessionId });
    return data;
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────
  async getDashboard() {
    const { data } = await this.client.get('/dashboard');
    return data;
  }

  // ─── Accounts ────────────────────────────────────────────────────────────
  async getAccounts(type: string = 'RD') {
    const { data } = await this.client.get(`/accounts?type=${type}`);
    return data;
  }

  async getAccountDetails(accountNo: string) {
    const { data } = await this.client.get(`/accounts/${accountNo}`);
    return data;
  }

  // ─── Reports ─────────────────────────────────────────────────────────────
  async getReports(type: string, fromDate?: string, toDate?: string) {
    const { data } = await this.client.get('/reports', {
      params: { type, fromDate, toDate },
    });
    return data;
  }
}

export const apiService = new ApiService();import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Request interceptor - attach session
    this.client.interceptors.request.use(async (config) => {
      const sessionId = await SecureStore.getItemAsync('sessionId');
      if (sessionId) {
        config.headers['x-session-id'] = sessionId;
      }
      return config;
    });

    // Response interceptor - handle session expiry
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (
          error.response?.status === 401 &&
          error.response?.data?.code === 'SESSION_EXPIRED'
        ) {
          // Clear stored session
          await SecureStore.deleteItemAsync('sessionId');
          // Signal session expiry (handled by app)
          error.isSessionExpired = true;
        }
        return Promise.reject(error);
      }
    );
  }

  // ─── Auth ────────────────────────────────────────────────────────────────
  async initLogin() {
    const { data } = await this.client.get('/auth/init');
    return data;
  }

  async refreshCaptcha(tempToken: string) {
    const { data } = await this.client.post('/auth/refresh-captcha', { tempToken });
    return data;
  }

  async login(payload: {
    tempToken: string;
    agentId: string;
    password: string;
    captcha: string;
  }) {
    const { data } = await this.client.post('/auth/login', payload);
    return data;
  }

  async logout(sessionId: string) {
    const { data } = await this.client.post('/auth/logout', { sessionId });
    return data;
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────
  async getDashboard() {
    const { data } = await this.client.get('/dashboard');
    return data;
  }

  // ─── Accounts ────────────────────────────────────────────────────────────
  async getAccounts(type: string = 'RD') {
    const { data } = await this.client.get(`/accounts?type=${type}`);
    return data;
  }

  async getAccountDetails(accountNo: string) {
    const { data } = await this.client.get(`/accounts/${accountNo}`);
    return data;
  }

  // ─── Reports ─────────────────────────────────────────────────────────────
  async getReports(type: string, fromDate?: string, toDate?: string) {
    const { data } = await this.client.get('/reports', {
      params: { type, fromDate, toDate },
    });
    return data;
  }
}

export const apiService = new ApiService();
