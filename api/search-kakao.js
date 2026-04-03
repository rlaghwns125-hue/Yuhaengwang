const axios = require('axios');

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, x, y, radius, sort, size, category_group_code } = req.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    const response = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
      params: { query, x, y, radius: radius || 2000, sort: sort || 'distance', size: size || 15, ...(category_group_code ? { category_group_code } : {}) },
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });
    res.json(response.data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
};
