import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { updateNickname, isNicknameTaken } from '../src/services/auth';
import { getMyScore, getMyRank, getDogam, getRanking, DogamItem, UserScore } from '../src/services/dessertMaster';
import { getDessertIcon } from '../src/constants/desserts';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [isEditing, setIsEditing] = useState(false);
  const [myScore, setMyScore] = useState<{ score: number; rank: number } | null>(null);
  const [dogam, setDogam] = useState<DogamItem[]>([]);
  const [ranking, setRanking] = useState<UserScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'dogam' | 'ranking'>('info');

  useEffect(() => {
    if (!user) { router.back(); return; }
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    try {
      const [rank, items, ranks] = await Promise.all([
        getMyRank(user.uid),
        getDogam(user.uid),
        getRanking(20),
      ]);
      setMyScore(rank);
      setDogam(items);
      setRanking(ranks);
    } catch {}
    setIsLoading(false);
  }

  async function handleNicknameChange() {
    if (!user || !nickname.trim()) return;
    if (nickname.trim().length < 2) {
      Alert.alert('알림', '닉네임은 2자 이상이어야 해요!');
      return;
    }
    try {
      await updateNickname(user.uid, nickname.trim());
      useAuthStore.getState().setUser({ ...user, nickname: nickname.trim() });
      setIsEditing(false);
      Alert.alert('완료', '닉네임이 변경되었어요!');
    } catch (e: any) {
      Alert.alert('실패', e.message);
    }
  }

  if (!user) return null;

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← 돌아가기</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>마이페이지</Text>
        <View style={{ width: 80 }} />
      </View>

      {/* 프로필 카드 */}
      <View style={styles.profileCard}>
        <Text style={styles.profileEmoji}>🍰</Text>
        {isEditing ? (
          <View style={styles.nicknameEdit}>
            <TextInput
              style={styles.nicknameInput}
              value={nickname}
              onChangeText={setNickname}
              placeholder="새 닉네임"
              maxLength={20}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleNicknameChange}>
              <Text style={styles.saveBtnText}>저장</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setIsEditing(false); setNickname(user.nickname); }}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={styles.nickname}>{user.nickname || '닉네임 없음'} ✏️</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.email}>{user.email}</Text>
        {myScore && (
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>🏆 {myScore.score}점</Text>
            <Text style={styles.rankText}>전체 {myScore.rank}위</Text>
          </View>
        )}
      </View>

      {/* 탭 */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'info' && styles.tabActive]} onPress={() => setTab('info')}>
          <Text style={[styles.tabText, tab === 'info' && styles.tabTextActive]}>내 정보</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'dogam' && styles.tabActive]} onPress={() => setTab('dogam')}>
          <Text style={[styles.tabText, tab === 'dogam' && styles.tabTextActive]}>도감</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'ranking' && styles.tabActive]} onPress={() => setTab('ranking')}>
          <Text style={[styles.tabText, tab === 'ranking' && styles.tabTextActive]}>랭킹</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#FF6B6B" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.content}>
          {/* 내 정보 탭 */}
          {tab === 'info' && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>연동 계정</Text>
                <Text style={styles.infoValue}>Google ({user.email})</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>총 점수</Text>
                <Text style={styles.infoValue}>{myScore?.score || 0}점</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>등록 디저트</Text>
                <Text style={styles.infoValue}>{dogam.length}종</Text>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); router.back(); }}>
                <Text style={styles.logoutText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 도감 탭 */}
          {tab === 'dogam' && (
            <View style={styles.dogamGrid}>
              {dogam.length === 0 ? (
                <Text style={styles.emptyText}>아직 등록된 디저트가 없어요! 📸 영수증을 등록해보세요</Text>
              ) : (
                dogam.map((item) => (
                  <View key={item.keyword} style={styles.dogamCell}>
                    <Text style={styles.dogamIcon}>{getDessertIcon(item.keyword)}</Text>
                    <Text style={styles.dogamName} numberOfLines={1}>{item.keyword}</Text>
                    <Text style={styles.dogamCount}>x{item.count}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* 랭킹 탭 */}
          {tab === 'ranking' && (
            <View style={styles.section}>
              {ranking.map((r, i) => (
                <View key={r.uid} style={[styles.rankRow, r.uid === user.uid && styles.rankRowMe]}>
                  <Text style={styles.rankNum}>{i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}`}</Text>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankNickname}>{r.nickname || r.email?.split('@')[0] || '익명'}</Text>
                    <Text style={styles.rankScore}>{r.totalScore}점 · {r.totalDesserts}종</Text>
                  </View>
                  {r.uid === user.uid && <Text style={styles.meTag}>나</Text>}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff' },
  backText: { fontSize: 16, color: '#666' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
  profileCard: { backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  profileEmoji: { fontSize: 48, marginBottom: 8 },
  nickname: { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 4 },
  nicknameEdit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nicknameInput: { backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 16, width: 150 },
  saveBtn: { backgroundColor: '#FF6B6B', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelText: { color: '#999', fontSize: 14 },
  email: { fontSize: 13, color: '#999', marginBottom: 12 },
  scoreRow: { flexDirection: 'row', gap: 12 },
  scoreText: { fontSize: 16, fontWeight: '700', color: '#FF6B6B' },
  rankText: { fontSize: 16, fontWeight: '700', color: '#666' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#FF6B6B' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#999' },
  tabTextActive: { color: '#fff' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  section: { gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#333' },
  logoutBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#FF6B6B' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#FF6B6B' },
  dogamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  dogamCell: { width: '30%' as any, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FFE0E0' },
  dogamIcon: { fontSize: 32, marginBottom: 4 },
  dogamName: { fontSize: 12, fontWeight: '700', color: '#333' },
  dogamCount: { fontSize: 11, color: '#FF6B6B', fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#999', fontSize: 14, paddingVertical: 40 },
  rankRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 10 },
  rankRowMe: { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FF6B6B' },
  rankNum: { fontSize: 18, width: 30, textAlign: 'center' },
  rankInfo: { flex: 1 },
  rankNickname: { fontSize: 14, fontWeight: '700', color: '#333' },
  rankScore: { fontSize: 12, color: '#999' },
  meTag: { backgroundColor: '#FF6B6B', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
});
