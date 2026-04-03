const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const SEARCH_CLIENT_ID = process.env.NAVER_SEARCH_CLIENT_ID;
const SEARCH_CLIENT_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET;
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { message, locationName, userLat, userLng } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    const client = new Anthropic({ apiKey: CLAUDE_API_KEY });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `너는 디저트/카페 추천 전문 AI 어시스턴트 "유행왕"이야.
사용자가 디저트나 카페에 대해 물어보면 친근하게 답해줘.
사용자의 현재 위치는 "${locationName || '서울'}"이야.

중요 규칙:
- 답변은 짧고 친근하게 (3줄 이내)
- 답변 맨 끝에 검색할 키워드를 이 형식으로 추가: [SEARCH:키워드]
- [SEARCH:] 키워드는 반드시 핵심 디저트명 하나만! (카페, 맛집, 추천 같은 단어 붙이지 마)
- 디저트명은 끝 단어가 디저트 종류여야 함:
  - O: 크로플, 초코 젤라또, 딸기 케이크, 말차 크루아상
  - X: 젤라또 스무디, 크로플 맛집, 케이크 카페
- 예: "젤라또 스무디 추천해줘" -> 답변 + [SEARCH:젤라또]
- 예: "크로플 맛집 알려줘" -> 답변 + [SEARCH:크로플]
- 예: "초코 케이크 먹고싶어" -> 답변 + [SEARCH:초코 케이크]
- 디저트/카페와 관계없는 질문이면 가볍게 디저트 얘기로 유도해줘`,
      messages: [{ role: 'user', content: message }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // [SEARCH:키워드] 추출 + 정제
    const searchMatch = text.match(/\[SEARCH:(.+?)\]/);
    let searchKeyword = searchMatch ? searchMatch[1].trim() : null;
    const cleanText = text.replace(/\[SEARCH:.+?\]/, '').trim();

    // 키워드 정제: "맛집", "카페", "추천" 등 제거
    if (searchKeyword) {
      searchKeyword = searchKeyword.replace(/(맛집|카페|추천|근처|주변|가게|매장)/g, '').trim();
      if (!searchKeyword) searchKeyword = null;
    }

    // 검색 키워드가 있으면 카카오 로컬 API로 주변 카페 검색
    let places = [];
    if (searchKeyword && userLat && userLng && KAKAO_KEY) {
      try {
        const searchResponse = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
          params: { query: searchKeyword, x: userLng, y: userLat, radius: 2000, sort: 'distance', size: 10, category_group_code: 'CE7' },
          headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
        });
        places = searchResponse.data.documents.map((item) => ({
          id: item.id,
          name: item.place_name,
          address: item.road_address_name || item.address_name,
          latitude: parseFloat(item.y),
          longitude: parseFloat(item.x),
          category: item.category_name,
          rating: 0,
          telephone: item.phone,
          placeUrl: item.place_url,
          distance: parseInt(item.distance),
        }));
      } catch {}
    } else if (searchKeyword && locationName) {
      // 카카오 키 없으면 네이버 폴백
      try {
        const sr = await axios.get('https://openapi.naver.com/v1/search/local.json', {
          params: { query: `${locationName} ${searchKeyword} 카페`, display: 10, sort: 'comment' },
          headers: { 'X-Naver-Client-Id': SEARCH_CLIENT_ID, 'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET },
        });
        places = sr.data.items.map((item, i) => ({
          id: `chat_${i}_${Date.now()}`,
          name: item.title.replace(/<[^>]*>/g, ''),
          address: item.roadAddress || item.address,
          latitude: parseInt(item.mapy) / 1e7,
          longitude: parseInt(item.mapx) / 1e7,
          category: item.category,
          rating: 0,
          telephone: item.telephone,
        }));
      } catch {}
    }

    // 프랜차이즈 필터
    const FRANCHISES = ['스타벅스','투썸플레이스','투썸','이디야','메가커피','메가MGC','컴포즈커피','컴포즈','빽다방','파리바게뜨','파리바게트','뚜레쥬르','던킨','배스킨라빈스','배라','할리스','엔제리너스','커피빈','폴바셋','공차','설빙','크리스피크림'];
    if (places.length > 0) {
      const filtered = places.filter(p => !FRANCHISES.some(f => p.name.includes(f)));
      if (filtered.length > 0) places = filtered;
    }

    res.json({ reply: cleanText, searchKeyword, places });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
