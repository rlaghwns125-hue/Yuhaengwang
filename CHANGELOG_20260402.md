# 작업 내역 - 2026.04.02

## 주요 변경사항

### 1. 카카오 로컬 API 도입 (검색 정확도 개선)
- **이전**: 네이버 검색 API (텍스트 매칭, 위치 기반 미지원)
- **이후**: 카카오 로컬 API (좌표 + 반경 2km + 거리순 정렬)
- 검색 시 내 위치 반경 2km 이내 카페만 표시
- 2km 내 3개 미만이면 5km로 자동 확장
- 거리 정보 표시 (452m, 1.2km 등)
- 가게 상세 클릭 시 **네이버 지도**로 연결 (리뷰/별점 확인)

### 2. AI 챗봇 추가 (검색창 대체)
- 기존 검색창 제거 → 🤖 AI 챗봇 버튼으로 교체
- Claude AI 기반 자연어 대화로 디저트/카페 추천
- "크로플 맛집 추천해줘" → AI 답변 + 주변 카페 자동 검색
- 챗봇 내부에 가게 카드 횡스크롤 표시 (이름, 별점, 거리, 카테고리)
- 가게 카드 클릭 → 챗봇 닫힘 → 지도에 해당 가게 표시
- 좌우 화살표 네비게이션 (끝에서 사라짐)

### 3. 최근 TOP3 디저트
- 네이버 블로그 언급 빈도 + 데이터랩 검색량 종합 순위
- 대분류(케이크, 쿠키 등) 제외 → 구체적 디저트명만 (버터떡, 에그타르트 등)
- CDN 캐시 1시간 (새로고침해도 안 바뀜)
- PC: 우측 하단 / 모바일: 우측 하단 (작은 사이즈)

### 4. 검색 결과 리스트 개선
- 클릭 횟수 기반 순위 → **리뷰 많은 순** (네이버 API sort=comment)
- 순위 번호 뱃지 + 별점 표시
- 거리 정보 표시
- 가게 펼치기 → 주소, 전화번호, 네이버 지도 링크

### 5. 지도 개선
- 가게 클릭 시 해당 가게를 **지도 정중앙**에 배치 (zoom 17)
- 내 위치 아이콘 (파란 점 + 📍 버튼)
- 기본 줌 레벨 17 (상공 약 100m)
- 지도 이동 시 **지도 중심 좌표** 기준으로 검색

### 6. 디저트바 횡스크롤
- 웹: 네이티브 div + 마우스 드래그 스크롤
- 모바일: ScrollView horizontal

### 7. UI 개선
- 상하 공백 축소
- 모바일 검색 리스트 크기 축소 (20%, min 160px)
- PWA manifest 추가 (홈 화면 추가 시 URL바 숨김)
- 챗봇/로그인 버튼 겹침 해결

### 8. Vercel 배포
- 웹 빌드 + Serverless Functions 배포
- 환경변수 설정 (네이버, 카카오, Claude API 키)
- CDN 캐시 적용 (트렌드 API)

---

## 기술 스택 변경

| 영역 | 이전 | 이후 |
|------|------|------|
| 장소 검색 | 네이버 검색 API (텍스트 기반) | **카카오 로컬 API** (좌표 + 반경) |
| 검색 UI | 검색창 (텍스트 입력) | **AI 챗봇** (자연어 대화) |
| 가게 상세 | 자체 PlaceCard | **네이버 지도** 링크 연결 |
| 배포 | 로컬만 | **Vercel** (웹 + Serverless) |

---

## 추가된 API 키

| 서비스 | 키 | 용도 |
|--------|-----|------|
| 카카오 REST API | `KAKAO_REST_API_KEY` | 좌표 기반 장소 검색 |

---

## 파일 변경 목록

### 새로 생성
- `api/chat.js` - AI 챗봇 Serverless Function
- `api/search-kakao.js` - 카카오 로컬 검색 프록시
- `api/trends-rising.js` - TOP3 API
- `api/trends-desserts.js` - 디저트 트렌드 API  
- `api/reverse-geocode.js` - 역지오코딩 API
- `src/components/AiChatBubble.tsx` - AI 챗봇 컴포넌트
- `src/components/RisingTop3.tsx` - TOP3 컴포넌트
- `vercel.json` - Vercel 배포 설정
- `public/manifest.json` - PWA 설정
- `CHANGELOG_20260402.md` - 이 파일

### 수정
- `src/services/naverSearch.ts` - 카카오 API 도입
- `src/stores/locationStore.ts` - 지도 중심 좌표 관리 추가
- `src/stores/trendStore.ts` - 좌표 전달 추가
- `src/config/api.ts` - 카카오/챗봇 엔드포인트 추가
- `src/types/index.ts` - Place에 distance, placeUrl 추가
- `src/components/NaverMap.tsx` - focusPlace, 내위치 마커/버튼
- `src/components/PlaceList.tsx` - 리뷰순 + 거리 표시
- `src/components/TrendButtons.tsx` - 드래그 횡스크롤
- `app/index.tsx` - AI 챗봇 연동, 검색창 제거
- `proxy-server.js` - 카카오/챗봇 라우트 추가
- `.env` - 카카오 키 추가

---

## 배포 정보
- **URL**: https://yuhaengwang.vercel.app
- **재배포**: `npx vercel --yes --prod`
- **로컬 실행**: `npm run web` + `npm run proxy`
