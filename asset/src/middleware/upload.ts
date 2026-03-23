import multer from 'multer';

// Use memory storage for buffer access
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/mpeg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 10, // Max 10 files
  },
});
export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10);
