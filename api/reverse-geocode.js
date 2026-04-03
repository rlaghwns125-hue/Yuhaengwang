const axios = require('axios');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat, lng required' });

  try {
    // 네이버 Reverse Geocoding API
    const response = await axios.get('https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc', {
      params: {
        coords: `${lng},${lat}`,
        output: 'json',
        orders: 'roadaddr,addr',
      },
      headers: {
        'X-NCP-APIGW-API-KEY-ID': process.env.NAVER_MAP_CLIENT_ID,
        'X-NCP-APIGW-API-KEY': process.env.NAVER_MAP_CLIENT_SECRET,
      },
    });

    const results = response.data.results;
    if (results && results.length > 0) {
      const r = results[0].region;
      const land = results[0].land;

      // 시 + 구 + 동/도로명
      const parts = [];
      if (r.area1?.name) parts.push(r.area1.name); // 시/도
      if (r.area2?.name) parts.push(r.area2.name); // 구/군
      if (r.area3?.name) parts.push(r.area3.name); // 동/면

      // 도로명이 있으면 추가
      if (land?.name) parts.push(land.name);

      return res.json({ locationName: parts.join(' ') });
    }

    res.json({ locationName: '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
