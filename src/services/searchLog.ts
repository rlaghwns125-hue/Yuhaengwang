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

// 검색 로그 저장 (디바이스당 1분 쿨다운)
export async function logSearch(keyword: string): Promise<boolean> {
  if (hasSearchedRecently(keyword)) return false;

  try {
    await addDoc(collection(db, 'searchLogs'), {
      keyword,
      searchedAt: Timestamp.now(),
    });
    markSearched(keyword);
    return true; // 저장 성공
  } catch (e) {
    console.warn('검색 로그 저장 실패:', e);
    return false;
  }
}

// 최근 24시간 인기 검색 TOP N 가져오기
export async function getPopularSearches(topN: number = 3): Promise<Array<{ keyword: string; count: number }>> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logsRef = collection(db, 'searchLogs');
    // 단순 쿼리 (인덱스 불필요)
    const q = query(logsRef);

    const snapshot = await getDocs(q);
    const counts: Record<string, number> = {};
    const firstSeen: Record<string, number> = {};

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const time = data.searchedAt?.toDate()?.getTime() || 0;
      // 24시간 이내만
      if (time < since.getTime()) return;

      const keyword = data.keyword;
      counts[keyword] = (counts[keyword] || 0) + 1;
      if (!firstSeen[keyword] || time < firstSeen[keyword]) {
        firstSeen[keyword] = time;
      }
    });

    return Object.entries(counts)
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return (firstSeen[a[0]] || 0) - (firstSeen[b[0]] || 0);
      })
      .slice(0, topN)
      .map(([keyword, count]) => ({ keyword, count }));
  } catch {
    return [];
  }
}
