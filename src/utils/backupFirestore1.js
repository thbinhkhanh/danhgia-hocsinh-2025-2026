import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Lấy toàn bộ dữ liệu backup: DANHSACH, CONFIG, KTDK, DGTX
 * @param {function} onProgress - callback nhận giá trị 0-100 để cập nhật thanh tiến trình
 * @returns {object} backupData - dữ liệu backup đầy đủ
 */
export const fetchAllBackup = async (onProgress) => {
  try {
    const backupData = {
      DANHSACH: {},
      CONFIG: {},
      KTDK: {},
      DGTX: {},
    };

    const collections = ["DANHSACH", "CONFIG", "KTDK", "DGTX"];
    let progressCount = 0;

    for (const colName of collections) {
      if (colName === "DGTX") {
        // ✅ Lấy tất cả lớp từ DANHSACH
        const classSnap = await getDocs(collection(db, "DANHSACH"));
        const classIds = classSnap.docs.map(d => d.id);

        // ✅ Thêm phiên bản "_CN" cho mỗi lớp
        const classIdsWithCN = [
          ...classIds,
          ...classIds.map(id => `${id}_CN`)
        ];

        const totalClasses = classIdsWithCN.length;

        for (let j = 0; j < totalClasses; j++) {
          const lopId = classIdsWithCN[j];
          const tuanSnap = await getDocs(collection(db, "DGTX", lopId, "tuan"));

          // Chỉ xử lý nếu có tuần
          if (!tuanSnap.empty) {
            backupData.DGTX[lopId] = { tuan: {} };

            await Promise.all(
              tuanSnap.docs.map(async (tuanDoc) => {
                const tuanId = tuanDoc.id;
                const tuanDataSnap = await getDoc(doc(db, "DGTX", lopId, "tuan", tuanId));
                if (tuanDataSnap.exists()) {
                  backupData.DGTX[lopId]["tuan"][tuanId] = tuanDataSnap.data();
                }
              })
            );
          }

          // Cập nhật tiến trình chi tiết
          if (onProgress) {
            const dgtxProgress = Math.round(((j + 1) / totalClasses) * 70); // DGTX chiếm ~70%
            const overallProgress = Math.round(progressCount + dgtxProgress * (30 / 70));
            onProgress(Math.min(overallProgress, 99));
          }
        }

        progressCount += 70; // sau khi DGTX xong
      } else {
        // ✅ Các collection còn lại
        const snap = await getDocs(collection(db, colName));
        snap.forEach(docSnap => {
          backupData[colName][docSnap.id] = docSnap.data();
        });

        // Cập nhật tiến trình
        progressCount += 10;
        if (onProgress) onProgress(Math.min(progressCount, 99));
      }
    }

    // ✅ Lọc bỏ lớp không có dữ liệu tuan
    Object.keys(backupData.DGTX).forEach(lopId => {
      const tuan = backupData.DGTX[lopId]?.tuan;
      if (!tuan || Object.keys(tuan).length === 0) {
        delete backupData.DGTX[lopId];
      }
    });

    if (onProgress) onProgress(100);
    console.log("✅ Đã tổng hợp dữ liệu toàn bộ!");
    return backupData;
  } catch (err) {
    console.error("❌ Lỗi khi fetch backup:", err);
    return {};
  }
};

/**
 * Xuất dữ liệu backup ra file JSON
 * @param {object} data - dữ liệu backup
 */
export const exportBackupToJson = (data) => {
  if (!data || Object.keys(data).length === 0) {
    console.warn("⚠️ Không có dữ liệu để xuất");
    return;
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup_full_${new Date().toISOString()}.json`;
  a.click();
};
