import React, { createContext, useState, useEffect, useContext } from "react";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const LamVanBenConfigContext = createContext();

export const LamVanBenConfigProvider = ({ children }) => {
  const defaultConfig = {
    tuan: 1,
    mon: "Tin học",
    hocKy: "Giữa kỳ I",
    lop: "",
    tracNghiem: false,
    choXemDiem: false,
    xuatFileBaiLam: false,
    timeLimit: 1,
  };

  const [config, setConfigState] = useState(defaultConfig);

  // 🔹 Lấy config từ Firestore
  useEffect(() => {
    const docRef = doc(db, "LAMVANBEN", "config");
    const unsubscribe = onSnapshot(docRef, snapshot => {
      if (!snapshot.exists()) return;
      setConfigState(prev => ({ ...prev, ...snapshot.data() }));
    });

    return () => unsubscribe();
  }, []);

  // 🔹 Hàm update config và lưu Firestore
  const setConfig = async (newConfig) => {
    setConfigState(prev => ({ ...prev, ...newConfig }));
    try {
      const docRef = doc(db, "LAMVANBEN", "config");
      await setDoc(docRef, newConfig, { merge: true });
      console.log("✅ LAMVANBEN/config updated:", newConfig);
    } catch (err) {
      console.error("❌ Lỗi lưu LamVanBen config:", err);
    }
  };

  return (
    <LamVanBenConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </LamVanBenConfigContext.Provider>
  );
};
