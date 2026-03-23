export const serviceUrls = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  asset: process.env.ASSET_SERVICE_URL || 'http://localhost:3002',
  metadata: process.env.METADATA_SERVICE_URL || 'http://localhost:3003',
  usage: process.env.USAGE_SERVICE_URL || 'http://localhost:3004',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005',
};
