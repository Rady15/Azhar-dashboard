const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');

// Make sure the uploads directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const dirs = ['images', 'documents', 'videos', 'avatars'];
dirs.forEach(dir => {
  const fullPath = path.join(uploadDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// ─────────────────────────────────────────────────────────────
// Storage configuration — files saved with unique names
// ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination(req, file, cb) {
    // Route into sub-folder based on file type
    let folder = 'images';
    if (file.mimetype.startsWith('video/'))       folder = 'videos';
    if (file.mimetype === 'application/pdf')      folder = 'documents';
    cb(null, path.join(uploadDir, folder));
  },

  filename(req, file, cb) {
    // Generate a unique filename: uuid + original extension
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuid() + ext);
  }
});

// ─────────────────────────────────────────────────────────────
// File filter — only allow safe file types
// ─────────────────────────────────────────────────────────────
function fileFilter(req, file, cb) {
  const allowed = [
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime',
    'application/pdf'
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
}

const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '10');

// ─────────────────────────────────────────────────────────────
// Upload presets for different use cases
// ─────────────────────────────────────────────────────────────

// Single image (e.g. avatar)
const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 }
}).single('image');

// Multiple images (e.g. maintenance before/after photos — max 5)
const uploadMultipleImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 }
}).array('images', 5);

// Mixed: images + one video
const uploadMediaMixed = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 }
}).fields([
  { name: 'images', maxCount: 5 },
  { name: 'video',  maxCount: 1 }
]);

// ─────────────────────────────────────────────────────────────
// Helper: build a public URL from a saved file path
// ─────────────────────────────────────────────────────────────
function getFileUrl(req, filePath) {
  const relative = path.relative(uploadDir, filePath).replace(/\\/g, '/');
  return `${req.protocol}://${req.get('host')}/uploads/${relative}`;
}

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
  uploadMediaMixed,
  getFileUrl
};
