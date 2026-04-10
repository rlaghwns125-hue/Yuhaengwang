// 사용자
export interface User {
  uid: string;
  email: string;
  nickname: string;
  provider: 'email' | 'google' | 'kakao';
  createdAt: Date;
}

// 검색 이력
export interface SearchHistory {
  id: string;
  keyword: string;
  searchedAt: Date;
}

// 개인화 선호도
export interface UserPreference {
  keyword: string;
  score: number;
  searchCount: number;
  lastSearched: Date;
  updatedAt: Date;
}

// 트렌드 아이템
export interface TrendItem {
  id: string;
  keyword: string;
  icon: string;
  rank: number;
  score: number;
  updatedAt: Date;
}

// 장소 정보
export interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  rating: number;
  imageUrl?: string;
  placeUrl?: string;
  distance?: number;
  telephone?: string;
  cachedAt: Date;
}

// 지도 마커
export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  place: Place;
}

// 마켓 등급
export type ItemRarity = 'normal' | 'rare' | 'epic' | 'unique' | 'legend';

export const RARITY_CONFIG: Record<ItemRarity, { label: string; color: string; bgColor: string; price: number }> = {
  normal: { label: '노멀', color: '#888', bgColor: '#F0F0F0', price: 500 },
  rare:   { label: '레어', color: '#4A90D9', bgColor: '#E8F0FE', price: 1000 },
  epic:   { label: '에픽', color: '#A855F7', bgColor: '#F3E8FF', price: 2000 },
  unique: { label: '유니크', color: '#F59E0B', bgColor: '#FFF8E1', price: 5000 },
  legend: { label: '레전드', color: '#EF4444', bgColor: '#FEE2E2', price: 10000 },
};

// 마켓 상품
export interface MarketItem {
  id: string;
  name: string;
  preview: string;
  price: number;
  rarity: ItemRarity;
  category: 'dessertBar' | 'dessertIcon' | 'placeList' | 'chatbot';
  description: string;
  themeData: Record<string, any>;
}

// 개인화 점수 산출 파라미터
export interface PersonalizationParams {
  searchCount: number;
  recentFrequency: number; // 최근 N일 내 검색 빈도
  consecutiveDays: number; // 연속 검색일
  daysSinceLastSearch: number; // 마지막 검색 후 경과일
}

// 개인화 점수 가중치
export const PERSONALIZATION_WEIGHTS = {
  COUNT_WEIGHT: 1.5,
  FREQUENCY_WEIGHT: 2.0,
  CONSECUTIVE_BONUS: 3.0,
  TIME_DECAY_FACTOR: 0.95, // 하루당 감쇠율
  THRESHOLD: 15, // 개인 순위에 반영되기 위한 최소 점수
} as const;
