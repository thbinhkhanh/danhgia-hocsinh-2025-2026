// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ✅ Nếu muốn giữ cấu hình cũ, hãy comment bằng // hoặc /* ... */
const firebaseConfig = {
  apiKey: "AIzaSyCi0YDdl3IYIiMLronKh7TYz9W3YFImheA",
  authDomain: "danhgia-hocsinh-2025-2026.firebaseapp.com",
  projectId: "danhgia-hocsinh-2025-2026",
  storageBucket: "danhgia-hocsinh-2025-2026.appspot.com",
  messagingSenderId: "28452007439",
  appId: "1:28452007439:web:394af089959cd9361cfd7a"
}


// 🔹 Cấu hình Firebase mới cho dự án "danhgia-hs-2025-2026"
/*const firebaseConfig = {
  apiKey: "AIzaSyBOtd3XeR92efTDnUVfZ5aShWvKKFgU26g",
  authDomain: "danhgia-hs-2025-2026.firebaseapp.com",
  projectId: "danhgia-hs-2025-2026",
  storageBucket: "danhgia-hs-2025-2026.appspot.com", // ✅ đúng
  messagingSenderId: "450681804164",
  appId: "1:450681804164:web:a236d1b46c39acf0ca39d1"
};*/

// Khởi tạo Firebase (chỉ init nếu chưa init)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Khởi tạo Firestore và Auth
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
