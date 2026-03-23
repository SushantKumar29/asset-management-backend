import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage(); // Using memory storage for buffer access

// Filtering the files with specific types
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/mpeg',
    'application/pdf',
    'application/msword', // MS word older (.doc)
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // MS word (.docx)
    'text/plain',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // Max 50MB
    files: 10, // Max 10 files
  },
});

export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10);
