import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';
import { generateNickname } from '../utils/nickname';

// 이메일 회원가입
export async function registerWithEmail(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user: User = {
    uid: credential.user.uid,
    email: credential.user.email!,
    provider: 'email',
    createdAt: new Date(),
  };

  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    provider: user.provider,
    createdAt: serverTimestamp(),
  });

  return user;
}

// 이메일 로그인
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return await getUserProfile(credential.user.uid);
}

// 구글 로그인
export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();

  try {
    // 먼저 팝업 시도
    const credential = await signInWithPopup(auth, provider);
    await ensureUserDoc(credential.user);
    return await getUserProfile(credential.user.uid);
  } catch (e: any) {
    // 팝업 차단되면 리다이렉트로 시도
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, provider);
      // 리다이렉트 후 onAuthChange에서 처리됨
      throw new Error('리다이렉트 로그인 중...');
    }
    throw e;
  }
}

// 리다이렉트 결과 처리 (앱 시작 시 호출)
export async function handleRedirectResult(): Promise<void> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await ensureUserDoc(result.user);
    }
  } catch {}
}

// 사용자 문서 생성 (없으면) + 닉네임 자동 생성
async function ensureUserDoc(firebaseUser: FirebaseUser): Promise<void> {
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const userDocSnap = await getDoc(userDocRef);
  if (!userDocSnap.exists()) {
    const nickname = generateNickname();
    await setDoc(userDocRef, {
      email: firebaseUser.email,
      nickname,
      provider: 'google',
      createdAt: serverTimestamp(),
    });
  }
  // userScores에도 닉네임 저장 (랭킹용)
  const scoreRef = doc(db, 'userScores', firebaseUser.uid);
  const scoreSnap = await getDoc(scoreRef);
  const userData = await getDoc(userDocRef);
  const nick = userData.data()?.nickname || '';
  if (!scoreSnap.exists()) {
    await setDoc(scoreRef, {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      nickname: nick,
      totalScore: 0,
      totalDesserts: 0,
    });
  }
}

// 닉네임 중복 체크
export async function isNicknameTaken(nickname: string): Promise<boolean> {
  const q = query(collection(db, 'users'), where('nickname', '==', nickname));
  const snap = await getDocs(q);
  return !snap.empty;
}

// 닉네임 변경
export async function updateNickname(uid: string, newNickname: string): Promise<void> {
  const taken = await isNicknameTaken(newNickname);
  if (taken) throw new Error('이미 사용 중인 닉네임이에요!');

  await setDoc(doc(db, 'users', uid), { nickname: newNickname }, { merge: true });
  await setDoc(doc(db, 'userScores', uid), { nickname: newNickname }, { merge: true });
}

// 로그아웃
export async function logout(): Promise<void> {
  await signOut(auth);
}

// 사용자 프로필 조회
export async function getUserProfile(uid: string): Promise<User> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) {
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  const data = userDoc.data();
  return {
    uid,
    email: data.email,
    nickname: data.nickname || '',
    provider: data.provider,
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}

// 인증 상태 감시
export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
