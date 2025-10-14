import React, { createContext, useState } from "react";

export const EvaluationContext = createContext();

export const EvaluationProvider = ({ children }) => {
  // 🧩 Dữ liệu đánh giá học sinh (cache theo từng lớp)
  const [evaluationData, setEvaluationData] = useState({});
  // 🧩 Dữ liệu danh sách lớp (nếu cần)
  const [classData, setClassData] = useState([]);

  return (
    <EvaluationContext.Provider
      value={{
        evaluationData,
        setEvaluationData,
        classData,
        setClassData,
      }}
    >
      {children}
    </EvaluationContext.Provider>
  );
};
