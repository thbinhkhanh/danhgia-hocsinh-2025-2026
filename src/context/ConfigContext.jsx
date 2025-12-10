import React, { createContext, useState, useEffect, useContext } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const defaultConfig = {
    tuan: 1,
    mon: "Tin học",
    login: false,
    hocKy: "Giữa kỳ I",
    lop: "",
    kiemTraDinhKi: false,
    baiTapTuan: false,
    danhGiaTuan: false,
    onTap: false,        // ✅ thêm dòng này
    timeLimit: 1, 
    choXemDiem: false, 
    choXemDapAn: false,      
    xuatFileBaiLam: false,  
    hienThiTenGanDay: false, 
  };

  const storedConfig = JSON.parse(localStorage.getItem("appConfig") || "{}");
  const allowedKeys = Object.keys(defaultConfig);
  const filteredStored = Object.fromEntries(
    Object.entries(storedConfig).filter(([k]) => allowedKeys.includes(k))
  );

  const [config, setConfig] = useState({ ...defaultConfig, ...filteredStored });

  // Lưu localStorage khi config thay đổi
  useEffect(() => {
    localStorage.setItem("appConfig", JSON.stringify(config));
  }, [config]);

  // Chỉ đọc Firestore snapshot, không ghi lại
  useEffect(() => {
    const docRef = doc(db, "CONFIG", "config");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();

        setConfig((prev) => {
          const hasDiff = Object.keys(defaultConfig).some(
            (key) => prev[key] !== data[key]
          );
          return hasDiff ? { ...prev, ...data } : prev;
        });
      },
      (err) => console.error("❌ Firestore snapshot lỗi:", err)
    );

    return () => unsubscribe();
  }, []);

  // Hàm cập nhật config do người dùng thao tác
  const updateConfig = async (newValues) => {
    const filtered = Object.fromEntries(
      Object.entries(newValues).filter(([k]) => allowedKeys.includes(k))
    );

    // Chỉ update nếu khác hẳn state hiện tại
    const hasDiff = Object.keys(filtered).some((k) => filtered[k] !== config[k]);
    if (!hasDiff) return;

    setConfig((prev) => ({ ...prev, ...filtered }));

    const docRef = doc(db, "CONFIG", "config");
    await setDoc(docRef, filtered, { merge: true });
    console.log("✅ Firestore cập nhật:", filtered);
  };

  return (
    <ConfigContext.Provider value={{ config, setConfig: updateConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
