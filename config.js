/**
 * config.js
 * ค่าตั้งต้นหน้าเว็บระบบแจ้งการกระทำที่ไม่ปลอดภัย
 */

window.APP_CONFIG = Object.freeze({
  APP_NAME:
    'ระบบแจ้งการกระทำที่ไม่ปลอดภัย',

  API_BASE:
    'https://safety-violation-api.YOUR-SUBDOMAIN.workers.dev',

  LIFF_ID:
    '',

  LOGO_URL:
    'https://lh5.googleusercontent.com/d/1HicYHV18UaA5y4GFyHJaG9aNI-qjIzIY',

  TIMEZONE:
    'Asia/Bangkok',

  API_TIMEOUT_MS:
    30000,

  MAX_FILES:
    3,

  MAX_IMAGE_BYTES:
    5 * 1024 * 1024,

  MAX_VIDEO_BYTES:
    15 * 1024 * 1024,

  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ],

  ALLOWED_VIDEO_TYPES: [
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
});
