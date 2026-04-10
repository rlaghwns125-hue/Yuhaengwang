// 오래된 검색 로그 삭제 (기본: 어제 이전)
// 사용: node scripts/cleanup-search-logs.js
//       node scripts/cleanup-search-logs.js 48  → 48시간 이전 삭제

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function main() {
  const hours = parseInt(process.argv[2]) || 24;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  console.log(`\n🗑️  ${cutoff.toLocaleString('ko-KR')} 이전 로그 삭제\n`);

  const snapshot = await getDocs(collection(db, 'searchLogs'));
  let deleted = 0;

  for (const docSnap of snapshot.docs) {
    const time = docSnap.data().searchedAt?.toDate?.();
    if (time && time < cutoff) {
      await deleteDoc(doc(db, 'searchLogs', docSnap.id));
      deleted++;
    }
  }

  console.log(`삭제 완료: ${deleted}건 (전체 ${snapshot.size}건 중)\n`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
