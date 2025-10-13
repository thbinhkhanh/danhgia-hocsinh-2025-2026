// ConfigContext.jsx
import React, { createContext, useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; // ✅ đúng đường dẫn


export const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({}); // { tuan: ..., hethong: boolean }

  // 🔄 Khi config thay đổi -> lưu xuống localStorage
  useEffect(() => {
    localStorage.setItem("appConfig", JSON.stringify(config));
  }, [config]);

  // ⚡ Khi ứng dụng khởi động, nếu config rỗng -> load từ storage hoặc Firestore
  useEffect(() => {
    const storedConfig = localStorage.getItem("appConfig");
    if (storedConfig && Object.keys(config).length === 0) {
      const parsed = JSON.parse(storedConfig);
      setConfig({
        tuan: parsed.tuan || "",
        hethong: parsed.hethong === true, // đảm bảo boolean
      });
    } else if (Object.keys(config).length === 0) {
      // nếu storage rỗng, fetch từ Firestore
      const fetchConfig = async () => {
        try {
          const docRef = doc(db, "CONFIG", "config");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setConfig({
              tuan: data.tuan || "",
              hethong: data.hethong === true, // lưu dạng đóng/mở
            });
          }
        } catch (error) {
          console.error("Lỗi khi lấy config từ Firestore:", error);
        }
      };
      fetchConfig();
    }
  }, []); // chỉ chạy 1 lần khi mount

  return (
    <ConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};
