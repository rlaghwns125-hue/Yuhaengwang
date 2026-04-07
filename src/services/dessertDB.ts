import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface DessertInfo {
  name: string;
  description: string;
  origin: string;
  taste: string;
  season: string;
  mood: string[];
  pairing: string[];
  funFact: string;
  searchTips: string[];
  relatedDesserts: string[];
}

// 특정 디저트 정보 가져오기
export async function getDessertInfo(name: string): Promise<DessertInfo | null> {
  try {
    const docSnap = await getDoc(doc(db, 'dessertDB', name));
    if (docSnap.exists()) return docSnap.data() as DessertInfo;
  } catch {}
  return null;
}

// 사용자 메시지에서 디저트 키워드 매칭
export async function findRelevantDesserts(message: string): Promise<DessertInfo[]> {
  try {
    const snap = await getDocs(collection(db, 'dessertDB'));
    const results: DessertInfo[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data() as DessertInfo;
      // 메시지에 디저트 이름이 포함되어 있으면
      if (message.includes(data.name)) {
        results.push(data);
      }
    });

    // 직접 매칭 없으면 기분/계절 매칭
    if (results.length === 0) {
      const moodKeywords: Record<string, string[]> = {
        '더워': ['여름'], '시원': ['여름'], '추워': ['겨울'], '따뜻': ['겨울'],
        '스트레스': ['달달한', '초콜릿'], '우울': ['달달한'],
        '행복': ['사계절'], '기분': ['사계절'],
        '봄': ['봄'], '여름': ['여름'], '가을': ['가을'], '겨울': ['겨울'],
      };

      const matchedMoods: string[] = [];
      for (const [keyword, moods] of Object.entries(moodKeywords)) {
        if (message.includes(keyword)) {
          matchedMoods.push(...moods);
        }
      }

      if (matchedMoods.length > 0) {
        snap.forEach((docSnap) => {
          const data = docSnap.data() as DessertInfo;
          const seasonMatch = matchedMoods.some(m => data.season?.includes(m));
          const moodMatch = matchedMoods.some(m => data.mood?.some(dm => dm.includes(m)));
          const tasteMatch = matchedMoods.some(m => data.taste?.includes(m));
          if (seasonMatch || moodMatch || tasteMatch) {
            results.push(data);
          }
        });
      }
    }

    return results.slice(0, 3); // 최대 3개
  } catch {
    return [];
  }
}

// 디저트 정보를 AI 프롬프트용 텍스트로 변환
export function dessertInfoToContext(desserts: DessertInfo[]): string {
  if (desserts.length === 0) return '';

  return '\n\n[참고 디저트 정보]\n' + desserts.map(d =>
    `- ${d.name}: ${d.description}. 맛: ${d.taste}. 계절: ${d.season}. 어울리는 음료: ${d.pairing?.join(', ')}. 재미있는 사실: ${d.funFact}`
  ).join('\n');
}
