import React, { createContext, useState, useEffect, useContext } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const defaultConfig = {
    tuan: 1,
    mon: "Tin học",
    login: false,
    hocKy: "Giữa kỳ I",
    lop: "",
  };

  const storedConfig = JSON.parse(localStorage.getItem("appConfig") || "{}");
  const allowedKeys = Object.keys(defaultConfig);
  const filteredStored = Object.fromEntries(
    Object.entries(storedConfig).filter(([k]) => allowedKeys.includes(k))
  );

  const [config, setConfig] = useState({ ...defaultConfig, ...filteredStored });

  // 🔸 Lưu vào localStorage mỗi khi config thay đổi
  useEffect(() => {
    localStorage.setItem("appConfig", JSON.stringify(config));
  }, [config]);

  // 🔸 Lắng nghe Firestore để đồng bộ các trường chia sẻ (trừ login)
  useEffect(() => {
    const docRef = doc(db, "CONFIG", "config");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();

        // Bỏ qua trường login để tránh đồng bộ giữa các máy
        const filteredData = Object.fromEntries(
          Object.entries(data).filter(([key]) => key !== "login")
        );

        setConfig((prev) => {
          const hasDiff = Object.keys(filteredData).some(
            (key) => prev[key] !== filteredData[key]
          );
          return hasDiff ? { ...prev, ...filteredData } : prev;
        });
      },
      (err) => console.error("❌ Firestore snapshot lỗi:", err)
    );

    return () => unsubscribe();
  }, []);

  // 🔸 Hàm cập nhật config (chỉ ghi các trường không phải login)
  const updateConfig = async (newValues) => {
    const filtered = Object.fromEntries(
      Object.entries(newValues).filter(([k]) => allowedKeys.includes(k))
    );

    const hasDiff = Object.keys(filtered).some((k) => filtered[k] !== config[k]);
    if (!hasDiff) return;

    setConfig((prev) => ({ ...prev, ...filtered }));

    // Chỉ ghi các trường không phải login
    const firestoreData = Object.fromEntries(
      Object.entries(filtered).filter(([key]) => key !== "login")
    );

    if (Object.keys(firestoreData).length > 0) {
      const docRef = doc(db, "CONFIG", "config");
      await setDoc(docRef, firestoreData, { merge: true });
      console.log("✅ Firestore cập nhật:", firestoreData);
    }
  };

  return (
    <ConfigContext.Provider value={{ config, setConfig: updateConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);