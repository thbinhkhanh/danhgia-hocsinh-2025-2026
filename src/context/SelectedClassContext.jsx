import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import { ConfigContext } from "./ConfigContext";

const SelectedClassContext = createContext();

export const SelectedClassProvider = ({ children }) => {
  const { config } = useContext(ConfigContext);

  const namHoc = config?.namHoc || "2025-2026";
  const namHocKey = namHoc.replace(/-/g, "_");

  const classesKey = `classes_${namHocKey}`;
  const selectedKey = `selectedClass_${namHocKey}`;

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClassState] = useState("");

  // =====================================================
  // LẤY DANH SÁCH LỚP
  // Ưu tiên localStorage → nếu chưa có thì lấy Firestore
  // =====================================================
  useEffect(() => {
    if (!namHocKey) return;

    const loadClasses = async () => {
      try {
        // 1. Kiểm tra localStorage
        const cached = localStorage.getItem(classesKey);

        if (cached) {
          const list = JSON.parse(cached);

          if (Array.isArray(list) && list.length > 0) {
            setClasses(list);

            // Lấy lớp đang chọn từ storage
            const savedClass =
              localStorage.getItem(selectedKey);

            if (savedClass && list.includes(savedClass)) {
              setSelectedClassState(savedClass);
            } else if (
              config?.lop &&
              list.includes(config.lop)
            ) {
              setSelectedClassState(config.lop);
            } else {
              setSelectedClassState(list[0] || "");
            }

            return;
          }
        }

        // 2. Chưa có storage → lấy Firestore
        const ref = doc(
          db,
          "DANHSACH_LOP",
          namHocKey
        );

        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setClasses([]);
          setSelectedClassState("");
          return;
        }

        const list = (snap.data().list || []).sort();

        // Lưu Context
        setClasses(list);

        // Lưu localStorage
        localStorage.setItem(
          classesKey,
          JSON.stringify(list)
        );

        // Xác định lớp đang chọn
        let nextClass = "";

        const savedClass =
          localStorage.getItem(selectedKey);

        if (savedClass && list.includes(savedClass)) {
          nextClass = savedClass;
        } else if (
          config?.lop &&
          list.includes(config.lop)
        ) {
          nextClass = config.lop;
        } else {
          nextClass = list[0] || "";
        }

        setSelectedClassState(nextClass);

        localStorage.setItem(
          selectedKey,
          nextClass
        );
      } catch (error) {
        console.error(
          "❌ Lỗi lấy danh sách lớp:",
          error
        );
      }
    };

    loadClasses();
  }, [namHocKey, config?.lop]);

  // =====================================================
  // CHỌN LỚP
  // Context + localStorage + CONFIG
  // =====================================================
  const setSelectedClass = async (value) => {
    setSelectedClassState(value);

    localStorage.setItem(
      selectedKey,
      value
    );

    try {
      await setDoc(
        doc(db, "CONFIG", "config"),
        {
          lop: value,
        },
        { merge: true }
      );
    } catch (error) {
      console.error(
        "❌ Lỗi lưu lớp đang chọn:",
        error
      );
    }
  };

  // =====================================================
  // CẬP NHẬT DANH SÁCH LỚP
  // Context + localStorage + Firestore
  // =====================================================
  const updateClasses = async (newList) => {
    const updated = [...newList].sort();

    // Context
    setClasses(updated);

    // localStorage
    localStorage.setItem(
      classesKey,
      JSON.stringify(updated)
    );

    // Firestore
    try {
      await setDoc(
        doc(db, "DANHSACH_LOP", namHocKey),
        {
          list: updated,
        },
        { merge: true }
      );
    } catch (error) {
      console.error(
        "❌ Lỗi cập nhật danh sách lớp:",
        error
      );
    }
  };

  // =====================================================
  // THÊM LỚP
  // =====================================================
  const addClass = async (classList) => {
    const newClasses = Array.isArray(classList)
      ? classList
      : [classList];

    const uniqueNew = newClasses.filter(
      (cls) =>
        cls &&
        !classes.includes(cls)
    );

    if (uniqueNew.length === 0) return;

    const updated = [
      ...classes,
      ...uniqueNew,
    ].sort();

    await updateClasses(updated);

    // Chọn lớp mới đầu tiên
    await setSelectedClass(uniqueNew[0]);
  };

  // =====================================================
  // XÓA LỚP
  // =====================================================
  const deleteClass = async (className) => {
    if (!className) return;

    const updated = classes
      .filter((cls) => cls !== className)
      .sort();

    await updateClasses(updated);

    const nextClass = updated[0] || "";

    await setSelectedClass(nextClass);
  };

  return (
    <SelectedClassContext.Provider
      value={{
        classes,
        selectedClass,

        setSelectedClass,
        setClasses,

        updateClasses,
        addClass,
        deleteClass,

        namHoc,
        namHocKey,
      }}
    >
      {children}
    </SelectedClassContext.Provider>
  );
};

export const useSelectedClass = () => useContext(SelectedClassContext);
