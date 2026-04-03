import { Platform } from 'react-native';

// 네이버 API 설정
export const NAVER_CONFIG = {
  MAP_CLIENT_ID: process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID || 'YOUR_NAVER_MAP_CLIENT_ID',
  SEARCH_CLIENT_ID: process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_ID || 'YOUR_NAVER_SEARCH_CLIENT_ID',
  SEARCH_CLIENT_SECRET: process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_SECRET || 'YOUR_NAVER_SEARCH_SECRET',
  DATALAB_CLIENT_ID: process.env.EXPO_PUBLIC_NAVER_DATALAB_CLIENT_ID || 'YOUR_NAVER_DATALAB_CLIENT_ID',
  DATALAB_CLIENT_SECRET: process.env.EXPO_PUBLIC_NAVER_DATALAB_CLIENT_SECRET || 'YOUR_NAVER_DATALAB_SECRET',
};

// Claude API 설정
export const CLAUDE_CONFIG = {
  API_KEY: process.env.EXPO_PUBLIC_CLAUDE_API_KEY || 'YOUR_CLAUDE_API_KEY',
};

// 로컬 vs 배포 환경 자동 감지
function getApiBase(): string {
  if (Platform.OS !== 'web') return 'http://localhost:3001';

  const host = typeof window !== 'undefined' ? window.location.origin : '';
  // localhost면 로컬 프록시, 아니면 같은 도메인의 /api 사용
  if (host.includes('localhost')) {
    return 'http://localhost:3001';
  }
  return ''; // 배포 환경에서는 같은 도메인 /api 사용
}

const API_BASE = getApiBase();

export const API_ENDPOINTS = {
  NAVER_LOCAL_SEARCH: `${API_BASE}/api/search-local`,
  TRENDS_DESSERTS: `${API_BASE}/api/trends-desserts`,
  TRENDS_RISING: `${API_BASE}/api/trends-rising`,
  KAKAO_LOCAL_SEARCH: `${API_BASE}/api/search-kakao`,
  REVERSE_GEOCODE: `${API_BASE}/api/reverse-geocode`,
  CHAT: `${API_BASE}/api/chat`,
  ANALYZE_RECEIPT: `${API_BASE}/api/analyze-receipt`,
};
