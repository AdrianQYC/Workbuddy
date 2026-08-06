import { englishWordBanks } from "./english-wordbanks.js";

const storageKey = "workbuddy.tasks.v1";
const birthdayStorageKey = "workbuddy.birthdays.v1";
const englishStorageKey = "workbuddy.english.v1";
const legacyStorageKeys = ["daily-planner.tasks.v1"];
const importBackupKey = "workbuddy.import-backup.v1";
const legacyImportBackupKeys = ["daily-planner.import-backup.v1"];

const state = {
  tasks: loadTasks(),
  birthdays: loadBirthdays(),
  english: loadEnglish(),
  module: "planner",
  selectedDate: toISODate(new Date()),
  view: "today",
  englishView: "today",
  statusFilters: {
    today: "all",
    schedule: "all",
    medium: "all",
  },
  search: {
    keyword: "",
    date: "",
    priority: "all",
    status: "all",
  },
  englishSearch: "",
  englishLibraryFilter: "unlearned",
  englishLibrarySort: "az",
  englishReview: {
    bankId: null,
    wordId: null,
    revealed: false,
  },
  editing: null,
  birthdayEditing: null,
  expandedGoals: new Set(),
  collapsedSearchGoals: new Set(),
  scheduleExpandedGroups: new Set(),
  dragging: null,
};

const elements = {
  todayText: document.querySelector("#todayText"),
  dateStrip: document.querySelector("#dateStrip"),
  todayCount: document.querySelector("#todayCount"),
  scheduleCount: document.querySelector("#scheduleCount"),
  mediumCount: document.querySelector("#mediumCount"),
  birthdayCount: document.querySelector("#birthdayCount"),
  doneCount: document.querySelector("#doneCount"),
  taskForm: document.querySelector("#taskForm"),
  taskTitle: document.querySelector("#taskTitle"),
  taskScope: document.querySelector("#taskScope"),
  taskDateLabel: document.querySelector("#taskDateLabel"),
  taskDate: document.querySelector("#taskDate"),
  taskPriority: document.querySelector("#taskPriority"),
  taskList: document.querySelector("#taskList"),
  emptyState: document.querySelector("#emptyState"),
  viewTitle: document.querySelector("#viewTitle"),
  viewMeta: document.querySelector("#viewMeta"),
  statusFilters: document.querySelector("#statusFilters"),
  statusFilterButtons: document.querySelectorAll(".status-filter"),
  searchPanel: document.querySelector("#searchPanel"),
  searchKeyword: document.querySelector("#searchKeyword"),
  searchDate: document.querySelector("#searchDate"),
  searchPriority: document.querySelector("#searchPriority"),
  searchStatus: document.querySelector("#searchStatus"),
  clearSearch: document.querySelector("#clearSearch"),
  moduleButtons: document.querySelectorAll(".module-button"),
  plannerOverview: document.querySelector("#plannerOverview"),
  englishOverview: document.querySelector("#englishOverview"),
  englishTodayCount: document.querySelector("#englishTodayCount"),
  englishLearnedCount: document.querySelector("#englishLearnedCount"),
  englishBankCount: document.querySelector("#englishBankCount"),
  englishGroupCount: document.querySelector("#englishGroupCount"),
  plannerSegments: document.querySelector("#plannerSegments"),
  englishSegments: document.querySelector("#englishSegments"),
  englishSegmentButtons: document.querySelectorAll("[data-english-view]"),
  birthdayPanel: document.querySelector("#birthdayPanel"),
  birthdayName: document.querySelector("#birthdayName"),
  birthdayCalendar: document.querySelector("#birthdayCalendar"),
  birthdayYear: document.querySelector("#birthdayYear"),
  birthdayMonth: document.querySelector("#birthdayMonth"),
  birthdayDay: document.querySelector("#birthdayDay"),
  birthdayLeapField: document.querySelector("#birthdayLeapField"),
  birthdayLeap: document.querySelector("#birthdayLeap"),
  birthdayNote: document.querySelector("#birthdayNote"),
  backupStatus: document.querySelector("#backupStatus"),
  restoreImportBackup: document.querySelector("#restoreImportBackup"),
  exportBtn: document.querySelector("#exportBtn"),
  importInput: document.querySelector("#importInput"),
  taskTemplate: document.querySelector("#taskTemplate"),
  segments: document.querySelectorAll("[data-view]"),
};

const priorityLabels = {
  urgent: "紧急",
  high: "重要",
  normal: "普通",
};

const viewTitles = {
  today: "今天",
  schedule: "日程",
  medium: "中期",
  birthday: "生日",
  search: "搜索",
};

const birthdayCalendarLabels = {
  solar: "公历",
  lunar: "农历",
};

const lunarMonthLabels = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"];

init();

function init() {
  rolloverOpenScheduleTasks();
  syncBirthdayReminders();
  elements.taskDate.value = state.selectedDate;
  elements.todayText.textContent = formatLongDate(new Date());
  renderBirthdaySelectOptions();
  bindEvents();
  registerServiceWorker();
  renderBackupState();
  render();
}

function bindEvents() {
  elements.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = elements.taskTitle.value.trim();
    if (!title) return;

    const scope = elements.taskScope.value;
    state.tasks.unshift(
      scope === "medium"
        ? createMediumGoal(title)
        : {
            id: createId(),
            title,
            scope: "schedule",
            date: elements.taskDate.value || null,
            dueDate: null,
            children: [],
            priority: elements.taskPriority.value,
            done: false,
            canceled: false,
            cancelReason: "",
            order: nextOrder(),
            createdAt: new Date().toISOString(),
            completedAt: null,
            canceledAt: null,
          },
    );

    resetTaskForm();
    saveTasks();
    render();
  });

  elements.taskScope.addEventListener("change", renderTaskMode);
  elements.taskPriority.addEventListener("change", renderPrioritySelect);

  elements.moduleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.module = button.dataset.module;
      if (state.module === "planner") state.view = "today";
      if (state.module === "english") state.englishView = "today";
      render();
    });
  });

  elements.segments.forEach((segment) => {
    segment.addEventListener("click", () => {
      state.view = segment.dataset.view;
      render();
    });
  });

  elements.englishSegmentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.englishView = button.dataset.englishView;
      render();
    });
  });

  elements.statusFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.statusFilters[state.view] = button.dataset.statusFilter;
      render();
    });
  });

  elements.searchKeyword.addEventListener("input", () => {
    state.search.keyword = elements.searchKeyword.value.trim().toLowerCase();
    renderList();
  });
  elements.searchDate.addEventListener("input", () => {
    state.search.date = elements.searchDate.value;
    renderList();
  });
  elements.searchPriority.addEventListener("change", () => {
    state.search.priority = elements.searchPriority.value;
    renderSearchPrioritySelect();
    renderList();
  });
  elements.searchStatus.addEventListener("change", () => {
    state.search.status = elements.searchStatus.value;
    renderList();
  });
  elements.clearSearch.addEventListener("click", () => {
    state.search = { keyword: "", date: "", priority: "all", status: "all" };
    elements.searchKeyword.value = "";
    elements.searchDate.value = "";
    elements.searchPriority.value = "all";
    elements.searchStatus.value = "all";
    renderSearchPrioritySelect();
    renderList();
  });

  elements.birthdayPanel.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = elements.birthdayName.value.trim();
    if (!name) return;

    state.birthdays.unshift({
      id: createId(),
      name,
      calendar: elements.birthdayCalendar.value,
      birthYear: normalizeBirthYear(elements.birthdayYear.value),
      month: Number(elements.birthdayMonth.value),
      day: Number(elements.birthdayDay.value),
      isLeapMonth: elements.birthdayCalendar.value === "lunar" && elements.birthdayLeap.checked,
      note: elements.birthdayNote.value.trim(),
      reminderDates: [],
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });
    resetBirthdayForm();
    saveBirthdays();
    syncBirthdayReminders();
    render();
  });
  elements.birthdayCalendar.addEventListener("change", () => {
    renderBirthdaySelectOptions();
    renderBirthdayFormMode();
  });
  elements.birthdayMonth.addEventListener("change", renderBirthdayDayOptions);

  elements.exportBtn.addEventListener("click", exportTasks);
  elements.importInput.addEventListener("change", importTasks);
  elements.restoreImportBackup.addEventListener("click", restoreImportBackup);
}

function render() {
  renderModules();
  renderDateStrip();
  renderSegments();
  renderEnglishSegments();
  renderStatusFilters();
  renderSearchPanel();
  renderBirthdayPanel();
  renderTaskMode();
  renderPrioritySelect();
  renderSearchPrioritySelect();
  renderStats();
  renderList();
}

function renderModules() {
  const isPlanner = state.module === "planner";
  elements.moduleButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.module === state.module);
  });
  elements.plannerOverview.hidden = !isPlanner;
  elements.englishOverview.hidden = isPlanner;
  elements.plannerSegments.hidden = !isPlanner;
  elements.englishSegments.hidden = isPlanner;
}

function renderDateStrip() {
  elements.dateStrip.innerHTML = "";
  weekDates(new Date()).forEach((date) => {
    const iso = toISODate(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `date-button${iso === state.selectedDate ? " is-selected" : ""}`;
    button.innerHTML = `<span class="weekday">${formatWeekday(date)}</span><span class="day">${date.getDate()}</span>`;
    button.addEventListener("click", () => {
      state.selectedDate = iso;
      state.view = "today";
      elements.taskDate.value = iso;
      render();
    });
    elements.dateStrip.appendChild(button);
  });
}

function renderSegments() {
  elements.segments.forEach((segment) => {
    segment.classList.toggle("is-active", segment.dataset.view === state.view);
  });
}

function renderEnglishSegments() {
  elements.englishSegmentButtons.forEach((segment) => {
    segment.classList.toggle("is-active", segment.dataset.englishView === state.englishView);
  });
}

function renderStatusFilters() {
  const visible = state.module === "planner" && state.view !== "search" && state.view !== "birthday";
  elements.statusFilters.hidden = !visible;
  elements.statusFilterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.statusFilter === currentStatusFilter());
  });
}

function renderSearchPanel() {
  elements.searchPanel.hidden = state.module !== "planner" || state.view !== "search";
}

function renderBirthdayPanel() {
  elements.birthdayPanel.hidden = state.module !== "planner" || state.view !== "birthday";
}

function renderBirthdayFormMode() {
  const isLunar = elements.birthdayCalendar.value === "lunar";
  elements.birthdayLeapField.hidden = !isLunar;
  if (!isLunar) elements.birthdayLeap.checked = false;
}

function renderBirthdaySelectOptions() {
  const currentMonth = elements.birthdayMonth.value || "1";
  elements.birthdayMonth.innerHTML = "";
  for (let month = 1; month <= 12; month += 1) {
    const option = document.createElement("option");
    option.value = String(month);
    option.textContent =
      elements.birthdayCalendar.value === "lunar" ? lunarMonthLabels[month - 1] : `${month} 月`;
    elements.birthdayMonth.append(option);
  }
  elements.birthdayMonth.value = currentMonth;
  renderBirthdayDayOptions();
  renderBirthdayFormMode();
}

function renderBirthdayDayOptions() {
  const currentDay = elements.birthdayDay.value || "1";
  const month = Number(elements.birthdayMonth.value || 1);
  const dayCount = elements.birthdayCalendar.value === "lunar" ? 30 : solarMonthDays(2024, month);
  elements.birthdayDay.innerHTML = "";
  for (let day = 1; day <= dayCount; day += 1) {
    const option = document.createElement("option");
    option.value = String(day);
    option.textContent = elements.birthdayCalendar.value === "lunar" ? lunarDayLabel(day) : `${day} 日`;
    elements.birthdayDay.append(option);
  }
  elements.birthdayDay.value = Number(currentDay) <= dayCount ? currentDay : String(dayCount);
}

function renderTaskMode() {
  const isMedium = elements.taskScope.value === "medium";
  elements.taskDateLabel.textContent = isMedium ? "截止" : "日期";
  elements.taskTitle.placeholder = isMedium ? "添加一个中期目标" : "添加一个任务";
}

function renderPrioritySelect() {
  const field = elements.taskPriority.closest(".priority-select");
  if (!field) return;
  field.classList.remove("priority-normal", "priority-high", "priority-urgent");
  field.classList.add(`priority-${elements.taskPriority.value}`);
}

function renderSearchPrioritySelect() {
  const field = elements.searchPriority.closest(".priority-select");
  if (!field) return;
  field.classList.remove("priority-normal", "priority-high", "priority-urgent");
  if (elements.searchPriority.value !== "all") {
    field.classList.add(`priority-${elements.searchPriority.value}`);
  }
}

function renderStats() {
  elements.todayCount.textContent = formatRatio(unitCompletionStats(todayEntries()));
  elements.scheduleCount.textContent = formatRatio(unitCompletionStats(scheduleEntries()));
  elements.mediumCount.textContent = formatRatio(goalCompletionStats(allMediumGoals()));
  elements.birthdayCount.textContent = state.birthdays.length;
  elements.doneCount.textContent = totalCompletedUnits();
  renderEnglishStats();
}

function renderEnglishStats() {
  const bank = currentEnglishBank();
  const stats = englishBankStats(bank.id);
  elements.englishTodayCount.textContent = todayEnglishWord(bank) ? "1" : "0";
  elements.englishLearnedCount.textContent = `${stats.learned}/${stats.total}`;
  elements.englishBankCount.textContent = englishWordBanks.length;
  elements.englishGroupCount.textContent = state.english.groups.length;
}

function renderList() {
  const entries = filteredEntries();
  elements.taskList.innerHTML = "";
  elements.taskList.classList.toggle("is-medium-list", state.module === "planner" && (state.view === "medium" || state.view === "search"));
  elements.taskList.classList.toggle("is-reorderable", canReorderCurrentView());
  elements.viewTitle.textContent = currentViewTitle();
  elements.viewMeta.textContent = currentViewMeta(entries);
  elements.emptyState.hidden = state.module === "english" || state.view === "schedule" || entries.length > 0;

  if (state.module === "english") {
    renderEnglishShell();
    return;
  }

  if (state.view === "birthday") {
    renderBirthdayList(entries);
    return;
  }

  if (state.view === "search") {
    renderSearchList(entries);
    return;
  }

  if (state.view === "medium") {
    entries.forEach(renderGoalCard);
    return;
  }

  if (state.view === "schedule") {
    renderScheduleList(entries);
    return;
  }

  entries.forEach(renderTaskEntry);
}

function renderEnglishShell() {
  const shell = document.createElement("div");
  shell.className = "english-shell";
  if (state.englishView === "library") shell.append(createEnglishLibraryPanel());
  if (state.englishView === "groups") shell.append(createEnglishGroupsPanel());
  if (state.englishView === "search") shell.append(createEnglishSearchPanel());
  if (state.englishView === "review") shell.append(createEnglishReviewPanel());
  if (state.englishView === "today") shell.append(createEnglishTodayPanel());

  elements.taskList.append(shell);
}

function createEnglishTodayPanel() {
  const bank = currentEnglishBank();
  const word = todayEnglishWord(bank);
  const panel = createEnglishPanel("今日", "每日认识一个新单词");
  panel.append(createEnglishBankSelector());

  if (!word) {
    panel.append(createEnglishEmptyCard(`${bank.name} 词库暂时还没有单词。`));
    return panel;
  }

  panel.append(createWordCard(word, bank, { today: true }));
  return panel;
}

function createEnglishLibraryPanel() {
  const bank = currentEnglishBank();
  const panel = createEnglishPanel("词库", "每个词库单独统计学习情况");
  panel.append(createEnglishBankSelector());

  const controls = document.createElement("div");
  controls.className = "english-controls";
  controls.innerHTML = `
    <label class="select-field">
      <span>分类</span>
      <select id="englishLibraryFilter" aria-label="词库分类">
        <option value="unlearned"${state.englishLibraryFilter === "unlearned" ? " selected" : ""}>未学</option>
        <option value="learned"${state.englishLibraryFilter === "learned" ? " selected" : ""}>已学</option>
        <option value="all"${state.englishLibraryFilter === "all" ? " selected" : ""}>全部</option>
      </select>
    </label>
    <label class="select-field">
      <span>排序</span>
      <select id="englishLibrarySort" aria-label="词库排序">
        <option value="az"${state.englishLibrarySort === "az" ? " selected" : ""}>A-Z</option>
        <option value="learnedAt"${state.englishLibrarySort === "learnedAt" ? " selected" : ""}>学习日期</option>
      </select>
    </label>
  `;
  panel.append(controls);

  controls.querySelector("#englishLibraryFilter").addEventListener("change", (event) => {
    state.englishLibraryFilter = event.target.value;
    render();
  });
  controls.querySelector("#englishLibrarySort").addEventListener("change", (event) => {
    state.englishLibrarySort = event.target.value;
    render();
  });

  const words = filteredEnglishWords(bank);
  if (!words.length) {
    panel.append(createEnglishEmptyCard("这里暂时没有符合条件的单词。"));
    return panel;
  }
  const list = document.createElement("div");
  list.className = "english-word-list";
  words.slice(0, 80).forEach((word) => list.append(createWordRow(word, bank)));
  panel.append(list);
  return panel;
}

function createEnglishGroupsPanel() {
  const panel = createEnglishPanel("词组", "近义、反义、形近、义近和自定义分组");
  const form = document.createElement("form");
  form.className = "english-group-form";
  form.innerHTML = `
    <input name="title" type="text" maxlength="40" placeholder="组名，例如 adapt / adopt / adept" required />
    <label class="select-field">
      <span>类型</span>
      <select name="type" aria-label="词组类型">
        <option value="形近">形近</option>
        <option value="近义">近义</option>
        <option value="反义">反义</option>
        <option value="义近">义近</option>
        <option value="同主题">同主题</option>
        <option value="自定义">自定义</option>
      </select>
    </label>
    <input name="words" type="text" maxlength="120" placeholder="单词，用逗号分隔" required />
    <input name="note" type="text" maxlength="120" placeholder="备注，可不填" />
    <button class="primary-button" type="submit">添加</button>
  `;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = form.elements.title.value.trim();
    const words = form.elements.words.value
      .split(/[,，\s]+/)
      .map((word) => word.trim())
      .filter(Boolean);
    if (!title || !words.length) return;
    state.english.groups.unshift({
      id: createId(),
      title,
      type: form.elements.type.value,
      words,
      note: form.elements.note.value.trim(),
      createdAt: new Date().toISOString(),
    });
    saveEnglish();
    render();
  });
  panel.append(form);

  if (!state.english.groups.length) {
    panel.append(createEnglishEmptyCard("这里以后放成组积累的单词。"));
    return panel;
  }
  const list = document.createElement("div");
  list.className = "english-word-list";
  state.english.groups.forEach((group) => list.append(createEnglishGroupCard(group)));
  panel.append(list);
  return panel;
}

function createEnglishSearchPanel() {
  const panel = createEnglishPanel("搜索", "按单词、释义、备注和词库查找");
  const controls = document.createElement("div");
  controls.className = "english-controls";
  controls.append(createEnglishBankSelector());
  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "搜索单词、释义或备注";
  input.value = state.englishSearch;
  input.addEventListener("input", () => {
    state.englishSearch = input.value.trim().toLowerCase();
    renderList();
  });
  controls.append(input);
  panel.append(controls);

  const keyword = state.englishSearch;
  if (!keyword) {
    panel.append(createEnglishEmptyCard("输入关键词后显示匹配单词。"));
    return panel;
  }
  const bank = currentEnglishBank();
  const results = bank.words.filter((word) => {
    const progress = englishProgressFor(bank.id, word.id);
    return `${word.word} ${word.translation} ${word.example} ${word.exampleCn || ""} ${progress.note || ""}`
      .toLowerCase()
      .includes(keyword);
  });
  if (!results.length) {
    panel.append(createEnglishEmptyCard("没有找到匹配单词。"));
    return panel;
  }
  const list = document.createElement("div");
  list.className = "english-word-list";
  results.slice(0, 80).forEach((word) => list.append(createWordRow(word, bank)));
  panel.append(list);
  return panel;
}

function createEnglishReviewPanel() {
  const bank = currentEnglishBank();
  const panel = createEnglishPanel("复习", "从当前词库已学单词里抽一个复习");
  panel.append(createEnglishBankSelector());

  const learnedWords = bank.words.filter((word) => englishProgressFor(bank.id, word.id).learnedAt);
  if (!learnedWords.length) {
    panel.append(createEnglishEmptyCard("当前词库还没有已学单词。先在“今日”或“词库”里标记已学后再复习。"));
    return panel;
  }

  const word = currentReviewWord(bank, learnedWords);
  if (!word) {
    panel.append(createEnglishEmptyCard("暂时没有可复习的单词。"));
    return panel;
  }

  if (!state.englishReview.revealed) {
    const card = document.createElement("article");
    card.className = "english-word-card english-review-prompt";
    card.innerHTML = `
      <div class="english-word-head">
        <div>
          <h3>${escapeHtml(word.word)}</h3>
        </div>
      </div>
      <div class="english-word-actions">
        <button class="save-button" type="button" data-review-result="known">认识</button>
        <button class="cancel-button" type="button" data-review-result="unknown">不认识</button>
      </div>
    `;
    card.querySelector('[data-review-result="known"]').addEventListener("click", () => recordEnglishReview(bank.id, word.id, true));
    card.querySelector('[data-review-result="unknown"]').addEventListener("click", () => recordEnglishReview(bank.id, word.id, false));
    panel.append(card);
    return panel;
  }

  panel.append(createWordCard(word, bank));
  const next = document.createElement("button");
  next.className = "cancel-button";
  next.type = "button";
  next.textContent = "下一个复习";
  next.addEventListener("click", () => {
    selectReviewWord(bank, true);
    render();
  });
  panel.append(next);
  return panel;
}

function createEnglishPanel(title, meta) {
  const panel = document.createElement("section");
  panel.className = "english-panel";
  const heading = document.createElement("div");
  heading.className = "english-panel-heading";
  heading.innerHTML = `<h3>${title}</h3><span>${meta}</span>`;
  panel.append(heading);
  return panel;
}

function createEnglishBankSelector() {
  const field = document.createElement("label");
  field.className = "select-field english-bank-select";
  field.innerHTML = `
    <span>词库</span>
    <select aria-label="选择词库">
      ${englishWordBanks
        .map((bank) => `<option value="${bank.id}"${bank.id === state.english.selectedBankId ? " selected" : ""}>${bank.name}</option>`)
        .join("")}
    </select>
  `;
  field.querySelector("select").addEventListener("change", (event) => {
    state.english.selectedBankId = event.target.value;
    state.englishReview = { bankId: event.target.value, wordId: null, revealed: false };
    saveEnglish();
    render();
  });
  return field;
}

function createWordCard(word, bank, options = {}) {
  const progress = englishProgressFor(bank.id, word.id);
  const card = document.createElement("article");
  card.className = `english-word-card${progress.learnedAt ? " is-learned" : ""}`;
  card.innerHTML = `
    <div class="english-word-head">
      <div>
        <h3>${escapeHtml(word.word)}</h3>
        <span>${word.phonetic || "音标待补充"}</span>
      </div>
      <div class="word-preview-actions">
        <button class="icon-button small" type="button" data-accent="en-US" title="美式发音">美</button>
        <button class="icon-button small" type="button" data-accent="en-GB" title="英式发音">英</button>
      </div>
    </div>
    <div class="english-word-meaning">${escapeHtml(word.translation)}</div>
    <div class="english-word-example">${escapeHtml(word.example)}</div>
    ${word.exampleCn ? `<div class="english-word-example-cn">例句中文：${escapeHtml(word.exampleCn)}</div>` : ""}
    <div class="english-review-count">复习：${progress.knownCount || 0}/${progress.reviewCount || 0}</div>
    <textarea class="english-note-input" maxlength="180" placeholder="我的备注，可不填">${escapeHtml(progress.note || "")}</textarea>
    <div class="english-word-actions">
      <button class="save-button" type="button" data-action="save-note">保存备注</button>
      <button class="save-button" type="button" data-action="learned">${progress.learnedAt ? "已学过" : "认识了"}</button>
      ${options.today ? '<button class="cancel-button" type="button" data-action="change-word">换一个</button>' : ""}
    </div>
  `;
  bindEnglishWordActions(card, word, bank);
  return card;
}

function createWordRow(word, bank) {
  const progress = englishProgressFor(bank.id, word.id);
  const row = document.createElement("article");
  row.className = `english-word-row${progress.learnedAt ? " is-learned" : ""}`;
  row.innerHTML = `
    <div>
      <div class="english-row-title">
        <strong>${escapeHtml(word.word)}</strong>
        <span>${word.phonetic || "音标待补充"}</span>
      </div>
      <div class="english-row-meta">${escapeHtml(word.translation)}</div>
      <div class="english-row-meta">${progress.learnedAt ? `学习日期：${formatTaskDate(progress.learnedAt.slice(0, 10))}` : "未学"}</div>
      <div class="english-row-meta">复习：${progress.knownCount || 0}/${progress.reviewCount || 0}</div>
    </div>
    <div class="word-preview-actions">
      <button class="icon-button small" type="button" data-accent="en-US" title="美式发音">美</button>
      <button class="icon-button small" type="button" data-accent="en-GB" title="英式发音">英</button>
      <button class="icon-button small" type="button" data-action="learned" title="${progress.learnedAt ? "已学过" : "标记已学"}">✓</button>
    </div>
  `;
  bindEnglishWordActions(row, word, bank);
  return row;
}

function createEnglishGroupCard(group) {
  const card = document.createElement("article");
  card.className = "english-group-card";
  card.innerHTML = `
    <div>
      <div class="english-row-title">
        <strong>${escapeHtml(group.title)}</strong>
        <span>${escapeHtml(group.type)}</span>
      </div>
      <div class="english-row-meta">${group.words.map(escapeHtml).join(" / ")}</div>
      ${group.note ? `<div class="english-row-meta">${escapeHtml(group.note)}</div>` : ""}
    </div>
    <button class="icon-button small" type="button" aria-label="删除词组" title="删除词组">×</button>
  `;
  card.querySelector("button").addEventListener("click", () => {
    state.english.groups = state.english.groups.filter((item) => item.id !== group.id);
    saveEnglish();
    render();
  });
  return card;
}

function createEnglishEmptyCard(text) {
  const card = document.createElement("div");
  card.className = "english-empty-card";
  card.textContent = text;
  return card;
}

function bindEnglishWordActions(container, word, bank) {
  container.querySelectorAll("[data-accent]").forEach((button) => {
    button.addEventListener("click", () => speakEnglish(word.word, button.dataset.accent));
  });
  container.querySelectorAll('[data-action="learned"]').forEach((button) => {
    button.addEventListener("click", () => markEnglishWordLearned(bank.id, word.id));
  });
  const saveNote = container.querySelector('[data-action="save-note"]');
  if (saveNote) {
    saveNote.addEventListener("click", () => {
      const note = container.querySelector(".english-note-input")?.value.trim() || "";
      updateEnglishProgress(bank.id, word.id, { note });
      render();
    });
  }
  const changeWord = container.querySelector('[data-action="change-word"]');
  if (changeWord) {
    changeWord.addEventListener("click", () => {
      setTodayEnglishWord(bank, true);
      saveEnglish();
      render();
    });
  }
}

function currentEnglishBank() {
  return englishWordBanks.find((bank) => bank.id === state.english.selectedBankId) || englishWordBanks[0];
}

function englishBankStats(bankId) {
  const bank = englishWordBanks.find((item) => item.id === bankId) || englishWordBanks[0];
  const progress = state.english.progress[bankId] || {};
  return {
    learned: Object.values(progress).filter((item) => item.learnedAt).length,
    total: bank.words.length,
  };
}

function todayEnglishWord(bank) {
  const today = state.selectedDate;
  const record = state.english.today[bank.id];
  if (record?.date === today) {
    const existing = bank.words.find((word) => word.id === record.wordId);
    if (existing) return existing;
  }
  return setTodayEnglishWord(bank, false);
}

function setTodayEnglishWord(bank, forceChange) {
  if (!bank.words.length) return null;
  const today = state.selectedDate;
  const currentWordId = state.english.today[bank.id]?.wordId;
  const openWords = bank.words.filter((word) => !englishProgressFor(bank.id, word.id).learnedAt);
  const pool = (openWords.length ? openWords : bank.words).filter((word) => !forceChange || word.id !== currentWordId);
  const selected = pool[Math.floor(Math.random() * pool.length)] || bank.words[0];
  state.english.today[bank.id] = { date: today, wordId: selected.id };
  saveEnglish();
  return selected;
}

function filteredEnglishWords(bank) {
  let words = [...bank.words];
  if (state.englishLibraryFilter === "learned") {
    words = words.filter((word) => englishProgressFor(bank.id, word.id).learnedAt);
  }
  if (state.englishLibraryFilter === "unlearned") {
    words = words.filter((word) => !englishProgressFor(bank.id, word.id).learnedAt);
  }
  if (state.englishLibrarySort === "learnedAt") {
    words.sort((a, b) => {
      const first = englishProgressFor(bank.id, a.id).learnedAt || "";
      const second = englishProgressFor(bank.id, b.id).learnedAt || "";
      return second.localeCompare(first) || a.word.localeCompare(b.word);
    });
  } else {
    words.sort((a, b) => a.word.localeCompare(b.word));
  }
  return words;
}

function currentReviewWord(bank, learnedWords) {
  if (state.englishReview.bankId !== bank.id) {
    return selectReviewWord(bank, false, learnedWords);
  }
  const current = learnedWords.find((word) => word.id === state.englishReview.wordId);
  if (current) return current;
  return selectReviewWord(bank, false, learnedWords);
}

function selectReviewWord(bank, forceChange, learnedWords = null) {
  const words = learnedWords || bank.words.filter((word) => englishProgressFor(bank.id, word.id).learnedAt);
  if (!words.length) return null;
  const pool = forceChange ? words.filter((word) => word.id !== state.englishReview.wordId) : words;
  const selected = (pool.length ? pool : words)[Math.floor(Math.random() * (pool.length ? pool.length : words.length))];
  state.englishReview = {
    bankId: bank.id,
    wordId: selected.id,
    revealed: false,
  };
  return selected;
}

function recordEnglishReview(bankId, wordId, known) {
  const progress = englishProgressFor(bankId, wordId);
  updateEnglishProgress(bankId, wordId, {
    reviewCount: (progress.reviewCount || 0) + 1,
    knownCount: (progress.knownCount || 0) + (known ? 1 : 0),
  });
  state.englishReview = {
    bankId,
    wordId,
    revealed: true,
  };
  render();
}

function englishProgressFor(bankId, wordId) {
  return state.english.progress[bankId]?.[wordId] || {};
}

function markEnglishWordLearned(bankId, wordId) {
  const current = englishProgressFor(bankId, wordId);
  updateEnglishProgress(bankId, wordId, { learnedAt: current.learnedAt || new Date().toISOString() });
  render();
}

function updateEnglishProgress(bankId, wordId, updates) {
  state.english.progress = {
    ...state.english.progress,
    [bankId]: {
      ...(state.english.progress[bankId] || {}),
      [wordId]: {
        ...englishProgressFor(bankId, wordId),
        ...updates,
      },
    },
  };
  saveEnglish();
}

function speakEnglish(text, lang) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  const voices = speechSynthesis.getVoices();
  const voice =
    voices.find((item) => item.lang === lang) ||
    voices.find((item) => item.lang?.toLowerCase().startsWith(lang.toLowerCase())) ||
    voices.find((item) => item.lang?.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  if (voice) utterance.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function renderTaskEntry(entry) {
  if (isEditingEntry(entry)) {
    elements.taskList.appendChild(createEntryEditor(entry, "task-item edit-card"));
    return;
  }

  const node = elements.taskTemplate.content.firstElementChild.cloneNode(true);
  const check = node.querySelector(".check-button");
  const title = node.querySelector("h3");
  const pill = node.querySelector(".priority-pill");
  const meta = node.querySelector(".task-meta");
  const schedule = node.querySelector('[data-action="schedule"]');
  const remove = node.querySelector('[data-action="delete"]');
  const actions = node.querySelector(".task-actions");

  node.classList.toggle("is-done", entry.done);
  node.classList.toggle("is-canceled", isCanceled(entry));
  node.classList.add(`priority-${entry.priority}`);
  setupDraggableElement(node, entry);
  check.classList.toggle("is-checked", entry.done);
  check.disabled = isCanceled(entry);
  title.textContent = entry.title;
  pill.textContent = priorityLabels[entry.priority] || priorityLabels.normal;
  pill.classList.add(entry.priority || "normal");
  meta.innerHTML = entryMetaHtml(entry);
  schedule.hidden = entry.done || isCanceled(entry) || entry.date === state.selectedDate;

  actions.prepend(createEditButton(entry));
  actions.prepend(createCancelButton(entry));
  check.addEventListener("click", () => toggleEntryDone(entry));
  schedule.addEventListener("click", () => scheduleEntryToday(entry));
  remove.addEventListener("click", () => deleteEntry(entry));
  elements.taskList.appendChild(node);
}

function renderScheduleList(entries) {
  const groups = scheduleGroups(entries);
  groups.forEach((group) => {
    const expanded = state.scheduleExpandedGroups.has(group.key);

    const section = document.createElement("section");
    section.className = "schedule-group";
    section.classList.toggle("is-empty", group.entries.length === 0);

    const heading = document.createElement("button");
    heading.className = "schedule-group-heading";
    heading.type = "button";
    heading.setAttribute("aria-expanded", String(expanded));
    heading.addEventListener("click", () => toggleScheduleGroup(group.key));

    const titleWrap = document.createElement("span");
    titleWrap.className = "schedule-group-title";
    const indicator = document.createElement("span");
    indicator.className = `schedule-group-indicator${expanded ? " is-expanded" : ""}`;
    indicator.textContent = "▶";
    const title = document.createElement("h3");
    title.textContent = group.title;
    titleWrap.append(indicator, title);

    const count = document.createElement("span");
    count.className = "schedule-group-count";
    count.textContent = scheduleGroupMeta(group.entries);
    heading.append(titleWrap, count);
    section.append(heading);

    const list = document.createElement("div");
    list.className = "schedule-group-list";
    list.hidden = !expanded;
    group.entries.forEach((entry) => {
      const before = elements.taskList.childElementCount;
      renderTaskEntry(entry);
      const rendered = elements.taskList.lastElementChild;
      if (rendered && elements.taskList.childElementCount > before) list.append(rendered);
    });
    if (!group.entries.length) {
      const empty = document.createElement("div");
      empty.className = "schedule-group-empty";
      empty.textContent = "这里没有任务";
      list.append(empty);
    }
    section.append(list);
    elements.taskList.append(section);
  });
}

function scheduleGroups(entries) {
  const today = state.selectedDate;
  const withDate = entries.filter((entry) => entry.date);
  const withoutDate = entries.filter((entry) => !entry.date).sort(sortEntries);

  return [
    {
      key: "today",
      title: "今天",
      entries: withDate.filter((entry) => entry.date === today).sort(sortEntries),
    },
    {
      key: "future",
      title: "未来",
      entries: withDate
        .filter((entry) => entry.date > today)
        .sort((a, b) => a.date.localeCompare(b.date) || sortEntries(a, b)),
    },
    {
      key: "past",
      title: "过去",
      entries: withDate
        .filter((entry) => entry.date < today)
        .sort((a, b) => b.date.localeCompare(a.date) || sortEntries(a, b)),
    },
    {
      key: "unscheduled",
      title: "未安排",
      entries: withoutDate,
    },
  ];
}

function scheduleGroupMeta(entries) {
  if (!entries.length) return "0 项";
  const stats = unitCompletionStats(entries);
  const canceled = canceledCount(entries);
  if (stats.total === 0 && canceled) return `${canceled} 已取消`;
  return `${formatRatio(stats)} 已完成${canceled ? ` · ${canceled} 已取消` : ""}`;
}

function renderSearchList(results) {
  results.forEach((result) => {
    if (result.kind === "task") {
      renderTaskEntry(result.entry);
      return;
    }
    renderSearchGoalResult(result);
  });
}

function renderSearchGoalResult(result) {
  const entry = goalEntry(result.goal);
  const expanded = result.children.length > 0 && !state.collapsedSearchGoals.has(result.goal.id);
  const card = document.createElement("article");
  card.className = `goal-card search-goal-card priority-${result.goal.priority}${result.goal.done ? " is-done" : ""}`;

  if (isEditingEntry(entry)) {
    card.append(createEntryEditor(entry, "goal-edit-card"));
    elements.taskList.appendChild(card);
    return;
  }

  const header = document.createElement("div");
  header.className = "goal-header";

  const check = document.createElement("button");
  check.className = `check-button${result.goal.done ? " is-checked" : ""}`;
  check.type = "button";
  check.setAttribute("aria-label", "切换目标完成状态");
  check.title = result.goal.children.length ? "完成目标和所有节点" : "切换目标完成状态";
  check.addEventListener("click", () => toggleGoalDone(result.goal.id));

  const body = document.createElement("div");
  body.className = "task-body";
  const title = document.createElement("div");
  title.className = "goal-title";
  title.innerHTML = `<h3>${escapeHtml(result.goal.title)}</h3><span class="priority-pill ${result.goal.priority}">${priorityLabels[result.goal.priority]}</span>`;
  const meta = document.createElement("div");
  meta.className = "goal-meta";
  const progress = goalProgress(result.goal);
  meta.innerHTML = `<span>中期目标</span><span>截止：${formatOptionalDate(result.goal.dueDate, "未设置")}</span><span>进度：${progress.done}/${progress.total}</span>`;
  body.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  if (result.children.length) {
    const expand = document.createElement("button");
    expand.className = `icon-button small expand-button${expanded ? " is-expanded" : ""}`;
    expand.type = "button";
    expand.title = expanded ? "收起匹配节点" : "展开匹配节点";
    expand.setAttribute("aria-label", expanded ? "收起匹配节点" : "展开匹配节点");
    expand.textContent = "▸";
    expand.addEventListener("click", () => toggleSearchGoalCollapsed(result.goal.id));
    actions.append(expand);
  }
  actions.append(createEditButton(entry));
  const remove = document.createElement("button");
  remove.className = "icon-button small";
  remove.type = "button";
  remove.title = "删除目标";
  remove.setAttribute("aria-label", "删除目标");
  remove.textContent = "×";
  remove.addEventListener("click", () => deleteEntry(entry));
  actions.append(remove);

  header.append(check, body, actions);
  card.append(header);

  if (result.children.length) {
    const extra = document.createElement("div");
    extra.className = "goal-extra";
    extra.hidden = !expanded;

    const list = document.createElement("div");
    list.className = "node-list";
    result.children.forEach((child) => list.append(createNodeItem(result.goal, child)));
    extra.append(list);
    card.append(extra);
  }

  elements.taskList.appendChild(card);
}

function createEditButton(entry) {
  const edit = document.createElement("button");
  edit.className = "icon-button small";
  edit.type = "button";
  edit.title = "修改";
  edit.setAttribute("aria-label", "修改");
  edit.textContent = "✎";
  edit.addEventListener("click", () => {
    state.editing = editKey(entry);
    render();
  });
  return edit;
}

function createCancelButton(entry) {
  const cancel = document.createElement("button");
  cancel.className = "icon-button small cancel-entry-button";
  cancel.type = "button";
  cancel.title = isCanceled(entry) ? "恢复任务" : "取消并记录原因";
  cancel.setAttribute("aria-label", isCanceled(entry) ? "恢复任务" : "取消并记录原因");
  cancel.textContent = isCanceled(entry) ? "↺" : "⊘";
  cancel.hidden = entry.kind !== "task" || entry.done;
  cancel.addEventListener("click", () => toggleTaskCanceled(entry.id));
  return cancel;
}

function createEntryEditor(entry, className) {
  const wrapper = document.createElement("article");
  wrapper.className = `${className} priority-${entry.priority}`;
  const dateValue = entry.kind === "goal" ? entry.dueDate || "" : entry.date || "";
  const dateLabel = entry.kind === "goal" ? "截止" : "日期";
  const titleLabel = entry.kind === "goal" ? "目标" : "任务";

  wrapper.innerHTML = `
    <form class="edit-form">
      <input name="title" type="text" maxlength="80" value="${escapeHtml(entry.title)}" aria-label="${titleLabel}标题" required />
      <div class="date-field compact-date edit-date-field">
        <span>${dateLabel}</span>
        <input name="date" type="text" inputmode="none" readonly value="${dateValue}" />
        <button class="date-picker-button" type="button" aria-label="选择${dateLabel}" title="选择${dateLabel}">📅</button>
        <div class="date-popover" hidden></div>
      </div>
      <label class="select-field priority-select priority-${entry.priority}">
        <span>重要性</span>
        <select name="priority" aria-label="重要性">
          ${priorityOptionsHtml(entry.priority)}
        </select>
      </label>
      <div class="edit-actions">
        <button class="save-button" type="submit">保存</button>
        <button class="cancel-button" type="button">取消</button>
      </div>
    </form>
  `;

  const form = wrapper.querySelector(".edit-form");
  const dateField = wrapper.querySelector(".edit-date-field");
  const dateInput = wrapper.querySelector('input[name="date"]');
  const dateButton = wrapper.querySelector(".date-picker-button");
  const prioritySelect = wrapper.querySelector('select[name="priority"]');
  const priorityField = wrapper.querySelector(".priority-select");
  setupDatePicker(dateField, dateInput, dateButton);
  prioritySelect.addEventListener("change", () => {
    priorityField.classList.remove("priority-normal", "priority-high", "priority-urgent");
    priorityField.classList.add(`priority-${prioritySelect.value}`);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) return;
    saveEditedEntry(entry, {
      title,
      date: form.elements.date.value || null,
      priority: form.elements.priority.value,
    });
  });
  wrapper.querySelector(".cancel-button").addEventListener("click", () => {
    state.editing = null;
    render();
  });
  return wrapper;
}

function setupDatePicker(dateField, dateInput, dateButton) {
  const popover = dateField.querySelector(".date-popover");
  let pickerMonth = startOfMonth(parseISODate(dateInput.value || state.selectedDate));

  const closePicker = () => {
    popover.hidden = true;
  };
  const openPicker = () => {
    dateInput.focus();
    popover.hidden = false;
    renderDatePopover(popover, pickerMonth, dateInput.value, {
      onMonthChange: (month) => {
        pickerMonth = month;
        openPicker();
      },
      onSelect: (value) => {
        dateInput.value = value;
        closePicker();
      },
      onClear: () => {
        dateInput.value = "";
        closePicker();
      },
    });
  };
  const openFromPointer = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openPicker();
  };

  dateInput.addEventListener("pointerdown", openFromPointer);
  dateButton.addEventListener("pointerdown", openFromPointer);
  dateButton.addEventListener("click", (event) => event.preventDefault());
  dateField.addEventListener("click", (event) => {
    if (event.target.closest(".date-popover")) return;
    openPicker();
  });
  popover.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("pointerdown", (event) => {
    if (!dateField.contains(event.target)) closePicker();
  });
}

function renderDatePopover(popover, monthDate, selectedDate, actions) {
  popover.innerHTML = "";
  const header = document.createElement("div");
  header.className = "date-popover-header";

  const previous = document.createElement("button");
  previous.type = "button";
  previous.textContent = "‹";
  previous.setAttribute("aria-label", "上个月");
  previous.addEventListener("click", () => actions.onMonthChange(addMonths(monthDate, -1)));

  const title = document.createElement("strong");
  title.textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(monthDate);

  const next = document.createElement("button");
  next.type = "button";
  next.textContent = "›";
  next.setAttribute("aria-label", "下个月");
  next.addEventListener("click", () => actions.onMonthChange(addMonths(monthDate, 1)));

  header.append(previous, title, next);
  popover.append(header);

  const weekdays = document.createElement("div");
  weekdays.className = "date-popover-weekdays";
  ["一", "二", "三", "四", "五", "六", "日"].forEach((weekday) => {
    const item = document.createElement("span");
    item.textContent = weekday;
    weekdays.append(item);
  });
  popover.append(weekdays);

  const grid = document.createElement("div");
  grid.className = "date-popover-grid";
  const start = startOfWeek(monthDate);
  const today = toISODate(new Date());
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(start, index);
    const value = toISODate(date);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(date.getDate());
    button.className = [
      date.getMonth() === monthDate.getMonth() ? "" : "is-muted",
      value === selectedDate ? "is-selected" : "",
      value === today ? "is-today" : "",
    ]
      .filter(Boolean)
      .join(" ");
    button.addEventListener("click", () => actions.onSelect(value));
    grid.append(button);
  }
  popover.append(grid);

  const footer = document.createElement("div");
  footer.className = "date-popover-footer";

  const todayButton = document.createElement("button");
  todayButton.type = "button";
  todayButton.textContent = "今天";
  todayButton.addEventListener("click", () => actions.onSelect(today));

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "清除";
  clearButton.addEventListener("click", actions.onClear);

  footer.append(todayButton, clearButton);
  popover.append(footer);
}

function priorityOptionsHtml(selected) {
  return ["normal", "high", "urgent"]
    .map((value) => `<option value="${value}"${value === selected ? " selected" : ""}>${priorityLabels[value]}</option>`)
    .join("");
}

function isEditingEntry(entry) {
  if (!state.editing) return false;
  const key = editKey(entry);
  return state.editing.kind === key.kind && state.editing.id === key.id && state.editing.parentId === key.parentId;
}

function editKey(entry) {
  return {
    kind: entry.kind || "goal",
    id: entry.id,
    parentId: entry.parentId || null,
  };
}

function saveEditedEntry(entry, updates) {
  if (entry.kind === "task") updateTask(entry.id, updates);
  if (entry.kind === "node") updateNode(entry.parentId, entry.id, updates);
  if (entry.kind === "goal") updateGoal(entry.id, updates);
  state.editing = null;
  saveTasks();
  render();
}

function updateTask(id, updates) {
  state.tasks = state.tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          title: updates.title,
          date: updates.date,
          priority: updates.priority,
        }
      : task,
  );
}

function updateGoal(id, updates) {
  state.tasks = state.tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          title: updates.title,
          dueDate: updates.date,
          priority: updates.priority,
        }
      : task,
  );
}

function updateNode(goalId, nodeId, updates) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== goalId) return task;
    return syncGoalDone({
      ...task,
      children: task.children.map((child) =>
        child.id === nodeId
          ? {
              ...child,
              title: updates.title,
              date: updates.date,
              priority: updates.priority,
            }
          : child,
      ),
    });
  });
}

function renderGoalCard(goal) {
  const progress = goalProgress(goal);
  const expanded = state.expandedGoals.has(goal.id);
  const card = document.createElement("article");
  card.className = `goal-card priority-${goal.priority}${goal.done ? " is-done" : ""}`;

  if (isEditingEntry(goalEntry(goal))) {
    card.append(createEntryEditor(goalEntry(goal), "goal-edit-card"));
    elements.taskList.appendChild(card);
    return;
  }
  setupDraggableElement(card, goalEntry(goal));

  const header = document.createElement("div");
  header.className = "goal-header";

  const check = document.createElement("button");
  check.className = `check-button${goal.done ? " is-checked" : ""}`;
  check.type = "button";
  check.setAttribute("aria-label", "切换目标完成状态");
  check.title = goal.children.length ? "完成目标和所有节点" : "切换目标完成状态";
  check.addEventListener("click", () => toggleGoalDone(goal.id));

  const body = document.createElement("div");
  body.className = "task-body";
  const title = document.createElement("div");
  title.className = "goal-title";
  title.innerHTML = `<h3>${escapeHtml(goal.title)}</h3><span class="priority-pill ${goal.priority}">${priorityLabels[goal.priority]}</span>`;
  const meta = document.createElement("div");
  meta.className = "goal-meta";
  meta.innerHTML = `<span>截止：${formatOptionalDate(goal.dueDate, "未设置")}</span><span>进度：${progress.done}/${progress.total}</span><span>节点：${goal.children.length}</span>`;
  body.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const expand = document.createElement("button");
  expand.className = `icon-button small expand-button${expanded ? " is-expanded" : ""}`;
  expand.type = "button";
  expand.title = expanded ? "收起节点" : "展开节点";
  expand.setAttribute("aria-label", expanded ? "收起节点" : "展开节点");
  expand.textContent = "▸";
  expand.addEventListener("click", () => toggleGoalExpanded(goal.id));
  actions.append(expand);
  actions.append(createEditButton(goalEntry(goal)));
  const remove = document.createElement("button");
  remove.className = "icon-button small";
  remove.type = "button";
  remove.title = "删除目标";
  remove.setAttribute("aria-label", "删除目标");
  remove.textContent = "×";
  remove.addEventListener("click", () => deleteEntry(goalEntry(goal)));
  actions.append(remove);

  header.append(check, body, actions);
  card.append(header);

  const next = document.createElement("div");
  next.className = "goal-next";
  next.textContent = nextNodeText(goal);
  card.append(next);

  const extra = document.createElement("div");
  extra.className = "goal-extra";
  extra.hidden = !expanded;
  extra.append(createNodeForm(goal));

  const list = document.createElement("div");
  list.className = "node-list";
  sortedChildren(goal).forEach((child) => list.append(createNodeItem(goal, child)));
  if (!goal.children.length) {
    const empty = document.createElement("div");
    empty.className = "goal-next";
    empty.textContent = "还没有节点，可以添加复习安排或关键日期。";
    list.append(empty);
  }
  extra.append(list);
  card.append(extra);

  elements.taskList.appendChild(card);
}

function createNodeForm(goal) {
  const form = document.createElement("form");
  form.className = "node-form";
  form.innerHTML = `
    <input type="text" maxlength="80" placeholder="添加节点，例如 9/14 下载准考证" required />
    <input type="date" />
    <select aria-label="节点重要性">
      <option value="normal">普通</option>
      <option value="high">重要</option>
      <option value="urgent">紧急</option>
    </select>
    <button class="node-add" type="submit">添加</button>
  `;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const [titleInput, dateInput, prioritySelect] = form.elements;
    const title = titleInput.value.trim();
    if (!title) return;
    addNode(goal.id, {
      id: createId(),
      title,
      date: dateInput.value || null,
      priority: prioritySelect.value,
      done: false,
      order: nextOrder(),
      createdAt: new Date().toISOString(),
      completedAt: null,
    });
  });
  return form;
}

function createNodeItem(goal, child) {
  const entry = nodeEntry(goal, child);
  if (isEditingEntry(entry)) return createEntryEditor(entry, "node-item edit-card");

  const item = document.createElement("div");
  item.className = `node-item priority-${child.priority}${child.done ? " is-done" : ""}`;
  setupDraggableElement(item, entry);

  const check = document.createElement("button");
  check.className = `check-button${child.done ? " is-checked" : ""}`;
  check.type = "button";
  check.setAttribute("aria-label", "切换节点完成状态");
  check.addEventListener("click", () => toggleNodeDone(goal.id, child.id));

  const body = document.createElement("div");
  const title = document.createElement("div");
  title.className = "node-title";
  title.textContent = child.title;
  const meta = document.createElement("div");
  meta.className = "node-meta";
  meta.textContent = formatOptionalDate(child.date, "未安排日期");
  body.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(createEditButton(entry));
  const schedule = document.createElement("button");
  schedule.className = "icon-button small";
  schedule.type = "button";
  schedule.title = "安排到今天";
  schedule.setAttribute("aria-label", "安排到今天");
  schedule.textContent = "◎";
  schedule.hidden = child.done || child.date === state.selectedDate;
  schedule.addEventListener("click", () => scheduleNodeToday(goal.id, child.id));
  const remove = document.createElement("button");
  remove.className = "icon-button small";
  remove.type = "button";
  remove.title = "删除节点";
  remove.setAttribute("aria-label", "删除节点");
  remove.textContent = "×";
  remove.addEventListener("click", () => deleteNode(goal.id, child.id));
  actions.append(schedule, remove);

  item.append(check, body, actions);
  return item;
}

function renderBirthdayList(entries) {
  entries.forEach((entry) => {
    if (state.birthdayEditing === entry.id) {
      elements.taskList.append(createBirthdayEditor(entry));
      return;
    }
    elements.taskList.append(createBirthdayCard(entry));
  });
}

function createBirthdayCard(entry) {
  const card = document.createElement("article");
  card.className = `birthday-card${entry.isNextBirthday ? " is-next" : ""}`;

  const body = document.createElement("div");
  body.className = "task-body";

  const title = document.createElement("div");
  title.className = "birthday-title";
  title.innerHTML = `<h3>${escapeHtml(entry.name)}</h3><span class="birthday-pill">${birthdayCalendarLabels[entry.calendar]}</span>`;

  const meta = document.createElement("div");
  meta.className = "birthday-meta";
  const reminderText = entry.occurrence?.reminderGenerated ? "已生成中期提醒" : "生日前 30 天自动生成中期提醒";
  meta.innerHTML = `
    ${entry.isNextBirthday ? "<span>最近生日</span>" : ""}
    ${entry.birthYear ? `<span>年份：${entry.birthYear}</span>` : ""}
    <span>${escapeHtml(formatBirthdayDate(entry))}</span>
    <span>下次：${entry.occurrence ? formatTaskDate(entry.occurrence.iso) : "暂时无法换算"}</span>
    <span>${entry.occurrence ? formatDaysUntil(entry.occurrence.daysUntil) : "请检查日期"}</span>
    <span>${reminderText}</span>
  `;

  body.append(title, meta);
  if (entry.note) {
    const note = document.createElement("div");
    note.className = "birthday-note";
    note.textContent = entry.note;
    body.append(note);
  }

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const edit = document.createElement("button");
  edit.className = "icon-button small";
  edit.type = "button";
  edit.title = "修改生日";
  edit.setAttribute("aria-label", "修改生日");
  edit.textContent = "✎";
  edit.addEventListener("click", () => {
    state.birthdayEditing = entry.id;
    render();
  });
  const remove = document.createElement("button");
  remove.className = "icon-button small";
  remove.type = "button";
  remove.title = "删除生日";
  remove.setAttribute("aria-label", "删除生日");
  remove.textContent = "×";
  remove.addEventListener("click", () => deleteBirthday(entry.id));
  actions.append(edit, remove);

  card.append(body, actions);
  return card;
}

function createBirthdayEditor(entry) {
  const wrapper = document.createElement("article");
  wrapper.className = "birthday-card birthday-edit-card";
  wrapper.innerHTML = `
    <form class="birthday-edit-form">
      <input name="name" type="text" maxlength="40" value="${escapeHtml(entry.name)}" aria-label="姓名" required />
      <label class="select-field">
        <span>历法</span>
        <select name="calendar" aria-label="生日历法">
          <option value="solar"${entry.calendar === "solar" ? " selected" : ""}>公历</option>
          <option value="lunar"${entry.calendar === "lunar" ? " selected" : ""}>农历</option>
        </select>
      </label>
      <label class="date-field birthday-year-field">
        <span>年份</span>
        <input name="birthYear" type="number" min="1" max="9999" value="${entry.birthYear || ""}" aria-label="年份" placeholder="可不填" />
      </label>
      <label class="select-field">
        <span>月份</span>
        <select name="month" aria-label="生日月份"></select>
      </label>
      <label class="select-field">
        <span>日期</span>
        <select name="day" aria-label="生日日期"></select>
      </label>
      <label class="leap-field edit-leap-field">
        <input name="isLeapMonth" type="checkbox"${entry.isLeapMonth ? " checked" : ""} />
        <span>闰月</span>
      </label>
      <input class="birthday-edit-note" name="note" type="text" maxlength="80" value="${escapeHtml(entry.note)}" aria-label="备注" placeholder="备注，可不填" />
      <div class="edit-actions">
        <button class="save-button" type="submit">保存</button>
        <button class="cancel-button" type="button">取消</button>
      </div>
    </form>
  `;

  const form = wrapper.querySelector(".birthday-edit-form");
  const calendar = form.elements.calendar;
  const month = form.elements.month;
  const day = form.elements.day;
  const leapField = wrapper.querySelector(".edit-leap-field");

  const renderEditorOptions = () => {
    const selectedMonth = month.value || String(entry.month);
    const selectedDay = day.value || String(entry.day);
    month.innerHTML = "";
    for (let value = 1; value <= 12; value += 1) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = calendar.value === "lunar" ? lunarMonthLabels[value - 1] : `${value} 月`;
      month.append(option);
    }
    month.value = selectedMonth;
    const dayCount = calendar.value === "lunar" ? 30 : solarMonthDays(2024, Number(month.value));
    day.innerHTML = "";
    for (let value = 1; value <= dayCount; value += 1) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = calendar.value === "lunar" ? lunarDayLabel(value) : `${value} 日`;
      day.append(option);
    }
    day.value = Number(selectedDay) <= dayCount ? selectedDay : String(dayCount);
    leapField.hidden = calendar.value !== "lunar";
    if (calendar.value !== "lunar") form.elements.isLeapMonth.checked = false;
  };

  renderEditorOptions();
  month.value = String(entry.month);
  day.value = String(entry.day);
  calendar.addEventListener("change", renderEditorOptions);
  month.addEventListener("change", renderEditorOptions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    if (!name) return;
    updateBirthday(entry.id, {
      name,
      calendar: form.elements.calendar.value,
      birthYear: normalizeBirthYear(form.elements.birthYear.value),
      month: Number(form.elements.month.value),
      day: Number(form.elements.day.value),
      isLeapMonth: form.elements.calendar.value === "lunar" && form.elements.isLeapMonth.checked,
      note: form.elements.note.value.trim(),
    });
  });
  wrapper.querySelector(".cancel-button").addEventListener("click", () => {
    state.birthdayEditing = null;
    render();
  });
  return wrapper;
}

function filteredEntries() {
  if (state.module === "english") return [];
  if (state.view === "search") return searchResults();
  if (state.view === "birthday") return birthdayEntries();
  return filterByStatus(baseEntriesForView(), currentStatusFilter()).sort(sortEntries);
}

function baseEntriesForView() {
  if (state.view === "today") return todayEntries();
  if (state.view === "schedule") return scheduleEntries();
  if (state.view === "medium") return mediumEntries();
  return taskEntries();
}

function currentStatusFilter() {
  return state.statusFilters[state.view] || "all";
}

function filterByStatus(entries, filter) {
  if (filter === "done") return entries.filter((entry) => entry.done);
  if (filter === "open") return entries.filter((entry) => !entry.done && !isCanceled(entry));
  if (filter === "canceled") return entries.filter(isCanceled);
  return entries;
}

function taskEntries() {
  return state.tasks.filter(isScheduleTask).map((task) => taskEntry(task));
}

function scheduleEntries() {
  return taskEntries();
}

function nodeEntries() {
  return allMediumGoals().flatMap((goal) => goal.children.map((child) => nodeEntry(goal, child)));
}

function todayEntries() {
  return [...taskEntries(), ...nodeEntries()].filter((entry) => entry.date === state.selectedDate);
}

function allMediumGoals() {
  return state.tasks.filter((task) => task.scope === "medium");
}

function activeMediumGoals() {
  return allMediumGoals().filter((goal) => !goal.done);
}

function mediumEntries() {
  return allMediumGoals().map((goal) => goalEntry(goal));
}

function birthdayEntries() {
  const entries = state.birthdays.map((birthday) => {
      const occurrence = nextBirthdayOccurrence(birthday, state.selectedDate);
      return {
        ...birthday,
        occurrence: occurrence
          ? {
              ...occurrence,
              reminderGenerated: birthday.reminderDates.includes(occurrence.iso),
            }
          : null,
      };
    });
  const closestDays = Math.min(
    ...entries
      .map((entry) => entry.occurrence?.daysUntil)
      .filter((days) => Number.isFinite(days)),
  );

  return entries
    .map((entry) => ({
      ...entry,
      isNextBirthday: Number.isFinite(closestDays) && entry.occurrence?.daysUntil === closestDays,
    }))
    .sort(sortBirthdaysByAnnualDate);
}

function searchResults() {
  const results = [];
  taskEntries()
    .filter(matchesSearch)
    .sort(sortEntries)
    .forEach((entry) => results.push({ kind: "task", entry }));

  allMediumGoals()
    .map((goal) => {
      const parent = goalEntry(goal);
      const parentMatched = matchesSearch(parent);
      const children = goal.children
        .map((child) => nodeEntry(goal, child))
        .filter(matchesSearch)
        .sort(sortEntries);
      if (!parentMatched && !children.length) return null;
      return {
        kind: "goal",
        goal,
        children,
        parentMatched,
      };
    })
    .filter(Boolean)
    .sort((a, b) => sortEntries(goalEntry(a.goal), goalEntry(b.goal)))
    .forEach((entry) => results.push(entry));

  return results;
}

function matchesSearch(entry) {
  const keyword = state.search.keyword;
  const text = `${entry.title} ${entry.parentTitle || ""}`.toLowerCase();
  const dateValue = entry.kind === "goal" ? entry.dueDate : entry.date;

  if (keyword && !text.includes(keyword)) return false;
  if (state.search.date && dateValue !== state.search.date) return false;
  if (state.search.priority !== "all" && entry.priority !== state.search.priority) return false;
  if (state.search.status === "done" && !entry.done) return false;
  if (state.search.status === "open" && (entry.done || isCanceled(entry))) return false;
  if (state.search.status === "canceled" && !isCanceled(entry)) return false;
  return true;
}

function completionStats(entries) {
  return {
    done: entries.filter((entry) => entry.done).length,
    total: entries.length,
  };
}

function unitCompletionStats(entries) {
  const goalDoneById = new Map(allMediumGoals().map((goal) => [goal.id, goal.done]));
  const units = new Map();
  entries.forEach((entry) => {
    if (entry.kind === "node") {
      const key = `goal:${entry.parentId}`;
      units.set(key, { done: Boolean(goalDoneById.get(entry.parentId)) });
      return;
    }
    if (isCanceled(entry)) return;
    units.set(entry.entryId, { done: entry.done });
  });

  const values = Array.from(units.values());
  return {
    done: values.filter((unit) => unit.done).length,
    total: values.length,
  };
}

function goalCompletionStats(goals) {
  return {
    done: goals.filter((goal) => goal.done).length,
    total: goals.length,
  };
}

function totalCompletedUnits() {
  const completedTasks = taskEntries().filter((entry) => entry.done).length;
  const completedGoals = allMediumGoals().filter((goal) => goal.done).length;
  return completedTasks + completedGoals;
}

function goalProgress(goal) {
  if (!goal.children.length) {
    return { done: goal.done ? 1 : 0, total: 1 };
  }
  return {
    done: goal.children.filter((child) => child.done).length,
    total: goal.children.length,
  };
}

function formatRatio(stats) {
  return `${stats.done}/${stats.total}`;
}

function currentViewTitle() {
  if (state.module === "english") {
    const titles = {
      today: "每日英语",
      review: "复习",
      library: "词库",
      groups: "词组",
      search: "英语搜索",
    };
    return titles[state.englishView] || "每日英语";
  }
  if (state.view === "today") return formatShortDate(parseISODate(state.selectedDate));
  return viewTitles[state.view];
}

function currentViewMeta(entries) {
  if (state.module === "english") return "模块骨架";
  if (state.view === "search") return `${countSearchResults(entries)} 项匹配`;
  if (state.view === "birthday") return `${entries.length} 个生日`;
  if (state.view === "medium") return `${entries.length} 个目标 · ${formatRatio(goalCompletionStats(allMediumGoals()))} 已完成`;
  const canceled = canceledCount(entries);
  return `${formatRatio(unitCompletionStats(entries))} 已完成${canceled ? ` · ${canceled} 已取消` : ""}`;
}

function countSearchResults(results) {
  return results.reduce((total, result) => total + (result.kind === "task" ? 1 : 1 + result.children.length), 0);
}

function sortBirthdaysByAnnualDate(a, b) {
  if (a.month !== b.month) return a.month - b.month;
  if (a.day !== b.day) return a.day - b.day;
  if (a.calendar !== b.calendar) return a.calendar === "solar" ? -1 : 1;
  if (a.isLeapMonth !== b.isLeapMonth) return a.isLeapMonth ? 1 : -1;
  return (a.createdAt || "").localeCompare(b.createdAt || "");
}

function sortEntries(a, b) {
  if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0);
  return (a.createdAt || "").localeCompare(b.createdAt || "");
}

function sortedChildren(goal) {
  return [...goal.children].sort(sortEntries);
}

function toggleGoalExpanded(id) {
  if (state.expandedGoals.has(id)) {
    state.expandedGoals.delete(id);
  } else {
    state.expandedGoals.add(id);
  }
  render();
}

function toggleSearchGoalCollapsed(id) {
  if (state.collapsedSearchGoals.has(id)) {
    state.collapsedSearchGoals.delete(id);
  } else {
    state.collapsedSearchGoals.add(id);
  }
  render();
}

function toggleScheduleGroup(key) {
  if (state.scheduleExpandedGroups.has(key)) {
    state.scheduleExpandedGroups.delete(key);
  } else {
    state.scheduleExpandedGroups.add(key);
  }
  render();
}

function canReorderCurrentView() {
  return state.module === "planner" && ["today", "medium"].includes(state.view) && currentStatusFilter() === "all";
}

function setupDraggableElement(element, entry) {
  if (!canReorderCurrentView() || isEditingEntry(entry)) return;
  element.dataset.entryKey = serializeEntryKey(editKey(entry));
  element.title = element.title ? `${element.title}；可拖拽调整顺序` : "可拖拽调整顺序";

  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button, input, select, textarea, label, form")) return;
    const sourceKey = editKey(entry);
    state.dragging = editKey(entry);
    state.dragTarget = null;
    state.dropAfter = false;
    element.classList.add("is-dragging");
    event.preventDefault();

    const onPointerMove = (moveEvent) => {
      const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest("[data-entry-key]");
      clearDropTargets();
      if (!target || target === element) return;
      const targetKey = parseEntryKey(target.dataset.entryKey);
      if (sameEntryKey(sourceKey, targetKey)) return;
      const rect = target.getBoundingClientRect();
      const after = moveEvent.clientY > rect.top + rect.height / 2;
      target.classList.toggle("drop-before", !after);
      target.classList.toggle("drop-after", after);
      state.dragTarget = targetKey;
      state.dropAfter = after;
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      element.classList.remove("is-dragging");
      clearDropTargets();
      if (state.dragging && state.dragTarget) {
        reorderVisibleEntries(state.dragging, state.dragTarget, state.dropAfter);
      }
      state.dragging = null;
      state.dragTarget = null;
      state.dropAfter = false;
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  });
}

function clearDropTargets() {
  elements.taskList.querySelectorAll(".drop-before, .drop-after").forEach((item) => {
    item.classList.remove("drop-before", "drop-after");
    delete item.dataset.dropAfter;
  });
}

function reorderVisibleEntries(sourceKey, targetKey, after) {
  const entries = filteredEntries();
  const sourceIndex = entries.findIndex((entry) => sameEntryKey(editKey(entry), sourceKey));
  const targetIndex = entries.findIndex((entry) => sameEntryKey(editKey(entry), targetKey));
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

  const ordered = [...entries];
  const [moved] = ordered.splice(sourceIndex, 1);
  let insertIndex = ordered.findIndex((entry) => sameEntryKey(editKey(entry), targetKey));
  if (after) insertIndex += 1;
  ordered.splice(insertIndex, 0, moved);

  const startOrder = Math.min(...entries.map((entry) => entry.order || 0));
  ordered.forEach((entry, index) => setEntryOrder(editKey(entry), startOrder + index + 1));
  saveTasks();
  render();
}

function setEntryOrder(key, order) {
  state.tasks = state.tasks.map((task) => {
    if (key.kind === "task" && task.id === key.id) return { ...task, order };
    if (key.kind === "goal" && task.id === key.id) return { ...task, order };
    if (key.kind === "node" && task.id === key.parentId) {
      return {
        ...task,
        children: task.children.map((child) => (child.id === key.id ? { ...child, order } : child)),
      };
    }
    return task;
  });
}

function serializeEntryKey(key) {
  return `${key.kind}:${key.parentId || ""}:${key.id}`;
}

function parseEntryKey(value) {
  const [kind, parentId, id] = value.split(":");
  return { kind, parentId: parentId || null, id };
}

function sameEntryKey(a, b) {
  return a.kind === b.kind && a.id === b.id && (a.parentId || null) === (b.parentId || null);
}

function toggleEntryDone(entry) {
  if (entry.kind === "task") toggleTaskDone(entry.id);
  if (entry.kind === "node") toggleNodeDone(entry.parentId, entry.id);
  if (entry.kind === "goal") toggleGoalDone(entry.id);
}

function toggleTaskDone(id) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== id) return task;
    if (isCanceled(task)) return task;
    return withDone(task, !task.done);
  });
  saveTasks();
  render();
}

function toggleTaskCanceled(id) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== id) return task;
    if (isCanceled(task)) return { ...task, canceled: false, cancelReason: "", canceledAt: null };

    const reason = prompt("取消原因（可以简单写一句）：", task.cancelReason || "");
    if (reason === null) return task;
    return {
      ...task,
      done: false,
      completedAt: null,
      canceled: true,
      cancelReason: reason.trim(),
      canceledAt: new Date().toISOString(),
    };
  });
  saveTasks();
  render();
}

function toggleGoalDone(id) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== id) return task;
    const done = !task.done;
    return {
      ...withDone(task, done),
      children: task.children.map((child) => withDone(child, done)),
    };
  });
  saveTasks();
  render();
}

function toggleNodeDone(goalId, nodeId) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== goalId) return task;
    const children = task.children.map((child) => (child.id === nodeId ? withDone(child, !child.done) : child));
    return syncGoalDone({ ...task, children });
  });
  saveTasks();
  render();
}

function addNode(goalId, child) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== goalId) return task;
    return syncGoalDone({ ...task, children: [...task.children, child] });
  });
  saveTasks();
  render();
}

function updateBirthday(id, updates) {
  state.birthdays = state.birthdays.map((birthday) => {
    if (birthday.id !== id) return birthday;
    const dateChanged =
      birthday.calendar !== updates.calendar ||
      birthday.month !== updates.month ||
      birthday.day !== updates.day ||
      birthday.isLeapMonth !== updates.isLeapMonth;
    return {
      ...birthday,
      ...updates,
      reminderDates: dateChanged ? [] : birthday.reminderDates,
      updatedAt: new Date().toISOString(),
    };
  });
  state.birthdayEditing = null;
  saveBirthdays();
  syncBirthdayReminders();
  render();
}

function deleteBirthday(id) {
  state.birthdays = state.birthdays.filter((birthday) => birthday.id !== id);
  state.birthdayEditing = null;
  saveBirthdays();
  render();
}

function scheduleEntryToday(entry) {
  if (entry.kind === "task") scheduleTaskToday(entry.id);
  if (entry.kind === "node") scheduleNodeToday(entry.parentId, entry.id);
}

function scheduleTaskToday(id) {
  state.tasks = state.tasks.map((task) => (task.id === id ? { ...task, date: state.selectedDate } : task));
  saveTasks();
  render();
}

function scheduleNodeToday(goalId, nodeId) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== goalId) return task;
    return {
      ...task,
      children: task.children.map((child) => (child.id === nodeId ? { ...child, date: state.selectedDate } : child)),
    };
  });
  saveTasks();
  render();
}

function deleteEntry(entry) {
  if (entry.kind === "task" || entry.kind === "goal") {
    state.tasks = state.tasks.filter((task) => task.id !== entry.id);
    state.expandedGoals.delete(entry.id);
  }
  if (entry.kind === "node") {
    deleteNode(entry.parentId, entry.id);
    return;
  }
  saveTasks();
  render();
}

function deleteNode(goalId, nodeId) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== goalId) return task;
    return syncGoalDone({ ...task, children: task.children.filter((child) => child.id !== nodeId) });
  });
  saveTasks();
  render();
}

function withDone(item, done) {
  return {
    ...item,
    done,
    canceled: done ? false : Boolean(item.canceled),
    cancelReason: done ? "" : item.cancelReason || "",
    canceledAt: done ? null : item.canceledAt || null,
    completedAt: done ? item.completedAt || new Date().toISOString() : null,
  };
}

function syncGoalDone(goal) {
  if (!goal.children.length) return goal;
  const done = goal.children.every((child) => child.done);
  return withDone(goal, done);
}

function taskEntry(task) {
  return {
    ...task,
    kind: "task",
    entryId: `task:${task.id}`,
  };
}

function nodeEntry(goal, child) {
  return {
    ...child,
    kind: "node",
    entryId: `node:${goal.id}:${child.id}`,
    parentId: goal.id,
    parentTitle: goal.title,
  };
}

function goalEntry(goal) {
  return {
    ...goal,
    kind: "goal",
    entryId: `goal:${goal.id}`,
  };
}

function entryMeta(entry) {
  if (entry.kind === "node") {
    const date = formatOptionalDate(entry.date, "未安排日期");
    return `来自：${entry.parentTitle} · ${date}`;
  }
  if (entry.kind === "goal") return `中期目标 · 截止：${formatOptionalDate(entry.dueDate, "未设置")}`;
  return formatOptionalDate(entry.date, "未安排");
}

function entryMetaHtml(entry) {
  const parts = [escapeHtml(entryMeta(entry))];
  if (isCanceled(entry)) {
    const reason = entry.cancelReason ? `：${entry.cancelReason}` : "";
    parts.push(`<span class="cancel-reason">已取消${escapeHtml(reason)}</span>`);
  }
  return parts.join(" · ");
}

function isCanceled(entry) {
  return Boolean(entry?.canceled);
}

function canceledCount(entries) {
  return entries.filter(isCanceled).length;
}

function nextNodeText(goal) {
  const open = sortedChildren(goal).filter((child) => !child.done);
  if (!open.length) return goal.children.length ? "所有节点已完成" : "还没有节点";
  const next = open[0];
  const date = formatOptionalDate(next.date, "未安排日期");
  return `下一个节点：${date} · ${next.title}`;
}

function createMediumGoal(title) {
  return {
    id: createId(),
    title,
    scope: "medium",
    date: null,
    dueDate: elements.taskDate.value || null,
    children: [],
    priority: elements.taskPriority.value,
    done: false,
    canceled: false,
    cancelReason: "",
    order: nextOrder(),
    createdAt: new Date().toISOString(),
    completedAt: null,
    canceledAt: null,
  };
}

function createBirthdayGoal(birthday, occurrence, orderOffset = 0) {
  const dueDate = parseISODate(occurrence.iso);
  const firstNodeDate = maxISODate(state.selectedDate, toISODate(addDays(dueDate, -21)));
  const secondNodeDate = maxISODate(state.selectedDate, toISODate(addDays(dueDate, -7)));
  const order = nextOrder() + orderOffset * 4;
  return {
    id: createId(),
    title: `准备${birthday.name}生日`,
    scope: "medium",
    date: null,
    dueDate: occurrence.iso,
    children: [
      createBirthdayNode("确认生日安排", firstNodeDate, "normal", order + 1),
      createBirthdayNode("准备礼物或祝福", secondNodeDate, "high", order + 2),
      createBirthdayNode("生日当天祝福", occurrence.iso, "high", order + 3),
    ],
    priority: "high",
    done: false,
    canceled: false,
    cancelReason: "",
    order,
    createdAt: new Date().toISOString(),
    completedAt: null,
    canceledAt: null,
    source: {
      type: "birthday",
      birthdayId: birthday.id,
      birthdayDate: occurrence.iso,
    },
  };
}

function createBirthdayNode(title, date, priority, order) {
  return {
    id: createId(),
    title,
    date,
    priority,
    done: false,
    order,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}

function isScheduleTask(task) {
  return task.scope !== "medium";
}

function resetTaskForm() {
  elements.taskTitle.value = "";
  elements.taskScope.value = "schedule";
  elements.taskPriority.value = "normal";
  elements.taskDate.value = state.selectedDate;
  renderTaskMode();
  renderPrioritySelect();
}

function resetBirthdayForm() {
  elements.birthdayName.value = "";
  elements.birthdayCalendar.value = "solar";
  elements.birthdayYear.value = "";
  elements.birthdayMonth.value = "1";
  elements.birthdayDay.value = "1";
  elements.birthdayLeap.checked = false;
  elements.birthdayNote.value = "";
  renderBirthdaySelectOptions();
}

async function exportTasks() {
  const exportedAt = new Date();
  const filename = `Workbuddy-${formatFileStamp(exportedAt)}.json`;
  const blob = new Blob(
    [
      JSON.stringify(
        { exportedAt: exportedAt.toISOString(), tasks: state.tasks, birthdays: state.birthdays, english: state.english },
        null,
        2,
      ),
    ],
    {
      type: "application/json",
    },
  );
  const file = new File([blob], filename, { type: "application/json" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: "Workbuddy 备份",
        text: "Workbuddy 数据备份",
        files: [file],
      });
      showBackupStatus("已打开手机保存/分享面板");
      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        showBackupStatus("已取消导出");
        return;
      }
    }
  }

  downloadBackupFile(blob, filename);
  showBackupStatus("已导出备份文件");
}

function downloadBackupFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importTasks(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const shouldImport = confirm("导入备份会覆盖当前任务、生日和英语学习数据。建议先确认当前数据已经导出到坚果云。继续导入吗？");
  if (!shouldImport) {
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!Array.isArray(parsed.tasks)) throw new Error("Invalid file");
      saveImportBackup();
      state.tasks = normalizeTasks(parsed.tasks).filter((task) => task.title && typeof task.title === "string");
      state.birthdays = normalizeBirthdays(parsed.birthdays);
      state.english = normalizeEnglish(parsed.english);
      saveTasks();
      saveBirthdays();
      saveEnglish();
      renderBackupState();
      render();
      showBackupStatus(`已导入：${file.name}`);
    } catch {
      alert("导入失败，请选择有效的备份文件。");
      showBackupStatus("导入失败");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function saveImportBackup() {
  localStorage.setItem(
    importBackupKey,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      tasks: state.tasks,
      birthdays: state.birthdays,
      english: state.english,
    }),
  );
}

function restoreImportBackup() {
  const raw = readImportBackup();
  if (!raw) return;
  const shouldRestore = confirm("这会用最近一次导入前的本机数据覆盖当前任务、生日和英语学习数据。继续恢复吗？");
  if (!shouldRestore) return;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.tasks)) throw new Error("Invalid backup");
    state.tasks = normalizeTasks(parsed.tasks).filter((task) => task.title && typeof task.title === "string");
    state.birthdays = normalizeBirthdays(parsed.birthdays);
    state.english = normalizeEnglish(parsed.english);
    saveTasks();
    saveBirthdays();
    saveEnglish();
    render();
    showBackupStatus("已恢复导入前数据");
  } catch {
    alert("恢复失败，导入前备份不可用。");
    showBackupStatus("恢复失败");
  }
}

function renderBackupState() {
  elements.restoreImportBackup.disabled = !readImportBackup();
}

function showBackupStatus(message) {
  elements.backupStatus.textContent = message;
}

function readImportBackup() {
  const raw = localStorage.getItem(importBackupKey);
  if (raw) return raw;

  const legacyRaw = readFirstLocalStorageValue(legacyImportBackupKeys);
  if (legacyRaw) {
    localStorage.setItem(importBackupKey, legacyRaw);
    return legacyRaw;
  }
  return null;
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return normalizeTasks(JSON.parse(raw));

    const legacyRaw = readFirstLocalStorageValue(legacyStorageKeys);
    if (legacyRaw) {
      const migrated = normalizeTasks(JSON.parse(legacyRaw));
      localStorage.setItem(storageKey, JSON.stringify(migrated));
      return migrated;
    }

    return seedTasks();
  } catch {
    return seedTasks();
  }
}

function loadBirthdays() {
  try {
    const raw = localStorage.getItem(birthdayStorageKey);
    if (raw) return normalizeBirthdays(JSON.parse(raw));
    return [];
  } catch {
    return [];
  }
}

function loadEnglish() {
  try {
    const raw = localStorage.getItem(englishStorageKey);
    if (raw) return normalizeEnglish(JSON.parse(raw));
    return normalizeEnglish();
  } catch {
    return normalizeEnglish();
  }
}

function readFirstLocalStorageValue(keys) {
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return null;
}

function normalizeTasks(tasks) {
  return Array.isArray(tasks)
    ? tasks.map(normalizeTask).map((task) => (task.scope === "medium" ? syncGoalDone(task) : task))
    : seedTasks();
}

function normalizeBirthdays(birthdays) {
  if (!Array.isArray(birthdays)) return [];
  return birthdays
    .filter((birthday) => birthday?.name && typeof birthday.name === "string")
    .map((birthday) => {
      const calendar = birthday.calendar === "lunar" ? "lunar" : "solar";
      const month = clampInteger(birthday.month, 1, 12, 1);
      const day = clampInteger(birthday.day, 1, calendar === "lunar" ? 30 : 31, 1);
      return {
        ...birthday,
        id: birthday.id || createId(),
        name: birthday.name,
        calendar,
        birthYear: normalizeBirthYear(birthday.birthYear),
        month,
        day,
        isLeapMonth: calendar === "lunar" && Boolean(birthday.isLeapMonth),
        note: typeof birthday.note === "string" ? birthday.note : "",
        reminderDates: Array.isArray(birthday.reminderDates) ? birthday.reminderDates.filter(Boolean) : [],
        createdAt: birthday.createdAt || new Date().toISOString(),
        updatedAt: birthday.updatedAt || null,
      };
    });
}

function normalizeEnglish(english = {}) {
  const selectedBankId = englishWordBanks.some((bank) => bank.id === english.selectedBankId)
    ? english.selectedBankId
    : englishWordBanks[0].id;
  return {
    selectedBankId,
    today: typeof english.today === "object" && english.today ? english.today : {},
    progress: normalizeEnglishProgress(english.progress),
    groups: normalizeEnglishGroups(english.groups),
  };
}

function normalizeEnglishProgress(progress) {
  if (!progress || typeof progress !== "object") return {};
  return Object.fromEntries(
    Object.entries(progress).map(([bankId, words]) => [
      bankId,
      words && typeof words === "object"
        ? Object.fromEntries(
            Object.entries(words).map(([wordId, item]) => [
              wordId,
              {
                learnedAt: typeof item?.learnedAt === "string" ? item.learnedAt : null,
                note: typeof item?.note === "string" ? item.note : "",
                reviewCount: normalizeNonNegativeInteger(item?.reviewCount),
                knownCount: normalizeNonNegativeInteger(item?.knownCount),
              },
            ]),
          )
        : {},
    ]),
  );
}

function normalizeEnglishGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups
    .filter((group) => group?.title && Array.isArray(group.words))
    .map((group) => ({
      id: group.id || createId(),
      title: String(group.title),
      type: typeof group.type === "string" ? group.type : "自定义",
      words: group.words.map(String).filter(Boolean),
      note: typeof group.note === "string" ? group.note : "",
      createdAt: group.createdAt || new Date().toISOString(),
    }));
}

function normalizeTask(task) {
  const scope = task.scope === "medium" ? "medium" : "schedule";
  const children = normalizeChildren(task.children);
  return {
    ...task,
    id: task.id || createId(),
    scope,
    date: scope === "medium" ? null : task.date || null,
    dueDate: scope === "medium" ? task.dueDate || task.date || null : null,
    children: scope === "medium" ? children : [],
    priority: normalizePriority(task.priority),
    done: Boolean(task.done),
    canceled: Boolean(task.canceled),
    cancelReason: typeof task.cancelReason === "string" ? task.cancelReason : "",
    order: normalizeOrder(task),
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt || null,
    canceledAt: task.canceledAt || null,
  };
}

function normalizeChildren(children) {
  return Array.isArray(children)
    ? children
        .filter((child) => child.title && typeof child.title === "string")
        .map((child) => ({
          ...child,
          id: child.id || createId(),
          date: child.date || null,
          priority: normalizePriority(child.priority),
          done: Boolean(child.done),
          canceled: false,
          cancelReason: "",
          order: normalizeOrder(child),
          createdAt: child.createdAt || new Date().toISOString(),
          completedAt: child.completedAt || null,
          canceledAt: null,
        }))
    : [];
}

function normalizePriority(priority) {
  if (priority === "urgent" || priority === "high") return priority;
  return "normal";
}

function saveTasks() {
  localStorage.setItem(storageKey, JSON.stringify(state.tasks));
}

function saveBirthdays() {
  localStorage.setItem(birthdayStorageKey, JSON.stringify(state.birthdays));
}

function saveEnglish() {
  localStorage.setItem(englishStorageKey, JSON.stringify(state.english));
}

function rolloverOpenScheduleTasks() {
  let changed = false;
  const today = state.selectedDate;

  state.tasks = state.tasks.map((task) => {
    if (!isScheduleTask(task) || task.done || isCanceled(task) || !task.date || task.date >= today) return task;
    changed = true;
    return { ...task, date: today };
  });

  if (changed) saveTasks();
}

function syncBirthdayReminders() {
  const today = state.selectedDate;
  let birthdaysChanged = false;
  const goals = [];

  state.birthdays = state.birthdays.map((birthday) => {
    const occurrence = nextBirthdayOccurrence(birthday, today);
    if (!occurrence || occurrence.daysUntil > 30 || birthday.reminderDates.includes(occurrence.iso)) return birthday;

    goals.push(createBirthdayGoal(birthday, occurrence, goals.length));
    birthdaysChanged = true;
    return {
      ...birthday,
      reminderDates: [...birthday.reminderDates, occurrence.iso],
      updatedAt: new Date().toISOString(),
    };
  });

  if (goals.length) {
    state.tasks = [...goals, ...state.tasks];
    saveTasks();
  }
  if (birthdaysChanged) saveBirthdays();
}

function nextOrder() {
  const orders = [
    ...state.tasks.map((task) => task.order || 0),
    ...state.tasks.flatMap((task) => (Array.isArray(task.children) ? task.children.map((child) => child.order || 0) : [])),
  ];
  return Math.max(0, ...orders) + 1;
}

function normalizeOrder(item) {
  if (Number.isFinite(item.order)) return item.order;
  const created = Date.parse(item.createdAt || "");
  return Number.isFinite(created) ? created : Date.now();
}

function seedTasks() {
  const today = toISODate(new Date());
  const now = Date.now();
  return [
    {
      id: "seed-1",
      title: "写下今天最重要的一件事",
      scope: "schedule",
      date: today,
      dueDate: null,
      children: [],
      priority: "high",
      done: false,
      canceled: false,
      cancelReason: "",
      order: now,
      createdAt: new Date().toISOString(),
      completedAt: null,
      canceledAt: null,
    },
    {
      id: "seed-2",
      title: "记录一个暂时未安排的想法",
      scope: "schedule",
      date: null,
      dueDate: null,
      children: [],
      priority: "normal",
      done: false,
      canceled: false,
      cancelReason: "",
      order: now + 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
      canceledAt: null,
    },
    {
      id: "seed-3",
      title: "建立一个可以长期坚持的中期目标",
      scope: "medium",
      date: null,
      dueDate: null,
      children: [],
      priority: "normal",
      done: false,
      canceled: false,
      cancelReason: "",
      order: now + 2,
      createdAt: new Date().toISOString(),
      completedAt: null,
      canceledAt: null,
    },
  ];
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function weekDates(date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return startOfMonth(next);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toISODate(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function parseISODate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatFileStamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}`;
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatWeekday(date) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(date);
}

function formatTaskDate(value) {
  return formatShortDate(parseISODate(value));
}

function formatOptionalDate(date, fallback) {
  if (!date) return fallback;
  return formatTaskDate(date);
}

function formatBirthdayDate(birthday) {
  if (birthday.calendar === "lunar") {
    const leap = birthday.isLeapMonth ? "闰" : "";
    return `农历 ${leap}${lunarMonthLabels[birthday.month - 1]}${lunarDayLabel(birthday.day)}`;
  }
  return `公历 ${birthday.month} 月 ${birthday.day} 日`;
}

function formatDaysUntil(days) {
  if (days === 0) return "今天生日";
  return `还有 ${days} 天`;
}

function sameDate(value, isoDate) {
  if (!value) return false;
  return toISODate(new Date(value)) === isoDate;
}

function nextBirthdayOccurrence(birthday, fromIso) {
  return birthday.calendar === "lunar"
    ? nextLunarBirthdayOccurrence(birthday, fromIso)
    : nextSolarBirthdayOccurrence(birthday, fromIso);
}

function nextSolarBirthdayOccurrence(birthday, fromIso) {
  const from = parseISODate(fromIso);
  const startYear = from.getFullYear();
  for (let year = startYear; year <= startYear + 5; year += 1) {
    const date = new Date(year, birthday.month - 1, birthday.day);
    if (date.getMonth() !== birthday.month - 1 || date.getDate() !== birthday.day) continue;
    const iso = toISODate(date);
    if (iso >= fromIso) return { iso, daysUntil: daysBetween(fromIso, iso) };
  }
  return null;
}

function nextLunarBirthdayOccurrence(birthday, fromIso) {
  const from = parseISODate(fromIso);
  for (let offset = 0; offset <= 800; offset += 1) {
    const date = addDays(from, offset);
    const lunar = lunarParts(date);
    if (!lunar) return null;
    if (
      lunar.month === birthday.month &&
      lunar.day === birthday.day &&
      lunar.isLeapMonth === Boolean(birthday.isLeapMonth)
    ) {
      return { iso: toISODate(date), daysUntil: offset };
    }
  }
  return null;
}

function lunarParts(date) {
  try {
    const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
      month: "long",
      day: "numeric",
    }).formatToParts(date);
    const monthText = parts.find((part) => part.type === "month")?.value || "";
    const dayText = parts.find((part) => part.type === "day")?.value || "";
    const month = lunarMonthNumber(monthText.replace("闰", ""));
    const day = Number(dayText);
    if (!month || !day) return null;
    return {
      month,
      day,
      isLeapMonth: monthText.includes("闰"),
    };
  } catch {
    return null;
  }
}

function lunarMonthNumber(monthText) {
  return lunarMonthLabels.findIndex((label) => label === monthText) + 1;
}

function lunarDayLabel(day) {
  const labels = [
    "初一",
    "初二",
    "初三",
    "初四",
    "初五",
    "初六",
    "初七",
    "初八",
    "初九",
    "初十",
    "十一",
    "十二",
    "十三",
    "十四",
    "十五",
    "十六",
    "十七",
    "十八",
    "十九",
    "二十",
    "廿一",
    "廿二",
    "廿三",
    "廿四",
    "廿五",
    "廿六",
    "廿七",
    "廿八",
    "廿九",
    "三十",
  ];
  return labels[day - 1] || `${day} 日`;
}

function daysBetween(fromIso, toIso) {
  const from = parseISODate(fromIso);
  const to = parseISODate(toIso);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function solarMonthDays(year, month) {
  return new Date(year, month, 0).getDate();
}

function maxISODate(first, second) {
  return first > second ? first : second;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeBirthYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  return year;
}

function normalizeNonNegativeInteger(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return 0;
  return number;
}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}
