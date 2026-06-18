/**
 * api.js
 * ติดต่อ Cloudflare Worker
 */

(function (window) {
  'use strict';

  const CONFIG =
    window.APP_CONFIG || {};

  const API_BASE =
    String(
      CONFIG.API_BASE || ''
    ).replace(/\/+$/, '');

  const DEFAULT_TIMEOUT_MS =
    Number(
      CONFIG.API_TIMEOUT_MS
    ) || 30000;

  const SAVE_TIMEOUT_MS =
    Number(
      CONFIG.SAVE_TIMEOUT_MS
    ) || 60000;

  const UPLOAD_TIMEOUT_MS =
    Number(
      CONFIG.UPLOAD_TIMEOUT_MS
    ) || 120000;


  class SafetyAPIError extends Error {
    constructor(
      message,
      code,
      status,
      details,
      requestId
    ) {
      super(
        message ||
        'เกิดข้อผิดพลาดในการเรียก API'
      );

      this.name =
        'SafetyAPIError';

      this.code =
        code || 'API_ERROR';

      this.status =
        Number(status) || 0;

      this.details =
        details || null;

      this.requestId =
        requestId || '';
    }
  }


  function assertConfigured() {
    if (!API_BASE) {
      throw new SafetyAPIError(
        'ยังไม่ได้ตั้งค่า APP_CONFIG.API_BASE',
        'API_BASE_REQUIRED'
      );
    }

    if (
      !/^https:\/\//i.test(
        API_BASE
      )
    ) {
      throw new SafetyAPIError(
        'API_BASE ต้องขึ้นต้นด้วย https://',
        'API_BASE_INVALID'
      );
    }
  }


  async function request(
    path,
    options
  ) {
    assertConfigured();

    const settings =
      options || {};

    const controller =
      new AbortController();

    const timeoutMs =
      Number(
        settings.timeoutMs
      ) || DEFAULT_TIMEOUT_MS;

    const timer =
      window.setTimeout(
        function () {
          controller.abort();
        },
        timeoutMs
      );

    try {
      const headers =
        new Headers(
          settings.headers || {}
        );

      headers.set(
        'Accept',
        'application/json'
      );

      const fetchOptions = {
        method:
          settings.method || 'GET',

        headers:
          headers,

        signal:
          controller.signal,

        cache:
          'no-store'
      };

      if (
        settings.body !== undefined
      ) {
        headers.set(
          'Content-Type',
          'application/json; charset=UTF-8'
        );

        fetchOptions.body =
          JSON.stringify(
            settings.body
          );
      }

      const response =
        await fetch(
          API_BASE + path,
          fetchOptions
        );

      const rawText =
        await response.text();

      let result;

      try {
        result =
          rawText
            ? JSON.parse(rawText)
            : {};

      } catch (error) {
        throw new SafetyAPIError(
          'API ไม่ได้ส่งข้อมูล JSON กลับมา',

          'NON_JSON_RESPONSE',

          response.status,

          {
            preview:
              rawText.slice(
                0,
                300
              )
          },

          response.headers.get(
            'X-Request-ID'
          ) || ''
        );
      }

      if (
        !response.ok ||
        result.ok === false
      ) {
        throw new SafetyAPIError(
          result.message ||
          'API ทำงานไม่สำเร็จ',

          result.code ||
          'REQUEST_FAILED',

          response.status,

          result.details || null,

          result.requestId ||
          response.headers.get(
            'X-Request-ID'
          ) ||
          ''
        );
      }

      return result;

    } catch (error) {
      if (
        error &&
        error.name ===
        'AbortError'
      ) {
        throw new SafetyAPIError(
          'ระบบใช้เวลาตอบกลับนานเกินกำหนด',
          'REQUEST_TIMEOUT'
        );
      }

      if (
        error instanceof
        SafetyAPIError
      ) {
        throw error;
      }

      throw new SafetyAPIError(
        error &&
        error.message
          ? error.message
          : 'ไม่สามารถเชื่อมต่อ API ได้',

        'NETWORK_ERROR'
      );

    } finally {
      window.clearTimeout(timer);
    }
  }


  function health() {
    return request(
      '/api/health'
    );
  }


  function getOptions() {
    return request(
      '/api/options'
    );
  }


  function verifyLine(
    accessToken
  ) {
    return request(
      '/api/auth/verify',
      {
        method:
          'POST',

        body: {
          accessToken:
            String(
              accessToken || ''
            )
        }
      }
    );
  }


  function startCase(
    payload
  ) {
    return request(
      '/api/case/start',
      {
        method:
          'POST',

        timeoutMs:
          SAVE_TIMEOUT_MS,

        body:
          payload || {}
      }
    );
  }


  function uploadCaseFile(
    payload
  ) {
    return request(
      '/api/case/upload',
      {
        method:
          'POST',

        timeoutMs:
          UPLOAD_TIMEOUT_MS,

        body:
          payload || {}
      }
    );
  }


  function finalizeCase(
    payload
  ) {
    return request(
      '/api/case/finalize',
      {
        method:
          'POST',

        timeoutMs:
          SAVE_TIMEOUT_MS,

        body:
          payload || {}
      }
    );
  }


  window.SafetyAPI = {
    health:
      health,

    getOptions:
      getOptions,

    verifyLine:
      verifyLine,

    startCase:
      startCase,

    uploadCaseFile:
      uploadCaseFile,

    finalizeCase:
      finalizeCase,

    SafetyAPIError:
      SafetyAPIError
  };

})(window);
