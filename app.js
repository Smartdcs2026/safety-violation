/************************************************************
 * app.js
 * การทำงานของฟอร์มแจ้งปัญหา
 ************************************************************/

(function (window, document) {
  'use strict';

  const CONFIG =
    window.APP_CONFIG || {};

  const API =
    window.SafetyAPI;

  const state = {
    ready:
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
      null
  };


  const elements = {};


  document.addEventListener(
    'DOMContentLoaded',
    initialize
  );


  async function initialize() {
    cacheElements();
    applyConfig();
    bindEvents();
    startClock();

    try {
      setConnectionStatus(
        'loading',
        'กำลังโหลดข้อมูลระบบ'
      );

      showLoading(
        'กำลังเตรียมฟอร์ม',
        'กำลังโหลด OSM, OTM และปลายทาง LINE',
        15
      );

      const options =
        await API.getOptions();

      state.options =
        options;

      populateShiftOptions(
        options.shifts || []
      );

      const operation =
        options.operation || {};

      populateSelect(
        elements.osm,
        operation.osm || [],
        'เลือก OSM'
      );

      populateSelect(
        elements.otm,
        operation.otm || [],
        'เลือก OTM'
      );

      populateLineTargets(
        options.lineTargets || []
      );

      state.ready =
        true;

      elements.submitButton.disabled =
        false;

      setConnectionStatus(
        'ready',
        'เชื่อมต่อระบบแล้ว'
      );

      updateProgress(
        100,
        'พร้อมใช้งาน'
      );

    } catch (error) {
      state.ready =
        false;

      elements.submitButton.disabled =
        true;

      setConnectionStatus(
        'error',
        'เชื่อมต่อระบบไม่สำเร็จ'
      );

      showFormError(
        buildErrorMessage(
          error
        )
      );

      console.error(error);

    } finally {
      window.setTimeout(
        hideLoading,
        250
      );
    }
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
              const index =
                Number(
                  button.dataset
                    .removeIndex
                );

              removeFile(index);
            }
          );
        }
      );
  }


  function startClock() {
    updateClock();

    window.setInterval(
      updateClock,
      1000
    );
  }


  function updateClock() {
    elements.currentDateTime.textContent =
      formatBangkokDateTime(
        new Date()
      );
  }


  function formatBangkokDateTime(
    date
  ) {
    return new Intl.DateTimeFormat(
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
      .format(date)
      .replace(',', '');
  }


  function populateShiftOptions(
    shifts
  ) {
    const values =
      Array.isArray(shifts) &&
      shifts.length > 0
        ? shifts
        : [
            'A',
            'B',
            'C',
            'D',
            'N'
          ];

    populateSelect(
      elements.workShift,
      values,
      'เลือกกะทำงาน'
    );
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
        const text =
          String(value || '')
            .trim();

        if (!text) {
          return;
        }

        const option =
          document.createElement(
            'option'
          );

        option.value =
          text;

        option.textContent =
          text;

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
        ? 'เลือกผู้รับ Flex Message'
        : 'ยังไม่พบปลายทาง LINE';

    elements.lineTarget.appendChild(
      firstOption
    );

    targets.forEach(
      function (target) {
        if (
          !target ||
          !target.id
        ) {
          return;
        }

        const option =
          document.createElement(
            'option'
          );

        option.value =
          target.id;

        option.textContent =
          [
            getTargetTypeLabel(
              target.type
            ),
            target.name || target.id
          ].join(' - ');

        option.dataset.targetType =
          target.type || '';

        option.dataset.targetName =
          target.name || '';

        elements.lineTarget
          .appendChild(option);
      }
    );

    elements.lineTarget.disabled =
      targets.length < 1;
  }


  function getTargetTypeLabel(
    type
  ) {
    switch (
      String(type || '')
        .toUpperCase()
    ) {
      case 'GROUP':
        return 'กลุ่ม';

      case 'ROOM':
        return 'ห้องสนทนา';

      case 'USER':
        return 'บุคคล';

      default:
        return 'LINE';
    }
  }


  function handleFileSelected(
    event
  ) {
    clearFormError();

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

    const isImage =
      (
        CONFIG
          .ALLOWED_IMAGE_TYPES ||
        []
      ).includes(
        mimeType
      );

    const isVideo =
      (
        CONFIG
          .ALLOWED_VIDEO_TYPES ||
        []
      ).includes(
        mimeType
      );

    if (
      !isImage &&
      !isVideo
    ) {
      throw new Error(
        'ไฟล์ลำดับที่ ' +
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

    if (
      totalSize >
      Number(
        CONFIG.MAX_TOTAL_BYTES
      )
    ) {
      throw new Error(
        'ขนาดไฟล์รวมต้องไม่เกิน ' +
        formatBytes(
          CONFIG.MAX_TOTAL_BYTES
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

    const dropzone =
      document.querySelector(
        '[data-slot-index="' +
        index +
        '"] .file-dropzone'
      );

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

      media.appendChild(
        image
      );

      const editButton =
        document.querySelector(
          '[data-edit-index="' +
          index +
          '"]'
        );

      /*
       * จะเปิดปุ่มเมื่อเพิ่ม image-editor.js
       */
      if (
        editButton &&
        window.SafetyImageEditor
      ) {
        editButton.hidden =
          false;
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
    }

    name.textContent =
      file.name;

    size.textContent =
      file.type +
      ' · ' +
      formatBytes(
        file.size
      );

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

    const dropzone =
      document.querySelector(
        '[data-slot-index="' +
        index +
        '"] .file-dropzone'
      );

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

    input.value =
      '';

    media.replaceChildren();

    preview.hidden =
      true;

    dropzone.hidden =
      false;

    if (editButton) {
      editButton.hidden =
        true;
    }

    updateFileSummary();
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


  function updateFileSummary() {
    const selectedFiles =
      state.files.filter(Boolean);

    if (
      selectedFiles.length < 1
    ) {
      elements.fileSummary.textContent =
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

    elements.fileSummary.textContent =
      'เลือกแล้ว ' +
      selectedFiles.length +
      ' ไฟล์ จากสูงสุด ' +
      CONFIG.MAX_FILES +
      ' ไฟล์ · ขนาดรวม ' +
      formatBytes(
        totalSize
      );
  }


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
    hideSuccess();

    try {
      if (!state.ready) {
        throw new Error(
          'ระบบยังโหลดข้อมูลไม่เสร็จ'
        );
      }

      validateForm();

      state.submitting =
        true;

      elements.submitButton.disabled =
        true;

      showLoading(
        'กำลังเตรียมข้อมูล',
        'กำลังตรวจสอบและเตรียมไฟล์หลักฐาน',
        8
      );

      const selectedFiles =
        state.files.filter(Boolean);

      const evidenceFiles = [];

      for (
        let index = 0;
        index <
          selectedFiles.length;
        index++
      ) {
        const file =
          selectedFiles[index];

        const percent =
          10 +
          Math.round(
            (
              index /
              selectedFiles.length
            ) *
            50
          );

        updateProgress(
          percent,
          'กำลังเตรียมไฟล์ ' +
          (
            index + 1
          ) +
          ' จาก ' +
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
      }

      updateProgress(
        65,
        'กำลังบันทึกข้อมูลและอัปโหลดหลักฐาน'
      );

      const selectedTargetOption =
        elements.lineTarget
          .selectedOptions[0];

      const requestId =
        API.createRequestId(
          'REPORT'
        );

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
          selectedTargetOption
            .dataset
            .targetType,

        lineTargetId:
          elements.lineTarget.value,

        lineTargetName:
          selectedTargetOption
            .dataset
            .targetName,

        evidenceFiles:
          evidenceFiles
      };

      const response =
        await API.createReport(
          payload,
          requestId
        );

      updateProgress(
        100,
        'บันทึกข้อมูลเรียบร้อยแล้ว'
      );

      showSuccess(
        response
      );

      elements.form
        .scrollIntoView({
          behavior:
            'smooth',

          block:
            'start'
        });

    } catch (error) {
      console.error(error);

      showFormError(
        buildErrorMessage(
          error
        )
      );

    } finally {
      state.submitting =
        false;

      elements.submitButton.disabled =
        !state.ready;

      window.setTimeout(
        hideLoading,
        350
      );
    }
  }


  function validateForm() {
    const fields = [
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
      },
      {
        element:
          elements.lineTarget,
        name:
          'ผู้รับ Flex Message'
      }
    ];

    for (
      const item of fields
    ) {
      if (
        !String(
          item.element.value || ''
        ).trim()
      ) {
        item.element.focus();

        throw new Error(
          'กรุณาระบุ ' +
          item.name
        );
      }
    }

    const files =
      state.files.filter(Boolean);

    if (
      files.length < 1
    ) {
      throw new Error(
        'กรุณาแนบภาพหรือวิดีโอหลักฐานอย่างน้อย 1 ไฟล์'
      );
    }
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
            resolve(
              String(
                reader.result || ''
              )
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


  function showSuccess(
    response
  ) {
    const data =
      response &&
      response.data
        ? response.data
        : {};

    elements.successCaseId.textContent =
      data.caseId || '-';

    if (
      data.flexSent === true
    ) {
      elements.successFlexStatus.textContent =
        'ส่ง Flex Message ไปยังผู้เกี่ยวข้องเรียบร้อยแล้ว';

    } else {
      elements.successFlexStatus.textContent =
        'ข้อมูลถูกบันทึกแล้ว แต่การส่ง Flex Message ยังไม่สำเร็จ ระบบได้เก็บสถานะไว้สำหรับตรวจสอบ';
    }

    elements.successPanel.hidden =
      false;
  }


  function hideSuccess() {
    elements.successPanel.hidden =
      true;

    elements.successCaseId.textContent =
      '';

    elements.successFlexStatus.textContent =
      '';
  }


  function showFormError(
    message
  ) {
    elements.formError.textContent =
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

    elements.formError.textContent =
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
      ? message +
        ' (Request ID: ' +
        requestId +
        ')'
      : message;
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
        'is-' + status
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
    elements.loadingTitle.textContent =
      title ||
      'กำลังดำเนินการ';

    elements.loadingMessage.textContent =
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

    document.body.style.overflow =
      '';
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
          Number(percent) || 0
        )
      );

    elements.progressBar.style.width =
      safePercent + '%';

    elements.progressText.textContent =
      Math.round(
        safePercent
      ) + '%';

    if (message) {
      elements.loadingMessage.textContent =
        message;
    }
  }


  function updateCounter(
    input,
    output,
    maximum
  ) {
    output.textContent =
      input.value.length +
      '/' +
      maximum;
  }


  function formatBytes(
    bytes
  ) {
    const value =
      Number(bytes) || 0;

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
      value >= 1024
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


  /*
   * เตรียมไว้ให้ image-editor.js
   * นำไฟล์ภาพที่แก้ไขแล้วกลับมาแทนไฟล์เดิม
   */
  window.SafetyApp = Object.freeze({
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
      },

    getEvidenceFile:
      function (index) {
        return state.files[index] ||
          null;
      }
  });

})(window, document);
