import React, { createContext, useState, useEffect, useContext } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// 🔹 Tạo context
export const ConfigContext = createContext();

// 🔹 Provider bao quanh toàn app
export const ConfigProvider = ({ children }) => {
  const defaultConfig = {
    tuan: 1,
    hethong: false,
    giaovien: false,
    mon: "Tin học",
    login: false,
    hocky: "Giữa kỳ I", // thêm giá trị mặc định học kỳ
  };

  // Lấy config từ localStorage nếu có
  const storedConfig = JSON.parse(localStorage.getItem("appConfig") || '{}');
  const [config, setConfig] = useState({ ...defaultConfig, ...storedConfig });

  // 🔄 Khi config thay đổi -> lưu xuống localStorage
  useEffect(() => {
    localStorage.setItem("appConfig", JSON.stringify(config));
  }, [config]);

  // ⚡ Khi app khởi động, nếu localStorage trống thì load từ Firestore
  useEffect(() => {
    if (!localStorage.getItem("appConfig")) {
      const fetchConfig = async () => {
        try {
          const docRef = doc(db, "CONFIG", "config");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const restoredConfig = {
              tuan: data.tuan || 1,
              hethong: data.hethong === true,
              giaovien: data.giaovien === true || false,
              mon: data.mon || "Tin học",
              login: data.login === true || false,
              hocky: data.hocky || "Giữa kỳ I",
            };
            setConfig(restoredConfig);
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

// 🔹 Custom hook để dùng context dễ dàng
export const useConfig = () => {
  return useContext(ConfigContext);
};
