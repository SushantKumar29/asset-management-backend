import mammoth from 'mammoth';
import logger from '../../utils/logger';

/*
  Here we are using mammoth for processing word documents
  Mammoth is a third-party library designed to convert .docx documents into HTML and plain text 
*/

export const processWord = async (buffer: Buffer, assetId: string) => {
  logger.info('Processing Word document for asset:', assetId);

  // Here we are extracting some metadata from the word document
  const extractedData = await mammoth.extractRawText({ buffer });
  const results = {
    metadata: {
      textLength: extractedData.value.length,
      messages: extractedData.messages, // THis is used for the errors tracking
    },
  };

  return results;
};
