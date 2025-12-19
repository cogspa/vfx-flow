// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your actual config from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDHCVz1v8aL_uOMonfTEtGftucJiTIYy3g",
    authDomain: "nodepath-d9fa8.firebaseapp.com",
    projectId: "nodepath-d9fa8",
    storageBucket: "nodepath-d9fa8.firebasestorage.app",
    messagingSenderId: "847205850620",
    appId: "1:847205850620:web:03ab6db6fe173cc369a679",
    measurementId: "G-PGGZ4XKDYN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
