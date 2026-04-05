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
const METRIC_KEYS = [
  "calories",
  "protein",
  "carbs",
  "fats",
  "water",
  "exercise",
  "steps",
  "pages",
  "spanish",
  "screenTime",
  "wakeTime",
  "bedTime",
];
const CHART_WINDOW = 21;
const chartStore = {};

const dom = {};
const state = { entries: {} };

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  state.entries = loadEntries();
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
    calories: document.getElementById("calories"),
    protein: document.getElementById("protein"),
    carbs: document.getElementById("carbs"),
    fats: document.getElementById("fats"),
    water: document.getElementById("water"),
    steps: document.getElementById("steps"),
    runKm: document.getElementById("runKm"),
    swimKm: document.getElementById("swimKm"),
    gym: document.getElementById("gym"),
    pages: document.getElementById("pages"),
    spanish: document.getElementById("spanish"),
    screenTime: document.getElementById("screenTime"),
    wakeTime: document.getElementById("wakeTime"),
    bedTime: document.getElementById("bedTime"),
  };
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
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    water: "",
    steps: "",
    runKm: "",
    swimKm: "",
    gym: "None",
    pages: "",
    spanish: "",
    screenTime: "",
    wakeTime: "",
    bedTime: "",
  };
}

function readForm() {
  return {
    date: dom.fields.date.value,
    calories: numberValue(dom.fields.calories.value),
    protein: numberValue(dom.fields.protein.value),
    carbs: numberValue(dom.fields.carbs.value),
    fats: numberValue(dom.fields.fats.value),
    water: numberValue(dom.fields.water.value),
    steps: numberValue(dom.fields.steps.value),
    runKm: numberValue(dom.fields.runKm.value),
    swimKm: numberValue(dom.fields.swimKm.value),
    gym: dom.fields.gym.value || "None",
    pages: numberValue(dom.fields.pages.value),
    spanish: numberValue(dom.fields.spanish.value),
    screenTime: numberValue(dom.fields.screenTime.value),
    wakeTime: dom.fields.wakeTime.value,
    bedTime: dom.fields.bedTime.value,
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
  renderCharts();
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
    dom.entryList.innerHTML = '<div class="empty-state">No entries yet. Save your first day to unlock editing, totals, and charts.</div>';
    return;
  }

  dom.entryList.innerHTML = entries
    .slice(0, 10)
    .map((entry) => {
      const overall = evaluateEntry(entry).overall.status;
      return `
        <article class="entry-item">
          <div class="entry-item__top">
            <div>
              <div class="entry-item__title">${formatDateHuman(entry.date)}</div>
              <div class="entry-item__facts">
                ${entry.calories} kcal . ${entry.protein}g protein . ${formatNumber(entry.steps)} steps
              </div>
            </div>
            <span class="status-pill status-pill--${overall}">${labelForStatus(overall)}</span>
          </div>
          <div class="entry-item__meta">
            <div class="entry-item__facts">
              Water ${entry.water.toFixed(1)}L . Run ${entry.runKm.toFixed(1)}km . Swim ${entry.swimKm.toFixed(1)}km . Gym ${entry.gym}
            </div>
            <button type="button" class="entry-item__edit" data-edit-date="${entry.date}">Edit</button>
          </div>
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
  const cards = [
    ["Days tracked", entries.length, "Saved days"],
    ["Green days", statusCounts.green, "High-quality days"],
    ["Calories", formatNumber(sum(entries, "calories")), "All-time kcal"],
    ["Protein", `${formatNumber(sum(entries, "protein"))}g`, "All-time protein"],
    ["Carbs", `${formatNumber(sum(entries, "carbs"))}g`, "All-time carbs"],
    ["Fats", `${formatNumber(sum(entries, "fats"))}g`, "All-time fats"],
    ["Water", `${sum(entries, "water").toFixed(1)}L`, "All-time hydration"],
    ["Steps", formatNumber(sum(entries, "steps")), "All-time steps"],
    ["Run", `${sum(entries, "runKm").toFixed(1)}km`, "All-time distance"],
    ["Swim", `${sum(entries, "swimKm").toFixed(1)}km`, "All-time distance"],
    ["Gym", entries.filter((entry) => entry.gym !== "None").length, "Sessions logged"],
    ["Pages", formatNumber(sum(entries, "pages")), "Pages read"],
    ["Spanish", `${formatNumber(sum(entries, "spanish"))} mins`, "Practice time"],
    ["Screentime", `${formatNumber(sum(entries, "screenTime"))} mins`, "Minutes logged"],
  ];

  dom.totalsGrid.innerHTML = cards
    .map(
      ([label, value, detail]) => `
        <article class="total-card">
          <span>${label}</span>
          <strong>${value}</strong>
          <p>${detail}</p>
        </article>
      `
    )
    .join("");
}

function renderHeatmap() {
  const today = new Date(`${getTodayLocalDate()}T00:00:00`);
  const cells = [];

  for (let offset = 41; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = formatDateKey(date);
    const entry = state.entries[key];
    const status = entry ? evaluateEntry(entry).overall.status : "neutral";

    cells.push(`
      <div class="heatmap-day heatmap-day--${status}">
        <div class="heatmap-day__dot" title="${key}"></div>
        <div class="heatmap-day__label">${date.getDate()}</div>
      </div>
    `);
  }

  dom.heatmap.innerHTML = cells.join("");
}

function renderCharts() {
  const entries = getSortedEntries();
  renderStatusChart(entries);
  renderCalorieChart(entries);
  renderMacroChart(entries);
  renderMovementChart(entries);
  renderHabitChart(entries);
  renderSleepChart(entries);
}

function renderStatusChart(entries) {
  const hasData = entries.length > 0;
  setChartState("statusChart", hasData, "Save a few days to unlock this chart.");
  if (!hasData) {
    destroyChart("statusChart");
    return;
  }

  const counts = countOverallStatuses(entries);
  upsertChart("statusChart", {
    type: "doughnut",
    data: {
      labels: ["Green", "Amber", "Red"],
      datasets: [
        {
          data: [counts.green, counts.amber, counts.red],
          backgroundColor: ["#2f7a52", "#c6811f", "#b4533f"],
          borderWidth: 0,
        },
      ],
    },
    options: baseChartOptions({
      plugins: {
        legend: { position: "bottom" },
      },
      cutout: "66%",
    }),
  });
}

function renderCalorieChart(entries) {
  const recent = entries.slice(-CHART_WINDOW);
  const hasData = recent.length > 0;
  setChartState("calorieChart", hasData, "Save a few days to unlock this chart.");
  if (!hasData) {
    destroyChart("calorieChart");
    return;
  }

  upsertChart("calorieChart", {
    type: "line",
    data: {
      labels: recent.map((entry) => formatDateShort(entry.date)),
      datasets: [
        {
          label: "Calories",
          data: recent.map((entry) => entry.calories),
          borderColor: "#b4533f",
          backgroundColor: "rgba(180, 83, 63, 0.16)",
          fill: true,
          tension: 0.32,
          pointRadius: 3,
        },
        {
          label: "Lower target",
          data: recent.map(() => 1900),
          borderColor: "rgba(47, 122, 82, 0.56)",
          borderDash: [6, 6],
          pointRadius: 0,
        },
        {
          label: "Upper target",
          data: recent.map(() => 2200),
          borderColor: "rgba(47, 122, 82, 0.56)",
          borderDash: [6, 6],
          pointRadius: 0,
        },
      ],
    },
    options: baseChartOptions({
      scales: {
        y: { suggestedMin: 1400, suggestedMax: 2600 },
      },
    }),
  });
}

function renderMacroChart(entries) {
  const recent = entries.slice(-CHART_WINDOW);
  const hasData = recent.length > 0;
  setChartState("macroChart", hasData, "Save a few days to unlock this chart.");
  if (!hasData) {
    destroyChart("macroChart");
    return;
  }

  upsertChart("macroChart", {
    type: "line",
    data: {
      labels: recent.map((entry) => formatDateShort(entry.date)),
      datasets: [
        {
          label: "Protein",
          data: recent.map((entry) => entry.protein),
          borderColor: "#2f7a52",
          backgroundColor: "rgba(47, 122, 82, 0.14)",
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: "Carbs",
          data: recent.map((entry) => entry.carbs),
          borderColor: "#c6811f",
          backgroundColor: "rgba(198, 129, 31, 0.14)",
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: "Fats",
          data: recent.map((entry) => entry.fats),
          borderColor: "#7f8f3e",
          backgroundColor: "rgba(127, 143, 62, 0.14)",
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    },
    options: baseChartOptions({
      scales: {
        y: { suggestedMin: 0, suggestedMax: 320 },
      },
    }),
  });
}

function renderMovementChart(entries) {
  const recent = entries.slice(-CHART_WINDOW);
  const hasData = recent.length > 0;
  setChartState("movementChart", hasData, "Save a few days to unlock this chart.");
  if (!hasData) {
    destroyChart("movementChart");
    return;
  }

  const distanceMax = Math.max(5, ...recent.map((entry) => entry.runKm), ...recent.map((entry) => entry.swimKm));
  upsertChart("movementChart", {
    data: {
      labels: recent.map((entry) => formatDateShort(entry.date)),
      datasets: [
        {
          type: "line",
          label: "Steps",
          data: recent.map((entry) => entry.steps),
          borderColor: "#7f8f3e",
          backgroundColor: "rgba(127, 143, 62, 0.14)",
          yAxisID: "y",
          tension: 0.28,
          pointRadius: 3,
        },
        {
          type: "bar",
          label: "Run km",
          data: recent.map((entry) => entry.runKm),
          backgroundColor: "rgba(180, 83, 63, 0.62)",
          borderRadius: 8,
          yAxisID: "y1",
        },
        {
          type: "bar",
          label: "Swim km",
          data: recent.map((entry) => entry.swimKm),
          backgroundColor: "rgba(47, 122, 82, 0.62)",
          borderRadius: 8,
          yAxisID: "y1",
        },
        {
          type: "line",
          label: "Gym session",
          data: recent.map((entry) => (entry.gym !== "None" ? 1 : 0)),
          borderColor: "#c6811f",
          backgroundColor: "#c6811f",
          yAxisID: "y1",
          tension: 0,
          pointRadius: 4,
        },
      ],
    },
    options: baseChartOptions({
      scales: {
        y: {
          position: "left",
          suggestedMin: 0,
          suggestedMax: 16000,
          ticks: {
            callback: (value) => formatNumber(value),
          },
        },
        y1: {
          position: "right",
          grid: { drawOnChartArea: false },
          suggestedMin: 0,
          suggestedMax: Math.ceil(distanceMax + 2),
        },
      },
    }),
  });
}

function renderHabitChart(entries) {
  const recent = entries.slice(-CHART_WINDOW);
  const hasData = recent.length > 0;
  setChartState("habitChart", hasData, "Save a few days to unlock this chart.");
  if (!hasData) {
    destroyChart("habitChart");
    return;
  }

  upsertChart("habitChart", {
    type: "line",
    data: {
      labels: recent.map((entry) => formatDateShort(entry.date)),
      datasets: [
        {
          label: "Pages",
          data: recent.map((entry) => entry.pages),
          borderColor: "#7f8f3e",
          backgroundColor: "rgba(127, 143, 62, 0.12)",
          yAxisID: "y",
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: "Spanish",
          data: recent.map((entry) => entry.spanish),
          borderColor: "#2f7a52",
          backgroundColor: "rgba(47, 122, 82, 0.12)",
          yAxisID: "y",
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: "Screentime",
          data: recent.map((entry) => entry.screenTime),
          borderColor: "#b4533f",
          backgroundColor: "rgba(180, 83, 63, 0.12)",
          yAxisID: "y1",
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    },
    options: baseChartOptions({
      scales: {
        y: { suggestedMin: 0, suggestedMax: 220 },
        y1: {
          position: "right",
          grid: { drawOnChartArea: false },
          suggestedMin: 0,
          suggestedMax: 220,
        },
      },
    }),
  });
}

function renderSleepChart(entries) {
  const recent = entries.slice(-CHART_WINDOW);
  const hasData = recent.length > 0;
  setChartState("sleepChart", hasData, "Save a few days to unlock this chart.");
  if (!hasData) {
    destroyChart("sleepChart");
    return;
  }

  upsertChart("sleepChart", {
    type: "line",
    data: {
      labels: recent.map((entry) => formatDateShort(entry.date)),
      datasets: [
        {
          label: "Wakeup",
          data: recent.map((entry) => timeToMinutes(entry.wakeTime)),
          borderColor: "#2f7a52",
          backgroundColor: "rgba(47, 122, 82, 0.12)",
          tension: 0.26,
          pointRadius: 3,
        },
        {
          label: "Bed time",
          data: recent.map((entry) => normaliseBedTime(entry.bedTime)),
          borderColor: "#c6811f",
          backgroundColor: "rgba(198, 129, 31, 0.12)",
          tension: 0.26,
          pointRadius: 3,
        },
      ],
    },
    options: baseChartOptions({
      scales: {
        y: {
          suggestedMin: 300,
          suggestedMax: 1500,
          ticks: {
            callback: (value) => formatClock(value),
          },
        },
      },
    }),
  });
}

function baseChartOptions(overrides = {}) {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#6d5b48",
          usePointStyle: true,
          boxWidth: 10,
          boxHeight: 10,
        },
      },
      tooltip: {
        backgroundColor: "rgba(46, 37, 28, 0.92)",
        titleColor: "#fffaf2",
        bodyColor: "#fffaf2",
      },
    },
    scales: {
      x: {
        ticks: { color: "#6d5b48" },
        grid: { color: "rgba(90, 67, 43, 0.08)" },
      },
      y: {
        ticks: { color: "#6d5b48" },
        grid: { color: "rgba(90, 67, 43, 0.08)" },
      },
    },
  };

  return deepMerge(base, overrides);
}

function upsertChart(id, config) {
  if (typeof Chart === "undefined") {
    setChartState(id, false, "Charts need an internet connection to load Chart.js.");
    return;
  }

  destroyChart(id);
  const canvas = document.getElementById(id);
  chartStore[id] = new Chart(canvas.getContext("2d"), config);
}

function destroyChart(id) {
  if (chartStore[id]) {
    chartStore[id].destroy();
    delete chartStore[id];
  }
}

function setChartState(id, hasData, message) {
  const canvas = document.getElementById(id);
  const empty = document.querySelector(`[data-empty-for="${id}"]`);
  if (!canvas || !empty) {
    return;
  }

  canvas.style.display = hasData ? "block" : "none";
  empty.textContent = message;
  empty.classList.toggle("is-visible", !hasData);
}

function evaluateEntry(entry) {
  const metrics = {
    calories: evaluateCalories(entry.calories),
    protein: evaluateProtein(entry.protein),
    carbs: evaluateCarbs(entry.carbs),
    fats: evaluateFats(entry.fats),
    water: evaluateWater(entry.water),
    exercise: evaluateExercise(entry.runKm, entry.swimKm, entry.gym),
    steps: evaluateSteps(entry.steps),
    pages: evaluatePages(entry.pages),
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

function evaluatePages(value) {
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
      "calories",
      "protein",
      "carbs",
      "fats",
      "water",
      "steps",
      "runKm",
      "swimKm",
      "gym",
      "pages",
      "spanish",
      "screenTime",
      "wakeTime",
      "bedTime",
      "overallStatus",
    ],
    ...entries.map((entry) => [
      entry.date,
      entry.calories,
      entry.protein,
      entry.carbs,
      entry.fats,
      entry.water.toFixed(1),
      entry.steps,
      entry.runKm.toFixed(1),
      entry.swimKm.toFixed(1),
      entry.gym,
      entry.pages,
      entry.spanish,
      entry.screenTime,
      entry.wakeTime,
      entry.bedTime,
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
    calories: numberValue(raw.calories),
    protein: numberValue(raw.protein),
    carbs: numberValue(raw.carbs),
    fats: numberValue(raw.fats),
    water: numberValue(raw.water),
    steps: numberValue(raw.steps),
    runKm: numberValue(raw.runKm),
    swimKm: numberValue(raw.swimKm),
    gym: raw.gym || "None",
    pages: numberValue(raw.pages),
    spanish: numberValue(raw.spanish),
    screenTime: numberValue(raw.screenTime),
    wakeTime: raw.wakeTime || "",
    bedTime: raw.bedTime || "",
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

function sum(entries, key) {
  return entries.reduce((total, entry) => total + (Number(entry[key]) || 0), 0);
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

function deepMerge(base, overrides) {
  const merged = { ...base };
  Object.keys(overrides || {}).forEach((key) => {
    const baseValue = merged[key];
    const overrideValue = overrides[key];
    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      merged[key] = deepMerge(baseValue, overrideValue);
    } else {
      merged[key] = overrideValue;
    }
  });
  return merged;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
