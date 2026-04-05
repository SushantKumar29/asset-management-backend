import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import logger from '../../utils/logger';
import { FfprobeData } from 'fluent-ffmpeg';

/*
  Process the video using fluent-ffmpeg
  fluent-ffmpeg - most popular third party library for media processing
*/

export const processVideo = async (buffer: Buffer, assetId: string) => {
  logger.info('Processing video for asset:', assetId);

  const tempFile = path.join('/tmp', `video-${assetId}.mp4`); // Create a temp file because ffmpeg needs a file path instead of a buffer
  fs.writeFileSync(tempFile, buffer); // Write the buffer to the temp file

  try {
    /* 
      Extract the video metadata
      ffprobe() is a callback based function and it can cause callback hell
      So using promise makes sure the metadata is fetched before we process the response
    */
    const metadata = await new Promise<FfprobeData>((resolve, reject) => {
      ffmpeg.ffprobe(tempFile, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    // Get the video codec info (h264, h265, etc.)
    const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
    // Get the audio codec info (aac, mp3, etc.)
    const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');

    const results = {
      metadata: {
        size: buffer.length,
        type: 'video',
        duration: metadata.format.duration ? Math.round(metadata.format.duration) : null,
        width: videoStream?.width || null,
        height: videoStream?.height || null,
        videoCodec: videoStream?.codec_name || null,
        audioCodec: audioStream?.codec_name || null,
        audioChannels: audioStream?.channels || null,
        audioSampleRate: audioStream?.sample_rate || null,
      },
    };

    logger.info(`Video processed for asset ${assetId}`);
    return results;
  } catch (error) {
    logger.error('Video processing failed:', error);

    // Even if with error, still the response will have basic metadata
    return {
      metadata: {
        size: buffer.length,
        type: 'video',
        error: 'Could not extract detailed metadata',
      },
    };
  } finally {
    fs.unlinkSync(tempFile); // Delete the temp file
  }
};
