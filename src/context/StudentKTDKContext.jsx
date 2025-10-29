// src/context/StudentKTDKContext.jsx
import React, { createContext, useState, useEffect } from "react";

export const StudentKTDKContext = createContext();

export const StudentKTDKProvider = ({ children }) => {
  // 🧩 Dữ liệu học sinh (cache theo từng lớp và học kỳ)
  // Cấu trúc: { [termDoc]: { [classKey]: [students] } }
  const [studentsKTDK, setStudentsKTDK] = useState({});

  // 🔄 Lưu xuống localStorage khi studentsKTDK thay đổi (tùy chọn)
  useEffect(() => {
    localStorage.setItem("studentsKTDK", JSON.stringify(studentsKTDK));
  }, [studentsKTDK]);

  // ⚡ Load lại từ storage khi mount
  useEffect(() => {
    const stored = localStorage.getItem("studentsKTDK");
    if (stored && Object.keys(studentsKTDK).length === 0) {
      setStudentsKTDK(JSON.parse(stored));
    }
  }, []);

  // 🟢 Lấy dữ liệu theo lớp và học kỳ
  const getStudentsForClass = (termDoc, classKey) => {
    return studentsKTDK?.[termDoc]?.[classKey] || null;
  };

  // 🟢 Lưu dữ liệu theo lớp và học kỳ
  const setStudentsForClass = (termDoc, classKey, students) => {
    setStudentsKTDK((prev) => ({
      ...prev,
      [termDoc]: {
        ...prev[termDoc],
        [classKey]: students,
      },
    }));
  };

  return (
    <StudentKTDKContext.Provider
      value={{
        studentsKTDK,
        getStudentsForClass,
        setStudentsForClass,
      }}
    >
      {children}
    </StudentKTDKContext.Provider>
  );
};
