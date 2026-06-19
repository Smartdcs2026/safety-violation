/************************************************************
 * image-editor.js
 * เครื่องมือแก้ไขภาพหลักฐาน
 *
 * รองรับ:
 * - วาดเส้น
 * - ลูกศร
 * - สี่เหลี่ยม
 * - วงกลม
 * - เบลอเฉพาะจุด
 * - เลือกสี
 * - ปรับขนาด
 * - ย้อนกลับ
 * - คืนค่าภาพเดิม
 ************************************************************/

(function (window, document) {
  'use strict';

  const EDITOR_CONFIG = Object.freeze({
    MAX_CANVAS_DIMENSION:
      1280,

    MAX_HISTORY:
      6,

    DEFAULT_TOOL:
      'draw',

    DEFAULT_COLOR:
      '#ff0000',

    DEFAULT_SIZE:
      8,

    OUTPUT_MIME_TYPE:
      'image/jpeg',

    OUTPUT_QUALITY:
      0.9
  });


  const state = {
    initialized:
      false,

    opened:
      false,

    fileIndex:
      -1,

    originalFile:
      null,

    originalSnapshot:
      '',

    history:
      [],

    tool:
      EDITOR_CONFIG.DEFAULT_TOOL,

    color:
      EDITOR_CONFIG.DEFAULT_COLOR,

    size:
      EDITOR_CONFIG.DEFAULT_SIZE,

    drawing:
      false,

    startX:
      0,

    startY:
      0,

    lastX:
      0,

    lastY:
      0,

    activePointerId:
      null,

    canvas:
      null,

    context:
      null,

    sourceCanvas:
      null,

    sourceContext:
      null,

    modal:
      null,

    title:
      null,

    canvasWrapper:
      null,

    colorInput:
      null,

    sizeInput:
      null,

    sizeValue:
      null,

    undoButton:
      null,

    resetButton:
      null,

    saveButton:
      null,

    cancelButton:
      null,

    closeButton:
      null
  };


  document.addEventListener(
    'DOMContentLoaded',
    initializeEditor
  );


  /**********************************************************
   * เริ่มต้นระบบ
   **********************************************************/

  function initializeEditor() {
    if (state.initialized) {
      return;
    }

    createEditorModal();
    cacheEditorElements();
    bindEditorEvents();
    setActiveTool(
      EDITOR_CONFIG.DEFAULT_TOOL
    );

    state.initialized =
      true;
  }


  /**********************************************************
   * สร้างหน้าต่าง Editor
   **********************************************************/

  function createEditorModal() {
    const modal =
      document.createElement(
        'div'
      );

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
          <div>
            <p class="image-editor-overline">
              IMAGE EDITOR
            </p>

            <h2 id="imageEditorTitle">
              แก้ไขภาพหลักฐาน
            </h2>

            <p class="image-editor-subtitle">
              วาดเครื่องหมายหรือเบลอเฉพาะจุดก่อนบันทึก
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


        <div class="image-editor-toolbar">
          <div class="editor-tool-group">
            <span class="editor-tool-label">
              เครื่องมือ
            </span>

            <div class="editor-tool-buttons">
              <button
                type="button"
                class="editor-tool-button"
                data-editor-tool="draw"
              >
                วาดเส้น
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

              <button
                type="button"
                class="editor-tool-button"
                data-editor-tool="blur"
              >
                เบลอ
              </button>
            </div>
          </div>


          <div class="editor-setting-grid">
            <label class="editor-setting">
              <span>
                สี
              </span>

              <input
                id="imageEditorColor"
                type="color"
                value="#ff0000"
              >
            </label>

            <label class="editor-setting editor-size-setting">
              <span>
                ขนาด
                <strong id="imageEditorSizeValue">
                  8
                </strong>
              </span>

              <input
                id="imageEditorSize"
                type="range"
                min="2"
                max="40"
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
              id="imageEditorResetButton"
              type="button"
              class="editor-action-button"
            >
              คืนค่าภาพเดิม
            </button>
          </div>
        </div>


        <div
          id="imageEditorCanvasWrapper"
          class="image-editor-canvas-wrapper"
        >
          <canvas
            id="imageEditorCanvas"
            class="image-editor-canvas"
          ></canvas>
        </div>


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

    state.title =
      document.getElementById(
        'imageEditorTitle'
      );

    state.canvas =
      document.getElementById(
        'imageEditorCanvas'
      );

    state.context =
      state.canvas.getContext(
        '2d',
        {
          willReadFrequently:
            true
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
          willReadFrequently:
            true
        }
      );

    state.canvasWrapper =
      document.getElementById(
        'imageEditorCanvasWrapper'
      );

    state.colorInput =
      document.getElementById(
        'imageEditorColor'
      );

    state.sizeInput =
      document.getElementById(
        'imageEditorSize'
      );

    state.sizeValue =
      document.getElementById(
        'imageEditorSizeValue'
      );

    state.undoButton =
      document.getElementById(
        'imageEditorUndoButton'
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


  /**********************************************************
   * Event
   **********************************************************/

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
  }


  function handleDocumentClick(
    event
  ) {
    const toolButton =
      event.target.closest(
        '[data-editor-tool]'
      );

    if (toolButton) {
      setActiveTool(
        toolButton.dataset.editorTool
      );

      return;
    }

    const editButton =
      event.target.closest(
        '[data-edit-index]'
      );

    if (!editButton) {
      return;
    }

    const index =
      Number(
        editButton.dataset.editIndex
      );

    openEditor(
      index
    );
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
      undoLastAction();
    }
  }


  /**********************************************************
   * เปิด Editor
   **********************************************************/

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

      state.history =
        [];

      state.tool =
        EDITOR_CONFIG.DEFAULT_TOOL;

      state.color =
        EDITOR_CONFIG.DEFAULT_COLOR;

      state.size =
        EDITOR_CONFIG.DEFAULT_SIZE;

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

      setActiveTool(
        state.tool
      );

      state.title.textContent =
        'แก้ไขภาพหลักฐาน ' +
        (
          fileIndex + 1
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

      updateUndoButton();

      state.canvasWrapper.scrollTop =
        0;

      state.canvasWrapper.scrollLeft =
        0;

    } catch (error) {
      console.error(error);

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

    const maximumDimension =
      EDITOR_CONFIG
        .MAX_CANVAS_DIMENSION;

    const scale =
      Math.min(
        1,
        maximumDimension /
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


  /**********************************************************
   * เลือกเครื่องมือ
   **********************************************************/

  function setActiveTool(
    tool
  ) {
    const allowedTools = [
      'draw',
      'arrow',
      'rectangle',
      'circle',
      'blur'
    ];

    state.tool =
      allowedTools.includes(
        tool
      )
        ? tool
        : EDITOR_CONFIG.DEFAULT_TOOL;

    document
      .querySelectorAll(
        '[data-editor-tool]'
      )
      .forEach(
        function (button) {
          button.classList.toggle(
            'is-active',
            button.dataset.editorTool ===
              state.tool
          );
        }
      );

    state.canvas.classList.toggle(
      'is-blur-tool',
      state.tool === 'blur'
    );

    state.colorInput.disabled =
      state.tool === 'blur';
  }


  /**********************************************************
   * Pointer
   **********************************************************/

  function handlePointerDown(
    event
  ) {
    if (
      !state.opened ||
      state.drawing
    ) {
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

    try {
      state.canvas.setPointerCapture(
        event.pointerId
      );
    } catch (error) {
      // บาง Browser ไม่รองรับ
    }

    if (
      state.tool === 'draw'
    ) {
      beginFreehandStroke(
        point
      );

    } else if (
      state.tool === 'blur'
    ) {
      applyBlurBrush(
        point.x,
        point.y
      );
    }
  }


  function handlePointerMove(
    event
  ) {
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

    switch (
      state.tool
    ) {
      case 'draw':
        continueFreehandStroke(
          point
        );
        break;

      case 'blur':
        applyBlurAlongLine(
          state.lastX,
          state.lastY,
          point.x,
          point.y
        );
        break;

      case 'arrow':
      case 'rectangle':
      case 'circle':
        drawShapePreview(
          point
        );
        break;
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
      state.tool === 'arrow' ||
      state.tool === 'rectangle' ||
      state.tool === 'circle'
    ) {
      restoreCanvasFromSource();
      drawSelectedShape(
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
        (
          event.clientX -
          rectangle.left
        ) *
        scaleX,

      y:
        (
          event.clientY -
          rectangle.top
        ) *
        scaleY
    };
  }


  /**********************************************************
   * วาดเส้น
   **********************************************************/

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

    context.lineWidth =
      state.size;

    context.lineCap =
      'round';

    context.lineJoin =
      'round';

    context.strokeStyle =
      state.color;

    /*
     * ทำจุดเริ่มต้นให้มองเห็น
     */
    context.lineTo(
      point.x + 0.01,
      point.y + 0.01
    );

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


  /**********************************************************
   * รูปร่าง
   **********************************************************/

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


  function drawSelectedShape(
    startX,
    startY,
    endX,
    endY
  ) {
    switch (
      state.tool
    ) {
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
      Math.abs(
        endX -
        startX
      ) /
      2;

    const radiusY =
      Math.abs(
        endY -
        startY
      ) /
      2;

    context.save();

    context.beginPath();

    context.ellipse(
      centerX,
      centerY,
      Math.max(
        radiusX,
        1
      ),
      Math.max(
        radiusY,
        1
      ),
      0,
      0,
      Math.PI * 2
    );

    context.stroke();

    context.restore();
  }


  /**********************************************************
   * เบลอ
   **********************************************************/

  function applyBlurAlongLine(
    startX,
    startY,
    endX,
    endY
  ) {
    const distance =
      Math.hypot(
        endX - startX,
        endY - startY
      );

    const brushRadius =
      getBlurBrushRadius();

    const step =
      Math.max(
        brushRadius / 3,
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

      const x =
        startX +
        (
          endX -
          startX
        ) *
        ratio;

      const y =
        startY +
        (
          endY -
          startY
        ) *
        ratio;

      applyBlurBrush(
        x,
        y
      );
    }
  }


  function applyBlurBrush(
    x,
    y
  ) {
    const context =
      state.context;

    const radius =
      getBlurBrushRadius();

    const blurStrength =
      Math.max(
        5,
        state.size * 0.8
      );

    context.save();

    context.beginPath();

    context.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );

    context.clip();

    context.filter =
      'blur(' +
      blurStrength +
      'px)';

    context.drawImage(
      state.sourceCanvas,
      0,
      0
    );

    context.restore();
  }


  function getBlurBrushRadius() {
    return Math.max(
      15,
      state.size * 2.5
    );
  }


  /**********************************************************
   * Source Canvas
   **********************************************************/

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


  /**********************************************************
   * History
   **********************************************************/

  function createCanvasSnapshot() {
    return state.canvas.toDataURL(
      'image/jpeg',
      0.88
    );
  }


  function pushHistory() {
    const snapshot =
      createCanvasSnapshot();

    const previousSnapshot =
      state.history[
        state.history.length - 1
      ];

    if (
      snapshot ===
      previousSnapshot
    ) {
      return;
    }

    state.history.push(
      snapshot
    );

    while (
      state.history.length >
      EDITOR_CONFIG.MAX_HISTORY
    ) {
      state.history.shift();
    }

    updateUndoButton();
  }


  async function undoLastAction() {
    if (
      state.history.length <= 1
    ) {
      return;
    }

    state.history.pop();

    const previousSnapshot =
      state.history[
        state.history.length - 1
      ];

    await restoreSnapshot(
      previousSnapshot
    );

    updateUndoButton();
  }


  async function resetToOriginal() {
    if (
      !state.originalSnapshot
    ) {
      return;
    }

    await restoreSnapshot(
      state.originalSnapshot
    );

    state.history = [
      state.originalSnapshot
    ];

    updateUndoButton();
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
                'ไม่สามารถย้อนกลับภาพได้'
              )
            );
          };

        image.src =
          dataUrl;
      }
    );
  }


  function updateUndoButton() {
    state.undoButton.disabled =
      state.history.length <= 1;
  }


  /**********************************************************
   * บันทึกภาพ
   **********************************************************/

  async function saveEditedImage() {
    try {
      if (
        !state.opened ||
        state.fileIndex < 0
      ) {
        return;
      }

      setEditorBusy(
        true,
        'กำลังสร้างไฟล์ภาพ'
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
      console.error(error);

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
          function (blob) {
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


  /**********************************************************
   * ปิด Editor
   **********************************************************/

  function closeEditor() {
    state.modal.hidden =
      true;

    state.opened =
      false;

    state.drawing =
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

    document.body.classList.remove(
      'image-editor-open'
    );

    updateUndoButton();
  }


  /**********************************************************
   * สถานะกำลังทำงาน
   **********************************************************/

  function setEditorBusy(
    busy,
    message
  ) {
    const isBusy =
      busy === true;

    state.saveButton.disabled =
      isBusy;

    state.cancelButton.disabled =
      isBusy;

    state.closeButton.disabled =
      isBusy;

    state.undoButton.disabled =
      isBusy ||
      state.history.length <= 1;

    state.resetButton.disabled =
      isBusy;

    state.modal.classList.toggle(
      'is-busy',
      isBusy
    );

    state.saveButton.textContent =
      isBusy
        ? message ||
          'กำลังดำเนินการ'
        : 'ใช้ภาพที่แก้ไขแล้ว';
  }


  /**********************************************************
   * Public API
   **********************************************************/

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
