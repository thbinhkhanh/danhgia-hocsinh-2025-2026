
export const getRotatedHeaderCellIds = (
  worksheet,
  headerRows,
  range,
  normalizeText,
  getCellValue
) => {
  const rotatedIds = new Set();

  if (!headerRows?.length) {
    return rotatedIds;
  }

  const targetHeaders = new Set([
    "yeu nuoc",
    "nhan ai",
    "cham chi",
    "trung thuc",
    "trach nhiem",
    "tu chu va tu hoc",
    "giao tiep va hop tac",
    "gqvd va sang tao",
    "ngon ngu",
    "tinh toan",
    "khoa hoc",
    "cong nghe",
    "tin hoc",
    "tham mi",
    "the chat",
    "am nhac",
    "mi thuat",
    "muc dat duoc",
    "diem ktdk",
    "hoan thanh xuat sac",
    "hoan thanh tot",
    "hoan thanh",
    "chua hoan thanh",
    "cuoi nam",
    "khen dot xuat",
    "chua duoc len lop"
  ]);

  const merges = worksheet["!merges"] || [];

  const allCells = headerRows.flatMap(
    (row) => row.cells || []
  );

  const getCellAt = (row, col) => {
    return allCells.find((cell) => {
      const cellStartCol = cell.excelCol;
      const cellEndCol =
        cellStartCol + (cell.colSpan || 1) - 1;

      const cellStartRow = cell.excelRow;
      const cellEndRow =
        cellStartRow + (cell.rowSpan || 1) - 1;

      return (
        row >= cellStartRow &&
        row <= cellEndRow &&
        col >= cellStartCol &&
        col <= cellEndCol
      );
    });
  };

  const getPathForColumn = (col) => {
    const path = [];

    for (
      let row = headerRows[0].excelRow;
      row <= headerRows[headerRows.length - 1].excelRow;
      row++
    ) {
      const cell = getCellAt(row, col);

      if (
        cell?.value &&
        !path.some((item) => item.id === cell.id)
      ) {
        path.push(cell);
      }
    }

    return path;
  };

  const isSubjectGroup = (path) => {
    return path.some((cell) => {
      const value = normalizeText(cell.value);

      return (
        value.includes("mon hoc va hoat dong giao duc") ||
        value === "mon hoc" ||
        value === "hoat dong giao duc"
      );
    });
  };

  const isQualityOrCompetency = (path) => {
    return path.some((cell) =>
      targetHeaders.has(normalizeText(cell.value))
    );
  };

  // Tìm các nhóm tiêu đề môn học dựa trên ô gộp
  const subjectGroups = [];

  merges.forEach((merge) => {
    if (
      merge.s.r < headerRows[0].excelRow ||
      merge.s.r >= headerRows[headerRows.length - 1].excelRow
    ) {
      return;
    }

    if (merge.e.c <= merge.s.c) {
      return;
    }

    const value = normalizeText(
      getCellValue(
        worksheet,
        merge.s.r,
        merge.s.c
      )
    );

    if (!value) return;

    const isParentSubject =
      !value.includes("diem ktdk") &&
      !value.includes("dat duoc") &&
      !value.includes("muc dat duoc") &&
      !value.includes("mon hoc va hoat dong giao duc");

    if (!isParentSubject) return;

    const groupPath = getPathForColumn(merge.s.c);

    if (!isSubjectGroup(groupPath)) return;

    subjectGroups.push({
      startCol: merge.s.c,
      endCol: merge.e.c,
      headerCell: allCells.find(
        (cell) =>
          cell.excelRow === merge.s.r &&
          cell.excelCol === merge.s.c
      ),
      label: value
    });
  });

  // Xử lý từng cột trong bảng
  for (
    let col = range.s.c + 2;
    col <= range.e.c;
    col++
  ) {
    const path = getPathForColumn(col);

    // ------------------------------------------
    // PHẨM CHẤT VÀ NĂNG LỰC
    // ------------------------------------------

    if (isQualityOrCompetency(path)) {
      const targetCell = [...path]
        .reverse()
        .find((cell) => {
          const value = normalizeText(cell.value);

          return (
            targetHeaders.has(value) &&
            (cell.colSpan || 1) === 1
          );
        });

      if (targetCell) {
        rotatedIds.add(targetCell.id);
      }

      continue;
    }

    // ------------------------------------------
    // MÔN HỌC CHỈ CÓ NHẬN XÉT
    // ------------------------------------------

    if (!isSubjectGroup(path)) {
      continue;
    }

    const group = subjectGroups.find(
      (item) =>
        col >= item.startCol &&
        col <= item.endCol
    );

    if (!group || !group.headerCell) {
      continue;
    }

    const hasKTDK = allCells.some((cell) => {
      const value = normalizeText(cell.value);

      if (!value.includes("diem ktdk")) {
        return false;
      }

      const start = cell.excelCol;
      const end =
        start + (cell.colSpan || 1) - 1;

      return (
        start >= group.startCol &&
        end <= group.endCol
      );
    });

    if (!hasKTDK) {
      rotatedIds.add(group.headerCell.id);
    }
  }

  // Bổ sung trường hợp tiêu đề môn không nằm trong ô gộp ngang:
  // lấy tiêu đề môn có nhánh con nhận xét nhưng không có Điểm KTĐK.
  const candidateCells = allCells.filter((cell) => {
    const value = normalizeText(cell.value);

    return (
      cell.colSpan === 1 &&
      value &&
      !value.includes("diem ktdk") &&
      !value.includes("dat duoc") &&
      !value.includes("muc dat duoc") &&
      !value.includes("mon hoc va hoat dong giao duc") &&
      cell.excelCol > range.s.c + 1
    );
  });

  candidateCells.forEach((cell) => {
    const path = getPathForColumn(cell.excelCol);

    if (!isSubjectGroup(path)) return;

    const isAlreadyRotated = rotatedIds.has(cell.id);
    if (isAlreadyRotated) return;

    // Chỉ xét ô tiêu đề môn nằm ở tầng trên cùng của nhánh
    // và không có Điểm KTĐK trong cùng nhánh cột.
    const hasKTDKBelow = allCells.some((child) => {
      const childValue = normalizeText(child.value);

      if (!childValue.includes("diem ktdk")) {
        return false;
      }

      return (
        child.excelCol === cell.excelCol ||
        (
          child.excelCol >= cell.excelCol &&
          child.excelCol <
            cell.excelCol + (cell.colSpan || 1)
        )
      );
    });

    if (!hasKTDKBelow) {
      const isLeafTarget = path.some(
        (item) => item.id === cell.id
      );

      if (isLeafTarget && cell.rowSpan > 1) {
        rotatedIds.add(cell.id);
      }
    }
  });

  return rotatedIds;
};
