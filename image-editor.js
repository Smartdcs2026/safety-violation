/************************************************************
 * image-editor.js
 * Mobile-first image editor for safety evidence
 ************************************************************/

(function (window, document) {
  'use strict';

  const EDITOR_CONFIG = Object.freeze({
    MAX_CANVAS_DIMENSION: 1280,
    MAX_HISTORY: 10,

    DEFAULT_CATEGORY: 'draw',
    DEFAULT_TOOL: 'draw',
    DEFAULT_COLOR: '#ff0000',
    DEFAULT_SIZE: 8,

    MIN_ZOOM: 0.5,
    MAX_ZOOM: 3,
    ZOOM_STEP: 0.25,

    OUTPUT_MIME_TYPE: 'image/jpeg',
    OUTPUT_QUALITY: 0.92
  });


  const TOOL_META = Object.freeze({
    draw: {
      category: 'draw',
      sizeLabel: 'ความหนาเส้น',
      hint: 'ลากนิ้วเพื่อวาดเส้นอิสระ'
    },

    arrow: {
      category: 'draw',
      sizeLabel: 'ความหนาเส้น',
      hint: 'ลากจากจุดเริ่มต้นไปยังจุดปลายลูกศร'
    },

    rectangle: {
      category: 'draw',
      sizeLabel: 'ความหนาเส้น',
      hint: 'ลากครอบบริเวณที่ต้องการวาดกรอบสี่เหลี่ยม'
    },

    circle: {
      category: 'draw',
      sizeLabel: 'ความหนาเส้น',
      hint: 'ลากครอบบริเวณที่ต้องการวาดวงกลม'
    },

    blurFree: {
      category: 'blur',
      sizeLabel: 'ขนาดแปรง',
      hint: 'ลากนิ้วระบายบริเวณที่ต้องการเบลอ'
    },

    blurRect: {
      category: 'blur',
      sizeLabel: 'ระดับความเบลอ',
      hint: 'ลากครอบบริเวณที่ต้องการเบลอเป็นสี่เหลี่ยม'
    },

    blurCircle: {
      category: 'blur',
      sizeLabel: 'ระดับความเบลอ',
      hint: 'ลากครอบบริเวณที่ต้องการเบลอเป็นวงกลม'
    },

    mosaicFree: {
      category: 'mosaic',
      sizeLabel: 'ขนาดแปรง',
      hint: 'ลากนิ้วระบายบริเวณที่ต้องการทำโมเสก'
    },

    mosaicRect: {
      category: 'mosaic',
      sizeLabel: 'ขนาดช่องโมเสก',
      hint: 'ลากครอบบริเวณที่ต้องการทำโมเสกสี่เหลี่ยม'
    },

    mosaicCircle: {
      category: 'mosaic',
      sizeLabel: 'ขนาดช่องโมเสก',
      hint: 'ลากครอบบริเวณที่ต้องการทำโมเสกวงกลม'
    }
  });


  const CATEGORY_DEFAULT_TOOL = Object.freeze({
    draw: 'draw',
    blur: 'blurFree',
    mosaic: 'mosaicFree'
  });


  const DRAW_TOOLS = Object.freeze([
    'draw',
    'arrow',
    'rectangle',
    'circle'
  ]);


  const FREE_EFFECT_TOOLS = Object.freeze([
    'blurFree',
    'mosaicFree'
  ]);


  const SHAPE_EFFECT_TOOLS = Object.freeze([
    'blurRect',
    'blurCircle',
    'mosaicRect',
    'mosaicCircle'
  ]);


  const state = {
    initialized: false,
    opened: false,
    busy: false,

    fileIndex: -1,
    originalFile: null,
    originalSnapshot: '',

    category:
      EDITOR_CONFIG.DEFAULT_CATEGORY,

    tool:
      EDITOR_CONFIG.DEFAULT_TOOL,

    color:
      EDITOR_CONFIG.DEFAULT_COLOR,

    size:
      EDITOR_CONFIG.DEFAULT_SIZE,

    history: [],
    historyIndex: -1,

    drawing: false,
    panning: false,
    panMode: false,

    activePointerId: null,

    startX: 0,
    startY: 0,

    lastX: 0,
    lastY: 0,

    panStartClientX: 0,
    panStartClientY: 0,

    panStartScrollLeft: 0,
    panStartScrollTop: 0,

    fitScale: 1,
    zoomFactor: 1,

    hintTimer: null,

    modal: null,
    panel: null,
    title: null,

    canvasWrapper: null,
    canvasStage: null,

    canvas: null,
    context: null,

    sourceCanvas: null,
    sourceContext: null,

    controls: null,
    optionsRow: null,

    colorSetting: null,
    colorInput: null,

    sizeInput: null,
    sizeLabel: null,
    sizeValue: null,

    zoomValue: null,
    panButton: null,
    hint: null,

    undoButton: null,
    redoButton: null,
    resetButton: null,

    saveButton: null,
    cancelButton: null,
    closeButton: null
  };


  document.addEventListener(
    'DOMContentLoaded',
    initializeEditor
  );


  /************************************************************
   * Initialize
   ************************************************************/

  function initializeEditor() {
    if (state.initialized) {
      return;
    }

    createEditorModal();
    cacheEditorElements();
    bindEditorEvents();

    setActiveCategory(
      EDITOR_CONFIG.DEFAULT_CATEGORY,
      false
    );

    setActiveTool(
      EDITOR_CONFIG.DEFAULT_TOOL,
      false
    );

    updateColorSelection();
    updateHistoryButtons();

    state.initialized = true;
  }


  /************************************************************
   * Create UI
   ************************************************************/

  function createEditorModal() {
    const modal =
      document.createElement('div');

    modal.id =
      'imageEditorModal';

    modal.className =
      'image-editor-modal';

    modal.hidden =
      true;

    modal.innerHTML = `
      <section
        class="image-editor-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="imageEditorTitle"
      >
        <header class="image-editor-header">
          <div class="image-editor-heading">
            <h2 id="imageEditorTitle">
              แก้ไขภาพหลักฐาน
            </h2>

            <p>
              วาด เบลอ หรือโมเสกเฉพาะจุด
            </p>
          </div>

          <button
            id="imageEditorCloseButton"
            class="image-editor-close"
            type="button"
            aria-label="ปิดหน้าต่าง"
          >
            ×
          </button>
        </header>


        <main class="image-editor-workspace">
          <div
            id="imageEditorCanvasWrapper"
            class="image-editor-canvas-wrapper"
          >
            <div
              id="imageEditorCanvasStage"
              class="image-editor-canvas-stage"
            >
              <canvas
                id="imageEditorCanvas"
                class="image-editor-canvas"
              ></canvas>
            </div>
          </div>


          <div
            id="imageEditorHint"
            class="image-editor-hint"
            hidden
          ></div>


          <div class="image-editor-view-actions">
            <button
              type="button"
              class="editor-view-button"
              data-editor-view="zoomOut"
              aria-label="ย่อภาพ"
            >
              −
            </button>

            <button
              type="button"
              class="editor-view-button editor-view-fit"
              data-editor-view="fit"
            >
              พอดี
            </button>

            <span
              id="imageEditorZoomValue"
              class="editor-zoom-value"
            >
              100%
            </span>

            <button
              type="button"
              class="editor-view-button"
              data-editor-view="zoomIn"
              aria-label="ขยายภาพ"
            >
              +
            </button>

            <button
              id="imageEditorPanButton"
              type="button"
              class="editor-view-button editor-pan-button"
              data-editor-view="pan"
            >
              เลื่อน
            </button>
          </div>
        </main>


        <section
          id="imageEditorControls"
          class="image-editor-controls"
        >
          <div class="editor-category-tabs">
            <button
              type="button"
              class="editor-category-button"
              data-editor-category="draw"
            >
              วาด
            </button>

            <button
              type="button"
              class="editor-category-button"
              data-editor-category="blur"
            >
              เบลอ
            </button>

            <button
              type="button"
              class="editor-category-button"
              data-editor-category="mosaic"
            >
              โมเสก
            </button>
          </div>


          <div
            class="editor-tool-buttons editor-tool-buttons-draw"
            data-tool-category-panel="draw"
          >
            <button
              type="button"
              class="editor-tool-button"
              data-editor-tool="draw"
            >
              เส้น
            </button>

            <button
              type="button"
              class="editor-tool-button"
              data-editor-tool="arrow"
            >
              ลูกศร
            </button>

            <button
              type="button"
              class="editor-tool-button"
              data-editor-tool="rectangle"
            >
              สี่เหลี่ยม
            </button>

            <button
              type="button"
              class="editor-tool-button"
              data-editor-tool="circle"
            >
              วงกลม
            </button>
          </div>


          <div
            class="editor-tool-buttons editor-tool-buttons-effect"
            data-tool-category-panel="blur"
            hidden
          >
            <button
              type="button"
              class="editor-tool-button"
              data-editor-tool="blurFree"
            >
              อิสระ
            </button>

            <button
              type="button"
              class="editor-tool-button"
              data-editor-tool="blurRect"
            >
              สี่เหลี่ยม
            </button>

            <button
              type="button"
              class="editor-tool-button"
              data-editor-tool="blurCircle"
            >
              วงกลม
            </button>
          </div>


          <div
            class="editor-tool-buttons editor-tool-buttons-effect"
            data-tool-category-panel="mosaic"
            hidden
          >
            <button
              type="button"
              class="editor-tool-button"
              data-editor-tool="mosaicFree"
            >
              อิสระ
            </button>

            <button
              type="button"
              class="editor-tool-button"
              data-editor-tool="mosaicRect"
            >
              สี่เหลี่ยม
            </button>

            <button
              type="button"
              class="editor-tool-button"
              data-editor-tool="mosaicCircle"
            >
              วงกลม
            </button>
          </div>


          <div
            id="imageEditorOptionsRow"
            class="editor-options-row"
          >
            <div
              id="imageEditorColorSetting"
              class="editor-color-setting"
            >
              <span class="editor-compact-label">
                สี
              </span>

              <div class="editor-color-presets">
                <button
                  type="button"
                  class="editor-color-button"
                  data-editor-color="#ff0000"
                  style="--editor-color:#ff0000"
                  aria-label="สีแดง"
                ></button>

                <button
                  type="button"
                  class="editor-color-button"
                  data-editor-color="#ffd400"
                  style="--editor-color:#ffd400"
                  aria-label="สีเหลือง"
                ></button>

                <button
                  type="button"
                  class="editor-color-button"
                  data-editor-color="#00a651"
                  style="--editor-color:#00a651"
                  aria-label="สีเขียว"
                ></button>

                <button
                  type="button"
                  class="editor-color-button"
                  data-editor-color="#0066ff"
                  style="--editor-color:#0066ff"
                  aria-label="สีน้ำเงิน"
                ></button>

                <button
                  type="button"
                  class="editor-color-button"
                  data-editor-color="#000000"
                  style="--editor-color:#000000"
                  aria-label="สีดำ"
                ></button>

                <label
                  class="editor-custom-color"
                  aria-label="เลือกสีอื่น"
                >
                  <input
                    id="imageEditorColor"
                    type="color"
                    value="#ff0000"
                  >

                  <span>
                    +
                  </span>
                </label>
              </div>
            </div>


            <label class="editor-size-setting">
              <span class="editor-size-header">
                <span id="imageEditorSizeLabel">
                  ความหนาเส้น
                </span>

                <strong id="imageEditorSizeValue">
                  8
                </strong>
              </span>

              <input
                id="imageEditorSize"
                type="range"
                min="2"
                max="48"
                step="1"
                value="8"
              >
            </label>
          </div>


          <div class="editor-history-actions">
            <button
              id="imageEditorUndoButton"
              type="button"
              class="editor-action-button"
            >
              ย้อนกลับ
            </button>

            <button
              id="imageEditorRedoButton"
              type="button"
              class="editor-action-button"
            >
              ทำซ้ำ
            </button>

            <button
              id="imageEditorResetButton"
              type="button"
              class="editor-action-button editor-reset-button"
            >
              คืนค่าภาพ
            </button>
          </div>
        </section>


        <footer class="image-editor-footer">
          <button
            id="imageEditorCancelButton"
            type="button"
            class="image-editor-cancel"
          >
            ยกเลิก
          </button>

          <button
            id="imageEditorSaveButton"
            type="button"
            class="image-editor-save"
          >
            ใช้ภาพที่แก้ไขแล้ว
          </button>
        </footer>
      </section>
    `;

    document.body.appendChild(
      modal
    );
  }


  function cacheEditorElements() {
    state.modal =
      document.getElementById(
        'imageEditorModal'
      );

    state.panel =
      state.modal.querySelector(
        '.image-editor-panel'
      );

    state.title =
      document.getElementById(
        'imageEditorTitle'
      );

    state.canvasWrapper =
      document.getElementById(
        'imageEditorCanvasWrapper'
      );

    state.canvasStage =
      document.getElementById(
        'imageEditorCanvasStage'
      );

    state.canvas =
      document.getElementById(
        'imageEditorCanvas'
      );

    state.context =
      state.canvas.getContext(
        '2d',
        {
          willReadFrequently: true
        }
      );

    state.sourceCanvas =
      document.createElement(
        'canvas'
      );

    state.sourceContext =
      state.sourceCanvas.getContext(
        '2d',
        {
          willReadFrequently: true
        }
      );

    state.controls =
      document.getElementById(
        'imageEditorControls'
      );

    state.optionsRow =
      document.getElementById(
        'imageEditorOptionsRow'
      );

    state.colorSetting =
      document.getElementById(
        'imageEditorColorSetting'
      );

    state.colorInput =
      document.getElementById(
        'imageEditorColor'
      );

    state.sizeInput =
      document.getElementById(
        'imageEditorSize'
      );

    state.sizeLabel =
      document.getElementById(
        'imageEditorSizeLabel'
      );

    state.sizeValue =
      document.getElementById(
        'imageEditorSizeValue'
      );

    state.zoomValue =
      document.getElementById(
        'imageEditorZoomValue'
      );

    state.panButton =
      document.getElementById(
        'imageEditorPanButton'
      );

    state.hint =
      document.getElementById(
        'imageEditorHint'
      );

    state.undoButton =
      document.getElementById(
        'imageEditorUndoButton'
      );

    state.redoButton =
      document.getElementById(
        'imageEditorRedoButton'
      );

    state.resetButton =
      document.getElementById(
        'imageEditorResetButton'
      );

    state.saveButton =
      document.getElementById(
        'imageEditorSaveButton'
      );

    state.cancelButton =
      document.getElementById(
        'imageEditorCancelButton'
      );

    state.closeButton =
      document.getElementById(
        'imageEditorCloseButton'
      );
  }


  /************************************************************
   * Events
   ************************************************************/

  function bindEditorEvents() {
    document.addEventListener(
      'click',
      handleDocumentClick
    );

    state.colorInput.addEventListener(
      'input',
      function () {
        state.color =
          state.colorInput.value ||
          EDITOR_CONFIG.DEFAULT_COLOR;

        updateColorSelection();
      }
    );

    state.sizeInput.addEventListener(
      'input',
      function () {
        state.size =
          Number(
            state.sizeInput.value
          ) ||
          EDITOR_CONFIG.DEFAULT_SIZE;

        state.sizeValue.textContent =
          String(
            state.size
          );
      }
    );

    state.undoButton.addEventListener(
      'click',
      undoLastAction
    );

    state.redoButton.addEventListener(
      'click',
      redoLastAction
    );

    state.resetButton.addEventListener(
      'click',
      resetToOriginal
    );

    state.saveButton.addEventListener(
      'click',
      saveEditedImage
    );

    state.cancelButton.addEventListener(
      'click',
      closeEditor
    );

    state.closeButton.addEventListener(
      'click',
      closeEditor
    );

    state.modal.addEventListener(
      'click',
      function (event) {
        if (
          event.target === state.modal
        ) {
          closeEditor();
        }
      }
    );

    state.canvas.addEventListener(
      'pointerdown',
      handlePointerDown
    );

    state.canvas.addEventListener(
      'pointermove',
      handlePointerMove
    );

    state.canvas.addEventListener(
      'pointerup',
      handlePointerUp
    );

    state.canvas.addEventListener(
      'pointercancel',
      handlePointerCancel
    );

    state.canvas.addEventListener(
      'contextmenu',
      function (event) {
        event.preventDefault();
      }
    );

    window.addEventListener(
      'keydown',
      handleKeyboard
    );

    window.addEventListener(
      'resize',
      handleResize
    );
  }


  function handleDocumentClick(
    event
  ) {
    const editButton =
      event.target.closest(
        '[data-edit-index]'
      );

    if (editButton) {
      openEditor(
        Number(
          editButton.dataset.editIndex
        )
      );

      return;
    }

    if (!state.opened) {
      return;
    }

    const categoryButton =
      event.target.closest(
        '[data-editor-category]'
      );

    if (categoryButton) {
      setActiveCategory(
        categoryButton.dataset
          .editorCategory,
        true
      );

      return;
    }

    const toolButton =
      event.target.closest(
        '[data-editor-tool]'
      );

    if (toolButton) {
      setActiveTool(
        toolButton.dataset.editorTool,
        true
      );

      return;
    }

    const colorButton =
      event.target.closest(
        '[data-editor-color]'
      );

    if (colorButton) {
      state.color =
        colorButton.dataset
          .editorColor ||
        EDITOR_CONFIG.DEFAULT_COLOR;

      state.colorInput.value =
        state.color;

      updateColorSelection();

      return;
    }

    const viewButton =
      event.target.closest(
        '[data-editor-view]'
      );

    if (viewButton) {
      handleViewAction(
        viewButton.dataset.editorView
      );
    }
  }


  function handleKeyboard(
    event
  ) {
    if (!state.opened) {
      return;
    }

    if (
      event.key === 'Escape'
    ) {
      closeEditor();
      return;
    }

    if (
      (
        event.ctrlKey ||
        event.metaKey
      ) &&
      String(
        event.key
      ).toLowerCase() === 'z'
    ) {
      event.preventDefault();

      if (event.shiftKey) {
        redoLastAction();
      } else {
        undoLastAction();
      }
    }
  }


  function handleResize() {
    if (
      !state.opened ||
      !state.canvas.width
    ) {
      return;
    }

    window.requestAnimationFrame(
      function () {
        calculateFitScale();
        applyCanvasDisplayScale(
          false
        );
      }
    );
  }


  /************************************************************
   * Open Editor
   ************************************************************/

  async function openEditor(
    fileIndex
  ) {
    try {
      if (
        !window.SafetyApp ||
        typeof window.SafetyApp
          .getEvidenceFile !==
          'function'
      ) {
        throw new Error(
          'ไม่พบระบบจัดการไฟล์หลักฐาน'
        );
      }

      const file =
        window.SafetyApp
          .getEvidenceFile(
            fileIndex
          );

      if (
        !file ||
        !String(
          file.type || ''
        ).startsWith(
          'image/'
        )
      ) {
        throw new Error(
          'ไฟล์นี้ไม่ใช่ไฟล์ภาพ'
        );
      }

      state.fileIndex =
        fileIndex;

      state.originalFile =
        file;

      state.category =
        EDITOR_CONFIG.DEFAULT_CATEGORY;

      state.tool =
        EDITOR_CONFIG.DEFAULT_TOOL;

      state.color =
        EDITOR_CONFIG.DEFAULT_COLOR;

      state.size =
        EDITOR_CONFIG.DEFAULT_SIZE;

      state.history =
        [];

      state.historyIndex =
        -1;

      state.zoomFactor =
        1;

      state.panMode =
        false;

      state.colorInput.value =
        state.color;

      state.sizeInput.value =
        String(
          state.size
        );

      state.sizeValue.textContent =
        String(
          state.size
        );

      state.title.textContent =
        'แก้ไขภาพหลักฐาน ' +
        (
          fileIndex + 1
        );

      setActiveCategory(
        state.category,
        false
      );

      setActiveTool(
        state.tool,
        false
      );

      setPanMode(
        false,
        false
      );

      setEditorBusy(
        true,
        'กำลังเปิดภาพ'
      );

      state.modal.hidden =
        false;

      state.opened =
        true;

      document.body.classList.add(
        'image-editor-open'
      );

      const image =
        await loadImageFile(
          file
        );

      drawInitialImage(
        image
      );

      state.originalSnapshot =
        createCanvasSnapshot();

      state.history = [
        state.originalSnapshot
      ];

      state.historyIndex =
        0;

      updateHistoryButtons();

      await nextAnimationFrame();

      calculateFitScale();

      applyCanvasDisplayScale(
        true
      );

      showToolHint();

    } catch (error) {
      console.error(
        error
      );

      window.alert(
        error.message ||
        'ไม่สามารถเปิดภาพเพื่อแก้ไขได้'
      );

      closeEditor();

    } finally {
      setEditorBusy(
        false
      );
    }
  }


  function loadImageFile(
    file
  ) {
    return new Promise(
      function (
        resolve,
        reject
      ) {
        const objectUrl =
          URL.createObjectURL(
            file
          );

        const image =
          new Image();

        image.onload =
          function () {
            URL.revokeObjectURL(
              objectUrl
            );

            resolve(
              image
            );
          };

        image.onerror =
          function () {
            URL.revokeObjectURL(
              objectUrl
            );

            reject(
              new Error(
                'ไม่สามารถอ่านไฟล์ภาพได้'
              )
            );
          };

        image.src =
          objectUrl;
      }
    );
  }


  function drawInitialImage(
    image
  ) {
    const naturalWidth =
      Math.max(
        Number(
          image.naturalWidth
        ) || 1,
        1
      );

    const naturalHeight =
      Math.max(
        Number(
          image.naturalHeight
        ) || 1,
        1
      );

    const scale =
      Math.min(
        1,

        EDITOR_CONFIG
          .MAX_CANVAS_DIMENSION /
        Math.max(
          naturalWidth,
          naturalHeight
        )
      );

    const width =
      Math.max(
        Math.round(
          naturalWidth *
          scale
        ),
        1
      );

    const height =
      Math.max(
        Math.round(
          naturalHeight *
          scale
        ),
        1
      );

    state.canvas.width =
      width;

    state.canvas.height =
      height;

    state.sourceCanvas.width =
      width;

    state.sourceCanvas.height =
      height;

    state.context.clearRect(
      0,
      0,
      width,
      height
    );

    state.context.drawImage(
      image,
      0,
      0,
      width,
      height
    );
  }


  /************************************************************
   * Categories / Tools
   ************************************************************/

  function setActiveCategory(
    category,
    showHint
  ) {
    const cleanCategory =
      CATEGORY_DEFAULT_TOOL[
        category
      ]
        ? category
        : EDITOR_CONFIG
            .DEFAULT_CATEGORY;

    state.category =
      cleanCategory;

    document
      .querySelectorAll(
        '[data-editor-category]'
      )
      .forEach(
        function (
          button
        ) {
          button.classList.toggle(
            'is-active',

            button.dataset
              .editorCategory ===
              cleanCategory
          );
        }
      );

    document
      .querySelectorAll(
        '[data-tool-category-panel]'
      )
      .forEach(
        function (
          panel
        ) {
          panel.hidden =
            panel.dataset
              .toolCategoryPanel !==
            cleanCategory;
        }
      );

    const currentMeta =
      TOOL_META[
        state.tool
      ];

    if (
      !currentMeta ||
      currentMeta.category !==
        cleanCategory
    ) {
      setActiveTool(
        CATEGORY_DEFAULT_TOOL[
          cleanCategory
        ],
        showHint
      );

    } else {
      updateToolOptions();

      if (showHint) {
        showToolHint();
      }
    }
  }


  function setActiveTool(
    tool,
    showHint
  ) {
    const meta =
      TOOL_META[
        tool
      ];

    state.tool =
      meta
        ? tool
        : EDITOR_CONFIG
            .DEFAULT_TOOL;

    state.category =
      TOOL_META[
        state.tool
      ].category;

    document
      .querySelectorAll(
        '[data-editor-tool]'
      )
      .forEach(
        function (
          button
        ) {
          button.classList.toggle(
            'is-active',

            button.dataset
              .editorTool ===
              state.tool
          );
        }
      );

    document
      .querySelectorAll(
        '[data-editor-category]'
      )
      .forEach(
        function (
          button
        ) {
          button.classList.toggle(
            'is-active',

            button.dataset
              .editorCategory ===
              state.category
          );
        }
      );

    document
      .querySelectorAll(
        '[data-tool-category-panel]'
      )
      .forEach(
        function (
          panel
        ) {
          panel.hidden =
            panel.dataset
              .toolCategoryPanel !==
            state.category;
        }
      );

    setPanMode(
      false,
      false
    );

    updateToolOptions();

    if (showHint) {
      showToolHint();
    }
  }


  function updateToolOptions() {
    const meta =
      TOOL_META[
        state.tool
      ] ||
      TOOL_META.draw;

    const isDrawTool =
      meta.category ===
      'draw';

    state.colorSetting.hidden =
      !isDrawTool;

    state.optionsRow
      .classList
      .toggle(
        'is-effect-mode',
        !isDrawTool
      );

    state.sizeLabel.textContent =
      meta.sizeLabel;

    state.canvas
      .classList
      .toggle(
        'is-effect-tool',
        !isDrawTool
      );

    updateColorSelection();
  }


  function updateColorSelection() {
    document
      .querySelectorAll(
        '[data-editor-color]'
      )
      .forEach(
        function (
          button
        ) {
          button.classList.toggle(
            'is-active',

            String(
              button.dataset
                .editorColor
            ).toLowerCase() ===
            String(
              state.color
            ).toLowerCase()
          );
        }
      );
  }


  function showToolHint(
    message
  ) {
    const meta =
      TOOL_META[
        state.tool
      ] ||
      TOOL_META.draw;

    const text =
      message ||
      meta.hint;

    window.clearTimeout(
      state.hintTimer
    );

    state.hint.textContent =
      text;

    state.hint.hidden =
      false;

    state.hintTimer =
      window.setTimeout(
        function () {
          state.hint.hidden =
            true;
        },
        1800
      );
  }


  /************************************************************
   * Zoom / Pan
   ************************************************************/

  function handleViewAction(
    action
  ) {
    switch (action) {
      case 'zoomOut':
        changeZoom(
          -EDITOR_CONFIG
            .ZOOM_STEP
        );
        break;

      case 'zoomIn':
        changeZoom(
          EDITOR_CONFIG
            .ZOOM_STEP
        );
        break;

      case 'fit':
        state.zoomFactor =
          1;

        applyCanvasDisplayScale(
          true
        );
        break;

      case 'pan':
        setPanMode(
          !state.panMode,
          true
        );
        break;
    }
  }


  function calculateFitScale() {
    const availableWidth =
      Math.max(
        state.canvasWrapper
          .clientWidth -
        20,
        1
      );

    const availableHeight =
      Math.max(
        state.canvasWrapper
          .clientHeight -
        20,
        1
      );

    state.fitScale =
      Math.min(
        availableWidth /
          state.canvas.width,

        availableHeight /
          state.canvas.height,

        1
      );

    if (
      !Number.isFinite(
        state.fitScale
      ) ||
      state.fitScale <= 0
    ) {
      state.fitScale =
        1;
    }
  }


  function changeZoom(
    change
  ) {
    state.zoomFactor =
      clamp(
        state.zoomFactor +
          change,

        EDITOR_CONFIG.MIN_ZOOM,

        EDITOR_CONFIG.MAX_ZOOM
      );

    applyCanvasDisplayScale(
      true
    );
  }


  function applyCanvasDisplayScale(
    centerView
  ) {
    const displayScale =
      state.fitScale *
      state.zoomFactor;

    const displayWidth =
      Math.max(
        Math.round(
          state.canvas.width *
          displayScale
        ),
        1
      );

    const displayHeight =
      Math.max(
        Math.round(
          state.canvas.height *
          displayScale
        ),
        1
      );

    const stageWidth =
      Math.max(
        state.canvasWrapper
          .clientWidth,

        displayWidth + 20
      );

    const stageHeight =
      Math.max(
        state.canvasWrapper
          .clientHeight,

        displayHeight + 20
      );

    state.canvas.style.width =
      displayWidth +
      'px';

    state.canvas.style.height =
      displayHeight +
      'px';

    state.canvasStage.style.width =
      stageWidth +
      'px';

    state.canvasStage.style.height =
      stageHeight +
      'px';

    state.zoomValue.textContent =
      Math.round(
        state.zoomFactor *
        100
      ) +
      '%';

    if (centerView) {
      window.requestAnimationFrame(
        centerCanvasView
      );
    }
  }


  function centerCanvasView() {
    state.canvasWrapper.scrollLeft =
      Math.max(
        (
          state.canvasStage
            .scrollWidth -
          state.canvasWrapper
            .clientWidth
        ) /
          2,
        0
      );

    state.canvasWrapper.scrollTop =
      Math.max(
        (
          state.canvasStage
            .scrollHeight -
          state.canvasWrapper
            .clientHeight
        ) /
          2,
        0
      );
  }


  function setPanMode(
    enabled,
    showHint
  ) {
    state.panMode =
      enabled === true;

    state.panButton
      .classList
      .toggle(
        'is-active',
        state.panMode
      );

    state.canvas
      .classList
      .toggle(
        'is-pan-mode',
        state.panMode
      );

    if (showHint) {
      showToolHint(
        state.panMode
          ? 'ลากภาพเพื่อเลื่อนดู แล้วกด “เลื่อน” อีกครั้งเพื่อกลับไปแก้ไข'
          : TOOL_META[
              state.tool
            ].hint
      );
    }
  }


  /************************************************************
   * Pointer
   ************************************************************/

  function handlePointerDown(
    event
  ) {
    if (
      !state.opened ||
      state.busy ||
      state.drawing ||
      state.panning
    ) {
      return;
    }

    if (state.panMode) {
      beginPanning(
        event
      );

      return;
    }

    event.preventDefault();

    const point =
      getCanvasPoint(
        event
      );

    state.drawing =
      true;

    state.activePointerId =
      event.pointerId;

    state.startX =
      point.x;

    state.startY =
      point.y;

    state.lastX =
      point.x;

    state.lastY =
      point.y;

    copyCurrentCanvasToSource();

    capturePointer(
      event.pointerId
    );

    if (
      state.tool ===
      'draw'
    ) {
      beginFreehandStroke(
        point
      );

    } else if (
      state.tool ===
      'blurFree'
    ) {
      applyBlurBrush(
        point.x,
        point.y
      );

    } else if (
      state.tool ===
      'mosaicFree'
    ) {
      applyMosaicBrush(
        point.x,
        point.y
      );
    }
  }


  function handlePointerMove(
    event
  ) {
    if (
      state.panning &&
      event.pointerId ===
        state.activePointerId
    ) {
      continuePanning(
        event
      );

      return;
    }

    if (
      !state.drawing ||
      event.pointerId !==
        state.activePointerId
    ) {
      return;
    }

    event.preventDefault();

    const point =
      getCanvasPoint(
        event
      );

    if (
      state.tool ===
      'draw'
    ) {
      continueFreehandStroke(
        point
      );

    } else if (
      state.tool ===
      'blurFree'
    ) {
      applyBlurAlongLine(
        state.lastX,
        state.lastY,
        point.x,
        point.y
      );

    } else if (
      state.tool ===
      'mosaicFree'
    ) {
      applyMosaicAlongLine(
        state.lastX,
        state.lastY,
        point.x,
        point.y
      );

    } else if (
      DRAW_TOOLS.includes(
        state.tool
      )
    ) {
      drawShapePreview(
        point
      );

    } else if (
      SHAPE_EFFECT_TOOLS
        .includes(
          state.tool
        )
    ) {
      drawEffectShapePreview(
        point
      );
    }

    state.lastX =
      point.x;

    state.lastY =
      point.y;
  }


  function handlePointerUp(
    event
  ) {
    if (
      state.panning &&
      event.pointerId ===
        state.activePointerId
    ) {
      finishPanning();
      return;
    }

    if (
      !state.drawing ||
      event.pointerId !==
        state.activePointerId
    ) {
      return;
    }

    event.preventDefault();

    const point =
      getCanvasPoint(
        event
      );

    if (
      DRAW_TOOLS.includes(
        state.tool
      ) &&
      state.tool !==
        'draw'
    ) {
      restoreCanvasFromSource();

      drawSelectedShape(
        state.startX,
        state.startY,
        point.x,
        point.y
      );

    } else if (
      SHAPE_EFFECT_TOOLS
        .includes(
          state.tool
        )
    ) {
      restoreCanvasFromSource();

      applyEffectShape(
        state.tool,
        state.startX,
        state.startY,
        point.x,
        point.y
      );
    }

    finishDrawing();
  }


  function handlePointerCancel(
    event
  ) {
    if (
      state.panning &&
      event.pointerId ===
        state.activePointerId
    ) {
      finishPanning();
      return;
    }

    if (
      !state.drawing ||
      event.pointerId !==
        state.activePointerId
    ) {
      return;
    }

    restoreCanvasFromSource();

    state.drawing =
      false;

    state.activePointerId =
      null;
  }


  function beginPanning(
    event
  ) {
    event.preventDefault();

    state.panning =
      true;

    state.activePointerId =
      event.pointerId;

    state.panStartClientX =
      event.clientX;

    state.panStartClientY =
      event.clientY;

    state.panStartScrollLeft =
      state.canvasWrapper
        .scrollLeft;

    state.panStartScrollTop =
      state.canvasWrapper
        .scrollTop;

    state.canvas.classList.add(
      'is-panning'
    );

    capturePointer(
      event.pointerId
    );
  }


  function continuePanning(
    event
  ) {
    event.preventDefault();

    state.canvasWrapper.scrollLeft =
      state.panStartScrollLeft -
      (
        event.clientX -
        state.panStartClientX
      );

    state.canvasWrapper.scrollTop =
      state.panStartScrollTop -
      (
        event.clientY -
        state.panStartClientY
      );
  }


  function finishPanning() {
    state.panning =
      false;

    state.activePointerId =
      null;

    state.canvas.classList.remove(
      'is-panning'
    );
  }


  function capturePointer(
    pointerId
  ) {
    try {
      state.canvas
        .setPointerCapture(
          pointerId
        );

    } catch (error) {
      /*
       * Browser บางรุ่นไม่รองรับ
       */
    }
  }


  function finishDrawing() {
    state.drawing =
      false;

    state.activePointerId =
      null;

    pushHistory();
  }


  function getCanvasPoint(
    event
  ) {
    const rectangle =
      state.canvas
        .getBoundingClientRect();

    const scaleX =
      state.canvas.width /
      rectangle.width;

    const scaleY =
      state.canvas.height /
      rectangle.height;

    return {
      x:
        clamp(
          (
            event.clientX -
            rectangle.left
          ) *
            scaleX,
          0,
          state.canvas.width
        ),

      y:
        clamp(
          (
            event.clientY -
            rectangle.top
          ) *
            scaleY,
          0,
          state.canvas.height
        )
    };
  }


  /************************************************************
   * Drawing
   ************************************************************/

  function beginFreehandStroke(
    point
  ) {
    const context =
      state.context;

    context.save();

    context.beginPath();

    context.moveTo(
      point.x,
      point.y
    );

    context.lineTo(
      point.x + 0.01,
      point.y + 0.01
    );

    context.lineWidth =
      state.size;

    context.lineCap =
      'round';

    context.lineJoin =
      'round';

    context.strokeStyle =
      state.color;

    context.stroke();

    context.restore();
  }


  function continueFreehandStroke(
    point
  ) {
    const context =
      state.context;

    context.save();

    context.beginPath();

    context.moveTo(
      state.lastX,
      state.lastY
    );

    context.lineTo(
      point.x,
      point.y
    );

    context.lineWidth =
      state.size;

    context.lineCap =
      'round';

    context.lineJoin =
      'round';

    context.strokeStyle =
      state.color;

    context.stroke();

    context.restore();
  }


  function drawShapePreview(
    point
  ) {
    restoreCanvasFromSource();

    drawSelectedShape(
      state.startX,
      state.startY,
      point.x,
      point.y
    );
  }


  function drawEffectShapePreview(
    point
  ) {
    restoreCanvasFromSource();

    applyEffectShape(
      state.tool,
      state.startX,
      state.startY,
      point.x,
      point.y
    );
  }


  function drawSelectedShape(
    startX,
    startY,
    endX,
    endY
  ) {
    switch (state.tool) {
      case 'arrow':
        drawArrow(
          startX,
          startY,
          endX,
          endY
        );
        break;

      case 'rectangle':
        drawRectangle(
          startX,
          startY,
          endX,
          endY
        );
        break;

      case 'circle':
        drawCircle(
          startX,
          startY,
          endX,
          endY
        );
        break;
    }
  }


  function prepareShapeContext() {
    const context =
      state.context;

    context.lineWidth =
      state.size;

    context.lineCap =
      'round';

    context.lineJoin =
      'round';

    context.strokeStyle =
      state.color;

    context.fillStyle =
      state.color;

    return context;
  }


  function drawArrow(
    startX,
    startY,
    endX,
    endY
  ) {
    const context =
      prepareShapeContext();

    const angle =
      Math.atan2(
        endY - startY,
        endX - startX
      );

    const headLength =
      Math.max(
        14,
        state.size * 3.2
      );

    context.save();

    context.beginPath();

    context.moveTo(
      startX,
      startY
    );

    context.lineTo(
      endX,
      endY
    );

    context.stroke();

    context.beginPath();

    context.moveTo(
      endX,
      endY
    );

    context.lineTo(
      endX -
        headLength *
        Math.cos(
          angle -
          Math.PI / 6
        ),

      endY -
        headLength *
        Math.sin(
          angle -
          Math.PI / 6
        )
    );

    context.lineTo(
      endX -
        headLength *
        Math.cos(
          angle +
          Math.PI / 6
        ),

      endY -
        headLength *
        Math.sin(
          angle +
          Math.PI / 6
        )
    );

    context.closePath();

    context.fill();

    context.restore();
  }


  function drawRectangle(
    startX,
    startY,
    endX,
    endY
  ) {
    const context =
      prepareShapeContext();

    context.save();

    context.strokeRect(
      startX,
      startY,
      endX - startX,
      endY - startY
    );

    context.restore();
  }


  function drawCircle(
    startX,
    startY,
    endX,
    endY
  ) {
    const context =
      prepareShapeContext();

    const centerX =
      (
        startX +
        endX
      ) /
      2;

    const centerY =
      (
        startY +
        endY
      ) /
      2;

    const radiusX =
      Math.max(
        Math.abs(
          endX -
          startX
        ) /
          2,
        1
      );

    const radiusY =
      Math.max(
        Math.abs(
          endY -
          startY
        ) /
          2,
        1
      );

    context.save();

    context.beginPath();

    context.ellipse(
      centerX,
      centerY,
      radiusX,
      radiusY,
      0,
      0,
      Math.PI * 2
    );

    context.stroke();

    context.restore();
  }


  /************************************************************
   * Blur / Mosaic
   ************************************************************/

  function applyBlurAlongLine(
    startX,
    startY,
    endX,
    endY
  ) {
    applyBrushAlongLine(
      startX,
      startY,
      endX,
      endY,
      applyBlurBrush
    );
  }


  function applyMosaicAlongLine(
    startX,
    startY,
    endX,
    endY
  ) {
    applyBrushAlongLine(
      startX,
      startY,
      endX,
      endY,
      applyMosaicBrush
    );
  }


  function applyBrushAlongLine(
    startX,
    startY,
    endX,
    endY,
    callback
  ) {
    const distance =
      Math.hypot(
        endX - startX,
        endY - startY
      );

    const radius =
      getEffectBrushRadius();

    const step =
      Math.max(
        radius / 3,
        3
      );

    const count =
      Math.max(
        Math.ceil(
          distance /
          step
        ),
        1
      );

    for (
      let index = 0;
      index <= count;
      index++
    ) {
      const ratio =
        index /
        count;

      callback(
        startX +
          (
            endX -
            startX
          ) *
          ratio,

        startY +
          (
            endY -
            startY
          ) *
          ratio
      );
    }
  }


  function getEffectBrushRadius() {
    return Math.max(
      15,
      state.size * 2.5
    );
  }


  function applyBlurBrush(
    x,
    y
  ) {
    const radius =
      getEffectBrushRadius();

    state.context.save();

    state.context.beginPath();

    state.context.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );

    state.context.clip();

    state.context.filter =
      'blur(' +
      Math.max(
        5,
        state.size * 0.8
      ) +
      'px)';

    state.context.drawImage(
      state.sourceCanvas,
      0,
      0
    );

    state.context.restore();
  }


  function applyMosaicBrush(
    x,
    y
  ) {
    const radius =
      getEffectBrushRadius();

    applyMosaicRegion(
      {
        x:
          x - radius,

        y:
          y - radius,

        width:
          radius * 2,

        height:
          radius * 2
      },
      {
        shape:
          'circle',

        cx:
          x,

        cy:
          y,

        rx:
          radius,

        ry:
          radius
      }
    );
  }


  function applyEffectShape(
    tool,
    startX,
    startY,
    endX,
    endY
  ) {
    const bounds =
      getNormalizedBounds(
        startX,
        startY,
        endX,
        endY
      );

    switch (tool) {
      case 'blurRect':
        applyBlurRect(
          bounds
        );
        break;

      case 'blurCircle':
        applyBlurCircle(
          bounds
        );
        break;

      case 'mosaicRect':
        applyMosaicRect(
          bounds
        );
        break;

      case 'mosaicCircle':
        applyMosaicCircle(
          bounds
        );
        break;
    }
  }


  function applyBlurRect(
    bounds
  ) {
    const clipped =
      clampBoundsToCanvas(
        bounds
      );

    state.context.save();

    state.context.beginPath();

    state.context.rect(
      clipped.x,
      clipped.y,
      clipped.width,
      clipped.height
    );

    state.context.clip();

    state.context.filter =
      'blur(' +
      Math.max(
        5,
        state.size * 0.8
      ) +
      'px)';

    state.context.drawImage(
      state.sourceCanvas,
      0,
      0
    );

    state.context.restore();
  }


  function applyBlurCircle(
    bounds
  ) {
    const clipped =
      clampBoundsToCanvas(
        bounds
      );

    const cx =
      clipped.x +
      clipped.width / 2;

    const cy =
      clipped.y +
      clipped.height / 2;

    const rx =
      Math.max(
        clipped.width / 2,
        1
      );

    const ry =
      Math.max(
        clipped.height / 2,
        1
      );

    state.context.save();

    state.context.beginPath();

    state.context.ellipse(
      cx,
      cy,
      rx,
      ry,
      0,
      0,
      Math.PI * 2
    );

    state.context.clip();

    state.context.filter =
      'blur(' +
      Math.max(
        5,
        state.size * 0.8
      ) +
      'px)';

    state.context.drawImage(
      state.sourceCanvas,
      0,
      0
    );

    state.context.restore();
  }


  function applyMosaicRect(
    bounds
  ) {
    applyMosaicRegion(
      bounds,
      {
        shape:
          'rect'
      }
    );
  }


  function applyMosaicCircle(
    bounds
  ) {
    const clipped =
      clampBoundsToCanvas(
        bounds
      );

    applyMosaicRegion(
      clipped,
      {
        shape:
          'circle',

        cx:
          clipped.x +
          clipped.width / 2,

        cy:
          clipped.y +
          clipped.height / 2,

        rx:
          Math.max(
            clipped.width / 2,
            1
          ),

        ry:
          Math.max(
            clipped.height / 2,
            1
          )
      }
    );
  }


  function applyMosaicRegion(
    bounds,
    clipInfo
  ) {
    const clipped =
      clampBoundsToCanvas(
        bounds
      );

    const pixelSize =
      Math.max(
        6,
        Math.round(
          state.size * 1.5
        )
      );

    const tempSmall =
      document.createElement(
        'canvas'
      );

    const tempBig =
      document.createElement(
        'canvas'
      );

    tempSmall.width =
      Math.max(
        1,
        Math.round(
          clipped.width /
          pixelSize
        )
      );

    tempSmall.height =
      Math.max(
        1,
        Math.round(
          clipped.height /
          pixelSize
        )
      );

    tempBig.width =
      clipped.width;

    tempBig.height =
      clipped.height;

    const smallContext =
      tempSmall.getContext(
        '2d'
      );

    const bigContext =
      tempBig.getContext(
        '2d'
      );

    smallContext
      .imageSmoothingEnabled =
      true;

    smallContext.drawImage(
      state.sourceCanvas,

      clipped.x,
      clipped.y,
      clipped.width,
      clipped.height,

      0,
      0,
      tempSmall.width,
      tempSmall.height
    );

    bigContext
      .imageSmoothingEnabled =
      false;

    bigContext.drawImage(
      tempSmall,

      0,
      0,
      tempSmall.width,
      tempSmall.height,

      0,
      0,
      tempBig.width,
      tempBig.height
    );

    state.context.save();

    state.context.beginPath();

    if (
      clipInfo &&
      clipInfo.shape ===
        'circle'
    ) {
      state.context.ellipse(
        clipInfo.cx,
        clipInfo.cy,
        clipInfo.rx,
        clipInfo.ry,
        0,
        0,
        Math.PI * 2
      );

    } else {
      state.context.rect(
        clipped.x,
        clipped.y,
        clipped.width,
        clipped.height
      );
    }

    state.context.clip();

    state.context.drawImage(
      tempBig,
      clipped.x,
      clipped.y
    );

    state.context.restore();
  }


  function getNormalizedBounds(
    startX,
    startY,
    endX,
    endY
  ) {
    return {
      x:
        Math.min(
          startX,
          endX
        ),

      y:
        Math.min(
          startY,
          endY
        ),

      width:
        Math.max(
          Math.abs(
            endX -
            startX
          ),
          1
        ),

      height:
        Math.max(
          Math.abs(
            endY -
            startY
          ),
          1
        )
    };
  }


  function clampBoundsToCanvas(
    bounds
  ) {
    const x1 =
      clamp(
        bounds.x,
        0,
        state.canvas.width
      );

    const y1 =
      clamp(
        bounds.y,
        0,
        state.canvas.height
      );

    const x2 =
      clamp(
        bounds.x +
          bounds.width,
        0,
        state.canvas.width
      );

    const y2 =
      clamp(
        bounds.y +
          bounds.height,
        0,
        state.canvas.height
      );

    return {
      x:
        Math.floor(
          Math.min(
            x1,
            x2
          )
        ),

      y:
        Math.floor(
          Math.min(
            y1,
            y2
          )
        ),

      width:
        Math.max(
          Math.floor(
            Math.abs(
              x2 -
              x1
            )
          ),
          1
        ),

      height:
        Math.max(
          Math.floor(
            Math.abs(
              y2 -
              y1
            )
          ),
          1
        )
    };
  }


  /************************************************************
   * Canvas source
   ************************************************************/

  function copyCurrentCanvasToSource() {
    state.sourceCanvas.width =
      state.canvas.width;

    state.sourceCanvas.height =
      state.canvas.height;

    state.sourceContext.clearRect(
      0,
      0,
      state.sourceCanvas.width,
      state.sourceCanvas.height
    );

    state.sourceContext.drawImage(
      state.canvas,
      0,
      0
    );
  }


  function restoreCanvasFromSource() {
    state.context.clearRect(
      0,
      0,
      state.canvas.width,
      state.canvas.height
    );

    state.context.drawImage(
      state.sourceCanvas,
      0,
      0
    );
  }


  /************************************************************
   * History
   ************************************************************/

  function createCanvasSnapshot() {
    return state.canvas.toDataURL(
      'image/jpeg',
      0.9
    );
  }


  function pushHistory() {
    const snapshot =
      createCanvasSnapshot();

    const currentSnapshot =
      state.history[
        state.historyIndex
      ];

    if (
      snapshot ===
      currentSnapshot
    ) {
      return;
    }

    state.history =
      state.history.slice(
        0,
        state.historyIndex + 1
      );

    state.history.push(
      snapshot
    );

    while (
      state.history.length >
      EDITOR_CONFIG.MAX_HISTORY
    ) {
      state.history.shift();
    }

    state.historyIndex =
      state.history.length - 1;

    updateHistoryButtons();
  }


  async function undoLastAction() {
    if (
      state.historyIndex <= 0 ||
      state.busy
    ) {
      return;
    }

    state.historyIndex -=
      1;

    await restoreSnapshot(
      state.history[
        state.historyIndex
      ]
    );

    updateHistoryButtons();
  }


  async function redoLastAction() {
    if (
      state.historyIndex >=
        state.history.length - 1 ||
      state.busy
    ) {
      return;
    }

    state.historyIndex +=
      1;

    await restoreSnapshot(
      state.history[
        state.historyIndex
      ]
    );

    updateHistoryButtons();
  }


  async function resetToOriginal() {
    if (
      !state.originalSnapshot ||
      state.busy
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        'ต้องการล้างการแก้ไขทั้งหมดและคืนค่าภาพเดิมใช่หรือไม่'
      );

    if (!confirmed) {
      return;
    }

    await restoreSnapshot(
      state.originalSnapshot
    );

    state.history = [
      state.originalSnapshot
    ];

    state.historyIndex =
      0;

    updateHistoryButtons();

    showToolHint(
      'คืนค่าภาพเดิมแล้ว'
    );
  }


  function restoreSnapshot(
    dataUrl
  ) {
    return new Promise(
      function (
        resolve,
        reject
      ) {
        const image =
          new Image();

        image.onload =
          function () {
            state.context.clearRect(
              0,
              0,
              state.canvas.width,
              state.canvas.height
            );

            state.context.drawImage(
              image,
              0,
              0,
              state.canvas.width,
              state.canvas.height
            );

            resolve();
          };

        image.onerror =
          function () {
            reject(
              new Error(
                'ไม่สามารถเรียกคืนภาพได้'
              )
            );
          };

        image.src =
          dataUrl;
      }
    );
  }


  function updateHistoryButtons() {
    state.undoButton.disabled =
      state.busy ||
      state.historyIndex <= 0;

    state.redoButton.disabled =
      state.busy ||
      state.historyIndex >=
        state.history.length - 1;

    state.resetButton.disabled =
      state.busy ||
      state.historyIndex <= 0;
  }


  /************************************************************
   * Save
   ************************************************************/

  async function saveEditedImage() {
    try {
      if (
        !state.opened ||
        state.fileIndex < 0 ||
        state.busy
      ) {
        return;
      }

      setEditorBusy(
        true,
        'กำลังสร้างภาพ'
      );

      const blob =
        await canvasToBlob(
          state.canvas,
          EDITOR_CONFIG
            .OUTPUT_MIME_TYPE,
          EDITOR_CONFIG
            .OUTPUT_QUALITY
        );

      const originalName =
        state.originalFile &&
        state.originalFile.name
          ? state.originalFile.name
          : 'evidence.jpg';

      const baseName =
        originalName
          .replace(
            /\.[^.]+$/,
            ''
          )
          .replace(
            /[^A-Za-z0-9ก-๙_-]+/g,
            '_'
          )
          .substring(
            0,
            80
          ) ||
        'evidence';

      const editedFile =
        new File(
          [
            blob
          ],
          baseName +
          '_edited_' +
          Date.now() +
          '.jpg',
          {
            type:
              EDITOR_CONFIG
                .OUTPUT_MIME_TYPE,

            lastModified:
              Date.now()
          }
        );

      if (
        !window.SafetyApp ||
        typeof window.SafetyApp
          .replaceEvidenceFile !==
          'function'
      ) {
        throw new Error(
          'ไม่พบฟังก์ชันนำภาพกลับเข้าสู่ฟอร์ม'
        );
      }

      window.SafetyApp
        .replaceEvidenceFile(
          state.fileIndex,
          editedFile
        );

      closeEditor();

    } catch (error) {
      console.error(
        error
      );

      window.alert(
        error.message ||
        'ไม่สามารถบันทึกภาพที่แก้ไขได้'
      );

    } finally {
      setEditorBusy(
        false
      );
    }
  }


  function canvasToBlob(
    canvas,
    mimeType,
    quality
  ) {
    return new Promise(
      function (
        resolve,
        reject
      ) {
        canvas.toBlob(
          function (
            blob
          ) {
            if (!blob) {
              reject(
                new Error(
                  'ไม่สามารถสร้างไฟล์ภาพได้'
                )
              );

              return;
            }

            resolve(
              blob
            );
          },
          mimeType,
          quality
        );
      }
    );
  }


  /************************************************************
   * Close / Busy
   ************************************************************/

  function closeEditor() {
    if (!state.modal) {
      return;
    }

    window.clearTimeout(
      state.hintTimer
    );

    state.modal.hidden =
      true;

    state.opened =
      false;

    state.busy =
      false;

    state.drawing =
      false;

    state.panning =
      false;

    state.panMode =
      false;

    state.activePointerId =
      null;

    state.fileIndex =
      -1;

    state.originalFile =
      null;

    state.originalSnapshot =
      '';

    state.history =
      [];

    state.historyIndex =
      -1;

    state.canvas
      .removeAttribute(
        'style'
      );

    state.canvasStage
      .removeAttribute(
        'style'
      );

    state.hint.hidden =
      true;

    document.body.classList.remove(
      'image-editor-open'
    );

    updateHistoryButtons();
  }


  function setEditorBusy(
    busy,
    message
  ) {
    state.busy =
      busy === true;

    state.saveButton.disabled =
      state.busy;

    state.cancelButton.disabled =
      state.busy;

    state.closeButton.disabled =
      state.busy;

    state.modal.classList.toggle(
      'is-busy',
      state.busy
    );

    state.saveButton.textContent =
      state.busy
        ? message ||
          'กำลังดำเนินการ'
        : 'ใช้ภาพที่แก้ไขแล้ว';

    updateHistoryButtons();
  }


  /************************************************************
   * Helpers
   ************************************************************/

  function nextAnimationFrame() {
    return new Promise(
      function (
        resolve
      ) {
        window.requestAnimationFrame(
          function () {
            window.requestAnimationFrame(
              resolve
            );
          }
        );
      }
    );
  }


  function clamp(
    value,
    minimum,
    maximum
  ) {
    return Math.min(
      Math.max(
        value,
        minimum
      ),
      maximum
    );
  }


  /************************************************************
   * Public API
   ************************************************************/

  window.SafetyImageEditor =
    Object.freeze({
      open:
        openEditor,

      close:
        closeEditor,

      isOpen:
        function () {
          return state.opened;
        }
    });

})(window, document);
