/************************************************************
 * api.js
 * ตัวกลางเรียก Cloudflare Worker
 ************************************************************/

(function (window) {
  'use strict';

  const CONFIG =
    window.APP_CONFIG || {};

  const API_BASE =
    String(
      CONFIG.API_BASE || ''
    ).replace(/\/+$/, '');

  class SafetyApiError extends Error {
    constructor(
      message,
      code,
      status,
      details,
      requestId
    ) {
      super(
        message ||
        'เกิดข้อผิดพลาดในการติดต่อระบบ'
      );

      this.name =
        'SafetyApiError';

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


  function assertApiConfigured() {
    if (!API_BASE) {
      throw new SafetyApiError(
        'ยังไม่ได้กำหนด APP_CONFIG.API_BASE',
        'API_NOT_CONFIGURED'
      );
    }
  }


  function createRequestId(prefix) {
    const cleanPrefix =
      String(prefix || 'WEB')
        .replace(/[^A-Za-z0-9_-]/g, '')
        .toUpperCase();

    const randomPart =
      window.crypto &&
      typeof window.crypto.randomUUID === 'function'
        ? window.crypto
            .randomUUID()
            .replace(/-/g, '')
            .substring(0, 12)
            .toUpperCase()
        : Math.random()
            .toString(36)
            .substring(2, 14)
            .toUpperCase();

    return (
      cleanPrefix +
      '-' +
      Date.now() +
      '-' +
      randomPart
    );
  }


  function buildUrl(path, query) {
    assertApiConfigured();

    const cleanPath =
      String(path || '')
        .trim()
        .replace(/^\/+/, '');

    const url =
      new URL(
        API_BASE +
        '/' +
        cleanPath
      );

    Object.entries(
      query || {}
    ).forEach(
      function ([key, value]) {
        if (
          value !== undefined &&
          value !== null &&
          value !== ''
        ) {
          url.searchParams.set(
            key,
            String(value)
          );
        }
      }
    );

    return url.toString();
  }


  async function request(
    path,
    options
  ) {
    const settings =
      options || {};

    const requestId =
      settings.requestId ||
      createRequestId('REQ');

    const timeoutMs =
      Number(
        settings.timeoutMs
      ) ||
      Number(
        CONFIG.API_TIMEOUT_MS
      ) ||
      30000;

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        function () {
          controller.abort();
        },
        timeoutMs
      );

    try {
      const fetchOptions = {
        method:
          String(
            settings.method || 'GET'
          ).toUpperCase(),

        mode:
          'cors',

        credentials:
          'omit',

        cache:
          'no-store',

        redirect:
          'follow',

        signal:
          controller.signal,

        headers: {
          Accept:
            'application/json',

          'X-Request-ID':
            requestId,

          ...(
            settings.headers || {}
          )
        }
      };

      if (
        settings.body !== undefined
      ) {
        fetchOptions.headers[
          'Content-Type'
        ] =
          'application/json';

        fetchOptions.body =
          JSON.stringify(
            settings.body
          );
      }

      const response =
        await fetch(
          buildUrl(
            path,
            settings.query
          ),
          fetchOptions
        );

      const text =
        await response.text();

      let payload = {};

      if (text) {
        try {
          payload =
            JSON.parse(text);
        } catch (error) {
          throw new SafetyApiError(
            'ระบบปลายทางไม่ได้ส่ง JSON ที่ถูกต้อง',
            'INVALID_JSON_RESPONSE',
            response.status,
            {
              preview:
                text.substring(
                  0,
                  500
                )
            },
            requestId
          );
        }
      }

      if (
        !response.ok ||
        payload.ok === false
      ) {
        throw new SafetyApiError(
          payload.message ||
          'การเรียก API ไม่สำเร็จ',
          payload.code ||
          'API_REQUEST_FAILED',
          response.status,
          payload.details || null,
          payload.requestId ||
          requestId
        );
      }

      return payload;

    } catch (error) {
      if (
        error &&
        error.name === 'AbortError'
      ) {
        throw new SafetyApiError(
          'ระบบใช้เวลานานเกินกำหนด กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
          'REQUEST_TIMEOUT',
          0,
          null,
          requestId
        );
      }

      if (
        error instanceof
        SafetyApiError
      ) {
        throw error;
      }

      throw new SafetyApiError(
        error &&
        error.message
          ? error.message
          : 'ไม่สามารถเชื่อมต่อระบบได้',
        'NETWORK_ERROR',
        0,
        null,
        requestId
      );

    } finally {
      window.clearTimeout(
        timer
      );
    }
  }


  async function health() {
    const response =
      await request(
        '/api/health',
        {
          method:
            'GET'
        }
      );

    return response;
  }


  async function getOptions() {
    const response =
      await request(
        '/api/options',
        {
          method:
            'GET'
        }
      );

    return response.data || {};
  }


  async function getLineTargets() {
    const response =
      await request(
        '/api/line-targets',
        {
          method:
            'GET'
        }
      );

    return response.data || [];
  }


  async function getCase(
    caseId
  ) {
    const response =
      await request(
        '/api/case',
        {
          method:
            'GET',

          query: {
            caseId:
              caseId
          }
        }
      );

    return response.data || null;
  }


  async function createReport(
    payload,
    requestId
  ) {
    return request(
      '/api/report',
      {
        method:
          'POST',

        body:
          payload,

        requestId:
          requestId ||
          createRequestId(
            'REPORT'
          ),

        timeoutMs:
          Number(
            CONFIG.SAVE_TIMEOUT_MS
          ) ||
          180000
      }
    );
  }


  window.SafetyAPI = Object.freeze({
    SafetyApiError:
      SafetyApiError,

    createRequestId:
      createRequestId,

    health:
      health,

    getOptions:
      getOptions,

    getLineTargets:
      getLineTargets,

    getCase:
      getCase,

    createReport:
      createReport
  });

})(window);
