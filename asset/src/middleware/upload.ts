import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { ALLOWED_FILE_TYPES } from '../constants/fileTypes';

// We are using memory storage for buffer access
const storage = multer.memoryStorage();

type AllowedMimeType = (typeof ALLOWED_FILE_TYPES)[number];

// Here we are filtering the files with proper types
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype as AllowedMimeType)) {
    cb(null, true); // Here we are allowing the file by calling the callback with null ad no error and true as proceed
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`));
  }
};

// Here we are configuring multer with proper types
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 10, // Max 10 files
  },
});

// Here we are exporting configured upload instances
export const uploadSingle = upload.single('file'); // THis is for single file upload
export const uploadMultiple = upload.array('files', 10); // This is for multiple file upload
