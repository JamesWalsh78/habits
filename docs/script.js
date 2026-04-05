/* Legacy script disabled during rebuild

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("dateField").value = today;

  const habitForm = document.getElementById("habitForm");
  habitForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission

    const formData = {
      date: document.getElementById("dateField").value,
      water: document.getElementById("waterSlider").value,
      running: document.getElementById("runningRange").value,
      gym: document.getElementById("gymSlider").value,
      reading: document.getElementById("readingSlider").value,
      friends: document.getElementById("friendsDropdown").value,
    };

    const backendURL = "https://your-app-name.onrender.com/api/habits"; // Update with your actual Render URL

    try {
      const response = await fetch(backendURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('✅ Data submitted successfully!');
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.message || 'Submission failed.'}`);
      }
    } catch (error) {
      console.error("Request failed", error);
      alert("❌ Failed to connect to the server.");
    }
  });
});
*/

const STORAGE_KEY = "walsh-diet-autumn-2026.entries";
const SCREEN_KEY = "walsh-diet-autumn-2026.screen";
const DIET_START_DATE = "2026-04-06";
const METRIC_KEYS = [
  "calories",
  "water",
  "creatine",
  "protein",
  "carbs",
  "fats",
  "exercise",
  "steps",
  "meditation",
  "reading",
  "spanish",
  "screenTime",
  "wakeTime",
  "bedTime",
];

const dom = {};
const state = { entries: {} };

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  state.entries = loadEntries();
  populateTimeSelects();
  bindEvents();
  switchScreen(localStorage.getItem(SCREEN_KEY) || "overview");
  loadFormForDate(getTodayLocalDate());
  renderAll();
});

function cacheDom() {
  dom.heroSummary = document.getElementById("heroSummary");
  dom.tabs = Array.from(document.querySelectorAll(".tab-button"));
  dom.screens = Array.from(document.querySelectorAll(".screen"));
  dom.form = document.getElementById("entryForm");
  dom.entryMode = document.getElementById("entryMode");
  dom.overallStatusTitle = document.getElementById("overallStatusTitle");
  dom.overallStatusText = document.getElementById("overallStatusText");
  dom.overallStatusBadge = document.getElementById("overallStatusBadge");
  dom.completionFill = document.getElementById("completionFill");
  dom.completionText = document.getElementById("completionText");
  dom.statusBreakdown = document.getElementById("statusBreakdown");
  dom.saveButton = document.getElementById("saveButton");
  dom.resetButton = document.getElementById("resetButton");
  dom.entryList = document.getElementById("entryList");
  dom.totalsGrid = document.getElementById("totalsGrid");
  dom.heatmap = document.getElementById("consistencyHeatmap");
  dom.exportCsvButton = document.getElementById("exportCsvButton");
  dom.exportJsonButton = document.getElementById("exportJsonButton");
  dom.importButton = document.getElementById("importButton");
  dom.importFile = document.getElementById("importFile");
  dom.toast = document.getElementById("toast");

  dom.fields = {
    date: document.getElementById("date"),
    wakeTime: document.getElementById("wakeTime"),
    bedTime: document.getElementById("bedTime"),
    calories: document.getElementById("calories"),
    water: document.getElementById("water"),
    creatine: document.getElementById("creatine"),
    protein: document.getElementById("protein"),
    carbs: document.getElementById("carbs"),
    fats: document.getElementById("fats"),
    runKm: document.getElementById("runKm"),
    swimKm: document.getElementById("swimKm"),
    gym: document.getElementById("gym"),
    steps: document.getElementById("steps"),
    meditation: document.getElementById("meditation"),
    reading: document.getElementById("reading"),
    spanish: document.getElementById("spanish"),
    screenTime: document.getElementById("screenTime"),
  };
}

function populateTimeSelects() {
  const selects = [dom.fields.wakeTime, dom.fields.bedTime];

  selects.forEach((select) => {
    if (!select) {
      return;
    }

    const placeholder = '<option value="">Select time</option>';
    const options = [];

    for (let minutes = 0; minutes < 1440; minutes += 5) {
      const value = minutesToTimeValue(minutes);
      options.push(`<option value="${value}">${formatTimeSelectLabel(minutes)}</option>`);
    }

    select.innerHTML = `${placeholder}${options.join("")}`;
  });
}

function bindEvents() {
  dom.tabs.forEach((button) => {
    button.addEventListener("click", () => switchScreen(button.dataset.target));
  });

  Object.values(dom.fields).forEach((field) => {
    field.addEventListener("input", handleFieldUpdate);
    field.addEventListener("change", handleFieldUpdate);
  });

  dom.form.addEventListener("submit", handleSave);
  dom.resetButton.addEventListener("click", () => {
    loadFormForDate(dom.fields.date.value || getTodayLocalDate());
    showToast("Form cleared for the selected date.");
  });

  dom.entryList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-date]");
    if (!button) {
      return;
    }

    loadFormForDate(button.dataset.editDate);
    switchScreen("input");
    showToast("Saved day loaded for editing.");
  });

  dom.exportCsvButton.addEventListener("click", exportCsv);
  dom.exportJsonButton.addEventListener("click", exportJson);
  dom.importButton.addEventListener("click", () => dom.importFile.click());
  dom.importFile.addEventListener("change", importData);
}

function handleFieldUpdate(event) {
  if (event.target.id === "date") {
    loadFormForDate(event.target.value);
    return;
  }

  updateLiveStatus();
}

function handleSave(event) {
  event.preventDefault();

  if (!dom.form.reportValidity()) {
    showToast("Please complete the highlighted fields first.");
    return;
  }

  const entry = readForm();
  const evaluation = evaluateEntry(entry);

  if (!evaluation.complete) {
    showToast("Please finish every tracked metric before saving.");
    return;
  }

  const existed = hasSavedEntry(entry.date);
  state.entries[entry.date] = entry;
  persistEntries();
  renderAll();
  loadFormForDate(entry.date);
  showToast(existed ? "Entry updated." : "Entry saved.");
}

function loadFormForDate(date) {
  const safeDate = date || getTodayLocalDate();
  const existing = state.entries[safeDate];
  const formData = existing || getEmptyForm(safeDate);

  Object.entries(dom.fields).forEach(([key, field]) => {
    const value = formData[key];
    field.value = value === null || value === undefined ? "" : String(value);
  });

  dom.fields.gym.value = formData.gym || "None";
  updateLiveStatus();
}

function getEmptyForm(date) {
  return {
    date,
    wakeTime: "",
    bedTime: "",
    calories: "",
    water: "",
    creatine: "",
    protein: "",
    carbs: "",
    fats: "",
    runKm: "",
    swimKm: "",
    gym: "None",
    steps: "",
    meditation: "",
    reading: "",
    spanish: "",
    screenTime: "",
  };
}

function readForm() {
  return {
    date: dom.fields.date.value,
    wakeTime: dom.fields.wakeTime.value,
    bedTime: dom.fields.bedTime.value,
    calories: numberValue(dom.fields.calories.value),
    water: numberValue(dom.fields.water.value),
    creatine: dom.fields.creatine.value,
    protein: numberValue(dom.fields.protein.value),
    carbs: numberValue(dom.fields.carbs.value),
    fats: numberValue(dom.fields.fats.value),
    runKm: numberValue(dom.fields.runKm.value),
    swimKm: numberValue(dom.fields.swimKm.value),
    gym: dom.fields.gym.value || "None",
    steps: numberValue(dom.fields.steps.value),
    meditation: numberValue(dom.fields.meditation.value),
    reading: numberValue(dom.fields.reading.value),
    spanish: numberValue(dom.fields.spanish.value),
    screenTime: numberValue(dom.fields.screenTime.value),
  };
}

function updateLiveStatus() {
  const entry = readForm();
  const evaluation = evaluateEntry(entry);
  const saved = hasSavedEntry(entry.date);

  dom.entryMode.textContent = saved ? "Editing Saved Day" : "New Day";
  dom.saveButton.textContent = saved ? "Update entry" : "Save entry";
  applyBadge(dom.overallStatusBadge, evaluation.overall.status);
  dom.overallStatusTitle.textContent = evaluation.overall.title;
  dom.overallStatusText.textContent = evaluation.overall.text;
  dom.completionFill.style.width = `${evaluation.progressPercent}%`;
  dom.completionText.textContent = `${evaluation.completeCount} of ${METRIC_KEYS.length} metrics complete`;
  dom.statusBreakdown.textContent = `${evaluation.counts.green} green . ${evaluation.counts.amber} amber . ${evaluation.counts.red} red`;

  document.querySelectorAll("[data-badge-for]").forEach((badge) => {
    const key = badge.dataset.badgeFor;
    applyBadge(badge, evaluation.metrics[key].status);
  });
}

function renderAll() {
  updateLiveStatus();
  renderHeroSummary();
  renderEntryList();
  renderTotals();
  renderHeatmap();
}

function renderHeroSummary() {
  const entries = getSortedEntries();

  if (!entries.length) {
    dom.heroSummary.textContent = "No entries saved yet. Start on the Input tab to build your first day.";
    return;
  }

  const latest = entries[entries.length - 1];
  const latestStatus = evaluateEntry(latest).overall.status;
  const greenDays = entries.filter((entry) => evaluateEntry(entry).overall.status === "green").length;
  dom.heroSummary.textContent =
    `${entries.length} days tracked. Latest entry ${formatDateHuman(latest.date)} is ${labelForStatus(latestStatus)}. ` +
    `${greenDays} green days logged so far.`;
}

function renderEntryList() {
  const entries = getSortedEntries().slice().reverse();

  if (!entries.length) {
    dom.entryList.innerHTML = '<div class="empty-state">No entries yet. Save your first day to unlock editing and results.</div>';
    return;
  }

  dom.entryList.innerHTML = entries
    .slice(0, 10)
    .map((entry) => {
      const overall = evaluateEntry(entry).overall.status;
      return `
        <article class="entry-item">
          <div class="entry-item__title">${formatDateHuman(entry.date)}</div>
          <span class="status-pill status-pill--${overall}">${labelForStatus(overall)}</span>
          <button type="button" class="entry-item__edit" data-edit-date="${entry.date}">Edit</button>
        </article>
      `;
    })
    .join("");
}

function renderTotals() {
  const entries = getSortedEntries();

  if (!entries.length) {
    dom.totalsGrid.innerHTML = '<div class="empty-state">Totals will appear here once you have saved at least one entry.</div>';
    return;
  }

  const statusCounts = countOverallStatuses(entries);
  const daysTracked = entries.length;
  const creatineYesDays = entries.filter((entry) => entry.creatine === "Y").length;
  const gymSessions = entries.filter((entry) => entry.gym !== "None").length;
  const missedDays = countMissedDays(entries);
  const cards = [
    ["Days tracked", daysTracked, "Saved days", ""],
    ["Green days", statusCounts.green, "High-quality days", ""],
    ["Amber days", statusCounts.amber, "Mixed days", ""],
    ["Red days", statusCounts.red, "Off-target days", ""],
    ["Days missed", missedDays, "Missing before today since 6 Apr 2026", ""],
    ["Calories", formatNumber(sum(entries, "calories")), "Total kcal", `Avg ${formatNumber(Math.round(average(entries, "calories")))} per day`],
    ["Water", `${sum(entries, "water").toFixed(1)}L`, "Total water", `Avg ${average(entries, "water").toFixed(1)}L per day`],
    ["Creatine", creatineYesDays, "Yes days", `Avg ${formatPercent(creatineYesDays / daysTracked)} yes`],
    ["Protein", `${formatNumber(sum(entries, "protein"))}g`, "Total protein", `Avg ${formatNumber(Math.round(average(entries, "protein")))}g per day`],
    ["Carbs", `${formatNumber(sum(entries, "carbs"))}g`, "Total carbs", `Avg ${formatNumber(Math.round(average(entries, "carbs")))}g per day`],
    ["Fats", `${formatNumber(sum(entries, "fats"))}g`, "Total fats", `Avg ${formatNumber(Math.round(average(entries, "fats")))}g per day`],
    ["Run", `${sum(entries, "runKm").toFixed(1)}km`, "Total distance", `Avg ${average(entries, "runKm").toFixed(1)}km per day`],
    ["Swim", `${sum(entries, "swimKm").toFixed(1)}km`, "Total distance", `Avg ${average(entries, "swimKm").toFixed(1)}km per day`],
    ["Gym", gymSessions, "Sessions logged", `Avg ${(gymSessions / daysTracked).toFixed(2)} per day`],
    ["Steps", formatNumber(sum(entries, "steps")), "Total steps", `Avg ${formatNumber(Math.round(average(entries, "steps")))} per day`],
    ["Meditation", `${formatNumber(sum(entries, "meditation"))} mins`, "Total minutes", `Avg ${formatNumber(Math.round(average(entries, "meditation")))} mins per day`],
    ["Reading", formatNumber(sum(entries, "reading")), "Total pages", `Avg ${formatNumber(Math.round(average(entries, "reading")))} pages per day`],
    ["Spanish", `${formatNumber(sum(entries, "spanish"))} mins`, "Total minutes", `Avg ${formatNumber(Math.round(average(entries, "spanish")))} mins per day`],
    ["Screentime", `${formatNumber(sum(entries, "screenTime"))} mins`, "Total minutes", `Avg ${formatNumber(Math.round(average(entries, "screenTime")))} mins per day`],
  ];

  dom.totalsGrid.innerHTML = cards
    .map(
      ([label, value, detail, averageText]) => `
        <article class="total-card">
          <span>${label}</span>
          <strong>${value}</strong>
          <p>${detail}</p>
          ${averageText ? `<p>${averageText}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function renderHeatmap() {
  const today = new Date(`${getTodayLocalDate()}T00:00:00`);
  const start = new Date(today);
  start.setDate(today.getDate() - 27);
  const displayStart = new Date(start);
  displayStart.setDate(start.getDate() - getMondayIndex(start));
  const displayEnd = new Date(today);
  displayEnd.setDate(today.getDate() + (6 - getMondayIndex(today)));
  const cells = [];

  for (const date = new Date(displayStart); date <= displayEnd; date.setDate(date.getDate() + 1)) {
    const key = formatDateKey(date);
    const inWindow = date >= start && date <= today;

    if (!inWindow) {
      cells.push('<div class="heatmap-day heatmap-day--placeholder"><div class="heatmap-day__dot"></div><div class="heatmap-day__label">0</div></div>');
      continue;
    }

    const entry = state.entries[key];
    const status = entry ? evaluateEntry(entry).overall.status : "neutral";
    const todayClass = key === getTodayLocalDate() ? " heatmap-day--today" : "";

    cells.push(`
      <div class="heatmap-day heatmap-day--${status}${todayClass}">
        <div class="heatmap-day__dot" title="${key}"></div>
        <div class="heatmap-day__label">${date.getDate()}</div>
      </div>
    `);
  }

  dom.heatmap.innerHTML = cells.join("");
}

function evaluateEntry(entry) {
  const metrics = {
    calories: evaluateCalories(entry.calories),
    water: evaluateWater(entry.water),
    creatine: evaluateCreatine(entry.creatine),
    protein: evaluateProtein(entry.protein),
    carbs: evaluateCarbs(entry.carbs),
    fats: evaluateFats(entry.fats),
    exercise: evaluateExercise(entry.runKm, entry.swimKm, entry.gym),
    steps: evaluateSteps(entry.steps),
    meditation: evaluateMeditation(entry.meditation),
    reading: evaluateReading(entry.reading),
    spanish: evaluateSpanish(entry.spanish),
    screenTime: evaluateScreenTime(entry.screenTime),
    wakeTime: evaluateWakeTime(entry.wakeTime),
    bedTime: evaluateBedTime(entry.bedTime),
  };

  const statuses = METRIC_KEYS.map((key) => metrics[key].status);
  const complete = statuses.every((status) => status !== "neutral");
  const completeCount = statuses.filter((status) => status !== "neutral").length;
  const counts = {
    green: statuses.filter((status) => status === "green").length,
    amber: statuses.filter((status) => status === "amber").length,
    red: statuses.filter((status) => status === "red").length,
  };

  const overall = complete
    ? evaluateOverall(counts)
    : {
        status: "neutral",
        title: "Overall status pending",
        text: "Complete the daily fields to score the day.",
      };

  return {
    metrics,
    overall,
    complete,
    completeCount,
    counts,
    progressPercent: Math.round((completeCount / METRIC_KEYS.length) * 100),
  };
}

function evaluateOverall(counts) {
  const total = METRIC_KEYS.length;
  const greenRatio = counts.green / total;
  const nonRedRatio = (counts.green + counts.amber) / total;

  if (greenRatio >= 0.9) {
    return {
      status: "green",
      title: "Green day",
      text: `${counts.green} of ${total} metrics are green. Strong consistency across the board.`,
    };
  }

  if (nonRedRatio >= 0.75) {
    return {
      status: "amber",
      title: "Amber day",
      text: `${counts.green + counts.amber} of ${total} metrics stayed out of the red. Close, with room to tighten.`,
    };
  }

  return {
    status: "red",
    title: "Red day",
    text: "Too many metrics are off target. Use this as a reset point for tomorrow.",
  };
}

function evaluateCalories(value) {
  if (pendingMetric(value)) return { status: "neutral" };
  if (value >= 1900 && value <= 2200) return { status: "green" };
  if ((value >= 1500 && value < 1900) || (value > 2200 && value <= 2500)) return { status: "amber" };
  return { status: "red" };
}

function evaluateProtein(value) {
  if (pendingMetric(value)) return { status: "neutral" };
  if (value >= 150) return { status: "green" };
  if (value >= 130) return { status: "amber" };
  return { status: "red" };
}

function evaluateCarbs(value) {
  if (pendingMetric(value)) return { status: "neutral" };
  if (value >= 180 && value <= 250) return { status: "green" };
  if ((value >= 140 && value < 180) || (value > 250 && value <= 300)) return { status: "amber" };
  return { status: "red" };
}

function evaluateFats(value) {
  if (pendingMetric(value)) return { status: "neutral" };
  if (value >= 55 && value <= 75) return { status: "green" };
  if ((value >= 45 && value < 55) || (value > 75 && value <= 90)) return { status: "amber" };
  return { status: "red" };
}

function evaluateWater(value) {
  if (pendingMetric(value)) return { status: "neutral" };
  if (value >= 1.5) return { status: "green" };
  if (value >= 1) return { status: "amber" };
  return { status: "red" };
}

function evaluateCreatine(value) {
  if (!value) return { status: "neutral" };
  if (value === "Y") return { status: "green" };
  if (value === "N") return { status: "red" };
  return { status: "neutral" };
}

function evaluateExercise(runKm, swimKm, gym) {
  if (pendingMetric(runKm) || pendingMetric(swimKm) || !gym) return { status: "neutral" };
  const score = (runKm > 0 ? 1 : 0) + (swimKm > 0 ? 1 : 0) + (gym !== "None" ? 1 : 0);
  if (score >= 2) return { status: "green" };
  if (score === 1) return { status: "amber" };
  return { status: "red" };
}

function evaluateSteps(value) {
  if (pendingMetric(value)) return { status: "neutral" };
  if (value >= 10000) return { status: "green" };
  if (value >= 8000) return { status: "amber" };
  return { status: "red" };
}

function evaluateMeditation(value) {
  if (pendingMetric(value)) return { status: "neutral" };
  if (value > 10) return { status: "green" };
  if (value >= 1) return { status: "amber" };
  return { status: "red" };
}

function evaluateReading(value) {
  if (pendingMetric(value)) return { status: "neutral" };
  if (value >= 20) return { status: "green" };
  if (value >= 1) return { status: "amber" };
  return { status: "red" };
}

function evaluateSpanish(value) {
  if (pendingMetric(value)) return { status: "neutral" };
  if (value >= 20) return { status: "green" };
  if (value >= 1) return { status: "amber" };
  return { status: "red" };
}

function evaluateScreenTime(value) {
  if (pendingMetric(value)) return { status: "neutral" };
  if (value <= 60) return { status: "green" };
  if (value <= 120) return { status: "amber" };
  return { status: "red" };
}

function evaluateWakeTime(value) {
  const minutes = timeToMinutes(value);
  if (minutes === null) return { status: "neutral" };
  if (minutes < 510) return { status: "green" };
  if (minutes <= 540) return { status: "amber" };
  return { status: "red" };
}

function evaluateBedTime(value) {
  const minutes = normaliseBedTime(value);
  if (minutes === null) return { status: "neutral" };
  if (minutes < 1320) return { status: "green" };
  if (minutes <= 1440) return { status: "amber" };
  return { status: "red" };
}

function pendingMetric(value) {
  return value === null || value === "" || Number.isNaN(value);
}

function applyBadge(element, status) {
  element.className = `status-pill status-pill--${status}`;
  element.textContent = labelForStatus(status);
}

function labelForStatus(status) {
  return {
    green: "Green",
    amber: "Amber",
    red: "Red",
    neutral: "Pending",
  }[status] || "Pending";
}

function exportCsv() {
  const entries = getSortedEntries();
  if (!entries.length) {
    showToast("There is nothing to export yet.");
    return;
  }

  const rows = [
    [
      "date",
      "wakeTime",
      "bedTime",
      "calories",
      "water",
      "creatine",
      "protein",
      "carbs",
      "fats",
      "runKm",
      "swimKm",
      "gym",
      "steps",
      "meditation",
      "reading",
      "spanish",
      "screenTime",
      "overallStatus",
    ],
    ...entries.map((entry) => [
      entry.date,
      entry.wakeTime,
      entry.bedTime,
      entry.calories,
      entry.water.toFixed(1),
      entry.creatine,
      entry.protein,
      entry.carbs,
      entry.fats,
      entry.runKm.toFixed(1),
      entry.swimKm.toFixed(1),
      entry.gym,
      entry.steps,
      entry.meditation,
      entry.reading,
      entry.spanish,
      entry.screenTime,
      evaluateEntry(entry).overall.status,
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  downloadFile("walsh-diet-autumn-2026.csv", "text/csv;charset=utf-8", csv);
  showToast("CSV exported for Excel.");
}

function exportJson() {
  const entries = getSortedEntries();
  if (!entries.length) {
    showToast("There is nothing to export yet.");
    return;
  }

  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), entries }, null, 2);
  downloadFile("walsh-diet-autumn-2026.json", "application/json;charset=utf-8", payload);
  showToast("JSON backup exported.");
}

function importData(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const importedEntries = file.name.toLowerCase().endsWith(".json")
        ? parseJsonImport(String(reader.result))
        : parseCsvImport(String(reader.result));

      let count = 0;
      importedEntries.forEach((entry) => {
        if (!entry || !entry.date) return;
        state.entries[entry.date] = entry;
        count += 1;
      });

      persistEntries();
      renderAll();
      loadFormForDate(dom.fields.date.value || getTodayLocalDate());
      showToast(`${count} entries imported.`);
    } catch (error) {
      console.error(error);
      showToast("Import failed. Please use a file exported by this app.");
    } finally {
      dom.importFile.value = "";
    }
  };

  reader.readAsText(file);
}

function parseJsonImport(raw) {
  const parsed = JSON.parse(raw);
  const source = Array.isArray(parsed) ? parsed : parsed.entries;
  if (!Array.isArray(source)) {
    throw new Error("Invalid JSON import.");
  }
  return source.map(normaliseImportedEntry).filter(Boolean);
}

function parseCsvImport(raw) {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    throw new Error("CSV import is empty.");
  }

  const header = splitCsvLine(lines[0]);
  return lines
    .slice(1)
    .map((line) => {
      const values = splitCsvLine(line);
      const row = {};
      header.forEach((key, index) => {
        row[key] = values[index];
      });
      return normaliseImportedEntry(row);
    })
    .filter(Boolean);
}

function normaliseImportedEntry(raw) {
  if (!raw || !raw.date) {
    return null;
  }

  return {
    date: raw.date,
    wakeTime: raw.wakeTime || "",
    bedTime: raw.bedTime || "",
    calories: numberValue(raw.calories),
    water: numberValue(raw.water),
    creatine: raw.creatine || "",
    protein: numberValue(raw.protein),
    carbs: numberValue(raw.carbs),
    fats: numberValue(raw.fats),
    runKm: numberValue(raw.runKm),
    swimKm: numberValue(raw.swimKm),
    gym: raw.gym || "None",
    steps: numberValue(raw.steps),
    meditation: numberValue(raw.meditation),
    reading: numberValue(raw.reading ?? raw.pages),
    spanish: numberValue(raw.spanish),
    screenTime: numberValue(raw.screenTime),
  };
}

function switchScreen(target) {
  localStorage.setItem(SCREEN_KEY, target);
  dom.tabs.forEach((button) => {
    button.classList.toggle("tab-button--active", button.dataset.target === target);
  });
  dom.screens.forEach((screen) => {
    screen.classList.toggle("screen--active", screen.dataset.screen === target);
  });
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([date, entry]) => [date, normaliseImportedEntry(entry)])
        .filter(([, entry]) => Boolean(entry))
    );
  } catch (error) {
    console.error(error);
    return {};
  }
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function hasSavedEntry(date) {
  return Boolean(date && state.entries[date]);
}

function getSortedEntries() {
  return Object.values(state.entries)
    .filter(Boolean)
    .sort((left, right) => left.date.localeCompare(right.date));
}

function countOverallStatuses(entries) {
  return entries.reduce(
    (totals, entry) => {
      const status = evaluateEntry(entry).overall.status;
      if (status === "green" || status === "amber" || status === "red") {
        totals[status] += 1;
      }
      return totals;
    },
    { green: 0, amber: 0, red: 0 }
  );
}

function countMissedDays(entries) {
  const today = new Date(`${getTodayLocalDate()}T00:00:00`);
  const start = new Date(`${DIET_START_DATE}T00:00:00`);

  if (today <= start) {
    return 0;
  }

  const recorded = new Set(entries.map((entry) => entry.date));
  let missed = 0;

  for (const date = new Date(start); date < today; date.setDate(date.getDate() + 1)) {
    if (!recorded.has(formatDateKey(date))) {
      missed += 1;
    }
  }

  return missed;
}

function sum(entries, key) {
  return entries.reduce((total, entry) => total + (Number(entry[key]) || 0), 0);
}

function average(entries, key) {
  return entries.length ? sum(entries, key) / entries.length : 0;
}

function numberValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function normaliseBedTime(value) {
  const minutes = timeToMinutes(value);
  if (minutes === null) return null;
  return minutes < 720 ? minutes + 1440 : minutes;
}

function formatClock(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const adjusted = ((Math.round(value) % 1440) + 1440) % 1440;
  const hours = Math.floor(adjusted / 60);
  const minutes = adjusted % 60;
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")}${suffix}`;
}

function formatDateHuman(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function getTodayLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function minutesToTimeValue(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatTimeSelectLabel(totalMinutes) {
  const value = minutesToTimeValue(totalMinutes);
  return formatClock(timeToMinutes(value));
}

function csvCell(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function downloadFile(filename, type, content) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    dom.toast.classList.remove("is-visible");
  }, 2400);
}
