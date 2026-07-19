import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
// Detect if we have real Firebase configuration from standard Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== '';

let app: any = null;
export let db: any = null;
export let auth: any = null;
export let isRealFirebase = false;

if (hasFirebaseConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    isRealFirebase = true;
    console.log('Firebase initialized successfully with config.');
  } catch (error) {
    console.error('Error initializing Firebase: ', error);
  }
} else {
  console.error('No valid Firebase API key found. Firestore is NOT connected or initialized.');
}

// Ensure the client tries to validate connection to Firestore if real Firebase is active
if (isRealFirebase && db) {
  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  };
  testConnection();
}

// Error handlers as required by the firebase-integration skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Throw config error helper
function throwFirebaseNotConfigured(): never {
  throw new Error("Error de configuración de Firebase: Firestore no está configurado o no se encuentra disponible. Por favor, asegúrese de ingresar las credenciales correctas en su configuración o en las variables de entorno.");
}

// Unified Database CRUD wrapper
export const dbService = {
  /**
   * Fetch all items in a collection
   */
  async getItems<T extends { id?: string }>(collectionName: string): Promise<T[]> {
    if (!isRealFirebase || !db) {
      throwFirebaseNotConfigured();
    }
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const items: T[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as unknown as T);
      });
      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  },

  /**
   * Add a new item to a collection
   */
  async addItem<T extends { id?: string }>(collectionName: string, item: T): Promise<string> {
    if (!isRealFirebase || !db) {
      throwFirebaseNotConfigured();
    }
    const id = item.id || Math.random().toString(36).substring(2, 15);
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, item);
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${collectionName}/${id}`);
    }
  },

  /**
   * Set or overwrite an item by ID
   */
  async setItem<T extends { id?: string }>(collectionName: string, id: string, item: T): Promise<void> {
    if (!isRealFirebase || !db) {
      throwFirebaseNotConfigured();
    }
    try {
      await setDoc(doc(db, collectionName, id), item);
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
    }
  },

  /**
   * Update fields of an existing item
   */
  async updateItem<T>(collectionName: string, id: string, updates: Partial<T>): Promise<void> {
    if (!isRealFirebase || !db) {
      throwFirebaseNotConfigured();
    }
    try {
      await updateDoc(doc(db, collectionName, id), updates as any);
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
    }
  },

  /**
   * Delete an item by ID
   */
  async deleteItem(collectionName: string, id: string): Promise<void> {
    if (!isRealFirebase || !db) {
      throwFirebaseNotConfigured();
    }
    try {
      await deleteDoc(doc(db, collectionName, id));
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  },

  /**
   * Listen to collection changes in real time
   */
  onCollectionSnapshot<T extends { id?: string }>(
    collectionName: string,
    callback: (items: T[]) => void
  ): () => void {
    if (!isRealFirebase || !db) {
      console.error("onCollectionSnapshot called but Firebase is not configured.");
      return () => {};
    }
    const q = query(collection(db, collectionName));
    return onSnapshot(q, (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as unknown as T);
      });
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, collectionName);
    });
  }
};
