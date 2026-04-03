import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  UserPreference,
  PersonalizationParams,
  PERSONALIZATION_WEIGHTS,
  TrendItem,
} from '../types';

const W = PERSONALIZATION_WEIGHTS;

// 개인화 점수 계산
export function calculatePersonalizationScore(params: PersonalizationParams): number {
  const { searchCount, recentFrequency, consecutiveDays, daysSinceLastSearch } = params;

  const countScore = searchCount * W.COUNT_WEIGHT;
  const frequencyScore = recentFrequency * W.FREQUENCY_WEIGHT;
  const consecutiveBonus = consecutiveDays * W.CONSECUTIVE_BONUS;

  const rawScore = countScore + frequencyScore + consecutiveBonus;

  // 시간 감쇠 적용
  const decayedScore = rawScore * Math.pow(W.TIME_DECAY_FACTOR, daysSinceLastSearch);

  return Math.round(decayedScore * 100) / 100;
}

// 검색 이력 저장 및 개인화 점수 업데이트
export async function recordSearch(uid: string, keyword: string): Promise<void> {
  // 1. 검색 이력 추가
  const historyRef = collection(db, 'users', uid, 'searchHistory');
  await addDoc(historyRef, {
    keyword,
    searchedAt: serverTimestamp(),
  });

  // 2. 개인화 선호도 업데이트
  const prefRef = doc(db, 'users', uid, 'preferences', keyword);
  const prefDoc = await getDoc(prefRef);

  const now = new Date();

  if (prefDoc.exists()) {
    const data = prefDoc.data();
    const lastSearched = data.lastSearched?.toDate() || now;
    const daysSinceLast = Math.floor(
      (now.getTime() - lastSearched.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 연속 검색일 계산 (1일 이내면 연속)
    const consecutiveDays =
      daysSinceLast <= 1 ? (data.consecutiveDays || 0) + 1 : 1;

    const newCount = (data.searchCount || 0) + 1;

    // 최근 7일 내 검색 빈도 (간단히 새 카운트 기반으로 추정)
    const recentFrequency = daysSinceLast <= 7 ? newCount : 1;

    const score = calculatePersonalizationScore({
      searchCount: newCount,
      recentFrequency,
      consecutiveDays,
      daysSinceLastSearch: 0,
    });

    await setDoc(prefRef, {
      score,
      searchCount: newCount,
      consecutiveDays,
      lastSearched: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // 첫 검색
    const score = calculatePersonalizationScore({
      searchCount: 1,
      recentFrequency: 1,
      consecutiveDays: 1,
      daysSinceLastSearch: 0,
    });

    await setDoc(prefRef, {
      score,
      searchCount: 1,
      consecutiveDays: 1,
      lastSearched: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

// 개인화 순위 가져오기 (임계값 이상만)
export async function getPersonalizedRanking(uid: string): Promise<UserPreference[]> {
  const prefsRef = collection(db, 'users', uid, 'preferences');
  const q = query(prefsRef, orderBy('score', 'desc'), limit(20));
  const snapshot = await getDocs(q);

  const preferences: UserPreference[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const lastSearched = data.lastSearched?.toDate() || new Date();
    const daysSinceLast = Math.floor(
      (Date.now() - lastSearched.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 시간 감쇠 적용하여 현재 점수 재계산
    const currentScore =
      data.score * Math.pow(W.TIME_DECAY_FACTOR, daysSinceLast);

    if (currentScore >= W.THRESHOLD) {
      preferences.push({
        keyword: docSnap.id,
        score: Math.round(currentScore * 100) / 100,
        searchCount: data.searchCount,
        lastSearched,
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    }
  });

  return preferences.sort((a, b) => b.score - a.score);
}

// 개인화 + 전체 트렌드 병합 순위
export async function getMergedRanking(
  uid: string | null,
  globalTrends: TrendItem[]
): Promise<TrendItem[]> {
  if (!uid) return globalTrends;

  const personalPrefs = await getPersonalizedRanking(uid);

  if (personalPrefs.length === 0) return globalTrends;

  // 개인화 항목을 TrendItem으로 변환
  const personalTrends: TrendItem[] = personalPrefs.map((pref, index) => ({
    id: `personal_${pref.keyword}`,
    keyword: pref.keyword,
    icon: '', // 컴포넌트에서 아이콘 매핑
    rank: index + 1,
    score: pref.score,
    updatedAt: pref.updatedAt,
  }));

  // 개인화 키워드와 중복되는 전체 트렌드 제거
  const personalKeywords = new Set(personalPrefs.map((p) => p.keyword));
  const filteredGlobal = globalTrends.filter(
    (t) => !personalKeywords.has(t.keyword)
  );

  // 개인화 우선 + 나머지 전체 트렌드
  return [...personalTrends, ...filteredGlobal];
}
