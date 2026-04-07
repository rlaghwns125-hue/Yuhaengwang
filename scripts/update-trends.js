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

중요: 같은 디저트의 변형은 하나만! (예: "버터떡"과 "상하이 버터떡"은 "버터떡" 하나만)
최소 20개, 최대 40개. JSON 배열로만 응답.

${blogTexts.slice(0, 10000)}` }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const aiKeywords = JSON.parse(match[0]);
      console.log(`  AI 추출: ${aiKeywords.length}개`);

      // AI 추출 + 고정 리스트 합치기 (중복 제거)
      const seen = new Set(aiKeywords.map(k => k.toLowerCase()));
      const merged = [...aiKeywords];
      for (const kw of MUST_CHECK_KEYWORDS) {
        if (!seen.has(kw.toLowerCase())) {
          merged.push(kw);
          seen.add(kw.toLowerCase());
        }
      }
      console.log(`  합산 후: ${merged.length}개 (AI ${aiKeywords.length} + 고정 ${merged.length - aiKeywords.length})`);
      return merged;
    }
  } catch (e) {
    console.warn('  AI 추출 실패:', e.message);
  }
  return MUST_CHECK_KEYWORDS;
}

// 대표 키워드 1개만 사용 (공정한 비교, 서브 주제어 합산 없음)
function getVariants(keyword) {
  return [keyword];
}

// 놓치면 안 되는 필수 디저트 후보 (AI 추출과 합침)
const MUST_CHECK_KEYWORDS = [
  // 떡/전통
  '창억떡','버터떡','인절미','약과','찹쌀떡','화과자','호떡','붕어빵','경단',
  // 빵/베이커리
  '소금빵','크로플','크루아상','소라빵','베이글','스콘','에그타르트',
  '마들렌','까눌레','휘낭시에','파운드케이크','바게트','식빵',
  // 케이크
  '당근케이크','바스크치즈케이크','롤케이크','몽블랑','티라미수',
  // 쿠키/과자
  '두쫀쿠','마카롱','크럼블','스모어쿠키',
  // 디저트
  '브라우니','에클레어','츄러스','도넛','와플','타르트','푸딩',
  '판나코타','슈크림','크레이프',
  // 아이스/음료
  '젤라또','빙수','팥빙수','아포가토','그릭요거트',
  // 트렌드
  '두바이 초콜릿','후르츠산도','딸기모찌','카스테라',
  '탕후루','밀크티',
  // 우베/트렌드 추가
  '우베','아이스크림','망고시루','쌀 젤라또',
];

function getDefaultKeywords() {
  return MUST_CHECK_KEYWORDS;
}

// Step 3: 데이터랩으로 검색량 비교 (리그전 방식)
// 1위=3점, 2위=2점, 3위=1점, 서로 다른 상대와 3라운드
async function rankBySearchVolume(keywords) {
  console.log('📊 데이터랩 리그전 시작...');
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const points = {}; // 키워드별 누적 포인트
  const zScores = {}; // 키워드별 Z-score 배열
  keywords.forEach(kw => { points[kw] = 0; });

  // 셔플 함수
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 3라운드 리그전 (매 라운드 셔플해서 다른 조합)
  const ROUNDS = 3;
  let totalBatches = 0;

  for (let round = 1; round <= ROUNDS; round++) {
    const shuffled = shuffle(keywords);

    for (let i = 0; i < shuffled.length; i += 5) {
      const batch = shuffled.slice(i, i + 5);
      if (batch.length < 2) continue;

      try {
        const response = await axios.post('https://openapi.naver.com/v1/datalab/search',
          { startDate, endDate, timeUnit: 'week', keywordGroups: batch.map(kw => ({ groupName: kw, keywords: getVariants(kw) })) },
          { headers: { 'X-Naver-Client-Id': SEARCH_CLIENT_ID, 'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET, 'Content-Type': 'application/json' } }
        );

        // Z-score 정규화: 배치 난이도 보정
        const results = response.data.results
          .map(g => ({
            keyword: g.title,
            ratio: g.data.length > 0 ? g.data[g.data.length - 1].ratio : 0,
          }));

        // 배치 평균, 표준편차 계산
        const ratios = results.map(r => r.ratio);
        const mean = ratios.reduce((s, v) => s + v, 0) / ratios.length;
        const std = Math.sqrt(ratios.reduce((s, v) => s + (v - mean) ** 2, 0) / ratios.length) || 1;

        // Z-score 계산 + 누적
        for (const r of results) {
          const zscore = (r.ratio - mean) / std;
          if (!zScores[r.keyword]) zScores[r.keyword] = [];
          zScores[r.keyword].push(zscore);
        }

        // 포인트도 여전히 부여 (ratio 1 미만이면 안 줌)
        const filtered = results.filter(r => r.ratio >= 1).sort((a, b) => b.ratio - a.ratio);
        if (filtered[0]) points[filtered[0].keyword] = (points[filtered[0].keyword] || 0) + 3;
        if (filtered[1]) points[filtered[1].keyword] = (points[filtered[1].keyword] || 0) + 2;
        if (filtered[2]) points[filtered[2].keyword] = (points[filtered[2].keyword] || 0) + 1;

        // 배치 로그
        const batchLog = filtered.slice(0, 3).map((r, i) => `${['🥇','🥈','🥉'][i]}${r.keyword}(${r.ratio.toFixed(1)})`).join(' ');
        console.log(`    배치${Math.floor(i/5)+1}: [${batch.join(', ')}] → ${batchLog || '전원 탈락'}`);

        totalBatches++;
      } catch {}

    }
    console.log(`\n  === ${round}라운드 종료 ===`);
  }

  console.log(`  총 ${totalBatches}배치 실행`);

  // Z-score 평균 계산
  const avgZScores = {};
  for (const [kw, scores] of Object.entries(zScores)) {
    if (scores.length > 0) {
      avgZScores[kw] = scores.reduce((s, v) => s + v, 0) / scores.length;
    }
  }

  // Z-score 평균이 음수면 검색량 없는 거 → 제거
  console.log(`\n  === Z-score 결과 (상위 15) ===`);
  const zRanked = Object.entries(avgZScores)
    .filter(([kw, z]) => z > 0) // 평균 Z-score가 양수만 (배치에서 평균 이상)
    .sort((a, b) => b[1] - a[1]);
  zRanked.slice(0, 15).forEach(([kw, z], i) => console.log(`    ${i+1}. ${kw}: Z=${z.toFixed(3)} (포인트:${points[kw]})`));

  // Z-score 기반 순위 (포인트는 참고용)
  let ranked = zRanked
    .map(([keyword, z]) => ({ keyword, score: Math.round(z * 100) / 100, points: points[keyword] }))
    .slice(0, 30);

  console.log(`\n  리그전 포인트 (참고):`);
  const pointRanked = Object.entries(points).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  pointRanked.slice(0, 10).forEach(([k,v], i) => console.log(`    ${i+1}. ${k}: ${v}점`));

  return ranked;

  // 아래는 사용 안 함 (Z-score로 대체)
  /*
  // 동점자 직접 대결로 순위 확정
  const scoreGroups = {};
  ranked.forEach(r => {
    if (!scoreGroups[r.score]) scoreGroups[r.score] = [];
    scoreGroups[r.score].push(r.keyword);
  });

  const finalRanked = [];
  for (const [score, group] of Object.entries(scoreGroups).sort((a, b) => Number(b[0]) - Number(a[0]))) {
    if (group.length <= 1) {
      finalRanked.push({ keyword: group[0], score: Number(score) });
      continue;
    }
    if (group.length <= 5) {
      // 동점자끼리 직접 비교
      console.log(`  🔄 동점(${score}점) 대결: ${group.join(', ')}`);
      try {
        const response = await axios.post('https://openapi.naver.com/v1/datalab/search',
          { startDate, endDate, timeUnit: 'week', keywordGroups: group.map(kw => ({ groupName: kw, keywords: getVariants(kw) })) },
          { headers: { 'X-Naver-Client-Id': SEARCH_CLIENT_ID, 'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET, 'Content-Type': 'application/json' } }
        );
        const tieResults = response.data.results
          .map(g => ({ keyword: g.title, ratio: g.data.length > 0 ? g.data[g.data.length - 1].ratio : 0 }))
          .sort((a, b) => b.ratio - a.ratio);
        tieResults.forEach(r => finalRanked.push({ keyword: r.keyword, score: Number(score) }));
        console.log(`    → ${tieResults.map(r => r.keyword + '(' + r.ratio.toFixed(2) + ')').join(' > ')}`);
      } catch {
        group.forEach(kw => finalRanked.push({ keyword: kw, score: Number(score) }));
      }
    } else {
      // 6명 이상 동점이면 5명씩 나눠서 비교
      for (let i = 0; i < group.length; i += 5) {
        const subGroup = group.slice(i, i + 5);
        try {
          const response = await axios.post('https://openapi.naver.com/v1/datalab/search',
            { startDate, endDate, timeUnit: 'week', keywordGroups: subGroup.map(kw => ({ groupName: kw, keywords: getVariants(kw) })) },
            { headers: { 'X-Naver-Client-Id': SEARCH_CLIENT_ID, 'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET, 'Content-Type': 'application/json' } }
          );
          const tieResults = response.data.results
            .map(g => ({ keyword: g.title, ratio: g.data.length > 0 ? g.data[g.data.length - 1].ratio : 0 }))
            .sort((a, b) => b.ratio - a.ratio);
          tieResults.forEach(r => finalRanked.push({ keyword: r.keyword, score: Number(score) }));
        } catch {
          subGroup.forEach(kw => finalRanked.push({ keyword: kw, score: Number(score) }));
        }
      }
    }
  }

  console.log(`\n  최종 순위 (동점 대결 후):`);
  finalRanked.slice(0, 15).forEach((r, i) => console.log(`    ${i+1}. ${r.keyword}: ${r.score}점`));

  // 검증: 상위 20개를 1위(창억떡 등)와 비교해서 가짜 탈락
  const top1 = finalRanked[0]?.keyword;
  if (top1 && finalRanked.length > 5) {
    console.log(`\n  🔍 검증: 상위 20개를 "${top1}"과 직접 비교...`);
    const toVerify = finalRanked.slice(0, 20);
    const verified = [toVerify[0]]; // 1위는 통과

    for (let i = 1; i < toVerify.length; i += 4) {
      const batch = toVerify.slice(i, i + 4).map(r => r.keyword);
      batch.unshift(top1); // 1위와 함께 비교

      try {
        const response = await axios.post('https://openapi.naver.com/v1/datalab/search',
          { startDate, endDate, timeUnit: 'week', keywordGroups: batch.map(kw => ({ groupName: kw, keywords: getVariants(kw) })) },
          { headers: { 'X-Naver-Client-Id': SEARCH_CLIENT_ID, 'X-Naver-Client-Secret': SEARCH_CLIENT_SECRET, 'Content-Type': 'application/json' } }
        );

        const results = {};
        for (const group of response.data.results) {
          const latest = group.data.length > 0 ? group.data[group.data.length - 1].ratio : 0;
          results[group.title] = latest;
        }

        const top1Ratio = results[top1] || 1;
        for (const kw of batch) {
          if (kw === top1) continue;
          const ratio = results[kw] || 0;
          const pct = (ratio / top1Ratio * 100).toFixed(1);
          const pass = ratio >= 0.5; // 1위 대비 ratio 0.5 이상이면 통과
          console.log(`    ${kw}: ${ratio.toFixed(2)} (${pct}%) ${pass ? '✅' : '❌ 탈락'}`);
          if (pass) {
            const original = toVerify.find(r => r.keyword === kw);
            if (original) verified.push(original);
          }
        }
      } catch {}
    }

    console.log(`\n  검증 통과: ${verified.length}개 / ${toVerify.length}개`);
    return verified;
  }

  return finalRanked;
  */
}

// 재료/대분류/음료 등 제외 목록
const EXCLUDE_KEYWORDS = [
  // 재료/대분류
  '크림치즈', '초콜릿', '생크림', '버터',
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

// 유사 키워드 병합 (짧은 이름이 긴 이름에 포함되면 합침)
function deduplicateKeywords(ranked) {
  const result = [];
  const used = new Set();
  for (const item of ranked) {
    const isDuplicate = result.some(r =>
      item.keyword.includes(r.keyword) || r.keyword.includes(item.keyword)
    );
    if (!isDuplicate) {
      result.push(item);
    }
  }
  return result;
}

// Step 4: 카페 검색 결과 있는 것만 필터 + 재료/대분류 제외
async function filterBySearchResults(ranked) {
  // 유사 키워드 병합
  ranked = deduplicateKeywords(ranked);

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
