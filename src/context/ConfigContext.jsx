// src/context/ConfigContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const defaultConfig = {
    tuan: 1,
    hethong: false,
    giaovien: false,
    mon: "Tin học",
    login: false,
    hocKy: "Giữa kỳ I",
    lop: "",
  };

  // Load config từ localStorage
  const storedConfig = JSON.parse(localStorage.getItem("appConfig") || "{}");
  const [config, setConfig] = useState({ ...defaultConfig, ...storedConfig });

  // 🔄 Lưu localStorage khi config thay đổi
  useEffect(() => {
    localStorage.setItem("appConfig", JSON.stringify(config));
  }, [config]);

  // ⚡ Lắng nghe realtime Firestore
  useEffect(() => {
    const docRef = doc(db, "CONFIG", "config");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setConfig((prev) => {
            const updated = {
              ...prev,
              tuan: data.tuan ?? prev.tuan,
              hethong: data.hethong ?? prev.hethong,
              giaovien: data.giaovien ?? prev.giaovien,
              mon: data.mon ?? prev.mon,
              login: data.login ?? prev.login,
              hocKy: data.hocKy ?? prev.hocKy,
              lop: data.lop ?? prev.lop,
            };
            // ✅ chỉ cập nhật nếu khác prev để tránh rerender thừa
            return JSON.stringify(prev) !== JSON.stringify(updated) ? updated : prev;
          });
        }
      },
      (err) => console.error("❌ Firestore snapshot lỗi:", err)
    );

    return () => unsubscribe();
  }, []);

  // ✅ Hàm cập nhật config + Firestore
  const updateConfig = async (newValues) => {
    try {
      const newConfig = { ...config, ...newValues };
      setConfig(newConfig);
      // Firestore merge
      const docRef = doc(db, "CONFIG", "config");
      await setDoc(docRef, newValues, { merge: true });
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật Firestore:", err);
    }
  };

  return (
    <ConfigContext.Provider value={{ config, setConfig: updateConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

// Hook tiện lợi
export const useConfig = () => useContext(ConfigContext);
