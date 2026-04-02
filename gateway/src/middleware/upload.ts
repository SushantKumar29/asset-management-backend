import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { ALLOWED_FILE_TYPES, MAX_FILE_COUNT, MAX_FILE_SIZE } from '../constants/files';

const storage = multer.memoryStorage();

type AllowedMimeType = (typeof ALLOWED_FILE_TYPES)[number];

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype as AllowedMimeType)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILE_COUNT,
  },
});

export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', MAX_FILE_COUNT);
