import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, AppState } from 'react-native';
import { Place } from '../types';
import { NAVER_CONFIG } from '../config/api';

interface NaverMapProps {
  latitude: number;
  longitude: number;
  places: Place[];
  focusPlace: Place | null;
  onMarkerPress: (place: Place) => void;
  onCenterChanged?: (lat: number, lng: number) => void;
  onSearchHere?: () => void;
}

export default function NaverMap({
  latitude,
  longitude,
  places,
  focusPlace,
  onMarkerPress,
  onCenterChanged,
  onSearchHere,
}: NaverMapProps) {
  if (Platform.OS === 'web') {
    return <NaverMapWeb latitude={latitude} longitude={longitude} places={places} focusPlace={focusPlace} onMarkerPress={onMarkerPress} onCenterChanged={onCenterChanged} onSearchHere={onSearchHere} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderIcon}>🗺️</Text>
        <Text style={styles.placeholderText}>네이버 지도</Text>
        <Text style={styles.placeholderSub}>
          {places.length > 0
            ? `${places.length}개 장소 표시 중`
            : '디저트를 선택하면 주변 카페가 표시됩니다'}
        </Text>
        {places.map((place) => (
          <Text
            key={place.id}
            style={styles.placeItem}
            onPress={() => onMarkerPress(place)}
          >
            📍 {place.name} - {place.address}
          </Text>
        ))}
      </View>
    </View>
  );
}

// 스크립트 로드 상태를 컴포넌트 밖에서 관리
let scriptLoading = false;
let scriptLoaded = false;
const loadCallbacks: (() => void)[] = [];

function loadNaverMapScript(callback: () => void) {
  if (scriptLoaded) {
    callback();
    return;
  }

  loadCallbacks.push(callback);

  if (scriptLoading) return;
  scriptLoading = true;

  const script = document.createElement('script');
  script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_CONFIG.MAP_CLIENT_ID}`;
  script.async = true;
  script.onload = () => {
    scriptLoaded = true;
    scriptLoading = false;
    loadCallbacks.forEach((cb) => cb());
    loadCallbacks.length = 0;
  };
  script.onerror = () => {
    scriptLoading = false;
    console.error('네이버 지도 스크립트 로드 실패');
  };
  document.head.appendChild(script);
}

function NaverMapWeb({
  latitude,
  longitude,
  places,
  focusPlace,
  onMarkerPress,
  onCenterChanged,
  onSearchHere,
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const myLocationMarkerRef = useRef<any>(null);
  const onCenterChangedRef = useRef(onCenterChanged);
  const [error, setError] = useState<string | null>(null);

  // 내 위치로 이동
  const goToMyLocation = () => {
    const naver = (window as any).naver;
    if (!naver?.maps || !mapInstanceRef.current) return;
    mapInstanceRef.current.setCenter(new naver.maps.LatLng(latitude, longitude));
    mapInstanceRef.current.setZoom(17);
  };

  // 항상 최신 콜백 유지
  useEffect(() => {
    onCenterChangedRef.current = onCenterChanged;
  }, [onCenterChanged]);

  const initMap = useCallback(() => {
    const naver = (window as any).naver;
    if (!naver?.maps || !mapRef.current) return;
    if (mapInstanceRef.current) return;

    try {
      const map = new naver.maps.Map(mapRef.current, {
        center: new naver.maps.LatLng(latitude, longitude),
        zoom: 17,
        mapTypeControl: false,
        scaleControl: false,
      });
      mapInstanceRef.current = map;

      // 내 위치 마커
      myLocationMarkerRef.current = new naver.maps.Marker({
        position: new naver.maps.LatLng(latitude, longitude),
        map,
        icon: {
          content: '<div style="width:16px;height:16px;background:#4A90D9;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(74,144,217,0.6)"></div>',
          anchor: new naver.maps.Point(8, 8),
        },
        zIndex: 999,
      });

      // 지도 이동이 끝날 때 중심 좌표를 부모에게 전달
      naver.maps.Event.addListener(map, 'idle', () => {
        const center = map.getCenter();
        onCenterChangedRef.current?.(center.lat(), center.lng());
      });
    } catch (e: any) {
      setError(e.message || '지도 초기화 실패');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadNaverMapScript(initMap);
  }, [initMap]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const naver = (window as any).naver;
    if (!naver?.maps) return;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    places.forEach((place) => {
      const distText = place.distance
        ? (place.distance >= 1000 ? `${(place.distance / 1000).toFixed(1)}km` : `${place.distance}m`)
        : '';
      const label = distText ? `${place.name} · ${distText}` : place.name;

      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(place.latitude, place.longitude),
        map: mapInstanceRef.current,
        title: place.name,
        icon: {
          content: `<div style="background:#FF6B6B;color:#fff;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${label}</div>`,
          anchor: new naver.maps.Point(0, 0),
        },
      });

      naver.maps.Event.addListener(marker, 'click', () => {
        onMarkerPress(place);
      });

      markersRef.current.push(marker);
    });

    // 마커가 전부 화면에 보이도록 지도 범위 조정
    if (places.length > 0) {
      const bounds = new naver.maps.LatLngBounds(
        new naver.maps.LatLng(
          Math.min(...places.map((p) => p.latitude)),
          Math.min(...places.map((p) => p.longitude))
        ),
        new naver.maps.LatLng(
          Math.max(...places.map((p) => p.latitude)),
          Math.max(...places.map((p) => p.longitude))
        )
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: 80 });
    }
  }, [places]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const naver = (window as any).naver;
    if (naver?.maps) {
      mapInstanceRef.current.setCenter(
        new naver.maps.LatLng(latitude, longitude)
      );
    }
  }, [latitude, longitude]);

  // 가게 선택 시 해당 가게를 지도 정중앙에 배치
  useEffect(() => {
    if (!focusPlace || !mapInstanceRef.current) return;
    const naver = (window as any).naver;
    if (!naver?.maps) return;

    mapInstanceRef.current.setCenter(
      new naver.maps.LatLng(focusPlace.latitude, focusPlace.longitude)
    );
    mapInstanceRef.current.setZoom(17);
  }, [focusPlace]);

  // 페이지 복귀 시 지도 리사이즈 (마켓 등에서 돌아올 때 깨짐 방지)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const naver = (window as any).naver;
      if (mapInstanceRef.current && naver?.maps) {
        naver.maps.Event.trigger(mapInstanceRef.current, 'resize');
      }
    };

    // visibilitychange: 탭 전환 시
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(handleResize, 100);
      }
    };

    // popstate: 뒤로가기 시
    const handlePopState = () => setTimeout(handleResize, 100);

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('popstate', handlePopState);

    // 마운트 시에도 한번 트리거 (다른 페이지에서 돌아왔을 때)
    setTimeout(handleResize, 200);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>🗺️</Text>
          <Text style={styles.placeholderText}>지도를 불러오는 중...</Text>
          <Text style={styles.placeholderSub}>네이버 지도 인증 대기 중</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <View style={styles.mapButtons}>
        <TouchableOpacity style={styles.myLocationBtn} onPress={goToMyLocation} activeOpacity={0.8}>
          <Text style={styles.myLocationIcon}>📍</Text>
        </TouchableOpacity>
        {onSearchHere && (
          <TouchableOpacity style={styles.searchHereBtn} onPress={onSearchHere} activeOpacity={0.8}>
            <Text style={styles.searchHereText}>🔍 현위치 검색</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F0FE',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  placeholderSub: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  placeItem: {
    fontSize: 14,
    color: '#4A90D9',
    paddingVertical: 4,
  },
  mapButtons: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    zIndex: 5,
  },
  myLocationBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  myLocationIcon: {
    fontSize: 22,
  },
  searchHereBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  searchHereText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
