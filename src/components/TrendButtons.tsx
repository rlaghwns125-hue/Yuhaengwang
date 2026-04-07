import React, { useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { TrendItem } from '../types';
import { getDessertIcon, getDessertImage } from '../constants/desserts';
import { useMarketStore } from '../stores/marketStore';

interface TrendButtonsProps {
  trends: TrendItem[];
  selectedTrend: TrendItem | null;
  isLoading: boolean;
  onSelect: (trend: TrendItem) => void;
}

export default function TrendButtons({
  trends,
  selectedTrend,
  isLoading,
  onSelect,
}: TrendButtonsProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#FF6B6B" />
        <Text style={styles.loadingText}>트렌드 불러오는 중...</Text>
      </View>
    );
  }

  // 마켓 테마 적용 (구독해서 변경 시 리렌더링)
  const equippedBarId = useMarketStore((s) => s.equippedIds.dessertBar);
  const barItems = useMarketStore((s) => s.items);
  const barTheme = equippedBarId ? barItems.find((i) => i.id === equippedBarId)?.themeData : null;

  const buttons = trends.map((trend) => {
    const isSelected = selectedTrend?.id === trend.id;
    const image = getDessertImage(trend.keyword);
    const emoji = trend.icon || getDessertIcon(trend.keyword);

    const btnStyle = barTheme ? {
      backgroundColor: isSelected ? barTheme.buttonSelectedBg : barTheme.buttonBg,
      borderRadius: barTheme.buttonBorderRadius ?? 25,
    } : {};
    const txtStyle = barTheme ? {
      color: isSelected ? barTheme.buttonSelectedTextColor : barTheme.buttonTextColor,
    } : {};

    return (
      <TouchableOpacity
        key={trend.id}
        style={[styles.button, isSelected && styles.buttonSelected, btnStyle]}
        onPress={() => onSelect(trend)}
        activeOpacity={0.7}
      >
        {image ? (
          <Image source={image} style={styles.buttonImage} />
        ) : (
          <Text style={styles.buttonIcon}>{emoji}</Text>
        )}
        <Text
          style={[styles.buttonText, isSelected && styles.buttonTextSelected, txtStyle]}
          numberOfLines={1}
        >
          {trend.keyword}
        </Text>
      </TouchableOpacity>
    );
  });

  // 웹에서는 native div + 마우스 드래그 횡스크롤
  if (Platform.OS === 'web') {
    return <WebScrollRow buttons={buttons} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {buttons}
      </ScrollView>
    </View>
  );
}

// 웹용 마우스 드래그 횡스크롤 컴포넌트
function WebScrollRow({ buttons }: { buttons: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
    scrollLeft.current = scrollRef.current?.scrollLeft || 0;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grabbing';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current.offsetLeft || 0);
    const walk = (x - startX.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
  }, []);

  return (
    <View style={styles.container}>
      <div
        ref={scrollRef}
        onMouseDown={onMouseDown as any}
        onMouseMove={onMouseMove as any}
        onMouseUp={onMouseUp as any}
        onMouseLeave={onMouseUp as any}
        style={{
          display: 'flex',
          flexDirection: 'row',
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingLeft: 16,
          paddingRight: 16,
          gap: 10,
          cursor: 'grab',
          scrollbarWidth: 'none',
          userSelect: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {buttons}
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    height: 65,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
    flexShrink: 0,
  },
  buttonSelected: {
    backgroundColor: '#FF6B6B',
  },
  buttonImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  buttonIcon: {
    fontSize: 20,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  buttonTextSelected: {
    color: '#fff',
  },
  personalBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 2,
  },
  personalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
});
