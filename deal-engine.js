(function () {
  const STORAGE_KEY = "bizfund-deal";

  const DEFAULT_DEAL = {
    merchantName: "",
    dba: "",
    owner: "",
    state: "",
    industry: "",
    requestedAmount: "",
    uploadedApplication: null,
    uploadedBankStatements: [],
    analysisStatus: "Awaiting Analysis",
    riskScore: "",
    recommendation: "",
    grossDeposits: "",
    adjustedRevenue: "",
    averageEndingBalance: "",
    negativeDays: "",
    nsfs: "",
    openMcaPositions: "",
    confidenceScore: "",
    recommendedOffer: "",
    factor: "",
    weeks: "",
  };

  function normalizeDeal(input = {}) {
    const nextDeal = {
      ...DEFAULT_DEAL,
      ...input,
      uploadedBankStatements: Array.isArray(input.uploadedBankStatements)
        ? input.uploadedBankStatements
        : [],
      uploadedApplication: input.uploadedApplication || null,
    };

    return nextDeal;
  }

  function readDeal() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        return normalizeDeal();
      }
      const parsed = JSON.parse(serialized);
      return normalizeDeal(parsed || {});
    } catch (error) {
      console.warn("Could not read deal from storage", error);
      return normalizeDeal();
    }
  }

  function writeDeal(partialDeal = {}) {
    const currentDeal = readDeal();
    const nextDeal = normalizeDeal({ ...currentDeal, ...partialDeal });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDeal));
    return nextDeal;
  }

  function getDealValue(field, fallback = "Awaiting Analysis") {
    const deal = readDeal();
    const value = deal[field];

    if (value === undefined || value === null || value === "") {
      return fallback;
    }

    if (field === "uploadedApplication") {
      return value && value.name ? value.name : fallback;
    }

    if (field === "uploadedBankStatements") {
      return Array.isArray(value) && value.length ? `${value.length} statement${value.length > 1 ? "s" : ""}` : fallback;
    }

    return value;
  }

  function formatFieldValue(field, value) {
    if (value === undefined || value === null || value === "") {
      return "Awaiting Analysis";
    }

    if (field === "requestedAmount" && typeof value === "number") {
      return `$${value.toLocaleString()}`;
    }

    if (field === "riskScore" && typeof value === "number") {
      return `${value}`;
    }

    if (field === "confidenceScore" && typeof value === "number") {
      return `${value}%`;
    }

    if (field === "uploadedApplication") {
      return value && value.name ? value.name : "Awaiting Analysis";
    }

    if (field === "uploadedBankStatements") {
      return Array.isArray(value) && value.length ? `${value.length} statement${value.length > 1 ? "s" : ""}` : "Awaiting Analysis";
    }

    return value;
  }

  function bindDealFields() {
    document.querySelectorAll("[data-deal-field]").forEach((element) => {
      const field = element.getAttribute("data-deal-field");
      const value = getDealValue(field);
      element.textContent = formatFieldValue(field, value);
    });
  }

  function syncFromUploadState(payload) {
    const nextDeal = writeDeal({
      uploadedApplication: payload.merchantApplication?.[0] || null,
      uploadedBankStatements: payload.bankStatements || [],
      analysisStatus: payload.merchantApplication?.length && payload.bankStatements?.length
        ? "Document Intake Complete"
        : "Awaiting Analysis",
    });
    bindDealFields();
    return nextDeal;
  }

  window.bizfundDealEngine = {
    STORAGE_KEY,
    DEFAULT_DEAL,
    readDeal,
    writeDeal,
    getDealValue,
    bindDealFields,
    syncFromUploadState,
    formatFieldValue,
  };
})();
