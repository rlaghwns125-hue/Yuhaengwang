import {
  collection, doc, getDoc, setDoc, getDocs, addDoc,
  query, orderBy, limit, where, increment, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// 사용자 점수 정보
export interface UserScore {
  uid: string;
  email: string;
  totalScore: number;
  totalDesserts: number;
  updatedAt: Date;
}

// 도감 아이템
export interface DogamItem {
  keyword: string;
  count: number;
  lastRegistered: Date;
}

// 영수증 메뉴 아이템
export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  score: number;
}

// 영수증 분석 결과
export interface ReceiptAnalysis {
  storeName: string;
  storeAddress: string;
  category: 'dessert' | 'food' | 'unknown';
  items: ReceiptItem[];
  totalScore: number;
  error: string | null;
}

// 영수증 해시 (중복 체크용): 가게명 + 메뉴명들 + 총 금액
function buildReceiptHash(storeName: string, items: ReceiptItem[]): string {
  const itemsKey = items
    .map((it) => `${it.name}:${it.quantity}:${it.price}`)
    .sort()
    .join('|');
  return `${storeName}__${itemsKey}`;
}

// 중복 체크: 동일한 해시의 영수증이 이미 있는지
export async function isDuplicateReceipt(uid: string, storeName: string, items: ReceiptItem[]): Promise<boolean> {
  const hash = buildReceiptHash(storeName, items);
  const receiptsRef = collection(db, 'users', uid, 'receipts');
  const q = query(receiptsRef, where('hash', '==', hash));
  const snap = await getDocs(q);
  return !snap.empty;
}

// 영수증 등록 → 점수 부여
export async function registerReceipt(
  uid: string,
  storeName: string,
  storeAddress: string,
  items: ReceiptItem[]
): Promise<{ points: number; duplicate: boolean }> {
  // 중복 체크
  if (await isDuplicateReceipt(uid, storeName, items)) {
    return { points: 0, duplicate: true };
  }

  const totalPoints = items.reduce((sum, it) => sum + it.score, 0);
  const hash = buildReceiptHash(storeName, items);

  // 1. 영수증 기록 저장 (해시 포함)
  await addDoc(collection(db, 'users', uid, 'receipts'), {
    storeName,
    storeAddress,
    items,
    points: totalPoints,
    hash,
    registeredAt: Timestamp.now(),
  });

  // 2. 도감 업데이트 (메뉴별 카운트)
  for (const it of items) {
    const dogamRef = doc(db, 'users', uid, 'dogam', it.name);
    const dogamDoc = await getDoc(dogamRef);
    if (dogamDoc.exists()) {
      await setDoc(dogamRef, {
        keyword: it.name,
        count: (dogamDoc.data().count || 0) + it.quantity,
        lastRegistered: Timestamp.now(),
      });
    } else {
      await setDoc(dogamRef, {
        keyword: it.name,
        count: it.quantity,
        lastRegistered: Timestamp.now(),
      });
    }
  }

  // 3. 글로벌 디저트 DB에 신규 디저트 등록 (없으면)
  for (const it of items) {
    const globalRef = doc(db, 'dessertDB', it.name);
    const globalDoc = await getDoc(globalRef);
    if (!globalDoc.exists()) {
      await setDoc(globalRef, {
        name: it.name,
        addedFromReceipt: true,
        firstSeenAt: Timestamp.now(),
      });
    }
  }

  // 4. 사용자 총 점수 업데이트
  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
  const userScoreRef = doc(db, 'userScores', uid);
  const userScoreDoc = await getDoc(userScoreRef);
  if (userScoreDoc.exists()) {
    const data = userScoreDoc.data();
    await setDoc(userScoreRef, {
      ...data,
      totalScore: (data.totalScore || 0) + totalPoints,
      totalDesserts: (data.totalDesserts || 0) + totalQty,
      updatedAt: Timestamp.now(),
    });
  } else {
    await setDoc(userScoreRef, {
      uid,
      totalScore: totalPoints,
      totalDesserts: totalQty,
      updatedAt: Timestamp.now(),
    });
  }

  return { points: totalPoints, duplicate: false };
}

// 도감 가져오기
export async function getDogam(uid: string): Promise<DogamItem[]> {
  const dogamRef = collection(db, 'users', uid, 'dogam');
  const q = query(dogamRef, orderBy('count', 'desc'));
  const snapshot = await getDocs(q);

  const items: DogamItem[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    items.push({
      keyword: data.keyword,
      count: data.count,
      lastRegistered: data.lastRegistered?.toDate() || new Date(),
    });
  });
  return items;
}

// 내 점수 가져오기
export async function getMyScore(uid: string): Promise<UserScore | null> {
  const scoreDoc = await getDoc(doc(db, 'userScores', uid));
  if (!scoreDoc.exists()) return null;
  const data = scoreDoc.data();
  return {
    uid: data.uid,
    email: data.email || '',
    totalScore: data.totalScore || 0,
    totalDesserts: data.totalDesserts || 0,
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

// 전체 랭킹 가져오기 (동일 점수 시 먼저 달성한 사람이 윗순위)
export async function getRanking(topN: number = 50): Promise<UserScore[]> {
  const scoresRef = collection(db, 'userScores');
  const q = query(scoresRef, orderBy('totalScore', 'desc'), limit(topN * 2));
  const snapshot = await getDocs(q);

  const ranking: UserScore[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    ranking.push({
      uid: docSnap.id,
      email: data.email || '',
      totalScore: data.totalScore || 0,
      totalDesserts: data.totalDesserts || 0,
      updatedAt: data.updatedAt?.toDate() || new Date(),
    });
  });

  // 동일 점수 시 updatedAt 빠른 순 (먼저 달성한 사람 우선)
  ranking.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.updatedAt.getTime() - b.updatedAt.getTime();
  });

  return ranking.slice(0, topN);
}

// 내 등수 가져오기
export async function getMyRank(uid: string): Promise<{ rank: number; score: number } | null> {
  const ranking = await getRanking(100);
  const myIndex = ranking.findIndex((r) => r.uid === uid);
  if (myIndex === -1) return null;
  return { rank: myIndex + 1, score: ranking[myIndex].totalScore };
}
