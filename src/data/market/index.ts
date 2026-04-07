import { MarketItem } from '../../types';
import { dessertBarItems } from './dessertBar';
import { dessertIconItems } from './dessertIcon';
import { placeListItems } from './placeList';
import { chatbotItems } from './chatbot';

// 전체 상품 목록 (탭별 파일에서 합침)
export const ALL_MARKET_ITEMS: MarketItem[] = [
  ...dessertBarItems,
  ...dessertIconItems,
  ...placeListItems,
  ...chatbotItems,
];
