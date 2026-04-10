import { create } from 'zustand';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MarketItem } from '../types';
import { ALL_MARKET_ITEMS } from '../data/market';

const DEFAULT_EQUIPPED = { dessertBar: null, dessertIcon: null, placeList: null, chatbot: null };

interface MarketState {
  cookies: number;
  purchasedIds: string[];
  disabledIconIds: string[]; // 구매했지만 비활성화한 아이콘
  equippedIds: Record<MarketItem['category'], string | null>;
  items: MarketItem[];
  currentUid: string | null;

  loadUserMarket: (uid: string) => Promise<void>;
  loadMarketItems: () => Promise<void>;
  purchaseItem: (item: MarketItem, userEmail?: string) => boolean;
  equipItem: (item: MarketItem) => void;
  unequipItem: (category: MarketItem['category']) => void;
  toggleIcon: (itemId: string) => void;
  addCookies: (amount: number) => void;
  getEquipped: (category: MarketItem['category']) => MarketItem | null;
}

// Firestore에 저장
function saveToFirestore(uid: string, data: { cookies: number; purchasedIds: string[]; equippedIds: Record<string, string | null> }) {
  setDoc(doc(db, 'userMarket', uid), data, { merge: true }).catch(() => {});
}

export const useMarketStore = create<MarketState>((set, get) => ({
  cookies: 100,
  purchasedIds: [],
  disabledIconIds: [],
  equippedIds: { ...DEFAULT_EQUIPPED },
  items: ALL_MARKET_ITEMS,
  currentUid: null,

  // Firestore에서 상품 목록 로드 (관리자 등록 상품 + 하드코딩 폴백)
  loadMarketItems: async () => {
    try {
      const snap = await getDocs(collection(db, 'marketItems'));
      const firestoreItems: MarketItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        firestoreItems.push({
          id: d.id,
          name: data.name,
          preview: data.preview || '🎁',
          price: data.price,
          rarity: data.rarity || 'normal',
          category: data.category,
          description: data.description || '',
          themeData: data.themeData || {},
        });
      });
      // Firestore 상품이 있으면 그걸 사용, 없으면 하드코딩 폴백
      set({ items: firestoreItems.length > 0 ? firestoreItems : ALL_MARKET_ITEMS });
    } catch {
      set({ items: ALL_MARKET_ITEMS });
    }
  },

  // 유저별 마켓 데이터 로드
  loadUserMarket: async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'userMarket', uid));
      if (snap.exists()) {
        const data = snap.data();
        set({
          cookies: data.cookies ?? 100,
          purchasedIds: data.purchasedIds ?? [],
          disabledIconIds: data.disabledIconIds ?? [],
          equippedIds: { ...DEFAULT_EQUIPPED, ...(data.equippedIds ?? {}) },
          currentUid: uid,
        });
      } else {
        set({ cookies: 100, purchasedIds: [], disabledIconIds: [], equippedIds: { ...DEFAULT_EQUIPPED }, currentUid: uid });
        saveToFirestore(uid, { cookies: 100, purchasedIds: [], equippedIds: { ...DEFAULT_EQUIPPED } });
      }
    } catch {
      set({ currentUid: uid });
    }
  },

  purchaseItem: (item, userEmail?: string) => {
    const { cookies, purchasedIds, currentUid } = get();
    if (purchasedIds.includes(item.id)) return false;
    const isAdmin = userEmail === 'rlaghwns125@gmail.com';
    if (!isAdmin && cookies < item.price) return false;
    const newCookies = isAdmin ? cookies : cookies - item.price;
    const newPurchasedIds = [...purchasedIds, item.id];
    set({ cookies: newCookies, purchasedIds: newPurchasedIds });
    if (currentUid) saveToFirestore(currentUid, { cookies: newCookies, purchasedIds: newPurchasedIds, equippedIds: get().equippedIds });
    return true;
  },

  equipItem: (item) => {
    const { equippedIds, purchasedIds, currentUid, cookies } = get();
    if (!purchasedIds.includes(item.id)) return;
    const newEquipped = { ...equippedIds, [item.category]: item.id };
    set({ equippedIds: newEquipped });
    if (currentUid) saveToFirestore(currentUid, { cookies, purchasedIds, equippedIds: newEquipped });
  },

  unequipItem: (category) => {
    const { equippedIds, currentUid, cookies, purchasedIds } = get();
    const newEquipped = { ...equippedIds, [category]: null };
    set({ equippedIds: newEquipped });
    if (currentUid) saveToFirestore(currentUid, { cookies, purchasedIds, equippedIds: newEquipped });
  },

  toggleIcon: (itemId) => {
    const { disabledIconIds, currentUid, cookies, purchasedIds, equippedIds } = get();
    const newDisabled = disabledIconIds.includes(itemId)
      ? disabledIconIds.filter((id) => id !== itemId)
      : [...disabledIconIds, itemId];
    set({ disabledIconIds: newDisabled });
    if (currentUid) saveToFirestore(currentUid, { cookies, purchasedIds, equippedIds, disabledIconIds: newDisabled } as any);
  },

  addCookies: (amount) => {
    const { cookies, currentUid, purchasedIds, equippedIds } = get();
    const newCookies = cookies + amount;
    set({ cookies: newCookies });
    if (currentUid) saveToFirestore(currentUid, { cookies: newCookies, purchasedIds, equippedIds });
  },

  getEquipped: (category) => {
    const { equippedIds, items } = get();
    const id = equippedIds[category];
    return id ? items.find((i) => i.id === id) || null : null;
  },
}));
