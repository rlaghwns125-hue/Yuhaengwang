import { create } from 'zustand';
import * as Location from 'expo-location';
import { getRegionName } from '../utils/regionLookup';

interface LocationState {
  // GPS 초기 위치
  latitude: number;
  longitude: number;
  // 지도 중심 (이동 시 갱신)
  mapLat: number;
  mapLng: number;
  locationName: string;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
  updateMapCenter: (lat: number, lng: number) => void;
}

const DEFAULT_LAT = 37.5665;
const DEFAULT_LNG = 126.978;

async function fetchLocationName(lat: number, lng: number): Promise<string> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (results.length > 0) {
      const loc = results[0];
      const parts = [];
      if (loc.city) parts.push(loc.city);
      if (loc.district) parts.push(loc.district);
      if (loc.subregion) parts.push(loc.subregion);
      if (loc.street) parts.push(loc.street);
      if (parts.length > 0) return parts.join(' ');
    }
  } catch {}
  return getRegionName(lat, lng);
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude: DEFAULT_LAT,
  longitude: DEFAULT_LNG,
  mapLat: DEFAULT_LAT,
  mapLng: DEFAULT_LNG,
  locationName: '서울',
  isLoading: false,
  error: null,

  requestLocation: async () => {
    set({ isLoading: true, error: null });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        set({ error: '위치 권한이 거부되었습니다.', isLoading: false });
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const locationName = await fetchLocationName(latitude, longitude);

      set({
        latitude, longitude,
        mapLat: latitude, mapLng: longitude,
        locationName, isLoading: false,
      });
    } catch {
      set({ error: '위치를 가져올 수 없습니다.', isLoading: false });
    }
  },

  // 지도 이동 시 중심 좌표 + 지역명 갱신
  updateMapCenter: async (lat: number, lng: number) => {
    const locationName = await fetchLocationName(lat, lng);
    set({ mapLat: lat, mapLng: lng, locationName });
  },
}));
