// 좌표 기반 한국 주요 지역명 판별
interface Region {
  name: string;
  lat: number;
  lng: number;
  radius: number; // km
}

const REGIONS: Region[] = [
  // ===== 서울 구별 =====
  { name: '서울 강남구', lat: 37.4979, lng: 127.0276, radius: 3 },
  { name: '서울 서초구', lat: 37.4837, lng: 127.0324, radius: 3 },
  { name: '서울 송파구', lat: 37.5145, lng: 127.1066, radius: 3 },
  { name: '서울 마포구', lat: 37.5663, lng: 126.9014, radius: 3 },
  { name: '서울 영등포구', lat: 37.5264, lng: 126.8963, radius: 3 },
  { name: '서울 종로구', lat: 37.5735, lng: 126.9790, radius: 3 },
  { name: '서울 중구', lat: 37.5641, lng: 126.9979, radius: 3 },
  { name: '서울 용산구', lat: 37.5326, lng: 126.9906, radius: 3 },
  { name: '서울 성동구', lat: 37.5633, lng: 127.0371, radius: 3 },
  { name: '서울 광진구', lat: 37.5385, lng: 127.0823, radius: 3 },
  { name: '서울 동대문구', lat: 37.5744, lng: 127.0396, radius: 3 },
  { name: '서울 성북구', lat: 37.5894, lng: 127.0167, radius: 3 },
  { name: '서울 강북구', lat: 37.6397, lng: 127.0255, radius: 3 },
  { name: '서울 도봉구', lat: 37.6688, lng: 127.0472, radius: 3 },
  { name: '서울 노원구', lat: 37.6543, lng: 127.0568, radius: 3 },
  { name: '서울 은평구', lat: 37.6027, lng: 126.9291, radius: 3 },
  { name: '서울 서대문구', lat: 37.5791, lng: 126.9368, radius: 3 },
  { name: '서울 강서구', lat: 37.5510, lng: 126.8495, radius: 3 },
  { name: '서울 구로구', lat: 37.4955, lng: 126.8875, radius: 3 },
  { name: '서울 금천구', lat: 37.4569, lng: 126.8955, radius: 3 },
  { name: '서울 동작구', lat: 37.5124, lng: 126.9395, radius: 3 },
  { name: '서울 관악구', lat: 37.4784, lng: 126.9516, radius: 3 },
  { name: '서울 강동구', lat: 37.5301, lng: 127.1238, radius: 3 },
  { name: '서울 양천구', lat: 37.5170, lng: 126.8667, radius: 3 },
  { name: '서울 중랑구', lat: 37.6063, lng: 127.0925, radius: 3 },

  // ===== 인천 구/군별 =====
  { name: '인천 중구', lat: 37.4736, lng: 126.6214, radius: 3 },
  { name: '인천 동구', lat: 37.4737, lng: 126.6432, radius: 3 },
  { name: '인천 미추홀구', lat: 37.4421, lng: 126.6530, radius: 3 },
  { name: '인천 연수구', lat: 37.4101, lng: 126.6780, radius: 3 },
  { name: '인천 남동구', lat: 37.4486, lng: 126.7316, radius: 4 },
  { name: '인천 부평구', lat: 37.5079, lng: 126.7219, radius: 3 },
  { name: '인천 계양구', lat: 37.5372, lng: 126.7376, radius: 3 },
  { name: '인천 서구', lat: 37.5457, lng: 126.6760, radius: 4 },
  { name: '인천 강화군', lat: 37.7468, lng: 126.4879, radius: 8 },
  { name: '인천 옹진군', lat: 37.4464, lng: 126.6369, radius: 5 },

  // ===== 부산 구/군별 =====
  { name: '부산 해운대구', lat: 35.1631, lng: 129.1636, radius: 4 },
  { name: '부산 수영구', lat: 35.1454, lng: 129.1133, radius: 3 },
  { name: '부산 남구', lat: 35.1368, lng: 129.0843, radius: 3 },
  { name: '부산 부산진구', lat: 35.1631, lng: 129.0532, radius: 3 },
  { name: '부산 동래구', lat: 35.1960, lng: 129.0858, radius: 3 },
  { name: '부산 금정구', lat: 35.2431, lng: 129.0924, radius: 4 },
  { name: '부산 연제구', lat: 35.1762, lng: 129.0799, radius: 3 },
  { name: '부산 사하구', lat: 35.1046, lng: 128.9748, radius: 4 },
  { name: '부산 사상구', lat: 35.1527, lng: 128.9911, radius: 3 },
  { name: '부산 북구', lat: 35.1974, lng: 129.0294, radius: 3 },
  { name: '부산 강서구', lat: 35.1121, lng: 128.9338, radius: 5 },
  { name: '부산 중구', lat: 35.1064, lng: 129.0324, radius: 3 },
  { name: '부산 서구', lat: 35.0977, lng: 129.0241, radius: 3 },
  { name: '부산 동구', lat: 35.1292, lng: 129.0455, radius: 3 },
  { name: '부산 영도구', lat: 35.0912, lng: 129.0681, radius: 3 },
  { name: '부산 기장군', lat: 35.2446, lng: 129.2222, radius: 6 },

  // ===== 대구 구/군별 =====
  { name: '대구 중구', lat: 35.8690, lng: 128.6063, radius: 2 },
  { name: '대구 동구', lat: 35.8862, lng: 128.6357, radius: 4 },
  { name: '대구 서구', lat: 35.8718, lng: 128.5592, radius: 3 },
  { name: '대구 남구', lat: 35.8460, lng: 128.5975, radius: 3 },
  { name: '대구 북구', lat: 35.8858, lng: 128.5828, radius: 4 },
  { name: '대구 수성구', lat: 35.8584, lng: 128.6317, radius: 4 },
  { name: '대구 달서구', lat: 35.8299, lng: 128.5326, radius: 4 },
  { name: '대구 달성군', lat: 35.7746, lng: 128.4319, radius: 8 },

  // ===== 대전 구별 =====
  { name: '대전 중구', lat: 36.3254, lng: 127.4214, radius: 3 },
  { name: '대전 동구', lat: 36.3120, lng: 127.4548, radius: 4 },
  { name: '대전 서구', lat: 36.3554, lng: 127.3838, radius: 4 },
  { name: '대전 유성구', lat: 36.3622, lng: 127.3561, radius: 5 },
  { name: '대전 대덕구', lat: 36.3467, lng: 127.4156, radius: 4 },

  // ===== 광주 구별 =====
  { name: '광주 동구', lat: 35.1461, lng: 126.9231, radius: 3 },
  { name: '광주 서구', lat: 35.1523, lng: 126.8914, radius: 3 },
  { name: '광주 남구', lat: 35.1332, lng: 126.9024, radius: 3 },
  { name: '광주 북구', lat: 35.1744, lng: 126.9120, radius: 4 },
  { name: '광주 광산구', lat: 35.1394, lng: 126.7938, radius: 5 },

  // ===== 울산 구/군별 =====
  { name: '울산 중구', lat: 35.5697, lng: 129.3322, radius: 3 },
  { name: '울산 남구', lat: 35.5444, lng: 129.3300, radius: 4 },
  { name: '울산 동구', lat: 35.5050, lng: 129.4165, radius: 4 },
  { name: '울산 북구', lat: 35.5838, lng: 129.3611, radius: 4 },
  { name: '울산 울주군', lat: 35.5225, lng: 129.2417, radius: 10 },

  // ===== 세종 =====
  { name: '세종', lat: 36.4800, lng: 127.2890, radius: 10 },

  // ===== 경기도 시/구별 =====
  { name: '수원 장안구', lat: 37.3040, lng: 127.0103, radius: 3 },
  { name: '수원 권선구', lat: 37.2578, lng: 127.0287, radius: 3 },
  { name: '수원 팔달구', lat: 37.2854, lng: 127.0184, radius: 3 },
  { name: '수원 영통구', lat: 37.2596, lng: 127.0468, radius: 3 },
  { name: '성남 분당구', lat: 37.3825, lng: 127.1189, radius: 4 },
  { name: '성남 수정구', lat: 37.4504, lng: 127.1457, radius: 4 },
  { name: '성남 중원구', lat: 37.4314, lng: 127.1137, radius: 3 },
  { name: '고양 일산동구', lat: 37.6586, lng: 126.7748, radius: 4 },
  { name: '고양 일산서구', lat: 37.6755, lng: 126.7509, radius: 4 },
  { name: '고양 덕양구', lat: 37.6375, lng: 126.8320, radius: 4 },
  { name: '용인 수지구', lat: 37.3225, lng: 127.0982, radius: 4 },
  { name: '용인 기흥구', lat: 37.2800, lng: 127.1150, radius: 4 },
  { name: '용인 처인구', lat: 37.2341, lng: 127.2013, radius: 6 },
  { name: '안양', lat: 37.3943, lng: 126.9568, radius: 5 },
  { name: '부천', lat: 37.5034, lng: 126.7660, radius: 5 },
  { name: '화성', lat: 37.1994, lng: 126.8313, radius: 10 },
  { name: '평택', lat: 36.9921, lng: 127.1126, radius: 8 },
  { name: '안산', lat: 37.3219, lng: 126.8309, radius: 6 },
  { name: '파주', lat: 37.7590, lng: 126.7800, radius: 10 },
  { name: '김포', lat: 37.6153, lng: 126.7156, radius: 7 },
  { name: '하남', lat: 37.5393, lng: 127.2147, radius: 5 },
  { name: '광명', lat: 37.4786, lng: 126.8644, radius: 4 },
  { name: '시흥', lat: 37.3800, lng: 126.8030, radius: 6 },
  { name: '군포', lat: 37.3617, lng: 126.9352, radius: 4 },
  { name: '의왕', lat: 37.3448, lng: 126.9686, radius: 4 },
  { name: '오산', lat: 37.1498, lng: 127.0698, radius: 5 },
  { name: '이천', lat: 37.2723, lng: 127.4350, radius: 8 },
  { name: '양평', lat: 37.4917, lng: 127.4875, radius: 10 },
  { name: '구리', lat: 37.5943, lng: 127.1295, radius: 4 },
  { name: '남양주', lat: 37.6360, lng: 127.2163, radius: 8 },
  { name: '의정부', lat: 37.7381, lng: 127.0338, radius: 5 },
  { name: '동두천', lat: 37.9035, lng: 127.0606, radius: 5 },
  { name: '양주', lat: 37.7853, lng: 127.0457, radius: 7 },
  { name: '포천', lat: 37.8949, lng: 127.2003, radius: 10 },

  // ===== 강원도 =====
  { name: '춘천', lat: 37.8813, lng: 127.7300, radius: 10 },
  { name: '원주', lat: 37.3422, lng: 127.9202, radius: 8 },
  { name: '강릉', lat: 37.7519, lng: 128.8761, radius: 8 },
  { name: '속초', lat: 38.2070, lng: 128.5918, radius: 6 },
  { name: '동해', lat: 37.5247, lng: 129.1143, radius: 6 },

  // ===== 충청도 =====
  { name: '청주', lat: 36.6424, lng: 127.4890, radius: 8 },
  { name: '천안', lat: 36.8151, lng: 127.1139, radius: 8 },
  { name: '아산', lat: 36.7898, lng: 127.0018, radius: 7 },
  { name: '충주', lat: 36.9910, lng: 127.9259, radius: 8 },

  // ===== 전라도 =====
  { name: '전주', lat: 35.8242, lng: 127.1480, radius: 8 },
  { name: '익산', lat: 35.9483, lng: 126.9577, radius: 7 },
  { name: '군산', lat: 35.9676, lng: 126.7369, radius: 7 },
  { name: '순천', lat: 34.9506, lng: 127.4872, radius: 7 },
  { name: '여수', lat: 34.7604, lng: 127.6622, radius: 7 },
  { name: '목포', lat: 34.8118, lng: 126.3922, radius: 6 },

  // ===== 경상도 =====
  { name: '포항', lat: 36.0190, lng: 129.3435, radius: 8 },
  { name: '경주', lat: 35.8562, lng: 129.2247, radius: 8 },
  { name: '김해', lat: 35.2285, lng: 128.8894, radius: 6 },
  { name: '창원 성산구', lat: 35.1985, lng: 128.7079, radius: 4 },
  { name: '창원 의창구', lat: 35.2286, lng: 128.6818, radius: 4 },
  { name: '창원 마산합포구', lat: 35.1798, lng: 128.5697, radius: 4 },
  { name: '창원 진해구', lat: 35.1333, lng: 128.7132, radius: 5 },
  { name: '진주', lat: 35.1802, lng: 128.1076, radius: 8 },
  { name: '거제', lat: 34.8806, lng: 128.6211, radius: 8 },
  { name: '통영', lat: 34.8545, lng: 128.4330, radius: 6 },
  { name: '양산', lat: 35.3350, lng: 129.0373, radius: 6 },
  { name: '구미', lat: 36.1197, lng: 128.3445, radius: 7 },
  { name: '안동', lat: 36.5684, lng: 128.7294, radius: 8 },

  // ===== 제주 =====
  { name: '제주 제주시', lat: 33.4996, lng: 126.5312, radius: 10 },
  { name: '제주 서귀포시', lat: 33.2541, lng: 126.5600, radius: 10 },

  // ===== 넓은 범위 폴백 =====
  { name: '서울', lat: 37.5665, lng: 126.978, radius: 20 },
  { name: '인천', lat: 37.4563, lng: 126.7052, radius: 20 },
  { name: '부산', lat: 35.1796, lng: 129.0756, radius: 20 },
  { name: '대구', lat: 35.8714, lng: 128.6014, radius: 15 },
  { name: '대전', lat: 36.3504, lng: 127.3845, radius: 15 },
  { name: '광주', lat: 35.1595, lng: 126.8526, radius: 15 },
  { name: '울산', lat: 35.5384, lng: 129.3114, radius: 15 },
];

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getRegionName(lat: number, lng: number): string {
  let closest = '서울';
  let closestDist = Infinity;

  for (const region of REGIONS) {
    const dist = getDistance(lat, lng, region.lat, region.lng);
    if (dist <= region.radius && dist < closestDist) {
      closest = region.name;
      closestDist = dist;
    }
  }

  return closest;
}
