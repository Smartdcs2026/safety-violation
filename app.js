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
 * - แสดงผลการส่ง Flex แยกรายปลายทางหลังบันทึก
 * - แก้ปุ่มบันทึกค้าง disabled หลังโหลดตัวเลือกสำเร็จ
 * - แก้โครงสร้างวงเล็บของ loadInitialData() ให้ถูกต้อง
 * - เปิดหน้าต่างค้นหารายชื่อกลุ่ม บุคคล และห้องทั้งหมด
 * - เลือกและจัดลำดับปลายทาง LINE ได้สูงสุด 5 รายการ
 * - ส่ง lineTargets พร้อมคงข้อมูลปลายทางแรกเพื่อรองรับระบบเดิม
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

  const MAX_LINE_TARGETS =
    Math.max(
      1,
      Number(
        CONFIG.MAX_LINE_TARGETS
      ) || 5
    );

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

    selectedLineTargetIds:
      [],

    lineTargetDraftIds:
      [],

    lineTargetFilter:
      'ALL',

    lineTargetSearch:
      '',

    lineTargetModalOpen:
      false,

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

    elements.lineTargetSelector =
      document.getElementById(
        'lineTargetSelector'
      );

    elements.openLineTargetPickerButton =
      document.getElementById(
        'openLineTargetPickerButton'
      );

    elements.selectedLineTargetList =
      document.getElementById(
        'selectedLineTargetList'
      );

    elements.lineTargetList =
      document.getElementById(
        'lineTargetList'
      );

    elements.lineTargetSummary =
      document.getElementById(
        'lineTargetSummary'
      );

    elements.lineTargetLimit =
      document.getElementById(
        'lineTargetLimit'
      );

    elements.lineTargetSelectionHint =
      document.getElementById(
        'lineTargetSelectionHint'
      );

    elements.clearLineTargetsButton =
      document.getElementById(
        'clearLineTargetsButton'
      );

    elements.lineTargetModal =
      document.getElementById(
        'lineTargetModal'
      );

    elements.lineTargetModalBackdrop =
      document.getElementById(
        'lineTargetModalBackdrop'
      );

    elements.closeLineTargetModalButton =
      document.getElementById(
        'closeLineTargetModalButton'
      );

    elements.lineTargetSearch =
      document.getElementById(
        'lineTargetSearch'
      );

    elements.clearLineTargetSearchButton =
      document.getElementById(
        'clearLineTargetSearchButton'
      );

    elements.lineTargetFilters =
      document.getElementById(
        'lineTargetFilters'
      );

    elements.lineTargetResultCount =
      document.getElementById(
        'lineTargetResultCount'
      );

    elements.lineTargetModalSelectedCount =
      document.getElementById(
        'lineTargetModalSelectedCount'
      );

    elements.lineTargetModalMessage =
      document.getElementById(
        'lineTargetModalMessage'
      );

    elements.clearLineTargetDraftButton =
      document.getElementById(
        'clearLineTargetDraftButton'
      );

    elements.confirmLineTargetSelectionButton =
      document.getElementById(
        'confirmLineTargetSelectionButton'
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

    elements.successMark =
      document.getElementById(
        'successMark'
      );

    elements.successDeliveryList =
      document.getElementById(
        'successDeliveryList'
      );

    elements.successDeliveryNote =
      document.getElementById(
        'successDeliveryNote'
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
      'lineTargetSelector',
      'openLineTargetPickerButton',
      'selectedLineTargetList',
      'lineTargetList',
      'lineTargetSummary',
      'clearLineTargetsButton',
      'lineTargetModal',
      'lineTargetModalBackdrop',
      'closeLineTargetModalButton',
      'lineTargetSearch',
      'lineTargetFilters',
      'lineTargetResultCount',
      'lineTargetModalSelectedCount',
      'clearLineTargetDraftButton',
      'confirmLineTargetSelectionButton',
      'successPanel',
      'successCaseId',
      'successFlexStatus',
      'successMark',
      'successDeliveryList',
      'successDeliveryNote',
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
          updateSubmitAvailability();
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
          updateSubmitAvailability();
        }
      );

    [
      elements.workShift,
      elements.osm,
      elements.otm
    ].forEach(
      function (select) {
        select.addEventListener(
          'change',
          function () {
            clearFormError();
            clearSuccess();
            updateSubmitAvailability();
          }
        );
      }
    );

    elements.openLineTargetPickerButton
      .addEventListener(
        'click',
        openLineTargetModal
      );

    elements.lineTargetModalBackdrop
      .addEventListener(
        'click',
        function () {
          closeLineTargetModal(
            false
          );
        }
      );

    elements.closeLineTargetModalButton
      .addEventListener(
        'click',
        function () {
          closeLineTargetModal(
            false
          );
        }
      );

    elements.confirmLineTargetSelectionButton
      .addEventListener(
        'click',
        function () {
          closeLineTargetModal(
            true
          );
        }
      );

    elements.lineTargetSearch
      .addEventListener(
        'input',
        handleLineTargetSearch
      );

    elements.clearLineTargetSearchButton
      .addEventListener(
        'click',
        clearLineTargetSearch
      );

    elements.lineTargetFilters
      .addEventListener(
        'click',
        handleLineTargetFilterClick
      );

    elements.lineTargetList
      .addEventListener(
        'change',
        handleLineTargetDraftChange
      );

    elements.selectedLineTargetList
      .addEventListener(
        'click',
        handleSelectedLineTargetAction
      );

    elements.clearLineTargetDraftButton
      .addEventListener(
        'click',
        function () {
          state.lineTargetDraftIds =
            [];

          clearLineTargetModalMessage();
          renderLineTargetModalList();
        }
      );

    elements.clearLineTargetsButton
      .addEventListener(
        'click',
        function () {
          clearLineTargetSelection(
            true
          );
        }
      );

    document.addEventListener(
      'keydown',
      handleLineTargetModalKeydown
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

    setLineTargetLoading(
      'กำลังโหลดปลายทาง LINE'
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
        'กำลังตรวจสอบ'
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

      state.readinessErrors =
        state.readinessErrors.length > 0
          ? state.readinessErrors
          : [
              error && error.message
                ? error.message
                : 'โหลดข้อมูลไม่สำเร็จ'
            ];

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

      /*
       * จุดสำคัญ: ต้องประเมินปุ่มอีกครั้งหลังสถานะโหลดเป็น false
       * ไม่เช่นนั้นปุ่มจะค้างเป็น disabled แม้ข้อมูลพร้อมแล้ว
       */
      updateSubmitAvailability();

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

        const type =
          String(
            target.type ||
            target.targetType ||
            'LINE'
          )
            .trim()
            .toUpperCase();

        const name =
          String(
            target.name ||
            target.displayName ||
            target.targetName ||
            id
          ).trim();

        const pictureUrl =
          String(
            target.pictureUrl ||
            target.imageUrl ||
            ''
          ).trim();

        const botStatus =
          String(
            target.botStatus ||
            target.status ||
            ''
          ).trim();

        const allowFlexValue =
          target.allowFlex;

        let active =
          target.active !== false &&
          target.enabled !== false;

        if (
          allowFlexValue !== undefined &&
          allowFlexValue !== null &&
          allowFlexValue !== ''
        ) {
          const allowText =
            String(
              allowFlexValue
            )
              .trim()
              .toLowerCase();

          active =
            active &&
            ![
              'false',
              '0',
              'no',
              'ไม่',
              'ไม่ใช่'
            ].includes(
              allowText
            );
        }

        if (
          /ออกจากกลุ่ม|ถูกบล็อก|ไม่ใช้งาน/
            .test(
              botStatus
            )
        ) {
          active =
            false;
        }

        result.push({
          id:
            id,

          type:
            type,

          name:
            name,

          pictureUrl:
            pictureUrl,

          botStatus:
            botStatus,

          active:
            active
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
    const list =
      Array.isArray(
        targets
      )
        ? targets
        : [];

    state.selectedLineTargetIds =
      [];

    state.lineTargetDraftIds =
      [];

    state.lineTargetSearch =
      '';

    state.lineTargetFilter =
      'ALL';

    elements.lineTarget.value =
      '';

    elements.lineTargetSelector
      .classList.remove(
        'is-loading',
        'is-disabled'
      );

    elements.lineTargetSelector
      .setAttribute(
        'aria-busy',
        'false'
      );

    if (
      elements.lineTargetLimit
    ) {
      elements.lineTargetLimit
        .textContent =
        'เลือกได้สูงสุด ' +
        MAX_LINE_TARGETS;
    }

    elements.openLineTargetPickerButton
      .disabled =
      list.length < 1;

    if (
      list.length < 1
    ) {
      elements.lineTargetSelector
        .classList.add(
          'is-disabled'
        );
    }

    updateLineTargetFilterButtons();
    updateLineTargetSelectionUi();
    renderLineTargetModalList();
  }


  function setLineTargetLoading(
    text
  ) {
    state.selectedLineTargetIds =
      [];

    state.lineTargetDraftIds =
      [];

    elements.lineTarget.value =
      '';

    elements.lineTargetList
      .replaceChildren();

    const empty =
      document.createElement(
        'p'
      );

    empty.className =
      'line-target-empty';

    empty.textContent =
      text ||
      'กำลังโหลดปลายทาง LINE';

    elements.lineTargetList
      .appendChild(
        empty
      );

    elements.lineTargetSummary
      .textContent =
      text ||
      'กำลังโหลดปลายทาง LINE';

    elements.lineTargetSelector
      .classList.add(
        'is-loading'
      );

    elements.lineTargetSelector
      .setAttribute(
        'aria-busy',
        'true'
      );

    elements.openLineTargetPickerButton
      .disabled =
      true;

    elements.clearLineTargetsButton
      .disabled =
      true;

    renderSelectedLineTargetCards();
  }


  function openLineTargetModal() {
    const available =
      getAvailableLineTargets();

    if (
      available.length < 1 ||
      state.loadingOptions
    ) {
      return;
    }

    state.lineTargetDraftIds =
      state.selectedLineTargetIds
        .slice();

    state.lineTargetSearch =
      '';

    state.lineTargetFilter =
      'ALL';

    elements.lineTargetSearch.value =
      '';

    elements.clearLineTargetSearchButton
      .hidden =
      true;

    clearLineTargetModalMessage();
    updateLineTargetFilterButtons();
    renderLineTargetModalList();

    state.lineTargetModalOpen =
      true;

    elements.lineTargetModal.hidden =
      false;

    document.body.classList.add(
      'line-target-modal-open'
    );

    window.setTimeout(
      function () {
        elements.lineTargetSearch
          .focus();
      },
      80
    );
  }


  function closeLineTargetModal(
    commitSelection
  ) {
    if (
      !state.lineTargetModalOpen
    ) {
      return;
    }

    if (
      commitSelection === true
    ) {
      state.selectedLineTargetIds =
        state.lineTargetDraftIds
          .slice(
            0,
            MAX_LINE_TARGETS
          );

      clearFormError();
      clearSuccess();
    }

    state.lineTargetDraftIds =
      [];

    state.lineTargetModalOpen =
      false;

    elements.lineTargetModal.hidden =
      true;

    document.body.classList.remove(
      'line-target-modal-open'
    );

    clearLineTargetModalMessage();
    updateLineTargetSelectionUi();
    updateSubmitAvailability();

    elements.openLineTargetPickerButton
      .focus();
  }


  function handleLineTargetModalKeydown(
    event
  ) {
    if (
      !state.lineTargetModalOpen
    ) {
      return;
    }

    if (
      event.key === 'Escape'
    ) {
      event.preventDefault();

      closeLineTargetModal(
        false
      );
    }
  }


  function handleLineTargetSearch(
    event
  ) {
    state.lineTargetSearch =
      String(
        event.currentTarget.value ||
        ''
      )
        .trim()
        .toLowerCase();

    elements.clearLineTargetSearchButton
      .hidden =
      !state.lineTargetSearch;

    clearLineTargetModalMessage();
    renderLineTargetModalList();
  }


  function clearLineTargetSearch() {
    state.lineTargetSearch =
      '';

    elements.lineTargetSearch.value =
      '';

    elements.clearLineTargetSearchButton
      .hidden =
      true;

    clearLineTargetModalMessage();
    renderLineTargetModalList();

    elements.lineTargetSearch
      .focus();
  }


  function handleLineTargetFilterClick(
    event
  ) {
    const button =
      event.target.closest(
        '[data-line-target-filter]'
      );

    if (
      !button ||
      !elements.lineTargetFilters
        .contains(
          button
        )
    ) {
      return;
    }

    const filter =
      String(
        button.dataset
          .lineTargetFilter ||
        'ALL'
      ).toUpperCase();

    state.lineTargetFilter =
      [
        'ALL',
        'GROUP',
        'USER',
        'ROOM'
      ].includes(
        filter
      )
        ? filter
        : 'ALL';

    clearLineTargetModalMessage();
    updateLineTargetFilterButtons();
    renderLineTargetModalList();
  }


  function updateLineTargetFilterButtons() {
    elements.lineTargetFilters
      .querySelectorAll(
        '[data-line-target-filter]'
      )
      .forEach(
        function (button) {
          const active =
            String(
              button.dataset
                .lineTargetFilter ||
              ''
            ).toUpperCase() ===
            state.lineTargetFilter;

          button.classList.toggle(
            'is-active',
            active
          );

          button.setAttribute(
            'aria-selected',
            active
              ? 'true'
              : 'false'
          );
        }
      );
  }


  function getAvailableLineTargets() {
    return (
      state.options &&
      Array.isArray(
        state.options.lineTargets
      )
        ? state.options.lineTargets
        : []
    );
  }


  function getLineTargetById(
    targetId
  ) {
    const cleanId =
      String(
        targetId || ''
      ).trim();

    if (!cleanId) {
      return null;
    }

    return (
      getAvailableLineTargets()
        .find(
          function (target) {
            return target.id ===
              cleanId;
          }
        ) ||
      null
    );
  }


  function getFilteredLineTargets() {
    const filter =
      state.lineTargetFilter;

    const query =
      state.lineTargetSearch;

    return getAvailableLineTargets()
      .filter(
        function (target) {
          if (
            filter !== 'ALL' &&
            target.type !== filter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const haystack =
            [
              target.name,
              target.type,
              getTargetTypeLabel(
                target.type
              ),
              target.botStatus
            ]
              .join(' ')
              .toLowerCase();

          return haystack.includes(
            query
          );
        }
      );
  }


  function renderLineTargetModalList() {
    if (
      !elements.lineTargetList
    ) {
      return;
    }

    const targets =
      getFilteredLineTargets();

    const selectedCount =
      state.lineTargetDraftIds
        .length;

    const maximumReached =
      selectedCount >=
      MAX_LINE_TARGETS;

    elements.lineTargetList
      .replaceChildren();

    if (
      targets.length < 1
    ) {
      const empty =
        document.createElement(
          'p'
        );

      empty.className =
        'line-target-empty';

      empty.textContent =
        state.lineTargetSearch
          ? 'ไม่พบปลายทางที่ตรงกับคำค้นหา'
          : 'ไม่พบปลายทาง LINE ในหมวดนี้';

      elements.lineTargetList
        .appendChild(
          empty
        );

    } else {
      const fragment =
        document.createDocumentFragment();

      targets.forEach(
        function (target) {
          const selectedIndex =
            state.lineTargetDraftIds
              .indexOf(
                target.id
              );

          const selected =
            selectedIndex >= 0;

          const disabled =
            !target.active ||
            (
              maximumReached &&
              !selected
            );

          const label =
            document.createElement(
              'label'
            );

          label.className =
            'line-target-option';

          label.classList.toggle(
            'is-selected',
            selected
          );

          label.classList.toggle(
            'is-unavailable',
            disabled
          );

          label.dataset.targetId =
            target.id;

          const avatar =
            createLineTargetAvatar(
              target
            );

          const copy =
            document.createElement(
              'span'
            );

          copy.className =
            'line-target-copy';

          const name =
            document.createElement(
              'span'
            );

          name.className =
            'line-target-name';

          name.textContent =
            target.name;

          const meta =
            document.createElement(
              'span'
            );

          meta.className =
            'line-target-meta';

          const type =
            document.createElement(
              'span'
            );

          type.className =
            'line-target-type';

          type.textContent =
            getTargetTypeLabel(
              target.type
            );

          const status =
            document.createElement(
              'span'
            );

          status.className =
            'line-target-status';

          status.textContent =
            target.active
              ? (
                  target.botStatus ||
                  'พร้อมส่ง Flex'
                )
              : (
                  target.botStatus ||
                  'ไม่พร้อมใช้งาน'
                );

          meta.append(
            type,
            status
          );

          copy.append(
            name,
            meta
          );

          const choice =
            document.createElement(
              'span'
            );

          choice.className =
            'line-target-choice';

          const checkbox =
            document.createElement(
              'input'
            );

          checkbox.type =
            'checkbox';

          checkbox.className =
            'line-target-checkbox';

          checkbox.value =
            target.id;

          checkbox.dataset
            .lineTargetId =
            target.id;

          checkbox.checked =
            selected;

          checkbox.disabled =
            disabled;

          const badge =
            document.createElement(
              'span'
            );

          badge.className =
            'line-target-rank-badge';

          badge.textContent =
            selected
              ? String(
                  selectedIndex + 1
                )
              : '+';

          choice.append(
            checkbox,
            badge
          );

          label.append(
            avatar,
            copy,
            choice
          );

          fragment.appendChild(
            label
          );
        }
      );

      elements.lineTargetList
        .appendChild(
          fragment
        );
    }

    elements.lineTargetResultCount
      .textContent =
      targets.length +
      ' รายการ';

    elements.lineTargetModalSelectedCount
      .textContent =
      'เลือกแล้ว ' +
      selectedCount +
      '/' +
      MAX_LINE_TARGETS;

    elements.clearLineTargetDraftButton
      .disabled =
      selectedCount < 1;

    elements.confirmLineTargetSelectionButton
      .textContent =
      selectedCount > 0
        ? (
            'ยืนยัน ' +
            selectedCount +
            ' ปลายทาง'
          )
        : 'ยืนยันการเลือก';
  }


  function createLineTargetAvatar(
    target
  ) {
    const avatar =
      document.createElement(
        'span'
      );

    avatar.className =
      'line-target-avatar ' +
      (
        target.type === 'GROUP'
          ? 'is-group'
          : (
              target.type === 'USER'
                ? 'is-user'
                : (
                    target.type === 'ROOM'
                      ? 'is-room'
                      : ''
                  )
            )
      );

    if (
      target.pictureUrl &&
      /^https:\/\//i.test(
        target.pictureUrl
      )
    ) {
      const image =
        document.createElement(
          'img'
        );

      image.src =
        target.pictureUrl;

      image.alt =
        '';

      image.loading =
        'lazy';

      image.referrerPolicy =
        'no-referrer';

      image.addEventListener(
        'error',
        function () {
          avatar.replaceChildren(
            document.createTextNode(
              getTargetAvatarText(
                target
              )
            )
          );
        },
        {
          once:
            true
        }
      );

      avatar.appendChild(
        image
      );

    } else {
      avatar.textContent =
        getTargetAvatarText(
          target
        );
    }

    return avatar;
  }


  function getTargetAvatarText(
    target
  ) {
    if (
      target.type === 'GROUP'
    ) {
      return 'G';
    }

    if (
      target.type === 'ROOM'
    ) {
      return 'R';
    }

    const firstCharacter =
      Array.from(
        String(
          target.name || 'U'
        ).trim()
      )[0];

    return firstCharacter ||
      'U';
  }


  function handleLineTargetDraftChange(
    event
  ) {
    const checkbox =
      event.target &&
      event.target.matches(
        '[data-line-target-id]'
      )
        ? event.target
        : null;

    if (!checkbox) {
      return;
    }

    const targetId =
      String(
        checkbox.dataset
          .lineTargetId ||
        checkbox.value ||
        ''
      ).trim();

    const target =
      getLineTargetById(
        targetId
      );

    if (
      !target ||
      !target.active
    ) {
      checkbox.checked =
        false;

      showLineTargetModalMessage(
        'ปลายทางนี้ยังไม่พร้อมรับ Flex Message'
      );

      renderLineTargetModalList();
      return;
    }

    const existingIndex =
      state.lineTargetDraftIds
        .indexOf(
          targetId
        );

    if (
      checkbox.checked
    ) {
      if (
        existingIndex >= 0
      ) {
        return;
      }

      if (
        state.lineTargetDraftIds
          .length >=
        MAX_LINE_TARGETS
      ) {
        checkbox.checked =
          false;

        showLineTargetModalMessage(
          'เลือกได้สูงสุด ' +
          MAX_LINE_TARGETS +
          ' ปลายทาง กรุณายกเลิกรายการเดิมก่อน'
        );

        renderLineTargetModalList();
        return;
      }

      state.lineTargetDraftIds
        .push(
          targetId
        );

    } else if (
      existingIndex >= 0
    ) {
      state.lineTargetDraftIds
        .splice(
          existingIndex,
          1
        );
    }

    clearLineTargetModalMessage();
    renderLineTargetModalList();
  }


  function showLineTargetModalMessage(
    message
  ) {
    elements.lineTargetModalMessage
      .textContent =
      message;

    elements.lineTargetModalMessage
      .hidden =
      false;
  }


  function clearLineTargetModalMessage() {
    elements.lineTargetModalMessage
      .textContent =
      '';

    elements.lineTargetModalMessage
      .hidden =
      true;
  }


  function updateLineTargetSelectionUi() {
    const selectedTargets =
      getSelectedLineTargets();

    const selectedCount =
      selectedTargets.length;

    const firstTarget =
      selectedTargets[0] ||
      null;

    elements.lineTarget.value =
      firstTarget
        ? firstTarget.id
        : '';

    elements.lineTargetSummary
      .textContent =
      selectedCount > 0
        ? (
            'เลือกแล้ว ' +
            selectedCount +
            '/' +
            MAX_LINE_TARGETS +
            ' ปลายทาง'
          )
        : 'เลือกกลุ่มหรือบุคคล';

    if (
      elements.lineTargetSelectionHint
    ) {
      elements.lineTargetSelectionHint
        .textContent =
        selectedCount > 0
          ? 'ลำดับด้านล่างคือลำดับการส่ง Flex'
          : 'ต้องเลือกอย่างน้อย 1 ปลายทาง';
    }

    elements.clearLineTargetsButton
      .disabled =
      selectedCount < 1;

    elements.lineTargetSelector
      .classList.toggle(
        'has-selection',
        selectedCount > 0
      );

    renderSelectedLineTargetCards();
  }


  function renderSelectedLineTargetCards() {
    elements.selectedLineTargetList
      .replaceChildren();

    const selectedTargets =
      getSelectedLineTargets();

    if (
      selectedTargets.length < 1
    ) {
      const empty =
        document.createElement(
          'p'
        );

      empty.className =
        'selected-line-target-empty';

      empty.textContent =
        'ยังไม่ได้เลือกปลายทาง LINE';

      elements.selectedLineTargetList
        .appendChild(
          empty
        );

      return;
    }

    const fragment =
      document.createDocumentFragment();

    selectedTargets.forEach(
      function (
        target,
        index
      ) {
        const card =
          document.createElement(
            'article'
          );

        card.className =
          'selected-line-target-card';

        card.dataset.targetId =
          target.id;

        const rank =
          document.createElement(
            'span'
          );

        rank.className =
          'selected-line-target-rank';

        rank.textContent =
          String(
            index + 1
          );

        const copy =
          document.createElement(
            'span'
          );

        copy.className =
          'selected-line-target-copy';

        const name =
          document.createElement(
            'strong'
          );

        name.textContent =
          target.name;

        const type =
          document.createElement(
            'span'
          );

        type.textContent =
          getTargetTypeLabel(
            target.type
          );

        copy.append(
          name,
          type
        );

        const actions =
          document.createElement(
            'span'
          );

        actions.className =
          'selected-line-target-actions';

        const upButton =
          document.createElement(
            'button'
          );

        upButton.type =
          'button';

        upButton.className =
          'selected-line-target-action';

        upButton.dataset
          .lineTargetAction =
          'up';

        upButton.dataset.targetId =
          target.id;

        upButton.disabled =
          index === 0;

        upButton.setAttribute(
          'aria-label',
          'เลื่อนขึ้น'
        );

        upButton.textContent =
          '↑';

        const downButton =
          document.createElement(
            'button'
          );

        downButton.type =
          'button';

        downButton.className =
          'selected-line-target-action';

        downButton.dataset
          .lineTargetAction =
          'down';

        downButton.dataset.targetId =
          target.id;

        downButton.disabled =
          index ===
          selectedTargets.length - 1;

        downButton.setAttribute(
          'aria-label',
          'เลื่อนลง'
        );

        downButton.textContent =
          '↓';

        const removeButton =
          document.createElement(
            'button'
          );

        removeButton.type =
          'button';

        removeButton.className =
          'selected-line-target-action';

        removeButton.dataset
          .lineTargetAction =
          'remove';

        removeButton.dataset.targetId =
          target.id;

        removeButton.setAttribute(
          'aria-label',
          'นำออก'
        );

        removeButton.textContent =
          '×';

        actions.append(
          upButton,
          downButton,
          removeButton
        );

        card.append(
          rank,
          copy,
          actions
        );

        fragment.appendChild(
          card
        );
      }
    );

    elements.selectedLineTargetList
      .appendChild(
        fragment
      );
  }


  function handleSelectedLineTargetAction(
    event
  ) {
    const button =
      event.target.closest(
        '[data-line-target-action]'
      );

    if (
      !button ||
      !elements.selectedLineTargetList
        .contains(
          button
        )
    ) {
      return;
    }

    const targetId =
      String(
        button.dataset.targetId ||
        ''
      ).trim();

    const action =
      String(
        button.dataset
          .lineTargetAction ||
        ''
      );

    const index =
      state.selectedLineTargetIds
        .indexOf(
          targetId
        );

    if (
      index < 0
    ) {
      return;
    }

    if (
      action === 'remove'
    ) {
      state.selectedLineTargetIds
        .splice(
          index,
          1
        );

    } else if (
      action === 'up' &&
      index > 0
    ) {
      moveArrayItem(
        state.selectedLineTargetIds,
        index,
        index - 1
      );

    } else if (
      action === 'down' &&
      index <
        state
          .selectedLineTargetIds
          .length - 1
    ) {
      moveArrayItem(
        state.selectedLineTargetIds,
        index,
        index + 1
      );
    }

    clearFormError();
    clearSuccess();
    updateLineTargetSelectionUi();
    updateSubmitAvailability();
  }


  function moveArrayItem(
    list,
    fromIndex,
    toIndex
  ) {
    if (
      !Array.isArray(list) ||
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= list.length ||
      toIndex >= list.length
    ) {
      return;
    }

    const item =
      list.splice(
        fromIndex,
        1
      )[0];

    list.splice(
      toIndex,
      0,
      item
    );
  }


  function getSelectedLineTargets(
    targetIds
  ) {
    const ids =
      Array.isArray(
        targetIds
      )
        ? targetIds
        : state.selectedLineTargetIds;

    return ids
      .map(
        function (targetId) {
          return getLineTargetById(
            targetId
          );
        }
      )
      .filter(
        Boolean
      );
  }


  function clearLineTargetSelection(
    notifyChange
  ) {
    state.selectedLineTargetIds =
      [];

    state.lineTargetDraftIds =
      [];

    elements.lineTarget.value =
      '';

    updateLineTargetSelectionUi();

    if (
      notifyChange !== false
    ) {
      clearFormError();
      clearSuccess();
      updateSubmitAvailability();
    }
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
    updateSubmitAvailability();
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
    updateSubmitAvailability();
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

      const selectedTargets =
        getSelectedLineTargets();

      if (
        selectedTargets.length < 1
      ) {
        throw new Error(
          'กรุณาเลือกปลายทาง LINE อย่างน้อย 1 ปลายทาง'
        );
      }

      const primaryTarget =
        selectedTargets[0];

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

        /*
         * lineTargets คือโครงสร้างใหม่สำหรับส่งหลายปลายทาง
         * ส่วน lineTargetType/Id/Name เก็บปลายทางแรก
         * เพื่อให้ระบบเดิมยังอ่านข้อมูลได้
         */
        lineTargets:
          selectedTargets.map(
            function (target) {
              return {
                type:
                  target.type,

                id:
                  target.id,

                name:
                  target.name
              };
            }
          ),

        lineTargetType:
          primaryTarget.type,

        lineTargetId:
          primaryTarget.id,

        lineTargetName:
          primaryTarget.name,

        evidenceFiles:
          evidenceFiles
      };

      updateProgress(
        72,
        'กำลังอัปโหลดไฟล์ และเตรียมส่ง ' +
        selectedTargets.length +
        ' ปลายทาง'
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

      resetFormAfterSuccessfulSubmit();

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

    const selectedTargets =
      getSelectedLineTargets();

    if (
      selectedTargets.length < 1
    ) {
      elements.lineTargetSelector
        .scrollIntoView({
          behavior:
            'smooth',

          block:
            'center'
        });

      throw new Error(
        'กรุณาเลือกปลายทาง LINE อย่างน้อย 1 ปลายทาง'
      );
    }

    if (
      selectedTargets.length >
      MAX_LINE_TARGETS
    ) {
      throw new Error(
        'เลือกปลายทาง LINE ได้สูงสุด ' +
        MAX_LINE_TARGETS +
        ' ปลายทาง'
      );
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

    const total =
      Number(
        data.flexTargetCount ||
        data.targetCount ||
        (
          data.flexSummary &&
          data.flexSummary.total
        ) ||
        0
      );

    const sent =
      Number(
        data.flexSentCount ||
        data.sentCount ||
        (
          data.flexSummary &&
          (
            data.flexSummary.successCount ||
            data.flexSummary.sent
          )
        ) ||
        0
      );

    const failed =
      Number(
        data.flexFailedCount ||
        data.failedCount ||
        (
          data.flexSummary &&
          (
            data.flexSummary.failedCount ||
            data.flexSummary.failed
          )
        ) ||
        0
      );

    const deliveryResults =
      normalizeDeliveryResults(
        data.flexResults ||
        (
          data.flexSummary &&
          data.flexSummary.results
        ) ||
        []
      );

    elements.successPanel
      .classList.remove(
        'is-partial',
        'is-failed'
      );

    elements.successMark
      .textContent =
      '✓';

    if (
      total > 0
    ) {
      if (
        sent === total
      ) {
        elements.successFlexStatus
          .textContent =
          'ส่ง Flex Message สำเร็จ ' +
          sent +
          '/' +
          total +
          ' ปลายทาง';

      } else if (
        sent > 0
      ) {
        elements.successPanel
          .classList.add(
            'is-partial'
          );

        elements.successMark
          .textContent =
          '!';

        elements.successFlexStatus
          .textContent =
          'ส่ง Flex สำเร็จ ' +
          sent +
          '/' +
          total +
          ' ปลายทาง' +
          (
            failed > 0
              ? ' · ไม่สำเร็จ ' +
                failed
              : ''
          );

      } else {
        elements.successPanel
          .classList.add(
            'is-failed'
          );

        elements.successMark
          .textContent =
          '!';

        elements.successFlexStatus
          .textContent =
          'บันทึกข้อมูลแล้ว แต่ยังส่ง Flex ไม่สำเร็จ';
      }

    } else if (
      data.flexSent === true
    ) {
      elements.successFlexStatus
        .textContent =
        'ส่ง Flex Message เรียบร้อยแล้ว';

    } else {
      elements.successPanel
        .classList.add(
          'is-failed'
        );

      elements.successMark
        .textContent =
        '!';

      elements.successFlexStatus
        .textContent =
        'บันทึกข้อมูลแล้ว แต่การส่ง Flex Message ยังไม่สำเร็จ';
    }

    renderDeliveryResults(
      deliveryResults
    );

    const markFlexError =
      String(
        data.markFlexError ||
        ''
      ).trim();

    if (
      markFlexError
    ) {
      elements.successDeliveryNote
        .textContent =
        'หมายเหตุ: ส่ง Flex แล้ว แต่บันทึกผลการส่งลงชีตไม่สมบูรณ์ — ' +
        markFlexError;

      elements.successDeliveryNote.hidden =
        false;

    } else {
      elements.successDeliveryNote
        .textContent =
        '';

      elements.successDeliveryNote.hidden =
        true;
    }

    elements.successPanel.hidden =
      false;
  }


  function normalizeDeliveryResults(
    source
  ) {
    if (
      !Array.isArray(
        source
      )
    ) {
      return [];
    }

    return source
      .map(
        function (
          item,
          index
        ) {
          const result =
            item &&
            typeof item === 'object'
              ? item
              : {};

          const targetId =
            String(
              result.targetId ||
              result.id ||
              ''
            ).trim();

          const targetName =
            String(
              result.targetName ||
              result.name ||
              targetId ||
              'ปลายทาง LINE'
            ).trim();

          const targetType =
            String(
              result.targetType ||
              result.type ||
              'LINE'
            )
              .trim()
              .toUpperCase();

          const sent =
            result.sent === true ||
            String(
              result.status ||
              ''
            ).toUpperCase() ===
              'SUCCESS';

          return {
            order:
              Number(
                result.order
              ) ||
              index + 1,

            targetId:
              targetId,

            targetName:
              targetName,

            targetType:
              targetType,

            sent:
              sent,

            message:
              String(
                result.message ||
                ''
              ).trim()
          };
        }
      )
      .slice(
        0,
        MAX_LINE_TARGETS
      );
  }


  function renderDeliveryResults(
    results
  ) {
    elements.successDeliveryList
      .replaceChildren();

    if (
      !Array.isArray(
        results
      ) ||
      results.length < 1
    ) {
      elements.successDeliveryList.hidden =
        true;

      return;
    }

    results.forEach(
      function (
        result,
        index
      ) {
        const item =
          document.createElement(
            'article'
          );

        item.className =
          'success-delivery-item' +
          (
            result.sent
              ? ''
              : ' is-failed'
          );

        const order =
          document.createElement(
            'span'
          );

        order.className =
          'success-delivery-order';

        order.textContent =
          String(
            result.order ||
            index + 1
          );

        const info =
          document.createElement(
            'div'
          );

        info.className =
          'success-delivery-info';

        const name =
          document.createElement(
            'strong'
          );

        name.textContent =
          result.targetName;

        const type =
          document.createElement(
            'small'
          );

        type.textContent =
          getTargetTypeLabel(
            result.targetType
          ) +
          ' LINE';

        info.append(
          name,
          type
        );

        const status =
          document.createElement(
            'span'
          );

        status.className =
          'success-delivery-status' +
          (
            result.sent
              ? ''
              : ' is-failed'
          );

        status.textContent =
          result.sent
            ? 'ส่งสำเร็จ'
            : 'ไม่สำเร็จ';

        item.append(
          order,
          info,
          status
        );

        if (
          !result.sent &&
          result.message
        ) {
          const error =
            document.createElement(
              'p'
            );

          error.className =
            'success-delivery-error';

          error.textContent =
            result.message;

          item.appendChild(
            error
          );
        }

        elements.successDeliveryList
          .appendChild(
            item
          );
      }
    );

    elements.successDeliveryList.hidden =
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

    elements.successPanel
      .classList.remove(
        'is-partial',
        'is-failed'
      );

    elements.successMark
      .textContent =
      '✓';

    elements.successCaseId
      .textContent =
      '';

    elements.successFlexStatus
      .textContent =
      '';

    elements.successDeliveryList
      .replaceChildren();

    elements.successDeliveryList.hidden =
      true;

    elements.successDeliveryNote
      .textContent =
      '';

    elements.successDeliveryNote.hidden =
      true;
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
   * Reset after successful submit
   ************************************************************/

  function resetFormAfterSuccessfulSubmit() {
    /*
     * ล้างค่าช่องกรอกและปลายทาง LINE
     * แต่ไม่ล้างกล่องข้อความสำเร็จ เพื่อให้ผู้ใช้เห็นรหัสปัญหา
     */
    elements.form.reset();

    clearLineTargetSelection(
      false
    );

    resetEvidenceFiles();

    updateCounters();
    updateFileSummary();
    clearFormError();

    /*
     * ปุ่มจะถูกปิดไว้จนกว่าจะกรอกข้อมูลใหม่ครบ
     * จึงไม่สามารถบันทึกรายการเดิมซ้ำได้
     */
    updateSubmitAvailability();
  }


  function resetEvidenceFiles() {
    for (
      let index = 0;
      index < state.files.length;
      index++
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

      if (input) {
        input.value =
          '';
      }

      if (media) {
        media.replaceChildren();
      }

      if (name) {
        name.textContent =
          '';
      }

      if (size) {
        size.textContent =
          '';
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
    }
  }


  /************************************************************
   * Status / Loading
   ************************************************************/

  function updateSubmitAvailability() {
    elements.submitButton.disabled =
      !state.ready ||
      state.loadingOptions ||
      state.submitting ||
      !isFormReadyForSubmit();
  }


  function isFormReadyForSubmit() {
    if (
      !elements.workShift ||
      !elements.osm ||
      !elements.otm ||
      !elements.lineTargetSelector ||
      !elements.unsafeActionType ||
      !elements.problemDetail
    ) {
      return false;
    }

    const requiredValues = [
      elements.workShift.value,
      elements.osm.value,
      elements.otm.value,
      elements.unsafeActionType.value,
      elements.problemDetail.value
    ];

    const fieldsComplete =
      requiredValues.every(
        function (value) {
          return Boolean(
            String(
              value || ''
            ).trim()
          );
        }
      );

    const hasLineTarget =
      getSelectedLineTargets()
        .length > 0;

    const hasEvidence =
      state.files.some(
        Boolean
      );

    return (
      fieldsComplete &&
      hasLineTarget &&
      hasEvidence
    );
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
