/************************************************************
 * config.js
 * ค่าตั้งต้นฝั่งหน้าเว็บ
 *
 * ห้ามใส่:
 * - LINE Channel Access Token
 * - LINE Channel Secret
 * - GAS_API_SECRET
 * - Signing Secret
 ************************************************************/

(function (window) {
  'use strict';

  window.APP_CONFIG = Object.freeze({
    APP_NAME:
      'ระบบรายงานการกระทำที่ไม่ปลอดภัย',

    API_BASE:
      'https://safety-violation-api.somchaibutphon.workers.dev',

    LOGO_URL:
      'https://lh5.googleusercontent.com/d/1HicYHV18UaA5y4GFyHJaG9aNI-qjIzIY',

    TIMEZONE:
      'Asia/Bangkok',

    /*
     * LIFF ID เป็นข้อมูลสาธารณะ สามารถใส่ในหน้าเว็บได้
     * ให้นำค่าจาก LINE Developers Console มาแทนข้อความด้านล่าง
     */
    LIFF_ID:
      '2010443605-jWYyda1e',

    /*
     * ใส่ได้เมื่อต้องการแสดงปุ่มเพิ่มเพื่อน BOT
     * ตัวอย่าง: https://line.me/R/ti/p/@yourbasicid
     * เว้นว่างได้ โดยระบบยังตรวจสถานะเพื่อนตามปกติ
     */
    LINE_BOT_FRIEND_URL:
      '',

    MAX_FILES:
      3,

    MAX_IMAGE_BYTES:
      6 * 1024 * 1024,

    MAX_VIDEO_BYTES:
      18 * 1024 * 1024,

    /*
     * จำกัดขนาดไฟล์ต้นฉบับรวม
     * เพื่อลดโอกาส JSON ใหญ่เกินไปหลังแปลง Base64
     */
    MAX_TOTAL_BYTES:
      22 * 1024 * 1024,

    ALLOWED_IMAGE_TYPES: Object.freeze([
      'image/jpeg',
      'image/png',
      'image/webp'
    ]),

    ALLOWED_VIDEO_TYPES: Object.freeze([
      'video/mp4',
      'video/quicktime',
      'video/webm'
    ]),

    API_TIMEOUT_MS:
      30000,

    SAVE_TIMEOUT_MS:
      180000,

    DEBUG:
      false
  });

})(window);
