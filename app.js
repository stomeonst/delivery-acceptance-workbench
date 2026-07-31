const templates = {
  software: {
    name: "Software release",
    requiredFiles: [
      "test-plan.md",
      "bug-log.csv",
      "release-summary.md",
      "environment-matrix.csv"
    ],
    textRules: {
      "test-plan.md": ["## Scope", "## Acceptance criteria", "## Test cases"],
      "release-summary.md": ["## Release recommendation", "## Known risks", "## Evidence"]
    },
    csvRules: {
      "bug-log.csv": ["ticket_id", "severity", "environment", "steps", "expected", "actual", "evidence", "status"],
      "environment-matrix.csv": ["platform", "device", "os", "browser", "result"]
    }
  },
  workflow: {
    name: "Workflow handoff",
    requiredFiles: [
      "diagnostic-report.md",
      "workflow-map.md",
      "acceptance-checklist.md",
      "operations-guide.md",
      "exception-log.csv",
      "run-evidence.json"
    ],
    textRules: {
      "diagnostic-report.md": ["## Current bottleneck", "## Proposed automation", "## Human approval points"],
      "operations-guide.md": ["## Start", "## Stop", "## Recovery", "## Ownership"],
      "acceptance-checklist.md": ["## Acceptance criteria", "## Reliability window", "## Sign-off"]
    },
    csvRules: {
      "exception-log.csv": ["timestamp", "workflow", "error", "impact", "resolution", "owner"]
    },
    jsonRules: {
      "run-evidence.json": ["run_id", "started_at", "finished_at", "status", "records_processed", "exceptions", "human_approvals"]
    }
  }
};

const samples = {
  "software-pass": {
    template: "software",
    total: 26,
    passed: 26,
    title: "Software release package is ready",
    description: "Required files, document sections, and evidence fields match the active rules.",
    items: [
      ["pass", "Required file", "test-plan.md", "File exists", "Found"],
      ["pass", "Test plan section", "Acceptance criteria", "Must be included", "Found"],
      ["pass", "Bug evidence fields", "bug-log.csv", "8 required fields", "All present"],
      ["pass", "Environment fields", "environment-matrix.csv", "5 required fields", "All present"],
      ["pass", "Release summary sections", "release-summary.md", "3 required sections", "All present"],
      ["pass", "File content digest", "Delivery folder", "Unique content", "No duplicate SHA-256"]
    ]
  },
  "workflow-pass": {
    template: "workflow",
    total: 32,
    passed: 32,
    title: "Workflow handoff package is ready",
    description: "Run evidence, exception records, human approvals, and recovery instructions are complete.",
    items: [
      ["pass", "Required file", "run-evidence.json", "File exists", "Found"],
      ["pass", "Human approval points", "diagnostic-report.md", "Must be documented", "Found"],
      ["pass", "Reliability window", "acceptance-checklist.md", "Must be documented", "Found"],
      ["pass", "Recovery procedure", "operations-guide.md", "Must be documented", "Found"],
      ["pass", "Exception log fields", "exception-log.csv", "6 required fields", "All present"],
      ["pass", "Run evidence fields", "run-evidence.json", "7 required fields", "All present"]
    ]
  },
  "workflow-fail": {
    template: "workflow",
    total: 25,
    passed: 11,
    title: "Workflow handoff needs more evidence",
    description: "14 checks failed. Add the missing run evidence, document sections, and exception fields before delivery.",
    items: [
      ["fail", "Required file", "run-evidence.json", "File exists", "Missing"],
      ["fail", "Diagnostic section", "Human approval points", "Must be included", "Missing"],
      ["fail", "Acceptance section", "Reliability window", "Must be included", "Missing"],
      ["fail", "Operations section", "Recovery", "Must be included", "Missing"],
      ["fail", "Exception field", "impact", "CSV header includes field", "Missing"],
      ["fail", "Exception field", "owner", "CSV header includes field", "Missing"]
    ]
  }
};

let activeTemplate = "software";

const evidenceList = document.querySelector("#evidence-list");
const statusSeal = document.querySelector("#status-seal");
const statusWord = document.querySelector("#status-word");
const summaryTitle = document.querySelector("#summary-title");
const summaryDescription = document.querySelector("#summary-description");
const scorePassed = document.querySelector("#score-passed");
const scoreTotal = document.querySelector("#score-total");
const fileInput = document.querySelector("#file-input");

function renderResult(result) {
  const isPass = result.passed === result.total;
  statusSeal.className = `status-seal ${isPass ? "pass" : "fail"}`;
  statusWord.textContent = isPass ? "PASS" : "HOLD";
  summaryTitle.textContent = result.title;
  summaryDescription.textContent = result.description;
  scorePassed.textContent = result.passed;
  scoreTotal.textContent = result.total;

  evidenceList.replaceChildren();
  result.items.forEach((item, index) => {
    const [state, rule, target, expected, actual] = item;
    const row = document.createElement("article");
    row.className = `evidence-item ${state}`;
    row.style.animationDelay = `${index * 42}ms`;
    row.innerHTML = `
      <span class="evidence-state">${state === "pass" ? "✓" : "!"}</span>
      <span class="evidence-rule"><strong>${escapeHtml(rule)}</strong><small>${escapeHtml(target)}</small></span>
      <span class="evidence-value"><strong>Actual: ${escapeHtml(actual)}</strong><small>Expected: ${escapeHtml(expected)}</small></span>
      <span class="evidence-badge">${state === "pass" ? "PASS" : "FAIL"}</span>
    `;
    evidenceList.append(row);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function activateSample(sampleName) {
  const sample = samples[sampleName];
  activeTemplate = sample.template;
  document.querySelectorAll(".sample-button").forEach(button => {
    button.classList.toggle("active", button.dataset.sample === sampleName);
  });
  document.querySelectorAll(".template-button").forEach(button => {
    button.classList.toggle("active", button.dataset.template === activeTemplate);
  });
  renderResult(sample);
}

document.querySelectorAll(".sample-button").forEach(button => {
  button.addEventListener("click", () => activateSample(button.dataset.sample));
});

document.querySelectorAll(".template-button").forEach(button => {
  button.addEventListener("click", () => {
    const template = button.dataset.template;
    activateSample(template === "software" ? "software-pass" : "workflow-pass");
  });
});

fileInput.addEventListener("change", async event => {
  const files = [...event.target.files];
  if (!files.length) return;
  const result = await inspectFiles(files, templates[activeTemplate]);
  document.querySelectorAll(".sample-button").forEach(button => button.classList.remove("active"));
  renderResult(result);
});

async function inspectFiles(files, template) {
  const fileMap = new Map(files.map(file => [file.name, file]));
  const items = [];

  template.requiredFiles.forEach(filename => {
    const exists = fileMap.has(filename);
    items.push([
      exists ? "pass" : "fail",
      "Required file",
      filename,
      "File exists",
      exists ? "Found" : "Missing"
    ]);
  });

  for (const [filename, requiredStrings] of Object.entries(template.textRules || {})) {
    const file = fileMap.get(filename);
    if (!file) continue;
    const content = await file.text();
    requiredStrings.forEach(requiredString => {
      const found = content.includes(requiredString);
      items.push([
        found ? "pass" : "fail",
        "Document section",
        filename,
        requiredString,
        found ? "Found" : "Missing"
      ]);
    });
  }

  for (const [filename, columns] of Object.entries(template.csvRules || {})) {
    const file = fileMap.get(filename);
    if (!file) continue;
    const [header = ""] = (await file.text()).split(/\r?\n/);
    const actualColumns = header.split(",").map(value => value.trim().replace(/^"|"$/g, ""));
    columns.forEach(column => {
      const found = actualColumns.includes(column);
      items.push([
        found ? "pass" : "fail",
        "CSV field",
        filename,
        column,
        found ? "Found" : "Missing"
      ]);
    });
  }

  for (const [filename, keys] of Object.entries(template.jsonRules || {})) {
    const file = fileMap.get(filename);
    if (!file) continue;
    let data = {};
    try {
      data = JSON.parse(await file.text());
    } catch {
      items.push(["fail", "JSON format", filename, "Valid JSON", "Could not parse"]);
      continue;
    }
    keys.forEach(key => {
      const found = Object.hasOwn(data, key);
      items.push([
        found ? "pass" : "fail",
        "JSON field",
        filename,
        key,
        found ? "Found" : "Missing"
      ]);
    });
  }

  const passed = items.filter(item => item[0] === "pass").length;
  const total = items.length;
  const failures = total - passed;
  return {
    passed,
    total,
    title: failures ? `${template.name} package needs more evidence` : `${template.name} package passed`,
    description: failures
      ? `${failures} checks failed. Review the details below.`
      : "All required file, section, and field checks available in this browser passed.",
    items
  };
}

renderResult(samples["software-pass"]);
