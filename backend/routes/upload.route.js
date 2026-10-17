import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ENV_VARS } from '../config/env.config.js';

const router = express.Router();

// Configure multer in-memory storage for handling video uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept video files
    if (file.mimetype.startsWith('video/') || file.originalname.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files (e.g. .mp4, .webm, .mov) are allowed!'), false);
    }
  },
});

/**
 * @route   GET /api/v1/upload/config
 * @desc    Check S3 configuration status
 * @access  Public
 */
router.get('/config', (req, res) => {
  const isConfigured = Boolean(
    ENV_VARS.AWS_ACCESS_KEY_ID &&
    ENV_VARS.AWS_SECRET_ACCESS_KEY &&
    ENV_VARS.AWS_BUCKET_NAME
  );

  return res.status(200).json({
    configured: isConfigured,
    bucket: ENV_VARS.AWS_BUCKET_NAME ? ENV_VARS.AWS_BUCKET_NAME : null,
    region: ENV_VARS.AWS_REGION,
  });
});

/**
 * @route   POST /api/v1/upload
 * @desc    Uploads a video to AWS S3 bucket and returns direct playback URL
 * @access  Public
 */
router.post('/', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided. Please select a video file to upload.',
      });
    }

    // Validate that AWS S3 environment variables are provided
    if (!ENV_VARS.AWS_ACCESS_KEY_ID || !ENV_VARS.AWS_SECRET_ACCESS_KEY || !ENV_VARS.AWS_BUCKET_NAME) {
      return res.status(500).json({
        success: false,
        message:
          'AWS S3 credentials or bucket name are missing in server environment. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_BUCKET_NAME in your .env file.',
      });
    }

    // Initialize AWS S3 Client
    const s3Client = new S3Client({
      region: ENV_VARS.AWS_REGION,
      credentials: {
        accessKeyId: ENV_VARS.AWS_ACCESS_KEY_ID,
        secretAccessKey: ENV_VARS.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Sanitize filename and create S3 object key
    const sanitizedOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `videos/${Date.now()}_${sanitizedOriginalName}`;

    const putCommand = new PutObjectCommand({
      Bucket: ENV_VARS.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || 'video/mp4',
    });

    // Upload video buffer to S3
    await s3Client.send(putCommand);

    // Form direct S3 URL
    const videoUrl = `https://${ENV_VARS.AWS_BUCKET_NAME}.s3.${ENV_VARS.AWS_REGION}.amazonaws.com/${s3Key}`;

    return res.status(200).json({
      success: true,
      message: 'Video uploaded successfully to AWS S3!',
      videoUrl,
      s3Key,
      fileSize: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('Error during AWS S3 video upload:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload video to AWS S3.',
    });
  }
});

export default router;
