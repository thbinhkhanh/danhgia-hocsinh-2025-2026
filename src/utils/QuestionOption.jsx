import { Box, Typography } from "@mui/material";

const QuestionOption = ({ option }) => {
  if (!option) return null;

  // Nếu option là string thì hiển thị thẳng
  if (typeof option === "string") {
    return (
      <Typography
        component="div"
        dangerouslySetInnerHTML={{ __html: option }}
        sx={{ flex: 1, "& p": { margin: 0 } }}
      />
    );
  }

  // Nếu option là object { text, image, formats }
  const { text = "", image = null, formats = {} } = option;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {image && (
        <Box
          component="img"
          src={image}
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
      <Typography
        component="div"
        dangerouslySetInnerHTML={{ __html: text }}
        sx={{
          flex: 1,
          fontWeight: formats.bold ? "bold" : "normal",
          fontStyle: formats.italic ? "italic" : "normal",
          textDecoration: formats.underline ? "underline" : "none",
          "& p": { margin: 0 },
        }}
      />
    </Box>
  );
};

export default QuestionOption;