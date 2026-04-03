import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { collectTrends } from './trendCollector';
import { analyzeTrendsWithAI } from './aiAnalyzer';

admin.initializeApp();
const db = admin.firestore();

// 트렌드 수집 스케줄러 (매 6시간마다 실행)
export const scheduledTrendCollection = functions.scheduler
  .onSchedule('every 6 hours', async () => {
    console.log('트렌드 수집 시작...');

    try {
      // 1. 네이버 데이터랩에서 트렌드 데이터 수집
      const rawTrends = await collectTrends();

      // 2. Claude AI로 디저트 관련 키워드 필터링 및 순위 산출
      const dessertTrends = await analyzeTrendsWithAI(rawTrends);

      // 3. Firestore에 저장
      const batch = db.batch();
      dessertTrends.forEach((trend, index) => {
        const ref = db.collection('trends').doc(trend.keyword);
        batch.set(ref, {
          keyword: trend.keyword,
          icon: trend.icon,
          rank: index + 1,
          score: trend.score,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();

      console.log(`트렌드 ${dessertTrends.length}개 업데이트 완료`);
    } catch (error) {
      console.error('트렌드 수집 실패:', error);
    }
  });

// 수동 트렌드 수집 (HTTP 엔드포인트)
export const collectTrendsManual = functions.https.onRequest(async (req, res) => {
  try {
    const rawTrends = await collectTrends();
    const dessertTrends = await analyzeTrendsWithAI(rawTrends);

    const batch = db.batch();
    dessertTrends.forEach((trend, index) => {
      const ref = db.collection('trends').doc(trend.keyword);
      batch.set(ref, {
        keyword: trend.keyword,
        icon: trend.icon,
        rank: index + 1,
        score: trend.score,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    res.json({ success: true, count: dessertTrends.length, trends: dessertTrends });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 장소 검색 API 중계 (CORS 우회용)
export const searchPlaces = functions.https.onCall(async (request) => {
  const { query } = request.data;
  if (!query) throw new functions.https.HttpsError('invalid-argument', '검색어가 필요합니다.');

  const axios = require('axios');
  const naverClientId = functions.config().naver?.search_client_id || '';
  const naverClientSecret = functions.config().naver?.search_client_secret || '';

  const response = await axios.get('https://openapi.naver.com/v1/search/local.json', {
    params: { query, display: 20, sort: 'comment' },
    headers: {
      'X-Naver-Client-Id': naverClientId,
      'X-Naver-Client-Secret': naverClientSecret,
    },
  });

  return response.data.items.map((item: any) => ({
    name: item.title.replace(/<[^>]*>/g, ''),
    address: item.roadAddress || item.address,
    latitude: parseInt(item.mapy) / 1e7,
    longitude: parseInt(item.mapx) / 1e7,
    category: item.category,
    telephone: item.telephone,
  }));
});
