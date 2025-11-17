import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Hàm phục hồi toàn bộ dữ liệu từ file JSON, với progress callback
 * @param {File} file - file JSON backup
 * @param {function} onProgress - callback nhận giá trị 0-100 để cập nhật thanh tiến trình
 */
export const restoreAllFromJson = async (file, onProgress) => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const collections = Object.keys(data);
    let progressCount = 0;

    for (let colIndex = 0; colIndex < collections.length; colIndex++) {
      const colName = collections[colIndex];

      if (colName === "DGTX") {
        // ✅ Phục hồi toàn bộ dữ liệu DGTX (đã được lọc sẵn, chỉ còn lớp có "tuan")
        const classes = Object.keys(data.DGTX || {});
        const totalClasses = classes.length;

        for (let i = 0; i < totalClasses; i++) {
          const lopId = classes[i];
          const tuanData = data.DGTX[lopId]?.tuan || {};

          // Bỏ qua nếu không có tuần (phòng khi file cũ)
          const tuanKeys = Object.keys(tuanData);
          if (tuanKeys.length === 0) continue;

          // Restore từng tuần song song
          await Promise.all(
            tuanKeys.map(async (tuanId) => {
              const weekContent = tuanData[tuanId];
              const tuanRef = doc(db, "DGTX", lopId, "tuan", tuanId);
              await setDoc(tuanRef, weekContent, { merge: true });
            })
          );

          // Cập nhật tiến trình chi tiết DGTX (~70%)
          if (onProgress) {
            const dgtxProgress = ((i + 1) / totalClasses) * 70;
            onProgress(Math.min(Math.round(progressCount + dgtxProgress), 99));
          }
        }

        progressCount += 70;
      } else {
        // ✅ Các collection khác: DANHSACH, CONFIG, KTDK
        const docs = data[colName] || {};
        const docIds = Object.keys(docs);
        const totalDocs = docIds.length;

        for (let j = 0; j < totalDocs; j++) {
          const id = docIds[j];
          await setDoc(doc(db, colName, id), docs[id], { merge: true });

          // Cập nhật tiến trình cho phần còn lại (~30%)
          if (onProgress && totalDocs > 0) {
            const otherProgress =
              ((j + 1) / totalDocs) * (30 / (collections.length - 1));
            onProgress(Math.min(Math.round(progressCount + otherProgress), 99));
          }
        }

        progressCount += 30 / (collections.length - 1);
      }
    }

    if (onProgress) onProgress(100);
    console.log("✅ Đã phục hồi dữ liệu thành công!");
    return true;
  } catch (err) {
    console.error("❌ Lỗi khi phục hồi backup:", err);
    return false;
  }
};
