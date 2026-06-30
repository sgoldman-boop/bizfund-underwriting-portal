const today = new Date();
const dayLabel = today.toLocaleDateString("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dealEngine = window.bizfundDealEngine;

function renderDealFields() {
  if (!dealEngine) return;
  dealEngine.bindDealFields();
}

const heading = document.querySelector(".topbar h2");
if (heading) {
  const currentPath = window.location.pathname.split("/").pop();
  if (currentPath === "new-underwrite.html") {
    heading.textContent = `New Underwrite · ${dayLabel}`;
  } else {
    heading.textContent = `Premium fintech workspace · ${dayLabel}`;
  }
}

const cards = document.querySelectorAll(".kpi-card, .panel, .upload-card");
cards.forEach((card, index) => {
  card.style.transitionDelay = `${index * 40}ms`;
});

renderDealFields();

const uploadCards = document.querySelectorAll(".upload-card");
const button = document.getElementById("run-underwriting");
const guidance = document.getElementById("upload-guidance");
const checklistItems = Array.from(document.querySelectorAll(".checklist-item"));
const requiredState = {
  "merchant-application": 1,
  "bank-statements": 3,
};

const fileState = {
  "merchant-application": [],
  "bank-statements": [],
};

function formatFileSize(size) {
  if (!size) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function fileToMeta(file) {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  };
}

function persistUploadState() {
  const payload = {
    merchantApplication: fileState["merchant-application"].map(fileToMeta),
    bankStatements: fileState["bank-statements"].map(fileToMeta),
  };
  sessionStorage.setItem("bizfund-upload-state", JSON.stringify(payload));
  if (dealEngine) {
    dealEngine.syncFromUploadState(payload);
  }
}

function updateChecklist() {
  const applicationCount = fileState["merchant-application"].length;
  const statementCount = fileState["bank-statements"].length;
  const ready = applicationCount >= requiredState["merchant-application"] && statementCount >= requiredState["bank-statements"];

  checklistItems.forEach((item) => {
    item.classList.remove("is-complete");
  });

  const applicationItem = checklistItems.find((item) => item.dataset.checklist === "merchant-application");
  const bankItem = checklistItems.find((item) => item.dataset.checklist === "bank-statements");
  const readyItem = checklistItems.find((item) => item.dataset.checklist === "ready");

  if (applicationItem) {
    applicationItem.textContent = `✓ Merchant Application${applicationCount ? ` (${fileState["merchant-application"][0]?.name || "Uploaded"})` : ""}`;
    if (applicationCount) {
      applicationItem.classList.add("is-complete");
    }
  }

  if (bankItem) {
    bankItem.textContent = `✓ Bank Statements (${statementCount} of 10)`;
    if (statementCount >= requiredState["bank-statements"]) {
      bankItem.classList.add("is-complete");
    }
  }

  if (readyItem) {
    if (ready) {
      readyItem.textContent = "✓ Ready for Analysis";
      readyItem.classList.add("is-complete");
    } else {
      readyItem.textContent = "✓ Ready for Analysis";
    }
  }
}

function updateButtonState() {
  const ready = Object.entries(requiredState).every(([key, min]) => fileState[key].length >= min);
  if (button) {
    button.disabled = !ready;
    button.classList.toggle("enabled", ready);
  }
  if (guidance) {
    if (ready) {
      guidance.textContent = "Merchant application and bank statements are ready. Launch underwriting.";
    } else {
      guidance.textContent = "Upload the merchant application and at least 3 bank statements to unlock underwriting.";
    }
  }
  updateChecklist();
  persistUploadState();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isPdfFile(file) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function setUploadState(card, files, progressValue) {
  const input = card.querySelector("input");
  const label = card.querySelector(".drop-state");
  const progressBar = card.querySelector(".upload-progress span");
  const status = card.querySelector(".upload-status");
  const fileList = card.querySelector(".uploaded-files");
  const counter = card.querySelector(".statement-count");
  const addMoreButton = card.querySelector(".add-more-btn");
  const key = card.dataset.uploadKey;

  if (!label || !progressBar || !status || !fileList || !input) return;

  if (key === "bank-statements") {
    const currentFiles = fileState[key] || [];
    const incomingFiles = Array.from(files || []).filter(isPdfFile);
    const validFiles = [...currentFiles, ...incomingFiles]
      .slice(0, 10)
      .sort((a, b) => (a.lastModified || 0) - (b.lastModified || 0));
    fileState[key] = validFiles;

    const fileNames = validFiles.map((file) => file.name);
    label.textContent = fileNames.length ? `${fileNames.length} statement${fileNames.length > 1 ? "s" : ""} ready` : "Upload 1-10 bank statement PDFs";
    progressBar.style.width = `${Math.min(100, (fileNames.length / 10) * 100)}%`;
    status.textContent = fileNames.length ? "Ready for AI" : "Pending";
    if (counter) {
      counter.textContent = `${fileNames.length} of 10 statements uploaded`;
    }
    if (addMoreButton) {
      addMoreButton.disabled = fileNames.length >= 10;
      addMoreButton.textContent = fileNames.length >= 10 ? "Maximum reached" : "Add More Statements";
    }
    fileList.innerHTML = validFiles
      .map((file, index) => `
        <li class="statement-item">
          <span class="statement-name">${escapeHtml(file.name)}</span>
          <span class="statement-size">${formatFileSize(file.size)}</span>
          <button type="button" class="remove-statement-btn" data-index="${index}">Remove</button>
        </li>
      `)
      .join("");

    card.classList.toggle("uploaded", fileNames.length > 0);
    updateButtonState();
    return;
  }

  const selectedFiles = Array.from(files || []).filter(isPdfFile);
  const fileNames = selectedFiles.map((file) => file.name);
  fileState[key] = selectedFiles;

  label.textContent = fileNames.length ? `${fileNames.length} file${fileNames.length > 1 ? "s" : ""} ready` : "Drag and drop or browse";
  progressBar.style.width = `${progressValue}%`;
  status.textContent = progressValue === 100 ? "Uploaded" : "Uploading";
  fileList.innerHTML = fileNames.length
    ? selectedFiles
        .slice(0, 3)
        .map((file) => `<li>${escapeHtml(file.name)} · ${formatFileSize(file.size)}</li>`)
        .join("")
    : "";

  if (fileNames.length) {
    card.classList.add("uploaded");
  } else {
    card.classList.remove("uploaded");
  }

  updateButtonState();
}

uploadCards.forEach((card) => {
  const input = card.querySelector("input");
  const key = card.dataset.uploadKey;
  const addMoreButton = card.querySelector(".add-more-btn");

  ["dragenter", "dragover"].forEach((eventName) => {
    card.addEventListener(eventName, (event) => {
      event.preventDefault();
      card.classList.add("drag-over");
    });
  });

  ["dragleave", "dragend", "drop"].forEach((eventName) => {
    card.addEventListener(eventName, () => {
      card.classList.remove("drag-over");
    });
  });

  card.addEventListener("drop", (event) => {
    event.preventDefault();
    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles?.length) {
      input.files = droppedFiles;
      setUploadState(card, droppedFiles, 100);
    }
  });

  input?.addEventListener("change", () => {
    if (input.files?.length) {
      setUploadState(card, input.files, 100);
      input.value = "";
    }
  });

  card.addEventListener("click", (event) => {
    if (event.target.closest(".remove-statement-btn")) {
      event.preventDefault();
      event.stopPropagation();
      const index = Number(event.target.dataset.index);
      const currentFiles = fileState[key] || [];
      const updatedFiles = currentFiles.filter((_, fileIndex) => fileIndex !== index);
      fileState[key] = updatedFiles;
      setUploadState(card, updatedFiles, 100);
      return;
    }

    if (event.target === input || event.target.closest(".upload-card-main")) {
      input.click();
    }
  });

  addMoreButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    input.click();
  });

  setUploadState(card, [], 0);
});

button?.addEventListener("click", () => {
  if (!button.disabled) {
    persistUploadState();
    window.location.href = "analysis.html";
  }
});

updateButtonState();
