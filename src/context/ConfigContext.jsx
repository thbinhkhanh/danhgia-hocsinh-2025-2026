import React, { createContext, useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({});
  // ví dụ: { tuan: 1, hethong: true, giaovien: false, congnghe: false, login: true }

  // 🔄 Khi config thay đổi -> lưu xuống localStorage
  useEffect(() => {
    localStorage.setItem("appConfig", JSON.stringify(config));
  }, [config]);

  // ⚡ Khi ứng dụng khởi động, nếu config rỗng -> load từ localStorage hoặc Firestore
  useEffect(() => {
    const storedConfig = localStorage.getItem("appConfig");

    // nếu có localStorage và chưa có config trong state
    if (storedConfig && Object.keys(config).length === 0) {
      const parsed = JSON.parse(storedConfig);
      const restoredConfig = {
        tuan: parsed.tuan || "",
        hethong: parsed.hethong === true,
        giaovien: parsed.giaovien === true,
        congnghe: parsed.congnghe === true,
        login: parsed.login === true || false,
      };
      setConfig(restoredConfig);
      console.log("🧠 ConfigContext từ localStorage:", restoredConfig);
    }
    // nếu localStorage rỗng, lấy từ Firestore
    else if (Object.keys(config).length === 0) {
      const fetchConfig = async () => {
        try {
          const docRef = doc(db, "CONFIG", "config");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const restoredConfig = {
              tuan: data.tuan || "",
              hethong: data.hethong === true,
              giaovien: data.giaovien === true || false,
              congnghe: data.congnghe === true || false,
              login: data.login === true || false,
            };
            setConfig(restoredConfig);
            console.log("🧠 ConfigContext từ Firestore:", restoredConfig);
          }
        } catch (error) {
          console.error("❌ Lỗi khi lấy config từ Firestore:", error);
        }
      };
      fetchConfig();
    }
  }, []);

  return (
    <ConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};