import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId); // CRITICAL: Use the specific database ID
export const auth = getAuth(app);
export const storage = getStorage(app);

// Validate connection on boot is removed to avoid unnecessary permission errors in development.
