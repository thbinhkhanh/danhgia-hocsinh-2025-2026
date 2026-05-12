import React, { createContext, useContext, useState, useEffect } from "react";

const TracNghiemContext = createContext();

export const TracNghiemProvider = ({ children }) => {
  const [config, setConfig] = useState({
    hocKy: "",
    tuan: 1,
    selectedClass: "",
    selectedSubject: "",
    deTracNghiem: "",
  });

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("teacherConfig") || "{}");
      setConfig(prev => ({ ...prev, ...stored }));
    } catch (err) { console.error(err); }
  }, []);

  const updateConfig = patch => {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem("teacherConfig", JSON.stringify(next));
      return next;
    });
  };

  return (
    <TracNghiemContext.Provider value={{ config, updateConfig }}>
      {children}
    </TracNghiemContext.Provider>
  );
};

export const useTracNghiem = () => {
  const ctx = useContext(TracNghiemContext);
  if (!ctx) throw new Error("useTracNghiem must be used inside TracNghiemProvider");
  return ctx;
};
