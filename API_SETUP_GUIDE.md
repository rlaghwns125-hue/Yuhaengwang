# API 등록 가이드

유행왕 프로젝트에서 사용하는 외부 API 등록 방법을 정리한 문서입니다.

---

## 1. 네이버 지도 SDK (Maps)

### 발급처
- **네이버 클라우드 플랫폼 (NCP)**: https://www.ncloud.com/

### 등록 방법
1. ncloud.com 접속 → 네이버 계정으로 로그인
2. 우측 상단 **콘솔** 클릭
3. 상단 검색창에 **"Maps"** 검색 → Maps 서비스 페이지 진입
4. **Subscription** 메뉴에서 **이용 신청** (무료)
5. **Application** 메뉴 → **Application 등록** 클릭
6. 설정:
   - Application 이름: `Yuhaengwang`
   - API 선택: **Dynamic Map** 체크
   - Web 서비스 URL: `http://localhost:8081`, `http://localhost:19006`, `http://localhost` 추가
   - Android 앱 패키지 이름: `com.yuhaengwang.app`
   - iOS Bundle ID: `com.yuhaengwang.app`
7. 등록 완료 → **인증 정보**에서 Client ID 확인

### 환경변수
```
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=발급받은_Client_ID
```

### 스크립트 URL 형식
```
https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=CLIENT_ID
```
- `ncpClientId`가 아닌 **`ncpKeyId`** 파라미터 사용 (2026년 기준)
- 도메인: `oapi.map.naver.com` (openapi가 아님)

### 주의사항
- 등록 후 **최대 30분~수시간** 반영 시간이 걸릴 수 있음
- 무료 티어: 월 6,000,000건

---

## 2. 네이버 검색 API + 데이터랩 API

### 발급처
- **네이버 개발자 센터**: https://developers.naver.com/

### 등록 방법
1. developers.naver.com 접속 → 네이버 계정으로 로그인
2. 상단 **Application** → **애플리케이션 등록**
3. 설정:
   - 애플리케이션 이름: `Yuhaengwang`
   - 사용 API: **검색** 선택 (드롭다운에서)
   - 사용 API 추가: **데이터랩(검색어트렌드)** 선택 (드롭다운에서 별도로 추가)
   - 비로그인 오픈 API 서비스 환경:
     - WEB 설정 → 웹 서비스 URL: `http://localhost:8081`
     - Android 설정 → 패키지 이름: `com.yuhaengwang.app`
4. 등록 완료 → **개요** 탭에서 Client ID / Client Secret 확인

### 환경변수
```
# 검색 API (지역 검색)
EXPO_PUBLIC_NAVER_SEARCH_CLIENT_ID=발급받은_Client_ID
EXPO_PUBLIC_NAVER_SEARCH_CLIENT_SECRET=발급받은_Client_Secret

# 데이터랩 API (같은 키 사용 - 같은 앱에 추가 등록했으므로)
EXPO_PUBLIC_NAVER_DATALAB_CLIENT_ID=위와_동일한_Client_ID
EXPO_PUBLIC_NAVER_DATALAB_CLIENT_SECRET=위와_동일한_Client_Secret
```

### API 엔드포인트
- 지역 검색: `https://openapi.naver.com/v1/search/local.json`
- 블로그 검색: `https://openapi.naver.com/v1/search/blog.json`
- 데이터랩: `https://openapi.naver.com/v1/datalab/search`

### 주의사항
- **검색 API와 데이터랩은 같은 앱에 등록 가능** (사용 API 드롭다운에서 각각 추가)
- 네이버 클라우드(NCP)의 AI·NAVER API 키와는 다름! developers.naver.com 키를 사용
- 무료 티어: 검색 일 25,000건 / 데이터랩 일 1,000건
- CORS 제한: 브라우저에서 직접 호출 불가 → **프록시 서버** 경유 필요

---

## 3. Firebase (Auth + Firestore)

### 발급처
- **Firebase 콘솔**: https://console.firebase.google.com/

### 등록 방법
1. Firebase 콘솔 접속 → Google 계정으로 로그인
2. **프로젝트 만들기** → 이름: `yuhaengwang`
3. **웹 앱 추가** (`</>` 아이콘 클릭)
   - 앱 닉네임: `Yuhaengwang`
   - Firebase 호스팅 설정: **체크 해제** (불필요)
   - npm 사용 선택 (기본값 유지)
   - 표시되는 `firebaseConfig` 값 복사
4. **Authentication 설정**:
   - 왼쪽 메뉴 → **보안** 카테고리 → **Authentication**
   - **시작하기** → 로그인 방법 탭
   - **이메일/비밀번호** 활성화
   - **Google** 활성화 (프로젝트 지원 이메일 선택)
5. **Firestore Database 설정**:
   - 왼쪽 메뉴 → **데이터베이스 및 스토리지** → **Firestore**
   - **데이터베이스 만들기**
   - 버전: **Standard 버전**
   - 위치: **asia-northeast3 (Seoul)**
   - 보안 규칙: **테스트 모드에서 시작**

### 환경변수
```
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=프로젝트명.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=프로젝트명
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=프로젝트명.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=숫자
EXPO_PUBLIC_FIREBASE_APP_ID=1:숫자:web:영숫자
```

### 주의사항
- Spark(무료) 플랜으로 충분
- Firestore 테스트 모드는 30일 후 만료 → 이후 `firestore.rules` 적용 필요
- Authentication, Firestore는 "빌드" 메뉴가 아닌 **제품 카테고리**에서 찾아야 함

---

## 4. Claude API (Anthropic)

### 발급처
- **Anthropic 콘솔**: https://console.anthropic.com/

### 등록 방법
1. console.anthropic.com 접속 → 계정 생성/로그인
2. **API Keys** 메뉴
3. **Create Key** → 키 이름 입력 → 생성
4. `sk-ant-api03-...` 형식의 키 복사

### 환경변수
```
EXPO_PUBLIC_CLAUDE_API_KEY=sk-ant-api03-...
```

### 사용 모델
- `claude-sonnet-4-6` (트렌드 분석용)

### 주의사항
- **유료** (크레딧 필요)
- 콘솔에 일시적 장애가 있을 수 있음 (2026.04.01 확인됨)
- Claude API 키 없이도 앱은 기본 트렌드 데이터로 동작 (폴백 처리)

---

## 환경변수 파일 (.env)

프로젝트 루트에 `.env` 파일 생성:

```env
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Naver Map SDK (NCP - ncloud.com)
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=

# Naver Search API (developers.naver.com)
EXPO_PUBLIC_NAVER_SEARCH_CLIENT_ID=
EXPO_PUBLIC_NAVER_SEARCH_CLIENT_SECRET=

# Naver DataLab API (developers.naver.com - 검색 API와 같은 키)
EXPO_PUBLIC_NAVER_DATALAB_CLIENT_ID=
EXPO_PUBLIC_NAVER_DATALAB_CLIENT_SECRET=

# Claude API (console.anthropic.com)
EXPO_PUBLIC_CLAUDE_API_KEY=
```

> `.env` 파일은 `.gitignore`에 포함되어 있어 git에 커밋되지 않습니다.
> `.env.example` 파일을 참고하여 키를 채워넣으세요.

---

## 헷갈리기 쉬운 포인트

| 구분 | 네이버 클라우드 (ncloud.com) | 네이버 개발자 (developers.naver.com) |
|------|---|---|
| 용도 | 지도 SDK | 검색 API, 데이터랩 API |
| 키 형식 | `z32z...` (짧은 영숫자) | `kQWf...` (긴 영숫자) |
| 인증 파라미터 | `ncpKeyId` | `X-Naver-Client-Id` 헤더 |
| 두 사이트는 별개 | 각각 따로 앱 등록 필요 | |
