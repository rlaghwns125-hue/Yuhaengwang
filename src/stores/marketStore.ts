import { create } from 'zustand';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MarketItem } from '../types';
import { ALL_MARKET_ITEMS } from '../data/market';

const DEFAULT_EQUIPPED = { dessertBar: null, dessertIcon: null, placeList: null, chatbot: null };

interface MarketState {
  cookies: number;
  purchasedIds: string[];
  equippedIds: Record<MarketItem['category'], string | null>;
  items: MarketItem[];
  currentUid: string | null;

  loadUserMarket: (uid: string) => Promise<void>;
  purchaseItem: (item: MarketItem, userEmail?: string) => boolean;
  equipItem: (item: MarketItem) => void;
  unequipItem: (category: MarketItem['category']) => void;
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
  equippedIds: { ...DEFAULT_EQUIPPED },
  items: ALL_MARKET_ITEMS,
  currentUid: null,

  // 유저별 마켓 데이터 로드
  loadUserMarket: async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'userMarket', uid));
      if (snap.exists()) {
        const data = snap.data();
        set({
          cookies: data.cookies ?? 100,
          purchasedIds: data.purchasedIds ?? [],
          equippedIds: { ...DEFAULT_EQUIPPED, ...(data.equippedIds ?? {}) },
          currentUid: uid,
        });
      } else {
        // 신규 유저: 기본값 저장
        set({ cookies: 100, purchasedIds: [], equippedIds: { ...DEFAULT_EQUIPPED }, currentUid: uid });
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
