import React, { createContext, useState, useEffect } from "react";

export const StudentContext = createContext();

export const StudentProvider = ({ children }) => {
  // 🧩 Dữ liệu học sinh (cache theo từng lớp và học kỳ)
  // Cấu trúc: { [termDoc]: { [classKey]: [students] } }
  const [studentData, setStudentData] = useState({});
  // 🧩 Dữ liệu danh sách lớp
  const [classData, setClassData] = useState([]);

  // 🔄 Lưu xuống localStorage khi studentData thay đổi
  useEffect(() => {
    localStorage.setItem("studentData", JSON.stringify(studentData));
  }, [studentData]);

  // 🔄 Lưu xuống localStorage khi classData thay đổi
  useEffect(() => {
    localStorage.setItem("classData", JSON.stringify(classData));
  }, [classData]);

  // ⚡ Load lại từ storage khi mount
  useEffect(() => {
    const storedStudent = localStorage.getItem("studentData");
    const storedClass = localStorage.getItem("classData");

    if (storedStudent && Object.keys(studentData).length === 0) {
      setStudentData(JSON.parse(storedStudent));
    }

    if (storedClass && classData.length === 0) {
      setClassData(JSON.parse(storedClass));
    }
  }, []);

  // 🟢 Helper: lấy dữ liệu theo lớp và học kỳ
  const getStudentsForClass = (termDoc, classKey) => {
    return studentData?.[termDoc]?.[classKey] || null;
  };

  // 🟢 Helper: set dữ liệu theo lớp và học kỳ
  const setStudentsForClass = (termDoc, classKey, students) => {
    setStudentData(prev => ({
      ...prev,
      [termDoc]: {
        ...prev[termDoc],
        [classKey]: students
      }
    }));
  };

  return (
    <StudentContext.Provider
      value={{
        studentData,
        setStudentData,
        classData,
        setClassData,
        getStudentsForClass,
        setStudentsForClass
      }}
    >
      {children}
    </StudentContext.Provider>
  );
};
