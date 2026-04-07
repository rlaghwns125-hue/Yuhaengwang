import axios from 'axios';
import { NAVER_CONFIG, API_ENDPOINTS } from '../config/api';
import { Place } from '../types';

// 카카오는 프록시 경유

// 대형 프랜차이즈 필터 목록
const FRANCHISE_LIST = [
  // 카페 프랜차이즈
  '스타벅스', '투썸플레이스', '투썸', '이디야', '메가커피', '메가MGC',
  '컴포즈커피', '컴포즈', '빽다방', '할리스', '엔제리너스',
  '커피빈', '폴바셋', '탐앤탐스', '카페베네', '공차', '쥬씨',
  '더벤티', '매머드', '매머드커피', '요거프레소', '카페봄봄',
  '그라찌에', '드롭탑', '빈스빈스', '셀렉토커피', '더착한커피',
  '토프레소', '커피에반하다', '커피스미스', '카페띠아모',
  // 베이커리/디저트 프랜차이즈
  '파리바게뜨', '파리바게트', '뚜레쥬르', '던킨', '던킨도너츠',
  '배스킨라빈스', '배라', '설빙', '크리스피크림', '나뚜루',
  '뚜레쥬르', '삼립', '신라명과', '성심당', '롯데제과',
  // 패스트푸드/편의점
  '맘스터치', '버거킹', '맥도날드', '롯데리아', 'KFC', '서브웨이',
  'CU', 'GS25', '세븐일레븐', '이마트24', '미니스톱',
  // 기타
  '올리브영', '다이소',
];

function isFranchise(name: string): boolean {
  return FRANCHISE_LIST.some((f) => name.includes(f));
}

interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  distance: string;
  place_url: string;
}

// 카카오 우선 + 네이버 보조 (둘 다 검색해서 합침)
export async function searchDessertCafes(
  keyword: string,
  locationName: string,
  userLat?: number,
  userLng?: number
): Promise<Place[]> {
  if (userLat && userLng) {
    // 카카오 + 네이버 항상 둘 다 검색 (네이버는 지역명 포함)
    const [kakao, naver] = await Promise.all([
      searchWithKakao(keyword, userLat, userLng, locationName).catch(() => [] as Place[]),
      searchWithNaverNearby(keyword, userLat, userLng, locationName).catch(() => [] as Place[]),
    ]);

    // 합치기 + 이름 기준 중복 제거 + 프랜차이즈 제거
    const seen = new Set<string>();
    const merged: Place[] = [];
    for (const p of [...kakao, ...naver]) {
      const key = p.name.replace(/\s/g, '');
      if (!seen.has(key) && !isFranchise(p.name)) {
        seen.add(key);
        merged.push(p);
      }
    }

    // 근처에 결과 없으면 전국 검색 (거리 제한 없이)
    if (merged.length === 0) {
      const [naverWide, kakaoWide] = await Promise.all([
        searchWithNaverNearby(keyword, userLat, userLng, locationName, false).catch(() => [] as Place[]),
        searchKakaoNationwide(keyword).catch(() => [] as Place[]),
      ]);
      for (const p of [...naverWide, ...kakaoWide]) {
        const key = p.name.replace(/\s/g, '');
        if (!seen.has(key) && !isFranchise(p.name)) {
          seen.add(key);
          merged.push(p);
        }
      }
    }

    // 거리순 정렬
    merged.sort((a, b) => (a.distance || 99999) - (b.distance || 99999));
    return merged;
  }
  return searchWithNaver(keyword, locationName);
}

// 카카오 전국 검색 (반경 제한 없음)
async function searchKakaoNationwide(keyword: string): Promise<Place[]> {
  try {
    const r = await axios.get<{ documents: KakaoPlace[] }>(
      API_ENDPOINTS.KAKAO_LOCAL_SEARCH,
      { params: { query: keyword, sort: 'accuracy', size: 15 } }
    );
    return r.data.documents.map((item) => ({
      id: item.id,
      name: item.place_name,
      address: item.road_address_name || item.address_name,
      latitude: parseFloat(item.y),
      longitude: parseFloat(item.x),
      category: item.category_name,
      rating: 0,
      telephone: item.phone,
      placeUrl: item.place_url,
      distance: 0,
      cachedAt: new Date(),
    }));
  } catch {
    return [];
  }
}

// 카카오 로컬 검색 (프록시 경유, 반경 2km, 거리순)
async function searchWithKakao(keyword: string, lat: number, lng: number, locationName?: string): Promise<Place[]> {
  const mapResponse = (docs: KakaoPlace[]): Place[] =>
    docs.map((item) => ({
      id: item.id,
      name: item.place_name,
      address: item.road_address_name || item.address_name,
      latitude: parseFloat(item.y),
      longitude: parseFloat(item.x),
      category: item.category_name,
      rating: 0,
      telephone: item.phone,
      placeUrl: item.place_url,
      distance: parseInt(item.distance),
      cachedAt: new Date(),
    }));

  try {
    // 카페(CE7) 먼저, 부족하면 음식점(FD6) 추가
    async function searchCategory(category: string, radius: number) {
      const r = await axios.get<{ documents: KakaoPlace[] }>(
        API_ENDPOINTS.KAKAO_LOCAL_SEARCH,
        { params: { query: keyword, x: lng, y: lat, radius, sort: 'distance', size: 15, category_group_code: category } }
      );
      return mapResponse(r.data.documents);
    }

    // 1차: 카페 1km
    let allPlaces = await searchCategory('CE7', 1000);

    // 카페 부족하면 음식점도 검색
    if (allPlaces.length < 3) {
      const fd = await searchCategory('FD6', 1000);
      allPlaces = [...allPlaces, ...fd];
    }

    // 1km 내 3개 미만이면 범위 확장
    if (allPlaces.length < 3) {
      const expandSteps = [2000, 5000, 10000, 20000];
      for (const radius of expandSteps) {
        const [ce, fd] = await Promise.all([
          searchCategory('CE7', radius),
          searchCategory('FD6', radius),
        ]);
        // 중복 제거
        const seen = new Set(allPlaces.map(p => p.name.replace(/\s/g, '')));
        for (const p of [...ce, ...fd]) {
          if (!seen.has(p.name.replace(/\s/g, ''))) {
            seen.add(p.name.replace(/\s/g, ''));
            allPlaces.push(p);
          }
        }
        if (allPlaces.length >= 3) break;
      }
    }

    // 프랜차이즈 제외
    const filtered = allPlaces.filter((p) => !isFranchise(p.name));
    const result = filtered.length > 0 ? filtered : allPlaces;

    return result;
  } catch {
    // 카카오 실패 시에도 네이버 폴백
    return searchWithNaverNearby(keyword, lat, lng);
  }
}

// 네이버 검색 + 지역명 + 좌표 기준 거리순 정렬
async function searchWithNaverNearby(keyword: string, lat: number, lng: number, locationName?: string, applyDistanceLimit: boolean = true): Promise<Place[]> {
  try {
    // 지역명 추가해서 가까운 결과 유도 (예: "영등포 두쫀쿠")
    const region = locationName ? locationName.split(' ').slice(0, 2).join(' ') : '';
    const searchQuery = region ? `${region} ${keyword}` : keyword;

    const response = await axios.get<{ items: any[] }>(
      API_ENDPOINTS.NAVER_LOCAL_SEARCH,
      {
        params: { query: searchQuery, display: 20, sort: 'comment' },
        headers: {
          'X-Naver-Client-Id': NAVER_CONFIG.SEARCH_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CONFIG.SEARCH_CLIENT_SECRET,
        },
      }
    );

    const places = response.data.items.map((item: any, index: number) => {
      const plat = parseInt(item.mapy) / 1e7;
      const plng = parseInt(item.mapx) / 1e7;
      const R = 6371;
      const dLat = ((plat - lat) * Math.PI) / 180;
      const dLng = ((plng - lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat * Math.PI) / 180) * Math.cos((plat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return {
        id: `naver_${index}_${Date.now()}`,
        name: item.title.replace(/<[^>]*>/g, ''),
        address: item.roadAddress || item.address,
        latitude: plat,
        longitude: plng,
        category: item.category,
        rating: 0,
        telephone: item.telephone,
        distance: Math.round(dist * 1000), // m 단위
        cachedAt: new Date(),
      };
    });

    // 카페/음식점/디저트 카테고리만 (+ 거리 제한 적용 시 10km 이내)
    const foodKeywords = ['카페', '디저트', '음식점', '베이커리', '제과', '빵', '떡', '간식', '아이스크림', '음료'];
    const nearby = places.filter((p: any) => {
      if (applyDistanceLimit && p.distance > 10000) return false;
      // 카테고리에 음식 관련 키워드가 있는지
      const cat = (p.category || '').toLowerCase();
      return foodKeywords.some(k => cat.includes(k));
    });
    nearby.sort((a: any, b: any) => a.distance - b.distance);

    const filtered = nearby.filter((p: any) => !isFranchise(p.name));
    return filtered.length > 0 ? filtered : nearby;
  } catch {
    return [];
  }
}

// 네이버 검색 (폴백)
async function searchWithNaver(keyword: string, locationName: string): Promise<Place[]> {
  try {
    const query = locationName ? `${locationName} ${keyword} 카페` : `${keyword} 카페`;
    const response = await axios.get<{ items: any[] }>(
      API_ENDPOINTS.NAVER_LOCAL_SEARCH,
      {
        params: { query, display: 15, sort: 'comment' },
        headers: {
          'X-Naver-Client-Id': NAVER_CONFIG.SEARCH_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CONFIG.SEARCH_CLIENT_SECRET,
        },
      }
    );

    return response.data.items.map((item, index) => ({
      id: `naver_${index}_${Date.now()}`,
      name: item.title.replace(/<[^>]*>/g, ''),
      address: item.roadAddress || item.address,
      latitude: parseInt(item.mapy) / 1e7,
      longitude: parseInt(item.mapx) / 1e7,
      category: item.category,
      rating: 0,
      telephone: item.telephone,
      cachedAt: new Date(),
    }));
  } catch {
    return [];
  }
}

// 네이버 데이터랩 검색 트렌드 조회
export async function getSearchTrend(keywords: string[]): Promise<Record<string, number>> {
  const keywordGroups = keywords.map((kw) => ({
    groupName: kw,
    keywords: [kw],
  }));

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const response = await axios.post(
    API_ENDPOINTS.NAVER_LOCAL_SEARCH.replace('search-local', 'datalab-search'),
    {
      startDate,
      endDate,
      timeUnit: 'week',
      keywordGroups: keywordGroups.slice(0, 5),
    },
    {
      headers: {
        'X-Naver-Client-Id': NAVER_CONFIG.DATALAB_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CONFIG.DATALAB_CLIENT_SECRET,
        'Content-Type': 'application/json',
      },
    }
  );

  const result: Record<string, number> = {};
  for (const group of response.data.results) {
    const data = group.data;
    const latestRatio = data.length > 0 ? data[data.length - 1].ratio : 0;
    result[group.title] = latestRatio;
  }

  return result;
}
