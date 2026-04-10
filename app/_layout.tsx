import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/authStore';
import { useMarketStore } from '../src/stores/marketStore';
import { onAuthChange, getUserProfile, handleRedirectResult } from '../src/services/auth';

export default function RootLayout() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    // 리다이렉트 로그인 결과 처리
    handleRedirectResult().catch(() => {});
    // 마켓 상품 목록 로드
    useMarketStore.getState().loadMarketItems();

    // 5초 안에 authReady 안 되면 강제로 설정 (흰화면 방지)
    const timeout = setTimeout(() => {
      if (!useAuthStore.getState().authReady) {
        useAuthStore.getState().setAuthReady();
      }
    }, 5000);

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const user = await getUserProfile(firebaseUser.uid);
          setUser(user);
          useMarketStore.getState().loadUserMarket(firebaseUser.uid);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      useAuthStore.getState().setAuthReady();
    });

    return () => { unsubscribe(); clearTimeout(timeout); };
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}
