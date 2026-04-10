# 유행왕 작업 로그 - 2026-04-07

## 1. 검색 기능 개선

### 창억떡 검색 안 되던 문제 수정
- `searchWithKakao`에 `locationName` 파라미터 누락 → ReferenceError로 전국 검색 폴백 미작동
- `searchWithNaverNearby` 10km 거리 제한이 폴백에서도 적용되던 문제 → `applyDistanceLimit` 파라미터 추가
- **검색 흐름 개선:**
  1. 카카오(1km~20km) + 네이버(10km) 동시 검색
  2. 결과 0건 시 → 네이버(거리 무제한) + 카카오(전국) 동시 검색
- 파일: `src/services/naverSearch.ts`

## 2. 마켓 시스템 구현

### 마켓 페이지 (`app/market.tsx`)
- 5개 탭: 디저트바 / 아이콘 / 가게리스트 / 챗봇 / 쿠키충전
- 3x3 그리드 상품 목록
- 카테고리별 미리보기 컴포넌트 (`ItemPreview`)
  - 디저트바: 실제 테마 색상 적용된 미니 버튼 ("유행왕" 텍스트)
  - 가게리스트: 커스텀 목록 아이콘 (`ListIcon` 컴포넌트)
- 구매/장착/해제 기능 (`window.confirm` 사용 - 웹 호환)
- 쿠키 충전 탭: 50/100/300/500/1000 쿠키 팩

### 마켓 스토어 (`src/stores/marketStore.ts`)
- Firestore `userMarket/{uid}` 컬렉션에 회원별 데이터 저장
  - cookies (보유 쿠키), purchasedIds (구매 목록), equippedIds (장착 상태)
- 구매/장착/해제/충전 시 자동 Firestore 동기화
- 로그인 시 `_layout.tsx`에서 `loadUserMarket()` 호출
- 새로고침해도 장착 디자인 유지

### 상품 데이터 탭별 분리
- `src/data/market/dessertBar.ts` — 디저트바 상품
- `src/data/market/dessertIcon.ts` — 아이콘 상품
- `src/data/market/placeList.ts` — 가게리스트 상품
- `src/data/market/chatbot.ts` — 챗봇 상품
- `src/data/market/index.ts` — 전체 합산 export

### 등록된 디저트바 상품 (3종)
| 이름 | 가격 | 배경 | 버튼 | 선택 버튼 |
|------|------|------|------|-----------|
| 미드나잇 네온 | 1000 | 어두운 남색 | 네이비 | 보라 네온 |
| 레드핑크 | 1000 | 파스텔 핑크 | 연분홍 | 코랄핑크 |
| 피톤치드그린 | 1000 | 파스텔 민트 | 연초록 | 세이지그린 |

### 테마 적용 연동
- `TrendButtons` — `useMarketStore` 구독으로 디저트바 버튼 스타일 실시간 반영
- `index.tsx` bottomOverlay — 바 배경색 테마 적용
- 관리자(`rlaghwns125@gmail.com`) 무료 구매 (쿠키 차감 없음)

### 마켓 아이콘
- 메인 화면 상단에 마켓 아이콘 추가 (`assets/icons/market.png` — 장바구니+쿠키 이미지)
- 비로그인 시 마켓 클릭 → 로그인 페이지로 이동

## 3. 마켓 흰 화면 문제 수정
- `authStore`에 `authReady` 플래그 추가 — Firebase 인증 복원 완료 추적
- `_layout.tsx`에서 `onAuthChange` 콜백 완료 시 `setAuthReady()` 호출
- 마켓 페이지: 인증 복원 중 → 로딩 스피너, 비로그인 확정 → 메인 페이지로 리다이렉트

## 4. 마켓→뒤로가기 시 지도 깨짐 수정
- `NaverMap`에 `resize` 이벤트 리스너 추가 (window resize, visibilitychange, popstate)
- `index.tsx`에 `useFocusEffect`로 홈 복귀 시 `window.dispatchEvent(new Event('resize'))` 트리거

## 5. 로컬/운영 트렌드 순위 불일치 수정
- 원인: 로컬 프록시는 블로그+Claude 실시간 수집, 운영은 Firestore 읽기
- `proxy-server.js` — Firestore를 1순위로 읽도록 변경 (운영과 동일한 데이터 소스)
- Firebase 앱 중복 초기화 방지 (`getApps()` 체크)

## 6. 검색 로그 개선
- `logSearch`를 검색 시작 직후 호출로 변경 (검색 실패해도 로그 저장)
- 쿨다운 1분 → 10분으로 변경
- 검색 로그 집계 스크립트: `scripts/check-search-logs.js`
  ```
  node scripts/check-search-logs.js        # 최근 24시간
  node scripts/check-search-logs.js 72     # 최근 72시간
  node scripts/check-search-logs.js all    # 전체
  ```

## 7. 기타
- `tsconfig.json`에 `ignoreDeprecations: "6.0"` 추가 (baseUrl deprecated 경고 해결)
- `MarketItem` 타입 추가 (`src/types/index.ts`)
