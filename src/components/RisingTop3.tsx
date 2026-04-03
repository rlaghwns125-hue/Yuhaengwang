import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { getPopularSearches } from '../services/searchLog';

interface TopItem {
  keyword: string;
  count: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

function isMobile(): boolean {
  if (Platform.OS !== 'web') return true;
  const { width } = Dimensions.get('window');
  return width < 768;
}

interface RisingTop3Props {
  refreshTrigger?: number; // 이 값이 바뀌면 새로고침
}

export default function RisingTop3({ refreshTrigger }: RisingTop3Props) {
  const [top3, setTop3] = useState<TopItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mobile = isMobile();

  const fetchTop3 = useCallback(async () => {
    try {
      const popular = await getPopularSearches(3);
      setTop3(popular);
    } catch {
      setTop3([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTop3();
  }, [fetchTop3, refreshTrigger]);

  if (isLoading) {
    return (
      <View style={[styles.container, mobile && styles.containerMobile]}>
        <Text style={[styles.title, mobile && styles.titleMobile]}>🔥 인기 검색 TOP3</Text>
        <ActivityIndicator size="small" color="#FF6B6B" />
      </View>
    );
  }

  if (top3.length === 0) {
    return (
      <View style={[styles.container, mobile && styles.containerMobile]}>
        <Text style={[styles.title, mobile && styles.titleMobile]}>🔥 인기 검색 TOP3</Text>
        <Text style={styles.noData}>아직 등록된 순위가 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, mobile && styles.containerMobile]}>
      <Text style={[styles.title, mobile && styles.titleMobile]}>🔥 인기 검색 TOP3</Text>
      {top3.map((item, index) => (
        <View key={item.keyword} style={styles.item}>
          <Text style={[styles.medal, mobile && styles.medalMobile]}>{MEDALS[index]}</Text>
          <View style={styles.itemContent}>
            <Text style={[styles.keyword, mobile && styles.keywordMobile]} numberOfLines={1}>{item.keyword}</Text>
            {item.count > 0 && (
              <Text style={styles.count}>{item.count}회 검색</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    right: 12,
    width: 160,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 15,
  },
  containerMobile: {
    bottom: 90,
    right: 8,
    width: 110,
    padding: 6,
    borderRadius: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B6B',
    marginBottom: 6,
  },
  titleMobile: {
    fontSize: 10,
    marginBottom: 3,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  medal: {
    fontSize: 18,
  },
  medalMobile: {
    fontSize: 13,
  },
  itemContent: {
    flex: 1,
  },
  keyword: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  keywordMobile: {
    fontSize: 10,
  },
  count: {
    fontSize: 9,
    color: '#999',
  },
  noData: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center' as any,
    paddingVertical: 4,
  },
});
