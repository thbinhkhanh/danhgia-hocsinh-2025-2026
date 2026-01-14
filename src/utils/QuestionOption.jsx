import { Box, Typography } from "@mui/material";

const QuestionOption = ({ option }) => {
  if (!option) return null;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {/* Hình trước nhãn */}
      {option.image && (
        <Box
          component="img"
          src={option.image}
          alt=""
          sx={{
            maxHeight: 40,
            maxWidth: 40,
            objectFit: "contain",
            borderRadius: 2,
            flexShrink: 0,
          }}
        />
      )}

      {/* Text nhãn (có thể chứa <img> bên trong) */}
      <Typography
        component="div"
        dangerouslySetInnerHTML={{ __html: option.text || "" }}
        sx={{
          flex: 1,
          fontWeight: option.formats?.bold ? "bold" : "normal",
          fontStyle: option.formats?.italic ? "italic" : "normal",
          textDecoration: option.formats?.underline ? "underline" : "none",
          "& p": { margin: 0 },
        }}
      />
    </Box>
  );
};

export default QuestionOption;