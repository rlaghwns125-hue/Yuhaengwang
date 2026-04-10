import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import TrendButtons from '../src/components/TrendButtons';
import NaverMap from '../src/components/NaverMap';
import RisingTop3 from '../src/components/RisingTop3';
import PlaceList from '../src/components/PlaceList';
import AiChatBubble from '../src/components/AiChatBubble';
import { useAuthStore } from '../src/stores/authStore';
import { useTrendStore } from '../src/stores/trendStore';
import { useLocationStore } from '../src/stores/locationStore';
import { Place } from '../src/types';
import { getMyRank } from '../src/services/dessertMaster';
import { useMarketStore } from '../src/stores/marketStore';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    trends,
    selectedTrend,
    places,
    isLoadingTrends,
    isLoadingPlaces,
    loadTrends,
    selectTrend,
    searchDessert,
    setPlaces,
  } = useTrendStore();
  const { latitude, longitude, mapLat, mapLng, locationName, requestLocation, updateMapCenter } = useLocationStore();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [myRank, setMyRank] = useState<{ rank: number; score: number } | null>(null);
  const [top3Trigger, setTop3Trigger] = useState(0);
  const equippedBarId = useMarketStore((s) => s.equippedIds.dessertBar);
  const barItems = useMarketStore((s) => s.items);
  const barThemeData = equippedBarId ? barItems.find((i) => i.id === equippedBarId)?.themeData : null;
  const barThemeBg = barThemeData?.barBg || null;
  const barTextColor = barThemeData?.buttonTextColor || null;

  // 마켓 등에서 돌아올 때 지도 리사이즈 트리거
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
      }
    }, [])
  );

  useEffect(() => {
    requestLocation().then(() => setLocationReady(true));
    loadTrends();
    // 로그인 시 랭킹 가져오기
    if (user?.uid) {
      getMyRank(user.uid).then(setMyRank).catch(() => {});
    } else {
      setMyRank(null);
    }
  }, [user?.uid]);

  // AI 챗봇에서 가게 선택 시: 지도에 해당 가게만 표시 + 포커스
  const handleAiPlaceSelect = useCallback((place: Place) => {
    setPlaces([place]);
    setSelectedPlace(place);
  }, []);

  const handleTrendSelect = (trend: any) => {
    // 항상 내 GPS 위치 기준으로 검색
    selectTrend(trend, user?.uid || null, locationName, latitude, longitude);
    setSelectedPlace(null);
    setTimeout(() => setTop3Trigger((prev) => prev + 1), 500);
  };

  const handleMapCenterChanged = useCallback((lat: number, lng: number) => {
    updateMapCenter(lat, lng);
  }, [updateMapCenter]);

  // 현위치 검색 버튼: 지도 중심 위치에서 마지막 선택한 디저트로 재검색
  const handleSearchHere = useCallback(() => {
    const trend = useTrendStore.getState().selectedTrend;
    if (trend) {
      selectTrend(trend, user?.uid || null, locationName, mapLat, mapLng);
    }
  }, [locationName, mapLat, mapLng, user?.uid]);

  const handlePlacePress = useCallback((place: Place) => {
    setSelectedPlace(place);
  }, []);

  return (
    <View style={styles.container}>
      {/* 배경: 네이버 지도 (위치 확인 후 렌더링) */}
      {locationReady ? (
        <NaverMap
          latitude={latitude}
          longitude={longitude}
          places={places}
          focusPlace={selectedPlace}
          onMarkerPress={handlePlacePress}
          onCenterChanged={handleMapCenterChanged}
          onSearchHere={handleSearchHere}
        />
      ) : (
        <View style={styles.loadingMap}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingMapText}>현재 위치를 가져오는 중...</Text>
        </View>
      )}

      {/* 상단 오버레이: 지역명 + 로그인 (마켓 테마 적용) */}
      <View style={[styles.topOverlay, barThemeBg ? { backgroundColor: barThemeBg } : null]}>
        <View style={styles.topRow}>
          <Text style={[styles.locationText, barTextColor ? { color: barTextColor } : null]}>📍 {locationName}</Text>
          {user && myRank && (
            <View style={[styles.rankBadge, barThemeData ? { backgroundColor: barThemeData.buttonBg, borderColor: barThemeData.buttonSelectedBg } : null]}>
              <Text style={[styles.rankBadgeText, barTextColor ? { color: barTextColor } : null]}>🏆 {myRank.score}점 · {myRank.rank}위</Text>
            </View>
          )}
          <View style={styles.topButtons}>
            <TouchableOpacity
              style={[styles.marketButton, barThemeData ? { backgroundColor: barThemeData.buttonBg, borderColor: barThemeData.buttonSelectedBg } : null]}
              onPress={() => router.push(user ? '/market' : '/login')}
            >
              <Image source={require('../assets/icons/market.png')} style={styles.marketIcon} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authButton, barThemeData ? { backgroundColor: barThemeData.buttonBg, borderWidth: 1, borderColor: barThemeData.buttonSelectedBg } : null]}
              onPress={() => router.push(user ? '/profile' : '/login')}
            >
              <Text style={[styles.authButtonText, barThemeData ? { color: barThemeData.buttonTextColor } : null]}>
                {user ? '👤' : '로그인'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 왼쪽 사이드바: 검색된 가게 목록 (리뷰순) */}
      <PlaceList
        places={places}
        onPlacePress={handlePlacePress}
      />

      {/* 오른쪽: AI 채팅 + TOP3 */}
      <AiChatBubble locationName={locationName} userLat={latitude} userLng={longitude} userId={user?.uid || null} onPlaceSelect={handleAiPlaceSelect} />
      <RisingTop3 refreshTrigger={top3Trigger} />

      {/* 하단 오버레이: 트렌드 버튼들 (마켓 테마 적용) */}
      <View style={[styles.bottomOverlay, barThemeBg ? { backgroundColor: barThemeBg } : null]}>
        {isLoadingPlaces && (
          <View style={styles.loadingBar}>
            <ActivityIndicator size="small" color="#FF6B6B" />
            <Text style={styles.loadingText}>카페 검색 중...</Text>
          </View>
        )}
        <TrendButtons
          trends={trends}
          selectedTrend={selectedTrend}
          isLoading={isLoadingTrends}
          onSelect={handleTrendSelect}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F0FE',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '700',
  },
  welcomeText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  rankBadge: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  topButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  marketButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  marketIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  authButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
    paddingTop: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    zIndex: 10,
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  loadingText: {
    fontSize: 13,
    color: '#666',
  },
  loadingMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
  },
  loadingMapText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
});
