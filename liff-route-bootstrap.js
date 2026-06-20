/************************************************************
 * liff-route-bootstrap.js
 * Version: 2026.06.20-liff-route-1
 *
 * ทำงานเฉพาะ Primary Redirect ของ LIFF ที่มี liff.state
 * เพื่อให้ LINE ส่งต่อไปยัง /correction/
 ************************************************************/

(function (window, document) {
  'use strict';

  const CONFIG =
    window.APP_CONFIG || {};

  const params =
    new URLSearchParams(
      window.location.search
    );

  if (!params.has('liff.state')) {
    return;
  }

  const liffId =
    String(
      CONFIG.LIFF_ID || ''
    ).trim();

  if (
    !liffId ||
    liffId ===
      'PUT_YOUR_LIFF_ID_HERE'
  ) {
    console.error(
      'ไม่พบ APP_CONFIG.LIFF_ID สำหรับ LIFF redirect'
    );

    return;
  }

  if (
    !window.liff ||
    typeof window.liff.init !==
      'function'
  ) {
    console.error(
      'โหลด LIFF SDK ไม่สำเร็จ'
    );

    return;
  }

  document.documentElement
    .classList
    .add('is-liff-routing');

  const routePromise =
    window.liff
      .init({
        liffId:
          liffId,

        withLoginOnExternalBrowser:
          true
      })
      .catch(
        function (error) {
          console.error(
            'LIFF primary redirect initialization failed:',
            error
          );

          document.documentElement
            .classList
            .remove('is-liff-routing');

          throw error;
        }
      );

  window.__LIFF_ROUTE_READY__ =
    routePromise;

})(window, document);
