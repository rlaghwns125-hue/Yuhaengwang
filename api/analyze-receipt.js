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
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
          },
          {
            type: 'text',
            text: `이 영수증 사진에서 디저트/음료 메뉴명과 가게명을 추출해주세요.

규칙:
- 디저트/음료 메뉴명만 추출 (커피, 라떼 등 음료도 포함)
- 가게명이 보이면 추출
- JSON으로만 응답: {"storeName": "가게명", "desserts": ["메뉴1", "메뉴2"]}
- 영수증이 아니거나 메뉴가 없으면: {"storeName": "", "desserts": [], "error": "영수증을 인식할 수 없습니다"}`,
          },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const result = JSON.parse(match[0]);
      res.json({
        storeName: result.storeName || '',
        desserts: result.desserts || [],
        points: (result.desserts?.length || 0) * 5,
        error: result.error || null,
      });
    } else {
      res.json({ storeName: '', desserts: [], points: 0, error: '분석 실패' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
