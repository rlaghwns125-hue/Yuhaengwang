import { create } from 'zustand';
import { TrendItem, Place } from '../types';
import { getLiveTrends, getCachedTrends, getDefaultTrends } from '../services/trends';
import { searchDessertCafes } from '../services/naverSearch';
import { recordSearch } from '../services/personalization';
import { logSearch } from '../services/searchLog';

interface TrendState {
  trends: TrendItem[];
  selectedTrend: TrendItem | null;
  places: Place[];
  isLoadingTrends: boolean;
  isLoadingPlaces: boolean;
  searchQuery: string;

  loadTrends: () => Promise<void>;
  selectTrend: (trend: TrendItem, uid: string | null, locationName: string, lat?: number, lng?: number) => Promise<void>;
  searchDessert: (query: string, uid: string | null, locationName: string, lat?: number, lng?: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setPlaces: (places: Place[]) => void;
  clearPlaces: () => void;
}

export const useTrendStore = create<TrendState>((set) => ({
  trends: [],
  selectedTrend: null,
  places: [],
  isLoadingTrends: false,
  isLoadingPlaces: false,
  searchQuery: '',

  loadTrends: async () => {
    set({ isLoadingTrends: true });
    try {
      // 1순위: 네이버 데이터랩 실시간 트렌드
      let globalTrends = await getLiveTrends();
      // 2순위: Firestore 캐시
      if (globalTrends.length === 0) {
        globalTrends = await getCachedTrends();
      }
      // 3순위: 기본 폴백
      if (globalTrends.length === 0) {
        globalTrends = getDefaultTrends();
      }
      // 전국 순위만 표시 (개인화 순위는 마이페이지에서)
      set({ trends: globalTrends, isLoadingTrends: false });
    } catch {
      set({ trends: getDefaultTrends(), isLoadingTrends: false });
    }
  },

  selectTrend: async (trend, uid, locationName, lat, lng) => {
    set({ selectedTrend: trend, isLoadingPlaces: true, places: [] });
    // 검색 로그 먼저 저장 (검색 실패해도 로그는 남김)
    logSearch(trend.keyword).catch(() => {});
    if (uid) {
      recordSearch(uid, trend.keyword).catch(() => {});
    }
    try {
      const places = await searchDessertCafes(trend.keyword, locationName, lat, lng);
      set({ places, isLoadingPlaces: false });
    } catch {
      set({ isLoadingPlaces: false });
    }
  },

  searchDessert: async (query, uid, locationName, lat, lng) => {
    if (!query.trim()) return;
    set({ isLoadingPlaces: true, places: [], searchQuery: query });
    try {
      if (uid) {
        await recordSearch(uid, query);
      }
      const places = await searchDessertCafes(query, locationName, lat, lng);
      set({ places, isLoadingPlaces: false });
    } catch {
      set({ isLoadingPlaces: false });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setPlaces: (places) => set({ places, isLoadingPlaces: false }),
  clearPlaces: () => set({ places: [], selectedTrend: null }),
}));
