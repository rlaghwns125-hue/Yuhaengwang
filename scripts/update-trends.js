/**
 * 트렌드 업데이트 스크립트
 * 로컬에서 실행: node scripts/update-trends.js
 *
 * 1. 네이버 블로그에서 디저트 키워드 수집
 * 2. Claude AI로 키워드 추출
 * 3. 네이버 데이터랩으로 검색량 비교
 * 4. 카페 검색 결과 있는 것만 필터
 * 5. Firestore에 저장 → 운영에서 읽기만
 */

const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, getDocs, deleteDoc, Timestamp } = require('firebase/firestore');
require('dotenv').config();

const SEARCH_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_ID;
const SEARCH_CLIENT_SECRET = process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_SECRET;
const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;

// Firebase 초기화
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Step 1: 네이버 블로그에서 트렌드 키워드 수집
async function collectBlogKeywords() {
  console.log('📝 블로그에서 키워드 수집 중...');
  const queries = [
    '2026 디저트 트렌드', '요즘 인기 디저트', '요즘 뜨는 디저트 카페',
    '핫한 디저트 2026', '디저트 신메뉴 인기',
  ];
  let allTexts = '';
  for (const query of queries) {
    try {
      const r = await axios.get('https://openapi.naver.com/v1/search/blog.json', {
        params: { query, display: 10, sort: 'date' },
        headers: { 'X-Naver-Client-Id': SEARCH_CLIENT_ID, 'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET },
      });
      for (const item of r.data.items) {
        allTexts += (item.title + ' ' + item.description).replace(/<[^>]*>/g, '') + '\n';
      }
    } catch (e) {
      console.warn(`  블로그 검색 실패: ${query}`);
    }
  }
  console.log(`  수집된 텍스트: ${allTexts.length}자`);
  return allTexts;
}

// Step 2: Claude AI로 디저트 키워드 추출
async function extractWithAI(blogTexts) {
  console.log('🤖 AI로 키워드 추출 중...');
  try {
    const client = new Anthropic({ apiKey: CLAUDE_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1024,
      messages: [{ role: 'user', content: `다음 블로그 글에서 디저트 카페에서 팔 법한 구체적인 디저트/간식 메뉴명만 추출해주세요.

포함 O (디저트 카페 메뉴):
크로플, 마카롱, 에그타르트, 바스크치즈케이크, 두바이 초콜릿, 까눌레, 휘낭시에, 마들렌, 크루아상, 소금빵, 약과, 당근케이크, 딸기모찌, 팥빙수 등

제외 X:
- 재료명: 딸기, 초콜릿, 크림치즈, 바닐라, 말차, 버터 등
- 대분류: 케이크, 쿠키, 빵, 음료, 디저트, 베이커리 등
- 비디저트: 떡볶이, 피자, 치킨, 파스타, 순대, 핫도그 등
- 음료: 커피, 라떼, 아메리카노, 스무디 등
- 일반명사: 카페, 맛집, 추천, 트렌드 등

최소 20개, 최대 40개. JSON 배열로만 응답.

${blogTexts.slice(0, 10000)}` }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const keywords = JSON.parse(match[0]);
      console.log(`  추출된 키워드: ${keywords.length}개`);
      return keywords;
    }
  } catch (e) {
    console.warn('  AI 추출 실패:', e.message);
  }
  return getDefaultKeywords();
}

function getDefaultKeywords() {
  return ['크로플','마카롱','소금빵','탕후루','약과','케이크','도넛','티라미수','에클레어','브라우니','빙수','젤라또','타르트','카스테라','호떡','쿠키','슈크림','와플','푸딩','붕어빵','크루아상','스콘','에그타르트','버터떡','두쫀쿠키','크럼블','휘낭시에','바스크치즈케이크','몽블랑','밀크티'];
}

// Step 3: 데이터랩으로 검색량 비교
async function rankBySearchVolume(keywords) {
  console.log('📊 데이터랩으로 검색량 비교 중...');
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const allResults = [];

  for (let i = 0; i < keywords.length; i += 5) {
    const batch = keywords.slice(i, i + 5);
    try {
      const response = await axios.post('https://openapi.naver.com/v1/datalab/search',
        { startDate, endDate, timeUnit: 'week', keywordGroups: batch.map(kw => ({ groupName: kw, keywords: [kw] })) },
        { headers: { 'X-Naver-Client-Id': SEARCH_CLIENT_ID, 'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET, 'Content-Type': 'application/json' } }
      );
      for (const group of response.data.results) {
        const data = group.data;
        const recent = data.slice(-2);
        const avg = recent.length > 0 ? recent.reduce((s, d) => s + d.ratio, 0) / recent.length : 0;
        allResults.push({ keyword: group.title, score: Math.round(avg * 100) / 100 });
      }
      process.stdout.write(`  배치 ${Math.floor(i/5) + 1}/${Math.ceil(keywords.length/5)} 완료\r`);
    } catch {}
  }
  console.log(`\n  데이터랩 결과: ${allResults.length}개`);
  allResults.sort((a, b) => b.score - a.score);
  return allResults;
}

// 재료/대분류/음료 등 제외 목록
const EXCLUDE_KEYWORDS = [
  // 재료/대분류
  '우베', '크림치즈', '아이스크림', '초콜릿', '생크림', '버터',
  '딸기', '바닐라', '말차', '카라멜', '피스타치오', '흑임자',
  '커피', '라떼', '아메리카노', '에스프레소', '스무디',
  '사탕',
  // 비디저트 음식
  '떡볶이', '피자', '치킨', '닭강정', '리조또', '파스타',
  '샌드위치', '순대', '핫도그', '햄버거', '김밥', '라면',
  '떡국', '만두', '국밥', '비빔밥', '볶음밥', '돈까스',
  '족발', '보쌈', '삼겹살', '곱창', '소시지',
];

// 단독일 때만 제외할 대분류 (조합형은 허용)
const SOLO_EXCLUDE = [
  '케이크', '쿠키', '빵', '파이', '타르트', '아이스크림',
  '베이커리', '디저트', '간식', '음료', '초코',
];

// Step 4: 카페 검색 결과 있는 것만 필터 + 재료/대분류 제외
async function filterBySearchResults(ranked) {
  ranked = ranked.filter(item => {
    const kw = item.keyword;
    // 정확히 일치하면 제외
    if (EXCLUDE_KEYWORDS.includes(kw)) return false;
    // 단독 대분류면 제외 (2글자 이하 or 정확히 일치)
    if (SOLO_EXCLUDE.includes(kw)) return false;
    // "말차 아이스크림" 같은 조합형은 허용
    return true;
  });
  console.log('🔍 카페 검색 결과 검증 중...');
  const verified = [];
  for (const item of ranked) {
    if (verified.length >= 20) break;
    try {
      const r = await axios.get('https://openapi.naver.com/v1/search/local.json', {
        params: { query: `${item.keyword} 카페`, display: 1 },
        headers: { 'X-Naver-Client-Id': SEARCH_CLIENT_ID, 'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET },
      });
      if (r.data.total > 0) {
        verified.push(item);
      } else {
        console.log(`  제외: ${item.keyword} (카페 없음)`);
      }
    } catch {}
  }
  console.log(`  검증된 트렌드: ${verified.length}개`);
  return verified;
}

// Step 5: Firestore에 저장
async function saveToFirestore(trends) {
  console.log('💾 Firestore에 저장 중...');

  // 기존 트렌드 삭제
  const trendsRef = collection(db, 'trends');
  const existing = await getDocs(trendsRef);
  for (const docSnap of existing.docs) {
    await deleteDoc(doc(db, 'trends', docSnap.id));
  }

  // 새 트렌드 저장
  for (let i = 0; i < trends.length; i++) {
    const trend = trends[i];
    await setDoc(doc(db, 'trends', trend.keyword), {
      keyword: trend.keyword,
      icon: '',
      rank: i + 1,
      score: trend.score,
      updatedAt: Timestamp.now(),
    });
  }
  console.log(`  ${trends.length}개 저장 완료!`);
}

// 메인 실행
async function main() {
  console.log('🚀 트렌드 업데이트 시작!\n');
  const startTime = Date.now();

  const blogTexts = await collectBlogKeywords();
  const keywords = await extractWithAI(blogTexts);
  const ranked = await rankBySearchVolume(keywords);
  const trends = await filterBySearchResults(ranked);
  await saveToFirestore(trends);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ 완료! (${elapsed}초)`);
  console.log('\n📋 트렌드 순위:');
  trends.forEach((t, i) => console.log(`  ${i + 1}. ${t.keyword} (${t.score})`));

  process.exit(0);
}

main().catch((e) => {
  console.error('❌ 실패:', e.message);
  process.exit(1);
});
