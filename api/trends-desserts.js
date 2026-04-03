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

const KNOWN_DESSERTS = [
  '크로플','마카롱','소금빵','탕후루','약과','에그타르트','브라우니',
  '젤라또','카스테라','호떡','슈크림','크루아상','스콘',
  '버터떡','두쫀쿠키','휘낭시에','바스크치즈케이크',
  '밀크티','말차라떼','크레이프','소라빵','화과자',
  '마들렌','까눌레','티라미수','붕어빵',
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 1순위: Firestore에서 읽기
    const firestore = getDb();
    const trendsRef = collection(firestore, 'trends');
    const q = query(trendsRef, orderBy('rank', 'asc'), limit(15));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const trends = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        trends.push({ keyword: data.keyword, score: data.score });
      });
      return res.json({ updatedAt: new Date().toISOString(), trends, source: 'firestore' });
    }
  } catch {}

  // 2순위: 직접 데이터랩 조회 (Firestore 비어있을 때)
  try {
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const allResults = [];

    for (let i = 0; i < KNOWN_DESSERTS.length; i += 5) {
      const batch = KNOWN_DESSERTS.slice(i, i + 5);
      try {
        const response = await axios.post('https://openapi.naver.com/v1/datalab/search',
          { startDate, endDate, timeUnit: 'week', keywordGroups: batch.map(kw => ({ groupName: kw, keywords: [kw] })) },
          { headers: { 'X-Naver-Client-Id': SEARCH_CLIENT_ID, 'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET, 'Content-Type': 'application/json' }, timeout: 3000 }
        );
        for (const group of response.data.results) {
          const data = group.data;
          const recent = data.slice(-2);
          const avg = recent.length > 0 ? recent.reduce((s, d) => s + d.ratio, 0) / recent.length : 0;
          allResults.push({ keyword: group.title, score: Math.round(avg * 100) / 100 });
        }
      } catch {}
    }
    allResults.sort((a, b) => b.score - a.score);
    res.json({ updatedAt: new Date().toISOString(), trends: allResults.slice(0, 15), source: 'datalab' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
