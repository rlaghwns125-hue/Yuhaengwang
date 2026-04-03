import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';

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

// 구글 로그인 (웹용)
export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const userDoc = await getDoc(doc(db, 'users', credential.user.uid));

  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', credential.user.uid), {
      email: credential.user.email,
      provider: 'google',
      createdAt: serverTimestamp(),
    });
  }

  return await getUserProfile(credential.user.uid);
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
    provider: data.provider,
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}

// 인증 상태 감시
export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
