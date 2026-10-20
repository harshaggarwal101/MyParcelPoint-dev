const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");

// ===============================
// STORAGE
// ===============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // If the file is an image, save it to the /uploads folder so the frontend can view it
    if (file.mimetype.startsWith("image/")) {
      const uploadDir = path.join(__dirname, "../uploads/tickets");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } else {
      // If it is a CSV/Excel file, save it to the OS temp directory as usual
      cb(null, os.tmpdir());
    }
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

// ===============================
// FILE FILTER
// ===============================
const fileFilter = (req, file, cb) => {
  // Added image extensions and mimetypes alongside your existing ones
  const allowedExts = [
    ".csv",
    ".xlsx",
    ".xls",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
  ];
  const allowedMimes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only Images (JPG/PNG), CSV, and Excel files are allowed"),
      false,
    );
  }
};

// ===============================
// MULTER CONFIG
// ===============================
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = upload;
