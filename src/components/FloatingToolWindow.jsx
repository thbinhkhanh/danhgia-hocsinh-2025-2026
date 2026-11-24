
import React, { useRef, useState, useEffect } from "react";

import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  ThemeProvider,
  GlobalStyles,
  useTheme,
  createTheme,
} from "@mui/material";

import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseFullscreenRoundedIcon from "@mui/icons-material/CloseFullscreenRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

const FloatingToolWindow = ({
  id,
  title,
  children,
  onClose,
  onMinimize,
  onFocus,
  zIndex = 10,
  minimized = false,
  initialPosition = { x: 100, y: 80 },
}) => {
  const parentTheme = useTheme();

  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState({
    width: 640,
    height: 520,
  });

  const [maximized, setMaximized] = useState(false);

  const previousBounds = useRef(null);
  const dragData = useRef(null);
  const windowRef = useRef(null);

  // Theme riêng cho Dialog bên trong cửa sổ nổi
  const floatingTheme = React.useMemo(
    () =>
      createTheme({
        ...parentTheme,
        components: {
          ...parentTheme.components,
          MuiDialog: {
            ...parentTheme.components?.MuiDialog,
            defaultProps: {
              ...parentTheme.components?.MuiDialog?.defaultProps,
              disablePortal: true,
              hideBackdrop: true,
              disableEnforceFocus: true,
              disableAutoFocus: true,
              disableRestoreFocus: true,
            },
          },
          MuiModal: {
            ...parentTheme.components?.MuiModal,
            defaultProps: {
              ...parentTheme.components?.MuiModal?.defaultProps,
              disablePortal: true,
              hideBackdrop: true,
              disableEnforceFocus: true,
              disableAutoFocus: true,
              disableRestoreFocus: true,
            },
          },
        },
      }),
    [parentTheme]
  );

  // Đảm bảo cửa sổ không vượt ra ngoài màn hình khi thay đổi kích thước
  useEffect(() => {
    if (maximized) return;

    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.max(
          0,
          Math.min(prev.x, window.innerWidth - 100)
        ),
        y: Math.max(
          0,
          Math.min(prev.y, window.innerHeight - 60)
        ),
      }));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [maximized]);

  // Kéo cửa sổ
  const handleDragStart = (event) => {
  // Không kéo cửa sổ khi nhấn vào các nút điều khiển
  if (
    event.target.closest(
      "button, input, textarea, select, a, .MuiIconButton-root"
    )
  ) {
    return;
  }

  if (maximized) return;

  event.preventDefault();
  onFocus?.();

  dragData.current = {
    startX: event.clientX,
    startY: event.clientY,
    initialX: position.x,
    initialY: position.y,
  };

  event.currentTarget.setPointerCapture(event.pointerId);
};

  const handleDragMove = (event) => {
    if (!dragData.current || maximized) return;

    const dx = event.clientX - dragData.current.startX;
    const dy = event.clientY - dragData.current.startY;

    setPosition({
      x: Math.max(
        0,
        Math.min(
          dragData.current.initialX + dx,
          window.innerWidth - 100
        )
      ),
      y: Math.max(
        0,
        Math.min(
          dragData.current.initialY + dy,
          window.innerHeight - 60
        )
      ),
    });
  };

  const handleDragEnd = (event) => {
    dragData.current = null;

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Không cần xử lý nếu pointer đã được giải phóng
    }
  };

  // Phóng lớn / khôi phục cửa sổ
  const handleToggleMaximize = () => {
    if (!maximized) {
      previousBounds.current = {
        position: { ...position },
        size: { ...size },
      };

      setMaximized(true);
    } else {
      setMaximized(false);

      if (previousBounds.current) {
        setPosition(previousBounds.current.position);
        setSize(previousBounds.current.size);
      }
    }
  };

  // Tập trung cửa sổ khi thao tác
  const handleFocus = () => {
    onFocus?.();
  };

  return (
    <Box
      ref={windowRef}
      className="floating-tool-window"
      onPointerDownCapture={handleFocus}
      sx={{
        position: "fixed",

        left: maximized ? 0 : position.x,
        top: maximized ? 0 : position.y,

        width: maximized ? "100vw" : size.width,
        height: maximized ? "100dvh" : size.height,

        maxWidth: maximized ? "100vw" : "calc(100vw - 16px)",
        maxHeight: maximized ? "100dvh" : "calc(100vh - 16px)",

        minWidth: maximized ? "100vw" : 320,
        minHeight: maximized ? "100dvh" : 200,

        zIndex,

        display: minimized ? "none" : "flex",
        flexDirection: "column",

        overflow: "hidden",

        borderRadius: maximized ? 0 : 3,

        boxShadow: maximized
          ? "none"
          : "0 12px 45px rgba(15, 23, 42, 0.25)",

        backgroundColor: "#fff",

        pointerEvents: "auto",

        resize: maximized ? "none" : "both",

        transition: maximized
          ? "none"
          : "box-shadow 0.2s ease",

        "&:hover": {
          boxShadow: maximized
            ? "none"
            : "0 16px 50px rgba(15, 23, 42, 0.3)",
        },
      }}
    >
      <ThemeProvider theme={floatingTheme}>
        <GlobalStyles
          styles={{
            ".floating-tool-window .MuiDialog-root": {
              position: "absolute !important",
              inset: "0 !important",
              width: "100% !important",
              height: "100% !important",
              zIndex: "1 !important",
              overflow: "hidden !important",
            },

            ".floating-tool-window .MuiDialog-container": {
              width: "100% !important",
              height: "100% !important",
              alignItems: "stretch !important",
              justifyContent: "stretch !important",
            },

            ".floating-tool-window .MuiDialog-paper": {
              width: "100% !important",
              height: "100% !important",
              maxWidth: "none !important",
              maxHeight: "none !important",
              margin: "0 !important",
              borderRadius: "0 !important",
              overflow: "auto !important",
            },

            ".floating-tool-window .MuiBackdrop-root": {
              display: "none !important",
            },
          }}
        />

        {/* Thanh tiêu đề */}
        <Paper
          elevation={0}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          sx={{
            height: 46,
            minHeight: 46,

            display: "flex",
            alignItems: "center",
            gap: 1,

            px: 1.5,

            color: "#fff",

            background:
              "linear-gradient(110deg, #123b70 0%, #1976d2 55%, #2196f3 100%)",

            cursor: maximized ? "default" : "grab",

            userSelect: "none",
            touchAction: "none",

            "&:active": {
              cursor: maximized ? "default" : "grabbing",
            },
          }}
        >
          <DragIndicatorRoundedIcon
            sx={{
              fontSize: 21,
              opacity: maximized ? 0 : 0.8,
            }}
          />

          <Typography
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: 14,
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </Typography>

          {/* Thu nhỏ */}
          <Tooltip title="Thu nhỏ">
            <IconButton
                size="small"
                onPointerDown={(event) => {
                event.stopPropagation();
                }}
                onClick={(event) => {
                event.stopPropagation();
                onMinimize?.();
                }}
                sx={{
                color: "#fff",
                width: 32,
                height: 32,
                flexShrink: 0,
                "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.18)",
                },
                }}
            >
                <RemoveRoundedIcon fontSize="small" />
            </IconButton>
            </Tooltip>

          {/* Phóng lớn / Khôi phục */}
          <Tooltip
            title={maximized ? "Khôi phục kích thước" : "Phóng lớn toàn màn hình"}
          >
            <IconButton
              size="small"
              onClick={handleToggleMaximize}
              sx={{
                color: "#fff",
                width: 32,
                height: 32,
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.18)",
                },
              }}
            >
              {maximized ? (
                <CloseFullscreenRoundedIcon fontSize="small" />
              ) : (
                <OpenInFullRoundedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          {/* Đóng */}
          <Tooltip title="Đóng công cụ">
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: "#fff",
                width: 32,
                height: 32,
                "&:hover": {
                  backgroundColor: "#e53935",
                },
              }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>

        {/* Nội dung công cụ */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            position: "relative",
            overflow: "auto",
            backgroundColor: "#fff",
          }}
        >
          {children}
        </Box>
      </ThemeProvider>
    </Box>
  );
};

export default FloatingToolWindow;
