const Anthropic = require('@anthropic-ai/sdk');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { imageBase64 } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

  try {
    const client = new Anthropic({ apiKey: CLAUDE_API_KEY });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
          },
          {
            type: 'text',
            text: `이 영수증 사진을 분석해주세요.

규칙:
1. 가게명, 가게 주소 추출
2. 각 메뉴명, 수량, 단가(금액) 추출
3. 가게가 디저트/카페/베이커리인지, 일반 음식점(한식/양식/분식 등)인지 판별
4. JSON으로만 응답

카테고리 판별 기준:
- dessert: 카페, 디저트 전문점, 베이커리, 아이스크림, 빵집, 떡집, 차/음료 전문점
- food: 일반 식당 (한식, 중식, 일식, 양식, 분식, 고기집, 치킨집, 피자집 등)
- unknown: 영수증이 아니거나 판별 불가

형식:
{
  "storeName": "가게명",
  "storeAddress": "가게 주소",
  "category": "dessert" | "food" | "unknown",
  "items": [
    { "name": "메뉴명", "quantity": 수량(숫자), "price": 단가(숫자) }
  ]
}

영수증이 아니거나 분석 불가:
{ "storeName": "", "storeAddress": "", "category": "unknown", "items": [], "error": "영수증을 인식할 수 없습니다" }`,
          },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.json({ storeName: '', storeAddress: '', category: 'unknown', items: [], error: '분석 실패' });
    }

    const result = JSON.parse(match[0]);

    // 디저트가 아닌 일반 음식점이면 등록 불가
    if (result.category === 'food') {
      return res.json({
        storeName: result.storeName || '',
        storeAddress: result.storeAddress || '',
        category: 'food',
        items: [],
        error: '디저트/카페 영수증만 등록 가능해요! 🍰',
      });
    }

    if (result.category === 'unknown' || !result.items || result.items.length === 0) {
      return res.json({
        storeName: result.storeName || '',
        storeAddress: result.storeAddress || '',
        category: result.category || 'unknown',
        items: [],
        error: result.error || '영수증에서 메뉴를 찾을 수 없어요',
      });
    }

    // 점수 계산: (수량 * 금액) / 1000, 소수점 반올림
    const items = result.items.map((it) => {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.price) || 0;
      const score = Math.round((qty * price) / 1000);
      return { name: it.name, quantity: qty, price, score };
    });
    const totalScore = items.reduce((sum, it) => sum + it.score, 0);

    res.json({
      storeName: result.storeName || '',
      storeAddress: result.storeAddress || '',
      category: 'dessert',
      items,
      totalScore,
      error: null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
