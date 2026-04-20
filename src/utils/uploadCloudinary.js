export const uploadImageToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "tracnghiem_upload");
  formData.append("folder", "questions");

  const response = await fetch(
    "https://api.cloudinary.com/v1_1/dxzpfljv4/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || "Upload hình thất bại"
    );
  }

  const data = await response.json();
  return data.secure_url;
};