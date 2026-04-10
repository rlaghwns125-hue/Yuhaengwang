// 하드코딩된 마켓 상품을 Firestore에 시드
// 사용: node scripts/seed-market-items.js

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

const ITEMS = [
  // 디저트바
  {
    id: 'bar_midnight', name: '미드나잇 네온', preview: '🌙', price: 2000, rarity: 'epic',
    category: 'dessertBar', description: '어두운 밤하늘에 네온 불빛이 켜진 느낌의 디저트바',
    themeData: { barBg: 'rgba(20, 20, 35, 0.92)', buttonBg: '#1E1E3A', buttonSelectedBg: '#E040FB', buttonTextColor: '#B0B0D0', buttonSelectedTextColor: '#fff', buttonBorderRadius: 20 },
  },
  {
    id: 'bar_redpink', name: '레드핑크', preview: '❤️', price: 1000, rarity: 'rare',
    category: 'dessertBar', description: '레드핑크의 조화 디저트바',
    themeData: { barBg: 'rgba(255, 228, 235, 0.95)', buttonBg: '#FFD1DC', buttonSelectedBg: '#FF8FAB', buttonTextColor: '#9E4B6C', buttonSelectedTextColor: '#fff', buttonBorderRadius: 20 },
  },
  {
    id: 'bar_green', name: '피톤치드그린', preview: '🌱', price: 1000, rarity: 'rare',
    category: 'dessertBar', description: '피톤치드그린의 조화 디저트바',
    themeData: { barBg: 'rgba(220, 245, 230, 0.95)', buttonBg: '#C1E8D5', buttonSelectedBg: '#7BC8A4', buttonTextColor: '#3D7A5F', buttonSelectedTextColor: '#fff', buttonBorderRadius: 20 },
  },
  // 아이콘
  { id: 'icon_macaron', name: '마카롱', preview: '🧁', price: 500, rarity: 'normal', category: 'dessertIcon', description: '마카롱 프리미엄 이미지 아이콘', themeData: { keyword: '마카롱' } },
  { id: 'icon_brownie', name: '브라우니', preview: '🍫', price: 500, rarity: 'normal', category: 'dessertIcon', description: '브라우니 프리미엄 이미지 아이콘', themeData: { keyword: '브라우니' } },
  { id: 'icon_croffle', name: '크로플', preview: '🧇', price: 500, rarity: 'normal', category: 'dessertIcon', description: '크로플 프리미엄 이미지 아이콘', themeData: { keyword: '크로플' } },
  { id: 'icon_bungeoppang', name: '붕어빵', preview: '🐟', price: 500, rarity: 'normal', category: 'dessertIcon', description: '붕어빵 프리미엄 이미지 아이콘', themeData: { keyword: '붕어빵' } },
  { id: 'icon_tanghuru', name: '탕후루', preview: '🍡', price: 500, rarity: 'normal', category: 'dessertIcon', description: '탕후루 프리미엄 이미지 아이콘', themeData: { keyword: '탕후루' } },
  { id: 'icon_yakgwa', name: '약과', preview: '🍘', price: 500, rarity: 'normal', category: 'dessertIcon', description: '약과 프리미엄 이미지 아이콘', themeData: { keyword: '약과' } },
  { id: 'icon_bingsu', name: '빙수', preview: '🍧', price: 500, rarity: 'normal', category: 'dessertIcon', description: '빙수 프리미엄 이미지 아이콘', themeData: { keyword: '빙수' } },
];

async function main() {
  console.log('마켓 상품 시드 시작...\n');
  for (const item of ITEMS) {
    const { id, ...data } = item;
    await setDoc(doc(db, 'marketItems', id), data);
    console.log(`  ✅ ${item.name} (${item.id})`);
  }
  console.log(`\n총 ${ITEMS.length}개 상품 등록 완료!`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
