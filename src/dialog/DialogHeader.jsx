import React from "react";
import { Box, Stack, Typography, IconButton, useMediaQuery } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

export default function DialogHeader({ title, subtitle, icon, onClose, children }) {
    const isMobile = useMediaQuery("(max-width:600px)");
  return (
    <Box
    sx={{
        position: "relative",
        px: { xs: 2, sm: 2.5 },
        py: 1.6,
        color: "#fff",
        background:
        "linear-gradient(115deg,#101b3c 0%,#173b82 55%,#087db5 100%)",
        flexShrink: 0,
    }}
    >
    <Stack
        direction="row"
        alignItems="center"
        spacing={1.3}
        sx={{ pr: 5, minWidth: 0 }}
    >
        <Box
        sx={{
            width: 42,
            height: 42,
            borderRadius: 2.5,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            color: "#fff",
            bgcolor: "rgba(255,255,255,.14)",
            border: "1px solid rgba(255,255,255,.2)",
        }}
        >
        {icon}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
            sx={{
            fontSize: { xs: 14, sm: 18 },
            fontWeight: 900,
            lineHeight: 1.3,
            }}
        >
            {title}
        </Typography>

        <Typography
            sx={{
            mt: 0.35,
            fontSize: 11,
            color: "rgba(219,234,254,.85)",
            }}
        >
            {subtitle}
        </Typography>
        </Box>

        {/* CHIP TRÊN MÁY TÍNH */}
        {!isMobile && children}
    </Stack>

    {/* CHIP TRÊN ĐIỆN THOẠI */}
    {isMobile && children && (
        <Box
        sx={{
            display: "flex",
            justifyContent: "flex-start",
            mt: 1.2,
            pl: "53px",
            pr: 5,
        }}
        >
        {children}
        </Box>
    )}

    <IconButton
        onClick={onClose}
        size="small"
        sx={{
        position: "absolute",
        top: 12,
        right: 14,
        color: "#fff",
        bgcolor: "rgba(255,255,255,.12)",
        "&:hover": { bgcolor: "rgba(255,255,255,.22)" },
        }}
    >
        <CloseRoundedIcon fontSize="small" />
    </IconButton>
    </Box>
  );
}
