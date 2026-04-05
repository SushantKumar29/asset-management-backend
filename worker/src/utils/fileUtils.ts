import path from 'node:path';
import crypto from 'node:crypto';

export const generateFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const ext = path.extname(originalName);
  return `${timestamp}-${random}${ext}`;
};

export const calculateChecksum = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

export const getFileType = (mimeType: string): string => {
  const types = [
    ['image/', 'image'],
    ['video/', 'video'],
    ['audio/', 'audio'],
    ['application/pdf', 'document'],
    ['text/', 'document'],
    ['application/msword', 'document'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document'],
    ['document', 'document'],
  ];

  for (const [type, assetType] of types) {
    if (mimeType.startsWith(type)) return assetType;
  }

  return 'other';
};
