// src/context/SelectedClassContext.jsx
import React, { createContext, useContext, useState } from "react";

const SelectedClassContext = createContext();

export const SelectedClassProvider = ({ children }) => {
  const [selectedClass, setSelectedClass] = useState("");

  return (
    <SelectedClassContext.Provider value={{ selectedClass, setSelectedClass }}>
      {children}
    </SelectedClassContext.Provider>
  );
};

export const useSelectedClass = () => useContext(SelectedClassContext);
