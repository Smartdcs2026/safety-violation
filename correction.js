/************************************************************
 * correction.js
 * ฟอร์มแก้ไขและปิดรายการผ่าน LIFF
 ************************************************************/

(function (window, document) {
  'use strict';

  const CONFIG =
    window.APP_CONFIG || {};

  const API =
    window.SafetyAPI;

  const INITIAL_URL =
    window.location.href;

  const GOOGLE_IMAGE_BASE_URL =
    'https://lh5.googleusercontent.com/d/';

  const state = {
    initialized:
      false,

    ready:
      false,

    submitting:
      false,

    editable:
      false,

    friendFlag:
      false,

    token:
      '',

    returnContext:
      '',

    accessToken:
      '',

    idToken:
      '',

    caseData:
      null,

    openData:
      null,

    options:
      null,

    submissionId:
      '',

    files: [
      null,
      null,
      null
    ],

    previewUrls: [
      '',
      '',
      ''
    ]
  };

  const elements = {};


  document.addEventListener(
    'DOMContentLoaded',
    initialize
  );


  async function initialize() {
    if (state.initialized) {
      return;
    }

    state.initialized =
      true;

    cacheElements();
    applyConfig();
    bindEvents();
    updateCounters();
    updateFileSummary();
    updateSubmitAvailability();

    await openCorrectionPage();
  }


  function cacheElements() {
    const ids = [
      'loadingOverlay',
      'loadingTitle',
      'loadingMessage',
      'progressBar',
      'progressText',
      'appLogo',
      'connectionStatus',
      'connectionStatusText',
      'pageMessage',
      'pageMessageIcon',
      'pageMessageTitle',
      'pageMessageText',
      'retryButton',
      'addFriendButton',
      'closeStateButton',
      'correctionContent',
      'profileImage',
      'profileFallback',
      'profileName',
      'profileFriendStatus',
      'returnTargetCard',
      'returnTargetName',
      'returnTargetType',
      'caseStatusBadge',
      'caseIdText',
      'reportedAtText',
      'shiftText',
      'osmText',
      'otmText',
      'unsafeActionText',
      'problemDetailText',
      'originalEvidenceSection',
      'originalEvidenceCount',
      'originalEvidenceList',
      'friendWarning',
      'friendWarningButton',
      'correctionForm',
      'correctionDetail',
      'correctionDetailCounter',
      'actionDetailField',
      'actionDetail',
      'actionDetailCounter',
      'confirmerType',
      'confirmerName',
      'fileSummary',
      'formError',
      'successPanel',
      'successCaseId',
      'successFlexStatus',
      'successDeliveryList',
      'closeSuccessButton',
      'submitButton'
    ];

    ids.forEach(
      function (id) {
        elements[id] =
          document.getElementById(id);
      }
    );

    const missing =
      ids.filter(
        function (id) {
          return !elements[id];
        }
      );

    if (missing.length > 0) {
      throw new Error(
        'โครงสร้างหน้า correction ไม่ครบ: ' +
        missing.join(', ')
      );
    }
  }


  function applyConfig() {
    if (CONFIG.LOGO_URL) {
      elements.appLogo.src =
        CONFIG.LOGO_URL;
    }

    document.title =
      'ดำเนินการแก้ไข - ' +
      (
        CONFIG.APP_NAME ||
        'Safety Report'
      );
  }


  function bindEvents() {
    elements.retryButton.addEventListener(
      'click',
      function () {
        window.location.reload();
      }
    );

    elements.closeStateButton.addEventListener(
      'click',
      closeLiffWindow
    );

    elements.closeSuccessButton.addEventListener(
      'click',
      closeLiffWindow
    );

    elements.addFriendButton.addEventListener(
      'click',
      openAddFriendPage
    );

    elements.friendWarningButton.addEventListener(
      'click',
      openAddFriendPage
    );

    elements.correctionForm.addEventListener(
      'submit',
      handleSubmit
    );

    elements.correctionDetail.addEventListener(
      'input',
      function () {
        updateCounter(
          elements.correctionDetail,
          elements.correctionDetailCounter,
          5000
        );

        clearFormError();
        updateSubmitAvailability();
      }
    );

    elements.actionDetail.addEventListener(
      'input',
      function () {
        updateCounter(
          elements.actionDetail,
          elements.actionDetailCounter,
          5000
        );

        clearFormError();
        updateSubmitAvailability();
      }
    );

    document
      .querySelectorAll(
        'input[name="actionTaken"]'
      )
      .forEach(
        function (radio) {
          radio.addEventListener(
            'change',
            handleActionTakenChange
          );
        }
      );

    elements.confirmerType.addEventListener(
      'change',
      function () {
        populateConfirmerNames();
        clearFormError();
        updateSubmitAvailability();
      }
    );

    elements.confirmerName.addEventListener(
      'change',
      function () {
        clearFormError();
        updateSubmitAvailability();
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
                  button.dataset.removeIndex
                )
              );
            }
          );
        }
      );

    window.addEventListener(
      'beforeunload',
      revokeAllPreviewUrls
    );
  }


  async function openCorrectionPage() {
    showLoading(
      'กำลังเปิดรายการ',
      'กำลังตรวจสอบการเชื่อมต่อ',
      8
    );

    hidePageMessage();
    elements.correctionContent.hidden =
      true;

    try {
      assertDependencies();

      updateProgress(
        16,
        'กำลังเริ่มต้น LINE LIFF'
      );

      const liffId =
        resolveLiffId();

      await window.liff.init({
        liffId:
          liffId,

        withLoginOnExternalBrowser:
          true
      });

      if (!window.liff.isLoggedIn()) {
        window.liff.login({
          redirectUri:
            INITIAL_URL
        });
        return;
      }

      state.token =
        extractEditToken();

      state.returnContext =
        extractReturnContext();

      if (!state.token) {
        throw createPageError(
          'EDIT_TOKEN_REQUIRED',
          'ไม่พบรหัสลิงก์แก้ไข กรุณาเปิดจากปุ่มใน Flex Message อีกครั้ง'
        );
      }

      state.accessToken =
        String(
          window.liff.getAccessToken() || ''
        );

      state.idToken =
        String(
          window.liff.getIDToken() || ''
        );

      if (!state.accessToken) {
        throw createPageError(
          'LIFF_ACCESS_TOKEN_MISSING',
          'LINE ไม่ได้ส่ง Access Token กรุณาปิดแล้วเปิดลิงก์ใหม่จาก LINE'
        );
      }

      updateProgress(
        28,
        'กำลังตรวจสอบระบบ'
      );

      await API.health();

      updateProgress(
        42,
        'กำลังโหลดรายชื่อ OSM และ OTM'
      );

      state.options =
        await API.getOptions();

      updateProgress(
        58,
        'กำลังยืนยันตัวตนและตรวจลิงก์'
      );

      const requestId =
        API.createRequestId(
          'LIFF-OPEN'
        );

      const openData =
        await API.openCorrection(
          {
            token:
              state.token,

            accessToken:
              state.accessToken,

            idToken:
              state.idToken,

            returnContext:
              state.returnContext
          },
          requestId
        );

      if (
        !openData ||
        !openData.case
      ) {
        throw createPageError(
          'CASE_DATA_MISSING',
          'ระบบไม่ส่งข้อมูลรายการกลับมา'
        );
      }

      state.openData =
        openData;

      state.caseData =
        openData.case;

      state.editable =
        openData.editable === true;

      const verifiedProfile =
        openData.verifiedProfile ||
        openData.profile ||
        {};

      state.friendFlag =
        verifiedProfile.friendFlag === true ||
        verifiedProfile.friendshipStatus === true ||
        String(
          verifiedProfile.friendshipStatus || ''
        ).toLowerCase() === 'true';

      state.submissionId =
        getOrCreateSubmissionId(
          state.caseData.caseId
        );

      updateProgress(
        78,
        'กำลังจัดเตรียมข้อมูลรายการ'
      );

      renderProfile(
        verifiedProfile
      );

      renderReturnTarget(
        openData.correctionReturnTarget,
        openData.correctionReturnMode
      );

      renderCase(
        state.caseData
      );

      populateConfirmerTypeDefault();
      handleFriendshipState();

      elements.correctionContent.hidden =
        false;

      if (!state.editable) {
        state.ready =
          false;

        disableForm();

        showPageMessage(
          'closed',
          'รายการนี้ปิดงานแล้ว',
          'ลิงก์แก้ไขถูกใช้หรือรายการได้รับการแก้ไขเรียบร้อยแล้ว'
        );
      } else {
        state.ready =
          true;

        setConnectionStatus(
          'ready',
          'พร้อมแก้ไข'
        );
      }

      updateProgress(
        100,
        state.editable
          ? 'พร้อมดำเนินการ'
          : 'รายการปิดแล้ว'
      );

      updateSubmitAvailability();

    } catch (error) {
      console.error(
        'Correction open error:',
        error
      );

      state.ready =
        false;

      setConnectionStatus(
        'error',
        'เปิดรายการไม่ได้'
      );

      showPageMessage(
        'error',
        getOpenErrorTitle(error),
        buildErrorMessage(error)
      );

    } finally {
      window.setTimeout(
        hideLoading,
        300
      );
    }
  }


  function assertDependencies() {
    if (!API) {
      throw createPageError(
        'API_MISSING',
        'ไม่พบ SafetyAPI กรุณาตรวจสอบ api.js'
      );
    }

    [
      'health',
      'getOptions',
      'openCorrection',
      'submitCorrection',
      'createRequestId'
    ].forEach(
      function (method) {
        if (
          typeof API[method] !==
          'function'
        ) {
          throw createPageError(
            'API_METHOD_MISSING',
            'api.js ยังไม่มีฟังก์ชัน ' +
            method
          );
        }
      }
    );

    if (!window.liff) {
      throw createPageError(
        'LIFF_SDK_MISSING',
        'โหลด LINE LIFF SDK ไม่สำเร็จ'
      );
    }
  }


  function resolveLiffId() {
    const configured =
      String(
        CONFIG.LIFF_ID || ''
      ).trim();

    if (
      configured &&
      configured !==
        'PUT_YOUR_LIFF_ID_HERE'
    ) {
      return configured;
    }

    const url =
      new URL(INITIAL_URL);

    const fallback =
      url.searchParams.get(
        'liffClientId'
      ) || '';

    if (fallback) {
      return fallback;
    }

    throw createPageError(
      'LIFF_ID_NOT_CONFIGURED',
      'ยังไม่ได้ใส่ LIFF_ID ใน config.js'
    );
  }


  function extractEditToken() {
    const urls = [
      INITIAL_URL,
      window.location.href
    ];

    for (const urlText of urls) {
      try {
        const url =
          new URL(urlText);

        const direct =
          url.searchParams.get('t');

        if (direct) {
          return direct;
        }

        const liffState =
          url.searchParams.get(
            'liff.state'
          );

        const fromState =
          extractTokenFromLiffState(
            liffState
          );

        if (fromState) {
          return fromState;
        }
      } catch (error) {
        // ทดลอง URL ถัดไป
      }
    }

    return '';
  }


  function extractReturnContext() {
    const urls = [
      INITIAL_URL,
      window.location.href
    ];

    for (const urlText of urls) {
      try {
        const url =
          new URL(urlText);

        const direct =
          url.searchParams.get('rt');

        if (direct) {
          return direct;
        }

        const liffState =
          url.searchParams.get(
            'liff.state'
          );

        const fromState =
          extractParameterFromLiffState(
            liffState,
            'rt'
          );

        if (fromState) {
          return fromState;
        }
      } catch (error) {
        // ทดลอง URL ถัดไป
      }
    }

    return '';
  }


  function extractParameterFromLiffState(
    value,
    parameterName
  ) {
    if (!value) {
      return '';
    }

    let text =
      String(value);

    for (
      let attempt = 0;
      attempt < 3;
      attempt++
    ) {
      try {
        const url =
          new URL(
            text,
            window.location.origin
          );

        const found =
          url.searchParams.get(
            parameterName
          );

        if (found) {
          return found;
        }
      } catch (error) {
        // ทดลอง decode ด้านล่าง
      }

      try {
        const decoded =
          decodeURIComponent(text);

        if (decoded === text) {
          break;
        }

        text =
          decoded;
      } catch (error) {
        break;
      }
    }

    return '';
  }


  function extractTokenFromLiffState(
    value
  ) {
    let text =
      String(value || '').trim();

    if (!text) {
      return '';
    }

    for (
      let attempt = 0;
      attempt < 3;
      attempt++
    ) {
      try {
        const parsed =
          new URL(
            text,
            window.location.origin
          );

        const token =
          parsed.searchParams.get('t');

        if (token) {
          return token;
        }
      } catch (error) {
        // ลอง decode ต่อ
      }

      try {
        const decoded =
          decodeURIComponent(text);

        if (decoded === text) {
          break;
        }

        text =
          decoded;
      } catch (error) {
        break;
      }
    }

    return '';
  }


  function renderProfile(profile) {
    const displayName =
      String(
        profile.displayName ||
        profile.lineName ||
        'ผู้ใช้งาน LINE'
      ).trim();

    elements.profileName.textContent =
      displayName;

    elements.profileFallback.textContent =
      displayName
        ? displayName.charAt(0)
            .toUpperCase()
        : 'L';

    const pictureUrl =
      normalizeHttpsUrl(
        profile.pictureUrl
      );

    if (pictureUrl) {
      elements.profileImage.src =
        pictureUrl;

      elements.profileImage.hidden =
        false;

      elements.profileFallback.hidden =
        true;
    } else {
      elements.profileImage.hidden =
        true;

      elements.profileFallback.hidden =
        false;
    }
  }


  function renderReturnTarget(
    target,
    mode
  ) {
    const source =
      target &&
      typeof target === 'object'
        ? target
        : {};

    const targetName =
      String(
        source.name ||
        source.targetName ||
        ''
      ).trim();

    const targetType =
      String(
        source.type ||
        source.targetType ||
        ''
      )
        .trim()
        .toUpperCase();

    if (targetName) {
      elements.returnTargetName.textContent =
        targetName;

      elements.returnTargetType.textContent =
        getLineTargetTypeLabel(
          targetType
        ) +
        ' · ระบบจะส่ง Flex ผลการแก้ไขกลับอัตโนมัติ';

      elements.returnTargetCard.dataset.mode =
        'origin';

      return;
    }

    elements.returnTargetName.textContent =
      'ปลายทางเดิมของรายการ';

    elements.returnTargetType.textContent =
      mode === 'LEGACY_ALL_TARGETS'
        ? 'ลิงก์รุ่นเดิม · ระบบจะส่งผลกลับทุกปลายทางเดิม'
        : 'ระบบกำหนดปลายทางให้อัตโนมัติ';

    elements.returnTargetCard.dataset.mode =
      'legacy';
  }


  function getLineTargetTypeLabel(type) {
    switch (
      String(type || '').toUpperCase()
    ) {
      case 'GROUP':
        return 'กลุ่ม LINE';

      case 'USER':
        return 'บุคคล LINE';

      case 'ROOM':
        return 'ห้องสนทนา LINE';

      default:
        return 'LINE';
    }
  }


  function renderCase(caseData) {
    elements.caseIdText.textContent =
      textOrDash(
        caseData.caseId
      );

    elements.reportedAtText.textContent =
      textOrDash(
        caseData.reportedAt
      );

    elements.shiftText.textContent =
      textOrDash(
        caseData.shift
      );

    elements.osmText.textContent =
      textOrDash(
        caseData.osm
      );

    elements.otmText.textContent =
      textOrDash(
        caseData.otm
      );

    elements.unsafeActionText.textContent =
      textOrDash(
        caseData.unsafeActionType
      );

    elements.problemDetailText.textContent =
      textOrDash(
        caseData.problemDetail
      );

    elements.caseStatusBadge.textContent =
      textOrDash(
        caseData.status
      );

    renderOriginalEvidence(
      caseData.problemEvidenceView ||
      caseData.problemEvidence
    );
  }


  function renderOriginalEvidence(evidence) {
    const files =
      normalizeEvidenceEntries(
        evidence
      );

    elements.originalEvidenceList
      .replaceChildren();

    if (files.length < 1) {
      elements.originalEvidenceSection.hidden =
        true;
      return;
    }

    elements.originalEvidenceSection.hidden =
      false;

    elements.originalEvidenceCount.textContent =
      files.length +
      ' ไฟล์';

    files.forEach(
      function (file, index) {
        const item =
          document.createElement('article');

        item.className =
          'correction-original-evidence-item';

        const mediaWrap =
          document.createElement('div');

        mediaWrap.className =
          'correction-original-evidence-media';

        const isImage =
          file.mimeType.startsWith(
            'image/'
          );

        const isVideo =
          file.mimeType.startsWith(
            'video/'
          );

        if (isImage) {
          const imageUrl =
            firstHttpsUrl([
              file.displayUrl,
              file.url,
              file.fileId
                ? GOOGLE_IMAGE_BASE_URL +
                  encodeURIComponent(
                    file.fileId
                  )
                : ''
            ]);

          if (imageUrl) {
            const image =
              document.createElement('img');

            image.src =
              imageUrl;

            image.alt =
              'ภาพที่แจ้งปัญหา ' +
              (index + 1);

            image.loading =
              'lazy';

            mediaWrap.appendChild(
              image
            );
          }
        } else if (isVideo) {
          const streamUrl =
            firstHttpsUrl([
              file.streamUrl,
              file.directUrl,
              file.videoUrl,
              file.publicVideoUrl
            ]);

          if (streamUrl) {
            const video =
              document.createElement('video');

            video.src =
              streamUrl;

            video.controls =
              true;

            video.preload =
              'metadata';

            video.playsInline =
              true;

            const poster =
              firstHttpsUrl([
                file.previewUrl
              ]);

            if (poster) {
              video.poster =
                poster;
            }

            mediaWrap.appendChild(
              video
            );
          } else {
            const icon =
              document.createElement('div');

            icon.className =
              'correction-original-video-icon';

            icon.textContent =
              '▶';

            mediaWrap.appendChild(
              icon
            );
          }
        }

        item.appendChild(
          mediaWrap
        );

        const copy =
          document.createElement('div');

        copy.className =
          'correction-original-evidence-copy';

        const name =
          document.createElement('strong');

        name.textContent =
          file.fileName ||
          (
            isVideo
              ? 'วิดีโอที่แจ้งปัญหา'
              : 'ภาพที่แจ้งปัญหา'
          );

        const type =
          document.createElement('span');

        type.textContent =
          file.mimeType ||
          'ไฟล์หลักฐาน';

        copy.append(
          name,
          type
        );

        item.appendChild(copy);

        const viewUrl =
          firstHttpsUrl([
            file.viewUrl,
            file.openUrl,
            file.streamUrl,
            file.directUrl,
            file.videoUrl,
            file.publicVideoUrl,
            file.url
          ]);

        if (viewUrl) {
          const link =
            document.createElement('a');

          link.href =
            viewUrl;

          link.target =
            '_blank';

          link.rel =
            'noopener noreferrer';

          link.textContent =
            isVideo
              ? 'เปิดวิดีโอ'
              : 'เปิดภาพ';

          item.appendChild(link);
        }

        elements.originalEvidenceList
          .appendChild(item);
      }
    );
  }


  function normalizeEvidenceEntries(
    evidence
  ) {
    const source =
      evidence &&
      typeof evidence === 'object'
        ? evidence
        : {};

    if (
      Array.isArray(source.files) &&
      source.files.length > 0
    ) {
      return source.files
        .filter(Boolean)
        .map(
          function (file, index) {
            return {
              fileId:
                String(
                  file.fileId || ''
                ).trim(),

              fileName:
                String(
                  file.fileName || ''
                ).trim(),

              mimeType:
                String(
                  file.mimeType || ''
                ).toLowerCase(),

              displayUrl:
                file.displayUrl || '',

              viewUrl:
                file.viewUrl || '',

              openUrl:
                file.openUrl || '',

              streamUrl:
                file.streamUrl || '',

              directUrl:
                file.directUrl || '',

              previewUrl:
                file.previewUrl || '',

              videoUrl:
                file.videoUrl || '',

              publicVideoUrl:
                file.publicVideoUrl || '',

              url:
                file.url || '',

              sequence:
                file.sequence ||
                index + 1
            };
          }
        );
    }

    const fileIds =
      Array.isArray(source.fileIds)
        ? source.fileIds
        : [];

    const mimeTypes =
      Array.isArray(source.mimeTypes)
        ? source.mimeTypes
        : [];

    const videoUrls =
      Array.isArray(source.videoUrls)
        ? source.videoUrls
        : [];

    return fileIds.map(
      function (fileId, index) {
        return {
          fileId:
            String(fileId || '').trim(),

          fileName:
            '',

          mimeType:
            String(
              mimeTypes[index] || ''
            ).toLowerCase(),

          videoUrl:
            videoUrls[index] || '',

          sequence:
            index + 1
        };
      }
    );
  }


  function handleFriendshipState() {
    elements.profileFriendStatus.textContent =
      state.friendFlag
        ? 'เป็นเพื่อนกับ LINE BOT แล้ว'
        : 'ยังไม่ได้เพิ่มเพื่อน LINE BOT';

    elements.friendWarning.hidden =
      state.friendFlag;

    const friendUrl =
      normalizeHttpsUrl(
        CONFIG.LINE_BOT_FRIEND_URL
      );

    elements.friendWarningButton.hidden =
      !friendUrl;

    elements.addFriendButton.hidden =
      !friendUrl;
  }


  function populateConfirmerTypeDefault() {
    const caseData =
      state.caseData || {};

    if (caseData.osm) {
      elements.confirmerType.value =
        'OSM';
    } else if (caseData.otm) {
      elements.confirmerType.value =
        'OTM';
    }

    populateConfirmerNames();
  }


  function populateConfirmerNames() {
    const type =
      elements.confirmerType.value;

    const operation =
      state.options &&
      state.options.operation &&
      typeof state.options.operation ===
        'object'
        ? state.options.operation
        : {};

    const values =
      type === 'OSM'
        ? uniqueTextValues(
            operation.osm
          )
        : type === 'OTM'
          ? uniqueTextValues(
              operation.otm
            )
          : [];

    elements.confirmerName
      .replaceChildren();

    const placeholder =
      document.createElement('option');

    placeholder.value =
      '';

    placeholder.textContent =
      type
        ? 'เลือกชื่อ ' + type
        : 'เลือกประเภทก่อน';

    elements.confirmerName
      .appendChild(placeholder);

    values.forEach(
      function (value) {
        const option =
          document.createElement('option');

        option.value =
          value;

        option.textContent =
          value;

        elements.confirmerName
          .appendChild(option);
      }
    );

    elements.confirmerName.disabled =
      values.length < 1;

    const preferred =
      type === 'OSM'
        ? String(
            state.caseData &&
            state.caseData.osm || ''
          )
        : String(
            state.caseData &&
            state.caseData.otm || ''
          );

    if (
      preferred &&
      values.includes(preferred)
    ) {
      elements.confirmerName.value =
        preferred;
    }

    updateSubmitAvailability();
  }


  function handleActionTakenChange() {
    const value =
      getSelectedActionTaken();

    const hasAction =
      value === 'มี';

    elements.actionDetailField.hidden =
      !hasAction;

    elements.actionDetail.required =
      hasAction;

    if (!hasAction) {
      elements.actionDetail.value =
        '';

      updateCounter(
        elements.actionDetail,
        elements.actionDetailCounter,
        5000
      );
    }

    clearFormError();
    updateSubmitAvailability();
  }


  function getSelectedActionTaken() {
    const selected =
      document.querySelector(
        'input[name="actionTaken"]:checked'
      );

    return selected
      ? selected.value
      : '';
  }


  function handleFileSelected(event) {
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


  function validateFile(file, index) {
    const mimeType =
      String(
        file && file.type || ''
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

    if (!isImage && !isVideo) {
      throw new Error(
        'ไฟล์หลักฐาน ' +
        (index + 1) +
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
        formatBytes(maximumBytes)
      );
    }

    const futureFiles =
      state.files.slice();

    futureFiles[index] =
      file;

    const total =
      futureFiles.reduce(
        function (sum, current) {
          return sum +
            (
              current
                ? current.size
                : 0
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
      total > maximumTotal
    ) {
      throw new Error(
        'ขนาดไฟล์รวมต้องไม่เกิน ' +
        formatBytes(maximumTotal)
      );
    }
  }


  function setFile(index, file) {
    revokePreviewUrl(index);

    state.files[index] =
      file;

    const previewUrl =
      URL.createObjectURL(file);

    state.previewUrls[index] =
      previewUrl;

    const slot =
      document.querySelector(
        '[data-slot-index="' +
        index +
        '"]'
      );

    const dropzone =
      slot.querySelector(
        '.file-dropzone'
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
        document.createElement('img');

      image.src =
        previewUrl;

      image.alt =
        'ตัวอย่างหลักฐานหลังแก้ไข';

      media.appendChild(image);
    } else {
      const video =
        document.createElement('video');

      video.src =
        previewUrl;

      video.controls =
        true;

      video.preload =
        'metadata';

      video.playsInline =
        true;

      media.appendChild(video);
    }

    name.textContent =
      file.name;

    size.textContent =
      file.type +
      ' · ' +
      formatBytes(file.size);

    dropzone.hidden =
      true;

    preview.hidden =
      false;

    updateFileSummary();
    updateSubmitAvailability();
  }


  function removeFile(index) {
    revokePreviewUrl(index);

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
      slot.querySelector(
        '.file-dropzone'
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

    input.value =
      '';

    media.replaceChildren();
    preview.hidden =
      true;
    dropzone.hidden =
      false;

    updateFileSummary();
    updateSubmitAvailability();
  }


  function updateFileSummary() {
    const selected =
      state.files.filter(Boolean);

    if (selected.length < 1) {
      elements.fileSummary.textContent =
        'ยังไม่ได้เลือกไฟล์';
      return;
    }

    const total =
      selected.reduce(
        function (sum, file) {
          return sum + file.size;
        },
        0
      );

    elements.fileSummary.textContent =
      'เลือกแล้ว ' +
      selected.length +
      '/' +
      (
        Number(CONFIG.MAX_FILES) ||
        3
      ) +
      ' ไฟล์ · ' +
      formatBytes(total);
  }


  async function handleSubmit(event) {
    event.preventDefault();

    if (state.submitting) {
      return;
    }

    clearFormError();

    try {
      validateForm();

      state.submitting =
        true;

      updateSubmitAvailability();

      const requestId =
        API.createRequestId(
          'CORRECTION'
        );

      showLoading(
        'กำลังบันทึกการแก้ไข',
        'กำลังเตรียมข้อมูล',
        8
      );

      const selectedFiles =
        state.files.filter(Boolean);

      const evidenceFiles = [];

      for (
        let index = 0;
        index < selectedFiles.length;
        index++
      ) {
        updateProgress(
          18 +
          Math.round(
            (
              index /
              selectedFiles.length
            ) * 40
          ),
          'กำลังเตรียมไฟล์ ' +
          (index + 1) +
          '/' +
          selectedFiles.length
        );

        const file =
          selectedFiles[index];

        const dataUrl =
          await fileToDataUrl(file);

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
        64,
        'กำลังอัปโหลดหลักฐานและปิดรายการ'
      );

      const response =
        await API.submitCorrection(
          {
            token:
              state.token,

            caseId:
              state.caseData.caseId,

            correctionDetail:
              elements.correctionDetail
                .value.trim(),

            actionTaken:
              getSelectedActionTaken(),

            actionDetail:
              elements.actionDetail
                .value.trim(),

            confirmerType:
              elements.confirmerType.value,

            confirmerName:
              elements.confirmerName.value,

            evidenceFiles:
              evidenceFiles,

            submissionId:
              state.submissionId,

            accessToken:
              state.accessToken,

            idToken:
              state.idToken,

            returnContext:
              state.returnContext
          },
          requestId
        );

      updateProgress(
        94,
        'กำลังตรวจสอบผลการส่ง Flex'
      );

      renderSuccess(response);

      state.ready =
        false;

      state.editable =
        false;

      disableForm();

      setConnectionStatus(
        'ready',
        'ปิดงานสำเร็จ'
      );

      updateProgress(
        100,
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
        'Correction submit error:',
        error
      );

      showFormError(
        buildErrorMessage(error)
      );

      if (
        error &&
        error.code ===
          'BOT_FRIEND_REQUIRED'
      ) {
        state.friendFlag =
          false;
        handleFriendshipState();
      }

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
    if (!state.ready || !state.editable) {
      throw new Error(
        'รายการนี้ไม่อยู่ในสถานะที่แก้ไขได้'
      );
    }

    if (!state.friendFlag) {
      throw new Error(
        'กรุณาเพิ่มเพื่อน LINE BOT ก่อนปิดงาน'
      );
    }

    if (
      !elements.correctionDetail
        .value.trim()
    ) {
      throw new Error(
        'กรุณาระบุรายละเอียดการแก้ไข'
      );
    }

    const actionTaken =
      getSelectedActionTaken();

    if (!actionTaken) {
      throw new Error(
        'กรุณาเลือกว่ามีการดำเนินการกับผู้กระทำหรือไม่'
      );
    }

    if (
      actionTaken === 'มี' &&
      !elements.actionDetail
        .value.trim()
    ) {
      throw new Error(
        'กรุณาระบุรายละเอียดการดำเนินการกับผู้กระทำ'
      );
    }

    if (!elements.confirmerType.value) {
      throw new Error(
        'กรุณาเลือกประเภทผู้ยืนยัน'
      );
    }

    if (!elements.confirmerName.value) {
      throw new Error(
        'กรุณาเลือกชื่อผู้ยืนยัน'
      );
    }

    if (
      state.files.filter(Boolean)
        .length < 1
    ) {
      throw new Error(
        'ต้องแนบหลักฐานหลังแก้ไขอย่างน้อย 1 ไฟล์'
      );
    }
  }


  function updateSubmitAvailability() {
    const actionTaken =
      getSelectedActionTaken();

    const complete =
      state.ready === true &&
      state.editable === true &&
      state.friendFlag === true &&
      state.submitting === false &&
      Boolean(
        elements.correctionDetail &&
        elements.correctionDetail.value.trim()
      ) &&
      Boolean(actionTaken) &&
      (
        actionTaken !== 'มี' ||
        Boolean(
          elements.actionDetail &&
          elements.actionDetail.value.trim()
        )
      ) &&
      Boolean(
        elements.confirmerType &&
        elements.confirmerType.value
      ) &&
      Boolean(
        elements.confirmerName &&
        elements.confirmerName.value
      ) &&
      state.files.filter(Boolean)
        .length > 0;

    elements.submitButton.disabled =
      !complete;
  }


  function renderSuccess(response) {
    const data =
      response &&
      response.data &&
      typeof response.data === 'object'
        ? response.data
        : {};

    const caseId =
      data.caseId ||
      state.caseData.caseId ||
      '';

    const total =
      Number(
        data.flexTargetCount
      ) ||
      (
        Array.isArray(data.flexResults)
          ? data.flexResults.length
          : 0
      );

    const sent =
      Number(
        data.flexSentCount
      ) ||
      (
        Array.isArray(data.flexResults)
          ? data.flexResults.filter(
              function (item) {
                return item &&
                  item.sent === true;
              }
            ).length
          : 0
      );

    const failed =
      Number(
        data.flexFailedCount
      ) ||
      Math.max(total - sent, 0);

    elements.successCaseId.textContent =
      caseId;

    elements.successFlexStatus.textContent =
      total > 0
        ? (
            'ส่ง Flex ผลการแก้ไขสำเร็จ ' +
            sent +
            '/' +
            total +
            ' ปลายทาง' +
            (
              failed > 0
                ? ' · ไม่สำเร็จ ' +
                  failed
                : ''
            )
          )
        : 'บันทึกการแก้ไขและปิดงานแล้ว';

    renderDeliveryResults(
      data.flexResults
    );

    elements.successPanel.hidden =
      false;
  }


  function renderDeliveryResults(results) {
    const list =
      Array.isArray(results)
        ? results
        : [];

    elements.successDeliveryList
      .replaceChildren();

    if (list.length < 1) {
      elements.successDeliveryList.hidden =
        true;
      return;
    }

    elements.successDeliveryList.hidden =
      false;

    list.slice(0, 5).forEach(
      function (result, index) {
        const item =
          document.createElement('article');

        item.className =
          'success-delivery-item' +
          (
            result.sent === true
              ? ''
              : ' is-failed'
          );

        const order =
          document.createElement('span');

        order.className =
          'success-delivery-order';

        order.textContent =
          String(
            result.order ||
            index + 1
          );

        const info =
          document.createElement('div');

        info.className =
          'success-delivery-info';

        const name =
          document.createElement('strong');

        name.textContent =
          result.targetName ||
          result.name ||
          'ปลายทาง LINE';

        const type =
          document.createElement('small');

        type.textContent =
          getTargetTypeLabel(
            result.targetType ||
            result.type
          );

        info.append(
          name,
          type
        );

        const status =
          document.createElement('span');

        status.className =
          'success-delivery-status' +
          (
            result.sent === true
              ? ''
              : ' is-failed'
          );

        status.textContent =
          result.sent === true
            ? 'ส่งสำเร็จ'
            : 'ไม่สำเร็จ';

        item.append(
          order,
          info,
          status
        );

        if (
          result.sent !== true &&
          result.message
        ) {
          const error =
            document.createElement('p');

          error.className =
            'success-delivery-error';

          error.textContent =
            result.message;

          item.appendChild(error);
        }

        elements.successDeliveryList
          .appendChild(item);
      }
    );
  }


  function disableForm() {
    elements.correctionForm
      .querySelectorAll(
        'input, select, textarea, button'
      )
      .forEach(
        function (control) {
          if (
            control !==
            elements.closeSuccessButton
          ) {
            control.disabled =
              true;
          }
        }
      );
  }


  function openAddFriendPage() {
    const url =
      normalizeHttpsUrl(
        CONFIG.LINE_BOT_FRIEND_URL
      );

    if (!url) {
      showFormError(
        'ยังไม่ได้กำหนด LINE_BOT_FRIEND_URL ใน config.js'
      );
      return;
    }

    if (
      window.liff &&
      typeof window.liff.openWindow ===
        'function'
    ) {
      window.liff.openWindow({
        url:
          url,
        external:
          false
      });
      return;
    }

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  }


  function closeLiffWindow() {
    if (
      window.liff &&
      typeof window.liff.isInClient ===
        'function' &&
      window.liff.isInClient() &&
      typeof window.liff.closeWindow ===
        'function'
    ) {
      window.liff.closeWindow();
      return;
    }

    window.close();
  }


  function showPageMessage(
    type,
    title,
    message
  ) {
    elements.pageMessage.className =
      'correction-state-card is-' +
      type;

    elements.pageMessageIcon.textContent =
      type === 'closed'
        ? '✓'
        : '!';

    elements.pageMessageTitle.textContent =
      title;

    elements.pageMessageText.textContent =
      message;

    elements.pageMessage.hidden =
      false;

    elements.retryButton.hidden =
      type === 'closed';
  }


  function hidePageMessage() {
    elements.pageMessage.hidden =
      true;
  }


  function showFormError(message) {
    elements.formError.textContent =
      String(message || 'เกิดข้อผิดพลาด');

    elements.formError.hidden =
      false;

    elements.formError.scrollIntoView({
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


  function showLoading(
    title,
    message,
    percent
  ) {
    elements.loadingOverlay.hidden =
      false;

    elements.loadingTitle.textContent =
      title;

    elements.loadingMessage.textContent =
      message;

    updateProgress(
      percent,
      message
    );
  }


  function hideLoading() {
    elements.loadingOverlay.hidden =
      true;
  }


  function updateProgress(percent, text) {
    const value =
      Math.max(
        0,
        Math.min(
          100,
          Number(percent) || 0
        )
      );

    elements.progressBar.style.width =
      value + '%';

    elements.progressText.textContent =
      value + '%';

    if (text) {
      elements.loadingMessage.textContent =
        text;
    }
  }


  function setConnectionStatus(type, text) {
    elements.connectionStatus.className =
      'connection-status is-' +
      type;

    elements.connectionStatusText.textContent =
      text;
  }


  function updateCounters() {
    updateCounter(
      elements.correctionDetail,
      elements.correctionDetailCounter,
      5000
    );

    updateCounter(
      elements.actionDetail,
      elements.actionDetailCounter,
      5000
    );
  }


  function updateCounter(
    field,
    counter,
    maximum
  ) {
    counter.textContent =
      String(
        field.value.length
      ) +
      '/' +
      maximum;
  }


  function getOrCreateSubmissionId(
    caseId
  ) {
    const key =
      'safety-correction-submission-' +
      String(caseId || 'unknown');

    try {
      const existing =
        window.sessionStorage
          .getItem(key);

      if (existing) {
        return existing;
      }

      const created =
        API.createRequestId(
          'SUBMIT'
        );

      window.sessionStorage
        .setItem(
          key,
          created
        );

      return created;
    } catch (error) {
      return API.createRequestId(
        'SUBMIT'
      );
    }
  }


  function fileToDataUrl(file) {
    return new Promise(
      function (resolve, reject) {
        const reader =
          new FileReader();

        reader.onload =
          function () {
            resolve(
              String(reader.result || '')
            );
          };

        reader.onerror =
          function () {
            reject(
              new Error(
                'อ่านไฟล์ ' +
                file.name +
                ' ไม่สำเร็จ'
              )
            );
          };

        reader.readAsDataURL(file);
      }
    );
  }


  function revokePreviewUrl(index) {
    if (state.previewUrls[index]) {
      URL.revokeObjectURL(
        state.previewUrls[index]
      );

      state.previewUrls[index] =
        '';
    }
  }


  function revokeAllPreviewUrls() {
    state.previewUrls.forEach(
      function (url, index) {
        if (url) {
          revokePreviewUrl(index);
        }
      }
    );
  }


  function uniqueTextValues(values) {
    const seen =
      new Set();

    return (
      Array.isArray(values)
        ? values
        : []
    )
      .map(
        function (value) {
          return String(
            value || ''
          ).trim();
        }
      )
      .filter(
        function (value) {
          if (!value || seen.has(value)) {
            return false;
          }

          seen.add(value);
          return true;
        }
      );
  }


  function firstHttpsUrl(values) {
    for (const value of values) {
      const url =
        normalizeHttpsUrl(value);

      if (url) {
        return url;
      }
    }

    return '';
  }


  function normalizeHttpsUrl(value) {
    const text =
      String(value || '').trim();

    if (!text) {
      return '';
    }

    try {
      const url =
        new URL(text);

      return url.protocol === 'https:'
        ? url.toString()
        : '';
    } catch (error) {
      return '';
    }
  }


  function getTargetTypeLabel(type) {
    switch (
      String(type || '')
        .toUpperCase()
    ) {
      case 'GROUP':
        return 'กลุ่ม LINE';

      case 'ROOM':
        return 'ห้อง LINE';

      case 'USER':
        return 'บุคคล LINE';

      default:
        return 'LINE';
    }
  }


  function textOrDash(value) {
    const text =
      String(
        value === null ||
        value === undefined
          ? ''
          : value
      ).trim();

    return text || '-';
  }


  function formatBytes(bytes) {
    const value =
      Number(bytes) || 0;

    if (value < 1024) {
      return value + ' B';
    }

    if (value < 1024 * 1024) {
      return (
        value / 1024
      ).toFixed(1) +
        ' KB';
    }

    return (
      value /
      (
        1024 * 1024
      )
    ).toFixed(1) +
      ' MB';
  }


  function buildErrorMessage(error) {
    if (!error) {
      return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
    }

    const message =
      String(
        error.message || error
      ).trim();

    const requestId =
      String(
        error.requestId || ''
      ).trim();

    return message +
      (
        requestId
          ? ' (Request ID: ' +
            requestId +
            ')'
          : ''
      );
  }


  function getOpenErrorTitle(error) {
    const code =
      String(
        error && error.code || ''
      ).toUpperCase();

    if (
      code.includes('TOKEN') ||
      code.includes('LINK')
    ) {
      return 'ลิงก์แก้ไขไม่ถูกต้อง';
    }

    if (
      code.includes('LIFF') ||
      code.includes('LINE')
    ) {
      return 'ตรวจสอบ LINE ไม่สำเร็จ';
    }

    return 'ไม่สามารถเปิดรายการได้';
  }


  function createPageError(code, message) {
    const error =
      new Error(message);

    error.code =
      code;

    return error;
  }

})(window, document);
