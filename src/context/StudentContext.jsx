import React, { createContext, useState, useEffect } from "react";

export const StudentContext = createContext();

export const StudentProvider = ({ children }) => {
  // 🧩 Dữ liệu học sinh (cache theo từng lớp)
  const [studentData, setStudentData] = useState({});
  // 🧩 Dữ liệu danh sách lớp
  const [classData, setClassData] = useState([]);

  // 🔄 Khi studentData thay đổi -> lưu xuống localStorage
  useEffect(() => {
    localStorage.setItem("studentData", JSON.stringify(studentData));
  }, [studentData]);

  // 🔄 Khi classData thay đổi -> lưu xuống localStorage
  useEffect(() => {
    localStorage.setItem("classData", JSON.stringify(classData));
  }, [classData]);

  // ⚡ Khi ứng dụng khởi động, nếu context rỗng thì load lại từ storage
  useEffect(() => {
    const storedStudent = localStorage.getItem("studentData");
    const storedClass = localStorage.getItem("classData");

    if (storedStudent && Object.keys(studentData).length === 0) {
      setStudentData(JSON.parse(storedStudent));
    }

    if (storedClass && classData.length === 0) {
      setClassData(JSON.parse(storedClass));
    }
  }, []); // chỉ chạy 1 lần khi mount

  return (
    <StudentContext.Provider
      value={{
        studentData,
        setStudentData,
        classData,
        setClassData,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
};
