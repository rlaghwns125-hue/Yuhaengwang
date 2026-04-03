import Anthropic from '@anthropic-ai/sdk';
import * as functions from 'firebase-functions';
import { RawTrendData } from './trendCollector';

interface AnalyzedTrend {
  keyword: string;
  icon: string;
  score: number;
  category: string;
}

const DESSERT_ICONS: Record<string, string> = {
  '크로플': '🧇', '마카롱': '🍪', '케이크': '🎂', '탕후루': '🍡',
  '도넛': '🍩', '크레페': '🥞', '빙수': '🍧', '타르트': '🥧',
  '쿠키': '🍪', '브라우니': '🍫', '푸딩': '🍮', '아이스크림': '🍦',
  '와플': '🧇', '파이': '🥧', '젤라또': '🍨', '카스테라': '🍰',
  '슈크림': '🧁', '에클레어': '🥖', '티라미수': '🍰', '판나코타': '🍮',
  '약과': '🍘', '떡': '🍡', '호떡': '🥞', '붕어빵': '🐟', '소금빵': '🥐',
};

// Claude AI로 트렌드 데이터 분석 및 디저트 필터링
export async function analyzeTrendsWithAI(
  rawTrends: RawTrendData[]
): Promise<AnalyzedTrend[]> {
  const apiKey = functions.config().claude?.api_key || '';

  if (!apiKey) {
    console.warn('Claude API 키가 없어 기본 분석 사용');
    return fallbackAnalysis(rawTrends);
  }

  const client = new Anthropic({ apiKey });

  const trendList = rawTrends
    .map((t) => `${t.keyword}: ${t.ratio}`)
    .join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `다음은 네이버 검색 트렌드 데이터입니다. 이 중에서 디저트/간식 관련 키워드만 필터링하고, 인기도 점수(0-100)를 매겨주세요.

트렌드 데이터:
${trendList}

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
[{"keyword": "키워드", "score": 점수, "category": "디저트분류"}]

분류 예시: 빵류, 케이크류, 전통간식, 아이스류, 과자류 등`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return fallbackAnalysis(rawTrends);
    }

    const analyzed: Array<{ keyword: string; score: number; category: string }> =
      JSON.parse(jsonMatch[0]);

    return analyzed.map((item) => ({
      keyword: item.keyword,
      icon: getIconForKeyword(item.keyword),
      score: item.score,
      category: item.category,
    }));
  } catch (error) {
    console.error('AI 분석 실패:', error);
    return fallbackAnalysis(rawTrends);
  }
}

// AI 사용 불가 시 폴백 분석
function fallbackAnalysis(rawTrends: RawTrendData[]): AnalyzedTrend[] {
  return rawTrends.map((trend) => ({
    keyword: trend.keyword,
    icon: getIconForKeyword(trend.keyword),
    score: Math.round(trend.ratio),
    category: '디저트',
  }));
}

function getIconForKeyword(keyword: string): string {
  for (const [key, icon] of Object.entries(DESSERT_ICONS)) {
    if (keyword.includes(key)) return icon;
  }
  return '🍰';
}
