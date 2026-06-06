import React, { useState } from "react";

import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Stack,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Snackbar,
  Alert,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";

import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const ChangePasswordDialog = ({
  open,
  onClose,
}) => {
  const [newPw, setNewPw] =
    useState("");

  const [confirmPw, setConfirmPw] =
    useState("");

  const [pwError, setPwError] =
    useState("");

  const [showPw, setShowPw] =
    useState(false);

  const [showConfirmPw, setShowConfirmPw] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [snackbar, setSnackbar] =
    useState({
      open: false,
      message: "",
      severity: "success",
    });

  const resetState = () => {
    setNewPw("");
    setConfirmPw("");
    setPwError("");
    setSaving(false);
    setSuccess(false);
    setShowPw(false);
    setShowConfirmPw(false);
  };

  const handleClose = () => {
    if (saving) return;

    resetState();
    onClose();
  };

  const handleChangePassword =
    async () => {
      if (!newPw || !confirmPw) {
        setPwError(
          "Vui lòng nhập đầy đủ thông tin"
        );
        return;
      }

      if (newPw !== confirmPw) {
        setPwError(
          "Mật khẩu xác nhận không khớp"
        );
        return;
      }

      try {
        setSaving(true);
        setPwError("");

        await setDoc(
          doc(db, "MATKHAU", "ADMIN"),
          { pass: newPw },
          { merge: true }
        );

        setSuccess(true);

        setSnackbar({
          open: true,
          message:
            "Đổi mật khẩu thành công",
          severity: "success",
        });
      } catch (err) {
        console.error(
          "Lỗi lưu mật khẩu:",
          err
        );

        setSnackbar({
          open: true,
          message:
            "Có lỗi khi cập nhật mật khẩu",
          severity: "error",
        });
      } finally {
        setSaving(false);
      }
    };

  return (
    <>
      <Dialog
        open={open}
        onClose={(event, reason) => {
          if (saving) return;

          if (
            reason ===
              "backdropClick" ||
            reason ===
              "escapeKeyDown"
          )
            return;

          handleClose();
        }}
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "8px",
            overflow: "hidden",
            background: "#f8fafc",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.18)",
          },
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            px: 3,
            py: 2,
            color: "#fff",
            background:
              "linear-gradient(135deg, #1976d2, #42a5f5)",
            position: "relative",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                bgcolor: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "0 2px 6px rgba(0,0,0,0.15)",
              }}
            >
              <LockRoundedIcon
                sx={{
                  fontSize: 18,
                  color: "#1976d2",
                }}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Đổi mật khẩu
              </Typography>

              <Typography
                sx={{
                  fontSize: 12.5,
                  opacity: 0.9,
                }}
              >
                Cập nhật mật khẩu quản trị
              </Typography>
            </Box>
          </Stack>

          <IconButton
            onClick={handleClose}
            disabled={saving}
            sx={{
              position: "absolute",
              right: 10,
              top: 10,
              color: "#fff",
              bgcolor:
                "rgba(255,255,255,0.15)",

              "&:hover": {
                bgcolor:
                  "rgba(255,255,255,0.25)",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* CONTENT */}
        <DialogContent
          sx={{
            px: 3,
            py: 4,
          }}
        >
          <Stack spacing={2.2}>
            {!success && (
              <>
                <TextField
                  label="Mật khẩu mới"
                  type={
                    showPw
                      ? "text"
                      : "password"
                  }
                  fullWidth
                  size="small"
                  value={newPw}
                  onChange={(e) =>
                    setNewPw(
                      e.target.value
                    )
                  }
                  autoComplete="new-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={() =>
                            setShowPw(
                              !showPw
                            )
                          }
                        >
                          {showPw ? (
                            <VisibilityOffRoundedIcon fontSize="small" />
                          ) : (
                            <VisibilityRoundedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Nhập lại mật khẩu"
                  type={
                    showConfirmPw
                      ? "text"
                      : "password"
                  }
                  fullWidth
                  size="small"
                  value={confirmPw}
                  onChange={(e) =>
                    setConfirmPw(
                      e.target.value
                    )
                  }
                  autoComplete="new-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={() =>
                            setShowConfirmPw(
                              !showConfirmPw
                            )
                          }
                        >
                          {showConfirmPw ? (
                            <VisibilityOffRoundedIcon fontSize="small" />
                          ) : (
                            <VisibilityRoundedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {pwError && (
                  <Typography
                    sx={{
                      color: "#d32f2f",
                      fontSize: 13.5,
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    {pwError}
                  </Typography>
                )}
              </>
            )}

            {success && (
              <Box
                sx={{
                  textAlign: "center",
                  py: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#1976d2",
                    mb: 1,
                  }}
                >
                  Đổi mật khẩu thành công
                </Typography>

                <Typography
                  sx={{
                    color: "#64748b",
                    fontSize: 14,
                  }}
                >
                  Mật khẩu quản trị đã được
                  cập nhật
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>

        {/* ACTIONS */}
        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          sx={{ pb: 3 }}
        >
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={saving}
            sx={{
              minWidth: 110,
              height: 42,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            {success ? "Đóng" : "Hủy"}
          </Button>

          {!success && (
            <Button
              variant="contained"
              onClick={
                handleChangePassword
              }
              disabled={saving}
              sx={{
                minWidth: 130,
                height: 42,
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 700,
                background:
                  "linear-gradient(135deg, #1976d2, #42a5f5)",
                boxShadow:
                  "0 10px 20px rgba(25,118,210,0.25)",

                "&:hover": {
                  background:
                    "linear-gradient(135deg, #1565c0, #1976d2)",
                },
              }}
            >
              {saving
                ? "Đang lưu..."
                : "Xác nhận"}
            </Button>
          )}
        </Stack>
      </Dialog>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() =>
          setSnackbar((s) => ({
            ...s,
            open: false,
          }))
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ChangePasswordDialog;