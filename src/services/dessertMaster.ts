import {
  collection, doc, getDoc, setDoc, getDocs, addDoc,
  query, orderBy, limit, where, increment, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const POINTS_PER_DESSERT = 5;

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

// 영수증에서 추출된 디저트
export interface ReceiptResult {
  desserts: string[];
  storeName: string;
  totalPoints: number;
}

// 영수증 등록 → 점수 부여
export async function registerReceipt(
  uid: string,
  desserts: string[],
  storeName: string
): Promise<number> {
  const points = desserts.length * POINTS_PER_DESSERT;

  // 1. 영수증 기록 저장
  await addDoc(collection(db, 'users', uid, 'receipts'), {
    desserts,
    storeName,
    points,
    registeredAt: Timestamp.now(),
  });

  // 2. 도감 업데이트 (각 디저트별 카운트)
  for (const dessert of desserts) {
    const dogamRef = doc(db, 'users', uid, 'dogam', dessert);
    const dogamDoc = await getDoc(dogamRef);
    if (dogamDoc.exists()) {
      await setDoc(dogamRef, {
        keyword: dessert,
        count: (dogamDoc.data().count || 0) + 1,
        lastRegistered: Timestamp.now(),
      });
    } else {
      await setDoc(dogamRef, {
        keyword: dessert,
        count: 1,
        lastRegistered: Timestamp.now(),
      });
    }
  }

  // 3. 사용자 총 점수 업데이트
  const userScoreRef = doc(db, 'userScores', uid);
  const userScoreDoc = await getDoc(userScoreRef);
  if (userScoreDoc.exists()) {
    const data = userScoreDoc.data();
    await setDoc(userScoreRef, {
      ...data,
      totalScore: (data.totalScore || 0) + points,
      totalDesserts: (data.totalDesserts || 0) + desserts.length,
      updatedAt: Timestamp.now(),
    });
  } else {
    await setDoc(userScoreRef, {
      uid,
      totalScore: points,
      totalDesserts: desserts.length,
      updatedAt: Timestamp.now(),
    });
  }

  return points;
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

// 전체 랭킹 가져오기
export async function getRanking(topN: number = 50): Promise<UserScore[]> {
  const scoresRef = collection(db, 'userScores');
  const q = query(scoresRef, orderBy('totalScore', 'desc'), limit(topN));
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
  return ranking;
}

// 내 등수 가져오기
export async function getMyRank(uid: string): Promise<{ rank: number; score: number } | null> {
  const ranking = await getRanking(100);
  const myIndex = ranking.findIndex((r) => r.uid === uid);
  if (myIndex === -1) return null;
  return { rank: myIndex + 1, score: ranking[myIndex].totalScore };
}
