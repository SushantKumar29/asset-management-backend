import logger from '../../utils/logger';

export const processText = async (buffer: Buffer, assetId: string) => {
  logger.info('Processing text file for asset:', assetId);
  const text = buffer.toString('utf-8');

  const results = {
    metadata: {
      textLength: text.length,
      lines: text.split('\n').length,
    },
  };

  return results;
};
