
import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Stack,
  Select,
  MenuItem,
  FormControl,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import DescriptionIcon from "@mui/icons-material/Description";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import TuneIcon from "@mui/icons-material/Tune";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import LayersIcon from "@mui/icons-material/Layers";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";

export default function PrintOptionsDialogModal({
  isOpen,
  onClose,
  onConfirmPrint,
}) {
  const [printer, setPrinter] = useState("Brother HL-L2360D series");
  const [printContent, setPrintContent] = useState("current");
  const [confirmPrincipal, setConfirmPrincipal] = useState(true);
  const [confirmParent, setConfirmParent] = useState(true);
  const [pageRange, setPageRange] = useState("all");
  const [customPageText, setCustomPageText] = useState("");
  const [repeatHeader, setRepeatHeader] = useState(true);
  const [copies, setCopies] = useState(1);

  const printers = [
    "Brother HL-L2360D series",
    "Canon LBP2900",
    "HP LaserJet Pro M404dn",
    "Microsoft Print to PDF",
  ];

  const handleDecrement = () => {
    setCopies((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleIncrement = () => {
    setCopies((prev) => (prev < 999 ? prev + 1 : 999));
  };

  const handleCopiesInput = (e) => {
    const val = parseInt(e.target.value, 10);

    if (isNaN(val) || val < 1) {
      setCopies(1);
    } else if (val > 999) {
      setCopies(999);
    } else {
      setCopies(val);
    }
  };

  // ==========================================
  // XỬ LÝ NÚT IN
  // ==========================================
  const handlePrintSubmit = () => {
    const printOptions = {
      printer,
      printContent,
      confirmPrincipal,
      confirmParent,
      pageRange,
      customPageText,
      repeatHeader,
      copies,
    };

    // Đóng cửa sổ tùy chọn in
    onClose();

    // Gọi hàm in từ component cha
    if (typeof onConfirmPrint === "function") {
      onConfirmPrint(printOptions);
    }
  };

  const primaryColor = "#03396c";
  const accentBlue = "#1d63dc";

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "14px",
          overflow: "hidden",
          background: "#f1f5f9",
          boxShadow: "0 20px 50px rgba(3,57,108,0.22)",
          border: "1px solid rgba(203, 213, 225, 0.8)",
        },
      }}
      className="print:hidden"
    >
      {/* HEADER */}
      <Box
        sx={{
          px: 2.5,
          py: 1.8,
          background: primaryColor,
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <PrintIcon sx={{ fontSize: 24 }} />

          <Box
            sx={{
              height: 20,
              width: "1.5px",
              bgcolor: "rgba(255,255,255,0.4)",
            }}
          />

          <Typography
            sx={{
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            TÙY CHỌN IN
          </Typography>
        </Box>

        <IconButton
          onClick={onClose}
          sx={{
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.1)",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.2)",
            },
            borderRadius: "8px",
            p: 1,
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* CONTENT */}
      <DialogContent
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* CARD 1 */}
        <Box
          sx={{
            bgcolor: "#fff",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            p: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mb: 2,
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                bgcolor: accentBlue,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PrintIcon sx={{ fontSize: 16 }} />
            </Box>

            <Box
              sx={{
                height: 16,
                width: "1.5px",
                bgcolor: accentBlue,
              }}
            />

            <Typography
              sx={{
                color: accentBlue,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 0.5,
              }}
            >
              THIẾT LẬP NỘI DUNG IN VÀ MÁY IN
            </Typography>

            <Box
              sx={{
                flex: 1,
                height: "1px",
                bgcolor: "#e2e8f0",
                ml: 1,
              }}
            />
          </Box>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
          >
            {/* MÁY IN */}
            <Box
              sx={{
                flex: 1,
                pr: { md: 2 },
                borderRight: { md: "1px solid #e2e8f0" },
              }}
            >
              <Box
                sx={{
                  bgcolor: "#e2ecfb",
                  px: 1.5,
                  py: 0.8,
                  borderRadius: "5px",
                  mb: 1.5,
                }}
              >
                <Typography
                  sx={{
                    color: "#1554c0",
                    fontWeight: 700,
                    fontSize: "11.5px",
                    letterSpacing: 0.5,
                  }}
                >
                  MÁY IN
                </Typography>
              </Box>

              <FormControl fullWidth size="small">
                <Select
                  value={printer}
                  onChange={(e) => setPrinter(e.target.value)}
                  sx={{
                    borderRadius: "6px",
                    bgcolor: "#fff",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    color: "#1e293b",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#cbd5e1",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#94a3b8",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: accentBlue,
                    },
                  }}
                >
                  {printers.map((item) => (
                    <MenuItem
                      key={item}
                      value={item}
                      sx={{ fontSize: "13.5px" }}
                    >
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* NỘI DUNG IN */}
            <Box
              sx={{
                flex: 1,
                pl: { md: 1 },
              }}
            >
              <Box
                sx={{
                  bgcolor: "#e2ecfb",
                  px: 1.5,
                  py: 0.8,
                  borderRadius: "5px",
                  mb: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <DescriptionIcon
                  sx={{ fontSize: 16, color: "#1554c0" }}
                />

                <Typography
                  sx={{
                    color: "#1554c0",
                    fontWeight: 700,
                    fontSize: "11.5px",
                    letterSpacing: 0.5,
                  }}
                >
                  NỘI DUNG IN
                </Typography>
              </Box>

              <Stack spacing={0.5}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={printContent === "current"}
                      onChange={() => setPrintContent("current")}
                      sx={{
                        color: "#cbd5e1",
                        "&.Mui-checked": {
                          color: accentBlue,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontSize: "13.5px",
                        color: "#1e293b",
                      }}
                    >
                      In Phiếu liên lạc hiện tại
                    </Typography>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={printContent === "all_class"}
                      onChange={() => setPrintContent("all_class")}
                      sx={{
                        color: "#cbd5e1",
                        "&.Mui-checked": {
                          color: accentBlue,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontSize: "13.5px",
                        color: "#1e293b",
                      }}
                    >
                      In Phiếu liên lạc cả lớp
                    </Typography>
                  }
                />
              </Stack>
            </Box>
          </Stack>

          {/* PHẦN XÁC NHẬN */}
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                bgcolor: "#e2ecfb",
                px: 1.5,
                py: 0.8,
                borderRadius: "5px",
                mb: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <VerifiedUserIcon
                sx={{ fontSize: 16, color: accentBlue }}
              />

              <Typography
                sx={{
                  color: "#1554c0",
                  fontWeight: 700,
                  fontSize: "11.5px",
                  letterSpacing: 0.5,
                }}
              >
                PHẦN XÁC NHẬN
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={confirmPrincipal}
                    onChange={(e) =>
                      setConfirmPrincipal(e.target.checked)
                    }
                    sx={{
                      color: "#cbd5e1",
                      "&.Mui-checked": {
                        color: accentBlue,
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontSize: "13.5px",
                      color: "#1e293b",
                    }}
                  >
                    In phần xác nhận của Hiệu trưởng
                  </Typography>
                }
                sx={{ flex: 1, m: 0 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={confirmParent}
                    onChange={(e) =>
                      setConfirmParent(e.target.checked)
                    }
                    sx={{
                      color: "#cbd5e1",
                      "&.Mui-checked": {
                        color: accentBlue,
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontSize: "13.5px",
                      color: "#1e293b",
                    }}
                  >
                    In phần xác nhận của Phụ huynh
                  </Typography>
                }
                sx={{ flex: 1, m: 0 }}
              />
            </Stack>
          </Box>
        </Box>

        {/* CARD 2 */}
        <Box
          sx={{
            bgcolor: "#fff",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            p: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mb: 2,
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                bgcolor: accentBlue,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TuneIcon sx={{ fontSize: 16 }} />
            </Box>

            <Box
              sx={{
                height: 16,
                width: "1.5px",
                bgcolor: accentBlue,
              }}
            />

            <Typography
              sx={{
                color: accentBlue,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 0.5,
              }}
            >
              THIẾT LẬP TRANG IN VÀ SỐ BẢN IN
            </Typography>

            <Box
              sx={{
                flex: 1,
                height: "1px",
                bgcolor: "#e2e8f0",
                ml: 1,
              }}
            />
          </Box>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
          >
            {/* TRANG IN */}
            <Box
              sx={{
                flex: 1,
                pr: { md: 2 },
                borderRight: { md: "1px solid #e2e8f0" },
              }}
            >
              <Box
                sx={{
                  bgcolor: "#e2ecfb",
                  px: 1.5,
                  py: 0.8,
                  borderRadius: "5px",
                  mb: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <DescriptionOutlinedIcon
                  sx={{ fontSize: 16, color: "#1554c0" }}
                />

                <Typography
                  sx={{
                    color: "#1554c0",
                    fontWeight: 700,
                    fontSize: "11.5px",
                    letterSpacing: 0.5,
                  }}
                >
                  TRANG IN
                </Typography>
              </Box>

              <Stack spacing={1.5}>
                <FormControl fullWidth size="small">
                  <Select
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    sx={{
                      borderRadius: "6px",
                      bgcolor: "#fff",
                      fontSize: "13.5px",
                      color: "#1e293b",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#cbd5e1",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#94a3b8",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: accentBlue,
                      },
                    }}
                  >
                    <MenuItem value="all" sx={{ fontSize: "13.5px" }}>
                      Tất cả các trang
                    </MenuItem>

                    <MenuItem value="current" sx={{ fontSize: "13.5px" }}>
                      Trang hiện tại
                    </MenuItem>

                    <MenuItem value="custom" sx={{ fontSize: "13.5px" }}>
                      Tùy chọn trang...
                    </MenuItem>
                  </Select>
                </FormControl>

                {pageRange === "custom" && (
                  <Box
                    component="input"
                    type="text"
                    placeholder="Ví dụ: 1-3, 5"
                    value={customPageText}
                    onChange={(e) =>
                      setCustomPageText(e.target.value)
                    }
                    sx={{
                      width: "100%",
                      bgcolor: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      px: 1.5,
                      py: 1,
                      fontSize: "13px",
                      outline: "none",
                      "&:focus": {
                        borderColor: accentBlue,
                      },
                    }}
                  />
                )}

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={repeatHeader}
                      onChange={(e) =>
                        setRepeatHeader(e.target.checked)
                      }
                      sx={{
                        color: "#cbd5e1",
                        "&.Mui-checked": {
                          color: accentBlue,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontSize: "13.5px",
                        color: "#1e293b",
                      }}
                    >
                      In lặp lại tiêu đề
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </Stack>
            </Box>

            {/* SỐ BẢN IN */}
            <Box
              sx={{
                flex: 1,
                pl: { md: 1 },
              }}
            >
              <Box
                sx={{
                  bgcolor: "#e2ecfb",
                  px: 1.5,
                  py: 0.8,
                  borderRadius: "5px",
                  mb: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <LayersIcon
                  sx={{ fontSize: 16, color: "#1554c0" }}
                />

                <Typography
                  sx={{
                    color: "#1554c0",
                    fontWeight: 700,
                    fontSize: "11.5px",
                    letterSpacing: 0.5,
                  }}
                >
                  SỐ BẢN IN
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "stretch",
                  height: 38,
                  borderRadius: "7px",
                  border: "1px solid #cbd5e1",
                  bgcolor: "#fff",
                  overflow: "hidden",
                }}
              >
                <Button
                  onClick={handleDecrement}
                  disabled={copies <= 1}
                  sx={{
                    minWidth: 44,
                    bgcolor: "#e8eef7",
                    borderRadius: 0,
                    borderRight: "1px solid #cbd5e1",
                    color: "#1e3a8a",
                    "&:hover": {
                      bgcolor: "#dce5f4",
                    },
                    "&.Mui-disabled": {
                      opacity: 0.5,
                    },
                  }}
                >
                  <RemoveIcon fontSize="small" />
                </Button>

                <Box
                  component="input"
                  type="number"
                  min={1}
                  max={999}
                  value={copies}
                  onChange={handleCopiesInput}
                  sx={{
                    width: 60,
                    textAlign: "center",
                    color: accentBlue,
                    fontWeight: 700,
                    fontSize: "16px",
                    border: "none",
                    outline: "none",
                    bgcolor: "#fff",
                    "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
                      WebkitAppearance: "none",
                      margin: 0,
                    },
                  }}
                />

                <Button
                  onClick={handleIncrement}
                  sx={{
                    minWidth: 44,
                    bgcolor: "#e8eef7",
                    borderRadius: 0,
                    borderLeft: "1px solid #cbd5e1",
                    color: "#1e3a8a",
                    "&:hover": {
                      bgcolor: "#dce5f4",
                    },
                  }}
                >
                  <AddIcon fontSize="small" />
                </Button>
              </Box>
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      {/* ACTIONS */}
      <Box
        sx={{
          px: 3,
          pb: 2.5,
          pt: 1,
          bgcolor: "#f1f5f9",
          display: "flex",
          justifyContent: "flex-end",
          gap: 1.5,
        }}
      >
        <Button
          onClick={handlePrintSubmit}
          variant="contained"
          startIcon={<PrintIcon />}
          sx={{
            minWidth: 122,
            height: 38,
            borderRadius: "7px",
            textTransform: "none",
            fontWeight: 700,
            fontSize: "13.5px",
            bgcolor: accentBlue,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            "&:hover": {
              bgcolor: "#1752b8",
            },
          }}
        >
          IN
        </Button>

        <Button
          onClick={onClose}
          variant="outlined"
          startIcon={<CloseIcon />}
          sx={{
            minWidth: 106,
            height: 38,
            borderRadius: "7px",
            textTransform: "none",
            fontWeight: 700,
            fontSize: "13.5px",
            borderColor: "#cbd5e1",
            color: "#1e293b",
            bgcolor: "#dce2ec",
            "&:hover": {
              bgcolor: "#cfd7e4",
              borderColor: "#94a3b8",
            },
          }}
        >
          HỦY
        </Button>
      </Box>
    </Dialog>
  );
}
