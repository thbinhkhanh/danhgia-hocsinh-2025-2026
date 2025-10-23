import React, { createContext, useState } from "react";

export const StudentDataContext = createContext();

export const StudentDataProvider = ({ children }) => {
  // Lưu dữ liệu theo key: lớp + học kì + công nghệ (nếu có)
  // Ví dụ: { "5.1_HK1": [...], "5.1_CN_HK1": [...], "5.1_CN_ALL": [...] }
  const [studentDataByClass, setStudentDataByClass] = useState({});

  // classKey: string duy nhất bao gồm lớp + "_CN" nếu tick + học kì
  const setStudentsForClass = (classKey, students) => {
    setStudentDataByClass((prev) => ({
      ...prev,
      [classKey]: students,
    }));
  };

  const getStudentsForClass = (classKey) => {
    return studentDataByClass[classKey] || null;
  };

  return (
    <StudentDataContext.Provider
      value={{ studentDataByClass, setStudentsForClass, getStudentsForClass }}
    >
      {children}
    </StudentDataContext.Provider>
  );
};
