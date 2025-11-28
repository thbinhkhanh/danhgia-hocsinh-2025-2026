import React, { createContext, useState, useEffect, useContext } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const defaultConfig = {
  hocKy: "Giữa kỳ I",        // Học kỳ
  lop: "",                    // Lớp mặc định
  mon: "Tin học",             // Môn mặc định
  pass: "",                   // Mật khẩu
  timeLimit: 1,               // Thời gian mặc định (phút)
  baiTapTuan: false,          // Bài tập tuần (trước là tracNghiem)
  kiemTraDinhKi: false,       // Kiểm tra định kì
  choXemDiem: false,          // Cho xem điểm
  choXemDapAn: false,         // Cho xem đáp án
  xuatFileBaiLam: false,      // Xuất file bài làm
  tuan: 1                     // Tuần hiện tại
};


  const storedConfig = JSON.parse(localStorage.getItem("adminConfig") || "{}");
  const allowedKeys = Object.keys(defaultConfig);
  const filteredStored = Object.fromEntries(
    Object.entries(storedConfig).filter(([k]) => allowedKeys.includes(k))
  );

  const [config, setConfigState] = useState({ ...defaultConfig, ...filteredStored });

  // Lưu localStorage khi config thay đổi
  useEffect(() => {
    localStorage.setItem("adminConfig", JSON.stringify(config));
  }, [config]);

  // Lấy dữ liệu realtime từ Firestore
  useEffect(() => {
    const docRef = doc(db, "ADMIN", "config");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        setConfigState((prev) => {
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

  // Hàm cập nhật config ADMIN
  const updateAdminConfig = async (newValues) => {
    const filtered = Object.fromEntries(
      Object.entries(newValues).filter(([k]) => allowedKeys.includes(k))
    );

    const hasDiff = Object.keys(filtered).some((k) => filtered[k] !== config[k]);
    if (!hasDiff) return;

    setConfigState((prev) => ({ ...prev, ...filtered }));

    const docRef = doc(db, "ADMIN", "config");
    try {
      await setDoc(docRef, filtered, { merge: true });
      console.log("✅ Firestore ADMIN cập nhật:", filtered);
    } catch (err) {
      console.error("❌ Lỗi cập nhật ADMIN config:", err);
    }
  };

  return (
    <AdminContext.Provider value={{ adminConfig: config, updateAdminConfig }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdminConfig = () => useContext(AdminContext);
