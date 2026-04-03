import { ImageSourcePropType } from 'react-native';

// 커스텀 이미지 아이콘 (빌드 타임에 require 해석)
const DESSERT_IMAGES: Record<string, ImageSourcePropType> = {
  '마카롱': require('../../assets/desserts/macaron.png'),
  '브라우니': require('../../assets/desserts/brownie.png'),
  '크로플': require('../../assets/desserts/croffle.png'),
  '붕어빵': require('../../assets/desserts/bungeoppang.png'),
  '탕후루': require('../../assets/desserts/tanghuru.png'),
  '약과': require('../../assets/desserts/yakgwa.png'),
  '빙수': require('../../assets/desserts/bingsu.png'),
};

// 이미지가 없는 디저트용 이모지 폴백
export const DESSERT_ICONS: Record<string, string> = {
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

// 키워드에 해당하는 이미지 소스 반환 (없으면 null)
export function getDessertImage(keyword: string): ImageSourcePropType | null {
  for (const [key, image] of Object.entries(DESSERT_IMAGES)) {
    if (keyword.includes(key)) return image;
  }
  return null;
}

// 키워드에 해당하는 이모지 반환
export function getDessertIcon(keyword: string): string {
  for (const [key, icon] of Object.entries(DESSERT_ICONS)) {
    if (keyword.includes(key)) return icon;
  }
  return DEFAULT_DESSERT_ICON;
}
