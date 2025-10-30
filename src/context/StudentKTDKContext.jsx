import React, { createContext, useState, useEffect, useMemo } from "react";

export const StudentKTDKContext = createContext();

export const StudentKTDKProvider = ({ children }) => {
  const [studentsKTDK, setStudentsKTDK] = useState({});

  useEffect(() => {
    localStorage.setItem("studentsKTDK", JSON.stringify(studentsKTDK));
  }, [studentsKTDK]);

  useEffect(() => {
    const stored = localStorage.getItem("studentsKTDK");
    if (stored && Object.keys(studentsKTDK).length === 0) {
      setStudentsKTDK(JSON.parse(stored));
    }
  }, []);

  const getStudentsForClass = (termDoc, classKey) => {
    return studentsKTDK?.[termDoc]?.[classKey] || null;
  };

  const setStudentsForClass = (termDoc, classKey, students) => {
    setStudentsKTDK((prev) => ({
      ...prev,
      [termDoc]: {
        ...prev[termDoc],
        [classKey]: students,
      },
    }));
  };

  const contextValue = useMemo(
    () => ({
      studentsKTDK,
      getStudentsForClass,
      setStudentsForClass,
    }),
    [studentsKTDK]
  );

  return (
    <StudentKTDKContext.Provider value={contextValue}>
      {children}
    </StudentKTDKContext.Provider>
  );
};