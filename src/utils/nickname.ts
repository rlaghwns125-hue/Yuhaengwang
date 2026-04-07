// 랜덤 닉네임 생성 (디저트 테마)
const ADJECTIVES = [
  '달콤한', '바삭한', '촉촉한', '부드러운', '쫀득한', '향긋한',
  '시원한', '따뜻한', '고소한', '새콤한', '진한', '풍미있는',
  '행복한', '귀여운', '멋진', '신비한', '빛나는', '용감한',
];

const DESSERTS = [
  '마카롱', '크로플', '브라우니', '타르트', '슈크림', '에클레어',
  '까눌레', '마들렌', '휘낭시에', '크루아상', '소금빵', '베이글',
  '와플', '도넛', '젤라또', '푸딩', '카스테라', '티라미수',
];

export function generateNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const dessert = DESSERTS[Math.floor(Math.random() * DESSERTS.length)];
  const num = Math.floor(Math.random() * 999) + 1;
  return `${adj}${dessert}${num}`;
}
