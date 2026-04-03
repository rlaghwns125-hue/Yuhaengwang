import { create } from 'zustand';
import { User } from '../types';
import * as authService from '../services/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.loginWithEmail(email, password);
      set({ user, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || '로그인에 실패했습니다.', isLoading: false });
    }
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.registerWithEmail(email, password);
      set({ user, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || '회원가입에 실패했습니다.', isLoading: false });
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.loginWithGoogle();
      set({ user, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || '구글 로그인에 실패했습니다.', isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      set({ user: null, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  setUser: (user) => set({ user }),
  clearError: () => set({ error: null }),
}));
