import { minioClient } from '../config/minio';

/*
  Downloads a file from MinIO as a readable stream and returns it as a Buffer for further processing.
  Using readable stream because 
  - Files can be large (GBs) and streaming allows processing chunks as they arrive instead of loading the entire file into memory at once
*/

export const getFileBuffer = async (filePath: string) => {
  const stream = await minioClient.getObject(process.env.MINIO_BUCKET!, filePath); // minioClient.getObject(): Downloads a file from MinIO as a readable stream
  const chunks: Buffer[] = []; // Create an empty array to store binary chunks as they arrive (Each chunk is a binary data segment)
  for await (const chunk of stream) {
    // Iterate over the stream chunks and adding them to the chunks array
    chunks.push(chunk);
  }
  return Buffer.concat(chunks); // Join all chunks into a single continuous Buffer
};
