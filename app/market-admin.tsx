import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ScrollView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { getDessertPremiumImage } from '../src/constants/desserts';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { ItemRarity, RARITY_CONFIG } from '../src/types';
import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../src/config/firebase';

type CategoryKey = 'dessertBar' | 'dessertIcon' | 'placeList' | 'chatbot';
const CATEGORY_LABELS: Record<CategoryKey, string> = { dessertBar: '디저트바', dessertIcon: '아이콘', placeList: '가게리스트', chatbot: '챗봇' };
const RARITY_LIST: ItemRarity[] = ['normal', 'rare', 'epic', 'unique', 'legend'];

interface FirestoreItem {
  id: string; name: string; preview: string; rarity: ItemRarity;
  category: CategoryKey; description: string; themeData: Record<string, any>;
}

export default function MarketAdminScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const authReady = useAuthStore((s) => s.authReady);

  const [tab, setTab] = useState<CategoryKey>('dessertBar');
  const [items, setItems] = useState<FirestoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 공통 폼
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [preview, setPreview] = useState('');
  const [rarity, setRarity] = useState<ItemRarity>('normal');
  const [description, setDescription] = useState('');

  // 디저트바 전용
  const [barBg, setBarBg] = useState('rgba(255,255,255,0.95)');
  const [buttonBg, setButtonBg] = useState('#ffffff');
  const [buttonSelectedBg, setButtonSelectedBg] = useState('#FF6B6B');
  const [buttonTextColor, setButtonTextColor] = useState('#333333');
  const [buttonSelectedTextColor, setButtonSelectedTextColor] = useState('#ffffff');
  const [buttonBorderRadius, setButtonBorderRadius] = useState('25');

  // 아이콘 전용
  const [iconKeyword, setIconKeyword] = useState('');
  const [iconImageBase64, setIconImageBase64] = useState('');

  // 챗봇 전용
  const [chatPersona, setChatPersona] = useState('');
  const [chatSuffix, setChatSuffix] = useState('');
  const [chatBubbleColor, setChatBubbleColor] = useState('#FFF3E0');
  const [chatSystemPrompt, setChatSystemPrompt] = useState('');

  // 가게리스트 전용
  const [listBg, setListBg] = useState('#ffffff');
  const [listTextColor, setListTextColor] = useState('#333333');
  const [listAccentColor, setListAccentColor] = useState('#FF6B6B');

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'marketItems'));
      const list: FirestoreItem[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as FirestoreItem));
      setItems(list);
    } catch {}
    setLoading(false);
  }

  function resetForm() {
    setEditingId(null); setName(''); setPreview(''); setRarity('normal'); setDescription('');
    setBarBg('rgba(255,255,255,0.95)'); setButtonBg('#ffffff'); setButtonSelectedBg('#FF6B6B');
    setButtonTextColor('#333333'); setButtonSelectedTextColor('#ffffff'); setButtonBorderRadius('25');
    setIconKeyword(''); setIconImageBase64('');
    setChatPersona(''); setChatSuffix(''); setChatBubbleColor('#FFF3E0'); setChatSystemPrompt('');
    setListBg('#ffffff'); setListTextColor('#333333'); setListAccentColor('#FF6B6B');
  }

  function startEdit(item: FirestoreItem) {
    setEditingId(item.id); setName(item.name); setPreview(item.preview);
    setRarity(item.rarity); setDescription(item.description); setTab(item.category);
    const td = item.themeData;
    if (item.category === 'dessertBar') {
      setBarBg(td.barBg || ''); setButtonBg(td.buttonBg || ''); setButtonSelectedBg(td.buttonSelectedBg || '');
      setButtonTextColor(td.buttonTextColor || ''); setButtonSelectedTextColor(td.buttonSelectedTextColor || '');
      setButtonBorderRadius(String(td.buttonBorderRadius ?? 25));
    } else if (item.category === 'dessertIcon') {
      setIconKeyword(td.keyword || ''); setIconImageBase64(td.iconImage || '');
    } else if (item.category === 'chatbot') {
      setChatPersona(td.persona || ''); setChatSuffix(td.suffix || '');
      setChatBubbleColor(td.bubbleColor || '#FFF3E0'); setChatSystemPrompt(td.systemPrompt || '');
    } else if (item.category === 'placeList') {
      setListBg(td.bg || '#ffffff'); setListTextColor(td.textColor || '#333333');
      setListAccentColor(td.accentColor || '#FF6B6B');
    }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildThemeData(): Record<string, any> {
    if (tab === 'dessertBar') return { barBg, buttonBg, buttonSelectedBg, buttonTextColor, buttonSelectedTextColor, buttonBorderRadius: parseInt(buttonBorderRadius) || 25 };
    if (tab === 'dessertIcon') return { keyword: iconKeyword, ...(iconImageBase64 ? { iconImage: iconImageBase64 } : {}) };
    if (tab === 'chatbot') return { persona: chatPersona, suffix: chatSuffix, bubbleColor: chatBubbleColor, systemPrompt: chatSystemPrompt, ...(iconImageBase64 ? { iconImage: iconImageBase64 } : {}) };
    if (tab === 'placeList') return { bg: listBg, textColor: listTextColor, accentColor: listAccentColor };
    return {};
  }

  async function handleSave() {
    if (!name.trim()) { window.alert('상품명을 입력하세요'); return; }
    const id = editingId || `${tab}_${name.trim().replace(/\s/g, '_')}_${Date.now()}`;
    const item = {
      name: name.trim(), preview: preview.trim() || '🎁', price: RARITY_CONFIG[rarity].price,
      rarity, category: tab, description: description.trim(), themeData: buildThemeData(),
      ...(editingId ? {} : { createdAt: new Date().toISOString() }),
    };
    try {
      await setDoc(doc(db, 'marketItems', id), item, { merge: true });
      window.alert(editingId ? `${name} 수정 완료!` : `${name} 등록 완료!`);
      resetForm(); loadItems();
    } catch (e: any) { window.alert('저장 실패: ' + e.message); }
  }

  async function handleDelete(id: string, n: string) {
    if (!window.confirm(`${n}을(를) 삭제할까요?`)) return;
    try { await deleteDoc(doc(db, 'marketItems', id)); if (editingId === id) resetForm(); loadItems(); } catch {}
  }

  if (!authReady) return <View style={s.container}><ActivityIndicator size="large" color="#FF6B6B" style={{ marginTop: 100 }} /></View>;
  if (!user || user.email !== 'rlaghwns125@gmail.com') {
    return (
      <View style={s.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#999' }}>관리자 전용 페이지</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}><Text style={{ color: '#FF6B6B', fontWeight: '700' }}>돌아가기</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  const filteredItems = items.filter((i) => i.category === tab);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>← 돌아가기</Text></TouchableOpacity>
        <Text style={s.headerTitle}>상품 관리</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={s.tabs}>
        {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((key) => (
          <TouchableOpacity key={key} style={[s.tab, tab === key && s.tabActive]} onPress={() => { setTab(key); if (editingId) resetForm(); }}>
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{CATEGORY_LABELS[key]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* 실시간 미리보기 */}
        <View style={s.previewCard}>
          <Text style={s.previewTitle}>미리보기</Text>
          <LivePreview tab={tab} name={name} preview={preview}
            barBg={barBg} buttonBg={buttonBg} buttonSelectedBg={buttonSelectedBg}
            buttonTextColor={buttonTextColor} buttonSelectedTextColor={buttonSelectedTextColor}
            buttonBorderRadius={parseInt(buttonBorderRadius) || 25}
            chatBubbleColor={chatBubbleColor} chatPersona={chatPersona} chatSuffix={chatSuffix}
            listBg={listBg} listTextColor={listTextColor} listAccentColor={listAccentColor}
            iconImageBase64={iconImageBase64} iconKeyword={iconKeyword}
          />
        </View>

        {/* 등록/수정 폼 */}
        <View style={[s.formCard, editingId ? { borderWidth: 2, borderColor: '#F59E0B' } : null]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[s.formTitle, { marginBottom: 0 }]}>{editingId ? '상품 수정' : '상품 등록'}</Text>
            {editingId && <TouchableOpacity onPress={resetForm}><Text style={{ color: '#999', fontSize: 13, fontWeight: '700' }}>취소</Text></TouchableOpacity>}
          </View>

          <Text style={s.label}>상품명</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="예: 미드나잇 네온" />

          <Text style={s.label}>등급</Text>
          <View style={s.rarityRow}>
            {RARITY_LIST.map((r) => (
              <TouchableOpacity key={r}
                style={[s.rarityBtn, { backgroundColor: RARITY_CONFIG[r].bgColor }, rarity === r && { borderWidth: 2, borderColor: RARITY_CONFIG[r].color }]}
                onPress={() => setRarity(r)}>
                <Text style={[s.rarityBtnText, { color: RARITY_CONFIG[r].color }]}>{RARITY_CONFIG[r].label}</Text>
                <Text style={{ fontSize: 9, color: '#999' }}>🍪{RARITY_CONFIG[r].price.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>설명</Text>
          <TextInput style={s.input} value={description} onChangeText={setDescription} placeholder="상품 설명" />

          {/* 카테고리별 전용 필드 */}
          {tab === 'dessertBar' && (
            <View style={s.themeSection}>
              <Text style={s.themeTitle}>디저트바 설정</Text>
              <ColorField label="바 배경색" value={barBg} onChange={setBarBg} />
              <ColorField label="버튼 배경색" value={buttonBg} onChange={setButtonBg} />
              <ColorField label="버튼 선택 배경색" value={buttonSelectedBg} onChange={setButtonSelectedBg} />
              <ColorField label="버튼 텍스트색" value={buttonTextColor} onChange={setButtonTextColor} />
              <ColorField label="선택 텍스트색" value={buttonSelectedTextColor} onChange={setButtonSelectedTextColor} />
              <Text style={s.label}>모서리 둥글기</Text>
              <TextInput style={s.input} value={buttonBorderRadius} onChangeText={setButtonBorderRadius} keyboardType="numeric" placeholder="25" />
            </View>
          )}

          {tab === 'dessertIcon' && (
            <View style={s.themeSection}>
              <Text style={s.themeTitle}>아이콘 설정</Text>
              <Text style={s.label}>적용 디저트 키워드</Text>
              <TextInput style={s.input} value={iconKeyword} onChangeText={setIconKeyword} placeholder="예: 마카롱, 브라우니" />
              <Text style={s.hint}>해당 키워드의 트렌드 버튼 아이콘이 교체됩니다</Text>
              <Text style={s.label}>아이콘 이미지 첨부</Text>
              <ImageUpload base64={iconImageBase64} onChange={setIconImageBase64} />
            </View>
          )}

          {tab === 'chatbot' && (
            <View style={s.themeSection}>
              <Text style={s.themeTitle}>챗봇 설정</Text>
              <Text style={s.label}>챗봇 아이콘 이미지</Text>
              <ImageUpload base64={iconImageBase64} onChange={setIconImageBase64} />
              <Text style={s.label}>성격/페르소나</Text>
              <TextInput style={s.input} value={chatPersona} onChangeText={setChatPersona} placeholder="예: cat, butler, chef" />
              <Text style={s.label}>말투 접미사</Text>
              <TextInput style={s.input} value={chatSuffix} onChangeText={setChatSuffix} placeholder="예: 냥, ~입니다, ~란다" />
              <ColorField label="채팅 말풍선 색" value={chatBubbleColor} onChange={setChatBubbleColor} />
              <Text style={s.label}>시스템 프롬프트 (선택)</Text>
              <TextInput style={[s.input, { height: 60 }]} value={chatSystemPrompt} onChangeText={setChatSystemPrompt} placeholder="챗봇 행동 지시 (선택)" multiline />
            </View>
          )}

          {tab === 'placeList' && (
            <View style={s.themeSection}>
              <Text style={s.themeTitle}>가게리스트 설정</Text>
              <ColorField label="배경색" value={listBg} onChange={setListBg} />
              <ColorField label="텍스트색" value={listTextColor} onChange={setListTextColor} />
              <ColorField label="강조색" value={listAccentColor} onChange={setListAccentColor} />
            </View>
          )}

          <TouchableOpacity style={[s.addBtn, editingId ? { backgroundColor: '#F59E0B' } : null]} onPress={handleSave}>
            <Text style={s.addBtnText}>{editingId ? '수정하기' : '등록하기'}</Text>
          </TouchableOpacity>
        </View>

        {/* 등록된 상품 목록 */}
        <Text style={s.sectionTitle}>등록된 상품 ({filteredItems.length}개)</Text>
        {loading ? <ActivityIndicator color="#FF6B6B" /> : filteredItems.length === 0 ? (
          <Text style={{ color: '#999', textAlign: 'center', paddingVertical: 20 }}>등록된 상품이 없습니다</Text>
        ) : filteredItems.map((item) => (
          <View key={item.id} style={s.itemRow}>
            <ItemMiniPreview item={item} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontWeight: '700', color: '#333' }}>{item.name}</Text>
                <View style={{ backgroundColor: RARITY_CONFIG[item.rarity]?.bgColor, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: RARITY_CONFIG[item.rarity]?.color }}>{RARITY_CONFIG[item.rarity]?.label}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: '#999' }}>{item.description}</Text>
            </View>
            <View style={{ gap: 6 }}>
              <TouchableOpacity onPress={() => startEdit(item)} style={{ backgroundColor: '#F59E0B', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={{ backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 12 }}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// 색상 입력 필드 (네이티브 RGB 컬러피커 + 텍스트)
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  // rgba 값을 hex로 변환 (컬러피커는 hex만 지원)
  function toHex(color: string): string {
    if (color.startsWith('#') && color.length <= 7) return color;
    try {
      const el = document.createElement('div');
      el.style.color = color;
      document.body.appendChild(el);
      const computed = getComputedStyle(el).color;
      document.body.removeChild(el);
      const match = computed.match(/\d+/g);
      if (match) {
        const [r, g, b] = match.map(Number);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      }
    } catch {}
    return '#000000';
  }

  return (
    <>
      <Text style={s.label}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {Platform.OS === 'web' ? (
          <input
            type="color"
            value={toHex(value)}
            onChange={(e: any) => onChange(e.target.value)}
            style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 }}
          />
        ) : (
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: value, borderWidth: 1, borderColor: '#ddd' }} />
        )}
        <TextInput style={[s.input, { flex: 1 }]} value={value} onChangeText={onChange} placeholder="#000000" />
      </View>
    </>
  );
}

// 이미지 업로드 (base64 변환)
function ImageUpload({ base64, onChange }: { base64: string; onChange: (v: string) => void }) {
  function handleFile(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { window.alert('500KB 이하 이미지만 가능합니다'); return; }
    const reader = new FileReader();
    reader.onload = () => { onChange(reader.result as string); };
    reader.readAsDataURL(file);
  }

  return (
    <View style={{ gap: 8, marginTop: 4 }}>
      {base64 ? (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <img src={base64} style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', border: '1px solid #ddd' }} />
          <TouchableOpacity onPress={() => onChange('')}>
            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>이미지 제거</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ alignItems: 'center' }}>
          {Platform.OS === 'web' ? (
            <label style={{ cursor: 'pointer', backgroundColor: '#F5F5F5', borderRadius: 12, padding: '12px 20px', display: 'inline-block', fontSize: 13, fontWeight: 700, color: '#666' }}>
              📎 이미지 선택
              <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            </label>
          ) : (
            <Text style={{ color: '#999', fontSize: 13 }}>웹에서만 이미지 업로드 가능</Text>
          )}
          <Text style={{ color: '#999', fontSize: 11, marginTop: 4 }}>PNG/JPG, 500KB 이하</Text>
        </View>
      )}
    </View>
  );
}

// 상품 목록용 미니 미리보기
function ItemMiniPreview({ item }: { item: any }) {
  const td = item.themeData || {};
  if (item.category === 'dessertBar') {
    return (
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: td.barBg || '#F0F0F0', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: td.buttonSelectedBg || '#FF6B6B', borderRadius: (td.buttonBorderRadius || 25) / 4, paddingHorizontal: 6, paddingVertical: 3 }}>
          <Text style={{ fontSize: 7, color: td.buttonSelectedTextColor || '#fff', fontWeight: '800' }}>유행왕</Text>
        </View>
      </View>
    );
  }
  if (item.category === 'dessertIcon') {
    // 1순위: Firestore에 저장된 base64 이미지
    if (td.iconImage) {
      return <img src={td.iconImage} style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }} />;
    }
    // 2순위: keyword로 assets 이미지 매칭
    const premiumImg = td.keyword ? getDessertPremiumImage(td.keyword) : null;
    if (premiumImg) {
      return <Image source={premiumImg} style={{ width: 44, height: 44, borderRadius: 12 }} />;
    }
    return <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 22 }}>🎨</Text></View>;
  }
  if (item.category === 'chatbot') {
    if (td.iconImage) {
      return <img src={td.iconImage} style={{ width: 44, height: 44, borderRadius: 22, objectFit: 'cover' }} />;
    }
    return (
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: td.bubbleColor || '#FFF3E0', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#333' }}>💬</Text>
      </View>
    );
  }
  if (item.category === 'placeList') {
    return (
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: td.bg || '#fff', justifyContent: 'center', padding: 6, gap: 2, borderWidth: 1, borderColor: '#eee' }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: td.accentColor || '#FF6B6B' }} />
            <View style={{ height: 3, flex: 1, borderRadius: 1, backgroundColor: td.textColor || '#333', opacity: 0.3 }} />
          </View>
        ))}
      </View>
    );
  }
  return <Text style={{ fontSize: 20 }}>{item.preview || '🎁'}</Text>;
}

// 실시간 미리보기
function LivePreview({ tab, name, preview, barBg, buttonBg, buttonSelectedBg, buttonTextColor, buttonSelectedTextColor, buttonBorderRadius, chatBubbleColor, chatPersona, chatSuffix, listBg, listTextColor, listAccentColor, iconImageBase64, iconKeyword }: any) {
  if (tab === 'dessertBar') {
    return (
      <View style={{ alignItems: 'center', gap: 12 }}>
        {/* 상점 카드와 동일한 미리보기 */}
        <View style={{
          width: 120, height: 120, borderRadius: 20,
          backgroundColor: barBg, justifyContent: 'center', alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: buttonSelectedBg,
            borderRadius: buttonBorderRadius / 2,
            paddingHorizontal: 16, paddingVertical: 8,
          }}>
            <Text style={{ fontSize: 13, color: buttonSelectedTextColor, fontWeight: '800' }}>유행왕</Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#333' }}>{name || '상품명'}</Text>
      </View>
    );
  }

  if (tab === 'dessertIcon') {
    const premiumImg = iconKeyword ? getDessertPremiumImage(iconKeyword) : null;
    return (
      <View style={{ alignItems: 'center', gap: 8 }}>
        <View style={{ width: 100, height: 100, borderRadius: 24, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          {iconImageBase64 ? (
            <img src={iconImageBase64} style={{ width: 100, height: 100, objectFit: 'cover' }} />
          ) : premiumImg ? (
            <Image source={premiumImg} style={{ width: 100, height: 100, borderRadius: 24 }} />
          ) : (
            <Text style={{ fontSize: 56 }}>🎨</Text>
          )}
        </View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#333' }}>{name || '아이콘 미리보기'}</Text>
      </View>
    );
  }

  if (tab === 'chatbot') {
    return (
      <View style={{ alignItems: 'center', gap: 8 }}>
        <View style={{ width: '100%', backgroundColor: '#F8F8F8', borderRadius: 14, padding: 14, gap: 8 }}>
          {/* 챗봇 아이콘 */}
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: chatBubbleColor, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 28 }}>{preview || '🤖'}</Text>
            </View>
          </View>
          {/* 말풍선 */}
          <View style={{ backgroundColor: chatBubbleColor, borderRadius: 12, padding: 10, alignSelf: 'flex-start', maxWidth: '80%' }}>
            <Text style={{ fontSize: 12, color: '#333' }}>
              디저트 추천해줄게{chatSuffix || '~'}
            </Text>
          </View>
          {/* 유저 말풍선 */}
          <View style={{ backgroundColor: '#FF6B6B', borderRadius: 12, padding: 10, alignSelf: 'flex-end', maxWidth: '80%' }}>
            <Text style={{ fontSize: 12, color: '#fff' }}>마카롱 맛집 알려줘</Text>
          </View>
          {/* 응답 */}
          <View style={{ backgroundColor: chatBubbleColor, borderRadius: 12, padding: 10, alignSelf: 'flex-start', maxWidth: '80%' }}>
            <Text style={{ fontSize: 12, color: '#333' }}>
              근처에 좋은 곳 있어{chatSuffix || '~'} {preview || '🤖'}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 11, color: '#999' }}>{name || '챗봇 미리보기'} {chatPersona ? `(${chatPersona})` : ''}</Text>
      </View>
    );
  }

  if (tab === 'placeList') {
    return (
      <View style={{ alignItems: 'center', gap: 8 }}>
        <View style={{ width: '100%', backgroundColor: listBg, borderRadius: 14, padding: 12, gap: 8 }}>
          {['디저트 카페 A', '마카롱 전문점 B', '베이커리 C'].map((n, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: listAccentColor + '30' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: listAccentColor }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: listTextColor }}>{n}</Text>
                <Text style={{ fontSize: 10, color: listTextColor + '90' }}>서울시 영등포구</Text>
              </View>
              <Text style={{ fontSize: 10, color: listAccentColor, fontWeight: '700' }}>500m</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 11, color: '#999' }}>{name || '가게리스트 미리보기'}</Text>
      </View>
    );
  }

  return null;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 16 : 50, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backText: { fontSize: 16, color: '#666' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 8, gap: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#F5F5F5' },
  tabActive: { backgroundColor: '#FF6B6B' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#999' },
  tabTextActive: { color: '#fff' },
  previewCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    alignItems: 'center',
  },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 12 },
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  formTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#666', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  hint: { fontSize: 11, color: '#999', marginTop: 4 },
  rarityRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rarityBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  rarityBtnText: { fontSize: 12, fontWeight: '800' },
  themeSection: { marginTop: 16, padding: 12, backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  themeTitle: { fontSize: 14, fontWeight: '800', color: '#333', marginBottom: 4 },
  addBtn: { backgroundColor: '#FF6B6B', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#333', marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
});
