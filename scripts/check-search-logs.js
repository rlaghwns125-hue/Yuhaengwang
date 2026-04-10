// 검색 로그 집계 확인 스크립트
// 사용법: node scripts/check-search-logs.js [시간]
// 예: node scripts/check-search-logs.js       → 최근 24시간
//     node scripts/check-search-logs.js 72    → 최근 72시간
//     node scripts/check-search-logs.js all   → 전체

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const app = initializeApp({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function main() {
  const arg = process.argv[2];
  let since;
  let label;
  if (arg === 'all') {
    since = null; label = '전체';
  } else if (arg) {
    const hours = parseInt(arg);
    since = new Date(Date.now() - hours * 60 * 60 * 1000);
    label = `최근 ${hours}시간`;
  } else {
    // 기본: 오늘 00시 이후
    const now = new Date();
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    label = `오늘 (${since.toLocaleDateString('ko-KR')} 00시~)`;
  }

  console.log(`\n📊 검색 로그 집계 (${label})\n`);

  const snapshot = await getDocs(collection(db, 'searchLogs'));
  const counts = {};
  let total = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    const time = data.searchedAt?.toDate?.() || null;
    if (since && time && time < since) return;

    const keyword = data.keyword;
    counts[keyword] = (counts[keyword] || 0) + 1;
    total++;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  console.log(`총 ${total}건\n`);
  console.log('순위  키워드            검색 수');
  console.log('─'.repeat(38));
  sorted.forEach(([keyword, count], i) => {
    const rank = `${i + 1}`.padStart(2);
    const bar = '█'.repeat(Math.min(count, 30));
    console.log(`${rank}.  ${keyword.padEnd(14)} ${String(count).padStart(4)}회  ${bar}`);
  });
  console.log('');

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
