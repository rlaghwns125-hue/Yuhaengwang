const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();
const app = express();

app.use(cors());
app.use(express.json());

// 데이터랩은 검색 API 키로 사용 (developers.naver.com)
const SEARCH_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_ID;
const SEARCH_CLIENT_SECRET = process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_SECRET;
const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
const KAKAO_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;
const MAP_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID;
const MAP_CLIENT_SECRET = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_SECRET || '';

// AI 대화 프록시
app.post('/api/chat', async (req, res) => {
  const { message, history, locationName, userLat, userLng } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  try {
    const client = new Anthropic({ apiKey: CLAUDE_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 512,
      system: `너는 "유행왕"이라는 디저트 전문 친구야. 친한 친구처럼 반말로 자연스럽게 대화해. 이모지 섞어쓰고, 날씨/기분/상황에 공감하면서 디저트를 연결해줘. 사용자 위치: "${locationName || '서울'}".

규칙 (반드시 지켜):
- 사용자가 디저트명을 언급하면 무조건 답변 끝에 [SEARCH:디저트명] 태그 붙여 (네가 모르는 디저트도 일단 붙여)
- 사용자가 가게 이름/위치를 물어보면 [PLACE:가게명] 태그 사용 (예: "오브네뜨 어디", "노티드 위치")
- 키워드는 핵심 명사만 (맛집/카페/추천/위치/알려줘 같은 단어 빼고)
- 한 답변에 SEARCH나 PLACE 중 하나만, 마지막에 한 번만`,
      messages: [...(history || []).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })), { role: 'user', content: message }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const searchMatch = text.match(/\[SEARCH:(.+?)\]/);
    const placeMatch = text.match(/\[PLACE:(.+?)\]/);
    let searchKeyword = searchMatch ? searchMatch[1].trim() : null;
    let placeName = placeMatch ? placeMatch[1].trim() : null;
    const cleanText = text.replace(/\[SEARCH:.+?\]/, '').replace(/\[PLACE:.+?\]/, '').trim();

    if (searchKeyword) searchKeyword = searchKeyword.replace(/(맛집|카페|추천|근처|주변|가게|매장|어디|위치|알려줘)/g, '').trim() || null;
    if (placeName) placeName = placeName.replace(/(위치|어디|알려줘|찾아줘)/g, '').trim() || null;

    async function searchKakao(query, useCafeCategory) {
      if (!KAKAO_KEY) return [];
      try {
        const params = { query, size: 10, sort: 'distance' };
        if (userLat && userLng) { params.x = userLng; params.y = userLat; params.radius = 20000; }
        if (useCafeCategory) params.category_group_code = 'CE7';
        const r = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
          params, headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
        });
        return r.data.documents.map((item) => ({
          id: item.id, name: item.place_name,
          address: item.road_address_name || item.address_name,
          latitude: parseFloat(item.y), longitude: parseFloat(item.x),
          category: item.category_name, rating: 0, telephone: item.phone,
          placeUrl: item.place_url,
          distance: item.distance ? parseInt(item.distance) : 0,
        }));
      } catch { return []; }
    }

    async function searchNaver(query) {
      try {
        const sr = await axios.get('https://openapi.naver.com/v1/search/local.json', {
          params: { query, display: 10, sort: 'comment' },
          headers: { 'X-Naver-Client-Id': SEARCH_CLIENT_ID, 'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET },
        });
        return sr.data.items.map((item, i) => ({
          id: `chat_${i}_${Date.now()}`, name: item.title.replace(/<[^>]*>/g, ''),
          address: item.roadAddress || item.address,
          latitude: parseInt(item.mapy) / 1e7, longitude: parseInt(item.mapx) / 1e7,
          category: item.category, rating: 0, telephone: item.telephone,
        }));
      } catch { return []; }
    }

    let places = [];
    if (placeName) {
      // 가게명 직접 검색
      places = await searchKakao(placeName, false);
      if (places.length === 0) places = await searchNaver(placeName);
    } else if (searchKeyword) {
      // 디저트 키워드 주변 카페 검색 (카테고리 → 전체 → 네이버 순)
      places = await searchKakao(searchKeyword, true);
      if (places.length === 0) places = await searchKakao(searchKeyword, false);
      if (places.length === 0) {
        const naverResults = await searchNaver(`${locationName || ''} ${searchKeyword}`.trim());
        places = naverResults.filter((p) => p.name.includes(searchKeyword));
      }
    }

    // 프랜차이즈 필터 (디저트 검색일 때만)
    if (searchKeyword && places.length > 0) {
      const FRANCHISES = ['스타벅스','투썸플레이스','투썸','이디야','메가커피','메가MGC','컴포즈커피','컴포즈','빽다방','파리바게뜨','파리바게트','뚜레쥬르','던킨','배스킨라빈스','배라','할리스','엔제리너스','커피빈','폴바셋','공차','설빙','크리스피크림'];
      const filtered = places.filter(p => !FRANCHISES.some(f => p.name.includes(f)));
      if (filtered.length > 0) places = filtered;
    }

    res.json({ reply: cleanText, searchKeyword: searchKeyword || placeName, places });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 영수증 분석 프록시
app.post('/api/analyze-receipt', async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });
  try {
    const client = new Anthropic({ apiKey: CLAUDE_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1024,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: `이 영수증을 분석해주세요.

규칙:
1. 가게명, 가게 주소 추출
2. 각 메뉴명, 수량, 단가 추출
3. 가게 카테고리 판별:
   - dessert: 카페/디저트/베이커리/아이스크림/빵집/떡집/차/음료 전문점
   - food: 일반 식당 (한식/중식/일식/양식/분식/고기/치킨/피자 등)
   - unknown: 영수증이 아니거나 판별 불가

JSON으로만 응답:
{"storeName":"","storeAddress":"","category":"dessert|food|unknown","items":[{"name":"","quantity":1,"price":0}]}

영수증 아니면:
{"storeName":"","storeAddress":"","category":"unknown","items":[],"error":"영수증을 인식할 수 없습니다"}` },
      ] }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.json({ storeName: '', storeAddress: '', category: 'unknown', items: [], error: '분석 실패' });

    const r = JSON.parse(match[0]);

    if (r.category === 'food') {
      return res.json({ storeName: r.storeName || '', storeAddress: r.storeAddress || '', category: 'food', items: [], error: '디저트/카페 영수증만 등록 가능해요! 🍰' });
    }
    if (r.category === 'unknown' || !r.items || r.items.length === 0) {
      return res.json({ storeName: r.storeName || '', storeAddress: r.storeAddress || '', category: r.category || 'unknown', items: [], error: r.error || '영수증에서 메뉴를 찾을 수 없어요' });
    }

    // 점수 계산: (수량 * 금액) / 1000, 반올림
    const items = r.items.map((it) => {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.price) || 0;
      return { name: it.name, quantity: qty, price, score: Math.round((qty * price) / 1000) };
    });
    const totalScore = items.reduce((sum, it) => sum + it.score, 0);

    res.json({ storeName: r.storeName || '', storeAddress: r.storeAddress || '', category: 'dessert', items, totalScore, error: null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 카카오 로컬 검색 프록시
app.get('/api/search-kakao', async (req, res) => {
  const { query, x, y, radius, sort, size } = req.query;
  if (!query) return res.status(400).json({ error: 'query required' });
  try {
    const response = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
      params: { query, x, y, radius: radius || 2000, sort: sort || 'distance', size: size || 15 },
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });
    res.json(response.data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// Reverse Geocoding 프록시
app.get('/api/reverse-geocode', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat, lng required' });
  try {
    const response = await axios.get('https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc', {
      params: { coords: `${lng},${lat}`, output: 'json', orders: 'roadaddr,addr' },
      headers: { 'X-NCP-APIGW-API-KEY-ID': MAP_CLIENT_ID, 'X-NCP-APIGW-API-KEY': MAP_CLIENT_SECRET },
    });
    const results = response.data.results;
    if (results && results.length > 0) {
      const r = results[0].region;
      const land = results[0].land;
      const parts = [];
      if (r.area1?.name) parts.push(r.area1.name);
      if (r.area2?.name) parts.push(r.area2.name);
      if (r.area3?.name) parts.push(r.area3.name);
      if (land?.name) parts.push(land.name);
      return res.json({ locationName: parts.join(' ') });
    }
    res.json({ locationName: '' });
  } catch (e) {
    res.json({ locationName: '' });
  }
});

// 트렌드 캐시 (1시간마다 갱신)
let trendCache = null;
let trendCacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1시간

// 네이버 지역 검색 프록시
app.get('/api/search-local', async (req, res) => {
  try {
    const response = await axios.get('https://openapi.naver.com/v1/search/local.json', {
      params: req.query,
      headers: {
        'X-Naver-Client-Id': req.headers['x-naver-client-id'],
        'X-Naver-Client-Secret': req.headers['x-naver-client-secret'],
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// 네이버 데이터랩 프록시
app.post('/api/datalab-search', async (req, res) => {
  try {
    const response = await axios.post('https://openapi.naver.com/v1/datalab/search', req.body, {
      headers: {
        'X-Naver-Client-Id': req.headers['x-naver-client-id'] || SEARCH_CLIENT_ID,
        'X-Naver-Client-Secret': req.headers['x-naver-client-secret'] || SEARCH_CLIENT_SECRET,
        'Content-Type': 'application/json',
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Step 1: 네이버 블로그 검색으로 요즘 뜨는 디저트 키워드 수집
async function collectTrendingKeywords() {
  const queries = [
    '2026 디저트 트렌드',
    '요즘 인기 디저트',
    '요즘 뜨는 디저트 카페',
    '핫한 디저트 2026',
    '디저트 신메뉴 인기',
  ];

  let allTexts = '';

  for (const query of queries) {
    try {
      const response = await axios.get('https://openapi.naver.com/v1/search/blog.json', {
        params: { query, display: 10, sort: 'date' },
        headers: {
          'X-Naver-Client-Id': SEARCH_CLIENT_ID,
          'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET,
        },
      });

      for (const item of response.data.items) {
        const text = (item.title + ' ' + item.description).replace(/<[^>]*>/g, '');
        allTexts += text + '\n';
      }
    } catch (e) {
      console.warn(`블로그 검색 실패: ${query}`);
    }
  }

  return allTexts;
}

// Step 2: Claude AI로 디저트 키워드 추출
async function extractDessertKeywords(blogTexts) {
  if (!CLAUDE_API_KEY) {
    console.warn('Claude API 키 없음, 기본 키워드 사용');
    return getDefaultKeywords();
  }

  try {
    const client = new Anthropic({ apiKey: CLAUDE_API_KEY });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `다음은 최근 네이버 블로그에서 수집한 디저트 관련 글입니다.
이 글들에서 언급된 구체적인 디저트/간식 이름을 추출해주세요.

규칙:
- "카페", "맛집" 같은 일반 단어는 제외
- "케이크", "쿠키" 같은 대분류가 아닌, "바스크치즈케이크", "두쫀쿠키", "버터떡", "크룽지" 같은 구체적인 디저트명 우선
- 대분류(케이크, 쿠키 등)도 포함하되 구체적 디저트명을 우선
- 최소 20개, 최대 40개
- JSON 배열로만 응답 (다른 텍스트 없이)

블로그 내용:
${blogTexts.slice(0, 8000)}

예시 형식: ["두쫀쿠키", "바스크치즈케이크", "크룽지", "버터떡", ...]`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const keywords = JSON.parse(match[0]);
      console.log('AI 추출 키워드:', keywords);
      return keywords;
    }
  } catch (e) {
    console.warn('Claude AI 분석 실패:', e.message);
  }

  return getDefaultKeywords();
}

function getDefaultKeywords() {
  return [
    '크로플', '마카롱', '소금빵', '탕후루', '약과',
    '케이크', '도넛', '티라미수', '에클레어', '브라우니',
    '빙수', '젤라또', '타르트', '카스테라', '호떡',
    '쿠키', '슈크림', '와플', '푸딩', '붕어빵',
  ];
}

// Step 3: 데이터랩으로 검색량 비교
async function rankBySearchVolume(keywords) {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const allResults = [];

  // 5개씩 배치 (API 제한)
  for (let i = 0; i < keywords.length; i += 5) {
    const batch = keywords.slice(i, i + 5);
    try {
      const keywordGroups = batch.map(kw => ({
        groupName: kw,
        keywords: [kw],
      }));

      const response = await axios.post(
        'https://openapi.naver.com/v1/datalab/search',
        { startDate, endDate, timeUnit: 'week', keywordGroups },
        {
          headers: {
            'X-Naver-Client-Id': SEARCH_CLIENT_ID,
            'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET,
            'Content-Type': 'application/json',
          },
        }
      );

      for (const group of response.data.results) {
        const data = group.data;
        const recentData = data.slice(-2);
        const avgRatio = recentData.length > 0
          ? recentData.reduce((sum, d) => sum + d.ratio, 0) / recentData.length
          : 0;

        allResults.push({
          keyword: group.title,
          score: Math.round(avgRatio * 100) / 100,
        });
      }
    } catch (e) {
      console.warn(`데이터랩 배치 실패: ${batch.join(', ')}`, e.message);
    }
  }

  allResults.sort((a, b) => b.score - a.score);
  return allResults;
}

// Step 4: 실제 카페 검색 결과가 있는 키워드만 필터링
async function filterBySearchResults(rankedKeywords) {
  const verified = [];

  for (const item of rankedKeywords) {
    if (verified.length >= 15) break;

    try {
      const response = await axios.get('https://openapi.naver.com/v1/search/local.json', {
        params: { query: `${item.keyword} 카페`, display: 1 },
        headers: {
          'X-Naver-Client-Id': SEARCH_CLIENT_ID,
          'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET,
        },
      });

      if (response.data.total > 0) {
        verified.push(item);
      } else {
        console.log(`제외 (검색 결과 없음): ${item.keyword}`);
      }
    } catch {
      // 검색 실패 시 스킵
    }
  }

  return verified;
}

// 디저트 실시간 트렌드 API (운영과 동일: Firestore 1순위)
app.get('/api/trends-desserts', async (req, res) => {
  // 캐시 확인
  if (trendCache && Date.now() - trendCacheTime < CACHE_DURATION) {
    return res.json(trendCache);
  }

  try {
    // 1순위: Firestore에서 읽기 (update-trends.js가 저장한 데이터)
    const { initializeApp, getApps, getApp } = require('firebase/app');
    const { getFirestore, collection, getDocs, query: fsQuery, orderBy: fsOrderBy, limit: fsLimit } = require('firebase/firestore');
    const existingApps = getApps();
    const firebaseApp = existingApps.find(a => a.name === 'trends-reader')
      ? getApp('trends-reader')
      : initializeApp({
          apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        }, 'trends-reader');
    const firestore = getFirestore(firebaseApp);
    const trendsRef = collection(firestore, 'trends');
    const q = fsQuery(trendsRef, fsOrderBy('rank', 'asc'), fsLimit(15));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const trends = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        trends.push({ keyword: data.keyword, score: data.score });
      });
      console.log(`Firestore 트렌드 로드: ${trends.map(t => t.keyword).join(', ')}`);
      const result = { updatedAt: new Date().toISOString(), trends, source: 'firestore' };
      trendCache = result;
      trendCacheTime = Date.now();
      return res.json(result);
    }
  } catch (e) {
    console.warn('Firestore 트렌드 읽기 실패, 폴백 실행:', e.message);
  }

  // 2순위: 실시간 수집 (Firestore 비어있을 때만)
  try {
    const blogTexts = await collectTrendingKeywords();
    const keywords = await extractDessertKeywords(blogTexts);
    const ranked = await rankBySearchVolume(keywords);
    const trends = await filterBySearchResults(ranked);

    const result = { updatedAt: new Date().toISOString(), trends };
    trendCache = result;
    trendCacheTime = Date.now();
    res.json(result);
  } catch (e) {
    console.error('트렌드 수집 실패:', e.message);
    try {
      const ranked = await rankBySearchVolume(getDefaultKeywords());
      const trends = await filterBySearchResults(ranked);
      res.json({ updatedAt: new Date().toISOString(), trends });
    } catch {
      res.status(500).json({ error: '트렌드 수집 실패' });
    }
  }
});

// 급상승 TOP3 API (최근 1주 vs 이전 주 검색량 상승률)
let top3Cache = null;
let top3CacheTime = 0;

app.get('/api/trends-rising', async (req, res) => {
  // 캐시 확인 (1시간)
  if (top3Cache && Date.now() - top3CacheTime < CACHE_DURATION) {
    return res.json(top3Cache);
  }

  console.log('급상승 TOP3 수집 시작...');

  try {
    // 블로그에서 키워드 수집
    const blogTexts = await collectTrendingKeywords();
    const keywords = await extractDessertKeywords(blogTexts);

    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const allResults = [];

    for (let i = 0; i < keywords.length; i += 5) {
      const batch = keywords.slice(i, i + 5);
      try {
        const keywordGroups = batch.map(kw => ({
          groupName: kw,
          keywords: [kw],
        }));

        const response = await axios.post(
          'https://openapi.naver.com/v1/datalab/search',
          { startDate, endDate, timeUnit: 'week', keywordGroups },
          {
            headers: {
              'X-Naver-Client-Id': SEARCH_CLIENT_ID,
              'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET,
              'Content-Type': 'application/json',
            },
          }
        );

        for (const group of response.data.results) {
          const data = group.data;
          if (data.length < 2) continue;

          const thisWeek = data[data.length - 1].ratio;
          const lastWeek = data[data.length - 2].ratio;

          // 상승률 계산 (이전 주 대비)
          const growthRate = lastWeek > 0
            ? ((thisWeek - lastWeek) / lastWeek) * 100
            : thisWeek > 0 ? 999 : 0; // 이전 주 0이면 신규 급등

          allResults.push({
            keyword: group.title,
            thisWeek: Math.round(thisWeek * 100) / 100,
            lastWeek: Math.round(lastWeek * 100) / 100,
            growthRate: Math.round(growthRate * 10) / 10,
          });
        }
      } catch (e) {
        console.warn(`TOP3 배치 실패: ${batch.join(', ')}`);
      }
    }

    // 상승률 내림차순, 상위 3개
    allResults.sort((a, b) => b.growthRate - a.growthRate);
    const top3 = allResults.slice(0, 3);

    console.log('급상승 TOP3:', top3.map(t => `${t.keyword}(+${t.growthRate}%)`).join(', '));

    const result = {
      updatedAt: new Date().toISOString(),
      top3,
    };

    top3Cache = result;
    top3CacheTime = Date.now();

    res.json(result);
  } catch (e) {
    console.error('TOP3 수집 실패:', e.message);
    res.status(500).json({ error: 'TOP3 수집 실패' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`프록시 서버 실행 중: http://localhost:${PORT}`);
});
