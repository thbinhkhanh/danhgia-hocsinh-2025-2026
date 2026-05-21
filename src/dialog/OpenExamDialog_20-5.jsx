// src/dialog/OpenExamDialog.jsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useConfig } from "../context/ConfigContext";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

/* ===================== FORMAT TITLE ===================== */

// Format tên đề KTĐK
const formatExamTitle = (examName = "") => {
  if (!examName) return "";
  let name = examName.startsWith("quiz_") ? examName.slice(5) : examName;
  const parts = name.split("_");

  const classPart = parts.find((p) => p.toLowerCase().includes("lớp")) || "";
  const classNumber = classPart.match(/\d+/)?.[0] || "";
  const classIndex = parts.indexOf(classPart);
  const { config } = useConfig();
    

  let subjectPart = "";
  for (let i = classIndex + 1; i < parts.length; i++) {
    const p = parts[i];
    if (
      !p.toLowerCase().includes("cki") &&
      !p.toLowerCase().includes("cn") &&
      !/\d{2}-\d{2}/.test(p)
    ) {
      subjectPart = p;
      break;
    }
  }

  let extraPart = "";
  for (let i = classIndex + 1; i < parts.length; i++) {
    const p = parts[i];
    if (p.toLowerCase().includes("cki") || p.toLowerCase() === "cn") {
      extraPart = p.toUpperCase();
      break;
    }
  }

  const match = examName.match(/\(([^)]+)\)/);
  const examLetter = match ? match[1] : "";

  return `${subjectPart} ${classNumber}${
    extraPart ? ` - ${extraPart}` : ""
  } ${examLetter ? `(${examLetter})` : ""}`.trim();
};

// Format tên đề Bài tập tuần
const formatBtTitle = (examName = "") => {
  if (!examName) return "";
  let name = examName.startsWith("quiz_") ? examName.slice(5) : examName;
  const parts = name.split("_");

  const classPart = parts.find((p) => p.toLowerCase().includes("lớp")) || "";
  const classNumber = classPart.match(/\d+/)?.[0] || "";
  const subjectPart =
    parts.find((p) => !p.toLowerCase().includes("lớp") && !/\d+/.test(p)) ||
    "";
  const weekNumber = parts[parts.length - 1];

  const shortSubject =
    subjectPart.toLowerCase().includes("công") ||
    subjectPart.toLowerCase().includes("cong")
      ? "CN"
      : "TH";

  return `${shortSubject} (tuần ${weekNumber})`;
};

// Lấy năm học từ ID
const getExamYearFromId = (examId) => {
  const match = examId.match(/(\d{2}-\d{2})/);
  if (!match) return "";
  const [y1, y2] = match[1].split("-");
  return `20${y1}-20${y2}`;
};

// Check collection theo loại đề
const isDocMatchType = (doc, type) => {
  if (type === "bt") return doc.collection === "BAITAP_TUAN";
  if (type === "ktdk") return doc.collection === "NGANHANG_DE";
  if (type === "luyentap") return doc.collection?.startsWith("TRACNGHIEM");
  return false;
};

// Lấy lớp từ collection luyện tập: TRACNGHIEM3 → Lớp 3
const getClassFromLuyenTapCollection = (collection = "") => {
  const match = collection.match(/TRACNGHIEM(\d+)/);
  return match ? `Lớp ${match[1]}` : "";
};

/* ===================== COMPONENT ===================== */

const OpenExamDialog = ({
  open,
  onClose,
  dialogExamType,
  setDialogExamType,
  filterClass,
  setFilterClass,
  filterYear,
  setFilterYear,
  classes,
  loadingList,
  docList,
  selectedDoc,
  setSelectedDoc,
  handleOpenSelectedDoc,
  handleDeleteSelectedDoc,
  fetchQuizList,
}) => {


  const { config } = useConfig();
  const [filterSubject, setFilterSubject] = React.useState("tin"); // ✅ đúng chỗ

  React.useEffect(() => {
    if (config?.namHoc) {
      setFilterYear(config.namHoc);
    }
  }, [config?.namHoc]);
  
  const years = [
    "2025-2026",
    "2026-2027",
    "2027-2028",
    "2028-2029",
    "2029-2030",
  ];

  // ===== DIALOG =====
return (
  <>
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          height: "84vh",
          borderRadius: "16px",
          overflow: "hidden",
          background: "#f8fafc",
          boxShadow: "0 10px 35px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* ================= HEADER ================= */}
      <Box
        sx={{
          px: 3,
          py: 1.6,
          background: "#1976d2",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              Danh sách đề kiểm tra
            </Typography>

            <Typography
              sx={{
                fontSize: 13,
                opacity: 0.9,
                mt: 0.3,
              }}
            >
              Quản lý và mở đề nhanh chóng
            </Typography>
          </Box>

          <IconButton
            onClick={onClose}
            sx={{
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.12)",

              "&:hover": {
                bgcolor: "rgba(255,255,255,0.22)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* ================= FILTER ================= */}
      <Box
        sx={{
          px: 3,
          pt: 2.5,
          pb: 2,
          flexShrink: 0,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            flexWrap="wrap"
          >
            {/* LOẠI ĐỀ */}
            <FormControl
              size="small"
              sx={{ minWidth: 160 }}
            >
              <InputLabel>Loại đề</InputLabel>

              <Select
                value={dialogExamType}
                label="Loại đề"
                onChange={(e) => {
                  const type = e.target.value;
                  setDialogExamType(type);
                  fetchQuizList(
                    type,
                    filterYear,
                    filterClass
                  );
                }}
                sx={{
                  bgcolor: "#fff",
                  borderRadius: "5px",

                  "& .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "#dbe2ea",
                    },

                  "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "#1976d2",
                      borderWidth: 2,
                    },
                }}
              >
                <MenuItem value="bt">
                  Bài tập tuần
                </MenuItem>

                <MenuItem value="ktdk">
                  KTĐK
                </MenuItem>

                <MenuItem value="luyentap">
                  Luyện tập
                </MenuItem>
              </Select>
            </FormControl>

            {/* LỚP */}
            <FormControl
              size="small"
              sx={{ minWidth: 120 }}
            >
              <InputLabel>Lớp</InputLabel>

              <Select
                value={filterClass}
                label="Lớp"
                onChange={(e) => {
                  const newClass =
                    e.target.value;

                  setFilterClass(newClass);

                  fetchQuizList(
                    dialogExamType,
                    filterYear,
                    newClass
                  );
                }}
                sx={{
                  bgcolor: "#fff",
                  borderRadius: "5px",

                  "& .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "#dbe2ea",
                    },

                  "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "#1976d2",
                      borderWidth: 2,
                    },
                }}
              >
                {classes
                  .filter((lop) => {
                    const n = parseInt(
                      lop.replace(/\D/g, "")
                    );

                    return n >= 3 && n <= 5;
                  })
                  .map((lop) => (
                    <MenuItem
                      key={lop}
                      value={lop}
                    >
                      {lop}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* NĂM HỌC */}
            {(dialogExamType === "ktdk" ||
              dialogExamType ===
                "luyentap") && (
              <FormControl
                size="small"
                sx={{ minWidth: 150 }}
              >
                <InputLabel>
                  Năm học
                </InputLabel>

                <Select
                  value={filterYear}
                  label="Năm học"
                  onChange={(e) => {
                    const newYear =
                      e.target.value;

                    setFilterYear(newYear);

                    fetchQuizList(
                      dialogExamType,
                      newYear,
                      filterClass
                    );
                  }}
                  sx={{
                    bgcolor: "#fff",
                    borderRadius: "5px",

                    "& .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor:
                          "#dbe2ea",
                      },

                    "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor:
                          "#1976d2",
                        borderWidth: 2,
                      },
                  }}
                >
                  {years.map((y) => (
                    <MenuItem
                      key={y}
                      value={y}
                    >
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* MÔN */}
            {dialogExamType === "bt" && (
              <FormControl
                size="small"
                sx={{ minWidth: 120 }}
              >
                <InputLabel>Môn</InputLabel>

                <Select
                  value={
                    filterSubject || "all"
                  }
                  label="Môn"
                  onChange={(e) =>
                    setFilterSubject(
                      e.target.value
                    )
                  }
                  sx={{
                    bgcolor: "#fff",
                    borderRadius: "5px",

                    "& .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor:
                          "#dbe2ea",
                      },

                    "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor:
                          "#1976d2",
                        borderWidth: 2,
                      },
                  }}
                >
                  <MenuItem value="all">
                    Tất cả
                  </MenuItem>

                  <MenuItem value="tin">
                    Tin học
                  </MenuItem>

                  <MenuItem value="congnghe">
                    Công nghệ
                  </MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>

          {/* CHIP */}
          <Chip
            label={`${docList.length} đề`}
            sx={{
              bgcolor: "#e3f2fd",
              color: "#1976d2",
              fontWeight: 700,
              borderRadius: "5px",
            }}
          />
        </Stack>
      </Box>

      {/* ================= CONTENT ================= */}
      <DialogContent
        sx={{
          flex: 1,
          overflow: "hidden",
          px: 3,
          pt: 0,
          pb: 2,
        }}
      >
        <Box
          sx={{
            height: "100%",
            overflowY: "auto",
            borderRadius: "5px",
            bgcolor: "#fff",
            border: "1px solid #e2e8f0",
            p: 1.2,

            "&::-webkit-scrollbar": {
              width: 6,
            },

            "&::-webkit-scrollbar-thumb":
              {
                background: "#cbd5e1",
                borderRadius: 999,
              },
          }}
        >
          {loadingList ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            (() => {
              const normalize = (
                s = ""
              ) =>
                s
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(
                    /[\u0300-\u036f]/g,
                    ""
                  );

              const getNumber = (
                text = ""
              ) => {
                const weekMatch =
                  text.match(
                    /tuần\s*(\d+)/i
                  );

                if (weekMatch)
                  return parseInt(
                    weekMatch[1],
                    10
                  );

                const baiMatch =
                  text.match(
                    /bài\s*(\d+)/i
                  );

                if (baiMatch)
                  return parseInt(
                    baiMatch[1],
                    10
                  );

                const any =
                  text.match(/\d+/);

                return any
                  ? parseInt(any[0], 10)
                  : 9999;
              };

              const getGroup = (t) => {
                if (
                  t.includes("bai") ||
                  t.includes("tuan")
                )
                  return 1;

                if (
                  t.includes(
                    "on tap hoc ki"
                  )
                )
                  return 2;

                if (
                  t.includes(
                    "on tap cuoi nam"
                  )
                )
                  return 3;

                return 4;
              };

              const filteredDocs =
                docList
                  .filter((doc) =>
                    isDocMatchType(
                      doc,
                      dialogExamType
                    )
                  )

                  .filter((doc) => {
                    if (
                      dialogExamType ===
                      "luyentap"
                    ) {
                      return (
                        getClassFromLuyenTapCollection(
                          doc.collection
                        ) === filterClass
                      );
                    }

                    return (
                      doc.class ===
                      filterClass
                    );
                  })

                  .filter((doc) => {
                    if (
                      dialogExamType !==
                      "ktdk"
                    )
                      return true;

                    return (
                      getExamYearFromId(
                        doc.id
                      ) === filterYear
                    );
                  })

                  .filter((doc) => {
                    if (
                      dialogExamType !==
                      "bt"
                    )
                      return true;

                    if (
                      !filterSubject ||
                      filterSubject ===
                        "all"
                    )
                      return true;

                    const subject = (
                      doc.subject ||
                      doc.mon ||
                      ""
                    ).toLowerCase();

                    if (
                      filterSubject ===
                      "tin"
                    )
                      return subject.includes(
                        "tin"
                      );

                    if (
                      filterSubject ===
                      "congnghe"
                    )
                      return (
                        subject.includes(
                          "công"
                        ) ||
                        subject.includes(
                          "cong"
                        )
                      );

                    return true;
                  })

                  .sort((a, b) => {
                    const titleA =
                      dialogExamType ===
                      "ktdk"
                        ? formatExamTitle(
                            a.id
                          )
                        : dialogExamType ===
                          "bt"
                        ? formatBtTitle(
                            a.id
                          )
                        : a.id;

                    const titleB =
                      dialogExamType ===
                      "ktdk"
                        ? formatExamTitle(
                            b.id
                          )
                        : dialogExamType ===
                          "bt"
                        ? formatBtTitle(
                            b.id
                          )
                        : b.id;

                    const tA =
                      normalize(titleA);

                    const tB =
                      normalize(titleB);

                    const groupA =
                      getGroup(tA);

                    const groupB =
                      getGroup(tB);

                    if (
                      groupA !== groupB
                    )
                      return (
                        groupA - groupB
                      );

                    return (
                      getNumber(titleA) -
                      getNumber(titleB)
                    );
                  });

              if (
                filteredDocs.length === 0
              ) {
                return (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      flexDirection:
                        "column",
                      color: "#94a3b8",
                    }}
                  >
                    <DescriptionOutlinedIcon
                      sx={{
                        fontSize: 52,
                        mb: 1,
                        opacity: 0.5,
                      }}
                    />

                    <Typography
                      sx={{
                        fontWeight: 600,
                      }}
                    >
                      Không có đề nào
                    </Typography>
                  </Box>
                );
              }

              return (
                <Stack spacing={1}>
                  {filteredDocs.map(
                    (doc) => {
                      const isSelected =
                        selectedDoc ===
                        doc.id;

                      return (
                        <Box
                          key={doc.id}
                          onClick={() =>
                            setSelectedDoc(
                              doc.id
                            )
                          }
                          onDoubleClick={() =>
                            handleOpenSelectedDoc(
                              doc.id
                            )
                          }
                          sx={{
                            p: 1.6,
                            borderRadius:
                              "5px",

                            cursor:
                              "pointer",

                            transition:
                              ".18s",

                            border:
                              isSelected
                                ? "2px solid #1976d2"
                                : "1px solid #e2e8f0",

                            bgcolor:
                              isSelected
                                ? "#f0f7ff"
                                : "#fff",

                            "&:hover":
                              {
                                bgcolor:
                                  "#f8fbff",

                                borderColor:
                                  "#90caf9",
                              },
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1.5}
                          >
                            <Typography
                              sx={{
                                flex: 1,
                                fontSize: 15,
                                fontWeight: 500,
                                color:
                                  "#1e293b",

                                lineHeight: 1.5,
                              }}
                            >
                              {dialogExamType ===
                                "ktdk" &&
                                formatExamTitle(
                                  doc.id
                                )}

                              {dialogExamType ===
                                "bt" &&
                                formatBtTitle(
                                  doc.id
                                )}

                              {dialogExamType ===
                                "luyentap" &&
                                doc.id}
                            </Typography>

                            {/* RADIO */}
                            <Box
                              sx={{
                                width: 18,
                                height: 18,
                                borderRadius:
                                  "50%",

                                border:
                                  isSelected
                                    ? "5px solid #1976d2"
                                    : "2px solid #cbd5e1",

                                transition:
                                  ".2s",

                                flexShrink: 0,
                              }}
                            />
                          </Stack>
                        </Box>
                      );
                    }
                  )}
                </Stack>
              );
            })()
          )}
        </Box>
      </DialogContent>

      {/* ================= FOOTER ================= */}
      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 1,
          justifyContent:
            "space-between",
          flexShrink: 0,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            textTransform: "none",
            color: "#64748b",
            fontWeight: 600,
          }}
        >
          Đóng
        </Button>

        <Stack
          direction="row"
          spacing={1.5}
        >
          <Button
            variant="outlined"
            color="error"
            disabled={!selectedDoc}
            onClick={
              handleDeleteSelectedDoc
            }
            startIcon={
              <DeleteOutlineIcon />
            }
            sx={{
              textTransform: "none",
              borderRadius: "12px",
              px: 2.5,
              fontWeight: 700,
            }}
          >
            Xóa đề
          </Button>

          <Button
            variant="contained"
            disabled={!selectedDoc}
            onClick={() =>
              handleOpenSelectedDoc(
                selectedDoc
              )
            }
            sx={{
              textTransform: "none",
              borderRadius: "12px",
              px: 3,
              fontWeight: 700,
              boxShadow: "none",
            }}
          >
            Mở đề
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  </>
);
};

export default OpenExamDialog;
