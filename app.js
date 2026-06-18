/**
 * app.js
 * การทำงานหน้าแจ้งการกระทำที่ไม่ปลอดภัย
 */

(function (
  window,
  document
) {
  'use strict';

  const CONFIG =
    window.APP_CONFIG || {};

  const API =
    window.SafetyAPI;

  const state = {
    initialized:
      false,

    systemReady:
      false,

    liffReady:
      false,

    loggedIn:
      false,

    inClient:
      false,

    friendFlag:
      false,

    profile:
      null,

    options: {
      shifts: [],
      osm: [],
      otm: []
    },

    files: [
      null,
      null,
      null
    ],

    objectUrls: [
      '',
      '',
      ''
    ],

    toastTimer:
      null
  };


  const elements = {};


  document.addEventListener(
    'DOMContentLoaded',
    initialize
  );


  async function initialize() {
    cacheElements();
    bindEvents();
    configureStaticContent();
    startClock();

    setLoading(
      true,
      'กำลังตรวจสอบระบบ...'
    );

    try {
      await loadSystemData();

      await initializeLine();

      state.initialized =
        true;

    } catch (error) {
      showSystemError(
        getErrorMessage(error)
      );

    } finally {
      setLoading(false);
    }
  }


  function cacheElements() {
    elements.loadingOverlay =
      document.getElementById(
        'loadingOverlay'
      );

    elements.loadingText =
      document.getElementById(
        'loadingText'
      );

    elements.appLogo =
      document.getElementById(
        'appLogo'
      );

    elements.apiStatus =
      document.getElementById(
        'apiStatus'
      );

    elements.modeStatus =
      document.getElementById(
        'modeStatus'
      );

    elements.currentClock =
      document.getElementById(
        'currentClock'
      );

    elements.systemError =
      document.getElementById(
        'systemError'
      );

    elements.systemErrorText =
      document.getElementById(
        'systemErrorText'
      );

    elements.retryButton =
      document.getElementById(
        'retryButton'
      );

    elements.userAvatar =
      document.getElementById(
        'userAvatar'
      );

    elements.userDisplayName =
      document.getElementById(
        'userDisplayName'
      );

    elements.userId =
      document.getElementById(
        'userId'
      );

    elements.loginStatus =
      document.getElementById(
        'loginStatus'
      );

    elements.friendStatus =
      document.getElementById(
        'friendStatus'
      );

    elements.lineLoginButton =
      document.getElementById(
        'lineLoginButton'
      );

    elements.addFriendButton =
      document.getElementById(
        'addFriendButton'
      );

    elements.liffNotice =
      document.getElementById(
        'liffNotice'
      );

    elements.reportForm =
      document.getElementById(
        'reportForm'
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

    elements.details =
      document.getElementById(
        'details'
      );

    elements.detailsCount =
      document.getElementById(
        'detailsCount'
      );

    elements.fileCounter =
      document.getElementById(
        'fileCounter'
      );

    elements.fileError =
      document.getElementById(
        'fileError'
      );

    elements.validationResult =
      document.getElementById(
        'validationResult'
      );

    elements.validationResultContent =
      document.getElementById(
        'validationResultContent'
      );

    elements.validateButton =
      document.getElementById(
        'validateButton'
      );

    elements.toast =
      document.getElementById(
        'toast'
      );

    elements.fileInputs =
      Array.from(
        document.querySelectorAll(
          '.file-input'
        )
      );
  }


  function bindEvents() {
    elements.retryButton
      .addEventListener(
        'click',
        retryInitialization
      );

    elements.lineLoginButton
      .addEventListener(
        'click',
        loginWithLine
      );

    elements.addFriendButton
      .addEventListener(
        'click',
        requestLineFriendship
      );

    elements.details
      .addEventListener(
        'input',
        updateDetailsCount
      );

    elements.reportForm
      .addEventListener(
        'submit',
        handleFormSubmit
      );

    elements.fileInputs
      .forEach(
        function (input) {
          input.addEventListener(
            'change',
            handleFileChange
          );
        }
      );
  }


  function configureStaticContent() {
    elements.appLogo.src =
      CONFIG.LOGO_URL || '';

    elements.appLogo.onerror =
      function () {
        elements.appLogo
          .removeAttribute(
            'src'
          );
      };

    elements.userAvatar.src =
      createDefaultAvatar();
  }


  async function retryInitialization() {
    hideSystemError();

    setLoading(
      true,
      'กำลังเชื่อมต่อใหม่...'
    );

    try {
      await loadSystemData();

      await initializeLine();

      showToast(
        'เชื่อมต่อระบบสำเร็จ',
        'success'
      );

    } catch (error) {
      showSystemError(
        getErrorMessage(error)
      );

    } finally {
      setLoading(false);
    }
  }


  async function loadSystemData() {
    if (!API) {
      throw new Error(
        'ไม่พบไฟล์ api.js'
      );
    }

    setApiStatus(
      'กำลังตรวจระบบ',
      'waiting'
    );

    const healthResult =
      await API.health();

    if (
      !healthResult ||
      healthResult.ok !== true
    ) {
      throw new Error(
        'Worker หรือ Apps Script ยังไม่พร้อมใช้งาน'
      );
    }

    const optionsResult =
      await API.getOptions();

    const data =
      optionsResult.data || {};

    state.options = {
      shifts:
        Array.isArray(
          data.shifts
        )
          ? data.shifts
          : [],

      osm:
        Array.isArray(
          data.osm
        )
          ? data.osm
          : [],

      otm:
        Array.isArray(
          data.otm
        )
          ? data.otm
          : []
    };

    populateSelect(
      elements.workShift,
      state.options.shifts,
      'เลือกกะทำงาน'
    );

    populateSelect(
      elements.osm,
      state.options.osm,
      'เลือก OSM'
    );

    populateSelect(
      elements.otm,
      state.options.otm,
      'เลือก OTM'
    );

    state.systemReady =
      true;

    setApiStatus(
      'ระบบพร้อมใช้งาน',
      'success'
    );

    hideSystemError();
  }


  function populateSelect(
    selectElement,
    values,
    placeholder
  ) {
    selectElement.innerHTML =
      '';

    const emptyOption =
      document.createElement(
        'option'
      );

    emptyOption.value =
      '';

    emptyOption.textContent =
      placeholder;

    selectElement.appendChild(
      emptyOption
    );

    values.forEach(
      function (value) {
        const cleanValue =
          String(
            value || ''
          ).trim();

        if (!cleanValue) {
          return;
        }

        const option =
          document.createElement(
            'option'
          );

        option.value =
          cleanValue;

        option.textContent =
          cleanValue;

        selectElement.appendChild(
          option
        );
      }
    );

    selectElement.disabled =
      values.length === 0;
  }


  async function initializeLine() {
    resetLineDisplay();

    const liffId =
      String(
        CONFIG.LIFF_ID || ''
      ).trim();

    if (
      !liffId ||
      liffId.includes(
        'YOUR_'
      )
    ) {
      elements.modeStatus
        .textContent =
          'WEB';

      setStatusChip(
        elements.modeStatus,
        'neutral'
      );

      showLiffNotice(
        'ยังไม่ได้ตั้งค่า LIFF ID หน้าเว็บสามารถทดสอบ Worker และรายการ OSM/OTM ได้ แต่ยังไม่สามารถอ่านข้อมูลผู้ใช้ LINE'
      );

      return;
    }

    if (
      !window.liff
    ) {
      throw new Error(
        'โหลด LINE LIFF SDK ไม่สำเร็จ'
      );
    }

    setLoading(
      true,
      'กำลังเชื่อมต่อ LINE...'
    );

    await window.liff.init({
      liffId:
        liffId,

      withLoginOnExternalBrowser:
        true
    });

    state.liffReady =
      true;

    state.inClient =
      window.liff.isInClient();

    elements.modeStatus
      .textContent =
        state.inClient
          ? 'LIFF'
          : 'WEB + LINE';

    setStatusChip(
      elements.modeStatus,
      state.inClient
        ? 'success'
        : 'neutral'
    );

    if (
      !window.liff.isLoggedIn()
    ) {
      state.loggedIn =
        false;

      elements.lineLoginButton
        .classList
        .remove('hidden');

      setStatusText(
        elements.loginStatus,
        'ยังไม่เข้าสู่ระบบ',
        'neutral'
      );

      showLiffNotice(
        'กรุณาเข้าสู่ระบบ LINE เพื่อยืนยันตัวตนผู้บันทึก'
      );

      return;
    }

    await verifyCurrentLineUser();
  }


  async function verifyCurrentLineUser() {
    const accessToken =
      window.liff
        .getAccessToken();

    if (!accessToken) {
      throw new Error(
        'ไม่พบ LINE Access Token'
      );
    }

    const result =
      await API.verifyLine(
        accessToken
      );

    const data =
      result.data || {};

    const profile =
      data.profile || {};

    state.loggedIn =
      data.authenticated === true;

    state.friendFlag =
      data.friendFlag === true;

    state.profile = {
      userId:
        String(
          profile.userId || ''
        ),

      displayName:
        String(
          profile.displayName || ''
        ),

      pictureUrl:
        String(
          profile.pictureUrl || ''
        ),

      statusMessage:
        String(
          profile.statusMessage || ''
        )
    };

    renderLineProfile();

    elements.lineLoginButton
      .classList
      .add('hidden');

    if (
      state.friendFlag
    ) {
      elements.addFriendButton
        .classList
        .add('hidden');

      hideLiffNotice();

    } else {
      elements.addFriendButton
        .classList
        .remove('hidden');

      showLiffNotice(
        'คุณเข้าสู่ระบบแล้ว แต่ยังไม่ได้เพิ่ม LINE Bot เป็นเพื่อน'
      );
    }
  }


  function renderLineProfile() {
    const profile =
      state.profile || {};

    elements.userDisplayName
      .textContent =
        profile.displayName ||
        'ผู้ใช้งาน LINE';

    elements.userId
      .textContent =
        'LINE User ID: ' +
        (
          profile.userId ||
          '-'
        );

    elements.userAvatar.src =
      profile.pictureUrl ||
      createDefaultAvatar();

    setStatusText(
      elements.loginStatus,
      'ยืนยันตัวตนแล้ว',
      'success'
    );

    if (
      state.friendFlag
    ) {
      setStatusText(
        elements.friendStatus,
        'เพิ่ม Bot เป็นเพื่อนแล้ว',
        'success'
      );

    } else {
      setStatusText(
        elements.friendStatus,
        'ยังไม่ได้เพิ่มเพื่อน',
        'waiting'
      );
    }
  }


  function resetLineDisplay() {
    state.liffReady =
      false;

    state.loggedIn =
      false;

    state.inClient =
      false;

    state.friendFlag =
      false;

    state.profile =
      null;

    elements.userDisplayName
      .textContent =
        'ยังไม่ได้เข้าสู่ระบบ LINE';

    elements.userId
      .textContent =
        'LINE User ID: -';

    elements.userAvatar.src =
      createDefaultAvatar();

    elements.lineLoginButton
      .classList
      .add('hidden');

    elements.addFriendButton
      .classList
      .add('hidden');

    setStatusText(
      elements.loginStatus,
      'ยังไม่เข้าสู่ระบบ',
      'neutral'
    );

    setStatusText(
      elements.friendStatus,
      'ยังไม่ตรวจสอบเพื่อน',
      'neutral'
    );
  }


  function loginWithLine() {
    if (
      !state.liffReady ||
      !window.liff
    ) {
      showToast(
        'LIFF ยังไม่พร้อมใช้งาน',
        'error'
      );

      return;
    }

    if (
      window.liff.isLoggedIn()
    ) {
      verifyCurrentLineUser()
        .catch(
          function (error) {
            showToast(
              getErrorMessage(error),
              'error'
            );
          }
        );

      return;
    }

    window.liff.login({
      redirectUri:
        window.location.href
    });
  }


  async function requestLineFriendship() {
    if (
      !state.liffReady ||
      !window.liff
    ) {
      showToast(
        'LIFF ยังไม่พร้อมใช้งาน',
        'error'
      );

      return;
    }

    if (
      typeof window.liff
        .requestFriendship !==
        'function'
    ) {
      showToast(
        'LIFF รุ่นนี้ยังไม่รองรับการขอเพิ่มเพื่อนจากหน้าเว็บ',
        'error'
      );

      return;
    }

    setLoading(
      true,
      'กำลังเปิดหน้าต่างเพิ่มเพื่อน...'
    );

    try {
      await window.liff
        .requestFriendship();

      await verifyCurrentLineUser();

      if (
        state.friendFlag
      ) {
        showToast(
          'เพิ่ม LINE Bot เป็นเพื่อนสำเร็จ',
          'success'
        );

      } else {
        showToast(
          'ยังไม่พบสถานะการเพิ่มเพื่อน',
          'error'
        );
      }

    } catch (error) {
      showToast(
        getErrorMessage(error),
        'error'
      );

    } finally {
      setLoading(false);
    }
  }


  function handleFileChange(event) {
    const input =
      event.currentTarget;

    const index =
      Number(
        input.dataset.index
      );

    const file =
      input.files &&
      input.files[0]
        ? input.files[0]
        : null;

    clearFieldError(
      'files'
    );

    if (!file) {
      removeFile(index);
      return;
    }

    try {
      validateFile(file);

      setFile(
        index,
        file
      );

    } catch (error) {
      input.value =
        '';

      removeFile(index);

      elements.fileError
        .textContent =
          getErrorMessage(error);

      showToast(
        getErrorMessage(error),
        'error'
      );
    }
  }


  function validateFile(file) {
    const type =
      String(
        file.type || ''
      ).toLowerCase();

    const isImage =
      type.startsWith(
        'image/'
      );

    const isVideo =
      type.startsWith(
        'video/'
      );

    if (
      !isImage &&
      !isVideo
    ) {
      throw new Error(
        'รองรับเฉพาะไฟล์ภาพหรือวิดีโอ'
      );
    }

    if (
      isImage &&
      file.size >
        Number(
          CONFIG.MAX_IMAGE_BYTES
        )
    ) {
      throw new Error(
        'ภาพต้องมีขนาดไม่เกิน ' +
        formatBytes(
          CONFIG.MAX_IMAGE_BYTES
        )
      );
    }

    if (
      isVideo &&
      file.size >
        Number(
          CONFIG.MAX_VIDEO_BYTES
        )
    ) {
      throw new Error(
        'วิดีโอต้องมีขนาดไม่เกิน ' +
        formatBytes(
          CONFIG.MAX_VIDEO_BYTES
        )
      );
    }
  }


  function setFile(
    index,
    file
  ) {
    revokeObjectUrl(index);

    state.files[index] =
      file;

    state.objectUrls[index] =
      URL.createObjectURL(
        file
      );

    renderFilePreview(index);
    updateFileCounter();
  }


  function renderFilePreview(index) {
    const preview =
      document.querySelector(
        '[data-preview="' +
        index +
        '"]'
      );

    const picker =
      document.querySelector(
        '[data-slot="' +
        index +
        '"] .file-picker'
      );

    const file =
      state.files[index];

    if (
      !preview ||
      !picker ||
      !file
    ) {
      return;
    }

    picker.classList
      .add('hidden');

    preview.innerHTML =
      '';

    preview.classList
      .remove('hidden');

    const media =
      file.type.startsWith(
        'video/'
      )
        ? document.createElement(
            'video'
          )
        : document.createElement(
            'img'
          );

    media.src =
      state.objectUrls[index];

    if (
      media.tagName ===
      'VIDEO'
    ) {
      media.controls =
        true;

      media.playsInline =
        true;

      media.preload =
        'metadata';
    }

    const removeButton =
      document.createElement(
        'button'
      );

    removeButton.type =
      'button';

    removeButton.className =
      'remove-file';

    removeButton.setAttribute(
      'aria-label',
      'ลบไฟล์'
    );

    removeButton.textContent =
      '×';

    removeButton.addEventListener(
      'click',
      function () {
        removeFile(index);
      }
    );

    const meta =
      document.createElement(
        'div'
      );

    meta.className =
      'preview-meta';

    const name =
      document.createElement(
        'div'
      );

    name.className =
      'preview-name';

    name.textContent =
      file.name;

    const size =
      document.createElement(
        'div'
      );

    size.className =
      'preview-size';

    size.textContent =
      formatBytes(
        file.size
      );

    meta.appendChild(name);
    meta.appendChild(size);

    preview.appendChild(
      removeButton
    );

    preview.appendChild(media);
    preview.appendChild(meta);
  }


  function removeFile(index) {
    revokeObjectUrl(index);

    state.files[index] =
      null;

    const input =
      elements.fileInputs[index];

    if (input) {
      input.value =
        '';
    }

    const preview =
      document.querySelector(
        '[data-preview="' +
        index +
        '"]'
      );

    const picker =
      document.querySelector(
        '[data-slot="' +
        index +
        '"] .file-picker'
      );

    if (preview) {
      preview.innerHTML =
        '';

      preview.classList
        .add('hidden');
    }

    if (picker) {
      picker.classList
        .remove('hidden');
    }

    updateFileCounter();
  }


  function revokeObjectUrl(index) {
    const url =
      state.objectUrls[index];

    if (url) {
      URL.revokeObjectURL(url);
    }

    state.objectUrls[index] =
      '';
  }


  function updateFileCounter() {
    const count =
      state.files.filter(
        Boolean
      ).length;

    elements.fileCounter
      .textContent =
        count +
        '/' +
        Number(
          CONFIG.MAX_FILES || 3
        );
  }


  function updateDetailsCount() {
    const count =
      elements.details
        .value
        .length;

    elements.detailsCount
      .textContent =
        count + '/2000';
  }


  function handleFormSubmit(event) {
    event.preventDefault();

    clearAllErrors();

    const formData = {
      workShift:
        elements.workShift.value,

      osm:
        elements.osm.value,

      otm:
        elements.otm.value,

      details:
        elements.details
          .value
          .trim(),

      files:
        state.files.filter(
          Boolean
        )
    };

    const valid =
      validateForm(formData);

    if (!valid) {
      showToast(
        'กรุณาตรวจสอบข้อมูลที่ระบุ',
        'error'
      );

      focusFirstInvalid();
      return;
    }

    renderValidationResult(
      formData
    );

    showToast(
      'ตรวจสอบข้อมูลครบถ้วนแล้ว',
      'success'
    );

    elements.validationResult
      .scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
  }


  function validateForm(data) {
    let valid = true;

    if (!data.workShift) {
      setFieldError(
        'workShift',
        'กรุณาเลือกกะทำงาน'
      );

      valid = false;
    }

    if (!data.osm) {
      setFieldError(
        'osm',
        'กรุณาเลือก OSM'
      );

      valid = false;
    }

    if (!data.otm) {
      setFieldError(
        'otm',
        'กรุณาเลือก OTM'
      );

      valid = false;
    }

    if (!data.details) {
      setFieldError(
        'details',
        'กรุณากรอกรายละเอียด'
      );

      valid = false;

    } else if (
      data.details.length < 5
    ) {
      setFieldError(
        'details',
        'รายละเอียดต้องมีอย่างน้อย 5 ตัวอักษร'
      );

      valid = false;
    }

    if (
      data.files.length < 1
    ) {
      elements.fileError
        .textContent =
          'กรุณาแนบภาพหรือวิดีโออย่างน้อย 1 ไฟล์';

      valid = false;
    }

    return valid;
  }


  function renderValidationResult(
    data
  ) {
    const profile =
      state.profile || {};

    const rows = [
      [
        'ผู้บันทึก',
        profile.displayName ||
          'ยังไม่ได้เข้าสู่ระบบ LINE'
      ],

      [
        'สถานะเพื่อน',
        state.friendFlag
          ? 'เพิ่ม Bot เป็นเพื่อนแล้ว'
          : 'ยังไม่ได้เพิ่ม Bot เป็นเพื่อน'
      ],

      [
        'กะทำงาน',
        data.workShift
      ],

      [
        'OSM',
        data.osm
      ],

      [
        'OTM',
        data.otm
      ],

      [
        'รายละเอียด',
        data.details
      ],

      [
        'จำนวนหลักฐาน',
        String(
          data.files.length
        ) + ' ไฟล์'
      ],

      [
        'ประเภทไฟล์',
        data.files
          .map(
            function (file) {
              return file.type ||
                'ไม่ทราบประเภท';
            }
          )
          .join(', ')
      ]
    ];

    elements
      .validationResultContent
      .innerHTML =
        '';

    rows.forEach(
      function (row) {
        const container =
          document.createElement(
            'div'
          );

        container.className =
          'result-row';

        const label =
          document.createElement(
            'div'
          );

        label.className =
          'result-label';

        label.textContent =
          row[0];

        const value =
          document.createElement(
            'div'
          );

        value.className =
          'result-value';

        value.textContent =
          row[1];

        container.appendChild(
          label
        );

        container.appendChild(
          value
        );

        elements
          .validationResultContent
          .appendChild(
            container
          );
      }
    );

    elements.validationResult
      .classList
      .remove('hidden');
  }


  function setFieldError(
    fieldName,
    message
  ) {
    const field =
      document.getElementById(
        fieldName
      );

    const error =
      document.querySelector(
        '[data-error-for="' +
        fieldName +
        '"]'
      );

    if (field) {
      field.classList
        .add('is-invalid');
    }

    if (error) {
      error.textContent =
        message;
    }
  }


  function clearFieldError(
    fieldName
  ) {
    const field =
      document.getElementById(
        fieldName
      );

    const error =
      document.querySelector(
        '[data-error-for="' +
        fieldName +
        '"]'
      );

    if (field) {
      field.classList
        .remove('is-invalid');
    }

    if (error) {
      error.textContent =
        '';
    }
  }


  function clearAllErrors() {
    [
      'workShift',
      'osm',
      'otm',
      'details'
    ].forEach(
      clearFieldError
    );

    elements.fileError
      .textContent =
        '';
  }


  function focusFirstInvalid() {
    const firstInvalid =
      document.querySelector(
        '.is-invalid'
      );

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    if (
      elements.fileError
        .textContent
    ) {
      const evidence =
        document.querySelector(
          '.evidence-grid'
        );

      if (evidence) {
        evidence.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }


  function startClock() {
    updateClock();

    window.setInterval(
      updateClock,
      1000
    );
  }


  function updateClock() {
    try {
      const parts =
        new Intl
          .DateTimeFormat(
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

              hourCycle:
                'h23'
            }
          )
          .formatToParts(
            new Date()
          );

      const values = {};

      parts.forEach(
        function (part) {
          values[part.type] =
            part.value;
        }
      );

      elements.currentClock
        .textContent =
          values.day +
          '/' +
          values.month +
          '/' +
          values.year +
          ' ' +
          values.hour +
          ':' +
          values.minute +
          ':' +
          values.second;

    } catch (error) {
      elements.currentClock
        .textContent =
          '--/--/---- --:--:--';
    }
  }


  function setApiStatus(
    text,
    type
  ) {
    elements.apiStatus
      .textContent =
        text;

    setStatusChip(
      elements.apiStatus,
      type
    );
  }


  function setStatusText(
    element,
    text,
    type
  ) {
    element.textContent =
      text;

    setStatusChip(
      element,
      type
    );
  }


  function setStatusChip(
    element,
    type
  ) {
    element.classList.remove(
      'status-waiting',
      'status-success',
      'status-error',
      'status-neutral'
    );

    element.classList.add(
      'status-' +
      (
        type ||
        'neutral'
      )
    );
  }


  function showSystemError(
    message
  ) {
    state.systemReady =
      false;

    setApiStatus(
      'เชื่อมต่อไม่สำเร็จ',
      'error'
    );

    elements.systemErrorText
      .textContent =
        message;

    elements.systemError
      .classList
      .remove('hidden');
  }


  function hideSystemError() {
    elements.systemError
      .classList
      .add('hidden');
  }


  function showLiffNotice(
    message
  ) {
    elements.liffNotice
      .textContent =
        message;

    elements.liffNotice
      .classList
      .remove('hidden');
  }


  function hideLiffNotice() {
    elements.liffNotice
      .classList
      .add('hidden');
  }


  function setLoading(
    visible,
    message
  ) {
    if (message) {
      elements.loadingText
        .textContent =
          message;
    }

    elements.loadingOverlay
      .classList
      .toggle(
        'hidden',
        !visible
      );
  }


  function showToast(
    message,
    type
  ) {
    if (state.toastTimer) {
      window.clearTimeout(
        state.toastTimer
      );
    }

    elements.toast
      .textContent =
        message;

    elements.toast
      .classList
      .remove(
        'hidden',
        'toast-error',
        'toast-success'
      );

    if (
      type === 'error'
    ) {
      elements.toast
        .classList
        .add(
          'toast-error'
        );
    }

    if (
      type === 'success'
    ) {
      elements.toast
        .classList
        .add(
          'toast-success'
        );
    }

    state.toastTimer =
      window.setTimeout(
        function () {
          elements.toast
            .classList
            .add('hidden');
        },
        3500
      );
  }


  function formatBytes(bytes) {
    const value =
      Number(bytes) || 0;

    if (value < 1024) {
      return value + ' B';
    }

    if (
      value <
      1024 * 1024
    ) {
      return (
        value / 1024
      ).toFixed(1) +
        ' KB';
    }

    return (
      value /
      1024 /
      1024
    ).toFixed(1) +
      ' MB';
  }


  function createDefaultAvatar() {
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">',
      '<rect width="120" height="120" rx="60" fill="#e2e8f0"/>',
      '<circle cx="60" cy="45" r="22" fill="#94a3b8"/>',
      '<path d="M22 108c4-25 18-38 38-38s34 13 38 38" fill="#94a3b8"/>',
      '</svg>'
    ].join('');

    return (
      'data:image/svg+xml;charset=UTF-8,' +
      encodeURIComponent(svg)
    );
  }


  function getErrorMessage(
    error
  ) {
    if (!error) {
      return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
    }

    const message =
      String(
        error.message ||
        error
      ).trim();

    const requestId =
      error.requestId
        ? ' รหัสอ้างอิง: ' +
          error.requestId
        : '';

    return (
      message ||
      'เกิดข้อผิดพลาด'
    ) + requestId;
  }

})(window, document);
