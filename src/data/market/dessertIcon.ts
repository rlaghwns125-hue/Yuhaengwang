import { MarketItem } from '../../types';

// 디저트 아이콘 탭 상품
// 구매 시 해당 디저트명의 트렌드 버튼 아이콘이 이모지 → 이미지로 교체됨
// themeData.keyword: 적용 대상 디저트 키워드

export const dessertIconItems: MarketItem[] = [
  {
    id: 'icon_macaron',
    name: '마카롱',
    preview: '🧁',
    price: 500,
    rarity: 'normal',
    category: 'dessertIcon',
    description: '마카롱 아이콘을 프리미엄 이미지로 교체',
    themeData: { keyword: '마카롱' },
  },
  {
    id: 'icon_brownie',
    name: '브라우니',
    preview: '🍫',
    price: 500,
    rarity: 'normal',
    category: 'dessertIcon',
    description: '브라우니 아이콘을 프리미엄 이미지로 교체',
    themeData: { keyword: '브라우니' },
  },
  {
    id: 'icon_croffle',
    name: '크로플',
    preview: '🧇',
    price: 500,
    rarity: 'normal',
    category: 'dessertIcon',
    description: '크로플 아이콘을 프리미엄 이미지로 교체',
    themeData: { keyword: '크로플' },
  },
  {
    id: 'icon_bungeoppang',
    name: '붕어빵',
    preview: '🐟',
    price: 500,
    rarity: 'normal',
    category: 'dessertIcon',
    description: '붕어빵 아이콘을 프리미엄 이미지로 교체',
    themeData: { keyword: '붕어빵' },
  },
  {
    id: 'icon_tanghuru',
    name: '탕후루',
    preview: '🍡',
    price: 500,
    rarity: 'normal',
    category: 'dessertIcon',
    description: '탕후루 아이콘을 프리미엄 이미지로 교체',
    themeData: { keyword: '탕후루' },
  },
  {
    id: 'icon_yakgwa',
    name: '약과',
    preview: '🍘',
    price: 500,
    rarity: 'normal',
    category: 'dessertIcon',
    description: '약과 아이콘을 프리미엄 이미지로 교체',
    themeData: { keyword: '약과' },
  },
  {
    id: 'icon_bingsu',
    name: '빙수',
    preview: '🍧',
    price: 500,
    rarity: 'normal',
    category: 'dessertIcon',
    description: '빙수 아이콘을 프리미엄 이미지로 교체',
    themeData: { keyword: '빙수' },
  },
];
