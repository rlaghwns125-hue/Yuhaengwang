import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../config/firebase';

const COOLDOWN_MS = 10 * 60 * 1000; // 10분

// 10분 내 같은 키워드 검색했는지 체크 (디바이스별)
function hasSearchedRecently(keyword: string): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    const data: Record<string, number> = JSON.parse(localStorage.getItem('search_log_times') || '{}');
    const lastTime = data[keyword] || 0;
    return Date.now() - lastTime < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markSearched(keyword: string): void {
  if (Platform.OS !== 'web') return;
  try {
    const data: Record<string, number> = JSON.parse(localStorage.getItem('search_log_times') || '{}');
    data[keyword] = Date.now();
    // 오래된 항목 정리 (1시간 이상)
    for (const k of Object.keys(data)) {
      if (Date.now() - data[k] > 3600000) delete data[k];
    }
    localStorage.setItem('search_log_times', JSON.stringify(data));
  } catch {}
}

// 검색 로그 저장 (디바이스당 하루 1회만 카운트)
export async function logSearch(keyword: string): Promise<void> {
  if (hasSearchedToday(keyword)) return; // 중복 방지

  try {
    await addDoc(collection(db, 'searchLogs'), {
      keyword,
      searchedAt: Timestamp.now(),
    });
    markSearchedToday(keyword);
  } catch {
    // 로그 저장 실패는 무시
  }
}

// 최근 24시간 인기 검색 TOP N 가져오기
export async function getPopularSearches(topN: number = 3): Promise<Array<{ keyword: string; count: number }>> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logsRef = collection(db, 'searchLogs');
    const q = query(
      logsRef,
      where('searchedAt', '>=', Timestamp.fromDate(since)),
      orderBy('searchedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const counts: Record<string, number> = {};

    snapshot.forEach((doc) => {
      const keyword = doc.data().keyword;
      counts[keyword] = (counts[keyword] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([keyword, count]) => ({ keyword, count }));
  } catch {
    return [];
  }
}
