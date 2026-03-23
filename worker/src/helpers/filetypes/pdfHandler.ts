import pdfParse from 'pdf-parse';
import logger from '../../utils/logger';

export const processPDF = async (buffer: Buffer, assetId: string) => {
  logger.info('Processing PDF for asset:', assetId);

  // Here we are extracting PDF metadata
  const pdfData = await pdfParse(buffer);
  const results = {
    metadata: {
      pages: pdfData.numpages,
      info: pdfData.info,
      metadata: pdfData.metadata,
      version: pdfData.version,
      textLength: pdfData.text.length,
    },
  };
  return results;
};
