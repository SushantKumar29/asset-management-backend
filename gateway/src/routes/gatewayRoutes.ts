/* A proxy acts as a middleman between clients and servers. In our gateway, it forwards requests from the client to the appropriate microservice.
  It does the followings
    1. Forwards Requests
    2. Preserves Request Data (Headers, Body, parameters, etc.)
    3. Handles Responses
*/
import { Router } from 'express';
import proxy from 'express-http-proxy';
import { authenticate } from '../middleware/auth';
import { serviceUrls } from '../config/services';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: password
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: User already exists
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     description: Authenticate a user and return a token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     description: Logout the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Gets the profile of the user
 *     description: Get the profile of the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the profile of the user
 *       401:
 *         description: Not authenticated
 */

// Auth routes
router.use(
  '/auth',
  proxy(serviceUrls.auth, {
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      // Here, we need the auth token to be passed to the auth service. So we are forwarding all headers from original request
      proxyReqOpts.headers = {
        ...proxyReqOpts.headers,
        ...srcReq.headers,
      };
      return proxyReqOpts;
    },
    proxyReqPathResolver: (req) => {
      return `/api/auth${req.url}`;
    },
  })
);

/**
 * @swagger
 * /assets:
 *   get:
 *     summary: Get all assets
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *        - name: status
 *          in: query
 *          type: string
 *        - name: limit
 *          in: query
 *          type: integer
 *        - name: offset
 *          in: query
 *     responses:
 *       200:
 *         description: Returns all assets of the user
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /assets/{id}:
 *   get:
 *     summary: Get a specific asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *        - name: id
 *          in: path
 *          type: string
 *     responses:
 *       200:
 *         description: Returns a specific asset
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /assets/upload:
 *   post:
 *     summary: Upload multiple Assets
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               description:
 *                 type: string
 *                 description: Asset description (optional)
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of tags (optional)
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: The asset files to upload (required)
 *     responses:
 *       201:
 *         description: Assets uploaded successfully
 *       400:
 *         description: Bad request - files are required or invalid
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /assets/{id}:
 *   delete:
 *     summary: Delete an asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The asset ID to delete
 *     responses:
 *       200:
 *         description: Asset deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /assets/{id}/tags:
 *   get:
 *     summary: Get all tags for an asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The asset ID to get tags for
 *     responses:
 *       200:
 *         description: Tags fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Asset not found
 */

// Asset routes with conditional options for file uploads
router.use('/assets', authenticate, (req, res, next) => {
  // Check if this is an upload request

  // Create proxy with conditional options (Configuration object for the proxy middleware)
  const proxyOptions: { [key: string]: unknown } = {
    // proxyReqPathResolver = A function that modifies the request path before sending to the target service
    proxyReqPathResolver: (req: { url: string }) => {
      return `/api/assets${req.url}`;
    },
  };

  // These options are for upload requests (It handles the multipart form data)
  if (req.path.includes('/upload')) {
    proxyOptions.parseReqBody = false;
    proxyOptions.reqAsBuffer = false;
  }

  // Apply the proxy
  return proxy(serviceUrls.asset, proxyOptions)(req, res, next);
});

/**
 * @swagger
 * /metadata/{assetId}:
 *   get:
 *     summary: Get metadata of a specific asset
 *     tags: [Metadata]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: assetId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Returns metadata of a specific asset
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Asset not found
 */

/**
 * @swagger
 * /metadata/{assetId}:
 *   post:
 *     summary: Set metadata for an asset
 *     tags: [Metadata]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: assetId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *                 default: processing_status
 *               value:
 *                 type: string
 *                 default: completed
 *               data:
 *                 type: object
 *               type:
 *                 type: string
 *                 default: text
 *     responses:
 *       200:
 *         description: Metadata saved successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Asset not found
 */

/**
 * @swagger
 * /metadata/{assetId}/{key}:
 *   delete:
 *     summary: Delete specific metadata key from an asset
 *     tags: [Metadata]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: assetId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *       - name: key
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Metadata key to delete
 *     responses:
 *       200:
 *         description: Metadata deleted successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Asset not found
 */

// Metadata routes
router.use(
  '/metadata',
  authenticate,
  proxy(serviceUrls.metadata, {
    proxyReqPathResolver: (req) => {
      return `/api/metadata${req.url}`;
    },
  })
);

/**
 * @swagger
 * /usage/{assetId}:
 *   get:
 *     summary: Get usage statistics for a specific asset
 *     tags: [Usage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: assetId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *       - name: days
 *         in: query
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: Returns usage statistics for the asset
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /usage/{assetId}:
 *   post:
 *     summary: Track usage of an asset
 *     tags: [Usage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: assetId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 default: view
 *               channel:
 *                 type: string
 *                 default: web
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Usage tracked successfully
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /usage/activity/recent:
 *   get:
 *     summary: Get recent activity for the authenticated user
 *     tags: [Usage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of records to return
 *     responses:
 *       200:
 *         description: Returns recent activity
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /usage/summary/overview:
 *   get:
 *     summary: Get usage summary for the authenticated user
 *     tags: [Usage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: days
 *         in: query
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: Returns usage summary
 *       401:
 *         description: Not authenticated
 */

// Usage routes
router.use(
  '/usage',
  authenticate,
  proxy(serviceUrls.usage, {
    proxyReqPathResolver: (req) => {
      return `/api/usage${req.url}`;
    },
  })
);

/**
 * @swagger
 * /analytics/summary:
 *   get:
 *     summary: Get asset summary for the authenticated user
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns asset summary (total assets, storage used, etc.)
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /analytics/type:
 *   get:
 *     summary: Get assets grouped by type
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns assets count grouped by type (image, video, document, etc.)
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /analytics/popular:
 *   get:
 *     summary: Get most popular assets
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of assets to return
 *       - name: days
 *         in: query
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: Returns most viewed/downloaded assets
 *       401:
 *         description: Not authenticated
 */

// Analytics routes
router.use(
  '/analytics',
  authenticate,
  proxy(serviceUrls.analytics, {
    proxyReqPathResolver: (req) => {
      return `/api/analytics${req.url}`;
    },
  })
);

export default router;
