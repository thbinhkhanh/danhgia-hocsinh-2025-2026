export const normalizeQuillHTML = (val) => {
  if (typeof val === "string") return val;

  if (val && typeof val === "object" && typeof val.text === "string") {
    return val.text;
  }

  return "";
};
