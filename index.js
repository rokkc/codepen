document.addEventListener("DOMContentLoaded", function () {

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

  const savedHTML = localStorage.getItem("htmlCode");
  const savedCSS = localStorage.getItem("cssCode");
  const savedJS = localStorage.getItem("jsCode");

  if (savedHTML) {
    htmlEditor.setValue(savedHTML);
  }
  if (savedCSS) {
    cssEditor.setValue(savedCSS);
  }
  if (savedJS) {
    jsEditor.setValue(savedJS);
  }

  function updatePreview() {
    let htmlCode = htmlEditor.getValue();
    const cssCode = cssEditor.getValue();
    const jsCode = jsEditor.getValue();

    localStorage.setItem("htmlCode", htmlCode);
    localStorage.setItem("cssCode", cssCode);
    localStorage.setItem("jsCode", jsCode);

    htmlCode = htmlCode.replace(
      /<link\s+rel=["']stylesheet["']\s+href=["']index\.css["']\s*\/?>/gi,
      ""
    );

    const previewFrame = document.getElementById("preview");
    const preview =
      previewFrame.contentDocument || previewFrame.contentWindow.document;

    preview.open();
    preview.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <style>${cssCode}</style>
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

  const editorWrappers = document.querySelectorAll(".editor-wrapper");
  const verticalResizers = document.querySelectorAll(".vertical-resizer");

  let currentResizer = null;
  let startY = 0;
  let prevWrapper, nextWrapper;
  let prevInitialHeight = 0,
    nextInitialHeight = 0;

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
});