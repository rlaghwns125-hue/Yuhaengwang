import { ImageSourcePropType } from 'react-native';

// 마켓에서 구매 가능한 디저트 이미지 (기본은 이모지, 구매 시 이미지로 교체)
export const DESSERT_PREMIUM_IMAGES: Record<string, ImageSourcePropType> = {
  '마카롱': require('../../assets/desserts/macaron.png'),
  '브라우니': require('../../assets/desserts/brownie.png'),
  '크로플': require('../../assets/desserts/croffle.png'),
  '붕어빵': require('../../assets/desserts/bungeoppang.png'),
  '탕후루': require('../../assets/desserts/tanghuru.png'),
  '약과': require('../../assets/desserts/yakgwa.png'),
  '빙수': require('../../assets/desserts/bingsu.png'),
};

// 모든 디저트 이모지 아이콘 (기본)
export const DESSERT_ICONS: Record<string, string> = {
  '마카롱': '🧁',
  '브라우니': '🍫',
  '크로플': '🧇',
  '붕어빵': '🐟',
  '탕후루': '🍡',
  '약과': '🍘',
  '빙수': '🍧',
  '케이크': '🎂',
  '도넛': '🍩',
  '크레페': '🥞',
  '타르트': '🥧',
  '쿠키': '🍪',
  '푸딩': '🍮',
  '아이스크림': '🍦',
  '와플': '🧇',
  '파이': '🥧',
  '젤라또': '🍨',
  '카스테라': '🍞',
  '슈크림': '🧁',
  '에클레어': '🥖',
  '티라미수': '☕',
  '판나코타': '🍮',
  '떡': '🍡',
  '호떡': '🫓',
  '소금빵': '🥐',
};

export const DEFAULT_DESSERT_ICON = '🍰';

// 키워드에 해당하는 프리미엄 이미지 반환 (마켓 장착용)
export function getDessertPremiumImage(keyword: string): ImageSourcePropType | null {
  for (const [key, image] of Object.entries(DESSERT_PREMIUM_IMAGES)) {
    if (keyword.includes(key)) return image;
  }
  return null;
}

// 키워드에 해당하는 이모지 반환 (기본)
export function getDessertIcon(keyword: string): string {
  for (const [key, icon] of Object.entries(DESSERT_ICONS)) {
    if (keyword.includes(key)) return icon;
  }
  return DEFAULT_DESSERT_ICON;
}
