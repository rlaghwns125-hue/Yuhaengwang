import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import { Place } from '../types';
import { logSearch } from '../services/searchLog';
import { registerReceipt, getDogam, getMyRank, getMyScore, DogamItem } from '../services/dessertMaster';
import { getDessertIcon } from '../constants/desserts';
import { findRelevantDesserts, dessertInfoToContext } from '../services/dessertDB';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  dogam?: DogamItem[];
  rankInfo?: { rank: number; score: number };
  places?: Place[];
}

interface AiChatBubbleProps {
  locationName: string;
  userLat: number;
  userLng: number;
  userId: string | null;
  onPlaceSelect: (place: Place) => void;
}

function isMobile(): boolean {
  if (Platform.OS !== 'web') return true;
  return Dimensions.get('window').width < 768;
}

// 순위별 별점
function getStars(rank: number): string {
  if (rank <= 1) return '★★★★★';
  if (rank <= 3) return '★★★★☆';
  if (rank <= 5) return '★★★☆☆';
  return '★★☆☆☆';
}

export default function AiChatBubble({ locationName, userLat, userLng, userId, onPlaceSelect }: AiChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: '안녕! 🍰 어떤 디저트가 땡겨? 뭐든 물어봐!' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const mobile = isMobile();

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setIsLoading(true);

    try {
      // 도감 명령어 감지
      if (text.includes('도감')) {
        if (!userId) {
          setMessages((prev) => [...prev, { role: 'ai', text: '도감을 보려면 로그인이 필요해요! 🔐' }]);
        } else {
          const items = await getDogam(userId);
          if (items.length === 0) {
            setMessages((prev) => [...prev, { role: 'ai', text: '아직 등록된 디저트가 없어요! 영수증을 등록해서 도감을 채워보세요 🍰' }]);
          } else {
            setMessages((prev) => [...prev, { role: 'ai', text: '🎖️ 나의 디저트 도감', dogam: items }]);
          }
        }
        setIsLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        return;
      }

      // 랭킹 명령어 감지
      if (text.includes('랭킹') || text.includes('순위') || text.includes('등수')) {
        if (!userId) {
          setMessages((prev) => [...prev, { role: 'ai', text: '랭킹을 보려면 로그인이 필요해요! 🔐' }]);
        } else {
          const rankData = await getMyRank(userId);
          if (rankData) {
            setMessages((prev) => [...prev, {
              role: 'ai',
              text: `🏆 현재 랭킹\n\n🎯 ${rankData.score}점 · 전체 ${rankData.rank}위\n\n영수증을 등록하면 점수가 올라가요!`,
              rankInfo: rankData,
            }]);
          } else {
            setMessages((prev) => [...prev, { role: 'ai', text: '아직 점수가 없어요! 영수증을 등록해서 랭킹에 참여해보세요 🏅' }]);
          }
        }
        setIsLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        return;
      }

      // RAG: 디저트 DB에서 관련 정보 검색
      const relevantDesserts = await findRelevantDesserts(text);
      const dessertContext = dessertInfoToContext(relevantDesserts);

      // 일반 대화 (이전 대화 맥락 + 디저트 지식 포함)
      const history = messages
        .filter((m) => !m.dogam && !m.rankInfo)
        .slice(-10)
        .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

      const response = await axios.post(API_ENDPOINTS.CHAT, {
        message: text + dessertContext,
        history,
        locationName,
        userLat,
        userLng,
      }, { timeout: 30000 });

      const { reply, searchKeyword, places } = response.data;
      const placesWithDate = places?.map((p: any) => ({ ...p, cachedAt: new Date() })) || [];
      if (searchKeyword) logSearch(searchKeyword);

      setMessages((prev) => [...prev, {
        role: 'ai',
        text: reply,
        places: placesWithDate.length > 0 ? placesWithDate : undefined,
      }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: '앗, 잠깐 오류가 났어. 다시 물어봐줘! 😅' }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // 영수증 사진 업로드
  const handleReceiptUpload = async () => {
    if (!userId) {
      setMessages((prev) => [...prev, { role: 'ai', text: '영수증 등록은 로그인이 필요해요! 🔐' }]);
      return;
    }

    // 웹에서 파일 선택
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        setMessages((prev) => [...prev, { role: 'user', text: '📸 영수증 등록 중...' }]);
        setIsLoading(true);

        try {
          // 파일을 base64로 변환
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];

            const response = await axios.post(API_ENDPOINTS.ANALYZE_RECEIPT, {
              imageBase64: base64,
            }, { timeout: 30000 });

            const { storeName, storeAddress, category, items, totalScore, error } = response.data;

            if (category === 'food') {
              setMessages((prev) => [...prev, { role: 'ai', text: '디저트/카페 영수증만 등록 가능해요! 일반 음식점은 등록할 수 없어요 🍰' }]);
            } else if (error || !items || items.length === 0) {
              setMessages((prev) => [...prev, { role: 'ai', text: error || '영수증에서 메뉴를 찾을 수 없어요 😢' }]);
            } else {
              // Firestore 등록 (중복 체크 포함)
              const { points, duplicate } = await registerReceipt(userId, storeName || '', storeAddress || '', items);
              if (duplicate) {
                setMessages((prev) => [...prev, { role: 'ai', text: '이미 등록된 영수증이에요! 중복 등록은 안 돼요 🙅' }]);
              } else {
                const itemList = items.map((it: any) => `  🍰 ${it.name} x${it.quantity} (${it.price.toLocaleString()}원 · +${it.score}점)`).join('\n');
                setMessages((prev) => [...prev, {
                  role: 'ai',
                  text: `✅ 영수증 등록 완료!\n\n🏪 ${storeName || '카페'}\n${itemList}\n\n🎯 총 +${points}점 획득!`,
                }]);
              }
            }
            setIsLoading(false);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
          };
          reader.readAsDataURL(file);
        } catch {
          setMessages((prev) => [...prev, { role: 'ai', text: '영수증 분석 중 오류가 났어요 😢' }]);
          setIsLoading(false);
        }
      };
      input.click();
    }
  };

  const handlePlacePress = (place: Place) => {
    setIsOpen(false);
    onPlaceSelect(place);
  };

  if (!isOpen) {
    return (
      <TouchableOpacity
        style={[styles.fab, mobile && styles.fabMobile]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>🤖</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, mobile && styles.containerMobile]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤖 유행왕 AI</Text>
        <TouchableOpacity onPress={() => setIsOpen(false)}>
          <Text style={styles.headerClose}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* 메시지 목록 */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, i) => (
          <View key={i}>
            <View
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text style={[
                styles.bubbleText,
                msg.role === 'user' ? styles.userText : styles.aiText,
              ]}>
                {msg.text}
              </Text>
            </View>

            {/* AI 답변에 가게 카드 횡스크롤 */}
            {msg.places && msg.places.length > 0 && (
              <PlaceCards places={msg.places} onPress={handlePlacePress} />
            )}

            {/* 도감 렌더링 */}
            {msg.dogam && msg.dogam.length > 0 && (
              <DogamGrid items={msg.dogam} />
            )}
          </View>
        ))}
        {isLoading && (
          <View style={[styles.bubble, styles.aiBubble]}>
            <ActivityIndicator size="small" color="#FF6B6B" />
          </View>
        )}
      </ScrollView>

      {/* 입력 */}
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.receiptBtn} onPress={handleReceiptUpload} disabled={isLoading}>
          <Text style={styles.receiptIcon}>📸</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="도감, 랭킹, 디저트 뭐든 물어봐!"
          placeholderTextColor="#999"
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, isLoading && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={isLoading}
        >
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 가게 카드 횡스크롤 컴포넌트 (드래그 + 양방향 화살표)
function PlaceCards({ places, onPress }: { places: Place[]; onPress: (p: Place) => void }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(places.length > 1);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atLeft = el.scrollLeft <= 5;
    const atRight = el.scrollLeft >= el.scrollWidth - el.clientWidth - 5;
    setShowLeft(!atLeft);
    setShowRight(!atRight);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows);
    // 초기 상태
    setTimeout(updateArrows, 100);
    return () => el.removeEventListener('scroll', updateArrows);
  }, [places]);

  const doScroll = (delta: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  if (Platform.OS === 'web') {
    return (
      <div style={{ position: 'relative' }}>
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            flexDirection: 'row',
            overflowX: 'auto',
            overflowY: 'hidden',
            gap: 8,
            padding: '6px 4px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            cursor: 'grab',
          }}
          onMouseDown={(e: any) => {
            const el = scrollRef.current as any;
            if (!el) return;
            el._dragStartX = e.pageX;
            el._dragScrollLeft = el.scrollLeft;
            el._dragging = true;
            el.style.cursor = 'grabbing';
          }}
          onMouseMove={(e: any) => {
            const el = scrollRef.current as any;
            if (!el?._dragging) return;
            e.preventDefault();
            el.scrollLeft = el._dragScrollLeft - (e.pageX - el._dragStartX) * 1.5;
          }}
          onMouseUp={() => {
            const el = scrollRef.current as any;
            if (el) { el._dragging = false; el.style.cursor = 'grab'; }
          }}
          onMouseLeave={() => {
            const el = scrollRef.current as any;
            if (el) { el._dragging = false; el.style.cursor = 'grab'; }
          }}
        >
          {places.map((place, index) => (
            <PlaceCard key={place.id} place={place} rank={index + 1} onPress={() => onPress(place)} />
          ))}
        </div>

        {showLeft && (
          <div onClick={() => doScroll(-160)} style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            width: 26, height: 26, borderRadius: 13,
            backgroundColor: 'rgba(255,107,107,0.9)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
          }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>‹</span>
          </div>
        )}

        {showRight && (
          <div onClick={() => doScroll(160)} style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            width: 26, height: 26, borderRadius: 13,
            backgroundColor: 'rgba(255,107,107,0.9)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
          }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>›</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 4 }}>
      {places.map((place, index) => (
        <PlaceCard key={place.id} place={place} rank={index + 1} onPress={() => onPress(place)} />
      ))}
    </ScrollView>
  );
}

// 도감 3xN 그리드
function DogamGrid({ items }: { items: DogamItem[] }) {
  return (
    <View style={dogamStyles.grid}>
      {items.map((item) => (
        <View key={item.keyword} style={dogamStyles.cell}>
          <Text style={dogamStyles.icon}>{getDessertIcon(item.keyword)}</Text>
          <Text style={dogamStyles.name} numberOfLines={1}>{item.keyword}</Text>
          <Text style={dogamStyles.count}>x{item.count}</Text>
        </View>
      ))}
    </View>
  );
}

const dogamStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 6,
  },
  cell: {
    width: '30%' as any,
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  icon: {
    fontSize: 24,
    marginBottom: 2,
  },
  name: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
  },
  count: {
    fontSize: 9,
    color: '#FF6B6B',
    fontWeight: '700',
  },
});

function PlaceCard({ place, rank, onPress }: { place: Place; rank: number; onPress: () => void }) {
  const stars = getStars(rank);
  const category = place.category?.split('>').pop()?.trim() || '카페';

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={cardStyles.rankRow}>
        <View style={cardStyles.rankBadge}>
          <Text style={cardStyles.rankText}>{rank}</Text>
        </View>
        <Text style={cardStyles.stars}>{stars}</Text>
      </View>
      <Text style={cardStyles.name} numberOfLines={1}>{place.name}</Text>
      <Text style={cardStyles.category}>{category}</Text>
      <Text style={cardStyles.address} numberOfLines={2}>{place.address}</Text>
      {place.telephone ? <Text style={cardStyles.tel}>📞 {place.telephone}</Text> : null}
      <Text style={cardStyles.tapHint}>탭하면 지도에서 보기</Text>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  rankBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  stars: {
    fontSize: 10,
    color: '#FFB800',
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  category: {
    fontSize: 9,
    color: '#FF6B6B',
    fontWeight: '600',
    marginBottom: 2,
  },
  address: {
    fontSize: 9,
    color: '#888',
    marginBottom: 2,
    lineHeight: 13,
  },
  tel: {
    fontSize: 9,
    color: '#4A90D9',
    marginBottom: 2,
  },
  tapHint: {
    fontSize: 8,
    color: '#BBB',
    textAlign: 'center',
    marginTop: 4,
  },
});

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    top: 80,
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 20,
  },
  fabMobile: {
    top: 70,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  fabText: {
    fontSize: 24,
  },
  container: {
    position: 'absolute',
    top: 50,
    right: 12,
    width: 340,
    height: 440,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 20,
    overflow: 'hidden',
  },
  containerMobile: {
    top: 35,
    right: 8,
    left: 8,
    width: 'auto' as any,
    height: 380,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  headerClose: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    padding: 10,
    gap: 8,
  },
  bubble: {
    maxWidth: '85%' as any,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF6B6B',
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  aiText: {
    color: '#333',
  },
  userText: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 4,
  },
  receiptBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptIcon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: '#333',
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
});
