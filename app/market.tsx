import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMarketStore } from '../src/stores/marketStore';
import { useAuthStore } from '../src/stores/authStore';
import { MarketItem } from '../src/types';

type TabKey = 'dessertBar' | 'dessertIcon' | 'placeList' | 'chatbot' | 'cookie';

// 가게리스트 아이콘 (목록 형태)
function ListIcon({ size = 16, color = '#555' }: { size?: number; color?: string }) {
  const s = size;
  const boxSize = s * 0.28;
  const barW = s * 0.58;
  const barH = s * 0.2;
  const gap = s * 0.08;
  const borderW = s * 0.06;
  const radius = s * 0.06;
  return (
    <View style={{ width: s, height: s, justifyContent: 'center', gap }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: gap }}>
          <View style={{ width: boxSize, height: boxSize, borderRadius: radius, borderWidth: borderW, borderColor: color }} />
          <View style={{ width: barW, height: barH, borderRadius: radius, borderWidth: borderW, borderColor: color }} />
        </View>
      ))}
    </View>
  );
}

const TAB_CONFIG: { key: TabKey; label: string; icon: string; customIcon?: boolean }[] = [
  { key: 'dessertBar', label: '디저트바', icon: '🍫' },
  { key: 'dessertIcon', label: '아이콘', icon: '🎨' },
  { key: 'placeList', label: '가게리스트', icon: '', customIcon: true },
  { key: 'chatbot', label: '챗봇', icon: '💬' },
  { key: 'cookie', label: '쿠키충전', icon: '🍪' },
];

const COOKIE_PACKS = [
  { id: 'cookie_100', amount: 100, label: '100 쿠키', emoji: '🍪' },
  { id: 'cookie_200', amount: 200, label: '200 쿠키', emoji: '🍪🍪' },
  { id: 'cookie_300', amount: 300, label: '300 쿠키', emoji: '🍪🍪🍪' },
  { id: 'cookie_500', amount: 500, label: '500 쿠키', emoji: '🎁' },
  { id: 'cookie_1000', amount: 1000, label: '1000 쿠키', emoji: '💰' },
  { id: 'cookie_2000', amount: 2000, label: '2000 쿠키', emoji: '👑' },
];

export default function MarketScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { cookies, items, purchasedIds, equippedIds, purchaseItem, equipItem, unequipItem } = useMarketStore();
  const [tab, setTab] = useState<TabKey>('dessertBar');

  const authReady = useAuthStore((s) => s.authReady);

  // 인증 복원 완료 후 비로그인이면 메인으로
  useEffect(() => {
    if (authReady && !user) {
      router.replace('/');
    }
  }, [authReady, user]);

  // 인증 복원 중 또는 비로그인 → 로딩
  if (!authReady || !user) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      </View>
    );
  }

  const isAdmin = user?.email === 'rlaghwns125@gmail.com';
  const { addCookies } = useMarketStore();
  const filteredItems = items.filter((item) => item.category === tab);

  function handleItemPress(item: MarketItem) {
    const isPurchased = purchasedIds.includes(item.id);
    const isEquipped = equippedIds[item.category] === item.id;

    if (isEquipped) {
      if (window.confirm(`${item.name} 장착을 해제할까요?`)) {
        unequipItem(item.category);
      }
      return;
    }

    if (isPurchased) {
      equipItem(item);
      window.alert(`${item.name}이(가) 적용되었어요!`);
      return;
    }

    // 구매
    const costText = isAdmin ? '무료 (관리자)' : `🍪 ${item.price} 쿠키`;
    if (!isAdmin && cookies < item.price) {
      window.alert(`쿠키가 ${item.price - cookies}개 더 필요해요!`);
      return;
    }

    if (window.confirm(`${item.name}\n${costText}\n\n${item.description}`)) {
      const success = purchaseItem(item, user?.email);
      if (success) {
        equipItem(item);
        window.alert(`구매 완료! ${item.name}이(가) 바로 적용되었어요!`);
      }
    }
  }

  function handleCookieCharge(amount: number) {
    addCookies(amount);
    window.alert(`🍪 ${amount} 쿠키가 충전되었어요!\n현재 보유: ${cookies + amount} 쿠키`);
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← 돌아가기</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏪 마켓</Text>
        <View style={styles.cookieBox}>
          <Text style={styles.cookieText}>🍪 {cookies}</Text>
        </View>
      </View>

      {/* 탭 */}
      <View style={styles.tabs}>
        {TAB_CONFIG.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            {t.customIcon ? (
              <ListIcon size={18} color={tab === t.key ? '#fff' : '#555'} />
            ) : (
              <Text style={styles.tabIcon}>{t.icon}</Text>
            )}
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 콘텐츠 */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {tab === 'cookie' ? (
          /* 쿠키 충전 탭 */
          <View style={{ gap: 10 }}>
            <View style={styles.cookieHeader}>
              <Text style={styles.cookieHeaderEmoji}>🍪</Text>
              <Text style={styles.cookieHeaderAmount}>{cookies}</Text>
              <Text style={styles.cookieHeaderLabel}>보유 쿠키</Text>
            </View>

            {COOKIE_PACKS.map((pack) => (
              <TouchableOpacity
                key={pack.id}
                style={styles.cookiePackCard}
                onPress={() => handleCookieCharge(pack.amount)}
                activeOpacity={0.7}
              >
                <Text style={styles.cookiePackEmoji}>{pack.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cookiePackLabel}>{pack.label}</Text>
                </View>
                <TouchableOpacity style={styles.chargeBtn} onPress={() => handleCookieCharge(pack.amount)}>
                  <Text style={styles.chargeBtnText}>충전</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            <View style={[styles.infoCard, { marginTop: 8 }]}>
              <Text style={styles.infoTitle}>🍪 쿠키 모으는 법</Text>
              <Text style={styles.infoText}>• 디저트 검색하기: +2 쿠키</Text>
              <Text style={styles.infoText}>• 영수증 등록하기: +10 쿠키</Text>
              <Text style={styles.infoText}>• 도감 디저트 등록: +5 쿠키</Text>
              <Text style={styles.infoText}>• 매일 접속 보너스: +3 쿠키</Text>
              <Text style={styles.infoText}>• 신규 가입 보너스: 100 쿠키</Text>
            </View>
          </View>
        ) : (
          /* 상품 그리드 3x3 */
          <>
            <View style={styles.grid}>
              {filteredItems.map((item) => {
                const isPurchased = purchasedIds.includes(item.id);
                const isEquipped = equippedIds[item.category] === item.id;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.itemCard,
                      isPurchased && styles.itemPurchased,
                      isEquipped && styles.itemEquipped,
                    ]}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.7}
                  >
                    {isEquipped && (
                      <View style={styles.equippedBadge}>
                        <Text style={styles.equippedBadgeText}>착용중</Text>
                      </View>
                    )}
                    <ItemPreview item={item} />
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    {isPurchased ? (
                      <Text style={styles.ownedText}>보유중</Text>
                    ) : isAdmin ? (
                      <Text style={styles.freeText}>FREE</Text>
                    ) : (
                      <View style={styles.priceRow}>
                        <Text style={styles.priceIcon}>🍪</Text>
                        <Text style={styles.priceText}>{item.price}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {filteredItems.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 14, color: '#999' }}>아직 등록된 상품이 없어요</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// 카테고리별 미리보기 컴포넌트
function ItemPreview({ item }: { item: MarketItem }) {
  const td = item.themeData;

  if (item.category === 'dessertBar') {
    return (
      <View style={[styles.previewBox, { backgroundColor: td.barBg || '#F8F8F8', justifyContent: 'center', alignItems: 'center' }]}>
        <View style={{
          backgroundColor: td.buttonSelectedBg,
          borderRadius: (td.buttonBorderRadius || 25) / 2,
          paddingHorizontal: 10, paddingVertical: 5,
        }}>
          <Text style={{ fontSize: 9, color: td.buttonSelectedTextColor || '#fff', fontWeight: '800' }}>유행왕</Text>
        </View>
      </View>
    );
  }

  if (item.category === 'dessertIcon') {
    return (
      <View style={[styles.previewBox, { backgroundColor: '#F8F8F8' }]}>
        <Text style={styles.previewEmoji}>{item.preview}</Text>
        <Text style={{ fontSize: 7, color: '#999', marginTop: 2 }}>{td.style}</Text>
      </View>
    );
  }

  if (item.category === 'placeList') {
    // 미니 리스트 카드
    const bg = td.darkBg || td.bg ? (td.bg || '#1A1A1A') : '#fff';
    const txtColor = td.text || (td.darkBg ? '#E0E0E0' : '#333');
    return (
      <View style={[styles.previewBox, { backgroundColor: bg, padding: 5, justifyContent: 'center', gap: 2 }]}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF6B6B' }} />
            <View style={{ height: 4, flex: 1, borderRadius: 2, backgroundColor: txtColor, opacity: 0.3 }} />
          </View>
        ))}
      </View>
    );
  }

  if (item.category === 'chatbot') {
    // 미니 챗 말풍선
    return (
      <View style={[styles.previewBox, { backgroundColor: '#F8F8F8', justifyContent: 'center', padding: 5 }]}>
        <View style={{
          backgroundColor: td.bubbleColor || '#fff', borderRadius: 8,
          paddingHorizontal: 6, paddingVertical: 4, alignSelf: 'flex-start',
        }}>
          <Text style={{ fontSize: 7, color: '#333' }}>추천{td.suffix}</Text>
        </View>
        <Text style={{ fontSize: 14, alignSelf: 'center', marginTop: 2 }}>{item.preview}</Text>
      </View>
    );
  }

  // 기본 폴백
  return (
    <View style={[styles.previewBox, { backgroundColor: '#F8F8F8' }]}>
      <Text style={styles.previewEmoji}>{item.preview}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 16 : 50, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backText: { fontSize: 16, color: '#666' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
  cookieBox: {
    backgroundColor: '#FFF8E1', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#FFE082',
  },
  cookieText: { fontSize: 14, fontWeight: '800', color: '#F57F17' },

  // 탭
  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 8, paddingVertical: 8, gap: 6,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 12, backgroundColor: '#F5F5F5',
  },
  tabActive: { backgroundColor: '#FF6B6B' },
  tabIcon: { fontSize: 18, marginBottom: 2 },
  tabText: { fontSize: 11, fontWeight: '700', color: '#999' },
  tabTextActive: { color: '#fff' },

  // 콘텐츠
  content: { flex: 1 },
  contentContainer: { padding: 12 },

  // 3x3 그리드
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, justifyContent: 'flex-start',
  },
  itemCard: {
    width: '31%' as any,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative' as const,
  },
  itemPurchased: {
    borderWidth: 1.5, borderColor: '#B2DFDB',
  },
  itemEquipped: {
    borderWidth: 2, borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  equippedBadge: {
    position: 'absolute', top: -6, right: -6, zIndex: 1,
    backgroundColor: '#FF6B6B', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  equippedBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  previewBox: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },
  previewEmoji: { fontSize: 28 },
  itemName: { fontSize: 12, fontWeight: '700', color: '#333', marginBottom: 4 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  priceIcon: { fontSize: 12 },
  priceText: { fontSize: 13, fontWeight: '800', color: '#F57F17' },
  ownedText: { fontSize: 11, fontWeight: '700', color: '#26A69A' },
  freeText: { fontSize: 11, fontWeight: '800', color: '#E040FB' },

  // 쿠키 충전
  cookieHeader: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  cookieHeaderEmoji: { fontSize: 40, marginBottom: 4 },
  cookieHeaderAmount: { fontSize: 36, fontWeight: '900', color: '#F57F17' },
  cookieHeaderLabel: { fontSize: 14, color: '#999', fontWeight: '600', marginTop: 2 },
  cookiePackCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  cookiePackEmoji: { fontSize: 24 },
  cookiePackLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
  chargeBtn: {
    backgroundColor: '#FF6B6B', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  chargeBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // 안내 카드
  infoCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  infoTitle: { fontSize: 15, fontWeight: '800', color: '#333', marginBottom: 10 },
  infoText: { fontSize: 13, color: '#666', lineHeight: 22 },
});
