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
  reportType: string;
  dateRange: { start: Date; end: Date };
  trackingAction?: string; // ('view', 'download', etc.)
}

export interface DuplicateCheckParams {
  assetId: string;
  checksum: string;
  userId: string;
  fileName?: string;
}
