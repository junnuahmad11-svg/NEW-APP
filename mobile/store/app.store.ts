import { create } from 'zustand';

export interface Account {
  accountNo: string;
  accountHolder: string;
  balance: string;
  status: 'Active' | 'Inactive' | 'Matured' | 'Closed';
  type: 'RD' | 'TD' | 'MIS' | 'KVP' | 'NSC';
  monthlyInstallment?: string;
  openDate?: string;
  maturityDate?: string;
  dueDate?: string;
}

export interface DashboardData {
  totalAccounts: number;
  activeAccounts: number;
  dueToday: number;
  pendingAmount: string;
  thisMonthCollection: string;
  thisMonthCommission: string;
}

interface AppState {
  accounts: Account[];
  dashboardData: DashboardData | null;
  selectedAccountType: 'RD' | 'TD' | 'MIS' | 'KVP' | 'NSC';
  isRefreshing: boolean;

  setAccounts: (accounts: Account[]) => void;
  setDashboardData: (data: DashboardData) => void;
  setSelectedAccountType: (type: 'RD' | 'TD' | 'MIS' | 'KVP' | 'NSC') => void;
  setRefreshing: (refreshing: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  accounts: [],
  dashboardData: null,
  selectedAccountType: 'RD',
  isRefreshing: false,

  setAccounts: (accounts) => set({ accounts }),
  setDashboardData: (data) => set({ dashboardData: data }),
  setSelectedAccountType: (type) => set({ selectedAccountType: type }),
  setRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
}));
