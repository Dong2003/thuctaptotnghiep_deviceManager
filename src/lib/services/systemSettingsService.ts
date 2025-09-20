import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface SystemSettings {
  maxFailedLogins: number;
  updatedAt: Date;
}

const SETTINGS_DOC_PATH = 'system/settings';

export const getSystemSettings = async (): Promise<SystemSettings> => {
  const ref = doc(db, SETTINGS_DOC_PATH);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as any;
    return {
      maxFailedLogins: typeof data.maxFailedLogins === 'number' ? data.maxFailedLogins : 5,
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
  }
  const defaults: SystemSettings = { maxFailedLogins: 5, updatedAt: new Date() };
  await setDoc(ref, { ...defaults, updatedAt: new Date() }, { merge: true });
  return defaults;
};

export const updateSystemSettings = async (data: Partial<SystemSettings>): Promise<void> => {
  const ref = doc(db, SETTINGS_DOC_PATH);
  await setDoc(ref, { ...data, updatedAt: new Date() }, { merge: true });
};


