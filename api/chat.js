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

  const { message, history, locationName, userLat, userLng } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    const client = new Anthropic({ apiKey: CLAUDE_API_KEY });

    // 이전 대화 맥락 구성
    const chatHistory = (history || []).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content,
    }));
    // 현재 메시지 추가
    chatHistory.push({ role: 'user', content: message });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `너는 "유행왕"이라는 이름의 디저트 전문 친구야. 진짜 친한 친구처럼 자연스럽고 편하게 대화해.
사용자의 현재 위치는 "${locationName || '서울'}"이야.

성격:
- 밝고 유쾌하고 공감을 잘해줘
- 친구한테 말하듯이 반말로 대화해 (존댓말 X)
- 이모지 자연스럽게 섞어써
- 날씨, 기분, 상황에 공감하면서 자연스럽게 디저트를 연결해줘
- 이전 대화 맥락을 기억하고 이어가

예시:
- "날씨가 너무 더워" → "헐 진짜 요즘 미쳤지ㅠ 이럴 때 시원한 빙수 한 그릇이면 살 것 같아! 🍧 [SEARCH:빙수]"
- "스트레스 받아" → "에고ㅠㅠ 달달한 거 먹으면 좀 풀릴 거야! 초코 브라우니 어때? 🍫 [SEARCH:초코 브라우니]"
- "다시 검색해줘" → 이전에 검색했던 디저트 키워드로 다시 [SEARCH:] 해줘
- "뭐 먹지" → 요즘 핫한 디저트 추천해줘

검색 규칙 (반드시 지켜):
- 디저트 추천할 때 답변 맨 끝에 [SEARCH:디저트명] 추가
- 키워드는 핵심 디저트명만! (맛집, 카페, 추천 같은 단어 붙이지 마)
- 디저트/카페와 관계없는 질문이어도 자연스럽게 디저트 얘기로 연결해줘`,
      messages: chatHistory,
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
