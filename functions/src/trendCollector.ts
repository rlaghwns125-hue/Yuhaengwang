import axios from 'axios';
import * as functions from 'firebase-functions';

export interface RawTrendData {
  keyword: string;
  ratio: number;
}

// 네이버 데이터랩 검색어 트렌드 수집
export async function collectTrends(): Promise<RawTrendData[]> {
  const clientId = functions.config().naver?.datalab_client_id || '';
  const clientSecret = functions.config().naver?.datalab_client_secret || '';

  // 디저트 관련 주요 키워드 그룹
  const keywordBatches = [
    ['크로플', '마카롱', '소금빵', '탕후루', '약과'],
    ['케이크', '도넛', '티라미수', '에클레어', '브라우니'],
    ['빙수', '젤라또', '타르트', '카스테라', '호떡'],
    ['쿠키', '슈크림', '와플', '푸딩', '판나코타'],
    ['떡', '붕어빵', '아이스크림', '파이', '크레페'],
  ];

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const allTrends: RawTrendData[] = [];

  for (const batch of keywordBatches) {
    try {
      const keywordGroups = batch.map((kw) => ({
        groupName: kw,
        keywords: [kw, `${kw} 맛집`, `${kw} 카페`],
      }));

      const response = await axios.post(
        'https://openapi.naver.com/v1/datalab/search',
        {
          startDate,
          endDate,
          timeUnit: 'week',
          keywordGroups,
        },
        {
          headers: {
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret,
            'Content-Type': 'application/json',
          },
        }
      );

      for (const group of response.data.results) {
        const data = group.data;
        const latestRatio = data.length > 0 ? data[data.length - 1].ratio : 0;
        allTrends.push({
          keyword: group.title,
          ratio: latestRatio,
        });
      }
    } catch (error) {
      console.warn(`배치 수집 실패: ${batch.join(', ')}`, error);
    }
  }

  // 검색 비율 기준 내림차순 정렬
  return allTrends.sort((a, b) => b.ratio - a.ratio);
}
