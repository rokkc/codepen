document.addEventListener("DOMContentLoaded", function () {
  // --- Override console methods (used for the preview iframe) ---
  (function () {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    function appendMessage(type, args) {
      const consoleOutput = document.getElementById("console-output");
      if (!consoleOutput) return;
      const message = args.map(arg =>
        typeof arg === "object" ? JSON.stringify(arg) : arg
      ).join(" ");
      const messageElement = document.createElement("div");
      messageElement.textContent = message;
      if (type === "error") messageElement.style.color = "red";
      else if (type === "warn") messageElement.style.color = "yellow";
      consoleOutput.appendChild(messageElement);
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    console.log = function(...args) {
      originalLog.apply(console, args);
      appendMessage("log", args);
    };
    console.warn = function(...args) {
      originalWarn.apply(console, args);
      appendMessage("warn", args);
    };
    console.error = function(...args) {
      originalError.apply(console, args);
      appendMessage("error", args);
    };
  })();

  // --- Initialize CodeMirror Editors ---
  const htmlEditor = CodeMirror.fromTextArea(document.getElementById("html"), {
    mode: "htmlmixed",
    lineNumbers: true,
    theme: "dracula",
    viewportMargin: Infinity,
    autoCloseBrackets: true,
    smartIndent: true,
    indentUnit: 4,
  });

  const cssEditor = CodeMirror.fromTextArea(document.getElementById("css"), {
    mode: "css",
    lineNumbers: true,
    theme: "dracula",
    viewportMargin: Infinity,
    autoCloseBrackets: true,
    smartIndent: true,
    indentUnit: 4,
  });

  const jsEditor = CodeMirror.fromTextArea(document.getElementById("js"), {
    mode: "javascript",
    lineNumbers: true,
    theme: "dracula",
    viewportMargin: Infinity,
    autoCloseBrackets: true,
    smartIndent: true,
    indentUnit: 4,
  });

  // --- Load saved code from localStorage ---
  const savedHTML = localStorage.getItem("htmlCode");
  const savedCSS = localStorage.getItem("cssCode");
  const savedJS = localStorage.getItem("jsCode");

  if (savedHTML) htmlEditor.setValue(savedHTML);
  if (savedCSS) cssEditor.setValue(savedCSS);
  if (savedJS) jsEditor.setValue(savedJS);

  // --- Update Preview ---
  function updatePreview() {
    const consoleOutput = document.getElementById("console-output");
    if (consoleOutput) {
      consoleOutput.textContent = "";
    }
    
    let htmlCode = htmlEditor.getValue();
    const cssCode = cssEditor.getValue();
    const jsCode = jsEditor.getValue();

    // Save code to localStorage
    localStorage.setItem("htmlCode", htmlCode);
    localStorage.setItem("cssCode", cssCode);
    localStorage.setItem("jsCode", jsCode);

    // Remove any local stylesheet link if present
    htmlCode = htmlCode.replace(/<link\s+rel=["']stylesheet["']\s+href=["']index\.css["']\s*\/?>/gi, "");

    const previewFrame = document.getElementById("preview");
    const preview = previewFrame.contentDocument || previewFrame.contentWindow.document;

    preview.open();
    preview.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <style>${cssCode}</style>
        <script>
          // Use the parent's overridden console
          console = window.parent.console;
          window.onerror = function(message, source, lineno, colno, error) {
            window.parent.console.error("Error: " + message + " at " + source + ":" + lineno + ":" + colno);
            return false;
          };
        <\/script>
      </head>
      <body>
        ${htmlCode}
        <script>${jsCode}<\/script>
      </body>
      </html>
    `);
    preview.close();
  }

  htmlEditor.on("change", updatePreview);
  cssEditor.on("change", updatePreview);
  jsEditor.on("change", updatePreview);
  updatePreview();

  // --- Horizontal Resizing (Editors vs. Preview) ---
  const resizer = document.getElementById("resizer");
  const editorContainer = document.querySelector(".editor-container");
  const container = document.querySelector(".container");

  let isResizingHorizontal = false;
  resizer.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    isResizingHorizontal = true;
    resizer.setPointerCapture(e.pointerId);
  });
  document.addEventListener("pointermove", (e) => {
    if (!isResizingHorizontal) return;
    const containerRect = container.getBoundingClientRect();
    let newWidth = e.clientX - containerRect.left;
    if (newWidth < 150) newWidth = 150;
    if (newWidth > containerRect.width - 150)
      newWidth = containerRect.width - 150;
    editorContainer.style.width = newWidth + "px";
  });
  document.addEventListener("pointerup", (e) => {
    if (isResizingHorizontal) {
      isResizingHorizontal = false;
      resizer.releasePointerCapture(e.pointerId);
    }
  });

  // --- Vertical Resizers for Code Editors ---
  const editorWrappers = document.querySelectorAll(".editor-wrapper");
  const verticalResizers = document.querySelectorAll(".vertical-resizer");

  let currentResizer = null;
  let startY = 0;
  let prevWrapper, nextWrapper;
  let prevInitialHeight = 0, nextInitialHeight = 0;

  verticalResizers.forEach((resizer, index) => {
    resizer.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      currentResizer = resizer;
      startY = e.clientY;
      prevWrapper = editorWrappers[index];
      nextWrapper = editorWrappers[index + 1];
      prevInitialHeight = prevWrapper.getBoundingClientRect().height;
      nextInitialHeight = nextWrapper.getBoundingClientRect().height;
      resizer.setPointerCapture(e.pointerId);
    });
  });

  document.addEventListener("pointermove", (e) => {
    if (!currentResizer) return;
    let deltaY = e.clientY - startY;
    let newPrevHeight = prevInitialHeight + deltaY;
    let newNextHeight = nextInitialHeight - deltaY;
    const minHeight = 50;
    if (newPrevHeight < minHeight) {
      newPrevHeight = minHeight;
      newNextHeight = prevInitialHeight + nextInitialHeight - minHeight;
    }
    if (newNextHeight < minHeight) {
      newNextHeight = minHeight;
      newPrevHeight = prevInitialHeight + nextInitialHeight - minHeight;
    }
    prevWrapper.style.height = newPrevHeight + "px";
    nextWrapper.style.height = newNextHeight + "px";

    htmlEditor.refresh();
    cssEditor.refresh();
    jsEditor.refresh();
  });

  document.addEventListener("pointerup", (e) => {
    if (currentResizer) {
      currentResizer.releasePointerCapture(e.pointerId);
      currentResizer = null;
    }
  });

  // --- Console Panel Resizing ---
  const consoleResizer = document.querySelector(".console-resizer");
  const previewFrame = document.getElementById("preview");
  const consoleContainer = document.querySelector(".console-container");

  let isResizingConsole = false;
  let startConsoleY = 0;
  let initialIframeHeight = 0;
  let initialConsoleHeight = 0;

  consoleResizer.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    isResizingConsole = true;
    startConsoleY = e.clientY;
    initialIframeHeight = previewFrame.getBoundingClientRect().height;
    initialConsoleHeight = consoleContainer.getBoundingClientRect().height;
    consoleResizer.setPointerCapture(e.pointerId);
  });

  document.addEventListener("pointermove", (e) => {
    if (!isResizingConsole) return;
    const deltaY = e.clientY - startConsoleY;
    let newIframeHeight = initialIframeHeight + deltaY;
    let newConsoleHeight = initialConsoleHeight - deltaY;
    const minHeight = 50;
    if (newIframeHeight < minHeight) {
      newIframeHeight = minHeight;
      newConsoleHeight = initialIframeHeight + initialConsoleHeight - minHeight;
    }
    if (newConsoleHeight < minHeight) {
      newConsoleHeight = minHeight;
      newIframeHeight = initialIframeHeight + initialConsoleHeight - minHeight;
    }
    previewFrame.style.height = newIframeHeight + "px";
    consoleContainer.style.height = newConsoleHeight + "px";
  });

  document.addEventListener("pointerup", (e) => {
    if (isResizingConsole) {
      consoleResizer.releasePointerCapture(e.pointerId);
      isResizingConsole = false;
    }
  });
});
