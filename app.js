/* ─────────────────────────────────────────────
   FAKESCOPE — app.js
   Handles: upload, drag-drop, preview, API call, results
───────────────────────────────────────────── */

const API_URL = '';

// ── DOM refs ──────────────────────────────────
const uploadZone     = document.getElementById('uploadZone');
const fileInput      = document.getElementById('fileInput');
const browseBtn      = document.getElementById('browseBtn');
const dropInner      = document.getElementById('dropInner');

const previewWrap    = document.getElementById('previewWrap');
const previewImg     = document.getElementById('previewImg');
const clearBtn       = document.getElementById('clearBtn');
const analyzeBtn     = document.getElementById('analyzeBtn');

const loadingWrap    = document.getElementById('loadingWrap');

const resultWrap     = document.getElementById('resultWrap');
const resultBadge    = document.getElementById('resultBadge');
const resultValue    = document.getElementById('resultValue');
const confPct        = document.getElementById('confPct');
const confBarFill    = document.getElementById('confBarFill');
const expList        = document.getElementById('expList');
const analyzeAgainBtn = document.getElementById('analyzeAgainBtn');

const errorWrap      = document.getElementById('errorWrap');
const errorMsg       = document.getElementById('errorMsg');
const retryBtn       = document.getElementById('retryBtn');

// ── State ─────────────────────────────────────
let selectedFile = null;

// ── Helpers ───────────────────────────────────
function show(el)  { el.style.display = 'block'; }
function hide(el)  { el.style.display = 'none'; }

function resetAll() {
  hide(previewWrap);
  hide(loadingWrap);
  hide(resultWrap);
  hide(errorWrap);
  show(uploadZone);

  selectedFile = null;
  fileInput.value = '';
  previewImg.src = '';

  resultBadge.className = 'result-badge';
  confBarFill.className = 'conf-bar-fill';
  expList.innerHTML = '';
}

// ── File Handling ─────────────────────────────
function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showError('Please upload a valid image file (JPG, PNG, WEBP).');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError('File is too large. Please upload an image under 10MB.');
    return;
  }

  selectedFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    hide(uploadZone);
    hide(resultWrap);
    hide(errorWrap);
    show(previewWrap);
  };
  reader.readAsDataURL(file);
}

// ── Upload Zone Events ────────────────────────
browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

uploadZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// ── Clear ─────────────────────────────────────
clearBtn.addEventListener('click', resetAll);
analyzeAgainBtn.addEventListener('click', resetAll);
retryBtn.addEventListener('click', resetAll);

// ── Analyze ───────────────────────────────────
analyzeBtn.addEventListener('click', runAnalysis);

async function runAnalysis() {
  if (!selectedFile) return;

  hide(previewWrap);
  hide(errorWrap);
  hide(resultWrap);
  show(loadingWrap);

  const formData = new FormData();
  formData.append('image', selectedFile);

  try {
    const response = await fetch(`${API_URL}/detect`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server returned an error.');
    }

    hide(loadingWrap);
    showResults(data);

  } catch (err) {
    hide(loadingWrap);
    if (err.message === 'Failed to fetch') {
      showError('Cannot connect to the backend. Make sure your Flask server is running on port 7860.');
    } else {
      showError(err.message || 'An unexpected error occurred.');
    }
  }
}

// ── Show Results ──────────────────────────────
function showResults(data) {
  const { result, confidence, explanation } = data;
  const isFake = result === 'Fake';

  // Badge
  resultBadge.textContent = result.toUpperCase();
  resultBadge.className   = `result-badge ${isFake ? 'fake' : 'real'}`;
  resultValue.textContent = isFake ? 'AI-Generated' : 'Authentic';
  resultValue.style.color = isFake ? 'var(--accent2)' : 'var(--accent)';

  // Confidence bar
  confPct.textContent = `${confidence}%`;
  confBarFill.className = `conf-bar-fill ${isFake ? 'fake' : 'real'}`;

  // Animate bar after a short delay
  setTimeout(() => {
    confBarFill.style.width = `${confidence}%`;
  }, 100);

  // Explanation items
  expList.innerHTML = '';
  (explanation || []).forEach((item, i) => {
    const li = document.createElement('li');
    li.textContent = item;
    li.style.animationDelay = `${i * 80}ms`;
    li.style.animation = 'fadeUp 0.4s ease both';
    expList.appendChild(li);
  });

  show(resultWrap);
}

// ── Show Error ────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  hide(loadingWrap);
  hide(previewWrap);
  show(uploadZone);
  show(errorWrap);
}

// ── Paste from clipboard ──────────────────────
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) handleFile(file);
      break;
    }
  }
});
