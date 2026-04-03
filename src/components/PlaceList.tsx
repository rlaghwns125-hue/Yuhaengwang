import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { Place } from '../types';

interface PlaceListProps {
  places: Place[];
  onPlacePress: (place: Place) => void;
}

// 순위에 따른 별점 (리뷰 많은 순이므로 1위가 가장 높음)
function getRatingStars(rank: number, total: number): { stars: string; score: string } {
  // 1위 = 5.0, 마지막 = 3.0 (최소 3점)
  const score = Math.max(3.0, 5.0 - ((rank - 1) / Math.max(total - 1, 1)) * 2.0);
  const rounded = Math.round(score * 10) / 10;
  const fullStars = Math.floor(rounded);
  const halfStar = rounded - fullStars >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  const stars = '★'.repeat(fullStars) + (halfStar ? '☆' : '') + '☆'.repeat(emptyStars);
  return { stars, score: rounded.toFixed(1) };
}

export default function PlaceList({ places, onPlacePress }: PlaceListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (places.length === 0) return null;

  const handlePress = (place: Place) => {
    if (expandedId === place.id) {
      setExpandedId(null);
    } else {
      onPlacePress(place);
      setExpandedId(place.id);
    }
  };

  const openInMap = (place: Place) => {
    // 네이버 지도에서 가게 검색 (리뷰/별점 확인 가능)
    const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(place.name + ' ' + place.address)}`;
    Linking.openURL(naverUrl);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>검색 결과 ({places.length})</Text>
      <Text style={styles.subtitle}>리뷰 많은 순</Text>
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {places.map((place, index) => {
          const isExpanded = expandedId === place.id;
          const { stars, score } = getRatingStars(index + 1, places.length);

          return (
            <View key={place.id}>
              <TouchableOpacity
                style={[styles.item, isExpanded && styles.itemExpanded]}
                onPress={() => handlePress(place)}
                activeOpacity={0.7}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemName} numberOfLines={1}>{place.name}</Text>
                  <View style={styles.ratingRow}>
                    <Text style={styles.stars}>{stars}</Text>
                    <Text style={styles.score}>{score}</Text>
                  </View>
                  <Text style={styles.itemCategory} numberOfLines={1}>
                    {place.category?.split('>').pop()?.trim() || '카페'}
                    {place.distance ? ` · ${place.distance >= 1000 ? (place.distance / 1000).toFixed(1) + 'km' : place.distance + 'm'}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.detail}>
                  <Text style={styles.detailAddress}>{place.address}</Text>
                  {place.telephone ? (
                    <TouchableOpacity
                      style={styles.detailBtn}
                      onPress={() => Linking.openURL(`tel:${place.telephone}`)}
                    >
                      <Text style={styles.detailBtnText}>📞 {place.telephone}</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={styles.detailBtn}
                    onPress={() => openInMap(place)}
                  >
                    <Text style={styles.detailBtnText}>🗺️ 네이버 지도에서 보기</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 90,
    bottom: 70,
    width: '20%' as any,
    minWidth: 160,
    maxWidth: 240,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 15,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 12,
  },
  subtitle: {
    fontSize: 10,
    color: '#999',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  list: {
    flex: 1,
    paddingHorizontal: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemExpanded: {
    backgroundColor: '#FFF5F5',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  rankBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    flexShrink: 0,
  },
  rankText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#222',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginVertical: 1,
  },
  stars: {
    fontSize: 10,
    color: '#FFB800',
  },
  score: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
  },
  itemCategory: {
    fontSize: 10,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  detail: {
    backgroundColor: '#FFF5F5',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 4,
    marginBottom: 4,
    gap: 4,
  },
  detailAddress: {
    fontSize: 10,
    color: '#666',
  },
  detailBtn: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  detailBtnText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '600',
  },
});
