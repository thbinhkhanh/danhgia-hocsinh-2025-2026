import React, { createContext, useState, useEffect, useMemo } from "react";

export const StudentKTDKContext = createContext();

export const StudentKTDKProvider = ({ children }) => {
  const [studentsKTDK, setStudentsKTDK] = useState({});

  // ============================================================
  // PHẦN CŨ - GIỮ NGUYÊN
  // ============================================================
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

  // ============================================================
  // PHẦN BỔ SUNG - LƯU MỨC ĐẠT ĐGTX
  // Không thay đổi cấu trúc studentsKTDK hiện tại
  // ============================================================

  const [dgtxMucDat, setDgtxMucDatState] = useState({});

  // Đọc Mức đạt đã lưu trước đó
  useEffect(() => {
    try {
      const stored = localStorage.getItem("dgtxMucDat");

      if (stored) {
        setDgtxMucDatState(JSON.parse(stored));
      }
    } catch (error) {
      console.error("❌ Lỗi đọc dgtxMucDat:", error);
    }
  }, []);

  // Lưu Mức đạt vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "dgtxMucDat",
        JSON.stringify(dgtxMucDat)
      );
    } catch (error) {
      console.error("❌ Lỗi lưu dgtxMucDat:", error);
    }
  }, [dgtxMucDat]);

  // ============================================================
  // LẤY MỨC ĐẠT CỦA 1 HỌC SINH
  // ============================================================
  const getDgtxMucDat = (
    namHocKey,
    classKey,
    subjectKey,
    termDoc,
    maDinhDanh
  ) => {
    return (
      dgtxMucDat?.[namHocKey]?.[classKey]?.[subjectKey]?.[termDoc]?.[
        maDinhDanh
      ] ?? null
    );
  };

  // ============================================================
  // LƯU MỨC ĐẠT CỦA 1 HỌC SINH
  // Chỉ lưu Context + localStorage
  // KHÔNG ghi Firestore
  // ============================================================
  const setDgtxMucDat = (
    namHocKey,
    classKey,
    subjectKey,
    termDoc,
    maDinhDanh,
    mucDat
  ) => {
    setDgtxMucDatState((prev) => ({
      ...prev,
      [namHocKey]: {
        ...prev[namHocKey],
        [classKey]: {
          ...prev[namHocKey]?.[classKey],
          [subjectKey]: {
            ...prev[namHocKey]?.[classKey]?.[subjectKey],
            [termDoc]: {
              ...prev[namHocKey]?.[classKey]?.[subjectKey]?.[termDoc],
              [maDinhDanh]: mucDat,
            },
          },
        },
      },
    }));
  };

  // ============================================================
  // LƯU MỨC ĐẠT CHO CẢ LỚP
  // Dùng khi TongHopDanhGia đã tính xong danh sách học sinh
  // ============================================================
  const setDgtxMucDatForClass = (
    namHocKey,
    classKey,
    subjectKey,
    termDoc,
    data
  ) => {
    setDgtxMucDatState((prev) => ({
      ...prev,
      [namHocKey]: {
        ...prev[namHocKey],
        [classKey]: {
          ...prev[namHocKey]?.[classKey],
          [subjectKey]: {
            ...prev[namHocKey]?.[classKey]?.[subjectKey],
            [termDoc]: {
              ...prev[namHocKey]?.[classKey]?.[subjectKey]?.[termDoc],
              ...data,
            },
          },
        },
      },
    }));
  };

  // ============================================================
  // XÓA MỨC ĐẠT CỦA 1 HỌC SINH
  // Dùng khi cần khôi phục trạng thái
  // ============================================================
  const removeDgtxMucDat = (
    namHocKey,
    classKey,
    subjectKey,
    termDoc,
    maDinhDanh
  ) => {
    setDgtxMucDatState((prev) => {
      const next = { ...prev };

      if (
        next?.[namHocKey]?.[classKey]?.[subjectKey]?.[termDoc]
      ) {
        const termData = {
          ...next[namHocKey][classKey][subjectKey][termDoc],
        };

        delete termData[maDinhDanh];

        next[namHocKey] = {
          ...next[namHocKey],
          [classKey]: {
            ...next[namHocKey][classKey],
            [subjectKey]: {
              ...next[namHocKey][classKey][subjectKey],
              [termDoc]: termData,
            },
          },
        };
      }

      return next;
    });
  };

  // ============================================================
  // CONTEXT VALUE
  // ============================================================
  const contextValue = useMemo(
    () => ({
      // ----------------------------
      // PHẦN CŨ
      // ----------------------------
      studentsKTDK,
      getStudentsForClass,
      setStudentsForClass,

      // ----------------------------
      // PHẦN MỚI - MỨC ĐẠT ĐGTX
      // ----------------------------
      dgtxMucDat,
      getDgtxMucDat,
      setDgtxMucDat,
      setDgtxMucDatForClass,
      removeDgtxMucDat,
    }),
    [studentsKTDK, dgtxMucDat]
  );

  return (
    <StudentKTDKContext.Provider value={contextValue}>
      {children}
    </StudentKTDKContext.Provider>
  );
};