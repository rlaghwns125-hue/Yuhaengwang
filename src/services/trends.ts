import axios from 'axios';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { TrendItem } from '../types';
import { getDessertIcon } from '../constants/desserts';
import { API_ENDPOINTS } from '../config/api';

// 네이버 데이터랩 실시간 트렌드 가져오기
export async function getLiveTrends(): Promise<TrendItem[]> {
  try {
    const response = await axios.get<{
      updatedAt: string;
      trends: Array<{ keyword: string; score: number }>;
    }>(API_ENDPOINTS.TRENDS_DESSERTS, { timeout: 120000 });

    return response.data.trends.map((item, index) => ({
      id: `trend_${item.keyword}`,
      keyword: item.keyword,
      icon: getDessertIcon(item.keyword),
      rank: index + 1,
      score: item.score,
      updatedAt: new Date(response.data.updatedAt),
    }));
  } catch (error) {
    console.warn('실시간 트렌드 가져오기 실패:', error);
    return [];
  }
}

// Firestore에서 캐싱된 트렌드 가져오기
export async function getCachedTrends(): Promise<TrendItem[]> {
  try {
    const trendsRef = collection(db, 'trends');
    const q = query(trendsRef, orderBy('rank', 'asc'), limit(30));
    const snapshot = await getDocs(q);

    const trends: TrendItem[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      trends.push({
        id: docSnap.id,
        keyword: data.keyword,
        icon: data.icon || getDessertIcon(data.keyword),
        rank: data.rank,
        score: data.score,
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });

    return trends;
  } catch {
    return [];
  }
}

// 트렌드 데이터 Firestore에 저장
export async function saveTrends(trends: Omit<TrendItem, 'id' | 'updatedAt'>[]): Promise<void> {
  for (const trend of trends) {
    const trendRef = doc(db, 'trends', trend.keyword);
    await setDoc(trendRef, {
      keyword: trend.keyword,
      icon: trend.icon || getDessertIcon(trend.keyword),
      rank: trend.rank,
      score: trend.score,
      updatedAt: serverTimestamp(),
    });
  }
}

// 기본 트렌드 데이터 (폴백용)
export function getDefaultTrends(): TrendItem[] {
  const defaultDesserts = [
    '크로플', '마카롱', '소금빵', '탕후루', '약과',
    '케이크', '도넛', '티라미수', '에클레어', '브라우니',
    '빙수', '젤라또', '타르트', '카스테라', '호떡',
  ];

  return defaultDesserts.map((keyword, index) => ({
    id: `default_${keyword}`,
    keyword,
    icon: getDessertIcon(keyword),
    rank: index + 1,
    score: 100 - index * 5,
    updatedAt: new Date(),
  }));
}
