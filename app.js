/************************************************************
 * app.js
 * ระบบฟอร์มแจ้งการกระทำที่ไม่ปลอดภัย
 *
 * ปรับปรุงรอบนี้:
 * - ตรวจ Health ก่อนโหลดตัวเลือก
 * - โหลดตัวเลือกซ้ำอัตโนมัติเมื่อเครือข่ายสะดุด
 * - เปิดปุ่มบันทึกเมื่อข้อมูลจำเป็นครบจริงเท่านั้น
 * - แจ้งชัดเจนว่าข้อมูลส่วนใดหาย
 * - แสดงความคืบหน้าการเตรียมไฟล์และบันทึก
 * - ป้องกันการกดบันทึกซ้ำ
 * - รองรับภาพที่ผ่าน Image Editor
 ************************************************************/

(function (window, document) {
  'use strict';

  const CONFIG =
    window.APP_CONFIG || {};

  const API =
    window.SafetyAPI;

  const DEFAULT_SHIFTS =
    Object.freeze([
      'A',
      'B',
      'C',
      'D',
      'N'
    ]);

  const LOAD_RETRY_COUNT =
    3;

  const LOAD_RETRY_DELAY_MS =
    900;

  const state = {
    initialized:
      false,

    ready:
      false,

    loadingOptions:
      false,

    submitting:
      false,

    files: [
      null,
      null,
      null
    ],

    previewUrls: [
      '',
      '',
      ''
    ],

    options:
      null,

    readinessErrors:
      []
  };


  const elements = {};


  document.addEventListener(
    'DOMContentLoaded',
    initialize
  );


  /************************************************************
   * Initialize
   ************************************************************/

  async function initialize() {
    if (state.initialized) {
      return;
    }

    state.initialized =
      true;

    cacheElements();
    applyConfig();
    bindEvents();
    startClock();
    updateCounters();
    updateFileSummary();
    updateSubmitAvailability();

    await loadInitialData();
  }


  function cacheElements() {
    elements.form =
      document.getElementById(
        'reportForm'
      );

    elements.appLogo =
      document.getElementById(
        'appLogo'
      );

    elements.currentDateTime =
      document.getElementById(
        'currentDateTime'
      );

    elements.connectionStatus =
      document.getElementById(
        'connectionStatus'
      );

    elements.connectionStatusText =
      document.getElementById(
        'connectionStatusText'
      );

    elements.workShift =
      document.getElementById(
        'workShift'
      );

    elements.osm =
      document.getElementById(
        'osm'
      );

    elements.otm =
      document.getElementById(
        'otm'
      );

    elements.unsafeActionType =
      document.getElementById(
        'unsafeActionType'
      );

    elements.problemDetail =
      document.getElementById(
        'problemDetail'
      );

    elements.lineTarget =
      document.getElementById(
        'lineTarget'
      );

    elements.unsafeActionCounter =
      document.getElementById(
        'unsafeActionCounter'
      );

    elements.problemDetailCounter =
      document.getElementById(
        'problemDetailCounter'
      );

    elements.fileSummary =
      document.getElementById(
        'fileSummary'
      );

    elements.formError =
      document.getElementById(
        'formError'
      );

    elements.successPanel =
      document.getElementById(
        'successPanel'
      );

    elements.successCaseId =
      document.getElementById(
        'successCaseId'
      );

    elements.successFlexStatus =
      document.getElementById(
        'successFlexStatus'
      );

    elements.submitButton =
      document.getElementById(
        'submitButton'
      );

    elements.loadingOverlay =
      document.getElementById(
        'loadingOverlay'
      );

    elements.loadingTitle =
      document.getElementById(
        'loadingTitle'
      );

    elements.loadingMessage =
      document.getElementById(
        'loadingMessage'
      );

    elements.progressBar =
      document.getElementById(
        'progressBar'
      );

    elements.progressText =
      document.getElementById(
        'progressText'
      );

    assertRequiredElements();
  }


  function assertRequiredElements() {
    const required = [
      'form',
      'currentDateTime',
      'connectionStatus',
      'connectionStatusText',
      'workShift',
      'osm',
      'otm',
      'unsafeActionType',
      'problemDetail',
      'lineTarget',
      'submitButton',
      'loadingOverlay'
    ];

    const missing =
      required.filter(
        function (key) {
          return !elements[key];
        }
      );

    if (
      missing.length > 0
    ) {
      throw new Error(
        'โครงสร้างหน้าเว็บไม่ครบ: ' +
        missing.join(', ')
      );
    }
  }


  function applyConfig() {
    if (
      CONFIG.LOGO_URL &&
      elements.appLogo
    ) {
      elements.appLogo.src =
        CONFIG.LOGO_URL;
    }

    document.title =
      CONFIG.APP_NAME ||
      document.title;
  }


  function bindEvents() {
    elements.form.addEventListener(
      'submit',
      handleSubmit
    );

    elements.unsafeActionType
      .addEventListener(
        'input',
        function () {
          updateCounter(
            elements.unsafeActionType,
            elements.unsafeActionCounter,
            300
          );

          clearSuccess();
        }
      );

    elements.problemDetail
      .addEventListener(
        'input',
        function () {
          updateCounter(
            elements.problemDetail,
            elements.problemDetailCounter,
            5000
          );

          clearSuccess();
        }
      );

    [
      elements.workShift,
      elements.osm,
      elements.otm,
      elements.lineTarget
    ].forEach(
      function (select) {
        select.addEventListener(
          'change',
          function () {
            clearFormError();
            clearSuccess();
          }
        );
      }
    );

    document
      .querySelectorAll(
        '.evidence-input'
      )
      .forEach(
        function (input) {
          input.addEventListener(
            'change',
            handleFileSelected
          );
        }
      );

    document
      .querySelectorAll(
        '[data-remove-index]'
      )
      .forEach(
        function (button) {
          button.addEventListener(
            'click',
            function () {
              removeFile(
                Number(
                  button.dataset
                    .removeIndex
                )
              );
            }
          );
        }
      );

    window.addEventListener(
      'online',
      handleOnline
    );

    window.addEventListener(
      'offline',
      handleOffline
    );

    window.addEventListener(
      'beforeunload',
      revokeAllPreviewUrls
    );
  }


  /************************************************************
   * Load options
   ************************************************************/

  async function loadInitialData() {
    if (
      state.loadingOptions
    ) {
      return;
    }

    state.loadingOptions =
      true;

    state.ready =
      false;

    updateSubmitAvailability();

    setConnectionStatus(
      'loading',
      'กำลังโหลดข้อมูล'
    );

    setSelectLoading(
      elements.workShift,
      'กำลังโหลด'
    );

    setSelectLoading(
      elements.osm,
      'กำลังโหลด'
    );

    setSelectLoading(
      elements.otm,
      'กำลังโหลด'
    );

    setSelectLoading(
      elements.lineTarget,
      'กำลังโหลด LINE'
    );

    showLoading(
      'กำลังเตรียมฟอร์ม',
      'กำลังตรวจสอบการเชื่อมต่อ',
      8
    );

    clearFormError();

    try {
      assertApiAvailable();

      updateProgress(
        18,
        'กำลังตรวจสอบ Cloudflare Worker'
      );

      await API.health();

      updateProgress(
        35,
        'กำลังโหลด OSM และ OTM'
      );

      const options =
        await loadOptionsWithRetry(
          LOAD_RETRY_COUNT
        );

      updateProgress(
        62,
        'กำลังจัดเตรียมตัวเลือก'
      );

      const normalized =
        await normalizeOptions(
          options
        );

      state.options =
        normalized;

      renderOptions(
        normalized
      );

      state.readinessErrors =
        validateLoadedOptions(
          normalized
        );

      if (
        state.readinessErrors
          .length > 0
      ) {
        throw new Error(
          state.readinessErrors
            .join(' / ')
        );
      }

      state.ready =
        true;

      updateSubmitAvailability();

      setConnectionStatus(
        'ready',
        'พร้อมใช้งาน'
      );

      updateProgress(
        100,
        'พร้อมใช้งาน'
      );

    } catch (error) {
      state.ready =
        false;

      updateSubmitAvailability();

      setConnectionStatus(
        'error',
        'ข้อมูลไม่พร้อม'
      );

      showFormError(
        buildLoadErrorMessage(
          error
        )
      );

      console.error(
        'Initial data error:',
        error
      );

    } finally {
      state.loadingOptions =
        false;

      window.setTimeout(
        hideLoading,
        300
      );
    }
  }


  function assertApiAvailable() {
    if (!API) {
      throw new Error(
        'ไม่พบ SafetyAPI กรุณาตรวจสอบ api.js'
      );
    }

    const requiredMethods = [
      'health',
      'getOptions',
      'createReport',
      'createRequestId'
    ];

    const missing =
      requiredMethods.filter(
        function (name) {
          return (
            typeof API[name] !==
            'function'
          );
        }
      );

    if (
      missing.length > 0
    ) {
      throw new Error(
        'SafetyAPI ไม่ครบ: ' +
        missing.join(', ')
      );
    }
  }


  async function loadOptionsWithRetry(
    maximumAttempts
  ) {
    let lastError =
      null;

    for (
      let attempt = 1;
      attempt <= maximumAttempts;
      attempt++
    ) {
      try {
        return await API.getOptions();

      } catch (error) {
        lastError =
          error;

        if (
          attempt >=
          maximumAttempts
        ) {
          break;
        }

        updateProgress(
          35 +
          attempt * 6,
          'การเชื่อมต่อสะดุด กำลังลองใหม่ ' +
          attempt +
          '/' +
          (
            maximumAttempts - 1
          )
        );

        await delay(
          LOAD_RETRY_DELAY_MS *
          attempt
        );
      }
    }

    throw lastError ||
      new Error(
        'โหลดตัวเลือกไม่สำเร็จ'
      );
  }


  async function normalizeOptions(
    source
  ) {
    const options =
      source &&
      typeof source === 'object'
        ? source
        : {};

    const operation =
      options.operation &&
      typeof options.operation ===
        'object'
        ? options.operation
        : {};

    let lineTargets =
      normalizeLineTargets(
        options.lineTargets
      );

    if (
      lineTargets.length < 1 &&
      typeof API.getLineTargets ===
        'function'
    ) {
      try {
        const response =
          await API.getLineTargets();

        lineTargets =
          normalizeLineTargets(
            response
          );

      } catch (error) {
        console.warn(
          'ไม่สามารถโหลดปลายทาง LINE แยกได้',
          error
        );
      }
    }

    return {
      shifts:
        uniqueTextValues(
          Array.isArray(
            options.shifts
          ) &&
          options.shifts.length > 0
            ? options.shifts
            : DEFAULT_SHIFTS
        ),

      operation: {
        osm:
          uniqueTextValues(
            operation.osm
          ),

        otm:
          uniqueTextValues(
            operation.otm
          )
      },

      lineTargets:
        lineTargets
    };
  }


  function renderOptions(
    options
  ) {
    populateSelect(
      elements.workShift,
      options.shifts,
      'เลือกกะ'
    );

    populateSelect(
      elements.osm,
      options.operation.osm,
      'เลือก OSM'
    );

    populateSelect(
      elements.otm,
      options.operation.otm,
      'เลือก OTM'
    );

    populateLineTargets(
      options.lineTargets
    );
  }


  function validateLoadedOptions(
    options
  ) {
    const errors = [];

    if (
      !options.shifts ||
      options.shifts.length < 1
    ) {
      errors.push(
        'ไม่พบข้อมูลกะทำงาน'
      );
    }

    if (
      !options.operation ||
      !options.operation.osm ||
      options.operation.osm
        .length < 1
    ) {
      errors.push(
        'ไม่พบรายชื่อ OSM ในชีต Operation'
      );
    }

    if (
      !options.operation ||
      !options.operation.otm ||
      options.operation.otm
        .length < 1
    ) {
      errors.push(
        'ไม่พบรายชื่อ OTM ในชีต Operation'
      );
    }

    if (
      !options.lineTargets ||
      options.lineTargets
        .length < 1
    ) {
      errors.push(
        'ยังไม่พบปลายทาง LINE สำหรับส่ง Flex'
      );
    }

    return errors;
  }


  function uniqueTextValues(
    values
  ) {
    if (
      !Array.isArray(
        values
      )
    ) {
      return [];
    }

    const seen =
      new Set();

    const result = [];

    values.forEach(
      function (value) {
        const text =
          String(
            value || ''
          ).trim();

        if (
          !text ||
          seen.has(text)
        ) {
          return;
        }

        seen.add(text);
        result.push(text);
      }
    );

    return result;
  }


  function normalizeLineTargets(
    targets
  ) {
    if (
      !Array.isArray(
        targets
      )
    ) {
      return [];
    }

    const seen =
      new Set();

    const result = [];

    targets.forEach(
      function (target) {
        if (
          !target ||
          typeof target !== 'object'
        ) {
          return;
        }

        const id =
          String(
            target.id ||
            target.targetId ||
            ''
          ).trim();

        if (
          !id ||
          seen.has(id)
        ) {
          return;
        }

        seen.add(id);

        result.push({
          id:
            id,

          type:
            String(
              target.type ||
              target.targetType ||
              'LINE'
            )
              .trim()
              .toUpperCase(),

          name:
            String(
              target.name ||
              target.displayName ||
              id
            ).trim()
        });
      }
    );

    return result;
  }


  function setSelectLoading(
    select,
    text
  ) {
    select.replaceChildren();

    const option =
      document.createElement(
        'option'
      );

    option.value =
      '';

    option.textContent =
      text;

    select.appendChild(
      option
    );

    select.disabled =
      true;
  }


  function populateSelect(
    select,
    values,
    placeholder
  ) {
    select.replaceChildren();

    const firstOption =
      document.createElement(
        'option'
      );

    firstOption.value =
      '';

    firstOption.textContent =
      placeholder;

    select.appendChild(
      firstOption
    );

    values.forEach(
      function (value) {
        const option =
          document.createElement(
            'option'
          );

        option.value =
          value;

        option.textContent =
          value;

        select.appendChild(
          option
        );
      }
    );

    select.disabled =
      values.length < 1;
  }


  function populateLineTargets(
    targets
  ) {
    elements.lineTarget
      .replaceChildren();

    const firstOption =
      document.createElement(
        'option'
      );

    firstOption.value =
      '';

    firstOption.textContent =
      targets.length > 0
        ? 'เลือกปลายทาง LINE'
        : 'ยังไม่พบปลายทาง LINE';

    elements.lineTarget.appendChild(
      firstOption
    );

    targets.forEach(
      function (target) {
        const option =
          document.createElement(
            'option'
          );

        option.value =
          target.id;

        option.textContent =
          getTargetTypeLabel(
            target.type
          ) +
          ' - ' +
          target.name;

        option.dataset.targetType =
          target.type;

        option.dataset.targetName =
          target.name;

        elements.lineTarget
          .appendChild(
            option
          );
      }
    );

    elements.lineTarget.disabled =
      targets.length < 1;
  }


  function getTargetTypeLabel(
    type
  ) {
    switch (
      String(
        type || ''
      ).toUpperCase()
    ) {
      case 'GROUP':
        return 'กลุ่ม';

      case 'ROOM':
        return 'ห้อง';

      case 'USER':
        return 'บุคคล';

      default:
        return 'LINE';
    }
  }


  function buildLoadErrorMessage(
    error
  ) {
    const message =
      error &&
      error.message
        ? error.message
        : 'โหลดข้อมูลไม่สำเร็จ';

    return (
      'ยังไม่สามารถเปิดใช้งานฟอร์มได้: ' +
      message +
      ' กรุณาตรวจสอบอินเทอร์เน็ต แล้วรีเฟรชหน้าเว็บ'
    );
  }


  /************************************************************
   * Clock
   ************************************************************/

  function startClock() {
    updateClock();

    window.setInterval(
      updateClock,
      1000
    );
  }


  function updateClock() {
    elements.currentDateTime
      .textContent =
      formatBangkokDateTime(
        new Date()
      );
  }


  function formatBangkokDateTime(
    date
  ) {
    const parts =
      new Intl.DateTimeFormat(
        'en-GB',
        {
          timeZone:
            CONFIG.TIMEZONE ||
            'Asia/Bangkok',

          day:
            '2-digit',

          month:
            '2-digit',

          year:
            'numeric',

          hour:
            '2-digit',

          minute:
            '2-digit',

          second:
            '2-digit',

          hour12:
            false
        }
      )
        .formatToParts(
          date
        );

    const value = {};

    parts.forEach(
      function (part) {
        value[part.type] =
          part.value;
      }
    );

    return (
      value.day +
      '/' +
      value.month +
      '/' +
      value.year +
      ' ' +
      value.hour +
      ':' +
      value.minute +
      ':' +
      value.second
    );
  }


  /************************************************************
   * Evidence files
   ************************************************************/

  function handleFileSelected(
    event
  ) {
    clearFormError();
    clearSuccess();

    const input =
      event.currentTarget;

    const index =
      Number(
        input.dataset.fileIndex
      );

    const file =
      input.files &&
      input.files[0]
        ? input.files[0]
        : null;

    if (!file) {
      return;
    }

    try {
      validateFile(
        file,
        index
      );

      setFile(
        index,
        file
      );

    } catch (error) {
      input.value =
        '';

      showFormError(
        error.message
      );
    }
  }


  function validateFile(
    file,
    index
  ) {
    if (
      !file ||
      !(file instanceof File)
    ) {
      throw new Error(
        'ไฟล์หลักฐานไม่ถูกต้อง'
      );
    }

    const mimeType =
      String(
        file.type || ''
      ).toLowerCase();

    const allowedImages =
      Array.isArray(
        CONFIG.ALLOWED_IMAGE_TYPES
      )
        ? CONFIG.ALLOWED_IMAGE_TYPES
        : [];

    const allowedVideos =
      Array.isArray(
        CONFIG.ALLOWED_VIDEO_TYPES
      )
        ? CONFIG.ALLOWED_VIDEO_TYPES
        : [];

    const isImage =
      allowedImages.includes(
        mimeType
      );

    const isVideo =
      allowedVideos.includes(
        mimeType
      );

    if (
      !isImage &&
      !isVideo
    ) {
      throw new Error(
        'ไฟล์หลักฐาน ' +
        (
          index + 1
        ) +
        ' เป็นชนิดที่ระบบไม่รองรับ'
      );
    }

    const maximumBytes =
      isVideo
        ? Number(
            CONFIG.MAX_VIDEO_BYTES
          )
        : Number(
            CONFIG.MAX_IMAGE_BYTES
          );

    if (
      maximumBytes > 0 &&
      file.size > maximumBytes
    ) {
      throw new Error(
        (
          isVideo
            ? 'วิดีโอ'
            : 'ภาพ'
        ) +
        ' ต้องมีขนาดไม่เกิน ' +
        formatBytes(
          maximumBytes
        )
      );
    }

    const futureFiles =
      state.files.slice();

    futureFiles[index] =
      file;

    const totalSize =
      futureFiles.reduce(
        function (
          sum,
          currentFile
        ) {
          return (
            sum +
            (
              currentFile
                ? currentFile.size
                : 0
            )
          );
        },
        0
      );

    const maximumTotal =
      Number(
        CONFIG.MAX_TOTAL_BYTES
      ) || 0;

    if (
      maximumTotal > 0 &&
      totalSize >
        maximumTotal
    ) {
      throw new Error(
        'ขนาดไฟล์รวมต้องไม่เกิน ' +
        formatBytes(
          maximumTotal
        )
      );
    }
  }


  function setFile(
    index,
    file
  ) {
    revokePreviewUrl(
      index
    );

    state.files[index] =
      file;

    const previewUrl =
      URL.createObjectURL(
        file
      );

    state.previewUrls[index] =
      previewUrl;

    const slot =
      document.querySelector(
        '[data-slot-index="' +
        index +
        '"]'
      );

    const dropzone =
      slot
        ? slot.querySelector(
            '.file-dropzone'
          )
        : null;

    const preview =
      document.querySelector(
        '[data-preview-index="' +
        index +
        '"]'
      );

    const media =
      document.querySelector(
        '[data-preview-media="' +
        index +
        '"]'
      );

    const name =
      document.querySelector(
        '[data-file-name="' +
        index +
        '"]'
      );

    const size =
      document.querySelector(
        '[data-file-size="' +
        index +
        '"]'
      );

    const editButton =
      document.querySelector(
        '[data-edit-index="' +
        index +
        '"]'
      );

    if (
      !dropzone ||
      !preview ||
      !media
    ) {
      throw new Error(
        'ไม่พบช่องแสดงไฟล์หลักฐาน'
      );
    }

    media.replaceChildren();

    if (
      file.type.startsWith(
        'image/'
      )
    ) {
      const image =
        document.createElement(
          'img'
        );

      image.src =
        previewUrl;

      image.alt =
        'ตัวอย่างภาพหลักฐาน';

      image.loading =
        'eager';

      media.appendChild(
        image
      );

      if (editButton) {
        editButton.hidden =
          !window
            .SafetyImageEditor;
      }

    } else {
      const video =
        document.createElement(
          'video'
        );

      video.src =
        previewUrl;

      video.controls =
        true;

      video.preload =
        'metadata';

      video.playsInline =
        true;

      media.appendChild(
        video
      );

      if (editButton) {
        editButton.hidden =
          true;
      }
    }

    if (name) {
      name.textContent =
        file.name;
    }

    if (size) {
      size.textContent =
        file.type +
        ' · ' +
        formatBytes(
          file.size
        );
    }

    dropzone.hidden =
      true;

    preview.hidden =
      false;

    updateFileSummary();
  }


  function removeFile(
    index
  ) {
    revokePreviewUrl(
      index
    );

    state.files[index] =
      null;

    const input =
      document.querySelector(
        '[data-file-index="' +
        index +
        '"]'
      );

    const slot =
      document.querySelector(
        '[data-slot-index="' +
        index +
        '"]'
      );

    const dropzone =
      slot
        ? slot.querySelector(
            '.file-dropzone'
          )
        : null;

    const preview =
      document.querySelector(
        '[data-preview-index="' +
        index +
        '"]'
      );

    const media =
      document.querySelector(
        '[data-preview-media="' +
        index +
        '"]'
      );

    const editButton =
      document.querySelector(
        '[data-edit-index="' +
        index +
        '"]'
      );

    if (input) {
      input.value =
        '';
    }

    if (media) {
      media.replaceChildren();
    }

    if (preview) {
      preview.hidden =
        true;
    }

    if (dropzone) {
      dropzone.hidden =
        false;
    }

    if (editButton) {
      editButton.hidden =
        true;
    }

    updateFileSummary();
    clearSuccess();
  }


  function revokePreviewUrl(
    index
  ) {
    if (
      state.previewUrls[index]
    ) {
      URL.revokeObjectURL(
        state.previewUrls[index]
      );

      state.previewUrls[index] =
        '';
    }
  }


  function revokeAllPreviewUrls() {
    state.previewUrls.forEach(
      function (
        previewUrl,
        index
      ) {
        if (previewUrl) {
          revokePreviewUrl(
            index
          );
        }
      }
    );
  }


  function updateFileSummary() {
    const selectedFiles =
      state.files.filter(
        Boolean
      );

    if (
      selectedFiles.length < 1
    ) {
      elements.fileSummary
        .textContent =
        'ยังไม่ได้เลือกไฟล์';

      return;
    }

    const totalSize =
      selectedFiles.reduce(
        function (
          sum,
          file
        ) {
          return (
            sum +
            file.size
          );
        },
        0
      );

    elements.fileSummary
      .textContent =
      'เลือกแล้ว ' +
      selectedFiles.length +
      '/' +
      (
        Number(
          CONFIG.MAX_FILES
        ) || 3
      ) +
      ' ไฟล์ · ' +
      formatBytes(
        totalSize
      );
  }


  /************************************************************
   * Submit
   ************************************************************/

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (
      state.submitting
    ) {
      return;
    }

    clearFormError();
    clearSuccess();

    let requestId =
      '';

    try {
      if (!state.ready) {
        throw new Error(
          state.readinessErrors
            .length > 0
            ? state.readinessErrors
                .join(' / ')
            : 'ระบบยังโหลดตัวเลือกไม่ครบ'
        );
      }

      validateForm();

      state.submitting =
        true;

      updateSubmitAvailability();

      requestId =
        API.createRequestId(
          'REPORT'
        );

      showLoading(
        'กำลังบันทึกข้อมูล',
        'กำลังตรวจสอบข้อมูล',
        6
      );

      updateProgress(
        12,
        'ตรวจสอบข้อมูลเรียบร้อย'
      );

      const selectedFiles =
        state.files.filter(
          Boolean
        );

      const evidenceFiles =
        [];

      for (
        let index = 0;
        index <
          selectedFiles.length;
        index++
      ) {
        const file =
          selectedFiles[index];

        const startPercent =
          18;

        const endPercent =
          58;

        const percent =
          startPercent +
          Math.round(
            (
              index /
              selectedFiles.length
            ) *
            (
              endPercent -
              startPercent
            )
          );

        updateProgress(
          percent,
          'กำลังเตรียมไฟล์ ' +
          (
            index + 1
          ) +
          '/' +
          selectedFiles.length
        );

        const dataUrl =
          await fileToDataUrl(
            file
          );

        evidenceFiles.push({
          fileName:
            file.name,

          mimeType:
            file.type,

          base64:
            dataUrl
        });

        updateProgress(
          startPercent +
          Math.round(
            (
              (
                index + 1
              ) /
              selectedFiles.length
            ) *
            (
              endPercent -
              startPercent
            )
          ),
          'เตรียมไฟล์ ' +
          (
            index + 1
          ) +
          ' เรียบร้อย'
        );
      }

      updateProgress(
        64,
        'กำลังจัดเตรียมข้อมูล'
      );

      const selectedTarget =
        elements.lineTarget
          .selectedOptions[0];

      if (
        !selectedTarget ||
        !elements.lineTarget.value
      ) {
        throw new Error(
          'กรุณาเลือกปลายทาง LINE'
        );
      }

      const payload = {
        requestId:
          requestId,

        shift:
          elements.workShift.value,

        osm:
          elements.osm.value,

        otm:
          elements.otm.value,

        unsafeActionType:
          elements
            .unsafeActionType
            .value
            .trim(),

        problemDetail:
          elements
            .problemDetail
            .value
            .trim(),

        lineTargetType:
          selectedTarget
            .dataset
            .targetType ||
          '',

        lineTargetId:
          elements.lineTarget.value,

        lineTargetName:
          selectedTarget
            .dataset
            .targetName ||
          selectedTarget.textContent ||
          '',

        evidenceFiles:
          evidenceFiles
      };

      updateProgress(
        72,
        'กำลังอัปโหลดไฟล์ไปยัง Google Drive'
      );

      const response =
        await API.createReport(
          payload,
          requestId
        );

      updateProgress(
        94,
        'กำลังตรวจสอบผลการส่ง Flex Message'
      );

      showSuccess(
        response
      );

      updateProgress(
        100,
        'บันทึกข้อมูลสำเร็จ'
      );

      setConnectionStatus(
        'ready',
        'บันทึกสำเร็จ'
      );

      elements.successPanel
        .scrollIntoView({
          behavior:
            'smooth',

          block:
            'center'
        });

    } catch (error) {
      console.error(
        'Submit error:',
        error
      );

      const message =
        buildErrorMessage(
          error
        );

      showFormError(
        message
      );

      setConnectionStatus(
        state.ready
          ? 'ready'
          : 'error',
        state.ready
          ? 'พร้อมใช้งาน'
          : 'ข้อมูลไม่พร้อม'
      );

    } finally {
      state.submitting =
        false;

      updateSubmitAvailability();

      window.setTimeout(
        hideLoading,
        400
      );
    }
  }


  function validateForm() {
    const requiredFields = [
      {
        element:
          elements.workShift,

        name:
          'กะทำงาน'
      },
      {
        element:
          elements.osm,

        name:
          'OSM'
      },
      {
        element:
          elements.otm,

        name:
          'OTM'
      },
      {
        element:
          elements.lineTarget,

        name:
          'ปลายทาง LINE'
      },
      {
        element:
          elements.unsafeActionType,

        name:
          'ประเภทการกระทำที่ไม่ปลอดภัย'
      },
      {
        element:
          elements.problemDetail,

        name:
          'รายละเอียดปัญหา'
      }
    ];

    for (
      const item of
        requiredFields
    ) {
      const value =
        String(
          item.element.value ||
          ''
        ).trim();

      if (!value) {
        item.element.focus();

        throw new Error(
          'กรุณาระบุ ' +
          item.name
        );
      }
    }

    const selectedFiles =
      state.files.filter(
        Boolean
      );

    if (
      selectedFiles.length < 1
    ) {
      throw new Error(
        'กรุณาแนบภาพหรือวิดีโอหลักฐานอย่างน้อย 1 ไฟล์'
      );
    }

    const maximumFiles =
      Number(
        CONFIG.MAX_FILES
      ) || 3;

    if (
      selectedFiles.length >
      maximumFiles
    ) {
      throw new Error(
        'แนบหลักฐานได้สูงสุด ' +
        maximumFiles +
        ' ไฟล์'
      );
    }

    state.files.forEach(
      function (
        file,
        index
      ) {
        if (file) {
          validateFile(
            file,
            index
          );
        }
      }
    );
  }


  function fileToDataUrl(
    file
  ) {
    return new Promise(
      function (
        resolve,
        reject
      ) {
        const reader =
          new FileReader();

        reader.onload =
          function () {
            const result =
              String(
                reader.result ||
                ''
              );

            if (
              !result.startsWith(
                'data:'
              )
            ) {
              reject(
                new Error(
                  'ข้อมูลไฟล์ไม่สมบูรณ์: ' +
                  file.name
                )
              );

              return;
            }

            resolve(
              result
            );
          };

        reader.onerror =
          function () {
            reject(
              new Error(
                'ไม่สามารถอ่านไฟล์ ' +
                file.name
              )
            );
          };

        reader.onabort =
          function () {
            reject(
              new Error(
                'การอ่านไฟล์ถูกยกเลิก'
              )
            );
          };

        reader.readAsDataURL(
          file
        );
      }
    );
  }


  /************************************************************
   * Success / Error
   ************************************************************/

  function showSuccess(
    response
  ) {
    const data =
      response &&
      response.data
        ? response.data
        : {};

    elements.successCaseId
      .textContent =
      data.caseId ||
      '-';

    if (
      data.flexSent === true
    ) {
      elements.successFlexStatus
        .textContent =
        'ส่ง Flex Message เรียบร้อยแล้ว';

    } else {
      elements.successFlexStatus
        .textContent =
        'บันทึกข้อมูลแล้ว แต่การส่ง Flex Message ยังไม่สำเร็จ';
    }

    elements.successPanel.hidden =
      false;
  }


  function clearSuccess() {
    if (
      !elements.successPanel
    ) {
      return;
    }

    elements.successPanel.hidden =
      true;

    elements.successCaseId
      .textContent =
      '';

    elements.successFlexStatus
      .textContent =
      '';
  }


  function showFormError(
    message
  ) {
    elements.formError
      .textContent =
      message;

    elements.formError.hidden =
      false;

    elements.formError
      .scrollIntoView({
        behavior:
          'smooth',

        block:
          'center'
      });
  }


  function clearFormError() {
    elements.formError.hidden =
      true;

    elements.formError
      .textContent =
      '';
  }


  function buildErrorMessage(
    error
  ) {
    const message =
      error &&
      error.message
        ? error.message
        : 'เกิดข้อผิดพลาด';

    const requestId =
      error &&
      error.requestId
        ? error.requestId
        : '';

    return requestId
      ? (
          message +
          ' (Request ID: ' +
          requestId +
          ')'
        )
      : message;
  }


  /************************************************************
   * Status / Loading
   ************************************************************/

  function updateSubmitAvailability() {
    elements.submitButton.disabled =
      !state.ready ||
      state.loadingOptions ||
      state.submitting;
  }


  function setConnectionStatus(
    status,
    message
  ) {
    elements.connectionStatus
      .classList
      .remove(
        'is-loading',
        'is-ready',
        'is-error'
      );

    elements.connectionStatus
      .classList
      .add(
        'is-' +
        status
      );

    elements.connectionStatusText
      .textContent =
      message;
  }


  function showLoading(
    title,
    message,
    percent
  ) {
    elements.loadingTitle
      .textContent =
      title ||
      'กำลังดำเนินการ';

    elements.loadingMessage
      .textContent =
      message ||
      'กรุณารอสักครู่';

    updateProgress(
      percent || 0
    );

    elements.loadingOverlay.hidden =
      false;

    document.body.style.overflow =
      'hidden';
  }


  function hideLoading() {
    elements.loadingOverlay.hidden =
      true;

    if (
      !document.body
        .classList
        .contains(
          'image-editor-open'
        )
    ) {
      document.body.style.overflow =
        '';
    }
  }


  function updateProgress(
    percent,
    message
  ) {
    const safePercent =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            percent
          ) || 0
        )
      );

    elements.progressBar
      .style
      .width =
      safePercent +
      '%';

    elements.progressText
      .textContent =
      Math.round(
        safePercent
      ) +
      '%';

    if (message) {
      elements.loadingMessage
        .textContent =
        message;
    }
  }


  /************************************************************
   * Online / Offline
   ************************************************************/

  async function handleOnline() {
    if (
      state.ready ||
      state.loadingOptions ||
      state.submitting
    ) {
      return;
    }

    setConnectionStatus(
      'loading',
      'เชื่อมต่อใหม่'
    );

    await loadInitialData();
  }


  function handleOffline() {
    state.ready =
      false;

    updateSubmitAvailability();

    setConnectionStatus(
      'error',
      'ไม่มีอินเทอร์เน็ต'
    );

    showFormError(
      'อุปกรณ์ไม่ได้เชื่อมต่ออินเทอร์เน็ต กรุณาตรวจสอบเครือข่าย'
    );
  }


  /************************************************************
   * Helpers
   ************************************************************/

  function updateCounters() {
    updateCounter(
      elements.unsafeActionType,
      elements.unsafeActionCounter,
      300
    );

    updateCounter(
      elements.problemDetail,
      elements.problemDetailCounter,
      5000
    );
  }


  function updateCounter(
    input,
    output,
    maximum
  ) {
    if (
      !input ||
      !output
    ) {
      return;
    }

    output.textContent =
      input.value.length +
      '/' +
      maximum;
  }


  function formatBytes(
    bytes
  ) {
    const value =
      Number(
        bytes
      ) || 0;

    if (
      value >=
      1024 * 1024
    ) {
      return (
        value /
        1024 /
        1024
      ).toFixed(2) +
      ' MB';
    }

    if (
      value >=
      1024
    ) {
      return (
        value /
        1024
      ).toFixed(2) +
      ' KB';
    }

    return value +
      ' Bytes';
  }


  function delay(
    milliseconds
  ) {
    return new Promise(
      function (
        resolve
      ) {
        window.setTimeout(
          resolve,
          milliseconds
        );
      }
    );
  }


  /************************************************************
   * Public bridge for Image Editor
   ************************************************************/

  window.SafetyApp =
    Object.freeze({
      replaceEvidenceFile:
        function (
          index,
          file
        ) {
          validateFile(
            file,
            index
          );

          setFile(
            index,
            file
          );

          clearSuccess();
        },

      getEvidenceFile:
        function (
          index
        ) {
          return (
            state.files[index] ||
            null
          );
        },

      reloadOptions:
        loadInitialData
    });

})(window, document);
