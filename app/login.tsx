import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithGoogle, isLoading, error, clearError } = useAuthStore();

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
    if (!useAuthStore.getState().error) {
      router.back();
    }
  };

  const handleKakaoLogin = () => {
    Alert.alert('준비 중', '카카오 로그인은 곧 지원됩니다!');
  };

  const handleNaverLogin = () => {
    Alert.alert('준비 중', '네이버 로그인은 곧 지원됩니다!');
  };

  return (
    <View style={styles.container}>
      {/* 뒤로가기 */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← 돌아가기</Text>
      </TouchableOpacity>

      <View style={styles.inner}>
        <Text style={styles.title}>🍰 유행왕</Text>
        <Text style={styles.subtitle}>디저트 마스터가 되어보세요!</Text>

        {/* 에러 */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.errorClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color="#FF6B6B" />
        ) : (
          <View style={styles.buttons}>
            {/* 구글 */}
            <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>Google로 시작하기</Text>
            </TouchableOpacity>

            {/* 카카오 */}
            <TouchableOpacity style={styles.kakaoBtn} onPress={handleKakaoLogin}>
              <Text style={styles.kakaoIcon}>💬</Text>
              <Text style={styles.kakaoText}>카카오로 시작하기</Text>
            </TouchableOpacity>

            {/* 네이버 */}
            <TouchableOpacity style={styles.naverBtn} onPress={handleNaverLogin}>
              <Text style={styles.naverIcon}>N</Text>
              <Text style={styles.naverText}>네이버로 시작하기</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.notice}>
          로그인하면 디저트 도감, 랭킹 시스템을 이용할 수 있어요!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  backText: { fontSize: 16, color: '#666' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  title: { fontSize: 40, fontWeight: '800', textAlign: 'center', color: '#FF6B6B', marginBottom: 4 },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 40 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { flex: 1, color: '#D32F2F', fontSize: 14 },
  errorClose: { color: '#D32F2F', fontSize: 16, paddingLeft: 8 },
  buttons: { gap: 12 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingVertical: 14, gap: 10 },
  googleIcon: { fontSize: 20, fontWeight: '700', color: '#4285F4' },
  googleText: { fontSize: 16, fontWeight: '600', color: '#333' },
  kakaoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE500', borderRadius: 12, paddingVertical: 14, gap: 10 },
  kakaoIcon: { fontSize: 18 },
  kakaoText: { fontSize: 16, fontWeight: '600', color: '#3C1E1E' },
  naverBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#03C75A', borderRadius: 12, paddingVertical: 14, gap: 10 },
  naverIcon: { fontSize: 20, fontWeight: '800', color: '#fff' },
  naverText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  notice: { textAlign: 'center', fontSize: 13, color: '#999', marginTop: 30 },
});
