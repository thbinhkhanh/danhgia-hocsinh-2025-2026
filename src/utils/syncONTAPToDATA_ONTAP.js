import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

const classList = [
  "4.1", "4.2", "4.3", "4.4", "4.5", "4.6",
  "5", "5.1", "5.2", "5.3", "5.4",
];

// 🔥 LIMIT concurrency để không spam Firestore
const runWithLimit = async (items, limit, handler) => {
  const queue = [...items];
  const workers = new Array(limit).fill(null).map(async () => {
    while (queue.length) {
      const item = queue.shift();
      await handler(item);
    }
  });
  await Promise.all(workers);
};

export const syncONTAPToDATA_ONTAP = async ({
  db,
  sourceHocKy = "Cả năm",
  targetHocKy = "Cuối năm",
  namHoc = "2025-2026",
}) => {
  try {
    const namHocKey = namHoc.replace(/-/g, "_");
    const targetRoot = `DATA_ONTAP_${namHocKey}`;

    let totalStudents = 0;
    let totalClassesHasData = 0;

    await runWithLimit(classList, 3, async (classKey) => {
      const normalizedClassKey = classKey.replace(".", "_");

      // Nguồn ONTAP
      const snap = await getDocs(
        collection(db, "ONTAP", sourceHocKy, classKey)
      );

      if (snap.empty) return;

      totalClassesHasData++;

      // Đọc DANHSACH của lớp 1 lần
      const dsSnap = await getDoc(
        doc(db, `DANHSACH_${namHocKey}`, classKey)
      );

      const nameToId = {};

      if (dsSnap.exists()) {
        Object.entries(dsSnap.data()).forEach(([maHS, info]) => {
          const ten = (info?.hoVaTen || "")
            .trim()
            .toUpperCase();

          if (ten) {
            nameToId[ten] = maHS;
          }
        });
      }

      await Promise.all(
        snap.docs.map(async (studentDoc) => {
          const data = studentDoc.data();
          const subjects = data.subjects || {};

          const tinHoc = subjects.TinHoc || {};
          const congNghe = subjects.CongNghe || {};

          // Tìm mã định danh theo họ tên
          const maHS =
            nameToId[(data.hoVaTen || "").trim().toUpperCase()] ||
            studentDoc.id; // fallback nếu không tìm thấy

          const docRef = doc(
            db,
            targetRoot,
            normalizedClassKey,
            "HOCSINH",
            maHS
          );

          const fixedData = {
            hoVaTen: data.hoVaTen || "",
            lop: data.lop || classKey,
            subjects: {
              TinHoc: {
                ...tinHoc,
                lyThuyet: tinHoc.lyThuyet ?? tinHoc.diem ?? null,
              },
              CongNghe: {
                ...congNghe,
                lyThuyet: congNghe.lyThuyet ?? congNghe.diem ?? null,
              },
            },
          };

          delete fixedData.subjects.TinHoc.diem;
          delete fixedData.subjects.CongNghe.diem;

          await setDoc(docRef, fixedData, { merge: true });

          totalStudents++;
        })
      );
    });
  } catch (err) {
    console.error("SYNC ERROR:", err);
  }
};