/* global pdfjsLib, JSZip */

const state = {
  mode: "single",
  pages: [],
  currentIndex: 0,
  pdfDocument: null,
  pdfBlob: null,
  pdfFallbackUrl: null,
  usingPdfFallback: false,
  cleanupCallbacks: [],
};

const viewer = document.getElementById("viewer");
const statusNode = document.getElementById("status");
const pageIndicator = document.getElementById("pageIndicator");
const prevButton = document.getElementById("prevPage");
const nextButton = document.getElementById("nextPage");
const singleControls = document.getElementById("singleControls");
const dropZone = document.getElementById("dropZone");

const workerUrl = new URL("./vendor/pdf.worker.min.js", window.location.href).toString();
if (window.location.protocol === "file:") {
  // Running from file:// blocks loading dedicated workers in some browsers.
  pdfjsLib.disableWorker = true;
} else {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}

const SUPPORTED_IMAGE = /\.(jpe?g|png|webp|gif)$/i;
const SUPPORTED_ARCHIVE = /\.(cbz|zip)$/i;

function setStatus(message, isError = false) {
  statusNode.textContent = message || "";
  statusNode.classList.toggle("error", isError);
}

function resetState() {
  state.pages.forEach((page) => page.cleanup?.());
  state.cleanupCallbacks.forEach((cb) => {
    try {
      cb();
    } catch (_) {
      /* ignore cleanup failure */
    }
  });
  state.pages = [];
  state.cleanupCallbacks = [];
  state.currentIndex = 0;
  if (state.pdfFallbackUrl) {
    URL.revokeObjectURL(state.pdfFallbackUrl);
    state.pdfFallbackUrl = null;
  }
  state.pdfBlob = null;
  state.usingPdfFallback = false;
  state.pdfDocument = null;
}

function entryName(file) {
  return file.webkitRelativePath || file.fullPath || file.name;
}

function sortEntries(files) {
  return [...files].sort((a, b) =>
    entryName(a).localeCompare(entryName(b), undefined, { numeric: true })
  );
}

async function handleInputFiles(fileList) {
  if (!fileList || fileList.length === 0) {
    return;
  }
  setStatus("Loading files…");
  resetState();

  const files = [...fileList];
  const onlyOne = files.length === 1;
  try {
    if (onlyOne && /\.pdf$/i.test(files[0].name)) {
      await loadPdf(files[0]);
    } else if (onlyOne && SUPPORTED_ARCHIVE.test(files[0].name)) {
      await loadArchive(files[0]);
    } else {
      await loadImages(files);
    }
  } catch (error) {
    console.error(error);
    resetState();
    setStatus(error.message || "Could not load files.", true);
    return;
  }

  setStatus(`Loaded ${state.pages.length || state.pdfDocument?.numPages || 0} pages.`);
  await renderCurrentMode();
}

function createImagePageFromFile(file) {
  let objectUrl;
  return {
    name: entryName(file),
    async getUrl() {
      if (!objectUrl) {
        objectUrl = URL.createObjectURL(file);
      }
      return objectUrl;
    },
    cleanup() {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    },
  };
}

function createImagePageFromZipEntry(entry) {
  let objectUrl;
  return {
    name: entry.name,
    async getUrl() {
      if (!objectUrl) {
        const blob = await entry.async("blob");
        objectUrl = URL.createObjectURL(blob);
      }
      return objectUrl;
    },
    cleanup() {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    },
  };
}

async function loadImages(files) {
  const imageFiles = sortEntries(files).filter((file) => SUPPORTED_IMAGE.test(file.name));
  if (!imageFiles.length) {
    throw new Error("No compatible image files found.");
  }
  state.pages = imageFiles.map((file) => createImagePageFromFile(file));
  pageIndicator.textContent = `1 / ${state.pages.length}`;
}

async function loadArchive(file) {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter(
    (entry) => !entry.dir && SUPPORTED_IMAGE.test(entry.name)
  );
  if (!entries.length) {
    throw new Error("Archive does not contain supported image files.");
  }
  const sortedEntries = entries.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
  state.pages = sortedEntries.map((entry) => createImagePageFromZipEntry(entry));
  pageIndicator.textContent = `1 / ${state.pages.length}`;
}

async function loadPdf(file) {
  state.pdfBlob = file;
  try {
    const data = await file.arrayBuffer();
    state.pdfDocument = await pdfjsLib.getDocument({ data }).promise;
    pageIndicator.textContent = `1 / ${state.pdfDocument.numPages}`;
    state.cleanupCallbacks.push(() => {
      if (state.pdfDocument?.cleanup) {
        state.pdfDocument.cleanup();
      }
    });
    state.usingPdfFallback = false;
  } catch (error) {
    console.error("Falling back to iframe PDF viewer:", error);
    state.pdfDocument = null;
    state.usingPdfFallback = true;
    if (state.pdfFallbackUrl) {
      URL.revokeObjectURL(state.pdfFallbackUrl);
    }
    state.pdfFallbackUrl = URL.createObjectURL(file);
    pageIndicator.textContent = "PDF preview";
    setStatus("Using built-in PDF viewer fallback.", true);
  }
}

async function renderCurrentMode() {
  if (state.mode === "single") {
    await renderSinglePage();
  } else {
    await renderVerticalPages();
  }
}

async function renderSinglePage() {
  viewer.classList.remove("vertical-mode");
  viewer.classList.add("single-mode");
  viewer.innerHTML = "";
  const container = document.createElement("div");
  container.className = "page-wrapper";
  viewer.appendChild(container);

  if (state.usingPdfFallback && state.pdfFallbackUrl) {
    const embed = document.createElement("iframe");
    embed.src = state.pdfFallbackUrl;
    embed.title = "PDF preview";
    embed.style.width = "100%";
    embed.style.height = "80vh";
    embed.setAttribute("loading", "lazy");
    container.appendChild(embed);
    pageIndicator.textContent = "PDF preview";
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  const total = state.pdfDocument?.numPages ?? state.pages.length;
  if (!total) {
    container.innerHTML = `<p class="placeholder">Select files or drop them here to start reading.</p>`;
    updatePager();
    return;
  }

  if (state.pdfDocument) {
    await renderPdfPageTo(container, state.currentIndex + 1);
  } else if (state.pages.length) {
    const img = document.createElement("img");
    img.alt = `Page ${state.currentIndex + 1}`;
    img.src = await state.pages[state.currentIndex].getUrl();
    container.appendChild(img);
  }
  updatePager();
}

async function renderPdfPageTo(container, pageNumber) {
  const page = await state.pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  container.appendChild(canvas);
  await page.render({ canvasContext: context, viewport }).promise;
}

async function renderVerticalPages() {
  viewer.classList.remove("single-mode");
  viewer.classList.add("vertical-mode");
  viewer.innerHTML = "";

  if (state.usingPdfFallback && state.pdfFallbackUrl) {
    const embed = document.createElement("iframe");
    embed.src = state.pdfFallbackUrl;
    embed.title = "PDF preview";
    embed.style.width = "100%";
    embed.style.height = "100vh";
    embed.setAttribute("loading", "lazy");
    viewer.appendChild(embed);
    pageIndicator.textContent = "PDF preview";
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  const total = state.pdfDocument?.numPages ?? state.pages.length;
  if (!total) {
    viewer.innerHTML = `<p class="placeholder">Load a PDF, CBZ, ZIP, or images to display pages here.</p>`;
    updatePager();
    return;
  }

  if (state.pdfDocument) {
    const total = state.pdfDocument.numPages;
    for (let i = 1; i <= total; i += 1) {
      const pageShell = document.createElement("div");
      pageShell.className = "page-shell";
      viewer.appendChild(pageShell);
      // Render sequentially to keep UI responsive.
      // eslint-disable-next-line no-await-in-loop
      await renderPdfPageTo(pageShell, i);
    }
    pageIndicator.textContent = `1 / ${total}`;
  } else if (state.pages.length) {
    for (let i = 0; i < state.pages.length; i += 1) {
      const img = document.createElement("img");
      img.alt = `Page ${i + 1}`;
      // eslint-disable-next-line no-await-in-loop
      img.src = await state.pages[i].getUrl();
      viewer.appendChild(img);
    }
    pageIndicator.textContent = `1 / ${state.pages.length}`;
  }
  updatePager();
}

function updatePager() {
  const total = state.pdfDocument?.numPages ?? state.pages.length;
  if (!total) {
    pageIndicator.textContent = "0 / 0";
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }
  const current = state.currentIndex + 1;
  pageIndicator.textContent = `${current} / ${total}`;
  prevButton.disabled = current <= 1;
  nextButton.disabled = current >= total;
}

function updateMode(mode) {
  state.mode = mode;
  singleControls.style.display = mode === "single" ? "flex" : "none";
  renderCurrentMode().catch((error) => {
    console.error(error);
    setStatus("Could not render pages.", true);
  });
}

function stepPage(delta) {
  const total = state.pdfDocument?.numPages ?? state.pages.length;
  const nextIndex = state.currentIndex + delta;
  if (nextIndex < 0 || nextIndex >= total) {
    return;
  }
  state.currentIndex = nextIndex;
  renderSinglePage();
}

document.getElementById("fileInput").addEventListener("change", (event) => {
  handleInputFiles(event.target.files);
  event.target.value = "";
});

document.getElementById("dirInput").addEventListener("change", (event) => {
  handleInputFiles(event.target.files);
  event.target.value = "";
});

prevButton.addEventListener("click", () => stepPage(-1));
nextButton.addEventListener("click", () => stepPage(1));

document.querySelectorAll('input[name="mode"]').forEach((radio) => {
  radio.addEventListener("change", (event) => {
    updateMode(event.target.value);
  });
});

document.addEventListener("keydown", (event) => {
  if (state.mode !== "single") {
    return;
  }
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    stepPage(1);
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    stepPage(-1);
  }
});

function readDirectoryEntries(directoryReader) {
  return new Promise((resolve, reject) => {
    directoryReader.readEntries((entries) => resolve(entries), reject);
  });
}

async function collectFilesFromEntry(entry) {
  if (entry.isFile) {
    return new Promise((resolve, reject) => {
      entry.file((file) => resolve([file]), reject);
    });
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const allEntries = [];
    let readMore = true;
    while (readMore) {
      // eslint-disable-next-line no-await-in-loop
      const entries = await readDirectoryEntries(reader);
      if (!entries.length) {
        readMore = false;
      } else {
        allEntries.push(...entries);
      }
    }
    const filePromises = allEntries.map((child) => collectFilesFromEntry(child));
    const nested = await Promise.all(filePromises);
    return nested.flat();
  }
  return [];
}

async function acceptDrop(event) {
  event.preventDefault();
  dropZone.classList.remove("dragover");
  const { items, files } = event.dataTransfer;
  if (items && items.length) {
    const pending = [];
    for (const item of items) {
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          pending.push(collectFilesFromEntry(entry));
        } else {
          const file = item.getAsFile();
          if (file) {
            pending.push(Promise.resolve([file]));
          }
        }
      }
    }
    const results = await Promise.all(pending);
    const flattened = results.flat();
    handleInputFiles(flattened);
  } else if (files && files.length) {
    handleInputFiles(files);
  }
}

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (event) => {
  acceptDrop(event).catch((error) => {
    console.error(error);
    setStatus("Could not read dropped items.", true);
  });
});

window.addEventListener("error", (event) => {
  if (event && event.message) {
    setStatus(`Error: ${event.message}`, true);
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (event && event.reason) {
    const message = event.reason.message || String(event.reason);
    setStatus(`Error: ${message}`, true);
  }
});
dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    document.getElementById("fileInput").click();
  }
});

viewer.addEventListener("dblclick", () => {
  if (state.mode === "single") {
    updateMode("vertical");
    document.querySelector('input[name="mode"][value="vertical"]').checked = true;
  } else {
    updateMode("single");
    document.querySelector('input[name="mode"][value="single"]').checked = true;
  }
});

setStatus("Ready to load files.");
updatePager();
updateMode("single");
