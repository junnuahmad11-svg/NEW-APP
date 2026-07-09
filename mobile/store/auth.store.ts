import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  sessionId: string | null;
  agentId: string | null;
  agentName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setSession: (sessionId: string, agentId: string, agentName: string) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadStoredSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  sessionId: null,
  agentId: null,
  agentName: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setSession: async (sessionId, agentId, agentName) => {
    // Store session securely
    await SecureStore.setItemAsync('sessionId', sessionId);
    await SecureStore.setItemAsync('agentId', agentId);
    await SecureStore.setItemAsync('agentName', agentName);

    set({
      sessionId,
      agentId,
      agentName,
      isAuthenticated: true,
      error: null,
    });
  },

  clearSession: async () => {
    await SecureStore.deleteItemAsync('sessionId');
    await SecureStore.deleteItemAsync('agentId');
    await SecureStore.deleteItemAsync('agentName');
    // DO NOT delete stored agentId for auto-fill

    set({
      sessionId: null,
      agentId: null,
      agentName: null,
      isAuthenticated: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadStoredSession: async () => {
    try {
      const sessionId = await SecureStore.getItemAsync('sessionId');
      const agentId = await SecureStore.getItemAsync('agentId');
      const agentName = await SecureStore.getItemAsync('agentName');

      if (sessionId && agentId) {
        set({ sessionId, agentId, agentName: agentName || '', isAuthenticated: true });
      }
    } catch {
      // Ignore secure store errors
    }
  },
}));import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  sessionId: string | null;
  agentId: string | null;
  agentName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setSession: (sessionId: string, agentId: string, agentName: string) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadStoredSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  sessionId: null,
  agentId: null,
  agentName: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setSession: async (sessionId, agentId, agentName) => {
    // Store session securely
    await SecureStore.setItemAsync('sessionId', sessionId);
    await SecureStore.setItemAsync('agentId', agentId);
    await SecureStore.setItemAsync('agentName', agentName);

    set({
      sessionId,
      agentId,
      agentName,
      isAuthenticated: true,
      error: null,
    });
  },

  clearSession: async () => {
    await SecureStore.deleteItemAsync('sessionId');
    await SecureStore.deleteItemAsync('agentId');
    await SecureStore.deleteItemAsync('agentName');
    // DO NOT delete stored agentId for auto-fill

    set({
      sessionId: null,
      agentId: null,
      agentName: null,
      isAuthenticated: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadStoredSession: async () => {
    try {
      const sessionId = await SecureStore.getItemAsync('sessionId');
      const agentId = await SecureStore.getItemAsync('agentId');
      const agentName = await SecureStore.getItemAsync('agentName');

      if (sessionId && agentId) {
        set({ sessionId, agentId, agentName: agentName || '', isAuthenticated: true });
      }
    } catch {
      // Ignore secure store errors
    }
  },
}));import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  sessionId: string | null;
  agentId: string | null;
  agentName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setSession: (sessionId: string, agentId: string, agentName: string) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadStoredSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  sessionId: null,
  agentId: null,
  agentName: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setSession: async (sessionId, agentId, agentName) => {
    // Store session securely
    await SecureStore.setItemAsync('sessionId', sessionId);
    await SecureStore.setItemAsync('agentId', agentId);
    await SecureStore.setItemAsync('agentName', agentName);

    set({
      sessionId,
      agentId,
      agentName,
      isAuthenticated: true,
      error: null,
    });
  },

  clearSession: async () => {
    await SecureStore.deleteItemAsync('sessionId');
    await SecureStore.deleteItemAsync('agentId');
    await SecureStore.deleteItemAsync('agentName');
    // DO NOT delete stored agentId for auto-fill

    set({
      sessionId: null,
      agentId: null,
      agentName: null,
      isAuthenticated: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadStoredSession: async () => {
    try {
      const sessionId = await SecureStore.getItemAsync('sessionId');
      const agentId = await SecureStore.getItemAsync('agentId');
      const agentName = await SecureStore.getItemAsync('agentName');

      if (sessionId && agentId) {
        set({ sessionId, agentId, agentName: agentName || '', isAuthenticated: true });
      }
    } catch {
      // Ignore secure store errors
    }
  },
}));import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  sessionId: string | null;
  agentId: string | null;
  agentName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setSession: (sessionId: string, agentId: string, agentName: string) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadStoredSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  sessionId: null,
  agentId: null,
  agentName: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setSession: async (sessionId, agentId, agentName) => {
    // Store session securely
    await SecureStore.setItemAsync('sessionId', sessionId);
    await SecureStore.setItemAsync('agentId', agentId);
    await SecureStore.setItemAsync('agentName', agentName);

    set({
      sessionId,
      agentId,
      agentName,
      isAuthenticated: true,
      error: null,
    });
  },

  clearSession: async () => {
    await SecureStore.deleteItemAsync('sessionId');
    await SecureStore.deleteItemAsync('agentId');
    await SecureStore.deleteItemAsync('agentName');
    // DO NOT delete stored agentId for auto-fill

    set({
      sessionId: null,
      agentId: null,
      agentName: null,
      isAuthenticated: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadStoredSession: async () => {
    try {
      const sessionId = await SecureStore.getItemAsync('sessionId');
      const agentId = await SecureStore.getItemAsync('agentId');
      const agentName = await SecureStore.getItemAsync('agentName');

      if (sessionId && agentId) {
        set({ sessionId, agentId, agentName: agentName || '', isAuthenticated: true });
      }
    } catch {
      // Ignore secure store errors
    }
  },
}));import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  sessionId: string | null;
  agentId: string | null;
  agentName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setSession: (sessionId: string, agentId: string, agentName: string) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadStoredSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  sessionId: null,
  agentId: null,
  agentName: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setSession: async (sessionId, agentId, agentName) => {
    // Store session securely
    await SecureStore.setItemAsync('sessionId', sessionId);
    await SecureStore.setItemAsync('agentId', agentId);
    await SecureStore.setItemAsync('agentName', agentName);

    set({
      sessionId,
      agentId,
      agentName,
      isAuthenticated: true,
      error: null,
    });
  },

  clearSession: async () => {
    await SecureStore.deleteItemAsync('sessionId');
    await SecureStore.deleteItemAsync('agentId');
    await SecureStore.deleteItemAsync('agentName');
    // DO NOT delete stored agentId for auto-fill

    set({
      sessionId: null,
      agentId: null,
      agentName: null,
      isAuthenticated: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadStoredSession: async () => {
    try {
      const sessionId = await SecureStore.getItemAsync('sessionId');
      const agentId = await SecureStore.getItemAsync('agentId');
      const agentName = await SecureStore.getItemAsync('agentName');

      if (sessionId && agentId) {
        set({ sessionId, agentId, agentName: agentName || '', isAuthenticated: true });
      }
    } catch {
      // Ignore secure store errors
    }
  },
}));import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  sessionId: string | null;
  agentId: string | null;
  agentName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setSession: (sessionId: string, agentId: string, agentName: string) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadStoredSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  sessionId: null,
  agentId: null,
  agentName: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setSession: async (sessionId, agentId, agentName) => {
    // Store session securely
    await SecureStore.setItemAsync('sessionId', sessionId);
    await SecureStore.setItemAsync('agentId', agentId);
    await SecureStore.setItemAsync('agentName', agentName);

    set({
      sessionId,
      agentId,
      agentName,
      isAuthenticated: true,
      error: null,
    });
  },

  clearSession: async () => {
    await SecureStore.deleteItemAsync('sessionId');
    await SecureStore.deleteItemAsync('agentId');
    await SecureStore.deleteItemAsync('agentName');
    // DO NOT delete stored agentId for auto-fill

    set({
      sessionId: null,
      agentId: null,
      agentName: null,
      isAuthenticated: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadStoredSession: async () => {
    try {
      const sessionId = await SecureStore.getItemAsync('sessionId');
      const agentId = await SecureStore.getItemAsync('agentId');
      const agentName = await SecureStore.getItemAsync('agentName');

      if (sessionId && agentId) {
        set({ sessionId, agentId, agentName: agentName || '', isAuthenticated: true });
      }
    } catch {
      // Ignore secure store errors
    }
  },
}));import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  sessionId: string | null;
  agentId: string | null;
  agentName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setSession: (sessionId: string, agentId: string, agentName: string) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadStoredSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  sessionId: null,
  agentId: null,
  agentName: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setSession: async (sessionId, agentId, agentName) => {
    // Store session securely
    await SecureStore.setItemAsync('sessionId', sessionId);
    await SecureStore.setItemAsync('agentId', agentId);
    await SecureStore.setItemAsync('agentName', agentName);

    set({
      sessionId,
      agentId,
      agentName,
      isAuthenticated: true,
      error: null,
    });
  },

  clearSession: async () => {
    await SecureStore.deleteItemAsync('sessionId');
    await SecureStore.deleteItemAsync('agentId');
    await SecureStore.deleteItemAsync('agentName');
    // DO NOT delete stored agentId for auto-fill

    set({
      sessionId: null,
      agentId: null,
      agentName: null,
      isAuthenticated: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadStoredSession: async () => {
    try {
      const sessionId = await SecureStore.getItemAsync('sessionId');
      const agentId = await SecureStore.getItemAsync('agentId');
      const agentName = await SecureStore.getItemAsync('agentName');

      if (sessionId && agentId) {
        set({ sessionId, agentId, agentName: agentName || '', isAuthenticated: true });
      }
    } catch {
      // Ignore secure store errors
    }
  },
}));import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  sessionId: string | null;
  agentId: string | null;
  agentName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setSession: (sessionId: string, agentId: string, agentName: string) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadStoredSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  sessionId: null,
  agentId: null,
  agentName: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setSession: async (sessionId, agentId, agentName) => {
    // Store session securely
    await SecureStore.setItemAsync('sessionId', sessionId);
    await SecureStore.setItemAsync('agentId', agentId);
    await SecureStore.setItemAsync('agentName', agentName);

    set({
      sessionId,
      agentId,
      agentName,
      isAuthenticated: true,
      error: null,
    });
  },

  clearSession: async () => {
    await SecureStore.deleteItemAsync('sessionId');
    await SecureStore.deleteItemAsync('agentId');
    await SecureStore.deleteItemAsync('agentName');
    // DO NOT delete stored agentId for auto-fill

    set({
      sessionId: null,
      agentId: null,
      agentName: null,
      isAuthenticated: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadStoredSession: async () => {
    try {
      const sessionId = await SecureStore.getItemAsync('sessionId');
      const agentId = await SecureStore.getItemAsync('agentId');
      const agentName = await SecureStore.getItemAsync('agentName');

      if (sessionId && agentId) {
        set({ sessionId, agentId, agentName: agentName || '', isAuthenticated: true });
      }
    } catch {
      // Ignore secure store errors
    }
  },
}));import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  sessionId: string | null;
  agentId: string | null;
  agentName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setSession: (sessionId: string, agentId: string, agentName: string) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadStoredSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  sessionId: null,
  agentId: null,
  agentName: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setSession: async (sessionId, agentId, agentName) => {
    // Store session securely
    await SecureStore.setItemAsync('sessionId', sessionId);
    await SecureStore.setItemAsync('agentId', agentId);
    await SecureStore.setItemAsync('agentName', agentName);

    set({
      sessionId,
      agentId,
      agentName,
      isAuthenticated: true,
      error: null,
    });
  },

  clearSession: async () => {
    await SecureStore.deleteItemAsync('sessionId');
    await SecureStore.deleteItemAsync('agentId');
    await SecureStore.deleteItemAsync('agentName');
    // DO NOT delete stored agentId for auto-fill

    set({
      sessionId: null,
      agentId: null,
      agentName: null,
      isAuthenticated: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadStoredSession: async () => {
    try {
      const sessionId = await SecureStore.getItemAsync('sessionId');
      const agentId = await SecureStore.getItemAsync('agentId');
      const agentName = await SecureStore.getItemAsync('agentName');

      if (sessionId && agentId) {
        set({ sessionId, agentId, agentName: agentName || '', isAuthenticated: true });
      }
    } catch {
      // Ignore secure store errors
    }
  },
}));
