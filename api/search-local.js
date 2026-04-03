const axios = require('axios');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const response = await axios.get('https://openapi.naver.com/v1/search/local.json', {
      params: req.query,
      headers: {
        'X-Naver-Client-Id': req.headers['x-naver-client-id'] || process.env.NAVER_SEARCH_CLIENT_ID,
        'X-Naver-Client-Secret': req.headers['x-naver-client-secret'] || process.env.NAVER_SEARCH_CLIENT_SECRET,
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
};
