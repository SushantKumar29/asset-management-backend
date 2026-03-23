import { minioClient } from '../config/minio';

/*
  This function downloads a file from MinIO as a readable stream and returns it as a Buffer for further processing.
  We are using readable stream because 
  - Files can be large (GBs) and streaming allows processing chunks as they arrive instead of loading the entire file into memory at once
*/

export const getFileBuffer = async (filePath: string) => {
  const stream = await minioClient.getObject(process.env.MINIO_BUCKET!, filePath); // minioClient.getObject(): Downloads a file from MinIO as a readable stream
  const chunks: Buffer[] = []; // Here we are creating an empty array to store binary chunks as they arrive (Each chunk is a binary data segment)
  for await (const chunk of stream) {
    // Here we are iterating over the stream chunks and adding them to the chunks array
    chunks.push(chunk);
  }
  return Buffer.concat(chunks); // Here we are joining all chunks into a single continuous Buffer
};
