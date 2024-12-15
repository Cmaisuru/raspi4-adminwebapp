// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCbhnQQNECCPY2Q083-2i6NZUmNDUqwJsM",
  authDomain: "raspberrypi4-smartlock.firebaseapp.com",
  databaseURL: "https://raspberrypi4-smartlock-default-rtdb.firebaseio.com",
  projectId: "raspberrypi4-smartlock",
  storageBucket: "raspberrypi4-smartlock.firebasestorage.app",
  messagingSenderId: "735609718532",
  appId: "1:735609718532:web:8a3bdb599b1a0976103251",
  measurementId: "G-V1BQH7XRC3"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export const fetchUserFiles = async () => {
  const userFilesRef = ref(database, 'user_files');
  try {
    const snapshot = await get(userFilesRef);
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
};
