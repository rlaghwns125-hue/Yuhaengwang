const axios = require('axios');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

const SEARCH_CLIENT_ID = process.env.NAVER_SEARCH_CLIENT_ID;
const SEARCH_CLIENT_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET;

let db;
function getDb() {
  if (db) return db;
  const app = initializeApp({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
  db = getFirestore(app);
  return db;
}

const DESSERTS = [
  '크로플','마카롱','소금빵','탕후루','약과',
  '에그타르트','브라우니','젤라또','카스테라','호떡',
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 1순위: Firestore에서 상위 3개
    const firestore = getDb();
    const trendsRef = collection(firestore, 'trends');
    const q = query(trendsRef, orderBy('rank', 'asc'), limit(3));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const top3 = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        top3.push({ keyword: data.keyword, score: data.score });
      });
      return res.json({ updatedAt: new Date().toISOString(), top3, source: 'firestore' });
    }
  } catch {}

  // 2순위: 데이터랩 직접 조회
  try {
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const allResults = [];

    for (let i = 0; i < DESSERTS.length; i += 5) {
      const batch = DESSERTS.slice(i, i + 5);
      try {
        const response = await axios.post('https://openapi.naver.com/v1/datalab/search',
          { startDate, endDate, timeUnit: 'week', keywordGroups: batch.map(kw => ({ groupName: kw, keywords: [kw] })) },
          { headers: { 'X-Naver-Client-Id': SEARCH_CLIENT_ID, 'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET, 'Content-Type': 'application/json' }, timeout: 3000 }
        );
        for (const group of response.data.results) {
          const data = group.data;
          if (data.length === 0) continue;
          const latest = data[data.length - 1].ratio;
          allResults.push({ keyword: group.title, score: Math.round(latest * 100) / 100 });
        }
      } catch {}
    }
    allResults.sort((a, b) => b.score - a.score);
    res.json({ updatedAt: new Date().toISOString(), top3: allResults.slice(0, 3), source: 'datalab' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
