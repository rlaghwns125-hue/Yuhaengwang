import { MarketItem } from '../../types';

// 디저트바 탭 상품
// themeData 구조:
//   barBg: 하단 바 전체 배경색
//   buttonBg: 버튼 기본 배경색
//   buttonSelectedBg: 버튼 선택 시 배경색
//   buttonTextColor: 버튼 텍스트 색
//   buttonSelectedTextColor: 버튼 선택 시 텍스트 색
//   buttonBorderRadius: 버튼 모서리 둥글기

export const dessertBarItems: MarketItem[] = [
  {
    id: 'bar_midnight',
    name: '미드나잇 네온',
    preview: '🌙',
    price: 1000,
    category: 'dessertBar',
    description: '어두운 밤하늘에 네온 불빛이 켜진 느낌의 디저트바',
    themeData: {
      barBg: 'rgba(20, 20, 35, 0.92)',
      buttonBg: '#1E1E3A',
      buttonSelectedBg: '#E040FB',
      buttonTextColor: '#B0B0D0',
      buttonSelectedTextColor: '#fff',
      buttonBorderRadius: 20,
    },
  },
  {
    id: 'bar_redpink',
    name: '레드핑크',
    preview: '❤️',
    price: 1000,
    category: 'dessertBar',
    description: '레드핑크의 조화 디저트바',
    themeData: {
      barBg: 'rgba(255, 228, 235, 0.95)',
      buttonBg: '#FFD1DC',
      buttonSelectedBg: '#FF8FAB',
      buttonTextColor: '#9E4B6C',
      buttonSelectedTextColor: '#fff',
      buttonBorderRadius: 20,
    },
  },
  {
    id: 'bar_green',
    name: '피톤치드그린',
    preview: '🌱',
    price: 1000,
    category: 'dessertBar',
    description: '피톤치드그린의 조화 디저트바',
    themeData: {
      barBg: 'rgba(220, 245, 230, 0.95)',
      buttonBg: '#C1E8D5',
      buttonSelectedBg: '#7BC8A4',
      buttonTextColor: '#3D7A5F',
      buttonSelectedTextColor: '#fff',
      buttonBorderRadius: 20,
    },
  }
];
