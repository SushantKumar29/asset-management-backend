export interface AssetProcessingParams {
  assetId: string;
  filePath: string;
  mimeType: string;
  userId: string;
  checksum: string;
}

export interface DeleteAssetFilesParams {
  assetId: string;
  fileName: string;
  mimeType?: string;
}

export interface ReportGenerationParams {
  userId: string;
  dateRange: { start: Date; end: Date };
  trackingAction?: string; // Optional action filter for usage reports ('view', 'download', etc.)
}

export interface DuplicateCheckParams {
  assetId: string;
  checksum: string;
  userId: string;
  fileName?: string;
}
