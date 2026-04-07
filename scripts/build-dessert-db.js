/**
 * 디저트 지식 DB 구축 스크립트
 * 실행: node scripts/build-dessert-db.js
 *
 * Claude AI로 디저트 백과사전 데이터를 생성해서 Firestore에 저장
 * 챗봇이 답변할 때 이 DB를 참고 (RAG)
 */

const Anthropic = require('@anthropic-ai/sdk');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, Timestamp } = require('firebase/firestore');
require('dotenv').config();

const app = initializeApp({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);
const client = new Anthropic({ apiKey: process.env.EXPO_PUBLIC_CLAUDE_API_KEY });

const DESSERT_LIST = [
  '크로플', '마카롱', '소금빵', '탕후루', '약과', '에그타르트',
  '브라우니', '젤라또', '카스테라', '호떡', '슈크림', '크루아상',
  '스콘', '버터떡', '두쫀쿠키', '휘낭시에', '바스크치즈케이크',
  '몽블랑', '크레이프', '소라빵', '화과자', '마들렌', '까눌레',
  '티라미수', '붕어빵', '팥빙수', '베이글', '에클레어',
  '타르트', '푸딩', '판나코타', '당근케이크', '딸기모찌',
  '아포가토', '그릭요거트', '초코브라우니', '롤케이크',
  '파운드케이크', '머핀', '츄러스', '도넛', '와플',
  '두바이 초콜릿', '크럼블', '후르츠산도', '빙수',
];

async function generateDessertInfo(dessertName) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `"${dessertName}" 디저트에 대해 아래 JSON 형식으로 알려줘. 다른 텍스트 없이 JSON만:
{
  "name": "${dessertName}",
  "description": "한줄 설명 (20자 이내)",
  "origin": "원산지/유래",
  "taste": "맛 특징 (달달한, 바삭한, 쫀득한 등)",
  "season": "추천 계절 (봄/여름/가을/겨울/사계절)",
  "mood": ["이런 기분일 때 추천 키워드 3개"],
  "pairing": ["어울리는 음료 2개"],
  "funFact": "재미있는 사실 한 줄",
  "searchTips": ["카카오맵에서 검색할 때 유용한 키워드 3개"],
  "relatedDesserts": ["비슷한 디저트 3개"]
}`
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  return null;
}

async function main() {
  console.log('🍰 디저트 DB 구축 시작!\n');

  let success = 0;
  let fail = 0;

  for (const dessert of DESSERT_LIST) {
    try {
      process.stdout.write(`  ${dessert}...`);
      const info = await generateDessertInfo(dessert);
      if (info) {
        await setDoc(doc(db, 'dessertDB', dessert), {
          ...info,
          updatedAt: Timestamp.now(),
        });
        console.log(' ✅');
        success++;
      } else {
        console.log(' ❌ (파싱 실패)');
        fail++;
      }
    } catch (e) {
      console.log(` ❌ (${e.message})`);
      fail++;
    }
    // API 속도 제한 방지
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ 완료! 성공: ${success}개, 실패: ${fail}개`);
  process.exit(0);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
