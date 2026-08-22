import { englishWordBanks } from "./english-wordbanks.js";

const storageKey = "workbuddy.tasks.v1";
const birthdayStorageKey = "workbuddy.birthdays.v1";
const recurrenceStorageKey = "workbuddy.recurrences.v1";
const englishStorageKey = "workbuddy.english.v1";
const knowledgeStorageKey = "workbuddy.knowledge.v1";
const shoppingStorageKey = "workbuddy.shopping.v1";
const legacyStorageKeys = ["daily-planner.tasks.v1"];
const importBackupKey = "workbuddy.import-backup.v1";
const legacyImportBackupKeys = ["daily-planner.import-backup.v1"];
const shoppingPlatforms = ["淘宝", "京东", "拼多多", "抖音", "盒马", "阿里巴巴"];

const state = {
  tasks: loadTasks(),
  birthdays: loadBirthdays(),
  recurrences: loadRecurrences(),
  english: loadEnglish(),
  knowledge: loadKnowledge(),
  shopping: loadShopping(),
  module: "planner",
  selectedDate: toISODate(new Date()),
  view: "today",
  englishView: "today",
  knowledgeView: "categories",
  shoppingCategoryId: "all",
  shoppingSubcategoryId: "all",
  shoppingSort: "custom",
  shoppingSearch: "",
  shoppingExpandedProductId: null,
  shoppingHighlightedProductId: null,
  knowledgeSearch: "",
  knowledgeCategorySort: "custom",
  knowledgeDocumentSort: "custom",
  knowledgeCreatingCategory: false,
  knowledgeClassifyingDocumentId: null,
  knowledgeEditorMode: "edit",
  knowledgeEditor: null,
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
  recurrenceEditing: null,
  recurrenceSummaryRanges: {},
  expandedGoals: new Set(),
  expandedRecurrences: new Set(),
  expandedDetails: new Set(),
  collapsedSearchGoals: new Set(),
  expandedKnowledgeCategories: new Set(),
  knowledgeBatch: {
    active: false,
    trashActive: false,
    selectedCategories: new Set(),
    selectedDocuments: new Set(),
    selectedTrash: new Set(),
    moveTargetId: "uncategorized",
    moveMode: "add",
  },
  scheduleExpandedGroups: new Set(),
  dragging: null,
  dragTarget: null,
  dropAfter: false,
};

const elements = {
  todayText: document.querySelector("#todayText"),
  dateStrip: document.querySelector("#dateStrip"),
  todayCount: document.querySelector("#todayCount"),
  scheduleCount: document.querySelector("#scheduleCount"),
  mediumCount: document.querySelector("#mediumCount"),
  recurrenceCount: document.querySelector("#recurrenceCount"),
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
  toolbar: document.querySelector(".toolbar"),
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
  knowledgeSegments: document.querySelector("#knowledgeSegments"),
  knowledgeSegmentButtons: document.querySelectorAll("[data-knowledge-view]"),
  knowledgeImportInput: document.querySelector("#knowledgeImportInput"),
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
  recurrence: "周期",
  birthday: "生日",
  search: "搜索",
};

const recurrenceFrequencyLabels = {
  daily: "每天",
  weekly: "每周",
  interval: "每隔",
  monthly: "每月",
};

const recurrenceRecordLabels = {
  done: "完成",
  missed: "未完成",
  skipped: "跳过",
};

const birthdayCalendarLabels = {
  solar: "公历",
  lunar: "农历",
};

const lunarMonthLabels = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"];

init();

function init() {
  rolloverOpenScheduleTasks();
  markMissedRecurrences();
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
            note: "",
            checklist: [],
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
      if (state.module === "knowledge") state.knowledgeView = "categories";
      if (state.module === "shopping") {
        state.shoppingHighlightedProductId = null;
      }
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

  elements.knowledgeSegmentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.knowledgeView = button.dataset.knowledgeView;
      state.knowledgeClassifyingDocumentId = null;
      resetKnowledgeBatch();
      if (state.knowledgeView === "new") {
        state.knowledgeEditor = createKnowledgeEditorDraft();
      }
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
  elements.knowledgeImportInput.addEventListener("change", importKnowledgeDocument);
}

function render() {
  renderModules();
  renderDateStrip();
  renderSegments();
  renderEnglishSegments();
  renderKnowledgeSegments();
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
  const isEnglish = state.module === "english";
  const isKnowledge = state.module === "knowledge";
  elements.moduleButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.module === state.module);
  });
  elements.plannerOverview.hidden = !isPlanner;
  elements.englishOverview.hidden = !isEnglish;
  elements.plannerSegments.hidden = !isPlanner;
  elements.englishSegments.hidden = !isEnglish;
  elements.knowledgeSegments.hidden = !isKnowledge;
  elements.toolbar.hidden = state.module === "shopping";
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

function renderKnowledgeSegments() {
  elements.knowledgeSegmentButtons.forEach((segment) => {
    segment.classList.toggle("is-active", segment.dataset.knowledgeView === state.knowledgeView);
  });
}

function renderStatusFilters() {
  const visible =
    state.module === "planner" && !["search", "birthday", "recurrence"].includes(state.view);
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
  elements.recurrenceCount.textContent = state.recurrences.items.length;
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
  elements.taskList.classList.toggle(
    "is-medium-list",
    state.module === "planner" && (state.view === "medium" || state.view === "search"),
  );
  elements.taskList.classList.toggle(
    "is-reorderable",
    canReorderCurrentView() || canReorderRecurrenceView() || canReorderKnowledgeView() || canReorderShoppingView(),
  );
  elements.viewTitle.textContent = currentViewTitle();
  elements.viewMeta.textContent = currentViewMeta(entries);
  const hasTodayRecurrences = state.module === "planner" && state.view === "today" && todayRecurrenceEntries().length > 0;
  elements.emptyState.hidden =
    state.module === "english" ||
    state.module === "knowledge" ||
    state.module === "shopping" ||
    state.view === "schedule" ||
    hasTodayRecurrences ||
    entries.length > 0;

  if (state.module === "english") {
    renderEnglishShell();
    return;
  }

  if (state.module === "knowledge") {
    renderKnowledgeShell();
    return;
  }

  if (state.module === "shopping") {
    renderShoppingShell();
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

  if (state.view === "recurrence") {
    renderRecurrenceList(entries);
    return;
  }

  if (state.view === "schedule") {
    renderScheduleList(entries);
    return;
  }

  entries.forEach(renderTaskEntry);
  if (state.view === "today") renderTodayRecurrences();
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
  const panel = createEnglishPanel("今日");
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
  const panel = createEnglishPanel("词库");
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
  const panel = createEnglishPanel("词组");
  const form = document.createElement("form");
  form.className = "english-group-form";
  form.innerHTML = `
    <div class="english-group-main-fields">
      <input name="title" type="text" maxlength="40" placeholder="词组类名" required />
      <label class="select-field">
        <span>类型</span>
        <select name="type" aria-label="词组类型">
          ${createEnglishGroupTypeOptions("近义")}
        </select>
      </label>
      <input name="defaultPartSpeech" type="text" maxlength="24" placeholder="默认词性" />
      <input name="note" type="text" maxlength="160" placeholder="词组备注" />
      <button class="primary-button" type="submit">添加词组</button>
    </div>
  `;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = form.elements.title.value.trim();
    const defaultPartSpeech = form.elements.defaultPartSpeech.value.trim();
    if (!title) return;
    state.english.groups.unshift({
      id: createId(),
      title,
      type: form.elements.type.value,
      defaultPartSpeech,
      words: [],
      note: form.elements.note.value.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: null,
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

function createEnglishGroupTypeOptions(selected = "近义") {
  return ["形近", "近义", "反义", "义近", "同主题", "自定义"]
    .map((type) => `<option value="${escapeHtml(type)}"${type === selected ? " selected" : ""}>${escapeHtml(type)}</option>`)
    .join("");
}

function createEnglishGroupEditForm(group) {
  const form = document.createElement("form");
  form.className = "english-group-form english-group-edit-form";
  form.innerHTML = `
    <input name="title" type="text" maxlength="40" value="${escapeHtml(group.title)}" required />
    <label class="select-field">
      <span>类型</span>
      <select name="type" aria-label="词组类型">
        ${createEnglishGroupTypeOptions(group.type)}
      </select>
    </label>
    <input name="defaultPartSpeech" type="text" maxlength="24" value="${escapeHtml(group.defaultPartSpeech || "")}" placeholder="默认词性" />
    <input name="note" type="text" maxlength="160" value="${escapeHtml(group.note || "")}" placeholder="词组备注" />
    <button class="save-button" type="submit">保存</button>
  `;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) return;
    updateEnglishGroup(group.id, {
      title,
      type: form.elements.type.value,
      defaultPartSpeech: form.elements.defaultPartSpeech.value.trim(),
      note: form.elements.note.value.trim(),
    });
  });
  return form;
}

function createEnglishSearchPanel() {
  const panel = createEnglishPanel("搜索");
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
  const panel = createEnglishPanel("复习");
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

function createEnglishPanel(title, meta = "") {
  const panel = document.createElement("section");
  panel.className = "english-panel";
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
    <textarea class="english-note-input" maxlength="180" placeholder="我的备注">${escapeHtml(progress.note || "")}</textarea>
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
  const defaultPartSpeech = group.defaultPartSpeech ? `默认词性：${group.defaultPartSpeech}` : "";
  card.innerHTML = `
    <div class="english-group-content">
      <div class="english-group-head">
        <div>
          <div class="english-row-title">
            <strong>${escapeHtml(group.title)}</strong>
            <span>${escapeHtml(group.type)}</span>
            ${defaultPartSpeech ? `<span>${escapeHtml(defaultPartSpeech)}</span>` : ""}
          </div>
          ${group.note ? `<div class="english-row-meta">${escapeHtml(group.note)}</div>` : ""}
        </div>
        <div class="word-preview-actions">
          <button class="icon-button small" type="button" data-action="add-word" aria-label="添加单词" title="添加单词">＋</button>
          <button class="icon-button small" type="button" data-action="edit-group" aria-label="修改词组" title="修改词组">✎</button>
          <button class="icon-button small" type="button" data-action="delete-group" aria-label="删除词组" title="删除词组">×</button>
        </div>
      </div>
      <div class="english-group-word-list">
        ${group.words.length ? group.words.map((word) => englishGroupWordHtml(word)).join("") : '<div class="english-row-meta">这个词组还没有单词。</div>'}
      </div>
      <div class="english-group-edit-slot" hidden></div>
    </div>
  `;
  card.querySelector('[data-action="add-word"]').addEventListener("click", () => addEnglishGroupWord(group.id));
  card.querySelector('[data-action="edit-group"]').addEventListener("click", () => {
    const slot = card.querySelector(".english-group-edit-slot");
    slot.hidden = !slot.hidden;
    slot.replaceChildren(slot.hidden ? "" : createEnglishGroupEditForm(group));
  });
  card.querySelector('[data-action="delete-group"]').addEventListener("click", () => deleteEnglishGroup(group.id));
  card.querySelectorAll("[data-word-id]").forEach((row) => {
    const wordId = row.dataset.wordId;
    row.querySelector('[data-action="edit-word"]').addEventListener("click", () => editEnglishGroupWord(group.id, wordId));
    row.querySelector('[data-action="delete-word"]').addEventListener("click", () => deleteEnglishGroupWord(group.id, wordId));
  });
  return card;
}

function englishGroupWordHtml(word) {
  return `
    <div class="english-group-word-row" data-word-id="${escapeHtml(word.id)}">
      <div class="english-group-word-main">
        <strong>${escapeHtml(word.word)}</strong>
        ${word.partSpeech ? `<span>${escapeHtml(word.partSpeech)}</span>` : ""}
        ${word.translation ? `<em>${escapeHtml(word.translation)}</em>` : ""}
      </div>
      ${word.note ? `<div class="english-row-meta">${escapeHtml(word.note)}</div>` : ""}
      <div class="word-preview-actions">
        <button class="icon-button small" type="button" data-action="edit-word" aria-label="修改单词" title="修改单词">✎</button>
        <button class="icon-button small" type="button" data-action="delete-word" aria-label="删除单词" title="删除单词">×</button>
      </div>
    </div>
  `;
}

function openWorkbuddyModal({ title, body, actions, initialFocusSelector, onClose }) {
  const overlay = document.createElement("div");
  overlay.className = "workbuddy-modal-overlay";
  overlay.setAttribute("role", "presentation");
  const dialog = document.createElement("section");
  dialog.className = "workbuddy-modal";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", title);
  dialog.innerHTML = `
    <div class="workbuddy-modal-head">
      <h3>${escapeHtml(title)}</h3>
      <button class="icon-button small" type="button" data-modal-close aria-label="关闭" title="关闭">×</button>
    </div>
  `;
  const content = document.createElement("div");
  content.className = "workbuddy-modal-body";
  content.append(body);
  const footer = document.createElement("div");
  footer.className = "workbuddy-modal-actions";
  actions.forEach((action) => footer.append(action));
  dialog.append(content, footer);
  overlay.append(dialog);
  document.body.append(overlay);

  const focusableSelector = [
    "button:not([disabled])",
    "input:not([disabled])",
    "textarea:not([disabled])",
    "select:not([disabled])",
    "a[href]",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  const onKeyDown = (event) => {
    if (event.key === "Escape" && document.body.contains(overlay)) {
      event.preventDefault();
      close();
    }
    if (event.key === "Tab" && document.body.contains(overlay)) {
      const focusable = [...overlay.querySelectorAll(focusableSelector)].filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeyDown);
    overlay.remove();
    onClose?.();
  };
  overlay.querySelector("[data-modal-close]").addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener("keydown", onKeyDown);
  requestAnimationFrame(() => {
    const target = initialFocusSelector ? overlay.querySelector(initialFocusSelector) : overlay.querySelector(focusableSelector);
    target?.focus();
  });
  return { overlay, close };
}

function confirmDangerAction({ title, message, confirmText = "确认" }) {
  return new Promise((resolve) => {
    let resolved = false;
    const body = document.createElement("div");
    body.className = "workbuddy-confirm-body";
    body.textContent = message;
    const cancel = document.createElement("button");
    cancel.className = "cancel-button";
    cancel.type = "button";
    cancel.textContent = "取消";
    const confirm = document.createElement("button");
    confirm.className = "danger-button";
    confirm.type = "button";
    confirm.textContent = confirmText;
    let modal;
    const resolveWith = (value) => {
      if (resolved) return;
      resolved = true;
      modal.close();
      resolve(value);
    };
    modal = openWorkbuddyModal({
      title,
      body,
      actions: [cancel, confirm],
      initialFocusSelector: ".cancel-button",
      onClose: () => {
        if (resolved) return;
        resolved = true;
        resolve(false);
      },
    });
    cancel.addEventListener("click", () => resolveWith(false));
    confirm.addEventListener("click", () => resolveWith(true));
  });
}

function updateEnglishGroup(groupId, updates) {
  state.english.groups = state.english.groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      : group,
  );
  saveEnglish();
  render();
}

function addEnglishGroupWord(groupId) {
  const group = state.english.groups.find((item) => item.id === groupId);
  if (!group) return;
  openEnglishGroupWordModal(group);
}

function editEnglishGroupWord(groupId, wordId) {
  const group = state.english.groups.find((item) => item.id === groupId);
  const entry = group?.words.find((word) => word.id === wordId);
  if (!group || !entry) return;
  openEnglishGroupWordModal(group, entry);
}

function openEnglishGroupWordModal(group, entry = null) {
  const isEditing = Boolean(entry);
  const form = document.createElement("form");
  form.className = "english-group-word-modal-form";
  form.innerHTML = `
    <label class="date-field">
      <span>英文单词</span>
      <input name="word" type="text" maxlength="40" value="${escapeHtml(entry?.word || "")}" required />
    </label>
    <label class="date-field">
      <span>词性</span>
      <input name="partSpeech" type="text" maxlength="24" value="${escapeHtml(entry?.partSpeech || group.defaultPartSpeech || "")}" />
    </label>
    <label class="date-field">
      <span>中文释义</span>
      <input name="translation" type="text" maxlength="80" value="${escapeHtml(entry?.translation || "")}" />
    </label>
    <label class="date-field english-group-word-modal-note">
      <span>单词备注</span>
      <textarea name="note" maxlength="240">${escapeHtml(entry?.note || "")}</textarea>
    </label>
  `;
  const cancel = document.createElement("button");
  cancel.className = "cancel-button";
  cancel.type = "button";
  cancel.textContent = "取消";
  const save = document.createElement("button");
  save.className = "primary-button";
  save.type = "submit";
  save.textContent = "保存";
  const modal = openWorkbuddyModal({
    title: isEditing ? "修改单词" : "添加单词",
    body: form,
    actions: [cancel, save],
    initialFocusSelector: 'input[name="word"]',
  });
  cancel.addEventListener("click", modal.close);
  save.addEventListener("click", () => form.requestSubmit());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const word = form.elements.word.value.trim();
    if (!word) return;
    const nextEntry = {
      id: entry?.id || createId(),
      word,
      partSpeech: form.elements.partSpeech.value.trim(),
      translation: form.elements.translation.value.trim(),
      note: form.elements.note.value.trim(),
    };
    const words = isEditing
      ? group.words.map((item) => (item.id === entry.id ? nextEntry : item))
      : [...group.words, nextEntry];
    modal.close();
    updateEnglishGroup(group.id, { words });
  });
}

async function deleteEnglishGroup(groupId) {
  const confirmed = await confirmDangerAction({
    title: "删除词组",
    message: "删除这个词组会同时删除它下面的单词记录。",
    confirmText: "删除",
  });
  if (!confirmed) return;
  state.english.groups = state.english.groups.filter((item) => item.id !== groupId);
  saveEnglish();
  render();
}

async function deleteEnglishGroupWord(groupId, wordId) {
  const group = state.english.groups.find((item) => item.id === groupId);
  if (!group) return;
  const confirmed = await confirmDangerAction({
    title: "删除单词",
    message: "删除后这个单词会从当前词组中移除。",
    confirmText: "删除",
  });
  if (!confirmed) return;
  updateEnglishGroup(groupId, {
    words: group.words.filter((word) => word.id !== wordId),
  });
}

function createEnglishEmptyCard(text) {
  const card = document.createElement("div");
  card.className = "english-empty-card";
  card.textContent = text;
  return card;
}

function renderShoppingShell() {
  const shell = document.createElement("div");
  shell.className = "shopping-shell";
  shell.append(createShoppingPanel());
  elements.taskList.append(shell);
}

function createShoppingPanel() {
  const panel = document.createElement("section");
  panel.className = "shopping-panel";
  const workspace = document.createElement("div");
  workspace.className = "shopping-workspace";
  const productArea = document.createElement("div");
  productArea.className = "shopping-product-area";
  productArea.append(createShoppingControls());
  productArea.append(createShoppingProductForm());

  const products = shoppingVisibleProducts();
  if (state.shoppingSearch) {
    productArea.append(createShoppingSearchResults(products));
  } else if (!products.length) {
    productArea.append(createShoppingEmptyCard("这里暂时没有商品。先新建分类，再添加商品。"));
  } else {
    const list = document.createElement("div");
    list.className = "shopping-product-list";
    products.forEach((product) => list.append(createShoppingProductCard(product)));
    productArea.append(list);
  }

  workspace.append(createShoppingCategorySidebar(), productArea);
  panel.append(workspace);
  return panel;
}

function createShoppingCategorySidebar() {
  const sidebar = document.createElement("aside");
  sidebar.className = "shopping-category-sidebar";
  sidebar.append(createShoppingCategoryTabs());
  sidebar.append(createShoppingSubcategoryTabs());
  return sidebar;
}

function createShoppingCategoryTabs() {
  const section = document.createElement("div");
  section.className = "shopping-category-section shopping-primary-categories";
  const heading = document.createElement("div");
  heading.className = "shopping-category-heading";
  heading.textContent = "一级分类";
  const tabs = document.createElement("div");
  tabs.className = "shopping-tabs";
  tabs.append(createShoppingTab("全部", state.shopping.products.length, state.shoppingCategoryId === "all", () => {
    state.shoppingCategoryId = "all";
    state.shoppingSubcategoryId = "all";
    state.shoppingHighlightedProductId = null;
    render();
  }));
  sortedShoppingCategories().forEach((category) => {
    tabs.append(createShoppingTab(category.name, shoppingCategoryProductCount(category.id), state.shoppingCategoryId === category.id, () => {
      state.shoppingCategoryId = category.id;
      state.shoppingSubcategoryId = "all";
      state.shoppingHighlightedProductId = null;
      render();
    }, {
      sortKey: { kind: "shopping-category", id: category.id },
      onRename: () => renameShoppingCategory(category.id),
      onDelete: () => deleteShoppingCategory(category.id),
    }));
  });
  section.append(heading, tabs, createShoppingCategoryForm());
  return section;
}

function createShoppingSubcategoryTabs() {
  const section = document.createElement("div");
  section.className = "shopping-category-section shopping-subcategory-bar";
  const heading = document.createElement("div");
  heading.className = "shopping-category-heading";
  heading.textContent = "二级分类";
  section.append(heading);
  if (state.shoppingCategoryId === "all") {
    const note = document.createElement("div");
    note.className = "shopping-inline-note";
    note.textContent = "选择一级分类后管理二级分类。";
    section.append(note);
    return section;
  }

  const tabs = document.createElement("div");
  tabs.className = "shopping-tabs";
  tabs.append(createShoppingTab("全部", shoppingCategoryProductCount(state.shoppingCategoryId), state.shoppingSubcategoryId === "all", () => {
    state.shoppingSubcategoryId = "all";
    state.shoppingHighlightedProductId = null;
    render();
  }));
  shoppingSubcategoriesFor(state.shoppingCategoryId).forEach((subcategory) => {
    tabs.append(createShoppingTab(subcategory.name, shoppingSubcategoryProductCount(subcategory.id), state.shoppingSubcategoryId === subcategory.id, () => {
      state.shoppingSubcategoryId = subcategory.id;
      state.shoppingHighlightedProductId = null;
      render();
    }, {
      sortKey: { kind: "shopping-subcategory", categoryId: state.shoppingCategoryId, id: subcategory.id },
      onRename: () => renameShoppingSubcategory(subcategory.id),
      onDelete: () => deleteShoppingSubcategory(subcategory.id),
    }));
  });
  section.append(tabs, createShoppingSubcategoryForm(state.shoppingCategoryId));
  return section;
}

function createShoppingTab(label, count, active, onClick, actions = {}) {
  const wrap = document.createElement("div");
  wrap.className = `shopping-tab-wrap${active ? " is-active" : ""}`;
  const button = document.createElement("button");
  button.className = "shopping-tab";
  button.type = "button";
  button.innerHTML = `
    <span class="shopping-tab-name">${escapeHtml(label)}</span>
    <span class="shopping-tab-count">${count}</span>
  `;
  button.addEventListener("click", onClick);
  wrap.append(button);
  if (actions.sortKey) {
    setupShoppingTabSortable(wrap, button, actions.sortKey);
  }
  if (actions.onRename || actions.onDelete) {
    const actionWrap = document.createElement("div");
    actionWrap.className = "shopping-tab-actions";
    if (actions.onRename) {
      const rename = document.createElement("button");
      rename.type = "button";
      rename.title = "重命名";
      rename.setAttribute("aria-label", "重命名");
      rename.textContent = "✎";
      rename.addEventListener("click", actions.onRename);
      actionWrap.append(rename);
    }
    if (actions.onDelete) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.title = "删除";
      remove.setAttribute("aria-label", "删除");
      remove.textContent = "×";
      remove.addEventListener("click", actions.onDelete);
      actionWrap.append(remove);
    }
    wrap.append(actionWrap);
  }
  return wrap;
}

function createShoppingCategoryForm() {
  const form = document.createElement("form");
  form.className = "shopping-inline-form";
  form.innerHTML = `
    <input name="name" type="text" maxlength="30" placeholder="新建一级分类" />
    <button class="save-button" type="submit">添加</button>
  `;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    if (!name) return;
    addShoppingCategory(name);
  });
  return form;
}

function createShoppingSubcategoryForm(categoryId) {
  const form = document.createElement("form");
  form.className = "shopping-inline-form";
  form.innerHTML = `
    <input name="name" type="text" maxlength="30" placeholder="新建二级分类" />
    <button class="save-button" type="submit">添加</button>
  `;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    if (!name) return;
    addShoppingSubcategory(categoryId, name);
  });
  return form;
}

function createShoppingControls() {
  const controls = document.createElement("div");
  controls.className = "shopping-list-toolbar";
  controls.innerHTML = `
    <input type="search" placeholder="搜索商品、本次名称、平台、国标或备注" value="${escapeHtml(state.shoppingSearch)}" />
    <label class="select-field">
      <span>排序</span>
      <select aria-label="商品排序">
        <option value="custom"${state.shoppingSort === "custom" ? " selected" : ""}>手动</option>
        <option value="name"${state.shoppingSort === "name" ? " selected" : ""}>名称顺序</option>
      </select>
    </label>
    <button class="save-button" type="button" data-action="export-shopping">导出</button>
  `;
  controls.querySelector('input[type="search"]').addEventListener("input", (event) => {
    state.shoppingSearch = event.target.value.trim();
    state.shoppingHighlightedProductId = null;
    renderList();
  });
  controls.querySelector("select").addEventListener("change", (event) => {
    state.shoppingSort = event.target.value;
    render();
  });
  controls.querySelector('[data-action="export-shopping"]').addEventListener("click", openShoppingExportModal);
  return controls;
}

function createShoppingProductForm() {
  const form = document.createElement("form");
  form.className = "shopping-product-form";
  const categories = sortedShoppingCategories();
  if (!categories.length) {
    form.innerHTML = `<div class="shopping-inline-note">先新建一级分类，再添加商品。</div>`;
    return form;
  }

  const selectedCategoryId = state.shoppingCategoryId !== "all" ? state.shoppingCategoryId : categories[0].id;
  form.innerHTML = `
    <input name="name" type="text" maxlength="80" placeholder="添加商品" required />
    <label class="select-field">
      <span>一级</span>
      <select name="categoryId" aria-label="一级分类">
        ${categories
          .map((category) => `<option value="${escapeHtml(category.id)}"${category.id === selectedCategoryId ? " selected" : ""}>${escapeHtml(category.name)}</option>`)
          .join("")}
      </select>
    </label>
    <label class="select-field">
      <span>二级</span>
      <select name="subcategoryId" aria-label="二级分类"></select>
    </label>
    <input name="unit" type="text" maxlength="16" placeholder="数量单位" />
    <button class="primary-button" type="submit">添加商品</button>
  `;
  const categorySelect = form.elements.categoryId;
  const subcategorySelect = form.elements.subcategoryId;
  const renderSubcategoryOptions = () => {
    const subcategories = shoppingSubcategoriesFor(categorySelect.value);
    subcategorySelect.innerHTML = `<option value="">不选</option>${subcategories
      .map((subcategory) => `<option value="${escapeHtml(subcategory.id)}">${escapeHtml(subcategory.name)}</option>`)
      .join("")}`;
    if (state.shoppingSubcategoryId !== "all" && subcategories.some((item) => item.id === state.shoppingSubcategoryId)) {
      subcategorySelect.value = state.shoppingSubcategoryId;
    }
  };
  categorySelect.addEventListener("change", renderSubcategoryOptions);
  renderSubcategoryOptions();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    if (!name) return;
    addShoppingProduct({
      name,
      categoryId: form.elements.categoryId.value,
      subcategoryId: form.elements.subcategoryId.value || null,
      unit: form.elements.unit.value.trim(),
    });
  });
  return form;
}

function createShoppingSearchResults(products) {
  const section = document.createElement("div");
  section.className = "shopping-search-results";
  const heading = document.createElement("div");
  heading.className = "shopping-subheading";
  heading.textContent = `搜索结果 ${products.length}`;
  section.append(heading);
  if (!products.length) {
    section.append(createShoppingEmptyCard("没有找到匹配商品。"));
    return section;
  }
  products.forEach((product) => section.append(createShoppingSearchRow(product)));
  return section;
}

function createShoppingSearchRow(product) {
  const row = document.createElement("button");
  row.className = "shopping-search-row";
  row.type = "button";
  row.innerHTML = `
    <strong>${escapeHtml(product.name)}</strong>
    <span>${escapeHtml(shoppingProductPath(product))}</span>
    <span>${escapeHtml(shoppingBestPriceText(product))}</span>
  `;
  row.addEventListener("click", () => {
    state.shoppingCategoryId = product.categoryId;
    state.shoppingSubcategoryId = product.subcategoryId || "all";
    state.shoppingExpandedProductId = product.id;
    state.shoppingHighlightedProductId = product.id;
    state.shoppingSearch = "";
    render();
  });
  return row;
}

function createShoppingProductCard(product) {
  const expanded = state.shoppingExpandedProductId === product.id;
  const highlighted = state.shoppingHighlightedProductId === product.id;
  const card = document.createElement("article");
  card.className = `shopping-product-card${expanded ? " is-expanded" : ""}${highlighted ? " is-highlighted" : ""}`;
  card.innerHTML = `
    <div class="shopping-product-head">
      <div class="task-body">
        <h3>${escapeHtml(product.name)}</h3>
        <div class="task-meta">${escapeHtml(shoppingBestPriceText(product))}</div>
      </div>
      <div class="task-actions">
        ${state.shoppingSort === "custom" && !state.shoppingSearch ? dragHandleHtml() : ""}
        <button class="icon-button small expand-button${expanded ? " is-expanded" : ""}" type="button" data-action="expand" title="${expanded ? "收起" : "展开"}" aria-label="${expanded ? "收起" : "展开"}">▸</button>
        <button class="icon-button small" type="button" data-action="rename" title="修改商品名" aria-label="修改商品名">✎</button>
        <button class="icon-button small" type="button" data-action="delete" title="删除商品" aria-label="删除商品">×</button>
      </div>
    </div>
  `;
  card.querySelector('[data-action="expand"]').addEventListener("click", () => {
    state.shoppingExpandedProductId = expanded ? null : product.id;
    state.shoppingHighlightedProductId = null;
    render();
  });
  card.querySelector('[data-action="rename"]').addEventListener("click", () => renameShoppingProduct(product.id));
  card.querySelector('[data-action="delete"]').addEventListener("click", () => deleteShoppingProduct(product.id));
  setupShoppingProductSortable(card, product.id);

  if (expanded) {
    card.append(createShoppingProductDetail(product));
  }
  return card;
}

function createShoppingProductDetail(product) {
  const detail = document.createElement("div");
  detail.className = "shopping-product-detail";
  detail.append(createShoppingUnitForm(product));
  detail.append(createShoppingRecordForm(product));
  detail.append(createShoppingRecordList(product));
  return detail;
}

function createShoppingUnitForm(product) {
  const form = document.createElement("form");
  form.className = "shopping-unit-form";
  form.innerHTML = `
    <label class="date-field">
      <span>数量单位</span>
      <input name="unit" type="text" maxlength="16" value="${escapeHtml(product.unit)}" />
    </label>
    <button class="save-button" type="submit">保存单位</button>
  `;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    updateShoppingProduct(product.id, { unit: form.elements.unit.value.trim() });
  });
  return form;
}

function createShoppingRecordForm(product) {
  const form = document.createElement("form");
  form.className = "shopping-record-form";
  form.innerHTML = `
    <input name="date" type="date" value="${state.selectedDate}" required />
    <input name="name" type="text" maxlength="80" placeholder="本次名称" required />
    <label class="select-field">
      <span>平台</span>
      <select name="platform" aria-label="平台" required>
        ${shoppingPlatformOptions()}
      </select>
    </label>
    <label class="date-field">
      <span>总价</span>
      <input name="totalPrice" type="number" min="0" step="0.01" required />
    </label>
    <label class="date-field">
      <span>数量</span>
      <input name="quantity" type="number" min="0" step="0.01" required />
    </label>
    <label class="date-field shopping-standard-field">
      <span>GB/T</span>
      <input name="standardCode" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="24" placeholder="国标号" />
    </label>
    <input name="note" type="text" maxlength="80" placeholder="备注" />
    <button class="primary-button" type="submit">添加记录</button>
  `;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const totalPrice = normalizeMoneyInput(form.elements.totalPrice.value);
    const quantity = normalizeMoneyInput(form.elements.quantity.value);
    const platform = form.elements.platform.value.trim();
    const name = form.elements.name.value.trim();
    if (!name || !shoppingPlatforms.includes(platform) || totalPrice === null || quantity === null || quantity <= 0) return;
    addShoppingRecord(product.id, {
      date: form.elements.date.value || state.selectedDate,
      name,
      platform,
      totalPrice,
      quantity,
      standardCode: normalizeShoppingStandardCode(form.elements.standardCode.value),
      note: form.elements.note.value.trim(),
    });
  });
  return form;
}

function createShoppingRecordList(product) {
  const list = document.createElement("div");
  list.className = "shopping-record-list";
  if (!product.records.length) {
    list.append(createShoppingEmptyCard("还没有购买记录。"));
    return list;
  }
  sortedShoppingRecords(product).forEach((record) => list.append(createShoppingRecordRow(product, record)));
  return list;
}

function createShoppingRecordRow(product, record) {
  const row = document.createElement("div");
  row.className = "shopping-record-row";
  const unitPrice = shoppingUnitPrice(record);
  const unit = product.unit ? ` ${escapeHtml(product.unit)}` : "";
  const recordName = shoppingRecordName(product, record);
  const standardText = shoppingRecordStandardText(record);
  row.innerHTML = `
    <div>
      <strong>${escapeHtml(formatTaskDate(record.date))} · ${escapeHtml(recordName)} · ${escapeHtml(record.platform)}</strong>
      <span>总价 ${formatMoney(record.totalPrice)} 元 · 数量 ${formatQuantity(record.quantity)}${unit} · 单价 ${formatUnitPrice(unitPrice)} 元${product.unit ? `/${escapeHtml(product.unit)}` : ""}</span>
      ${standardText ? `<span>${escapeHtml(standardText)}</span>` : ""}
      ${record.note ? `<span>${escapeHtml(record.note)}</span>` : ""}
    </div>
    <div class="task-actions">
      <button class="icon-button small" type="button" data-action="edit" title="修改记录" aria-label="修改记录">✎</button>
      <button class="icon-button small" type="button" data-action="delete" title="删除记录" aria-label="删除记录">×</button>
    </div>
  `;
  row.querySelector('[data-action="edit"]').addEventListener("click", () => editShoppingRecord(product.id, record.id));
  row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteShoppingRecord(product.id, record.id));
  return row;
}

function createShoppingEmptyCard(text) {
  const card = document.createElement("div");
  card.className = "shopping-empty-card";
  card.textContent = text;
  return card;
}

function openShoppingExportModal() {
  const body = document.createElement("div");
  body.className = "shopping-export-modal";
  body.innerHTML = `
    <div class="shopping-export-options" role="radiogroup" aria-label="导出范围">
      <label><input type="radio" name="shoppingExportScope" value="all" checked /> 全部商品</label>
      <label><input type="radio" name="shoppingExportScope" value="current" /> 当前视图</label>
      <label><input type="radio" name="shoppingExportScope" value="custom" /> 自定义范围</label>
    </div>
    <div class="shopping-export-tree" hidden></div>
    <div class="shopping-export-summary" aria-live="polite"></div>
  `;
  const tree = body.querySelector(".shopping-export-tree");
  const summary = body.querySelector(".shopping-export-summary");
  tree.append(createShoppingExportTree());
  const cancel = document.createElement("button");
  cancel.className = "cancel-button";
  cancel.type = "button";
  cancel.textContent = "取消";
  const exportButton = document.createElement("button");
  exportButton.className = "primary-button";
  exportButton.type = "button";
  exportButton.textContent = "导出 Excel";

  const selectedScope = () => body.querySelector('input[name="shoppingExportScope"]:checked')?.value || "all";
  const selectedProducts = () => shoppingProductsForExport(selectedScope(), collectShoppingExportSelection(body));
  const updateSummary = () => {
    const scope = selectedScope();
    tree.hidden = scope !== "custom";
    const products = selectedProducts();
    const recordCount = products.reduce((sum, product) => sum + product.records.length, 0);
    summary.textContent = `将导出 ${products.length} 个商品词条、${recordCount} 条购买记录。`;
    exportButton.disabled = !products.length;
  };

  body.querySelectorAll('input[name="shoppingExportScope"]').forEach((input) => input.addEventListener("change", updateSummary));
  setupShoppingExportTreeInteractions(tree, updateSummary);
  const modal = openWorkbuddyModal({
    title: "导出商品比价",
    body,
    actions: [cancel, exportButton],
    initialFocusSelector: 'input[name="shoppingExportScope"]',
  });
  cancel.addEventListener("click", modal.close);
  exportButton.addEventListener("click", async () => {
    const scope = selectedScope();
    const products = selectedProducts();
    if (!products.length) return;
    const exportedAt = new Date();
    const filename = `Workbuddy商品比价-${formatFileStamp(exportedAt)}.xlsx`;
    const blob = createShoppingWorkbookBlob(products, {
      exportedAt,
      scopeLabel: shoppingExportScopeLabel(scope, body),
    });
    modal.close();
    const result = await saveGeneratedFile(blob, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    if (result === "saved") showBackupStatus("已保存商品比价 Excel");
    if (result === "downloaded") showBackupStatus("已下载商品比价 Excel");
    if (result === "cancelled") showBackupStatus("已取消导出");
  });
  updateSummary();
}

function createShoppingExportTree() {
  const wrap = document.createElement("div");
  wrap.className = "shopping-export-category-list";
  if (!state.shopping.categories.length) {
    wrap.textContent = "还没有一级分类。";
    return wrap;
  }
  sortedShoppingCategories().forEach((category) => {
    const categoryProducts = state.shopping.products.filter((product) => product.categoryId === category.id);
    const block = document.createElement("div");
    block.className = "shopping-export-category";
    block.innerHTML = `
      <label class="shopping-export-category-label">
        <input type="checkbox" data-export-category="${escapeHtml(category.id)}" />
        <span>${escapeHtml(category.name)}</span>
        <em>${categoryProducts.length}</em>
      </label>
    `;
    const children = document.createElement("div");
    children.className = "shopping-export-subcategory-list";
    const uncategorizedCount = categoryProducts.filter((product) => !product.subcategoryId).length;
    if (uncategorizedCount) {
      children.append(createShoppingExportChildCheckbox({
        label: "未归入二级分类",
        count: uncategorizedCount,
        attr: "data-export-uncategorized",
        id: category.id,
      }));
    }
    shoppingSubcategoriesFor(category.id).forEach((subcategory) => {
      children.append(createShoppingExportChildCheckbox({
        label: subcategory.name,
        count: shoppingSubcategoryProductCount(subcategory.id),
        attr: "data-export-subcategory",
        id: subcategory.id,
      }));
    });
    block.append(children);
    wrap.append(block);
  });
  return wrap;
}

function createShoppingExportChildCheckbox({ label, count, attr, id }) {
  const child = document.createElement("label");
  child.className = "shopping-export-child";
  child.innerHTML = `
    <input type="checkbox" ${attr}="${escapeHtml(id)}" />
    <span>${escapeHtml(label)}</span>
    <em>${count}</em>
  `;
  return child;
}

function setupShoppingExportTreeInteractions(tree, onChange) {
  tree.querySelectorAll("[data-export-category]").forEach((categoryInput) => {
    const block = categoryInput.closest(".shopping-export-category");
    const childInputs = shoppingExportChildInputs(block);
    categoryInput.addEventListener("change", () => {
      categoryInput.indeterminate = false;
      childInputs.forEach((input) => {
        input.checked = categoryInput.checked;
      });
      onChange();
    });
  });
  tree.querySelectorAll("[data-export-subcategory], [data-export-uncategorized]").forEach((childInput) => {
    childInput.addEventListener("change", () => {
      syncShoppingExportParentState(childInput.closest(".shopping-export-category"));
      onChange();
    });
  });
}

function shoppingExportChildInputs(block) {
  if (!block) return [];
  return [...block.querySelectorAll("[data-export-subcategory], [data-export-uncategorized]")];
}

function syncShoppingExportParentState(block) {
  const parent = block?.querySelector("[data-export-category]");
  if (!parent) return;
  const childInputs = shoppingExportChildInputs(block);
  const checkedCount = childInputs.filter((input) => input.checked).length;
  parent.checked = childInputs.length > 0 && checkedCount === childInputs.length;
  parent.indeterminate = checkedCount > 0 && checkedCount < childInputs.length;
}

function collectShoppingExportSelection(container) {
  return {
    categories: new Set([...container.querySelectorAll("[data-export-category]:checked")].map((input) => input.dataset.exportCategory)),
    subcategories: new Set([...container.querySelectorAll("[data-export-subcategory]:checked")].map((input) => input.dataset.exportSubcategory)),
    uncategorizedCategories: new Set([...container.querySelectorAll("[data-export-uncategorized]:checked")].map((input) => input.dataset.exportUncategorized)),
  };
}

function shoppingProductsForExport(scope, selection) {
  if (scope === "current") return shoppingVisibleProducts();
  if (scope !== "custom") return sortShoppingProducts(state.shopping.products);
  const products = state.shopping.products.filter((product) => {
    if (selection.categories.has(product.categoryId)) return true;
    if (product.subcategoryId && selection.subcategories.has(product.subcategoryId)) return true;
    if (!product.subcategoryId && selection.uncategorizedCategories.has(product.categoryId)) return true;
    return false;
  });
  return sortShoppingProducts(products);
}

function shoppingExportScopeLabel(scope, container) {
  if (scope === "all") return "全部商品";
  if (scope === "current") {
    if (state.shoppingSearch) return `当前搜索：${state.shoppingSearch}`;
    if (state.shoppingCategoryId === "all") return "当前视图：全部商品";
    const category = shoppingCategoryById(state.shoppingCategoryId)?.name || "未知一级分类";
    if (state.shoppingSubcategoryId === "all") return `当前视图：${category}`;
    const subcategory = shoppingSubcategoryById(state.shoppingSubcategoryId)?.name || "未知二级分类";
    return `当前视图：${category} > ${subcategory}`;
  }
  const selection = collectShoppingExportSelection(container);
  const parts = [
    ...[...selection.categories].map((id) => shoppingCategoryById(id)?.name).filter(Boolean),
    ...[...selection.subcategories].map((id) => {
      const subcategory = shoppingSubcategoryById(id);
      if (!subcategory) return "";
      if (selection.categories.has(subcategory.categoryId)) return "";
      const category = shoppingCategoryById(subcategory.categoryId)?.name || "未知一级分类";
      return `${category} > ${subcategory.name}`;
    }).filter(Boolean),
    ...[...selection.uncategorizedCategories].map((id) => {
      if (selection.categories.has(id)) return "";
      const category = shoppingCategoryById(id)?.name;
      return category ? `${category} > 未归入二级分类` : "";
    }).filter(Boolean),
  ];
  return parts.length ? `自定义范围：${parts.join("；")}` : "自定义范围";
}

function renderKnowledgeShell() {
  const shell = document.createElement("div");
  shell.className = "knowledge-shell";

  if (state.knowledgeView === "categories") shell.append(createKnowledgeCategoriesPanel());
  if (state.knowledgeView === "new") shell.append(createKnowledgeEditorPanel());
  if (state.knowledgeView === "import") shell.append(createKnowledgeImportPanel());
  if (state.knowledgeView === "trash") shell.append(createKnowledgeTrashPanel());

  elements.taskList.append(shell);
}

function createKnowledgePanel(title) {
  const panel = document.createElement("section");
  panel.className = "knowledge-panel";
  return panel;
}

function createKnowledgeCategoriesPanel() {
  const panel = createKnowledgePanel("分类");
  const batchActive = state.knowledgeBatch.active;
  const controls = document.createElement("div");
  controls.className = "knowledge-controls";
  controls.innerHTML = `
    ${batchActive ? "" : '<button class="primary-button" type="button" data-action="new-category">新建分类</button>'}
    <input type="search" placeholder="搜索文档" value="${escapeHtml(state.knowledgeSearch)}" />
    <label class="select-field">
      <span>分类排序</span>
      <select data-sort="category" aria-label="分类排序">
        <option value="custom"${state.knowledgeCategorySort === "custom" ? " selected" : ""}>手动</option>
        <option value="az"${state.knowledgeCategorySort === "az" ? " selected" : ""}>名称顺序</option>
      </select>
    </label>
    <label class="select-field">
      <span>文档排序</span>
      <select data-sort="document" aria-label="文档排序">
        <option value="custom"${state.knowledgeDocumentSort === "custom" ? " selected" : ""}>手动</option>
        <option value="az"${state.knowledgeDocumentSort === "az" ? " selected" : ""}>名称顺序</option>
        <option value="updatedAt"${state.knowledgeDocumentSort === "updatedAt" ? " selected" : ""}>修改日期</option>
      </select>
    </label>
    <button class="${batchActive ? "cancel-button" : "save-button"} knowledge-batch-toggle" type="button" data-action="batch-toggle">
      ${batchActive ? "退出批量" : "批量处理"}
    </button>
  `;
  controls.querySelector('[data-action="new-category"]')?.addEventListener("click", () => {
    state.knowledgeCreatingCategory = true;
    render();
  });
  controls.querySelector('input[type="search"]').addEventListener("input", (event) => {
    state.knowledgeSearch = event.target.value.trim();
    renderList();
  });
  controls.querySelector('[data-sort="category"]').addEventListener("change", (event) => {
    state.knowledgeCategorySort = event.target.value;
    renderList();
  });
  controls.querySelector('[data-sort="document"]').addEventListener("change", (event) => {
    state.knowledgeDocumentSort = event.target.value;
    renderList();
  });
  controls.querySelector('[data-action="batch-toggle"]').addEventListener("click", () => {
    toggleKnowledgeBatchMode("categories");
  });
  panel.append(controls);

  if (batchActive) {
    panel.append(createKnowledgeBatchToolbar());
  }

  if (state.knowledgeCreatingCategory) {
    panel.append(createNewKnowledgeCategoryForm());
  }

  if (state.knowledgeSearch) {
    panel.append(createKnowledgeSearchResults());
  }

  const list = document.createElement("div");
  list.className = "knowledge-category-list";
  sortedKnowledgeCategories().forEach((category) => list.append(createKnowledgeCategoryCard(category)));
  panel.append(list);
  return panel;
}

function createNewKnowledgeCategoryForm() {
  const form = document.createElement("form");
  form.className = "knowledge-inline-form";
  form.innerHTML = `
    <input name="name" type="text" maxlength="40" placeholder="分类名称" autocomplete="off" />
    <button class="save-button" type="submit">确认新建</button>
    <button class="cancel-button" type="button">取消新建</button>
  `;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    createKnowledgeCategory(form.elements.name.value.trim() || "新建文件夹");
  });
  form.querySelector(".cancel-button").addEventListener("click", () => {
    state.knowledgeCreatingCategory = false;
    render();
  });
  return form;
}

function createKnowledgeSearchResults() {
  const results = activeKnowledgeDocuments().filter((doc) => {
    const keyword = state.knowledgeSearch.toLowerCase();
    const categoryNames = doc.categoryIds.map((id) => knowledgeCategoryName(id)).join(" ");
    return `${doc.title} ${doc.content} ${categoryNames}`.toLowerCase().includes(keyword);
  });
  const section = document.createElement("div");
  section.className = "knowledge-search-results";
  const heading = document.createElement("div");
  heading.className = "knowledge-subheading";
  heading.textContent = `搜索结果 ${results.length}`;
  section.append(heading);
  if (!results.length) {
    section.append(createKnowledgeEmptyCard("没有找到匹配文档。"));
    return section;
  }
  const list = document.createElement("div");
  list.className = "knowledge-document-list";
  results.sort(sortKnowledgeDocuments).forEach((doc) => list.append(createKnowledgeDocumentRow(doc, null, { fromSearch: true })));
  section.append(list);
  return section;
}

function createKnowledgeCategoryCard(category) {
  const isDefault = category.id === "uncategorized";
  const docs = documentsForCategory(category.id);
  const expanded = state.expandedKnowledgeCategories.has(category.id);
  const card = document.createElement("article");
  card.className = `knowledge-category-card${state.knowledgeBatch.active ? " is-batch" : ""}${
    state.knowledgeBatch.selectedCategories.has(category.id) ? " is-selected" : ""
  }`;
  card.innerHTML = `
    <div class="knowledge-category-head">
      ${state.knowledgeBatch.active ? knowledgeSelectionHtml("category", category.id, "选择分类") : ""}
      <button class="expand-button${expanded ? " is-expanded" : ""}" type="button" title="展开" aria-label="展开">›</button>
      <div>
        <h3>${escapeHtml(category.name)}</h3>
        <span>${docs.length} 篇文档</span>
      </div>
      <div class="knowledge-actions">
        ${
          !state.knowledgeBatch.active && state.knowledgeCategorySort === "custom"
            ? dragHandleHtml()
            : ""
        }
        ${state.knowledgeBatch.active ? "" : '<button class="icon-button small" type="button" data-action="new-doc" title="新建文档" aria-label="新建文档">＋</button>'}
        ${state.knowledgeBatch.active ? "" : '<button class="icon-button small" type="button" data-action="rename" title="重命名" aria-label="重命名">✎</button>'}
        ${state.knowledgeBatch.active ? "" : '<button class="icon-button small" type="button" data-action="export" title="导出" aria-label="导出">⇩</button>'}
        ${isDefault || state.knowledgeBatch.active ? "" : '<button class="icon-button small" type="button" data-action="delete" title="删除" aria-label="删除">×</button>'}
      </div>
    </div>
  `;

  card.querySelector(".expand-button").addEventListener("click", () => toggleKnowledgeCategory(category.id));
  card.querySelector('[data-action="new-doc"]')?.addEventListener("click", () => openKnowledgeEditor({ categoryIds: [category.id] }));
  card.querySelector('[data-action="export"]')?.addEventListener("click", () => exportKnowledgeCategory(category.id));
  card.querySelector('[data-action="rename"]')?.addEventListener("click", () => renameKnowledgeCategory(category.id));
  card.querySelector('[data-action="delete"]')?.addEventListener("click", () => deleteKnowledgeCategory(category.id));
  bindKnowledgeSelection(card, "category", category.id);
  setupKnowledgeDraggableElement(card, { kind: "category", id: category.id });

  if (expanded) {
    const list = document.createElement("div");
    list.className = "knowledge-document-list";
    if (!docs.length) {
      list.append(createKnowledgeEmptyCard("这个分类里还没有文档。"));
    } else {
      docs.forEach((doc) => list.append(createKnowledgeDocumentRow(doc, category.id)));
    }
    card.append(list);
  }
  return card;
}

function createKnowledgeDocumentRow(doc, categoryId = null, options = {}) {
  const row = document.createElement("article");
  row.className = `knowledge-document-row${state.knowledgeBatch.active ? " is-batch" : ""}${
    state.knowledgeBatch.selectedDocuments.has(doc.id) ? " is-selected" : ""
  }`;
  row.innerHTML = `
    ${state.knowledgeBatch.active ? knowledgeSelectionHtml("document", doc.id, "选择文档") : ""}
    <button class="knowledge-document-title" type="button">
      <strong>${escapeHtml(doc.title || "未命名文档")}</strong>
      <span>${escapeHtml(options.fromSearch ? `${doc.categoryIds.map((id) => knowledgeCategoryName(id)).join("、")} · ` : "")}${formatKnowledgeTime(
        doc.updatedAt || doc.createdAt,
      )}</span>
    </button>
      <div class="knowledge-actions">
       ${
        !state.knowledgeBatch.active && categoryId && state.knowledgeDocumentSort === "custom"
          ? dragHandleHtml()
          : ""
      }
      ${state.knowledgeBatch.active ? "" : '<button class="icon-button small" type="button" data-action="rename" title="重命名" aria-label="重命名">✎</button>'}
      ${state.knowledgeBatch.active ? "" : '<button class="icon-button small" type="button" data-action="classify" title="归类" aria-label="归类">▣</button>'}
      ${state.knowledgeBatch.active ? "" : '<button class="icon-button small" type="button" data-action="export" title="导出" aria-label="导出">⇩</button>'}
      ${state.knowledgeBatch.active ? "" : '<button class="icon-button small" type="button" data-action="delete" title="删除" aria-label="删除">×</button>'}
    </div>
  `;
  row.querySelector(".knowledge-document-title").addEventListener("click", () => openKnowledgeEditor({ documentId: doc.id }));
  row.querySelector('[data-action="rename"]')?.addEventListener("click", () => renameKnowledgeDocument(doc.id));
  row.querySelector('[data-action="classify"]')?.addEventListener("click", () => {
    state.knowledgeClassifyingDocumentId = state.knowledgeClassifyingDocumentId === doc.id ? null : doc.id;
    renderList();
  });
  row.querySelector('[data-action="export"]')?.addEventListener("click", () => exportKnowledgeDocument(doc.id));
  row.querySelector('[data-action="delete"]')?.addEventListener("click", () => deleteKnowledgeDocument(doc.id));
  bindKnowledgeSelection(row, "document", doc.id);
  setupKnowledgeDraggableElement(row, { kind: "document", id: doc.id, categoryId });

  if (state.knowledgeClassifyingDocumentId === doc.id) {
    row.append(createKnowledgeClassifyForm(doc));
  }
  return row;
}

function createKnowledgeClassifyForm(doc) {
  const form = document.createElement("form");
  form.className = "knowledge-classify-form";
  form.append(createKnowledgeCategoryMultiSelect(doc.categoryIds));
  const actions = document.createElement("div");
  actions.className = "knowledge-form-actions";
  actions.innerHTML = `
    <button class="save-button" type="submit">保存归类</button>
    <button class="cancel-button" type="button">取消</button>
  `;
  form.append(actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const categoryIds = Array.from(form.querySelectorAll('input[name="category"]:checked')).map((input) => input.value);
    updateKnowledgeDocumentCategories(doc.id, categoryIds);
  });
  form.querySelector(".cancel-button").addEventListener("click", () => {
    state.knowledgeClassifyingDocumentId = null;
    renderList();
  });
  return form;
}

function createKnowledgeEditorPanel() {
  if (!state.knowledgeEditor) {
    state.knowledgeEditor = createKnowledgeEditorDraft();
  }
  const editor = state.knowledgeEditor;
  const mode = state.knowledgeEditorMode === "preview" ? "preview" : "edit";
  const panel = createKnowledgePanel(editor.documentId ? "编辑文档" : "新建文档");
  const form = document.createElement("form");
  form.className = `knowledge-editor is-${mode}`;
  form.innerHTML = `
    <div class="knowledge-editor-status">
      <strong>${editor.documentId ? "编辑文档" : "新建文档"}</strong>
      <span>${editor.documentId ? "正在修改已有文档" : "保存后会生成一篇新文档"}</span>
    </div>
    <input name="title" type="text" maxlength="80" placeholder="文档标题" value="${escapeHtml(editor.title)}" autocomplete="off" />
    <div class="knowledge-editor-tabs" role="tablist" aria-label="文档模式">
      <button class="${mode === "edit" ? "is-active" : ""}" type="button" data-editor-mode="edit">编辑</button>
      <button class="${mode === "preview" ? "is-active" : ""}" type="button" data-editor-mode="preview">预览</button>
    </div>
    <textarea name="content" placeholder="用 Markdown 记录内容"${mode === "preview" ? " hidden" : ""}>${escapeHtml(editor.content)}</textarea>
    <div class="knowledge-markdown-preview"${mode === "edit" ? " hidden" : ""}>${renderMarkdownPreview(editor.content)}</div>
    <div class="knowledge-form-actions">
      <button class="save-button" type="submit">保存</button>
      <button class="cancel-button" type="button">取消</button>
    </div>
  `;
  form.querySelector(".knowledge-editor-tabs").before(createKnowledgeCategoryMultiSelect(editor.categoryIds));
  form.querySelectorAll("[data-editor-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      syncKnowledgeEditorDraft(form);
      state.knowledgeEditorMode = button.dataset.editorMode;
      renderList();
    });
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveKnowledgeEditor(form);
  });
  form.querySelector(".cancel-button").addEventListener("click", () => {
    state.knowledgeEditor = null;
    state.knowledgeEditorMode = "edit";
    state.knowledgeView = "categories";
    render();
  });
  panel.append(form);
  return panel;
}

function createKnowledgeCategoryMultiSelect(selectedIds = []) {
  const selected = new Set(selectedIds);
  const wrapper = document.createElement("div");
  wrapper.className = "knowledge-multi-select";

  const title = document.createElement("div");
  title.className = "knowledge-multi-title";
  title.textContent = "归类到文件夹";

  const trigger = document.createElement("button");
  trigger.className = "knowledge-multi-trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-label", "选择文件夹");
  trigger.setAttribute("aria-expanded", "false");
  trigger.innerHTML = `
    <span class="knowledge-multi-summary"></span>
    <span class="knowledge-multi-arrow" aria-hidden="true">⌄</span>
  `;

  const dropdown = document.createElement("div");
  dropdown.className = "knowledge-multi-dropdown";
  dropdown.hidden = true;

  const updateTrigger = () => {
    const checked = Array.from(dropdown.querySelectorAll('input[name="category"]:checked'));
    const names = checked.map((input) => knowledgeCategoryName(input.value));
    const summary = trigger.querySelector(".knowledge-multi-summary");
    if (!names.length) {
      summary.textContent = "默认：未分类";
      trigger.title = "未选择分类时会保存到未分类";
      return;
    }
    const preview = names.slice(0, 2).join("、");
    summary.textContent = names.length > 2 ? `${preview} 等 ${names.length} 个` : preview;
    trigger.title = names.join("、");
  };

  sortedKnowledgeCategories().forEach((category) => {
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" name="category" value="${escapeHtml(category.id)}"${selected.has(category.id) ? " checked" : ""} />
      <span>${escapeHtml(category.name)}</span>
    `;
    label.querySelector("input").addEventListener("change", updateTrigger);
    dropdown.append(label);
  });

  trigger.addEventListener("click", () => {
    dropdown.hidden = !dropdown.hidden;
    trigger.setAttribute("aria-expanded", String(!dropdown.hidden));
  });

  wrapper.append(title, trigger, dropdown);
  updateTrigger();
  return wrapper;
}

function createKnowledgeImportPanel() {
  const panel = createKnowledgePanel("导入");
  const box = document.createElement("div");
  box.className = "knowledge-import-box";
  box.innerHTML = `
    <button class="primary-button" type="button">选择文件</button>
  `;
  box.querySelector("button").addEventListener("click", () => elements.knowledgeImportInput.click());
  panel.append(box);
  return panel;
}

function createKnowledgeTrashPanel() {
  const panel = createKnowledgePanel("回收站");
  const controls = document.createElement("div");
  controls.className = "knowledge-controls";
  controls.innerHTML = `
    <button class="${state.knowledgeBatch.trashActive ? "cancel-button" : "save-button"} knowledge-batch-toggle" type="button" data-action="trash-batch-toggle">
      ${state.knowledgeBatch.trashActive ? "退出批量" : "批量处理"}
    </button>
  `;
  controls.querySelector('[data-action="trash-batch-toggle"]').addEventListener("click", () => toggleKnowledgeBatchMode("trash"));
  panel.append(controls);

  if (state.knowledgeBatch.trashActive) {
    panel.append(createKnowledgeTrashBatchToolbar());
  }

  if (!state.knowledge.trash.length) {
    panel.append(createKnowledgeEmptyCard("回收站是空的。"));
    return panel;
  }
  const list = document.createElement("div");
  list.className = "knowledge-trash-list";
  state.knowledge.trash.forEach((item) => list.append(createKnowledgeTrashRow(item)));
  panel.append(list);
  return panel;
}

function createKnowledgeTrashRow(item) {
  const row = document.createElement("article");
  row.className = `knowledge-trash-row${state.knowledgeBatch.trashActive ? " is-batch" : ""}${
    state.knowledgeBatch.selectedTrash.has(item.id) ? " is-selected" : ""
  }`;
  const title = item.type === "category" ? item.category?.name || "已删除分类" : item.document?.title || "已删除文档";
  const meta =
    item.type === "category"
      ? `分类 · ${Array.isArray(item.documents) ? item.documents.length : 0} 篇文档`
      : `文档 · ${formatKnowledgeTime(item.deletedAt)}`;
  row.innerHTML = `
    ${state.knowledgeBatch.trashActive ? knowledgeSelectionHtml("trash", item.id, "选择回收站条目") : ""}
    <div>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(meta)}</span>
    </div>
    <div class="knowledge-actions">
      ${state.knowledgeBatch.trashActive ? "" : '<button class="save-button" type="button" data-action="restore">恢复</button>'}
      ${state.knowledgeBatch.trashActive ? "" : '<button class="cancel-button" type="button" data-action="delete">彻底删除</button>'}
    </div>
  `;
  row.querySelector('[data-action="restore"]')?.addEventListener("click", () => restoreKnowledgeTrash(item.id));
  row.querySelector('[data-action="delete"]')?.addEventListener("click", () => purgeKnowledgeTrash(item.id));
  bindKnowledgeSelection(row, "trash", item.id);
  return row;
}

function createKnowledgeBatchToolbar() {
  pruneKnowledgeBatchSelection();
  const bar = document.createElement("div");
  bar.className = "knowledge-batch-bar";
  const selectedCategories = selectedKnowledgeCategoryIds();
  const selectedDocuments = selectedKnowledgeDocumentIds();
  const total = selectedCategories.length + selectedDocuments.length;
  const targetOptions = sortedKnowledgeCategories()
    .map((category) => `<option value="${escapeHtml(category.id)}"${state.knowledgeBatch.moveTargetId === category.id ? " selected" : ""}>${escapeHtml(category.name)}</option>`)
    .join("");
  bar.innerHTML = `
    <strong>已选 ${total} 项</strong>
    <label class="select-field">
      <span>目标分类</span>
      <select data-batch-move-target aria-label="批量移动目标分类">
        ${targetOptions}
      </select>
    </label>
    <label class="select-field">
      <span>移动方式</span>
      <select data-batch-move-mode aria-label="批量移动方式">
        <option value="add"${state.knowledgeBatch.moveMode === "add" ? " selected" : ""}>添加到</option>
        <option value="replace"${state.knowledgeBatch.moveMode === "replace" ? " selected" : ""}>替换为</option>
      </select>
    </label>
    <button class="save-button" type="button" data-action="batch-move"${selectedDocuments.length ? "" : " disabled"}>移动文档</button>
    <button class="save-button" type="button" data-action="batch-export"${total ? "" : " disabled"}>批量导出</button>
    <button class="cancel-button" type="button" data-action="batch-delete"${total ? "" : " disabled"}>批量删除</button>
    <button class="cancel-button subtle" type="button" data-action="batch-cancel">取消</button>
  `;
  bar.querySelector("[data-batch-move-target]").addEventListener("change", (event) => {
    state.knowledgeBatch.moveTargetId = event.target.value;
  });
  bar.querySelector("[data-batch-move-mode]").addEventListener("change", (event) => {
    state.knowledgeBatch.moveMode = event.target.value === "replace" ? "replace" : "add";
  });
  bar.querySelector('[data-action="batch-move"]').addEventListener("click", moveSelectedKnowledgeDocuments);
  bar.querySelector('[data-action="batch-export"]').addEventListener("click", exportSelectedKnowledgeItems);
  bar.querySelector('[data-action="batch-delete"]').addEventListener("click", deleteSelectedKnowledgeItems);
  bar.querySelector('[data-action="batch-cancel"]').addEventListener("click", () => {
    resetKnowledgeBatch();
    render();
  });
  return bar;
}

function createKnowledgeTrashBatchToolbar() {
  pruneKnowledgeBatchSelection();
  const bar = document.createElement("div");
  bar.className = "knowledge-batch-bar";
  const selectedTrash = selectedKnowledgeTrashIds();
  bar.innerHTML = `
    <strong>已选 ${selectedTrash.length} 项</strong>
    <button class="save-button" type="button" data-action="trash-restore"${selectedTrash.length ? "" : " disabled"}>批量恢复</button>
    <button class="cancel-button" type="button" data-action="trash-purge"${selectedTrash.length ? "" : " disabled"}>彻底删除</button>
    <button class="cancel-button subtle" type="button" data-action="trash-cancel">取消</button>
  `;
  bar.querySelector('[data-action="trash-restore"]').addEventListener("click", restoreSelectedKnowledgeTrash);
  bar.querySelector('[data-action="trash-purge"]').addEventListener("click", purgeSelectedKnowledgeTrash);
  bar.querySelector('[data-action="trash-cancel"]').addEventListener("click", () => {
    resetKnowledgeBatch();
    render();
  });
  return bar;
}

function knowledgeSelectionHtml(kind, id, label) {
  const checked =
    (kind === "category" && state.knowledgeBatch.selectedCategories.has(id)) ||
    (kind === "document" && state.knowledgeBatch.selectedDocuments.has(id)) ||
    (kind === "trash" && state.knowledgeBatch.selectedTrash.has(id));
  return `
    <label class="knowledge-select" title="${escapeHtml(label)}">
      <input type="checkbox" data-select-kind="${escapeHtml(kind)}" data-select-id="${escapeHtml(id)}"${checked ? " checked" : ""} />
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function bindKnowledgeSelection(container, kind, id) {
  const checkbox = container.querySelector(`input[data-select-kind="${kind}"][data-select-id="${cssEscape(id)}"]`);
  if (!checkbox) return;
  checkbox.addEventListener("change", (event) => {
    setKnowledgeBatchSelection(kind, id, event.target.checked);
    renderList();
  });
}

function toggleKnowledgeBatchMode(scope) {
  if (scope === "trash") {
    state.knowledgeBatch.trashActive = !state.knowledgeBatch.trashActive;
    state.knowledgeBatch.active = false;
    state.knowledgeBatch.selectedCategories.clear();
    state.knowledgeBatch.selectedDocuments.clear();
  } else {
    state.knowledgeBatch.active = !state.knowledgeBatch.active;
    state.knowledgeBatch.trashActive = false;
    state.knowledgeBatch.selectedTrash.clear();
    state.knowledgeClassifyingDocumentId = null;
  }
  if (!state.knowledgeBatch.active) {
    state.knowledgeBatch.selectedCategories.clear();
    state.knowledgeBatch.selectedDocuments.clear();
  }
  if (!state.knowledgeBatch.trashActive) {
    state.knowledgeBatch.selectedTrash.clear();
  }
  render();
}

function resetKnowledgeBatch() {
  state.knowledgeBatch.active = false;
  state.knowledgeBatch.trashActive = false;
  state.knowledgeBatch.selectedCategories.clear();
  state.knowledgeBatch.selectedDocuments.clear();
  state.knowledgeBatch.selectedTrash.clear();
}

function setKnowledgeBatchSelection(kind, id, selected) {
  const target =
    kind === "category"
      ? state.knowledgeBatch.selectedCategories
      : kind === "document"
        ? state.knowledgeBatch.selectedDocuments
        : state.knowledgeBatch.selectedTrash;
  if (selected) {
    target.add(id);
  } else {
    target.delete(id);
  }
}

function pruneKnowledgeBatchSelection() {
  const categoryIds = new Set(state.knowledge.categories.map((category) => category.id));
  const documentIds = new Set(state.knowledge.documents.map((doc) => doc.id));
  const trashIds = new Set(state.knowledge.trash.map((item) => item.id));
  state.knowledgeBatch.selectedCategories.forEach((id) => {
    if (!categoryIds.has(id)) state.knowledgeBatch.selectedCategories.delete(id);
  });
  state.knowledgeBatch.selectedDocuments.forEach((id) => {
    if (!documentIds.has(id)) state.knowledgeBatch.selectedDocuments.delete(id);
  });
  state.knowledgeBatch.selectedTrash.forEach((id) => {
    if (!trashIds.has(id)) state.knowledgeBatch.selectedTrash.delete(id);
  });
  if (!categoryIds.has(state.knowledgeBatch.moveTargetId)) {
    state.knowledgeBatch.moveTargetId = "uncategorized";
  }
}

function selectedKnowledgeCategoryIds() {
  pruneKnowledgeBatchSelection();
  return Array.from(state.knowledgeBatch.selectedCategories);
}

function selectedKnowledgeDocumentIds() {
  pruneKnowledgeBatchSelection();
  return Array.from(state.knowledgeBatch.selectedDocuments);
}

function selectedKnowledgeTrashIds() {
  pruneKnowledgeBatchSelection();
  return Array.from(state.knowledgeBatch.selectedTrash);
}

function createKnowledgeEmptyCard(text) {
  const card = document.createElement("div");
  card.className = "knowledge-empty-card";
  card.textContent = text;
  return card;
}

function createKnowledgeEditorDraft(overrides = {}) {
  return {
    documentId: null,
    title: "",
    content: "",
    categoryIds: [],
    ...overrides,
  };
}

function openKnowledgeEditor(options = {}) {
  const doc = options.documentId ? knowledgeDocumentById(options.documentId) : null;
  state.knowledgeEditorMode = "edit";
  state.knowledgeEditor = doc
    ? createKnowledgeEditorDraft({
        documentId: doc.id,
        title: doc.title,
        content: doc.content,
        categoryIds: [...doc.categoryIds],
      })
    : createKnowledgeEditorDraft({
        categoryIds: Array.isArray(options.categoryIds) ? [...options.categoryIds] : [],
      });
  state.knowledgeView = "new";
  state.knowledgeClassifyingDocumentId = null;
  render();
}

function saveKnowledgeEditor(form) {
  const now = new Date().toISOString();
  const title = form.elements.title.value.trim() || "未命名文档";
  const content = form.elements.content.value;
  const categoryIds = normalizeKnowledgeCategoryIds(
    Array.from(form.querySelectorAll('input[name="category"]:checked')).map((input) => input.value),
  );

  if (state.knowledgeEditor.documentId) {
    const docId = state.knowledgeEditor.documentId;
    state.knowledge.documents = state.knowledge.documents.map((doc) =>
      doc.id === docId
        ? {
            ...doc,
            title,
            content,
            categoryIds,
            orderByCategory: ensureKnowledgeOrderForCategories(doc.orderByCategory, categoryIds),
            updatedAt: now,
          }
        : doc,
    );
  } else {
    const id = createId();
    state.knowledge.documents.unshift({
      id,
      title,
      content,
      categoryIds,
      orderByCategory: ensureKnowledgeOrderForCategories({}, categoryIds),
      sourceFileName: state.knowledgeEditor.sourceFileName || "",
      createdAt: now,
      updatedAt: now,
    });
  }

  state.knowledgeEditor = null;
  state.knowledgeEditorMode = "edit";
  state.knowledgeView = "categories";
  saveKnowledge();
  render();
}

function syncKnowledgeEditorDraft(form) {
  if (!state.knowledgeEditor) return;
  state.knowledgeEditor = {
    ...state.knowledgeEditor,
    title: form.elements.title.value,
    content: form.elements.content.value,
    categoryIds: Array.from(form.querySelectorAll('input[name="category"]:checked')).map((input) => input.value),
  };
}

function createKnowledgeCategory(name) {
  const now = new Date().toISOString();
  const id = createId();
  state.knowledge.categories.push({
    id,
    name,
    order: nextKnowledgeCategoryOrder(),
    createdAt: now,
    updatedAt: now,
  });
  state.knowledgeCreatingCategory = false;
  state.expandedKnowledgeCategories.add(id);
  saveKnowledge();
  render();
}

function renameKnowledgeCategory(categoryId) {
  const category = knowledgeCategoryById(categoryId);
  if (!category) return;
  const name = prompt("重命名", category.name);
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  state.knowledge.categories = state.knowledge.categories.map((item) =>
    item.id === categoryId ? { ...item, name: trimmed, updatedAt: new Date().toISOString() } : item,
  );
  saveKnowledge();
  render();
}

function renameKnowledgeDocument(documentId) {
  const doc = knowledgeDocumentById(documentId);
  if (!doc) return;
  const title = prompt("重命名", doc.title);
  if (title === null) return;
  const trimmed = title.trim();
  if (!trimmed) return;
  state.knowledge.documents = state.knowledge.documents.map((item) =>
    item.id === documentId ? { ...item, title: trimmed, updatedAt: new Date().toISOString() } : item,
  );
  saveKnowledge();
  render();
}

function updateKnowledgeDocumentCategories(documentId, categoryIds) {
  const normalized = normalizeKnowledgeCategoryIds(categoryIds);
  state.knowledge.documents = state.knowledge.documents.map((doc) =>
    doc.id === documentId
      ? {
          ...doc,
          categoryIds: normalized,
          orderByCategory: ensureKnowledgeOrderForCategories(doc.orderByCategory, normalized),
          updatedAt: new Date().toISOString(),
        }
      : doc,
  );
  state.knowledgeClassifyingDocumentId = null;
  saveKnowledge();
  render();
}

async function deleteKnowledgeCategory(categoryId) {
  const category = knowledgeCategoryById(categoryId);
  if (!category || category.id === "uncategorized") return;
  const confirmed = await confirmDangerAction({
    title: "删除分类",
    message: "删除分类会把只属于这个分类的文档一起放入回收站。",
    confirmText: "删除",
  });
  if (!confirmed) return;

  const deletedAt = new Date().toISOString();
  const docsInCategory = state.knowledge.documents.filter((doc) => doc.categoryIds.includes(categoryId));
  const removedDocs = docsInCategory.filter((doc) => doc.categoryIds.length <= 1);

  state.knowledge.trash.unshift({
    id: createId(),
    type: "category",
    category,
    documents: docsInCategory,
    deletedAt,
  });
  state.knowledge.categories = state.knowledge.categories.filter((item) => item.id !== categoryId);
  state.knowledge.documents = state.knowledge.documents
    .filter((doc) => !removedDocs.some((removed) => removed.id === doc.id))
    .map((doc) =>
      doc.categoryIds.includes(categoryId)
        ? {
            ...doc,
            categoryIds: doc.categoryIds.filter((id) => id !== categoryId),
            orderByCategory: removeKnowledgeOrderCategory(doc.orderByCategory, categoryId),
            updatedAt: deletedAt,
          }
        : doc,
    );
  state.expandedKnowledgeCategories.delete(categoryId);
  saveKnowledge();
  render();
}

async function deleteKnowledgeDocument(documentId) {
  const doc = knowledgeDocumentById(documentId);
  if (!doc) return;
  const confirmed = await confirmDangerAction({
    title: "删除文档",
    message: "删除后会先放入回收站，不会立刻彻底删除。",
    confirmText: "删除",
  });
  if (!confirmed) return;
  state.knowledge.trash.unshift({
    id: createId(),
    type: "document",
    document: doc,
    deletedAt: new Date().toISOString(),
  });
  state.knowledge.documents = state.knowledge.documents.filter((item) => item.id !== documentId);
  saveKnowledge();
  render();
}

function restoreKnowledgeTrash(trashId) {
  const item = state.knowledge.trash.find((entry) => entry.id === trashId);
  if (!item) return;
  restoreKnowledgeTrashItem(item);
  state.knowledge.trash = state.knowledge.trash.filter((entry) => entry.id !== trashId);
  saveKnowledge();
  render();
}

function restoreKnowledgeTrashItem(item) {
  if (item.type === "category") {
    if (item.category && !knowledgeCategoryById(item.category.id)) {
      state.knowledge.categories.push(item.category);
    }
    (item.documents || []).forEach((doc) => {
      const existing = knowledgeDocumentById(doc.id);
      const categoryIds = normalizeKnowledgeCategoryIds([...(existing?.categoryIds || doc.categoryIds || []), item.category?.id]);
      if (existing) {
        state.knowledge.documents = state.knowledge.documents.map((current) =>
          current.id === doc.id
            ? {
                ...current,
                categoryIds,
                orderByCategory: ensureKnowledgeOrderForCategories(current.orderByCategory, categoryIds),
                updatedAt: new Date().toISOString(),
              }
            : current,
        );
      } else {
        state.knowledge.documents.push({
          ...doc,
          categoryIds,
          orderByCategory: ensureKnowledgeOrderForCategories(doc.orderByCategory, categoryIds),
        });
      }
    });
    if (item.category?.id) state.expandedKnowledgeCategories.add(item.category.id);
  }
  if (item.type === "document" && item.document) {
    const categoryIds = normalizeKnowledgeCategoryIds(
      item.document.categoryIds.filter((id) => id === "uncategorized" || knowledgeCategoryById(id)),
    );
    if (!knowledgeDocumentById(item.document.id)) {
      state.knowledge.documents.push({
        ...item.document,
        categoryIds,
        orderByCategory: ensureKnowledgeOrderForCategories(item.document.orderByCategory, categoryIds),
      });
    }
  }
}

async function purgeKnowledgeTrash(trashId) {
  const confirmed = await confirmDangerAction({
    title: "彻底删除",
    message: "彻底删除后不能从回收站恢复。",
    confirmText: "彻底删除",
  });
  if (!confirmed) return;
  state.knowledge.trash = state.knowledge.trash.filter((entry) => entry.id !== trashId);
  saveKnowledge();
  render();
}

async function deleteSelectedKnowledgeItems() {
  const selectedCategoryIds = selectedKnowledgeCategoryIds();
  const selectedDocumentIds = selectedKnowledgeDocumentIds();
  const deletableCategoryIds = selectedCategoryIds.filter((id) => id !== "uncategorized");
  const selectedDocuments = selectedDocumentIds.map(knowledgeDocumentById).filter(Boolean);
  if (!deletableCategoryIds.length && !selectedDocuments.length) {
    alert(selectedCategoryIds.includes("uncategorized") ? "未分类是固定分类，不能删除。" : "请先选择要删除的文件夹或文档。");
    return;
  }
  const confirmed = await confirmDangerAction({
    title: "批量删除",
    message: `将删除 ${deletableCategoryIds.length} 个分类、${selectedDocuments.length} 篇文档，删除内容会先进入回收站。`,
    confirmText: "删除",
  });
  if (!confirmed) return;

  const deletedAt = new Date().toISOString();
  const explicitDocumentIds = new Set(selectedDocuments.map((doc) => doc.id));
  deletableCategoryIds.forEach((categoryId) => deleteKnowledgeCategoryDirect(categoryId, deletedAt, explicitDocumentIds));
  selectedDocuments.forEach((doc) => {
    state.knowledge.trash.unshift({
      id: createId(),
      type: "document",
      document: doc,
      deletedAt,
    });
  });
  state.knowledge.documents = state.knowledge.documents.filter((doc) => !explicitDocumentIds.has(doc.id));
  resetKnowledgeBatch();
  saveKnowledge();
  render();
}

function deleteKnowledgeCategoryDirect(categoryId, deletedAt, excludedDocumentIds = new Set()) {
  const category = knowledgeCategoryById(categoryId);
  if (!category || category.id === "uncategorized") return;
  const docsInCategory = state.knowledge.documents.filter((doc) => doc.categoryIds.includes(categoryId) && !excludedDocumentIds.has(doc.id));
  const removedDocs = docsInCategory.filter((doc) => doc.categoryIds.length <= 1);
  const removedDocIds = new Set(removedDocs.map((doc) => doc.id));

  state.knowledge.trash.unshift({
    id: createId(),
    type: "category",
    category,
    documents: docsInCategory,
    deletedAt,
  });
  state.knowledge.categories = state.knowledge.categories.filter((item) => item.id !== categoryId);
  state.knowledge.documents = state.knowledge.documents
    .filter((doc) => !removedDocIds.has(doc.id))
    .map((doc) =>
      doc.categoryIds.includes(categoryId)
        ? {
            ...doc,
            categoryIds: doc.categoryIds.filter((id) => id !== categoryId),
            orderByCategory: removeKnowledgeOrderCategory(doc.orderByCategory, categoryId),
            updatedAt: deletedAt,
          }
        : doc,
    );
  state.expandedKnowledgeCategories.delete(categoryId);
}

function moveSelectedKnowledgeDocuments() {
  const selectedDocumentIds = selectedKnowledgeDocumentIds();
  if (!selectedDocumentIds.length) {
    alert("请先选择要移动的文档。");
    return;
  }
  const targetId = state.knowledgeBatch.moveTargetId;
  if (!knowledgeCategoryById(targetId)) {
    alert("目标分类不存在，请重新选择。");
    return;
  }
  const now = new Date().toISOString();
  state.knowledge.documents = state.knowledge.documents.map((doc) => {
    if (!selectedDocumentIds.includes(doc.id)) return doc;
    let categoryIds;
    if (state.knowledgeBatch.moveMode === "replace") {
      categoryIds = [targetId];
    } else if (targetId === "uncategorized") {
      categoryIds = doc.categoryIds.length ? doc.categoryIds : ["uncategorized"];
    } else {
      categoryIds = Array.from(new Set([...doc.categoryIds.filter((id) => id !== "uncategorized"), targetId]));
    }
    const normalized = normalizeKnowledgeCategoryIds(categoryIds);
    return {
      ...doc,
      categoryIds: normalized,
      orderByCategory: ensureKnowledgeOrderForCategories(doc.orderByCategory, normalized),
      updatedAt: now,
    };
  });
  resetKnowledgeBatch();
  saveKnowledge();
  render();
}

function exportSelectedKnowledgeItems() {
  const selectedCategoryIds = selectedKnowledgeCategoryIds();
  const selectedDocumentIds = selectedKnowledgeDocumentIds();
  if (!selectedCategoryIds.length && !selectedDocumentIds.length) {
    alert("请先选择要导出的文件夹或文档。");
    return;
  }
  const files = [];
  const usedNames = new Set();
  const exportedDocumentIds = new Set();

  selectedCategoryIds.forEach((categoryId) => {
    const category = knowledgeCategoryById(categoryId);
    if (!category) return;
    const docs = documentsForCategory(categoryId);
    if (!docs.length) {
      addKnowledgeZipFile(files, usedNames, `${safeFileName(category.name)}/_空分类.txt`, "这个分类里还没有文档。");
      return;
    }
    docs.forEach((doc) => {
      exportedDocumentIds.add(doc.id);
      addKnowledgeZipFile(files, usedNames, `${safeFileName(category.name)}/${safeFileName(doc.title)}.md`, doc.content);
    });
  });

  selectedDocumentIds.forEach((documentId) => {
    if (exportedDocumentIds.has(documentId)) return;
    const doc = knowledgeDocumentById(documentId);
    if (!doc) return;
    addKnowledgeZipFile(files, usedNames, `选中文档/${safeFileName(doc.title)}.md`, doc.content);
  });

  if (!files.length) {
    alert("没有可以导出的内容。");
    return;
  }
  downloadBackupFile(createZipBlob(files), `Workbuddy知识文库批量导出-${toISODate(new Date())}.zip`);
}

function addKnowledgeZipFile(files, usedNames, name, content) {
  const uniqueName = uniqueKnowledgeZipName(usedNames, name);
  usedNames.add(uniqueName);
  files.push({ name: uniqueName, content });
}

function uniqueKnowledgeZipName(usedNames, name) {
  if (!usedNames.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > -1 ? name.slice(0, dot) : name;
  const extension = dot > -1 ? name.slice(dot) : "";
  let index = 2;
  let candidate = `${base} (${index})${extension}`;
  while (usedNames.has(candidate)) {
    index += 1;
    candidate = `${base} (${index})${extension}`;
  }
  return candidate;
}

function restoreSelectedKnowledgeTrash() {
  const selectedTrashIds = selectedKnowledgeTrashIds();
  if (!selectedTrashIds.length) {
    alert("请先选择要恢复的内容。");
    return;
  }
  const selected = new Set(selectedTrashIds);
  state.knowledge.trash.forEach((item) => {
    if (selected.has(item.id)) restoreKnowledgeTrashItem(item);
  });
  state.knowledge.trash = state.knowledge.trash.filter((item) => !selected.has(item.id));
  resetKnowledgeBatch();
  saveKnowledge();
  render();
}

async function purgeSelectedKnowledgeTrash() {
  const selectedTrashIds = selectedKnowledgeTrashIds();
  if (!selectedTrashIds.length) {
    alert("请先选择要彻底删除的内容。");
    return;
  }
  const confirmed = await confirmDangerAction({
    title: "批量彻底删除",
    message: `将彻底删除 ${selectedTrashIds.length} 项，删除后不能从回收站恢复。`,
    confirmText: "彻底删除",
  });
  if (!confirmed) return;
  const selected = new Set(selectedTrashIds);
  state.knowledge.trash = state.knowledge.trash.filter((item) => !selected.has(item.id));
  resetKnowledgeBatch();
  saveKnowledge();
  render();
}

function importKnowledgeDocument(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const isSupported = /\.(md|txt)$/i.test(file.name) || ["text/markdown", "text/plain"].includes(file.type);
  if (!isSupported) {
    alert("请导入 .md 或 .txt 文件。");
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const title = file.name.replace(/\.(md|txt)$/i, "");
    state.knowledgeEditor = createKnowledgeEditorDraft({
      title,
      content: String(reader.result || ""),
      sourceFileName: file.name,
    });
    state.knowledgeEditorMode = "edit";
    state.knowledgeView = "new";
    event.target.value = "";
    render();
  };
  reader.onerror = () => {
    alert("导入失败，请重新选择文件。");
    event.target.value = "";
  };
  reader.readAsText(file);
}

function exportKnowledgeDocument(documentId) {
  const doc = knowledgeDocumentById(documentId);
  if (!doc) return;
  downloadBackupFile(new Blob([doc.content], { type: "text/markdown;charset=utf-8" }), `${safeFileName(doc.title)}.md`);
}

function exportKnowledgeCategory(categoryId) {
  const category = knowledgeCategoryById(categoryId);
  if (!category) return;
  const docs = documentsForCategory(categoryId);
  if (!docs.length) {
    alert("这个分类里还没有可以导出的文档。");
    return;
  }
  const files = docs.map((doc) => ({
    name: `${safeFileName(category.name)}/${safeFileName(doc.title)}.md`,
    content: doc.content,
  }));
  downloadBackupFile(createZipBlob(files), `${safeFileName(category.name)}.zip`);
}

function toggleKnowledgeCategory(categoryId) {
  if (state.expandedKnowledgeCategories.has(categoryId)) {
    state.expandedKnowledgeCategories.delete(categoryId);
  } else {
    state.expandedKnowledgeCategories.add(categoryId);
  }
  render();
}

function activeKnowledgeDocuments() {
  return state.knowledge.documents;
}

function knowledgeCategoryById(categoryId) {
  return state.knowledge.categories.find((category) => category.id === categoryId) || null;
}

function knowledgeDocumentById(documentId) {
  return state.knowledge.documents.find((doc) => doc.id === documentId) || null;
}

function knowledgeCategoryName(categoryId) {
  return knowledgeCategoryById(categoryId)?.name || "未分类";
}

function sortedKnowledgeCategories() {
  const categories = [...state.knowledge.categories];
  if (state.knowledgeCategorySort === "az") {
    return categories.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN") || (a.order || 0) - (b.order || 0));
  }
  return categories.sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function documentsForCategory(categoryId) {
  return activeKnowledgeDocuments()
    .filter((doc) => doc.categoryIds.includes(categoryId))
    .sort((a, b) => sortKnowledgeDocuments(a, b, categoryId));
}

function sortKnowledgeDocuments(a, b, categoryId = null) {
  if (state.knowledgeDocumentSort === "az") {
    return a.title.localeCompare(b.title, "zh-Hans-CN") || (a.createdAt || "").localeCompare(b.createdAt || "");
  }
  if (state.knowledgeDocumentSort === "updatedAt") {
    return (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "") || a.title.localeCompare(b.title, "zh-Hans-CN");
  }
  const firstOrder = categoryId ? a.orderByCategory?.[categoryId] || 0 : 0;
  const secondOrder = categoryId ? b.orderByCategory?.[categoryId] || 0 : 0;
  return firstOrder - secondOrder || (a.createdAt || "").localeCompare(b.createdAt || "");
}

function normalizeKnowledgeCategoryIds(categoryIds) {
  const existingIds = new Set(state.knowledge.categories.map((category) => category.id));
  const ids = Array.from(new Set((categoryIds || []).filter((id) => existingIds.has(id))));
  return ids.length ? ids : ["uncategorized"];
}

function ensureKnowledgeOrderForCategories(orderByCategory, categoryIds) {
  const next = {};
  categoryIds.forEach((categoryId) => {
    next[categoryId] = normalizeNonNegativeInteger(orderByCategory?.[categoryId]) || nextKnowledgeDocumentOrder(categoryId);
  });
  return next;
}

function removeKnowledgeOrderCategory(orderByCategory, categoryId) {
  const next = { ...(orderByCategory || {}) };
  delete next[categoryId];
  return next;
}

function nextKnowledgeCategoryOrder() {
  return Math.max(0, ...state.knowledge.categories.map((category) => normalizeNonNegativeInteger(category.order))) + 1;
}

function nextKnowledgeDocumentOrder(categoryId) {
  return Math.max(0, ...state.knowledge.documents.map((doc) => normalizeNonNegativeInteger(doc.orderByCategory?.[categoryId]))) + 1;
}

function formatKnowledgeTime(value) {
  if (!value) return "暂无时间";
  return formatTaskDate(value.slice(0, 10));
}

function renderMarkdownPreview(content) {
  const lines = String(content || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```(.*)$/);
    if (fence) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push("<hr />");
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderMarkdownInline(heading[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push(`<blockquote>${quoteLines.map((item) => `<p>${renderMarkdownInline(item)}</p>`).join("")}</blockquote>`);
      continue;
    }

    if (/^\s*([-*+])\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      const markerPattern = ordered ? /^\s*(\d+)\.\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/;
      while (index < lines.length) {
        const match = lines[index].match(markerPattern);
        if (!match) break;
        items.push({
          number: ordered ? Number(match[1]) : null,
          text: ordered ? match[2] : match[1],
        });
        index += 1;
        const blankStart = index;
        while (index < lines.length && !lines[index].trim()) index += 1;
        if (index >= lines.length || !markerPattern.test(lines[index])) {
          index = blankStart;
          break;
        }
      }
      const tag = ordered ? "ol" : "ul";
      blocks.push(`<${tag}>${items.map((item) => `<li${ordered ? ` value="${item.number}"` : ""}>${renderMarkdownInline(item.text)}</li>`).join("")}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^```/.test(lines[index]) &&
      !/^---+$/.test(lines[index].trim()) &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^\s*>\s?/.test(lines[index]) &&
      !/^\s*([-*+])\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(`<p>${renderMarkdownInline(paragraph.join(" "))}</p>`);
  }

  return blocks.length ? blocks.join("") : '<div class="knowledge-preview-empty">暂无内容</div>';
}

function renderMarkdownInline(value) {
  const placeholders = [];
  const token = (html) => {
    const key = `\u0000MD${placeholders.length}\u0000`;
    placeholders.push([key, html]);
    return key;
  };

  let text = String(value || "").replace(/`([^`]+)`/g, (_, code) => token(`<code>${escapeHtml(code)}</code>`));
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const safeUrl = sanitizeMarkdownUrl(url);
    if (!safeUrl) return `${label} (${url})`;
    return token(`<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`);
  });

  let html = escapeHtml(text);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
  placeholders.forEach(([key, replacement]) => {
    html = html.replaceAll(key, replacement);
  });
  return html;
}

function sanitizeMarkdownUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(url)) return url;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return "";
}

function safeFileName(value) {
  const cleaned = String(value || "未命名文档")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "未命名文档";
}

function createZipBlob(files, type = "application/zip") {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const localHeader = createZipHeader(0x04034b50, nameBytes, contentBytes.length, crc);
    localParts.push(localHeader, nameBytes, contentBytes);

    const centralHeader = createZipHeader(0x02014b50, nameBytes, contentBytes.length, crc, offset);
    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + contentBytes.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, files.length, true);
  view.setUint16(10, files.length, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, offset, true);

  return new Blob([...localParts, ...centralParts, end], { type });
}

function createZipHeader(signature, nameBytes, size, crc, localOffset = 0) {
  const isCentral = signature === 0x02014b50;
  const header = new Uint8Array(isCentral ? 46 : 30);
  const view = new DataView(header.buffer);
  view.setUint32(0, signature, true);
  if (isCentral) {
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, nameBytes.length, true);
    view.setUint32(42, localOffset, true);
  } else {
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, nameBytes.length, true);
  }
  return header;
}

function crc32(bytes) {
  let crc = -1;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
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
  const remove = node.querySelector('[data-action="delete"]');
  const actions = node.querySelector(".task-actions");
  const detailTarget = entryDetailTarget(entry);

  node.classList.toggle("is-done", entry.done);
  node.classList.toggle("is-canceled", isCanceled(entry));
  node.classList.add(`priority-${entry.priority}`);
  check.classList.toggle("is-checked", entry.done);
  check.disabled = isCanceled(entry);
  title.textContent = entry.title;
  pill.textContent = priorityLabels[entry.priority] || priorityLabels.normal;
  pill.classList.add(entry.priority || "normal");
  meta.innerHTML = entryMetaHtml(entry);
  appendDetailBlock(node.querySelector(".task-body"), detailTarget, entry);

  actions.replaceChildren();
  const dragHandle = createPlannerDragHandle(node, entry);
  if (dragHandle) actions.append(dragHandle);
  actions.append(createDetailButton(detailTarget, entry));
  actions.append(createEditButton(entry));
  actions.append(createCancelButton(entry));
  actions.append(remove);
  check.addEventListener("click", () => toggleEntryDone(entry));
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

function renderTodayRecurrences() {
  const entries = todayRecurrenceEntries();
  if (!entries.length) return;

  const section = document.createElement("section");
  section.className = "recurrence-today-section";
  const heading = document.createElement("div");
  heading.className = "recurrence-section-heading";
  heading.innerHTML = `<h3>周期任务</h3><span>${recurrenceTodayMeta(entries)}</span>`;
  section.append(heading);

  const list = document.createElement("div");
  list.className = "recurrence-today-list";
  entries.forEach((item) => list.append(createTodayRecurrenceCard(item)));
  section.append(list);
  elements.taskList.append(section);
}

function createTodayRecurrenceCard(item) {
  const record = recurrenceRecordFor(item, state.selectedDate);
  const status = record?.status || "open";
  const detailTarget = recurrenceDetailTarget(item);
  const card = document.createElement("article");
  card.className = `recurrence-today-card is-${status} priority-${item.priority}`;
  card.innerHTML = `
    <div class="recurrence-today-main">
      <button class="check-button${status === "done" ? " is-checked" : ""}" type="button" aria-label="标记周期完成"></button>
      <div class="task-body">
        <div class="recurrence-title-row">
          <h3>${escapeHtml(item.title)}</h3>
          <span class="priority-pill ${item.priority}">${priorityLabels[item.priority]}</span>
        </div>
        <div class="task-meta">${escapeHtml(recurrenceFrequencyText(item))} · ${recurrenceStatusText(item, state.selectedDate)}</div>
      </div>
    </div>
    <div class="task-actions">
      <button class="icon-button small detail-toggle-button${hasDetailContent(item) ? " has-detail" : ""}" type="button" data-action="details" aria-label="备注" title="备注">备</button>
      <button class="save-button" type="button" data-action="done">${status === "done" ? "已完成" : "完成"}</button>
      <button class="cancel-button" type="button" data-action="skipped">${status === "skipped" ? "已跳过" : "跳过"}</button>
    </div>
  `;
  appendDetailBlock(card.querySelector(".task-body"), detailTarget, item);
  card.querySelector('[data-action="details"]').classList.toggle("is-active", isDetailExpanded(detailTarget));
  card.querySelector('[data-action="details"]').addEventListener("click", () => toggleDetailExpanded(detailTarget));
  card.querySelector('[data-action="done"]').addEventListener("click", () => toggleTodayRecurrenceDone(item.id));
  card.querySelector(".check-button").addEventListener("click", () => toggleTodayRecurrenceDone(item.id));
  card
    .querySelector('[data-action="skipped"]')
    .addEventListener("click", () => toggleTodayRecurrenceSkipped(item.id));
  return card;
}

function renderRecurrenceList(entries) {
  const panel = document.createElement("section");
  panel.className = "recurrence-panel";
  panel.append(createRecurrenceForm());

  if (!entries.length) {
    panel.append(createRecurrenceEmptyCard());
    elements.taskList.append(panel);
    return;
  }

  const list = document.createElement("div");
  list.className = "recurrence-list";
  entries.forEach((item) => {
    list.append(state.recurrenceEditing === item.id ? createRecurrenceEditor(item) : createRecurrenceCard(item));
  });
  panel.append(list);
  elements.taskList.append(panel);
}

function createRecurrenceForm() {
  const form = document.createElement("form");
  form.className = "recurrence-form";
  form.innerHTML = `
    <input name="title" type="text" maxlength="80" placeholder="添加周期任务" autocomplete="off" required />
    ${recurrenceFrequencyFieldsHtml({ type: "daily", weekday: isoWeekday(parseISODate(state.selectedDate)), everyDays: 2, monthDay: parseISODate(state.selectedDate).getDate() })}
    <label class="date-field">
      <span>开始</span>
      <input name="startDate" type="date" value="${state.selectedDate}" />
    </label>
    <label class="select-field priority-select priority-normal">
      <span>重要性</span>
      <select name="priority" aria-label="周期重要性">
        ${priorityOptionsHtml("normal")}
      </select>
    </label>
    <button class="primary-button" type="submit">添加周期</button>
  `;
  bindRecurrenceFrequencyFields(form);
  bindRecurrencePriorityField(form);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) return;
    addRecurrence({
      title,
      frequency: readRecurrenceFrequency(form),
      startDate: form.elements.startDate.value || state.selectedDate,
      priority: form.elements.priority.value,
    });
  });
  return form;
}

function createRecurrenceRangeControls(item, range) {
  const controls = document.createElement("div");
  controls.className = "recurrence-summary-controls";
  controls.innerHTML = `
    <label class="date-field">
      <span>开始</span>
      <input type="date" data-range="start" value="${range.start}" />
    </label>
    <label class="date-field">
      <span>结束</span>
      <input type="date" data-range="end" value="${range.end}" />
    </label>
    <button class="cancel-button" type="button" data-action="all-range">全部</button>
  `;
  controls.querySelector('[data-range="start"]').addEventListener("change", (event) => {
    setRecurrenceSummaryRange(item.id, { start: event.target.value });
    render();
  });
  controls.querySelector('[data-range="end"]').addEventListener("change", (event) => {
    setRecurrenceSummaryRange(item.id, { end: event.target.value });
    render();
  });
  controls.querySelector('[data-action="all-range"]').addEventListener("click", () => {
    delete state.recurrenceSummaryRanges[item.id];
    render();
  });
  return controls;
}

function createRecurrenceCard(item) {
  const expanded = state.expandedRecurrences.has(item.id);
  const range = expanded ? recurrenceRangeFor(item) : defaultRecurrenceSummaryRange(item);
  const stats = recurrencePeriodStats(item, range.start, range.end);
  const detailTarget = recurrenceDetailTarget(item);
  const card = document.createElement("article");
  card.className = `recurrence-card priority-${item.priority}${item.active ? "" : " is-inactive"}`;
  card.innerHTML = `
    <div class="recurrence-card-head">
      <div class="task-body">
        <div class="recurrence-title-row">
          <h3>${escapeHtml(item.title)}</h3>
          <span class="priority-pill ${item.priority}">${priorityLabels[item.priority]}</span>
          ${item.active ? "" : '<span class="recurrence-state-pill">已停用</span>'}
        </div>
        <div class="task-meta">${escapeHtml(recurrenceFrequencyText(item))} · 开始：${formatTaskDate(item.startDate)}${
          item.endDate ? ` · 停用：${formatTaskDate(item.endDate)}` : ""
        }</div>
      </div>
      <div class="task-actions">
        ${dragHandleHtml()}
        <button class="icon-button small detail-toggle-button${isDetailExpanded(detailTarget) ? " is-active" : ""}${hasDetailContent(item) ? " has-detail" : ""}" type="button" data-action="details" aria-label="备注" title="备注">备</button>
        <button class="icon-button small expand-button${expanded ? " is-expanded" : ""}" type="button" data-action="expand" aria-label="${expanded ? "收起日历" : "展开日历"}" title="${expanded ? "收起日历" : "展开日历"}">▸</button>
        <button class="icon-button small" type="button" data-action="edit" aria-label="修改周期" title="修改周期">✎</button>
        <button class="icon-button small" type="button" data-action="toggle" aria-label="${item.active ? "停用周期" : "启用周期"}" title="${item.active ? "停用周期" : "启用周期"}">${item.active ? "Ⅱ" : "▶"}</button>
        <button class="icon-button small" type="button" data-action="delete" aria-label="删除周期" title="删除周期">×</button>
      </div>
    </div>
    <div class="recurrence-stats">
      <span>应做 ${stats.due}</span>
      <span>完成 ${stats.done}</span>
      <span>未完成 ${stats.missed}</span>
      <span>跳过 ${stats.skipped}</span>
      <span>完成率 ${stats.rate}%</span>
      <span>最长连续 ${stats.longestStreak}</span>
      <span>当前连续 ${stats.currentStreak}</span>
    </div>
  `;
  appendDetailBlock(card.querySelector(".task-body"), detailTarget, item);
  setupRecurrenceSortable(card, item.id);
  if (expanded) {
    card.append(createRecurrenceRangeControls(item, range));
    card.append(createRecurrenceCalendarRange(item, range));
  }
  card.querySelector('[data-action="details"]').addEventListener("click", () => toggleDetailExpanded(detailTarget));
  card.querySelector('[data-action="expand"]').addEventListener("click", () => toggleRecurrenceExpanded(item.id));
  card.querySelector('[data-action="edit"]').addEventListener("click", () => {
    state.recurrenceEditing = item.id;
    render();
  });
  card.querySelector('[data-action="toggle"]').addEventListener("click", () => toggleRecurrenceActive(item.id));
  card.querySelector('[data-action="delete"]').addEventListener("click", () => deleteRecurrence(item.id));
  return card;
}

function createRecurrenceEditor(item) {
  const wrapper = document.createElement("article");
  wrapper.className = `recurrence-card recurrence-edit-card priority-${item.priority}`;
  wrapper.innerHTML = `
    <form class="recurrence-form">
      <input name="title" type="text" maxlength="80" value="${escapeHtml(item.title)}" aria-label="周期标题" required />
      ${recurrenceFrequencyFieldsHtml(item.frequency)}
      <label class="date-field">
        <span>开始</span>
        <input name="startDate" type="date" value="${item.startDate}" />
      </label>
      <label class="select-field priority-select priority-${item.priority}">
        <span>重要性</span>
        <select name="priority" aria-label="周期重要性">
          ${priorityOptionsHtml(item.priority)}
        </select>
      </label>
      <div class="edit-actions">
        <button class="save-button" type="submit">保存</button>
        <button class="cancel-button" type="button">取消</button>
      </div>
    </form>
  `;
  const form = wrapper.querySelector("form");
  bindRecurrenceFrequencyFields(form);
  bindRecurrencePriorityField(form);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) return;
    updateRecurrence(item.id, {
      title,
      frequency: readRecurrenceFrequency(form),
      startDate: form.elements.startDate.value || state.selectedDate,
      priority: form.elements.priority.value,
    });
  });
  wrapper.querySelector(".cancel-button").addEventListener("click", () => {
    state.recurrenceEditing = null;
    render();
  });
  return wrapper;
}

function recurrenceFrequencyFieldsHtml(frequency) {
  const normalized = normalizeRecurrenceFrequency(frequency);
  return `
    <label class="select-field recurrence-frequency-type">
      <span>频率</span>
      <select name="frequencyType" aria-label="周期频率">
        <option value="daily"${normalized.type === "daily" ? " selected" : ""}>每天</option>
        <option value="weekly"${normalized.type === "weekly" ? " selected" : ""}>每周</option>
        <option value="interval"${normalized.type === "interval" ? " selected" : ""}>每隔 N 天</option>
        <option value="monthly"${normalized.type === "monthly" ? " selected" : ""}>每月</option>
      </select>
    </label>
    <label class="select-field recurrence-extra recurrence-weekly">
      <span>周几</span>
      <select name="weekday" aria-label="每周日期">
        ${[1, 2, 3, 4, 5, 6, 7]
          .map((day) => `<option value="${day}"${normalized.weekday === day ? " selected" : ""}>周${"一二三四五六日"[day - 1]}</option>`)
          .join("")}
      </select>
    </label>
    <label class="select-field recurrence-extra recurrence-interval">
      <span>间隔</span>
      <select name="everyDays" aria-label="间隔天数">
        ${[2, 3, 4, 5, 6, 7, 10, 14, 30]
          .map((day) => `<option value="${day}"${normalized.everyDays === day ? " selected" : ""}>${day} 天</option>`)
          .join("")}
      </select>
    </label>
    <label class="select-field recurrence-extra recurrence-monthly">
      <span>日期</span>
      <select name="monthDay" aria-label="每月日期">
        ${Array.from({ length: 31 }, (_, index) => index + 1)
          .map((day) => `<option value="${day}"${normalized.monthDay === day ? " selected" : ""}>${day} 日</option>`)
          .join("")}
      </select>
    </label>
  `;
}

function bindRecurrenceFrequencyFields(form) {
  const type = form.elements.frequencyType;
  const update = () => {
    const value = type.value;
    form.querySelector(".recurrence-weekly").hidden = value !== "weekly";
    form.querySelector(".recurrence-interval").hidden = value !== "interval";
    form.querySelector(".recurrence-monthly").hidden = value !== "monthly";
  };
  type.addEventListener("change", update);
  update();
}

function bindRecurrencePriorityField(form) {
  const select = form.elements.priority;
  const field = select.closest(".priority-select");
  select.addEventListener("change", () => {
    field.classList.remove("priority-normal", "priority-high", "priority-urgent");
    field.classList.add(`priority-${select.value}`);
  });
}

function createRecurrenceCalendarRange(item, range) {
  const wrapper = document.createElement("div");
  wrapper.className = "recurrence-calendar-range";
  let monthStart = startOfMonth(parseISODate(range.start));
  const rangeEnd = parseISODate(range.end);
  const monthCount = monthsBetween(monthStart, startOfMonth(rangeEnd)) + 1;
  if (monthCount > 12) {
    const note = document.createElement("div");
    note.className = "recurrence-calendar-note";
    note.textContent = "所选时间较长，日历只显示最后 12 个月；上方计数仍按完整时间段统计。";
    wrapper.append(note);
    monthStart = addMonths(startOfMonth(rangeEnd), -11);
  }
  while (monthStart <= rangeEnd) {
    wrapper.append(createRecurrenceMonthGrid(item, monthStart, range));
    monthStart = addMonths(monthStart, 1);
  }
  return wrapper;
}

function createRecurrenceMonthGrid(item, monthDate, range) {
  const monthStart = startOfMonth(monthDate);
  const grid = document.createElement("div");
  grid.className = "recurrence-month";

  const header = document.createElement("div");
  header.className = "recurrence-month-title";
  header.textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(monthDate);
  grid.append(header);

  const weekdays = document.createElement("div");
  weekdays.className = "recurrence-month-weekdays";
  ["一", "二", "三", "四", "五", "六", "日"].forEach((day) => {
    const cell = document.createElement("span");
    cell.textContent = day;
    weekdays.append(cell);
  });
  grid.append(weekdays);

  const days = document.createElement("div");
  days.className = "recurrence-month-grid";
  const start = startOfWeek(monthStart);
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(start, index);
    const iso = toISODate(date);
    const button = createRecurrenceDayButton(item, iso, "month");
    button.classList.toggle("is-muted", date.getMonth() !== monthDate.getMonth() || iso < range.start || iso > range.end);
    button.textContent = String(date.getDate());
    days.append(button);
  }
  grid.append(days);
  return grid;
}

function createRecurrenceDayButton(item, iso, mode) {
  const due = isRecurrenceDueOn(item, iso);
  const record = recurrenceRecordFor(item, iso);
  const today = toISODate(new Date());
  const status = record?.status || (due ? (iso < today ? "missed" : "open") : "none");
  const button = document.createElement("button");
  button.className = `recurrence-day is-${status}${iso === state.selectedDate ? " is-today" : ""}`;
  button.type = "button";
  button.title = `${formatTaskDate(iso)} · ${due ? recurrenceRecordLabels[status] || "待完成" : "不需要做"}`;
  if (mode === "short") {
    button.innerHTML = `<span>${formatWeekday(parseISODate(iso)).replace("周", "")}</span><strong>${parseISODate(iso).getDate()}</strong>`;
  }
  button.disabled = !due || iso > today;
  button.addEventListener("click", () => cycleRecurrenceRecord(item.id, iso));
  return button;
}

function createRecurrenceEmptyCard() {
  const card = document.createElement("div");
  card.className = "recurrence-empty-card";
  card.textContent = "还没有周期任务。可以先添加“每日学习半小时日语”或“每周六打扫房间卫生”。";
  return card;
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
  const detailTarget = entryDetailTarget(entry);
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
  appendDetailBlock(body, detailTarget, entry);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(createDetailButton(detailTarget, entry));
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

function createDetailButton(target, item) {
  const button = document.createElement("button");
  button.className = "icon-button small detail-toggle-button";
  button.type = "button";
  button.title = "备注";
  button.setAttribute("aria-label", "备注");
  button.textContent = "备";
  button.classList.toggle("is-active", isDetailExpanded(target));
  button.classList.toggle("has-detail", hasDetailContent(item));
  button.addEventListener("click", () => toggleDetailExpanded(target));
  return button;
}

function appendDetailBlock(container, target, item) {
  const summary = detailSummaryText(item);
  if (summary) {
    const summaryButton = document.createElement("button");
    summaryButton.className = "detail-summary";
    summaryButton.type = "button";
    summaryButton.textContent = summary;
    summaryButton.addEventListener("click", () => toggleDetailExpanded(target));
    container.append(summaryButton);
  }
  if (isDetailExpanded(target)) {
    container.append(createDetailPanel(target, item));
  }
}

function createDetailPanel(target, item) {
  const panel = document.createElement("div");
  panel.className = "planner-detail-panel";

  const header = document.createElement("div");
  header.className = "planner-detail-header";
  const title = document.createElement("span");
  title.textContent = "备注";
  const addChecklist = document.createElement("button");
  addChecklist.className = "detail-checklist-add";
  addChecklist.type = "button";
  addChecklist.textContent = "清单";
  addChecklist.addEventListener("click", () => {
    addForm.hidden = false;
    addInput.focus();
  });
  header.append(title, addChecklist);
  panel.append(header);

  const note = document.createElement("textarea");
  note.className = "planner-detail-note";
  note.rows = 3;
  note.maxLength = 1200;
  note.placeholder = "备注";
  note.value = item.note || "";
  note.addEventListener("input", () => updateDetailNote(target, note.value, false));
  panel.append(note);

  const checklist = Array.isArray(item.checklist) ? item.checklist : [];
  const addForm = document.createElement("form");
  addForm.className = "planner-checklist-add-form";
  addForm.hidden = checklist.length === 0;
  const addInput = document.createElement("input");
  addInput.type = "text";
  addInput.maxLength = 160;
  addInput.placeholder = "添加清单项";
  const submitAdd = document.createElement("button");
  submitAdd.className = "save-button";
  submitAdd.type = "submit";
  submitAdd.textContent = "添加";
  addForm.append(addInput, submitAdd);
  addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = addInput.value.trim();
    if (!text) return;
    addChecklistItem(target, text);
  });
  panel.append(addForm);

  if (checklist.length) {
    const stats = checklistStats(item);
    const checklistHeader = document.createElement("div");
    checklistHeader.className = "planner-checklist-header";
    checklistHeader.textContent = `清单 ${stats.done}/${stats.total}`;
    panel.append(checklistHeader);

    const list = document.createElement("div");
    list.className = "planner-checklist";
    checklist.forEach((checkItem) => list.append(createChecklistRow(target, checkItem)));
    panel.append(list);
  }

  return panel;
}

function createChecklistRow(target, checkItem) {
  const row = document.createElement("div");
  row.className = `planner-checklist-row${checkItem.done ? " is-done" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(checkItem.done);
  checkbox.addEventListener("change", () => toggleChecklistItem(target, checkItem.id));

  const text = document.createElement("input");
  text.type = "text";
  text.maxLength = 160;
  text.value = checkItem.text;
  text.setAttribute("aria-label", "清单项");
  text.addEventListener("change", () => updateChecklistItemText(target, checkItem.id, text.value));

  const remove = document.createElement("button");
  remove.className = "icon-button small checklist-remove";
  remove.type = "button";
  remove.title = "删除清单项";
  remove.setAttribute("aria-label", "删除清单项");
  remove.textContent = "×";
  remove.addEventListener("click", (event) => {
    event.preventDefault();
    deleteChecklistItem(target, checkItem.id);
  });

  row.append(checkbox, text, remove);
  return row;
}

function entryDetailTarget(entry) {
  return {
    kind: entry.kind,
    id: entry.id,
    parentId: entry.parentId || null,
  };
}

function recurrenceDetailTarget(item) {
  return {
    kind: "recurrence",
    id: item.id,
    parentId: null,
  };
}

function detailKey(target) {
  return `${target.kind}:${target.parentId || ""}:${target.id}`;
}

function isDetailExpanded(target) {
  return state.expandedDetails.has(detailKey(target));
}

function toggleDetailExpanded(target) {
  const key = detailKey(target);
  if (state.expandedDetails.has(key)) {
    state.expandedDetails.delete(key);
  } else {
    state.expandedDetails.add(key);
  }
  render();
}

function hasDetailContent(item) {
  return Boolean((item.note || "").trim()) || checklistStats(item).total > 0;
}

function detailSummaryText(item) {
  const parts = [];
  if ((item.note || "").trim()) parts.push("备注");
  const stats = checklistStats(item);
  if (stats.total) parts.push(`清单 ${stats.done}/${stats.total}`);
  return parts.length ? `备注 · ${parts.join(" · ")}` : "";
}

function checklistStats(item) {
  const checklist = Array.isArray(item.checklist) ? item.checklist : [];
  return {
    done: checklist.filter((checkItem) => checkItem.done).length,
    total: checklist.length,
  };
}

function updateDetailNote(target, note, shouldRender = true) {
  updateDetailTarget(target, (item) => ({
    ...item,
    note,
    updatedAt: new Date().toISOString(),
  }));
  if (shouldRender) render();
}

function addChecklistItem(target, text) {
  const now = new Date().toISOString();
  updateDetailTarget(target, (item) => ({
    ...item,
    checklist: [
      ...(Array.isArray(item.checklist) ? item.checklist : []),
      {
        id: createId(),
        text,
        done: false,
        createdAt: now,
        completedAt: null,
      },
    ],
    updatedAt: now,
  }));
  render();
}

function toggleChecklistItem(target, itemId) {
  const now = new Date().toISOString();
  updateDetailTarget(target, (item) => ({
    ...item,
    checklist: (Array.isArray(item.checklist) ? item.checklist : []).map((checkItem) =>
      checkItem.id === itemId
        ? {
            ...checkItem,
            done: !checkItem.done,
            completedAt: checkItem.done ? null : now,
          }
        : checkItem,
    ),
    updatedAt: now,
  }));
  render();
}

function updateChecklistItemText(target, itemId, text) {
  const nextText = text.trim();
  if (!nextText) {
    deleteChecklistItem(target, itemId);
    return;
  }
  updateDetailTarget(target, (item) => ({
    ...item,
    checklist: (Array.isArray(item.checklist) ? item.checklist : []).map((checkItem) =>
      checkItem.id === itemId ? { ...checkItem, text: nextText } : checkItem,
    ),
    updatedAt: new Date().toISOString(),
  }));
  render();
}

function deleteChecklistItem(target, itemId) {
  updateDetailTarget(target, (item) => ({
    ...item,
    checklist: (Array.isArray(item.checklist) ? item.checklist : []).filter((checkItem) => checkItem.id !== itemId),
    updatedAt: new Date().toISOString(),
  }));
  render();
}

function updateDetailTarget(target, updater) {
  if (target.kind === "recurrence") {
    state.recurrences.items = state.recurrences.items.map((item) => (item.id === target.id ? updater(item) : item));
    saveRecurrences();
    return;
  }

  state.tasks = state.tasks.map((task) => {
    if (target.kind === "task" && task.id === target.id) return updater(task);
    if (target.kind === "goal" && task.id === target.id) return updater(task);
    if (target.kind !== "node" || task.id !== target.parentId) return task;
    return {
      ...task,
      children: task.children.map((child) => (child.id === target.id ? updater(child) : child)),
    };
  });
  saveTasks();
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
  const entry = goalEntry(goal);
  const detailTarget = entryDetailTarget(entry);
  const card = document.createElement("article");
  card.className = `goal-card priority-${goal.priority}${goal.done ? " is-done" : ""}`;

  if (isEditingEntry(entry)) {
    card.append(createEntryEditor(entry, "goal-edit-card"));
    elements.taskList.appendChild(card);
    return;
  }
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
  appendDetailBlock(body, detailTarget, entry);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const dragHandle = createPlannerDragHandle(card, entry);
  if (dragHandle) actions.append(dragHandle);
  actions.append(createDetailButton(detailTarget, entry));
  const expand = document.createElement("button");
  expand.className = `icon-button small expand-button${expanded ? " is-expanded" : ""}`;
  expand.type = "button";
  expand.title = expanded ? "收起节点" : "展开节点";
  expand.setAttribute("aria-label", expanded ? "收起节点" : "展开节点");
  expand.textContent = "▸";
  expand.addEventListener("click", () => toggleGoalExpanded(goal.id));
  actions.append(expand);
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
    <input type="text" maxlength="80" placeholder="添加节点" required />
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
      note: "",
      checklist: [],
      order: nextOrder(),
      createdAt: new Date().toISOString(),
      completedAt: null,
    });
  });
  return form;
}

function createNodeItem(goal, child) {
  const entry = nodeEntry(goal, child);
  const detailTarget = entryDetailTarget(entry);
  if (isEditingEntry(entry)) return createEntryEditor(entry, "node-item edit-card");

  const item = document.createElement("div");
  item.className = `node-item priority-${child.priority}${child.done ? " is-done" : ""}`;

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
  appendDetailBlock(body, detailTarget, entry);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(createDetailButton(detailTarget, entry));
  actions.append(createEditButton(entry));
  const remove = document.createElement("button");
  remove.className = "icon-button small";
  remove.type = "button";
  remove.title = "删除节点";
  remove.setAttribute("aria-label", "删除节点");
  remove.textContent = "×";
  remove.addEventListener("click", () => deleteNode(goal.id, child.id));
  actions.append(remove);

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
        <input name="birthYear" type="number" min="1" max="9999" value="${entry.birthYear || ""}" aria-label="年份" />
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
      <input class="birthday-edit-note" name="note" type="text" maxlength="80" value="${escapeHtml(entry.note)}" aria-label="备注" placeholder="备注" />
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
  if (state.module === "knowledge") return [];
  if (state.module === "shopping") return [];
  if (state.view === "search") return searchResults();
  if (state.view === "birthday") return birthdayEntries();
  if (state.view === "recurrence") return recurrenceEntries();
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

function recurrenceEntries() {
  return [...state.recurrences.items].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0);
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });
}

function todayRecurrenceEntries() {
  return recurrenceEntries().filter((item) => item.active && isRecurrenceDueOn(item, state.selectedDate));
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
        .sort(sortNodesByDate);
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
  const checklistText = Array.isArray(entry.checklist) ? entry.checklist.map((item) => item.text).join(" ") : "";
  const text = `${entry.title} ${entry.parentTitle || ""} ${entry.note || ""} ${checklistText}`.toLowerCase();
  const dateValue = entry.kind === "goal" ? entry.dueDate : entry.date;

  if (keyword && !text.includes(keyword)) return false;
  if (state.search.date && dateValue !== state.search.date) return false;
  if (state.search.priority !== "all" && entry.priority !== state.search.priority) return false;
  if (state.search.status === "done" && !entry.done) return false;
  if (state.search.status === "open" && (entry.done || isCanceled(entry))) return false;
  if (state.search.status === "canceled" && !isCanceled(entry)) return false;
  return true;
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
  if (state.module === "knowledge") {
    const titles = {
      categories: "知识文库",
      new: "新建",
      import: "导入",
      trash: "回收站",
    };
    return titles[state.knowledgeView] || "知识文库";
  }
  if (state.module === "shopping") return "商品比价";
  if (state.view === "today") return formatTaskDate(state.selectedDate);
  return viewTitles[state.view];
}

function currentViewMeta(entries) {
  if (state.module === "english") return `${englishBankStats(currentEnglishBank().id).learned}/${currentEnglishBank().words.length} 已学`;
  if (state.module === "knowledge") {
    return `${state.knowledge.categories.length} 个分类 · ${state.knowledge.documents.length} 篇文档`;
  }
  if (state.module === "shopping") return "";
  if (state.view === "search") return `${countSearchResults(entries)} 项匹配`;
  if (state.view === "birthday") return `${entries.length} 个生日`;
  if (state.view === "medium") return `${entries.length} 个目标 · ${formatRatio(goalCompletionStats(allMediumGoals()))} 已完成`;
  if (state.view === "recurrence") return `${entries.length} 个周期`;
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

function sortNodesByDate(a, b) {
  if (a.date && b.date && a.date !== b.date) return a.date.localeCompare(b.date);
  if (a.date && !b.date) return -1;
  if (!a.date && b.date) return 1;
  return sortEntries(a, b);
}

function sortedChildren(goal) {
  return [...goal.children].sort(sortNodesByDate);
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

function toggleRecurrenceExpanded(id) {
  if (state.expandedRecurrences.has(id)) {
    state.expandedRecurrences.delete(id);
  } else {
    state.expandedRecurrences.add(id);
  }
  render();
}

function canReorderCurrentView() {
  return state.module === "planner" && ["today", "medium"].includes(state.view) && currentStatusFilter() === "all";
}

function canReorderRecurrenceView() {
  return state.module === "planner" && state.view === "recurrence";
}

function canReorderKnowledgeView() {
  return (
    state.module === "knowledge" &&
    state.knowledgeView === "categories" &&
    (!state.knowledgeSearch || state.knowledgeSearch.length === 0) &&
    (state.knowledgeCategorySort === "custom" || state.knowledgeDocumentSort === "custom")
  );
}

function canReorderShoppingView() {
  return state.module === "shopping" && state.shoppingSort === "custom" && !state.shoppingSearch;
}

function createPlannerDragHandle(element, entry) {
  if (!canReorderCurrentView() || isEditingEntry(entry)) return null;
  if (state.view === "today" && entry.kind !== "task") return null;
  if (state.view === "medium" && entry.kind !== "goal") return null;
  const handle = createDragHandle();
  setupPlannerSortable(element, entry, handle);
  return handle;
}

function createDragHandle() {
  const handle = document.createElement("button");
  handle.className = "icon-button small drag-handle";
  handle.type = "button";
  handle.dataset.dragHandle = "";
  handle.title = "拖动排序";
  handle.setAttribute("aria-label", "拖动排序");
  handle.textContent = "☰";
  return handle;
}

function dragHandleHtml() {
  return '<button class="icon-button small drag-handle" type="button" data-drag-handle title="拖动排序" aria-label="拖动排序">☰</button>';
}

function setupPlannerSortable(element, entry, handle) {
  setupSortableElement(element, editKey(entry), {
    handle,
    canDrop: sameEntryLayer,
    onDrop: reorderVisibleEntries,
  });
}

function setupRecurrenceSortable(element, id) {
  if (!canReorderRecurrenceView()) return;
  const handle = element.querySelector("[data-drag-handle]");
  if (!handle) return;
  setupSortableElement(element, { kind: "recurrence", id }, {
    handle,
    canDrop: sameSortableLayer,
    onDrop: reorderRecurrences,
  });
}

function setupKnowledgeDraggableElement(element, key) {
  if (state.module !== "knowledge" || state.knowledgeView !== "categories" || state.knowledgeSearch) return;
  if (state.knowledgeBatch.active) return;
  if (key.kind === "category" && state.knowledgeCategorySort !== "custom") return;
  if (key.kind === "document" && (!key.categoryId || state.knowledgeDocumentSort !== "custom")) return;
  const handle = element.querySelector("[data-drag-handle]");
  if (!handle) return;
  setupSortableElement(element, key, {
    handle,
    canDrop: (sourceKey, targetKey) => sameKnowledgeKeyLayer(sourceKey, targetKey) && !sameKnowledgeKey(sourceKey, targetKey),
    onDrop: reorderKnowledgeItems,
  });
}

function setupShoppingProductSortable(element, id) {
  if (!canReorderShoppingView()) return;
  const handle = element.querySelector("[data-drag-handle]");
  if (!handle) return;
  setupSortableElement(element, { kind: "shopping-product", id }, {
    handle,
    canDrop: sameSortableLayer,
    onDrop: reorderShoppingProducts,
  });
}

function setupShoppingTabSortable(element, handle, key) {
  if (state.module !== "shopping" || state.shoppingSearch) return;
  setupSortableElement(element, key, {
    handle,
    canDrop: (sourceKey, targetKey) => {
      if (!sameSortableLayer(sourceKey, targetKey)) return false;
      return sourceKey.kind !== "shopping-subcategory" || sourceKey.categoryId === targetKey.categoryId;
    },
    onDrop: reorderShoppingTabs,
  });
}

function setupSortableElement(element, sourceKey, options) {
  const handle = options.handle || element;
  if (!handle) return;
  element.dataset.sortKey = JSON.stringify(sourceKey);

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;

    const blockClick = (clickEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopImmediatePropagation();
    };

    const startDragging = () => {
      dragging = true;
      state.dragging = sourceKey;
      state.dragTarget = null;
      state.dropAfter = false;
      element.classList.add("is-dragging");
    };

    const onPointerMove = (moveEvent) => {
      const distance = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (!dragging && distance < 5) return;
      if (!dragging) startDragging();
      moveEvent.preventDefault();

      const target = sortableTargetFromPoint(moveEvent.clientX, moveEvent.clientY, element, sourceKey, options);
      clearDropTargets();
      if (!target) return;
      const targetKey = parseSortableKey(target.dataset.sortKey);
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
      if (dragging) {
        handle.addEventListener("click", blockClick, { once: true, capture: true });
        if (state.dragging && state.dragTarget) {
          options.onDrop(state.dragging, state.dragTarget, state.dropAfter);
        }
      }
      state.dragging = null;
      state.dragTarget = null;
      state.dropAfter = false;
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  });
}

function sortableTargetFromPoint(x, y, sourceElement, sourceKey, options) {
  const candidates = [];
  document.elementsFromPoint(x, y).forEach((element) => {
    const target = element.closest("[data-sort-key]");
    if (target && target !== sourceElement && !candidates.includes(target)) candidates.push(target);
  });
  return candidates.find((target) => {
    const targetKey = parseSortableKey(target.dataset.sortKey);
    return targetKey && options.canDrop(sourceKey, targetKey);
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

function reorderKnowledgeItems(sourceKey, targetKey, after) {
  if (!sameKnowledgeKeyLayer(sourceKey, targetKey)) return;

  if (sourceKey.kind === "category") {
    const categories = sortedKnowledgeCategories();
    const reordered = reorderByIds(categories, sourceKey.id, targetKey.id, after);
    reordered.forEach((category, index) => {
      category.order = index + 1;
      category.updatedAt = new Date().toISOString();
    });
    state.knowledge.categories = state.knowledge.categories.map((category) => {
      const updated = reordered.find((item) => item.id === category.id);
      return updated || category;
    });
  }

  if (sourceKey.kind === "document") {
    const docs = documentsForCategory(sourceKey.categoryId);
    const reordered = reorderByIds(docs, sourceKey.id, targetKey.id, after);
    reordered.forEach((doc, index) => {
      doc.orderByCategory = {
        ...(doc.orderByCategory || {}),
        [sourceKey.categoryId]: index + 1,
      };
    });
    state.knowledge.documents = state.knowledge.documents.map((doc) => {
      const updated = reordered.find((item) => item.id === doc.id);
      return updated || doc;
    });
  }

  saveKnowledge();
  render();
}

function reorderRecurrences(sourceKey, targetKey, after) {
  const items = recurrenceEntries();
  const reordered = reorderByIds(items, sourceKey.id, targetKey.id, after);
  const startOrder = Math.min(...items.map((item) => item.order || 0));
  reordered.forEach((item, index) => {
    item.order = startOrder + index + 1;
    item.updatedAt = new Date().toISOString();
  });
  state.recurrences.items = state.recurrences.items.map((item) => reordered.find((entry) => entry.id === item.id) || item);
  saveRecurrences();
  render();
}

function reorderShoppingProducts(sourceKey, targetKey, after) {
  const products = shoppingVisibleProducts();
  const reordered = reorderByIds(products, sourceKey.id, targetKey.id, after);
  const startOrder = Math.min(...products.map((product) => product.order || 0));
  reordered.forEach((product, index) => {
    product.order = startOrder + index + 1;
    product.updatedAt = new Date().toISOString();
  });
  state.shopping.products = state.shopping.products.map((product) => reordered.find((entry) => entry.id === product.id) || product);
  saveShopping();
  render();
}

function reorderShoppingTabs(sourceKey, targetKey, after) {
  if (sourceKey.kind === "shopping-category") {
    const categories = sortedShoppingCategories();
    const reordered = reorderByIds(categories, sourceKey.id, targetKey.id, after);
    reordered.forEach((category, index) => {
      category.order = index + 1;
      category.updatedAt = new Date().toISOString();
    });
    state.shopping.categories = state.shopping.categories.map((category) => reordered.find((entry) => entry.id === category.id) || category);
  }

  if (sourceKey.kind === "shopping-subcategory") {
    const subcategories = shoppingSubcategoriesFor(sourceKey.categoryId);
    const reordered = reorderByIds(subcategories, sourceKey.id, targetKey.id, after);
    reordered.forEach((subcategory, index) => {
      subcategory.order = index + 1;
      subcategory.updatedAt = new Date().toISOString();
    });
    state.shopping.subcategories = state.shopping.subcategories.map((subcategory) => reordered.find((entry) => entry.id === subcategory.id) || subcategory);
  }

  saveShopping();
  render();
}

function reorderByIds(items, sourceId, targetId, after) {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items;

  const ordered = [...items];
  const [moved] = ordered.splice(sourceIndex, 1);
  let insertIndex = ordered.findIndex((item) => item.id === targetId);
  if (after) insertIndex += 1;
  ordered.splice(insertIndex, 0, moved);
  return ordered;
}

function sameKnowledgeKey(first, second) {
  return first?.kind === second?.kind && first?.id === second?.id && first?.categoryId === second?.categoryId;
}

function sameKnowledgeKeyLayer(first, second) {
  return first?.kind === second?.kind && (first.kind === "category" || first.categoryId === second.categoryId);
}

function sameEntryKey(a, b) {
  return a?.kind === b?.kind && a?.id === b?.id && (a?.parentId || null) === (b?.parentId || null);
}

function sameEntryLayer(a, b) {
  return a?.kind === b?.kind && a?.id !== b?.id && (a?.parentId || null) === (b?.parentId || null);
}

function sameSortableLayer(first, second) {
  return first?.kind === second?.kind && first?.id !== second?.id;
}

function parseSortableKey(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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

function addRecurrence(data) {
  const now = new Date().toISOString();
  state.recurrences.items = [
    {
      id: createId(),
      title: data.title,
      frequency: normalizeRecurrenceFrequency(data.frequency),
      startDate: data.startDate,
      endDate: null,
      active: true,
      priority: normalizePriority(data.priority),
      note: "",
      checklist: [],
      order: nextOrder(),
      records: {},
      createdAt: now,
      updatedAt: now,
    },
    ...state.recurrences.items,
  ];
  saveRecurrences();
  render();
}

function updateRecurrence(id, updates) {
  state.recurrences.items = state.recurrences.items.map((item) =>
    item.id === id
      ? {
          ...item,
          title: updates.title,
          frequency: normalizeRecurrenceFrequency(updates.frequency),
          startDate: updates.startDate,
          priority: normalizePriority(updates.priority),
          updatedAt: new Date().toISOString(),
        }
      : item,
  );
  state.recurrenceEditing = null;
  saveRecurrences();
  markMissedRecurrences();
  render();
}

function toggleRecurrenceActive(id) {
  state.recurrences.items = state.recurrences.items.map((item) => {
    if (item.id !== id) return item;
    const active = !item.active;
    return {
      ...item,
      active,
      endDate: active ? null : state.selectedDate,
      updatedAt: new Date().toISOString(),
    };
  });
  saveRecurrences();
  render();
}

async function deleteRecurrence(id) {
  const shouldDelete = await confirmDangerAction({
    title: "删除周期任务",
    message: "删除这个周期任务会同时删除它的完成历史。",
    confirmText: "删除",
  });
  if (!shouldDelete) return;
  state.recurrences.items = state.recurrences.items.filter((item) => item.id !== id);
  state.recurrenceEditing = null;
  saveRecurrences();
  render();
}

function setRecurrenceRecord(id, iso, status, note = "") {
  state.recurrences.items = state.recurrences.items.map((item) => {
    if (item.id !== id) return item;
    const records = { ...item.records };
    if (!status) {
      delete records[iso];
    } else {
      records[iso] = {
        status,
        note,
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      ...item,
      records,
      updatedAt: new Date().toISOString(),
    };
  });
  saveRecurrences();
  render();
}

function toggleTodayRecurrenceDone(id) {
  const item = state.recurrences.items.find((entry) => entry.id === id);
  const status = recurrenceRecordFor(item, state.selectedDate)?.status;
  setRecurrenceRecord(id, state.selectedDate, status === "done" ? null : "done");
}

function toggleTodayRecurrenceSkipped(id) {
  const item = state.recurrences.items.find((entry) => entry.id === id);
  const status = recurrenceRecordFor(item, state.selectedDate)?.status;
  setRecurrenceRecord(id, state.selectedDate, status === "skipped" ? null : "skipped");
}

function cycleRecurrenceRecord(id, iso) {
  const item = state.recurrences.items.find((entry) => entry.id === id);
  if (!item || !isRecurrenceDueOn(item, iso)) return;
  const current = recurrenceRecordFor(item, iso)?.status || null;
  const next = current === "done" ? "missed" : current === "missed" ? "skipped" : current === "skipped" ? null : "done";
  setRecurrenceRecord(id, iso, next);
}

function addShoppingCategory(name) {
  const id = createId();
  state.shopping.categories.push({
    id,
    name,
    order: nextShoppingCategoryOrder(),
    createdAt: new Date().toISOString(),
    updatedAt: null,
  });
  state.shoppingCategoryId = id;
  state.shoppingSubcategoryId = "all";
  saveShopping();
  render();
}

function renameShoppingCategory(id) {
  const category = shoppingCategoryById(id);
  if (!category) return;
  const name = prompt("一级分类名称：", category.name);
  if (name === null || !name.trim()) return;
  state.shopping.categories = state.shopping.categories.map((item) =>
    item.id === id ? { ...item, name: name.trim(), updatedAt: new Date().toISOString() } : item,
  );
  saveShopping();
  render();
}

function deleteShoppingCategory(id) {
  if (state.shopping.subcategories.some((item) => item.categoryId === id) || state.shopping.products.some((item) => item.categoryId === id)) {
    alert("这个一级分类下面还有二级分类或商品，先删除里面的内容后再删除分类。");
    return;
  }
  state.shopping.categories = state.shopping.categories.filter((item) => item.id !== id);
  if (state.shoppingCategoryId === id) {
    state.shoppingCategoryId = "all";
    state.shoppingSubcategoryId = "all";
  }
  saveShopping();
  render();
}

function addShoppingSubcategory(categoryId, name) {
  const id = createId();
  state.shopping.subcategories.push({
    id,
    categoryId,
    name,
    order: nextShoppingSubcategoryOrder(categoryId),
    createdAt: new Date().toISOString(),
    updatedAt: null,
  });
  state.shoppingSubcategoryId = id;
  saveShopping();
  render();
}

function renameShoppingSubcategory(id) {
  const subcategory = shoppingSubcategoryById(id);
  if (!subcategory) return;
  const name = prompt("二级分类名称：", subcategory.name);
  if (name === null || !name.trim()) return;
  state.shopping.subcategories = state.shopping.subcategories.map((item) =>
    item.id === id ? { ...item, name: name.trim(), updatedAt: new Date().toISOString() } : item,
  );
  saveShopping();
  render();
}

function deleteShoppingSubcategory(id) {
  if (state.shopping.products.some((item) => item.subcategoryId === id)) {
    alert("这个二级分类下面还有商品，先删除商品后再删除分类。");
    return;
  }
  state.shopping.subcategories = state.shopping.subcategories.filter((item) => item.id !== id);
  if (state.shoppingSubcategoryId === id) state.shoppingSubcategoryId = "all";
  saveShopping();
  render();
}

function addShoppingProduct(data) {
  const id = createId();
  state.shopping.products.push({
    id,
    name: data.name,
    categoryId: data.categoryId,
    subcategoryId: data.subcategoryId || null,
    unit: data.unit || "",
    order: nextShoppingProductOrder(),
    records: [],
    createdAt: new Date().toISOString(),
    updatedAt: null,
  });
  state.shoppingCategoryId = data.categoryId;
  state.shoppingSubcategoryId = data.subcategoryId || "all";
  state.shoppingExpandedProductId = id;
  saveShopping();
  render();
}

function updateShoppingProduct(id, updates) {
  state.shopping.products = state.shopping.products.map((product) =>
    product.id === id
      ? {
          ...product,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      : product,
  );
  saveShopping();
  render();
}

function renameShoppingProduct(id) {
  const product = shoppingProductById(id);
  if (!product) return;
  const name = prompt("商品名称：", product.name);
  if (name === null || !name.trim()) return;
  updateShoppingProduct(id, { name: name.trim() });
}

async function deleteShoppingProduct(id) {
  const shouldDelete = await confirmDangerAction({
    title: "删除商品",
    message: "删除这个商品会同时删除它的购买记录。",
    confirmText: "删除",
  });
  if (!shouldDelete) return;
  state.shopping.products = state.shopping.products.filter((product) => product.id !== id);
  if (state.shoppingExpandedProductId === id) state.shoppingExpandedProductId = null;
  saveShopping();
  render();
}

function addShoppingRecord(productId, record) {
  state.shopping.products = state.shopping.products.map((product) => {
    if (product.id !== productId) return product;
    return {
      ...product,
      records: [
        ...product.records,
        {
          id: createId(),
          date: record.date,
          name: record.name,
          platform: record.platform,
          totalPrice: roundMoney(record.totalPrice),
          quantity: roundMoney(record.quantity),
          standardCode: normalizeShoppingStandardCode(record.standardCode),
          note: record.note || "",
          createdAt: new Date().toISOString(),
          updatedAt: null,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  });
  saveShopping();
  render();
}

function editShoppingRecord(productId, recordId) {
  const product = shoppingProductById(productId);
  const record = product?.records.find((item) => item.id === recordId);
  if (!record) return;
  const date = prompt("购买日期：", record.date);
  if (date === null) return;
  const name = prompt("本次名称：", shoppingRecordName(product, record));
  if (name === null || !name.trim()) return;
  const platform = prompt(`平台（${shoppingPlatforms.join("、")}）：`, record.platform);
  if (platform === null || !shoppingPlatforms.includes(platform.trim())) {
    alert("平台必须从固定选项中选择：淘宝、京东、拼多多、抖音、盒马、阿里巴巴。");
    return;
  }
  const totalPrice = prompt("总价（元）：", formatMoney(record.totalPrice));
  if (totalPrice === null) return;
  const quantity = prompt("数量：", formatQuantity(record.quantity));
  if (quantity === null) return;
  const standardCode = prompt("国标号（只填 GB/T 后面的数字，可不填）：", normalizeShoppingStandardCode(record.standardCode));
  if (standardCode === null) return;
  const note = prompt("备注：", record.note || "");
  if (note === null) return;
  const parsedTotal = normalizeMoneyInput(totalPrice);
  const parsedQuantity = normalizeMoneyInput(quantity);
  if (!isISODate(date) || parsedTotal === null || parsedQuantity === null || parsedQuantity <= 0) {
    alert("记录格式不正确，请检查日期、总价和数量。");
    return;
  }
  state.shopping.products = state.shopping.products.map((item) => {
    if (item.id !== productId) return item;
    return {
      ...item,
      records: item.records.map((entry) =>
        entry.id === recordId
          ? {
              ...entry,
              date,
              name: name.trim(),
              platform: platform.trim(),
              totalPrice: roundMoney(parsedTotal),
              quantity: roundMoney(parsedQuantity),
              standardCode: normalizeShoppingStandardCode(standardCode),
              note: note.trim(),
              updatedAt: new Date().toISOString(),
            }
          : entry,
      ),
      updatedAt: new Date().toISOString(),
    };
  });
  saveShopping();
  render();
}

function deleteShoppingRecord(productId, recordId) {
  state.shopping.products = state.shopping.products.map((product) => {
    if (product.id !== productId) return product;
    return {
      ...product,
      records: product.records.filter((record) => record.id !== recordId),
      updatedAt: new Date().toISOString(),
    };
  });
  saveShopping();
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

function readRecurrenceFrequency(form) {
  const type = form.elements.frequencyType.value;
  if (type === "weekly") {
    return {
      type,
      weekday: clampInteger(form.elements.weekday.value, 1, 7, isoWeekday(parseISODate(state.selectedDate))),
    };
  }
  if (type === "interval") {
    return {
      type,
      everyDays: clampInteger(form.elements.everyDays.value, 2, 365, 2),
    };
  }
  if (type === "monthly") {
    return {
      type,
      monthDay: clampInteger(form.elements.monthDay.value, 1, 31, parseISODate(state.selectedDate).getDate()),
    };
  }
  return { type: "daily" };
}

function isRecurrenceDueOn(item, iso) {
  if (!item || iso < item.startDate) return false;
  if (item.endDate && iso > item.endDate) return false;
  const date = parseISODate(iso);
  const frequency = normalizeRecurrenceFrequency(item.frequency);
  if (frequency.type === "daily") return true;
  if (frequency.type === "weekly") return isoWeekday(date) === frequency.weekday;
  if (frequency.type === "interval") return daysBetween(item.startDate, iso) % frequency.everyDays === 0;
  if (frequency.type === "monthly") {
    const dueDay = Math.min(frequency.monthDay, solarMonthDays(date.getFullYear(), date.getMonth() + 1));
    return date.getDate() === dueDay;
  }
  return false;
}

function recurrenceRecordFor(item, iso) {
  return item.records?.[iso] || null;
}

function recurrenceTodayMeta(items) {
  const done = items.filter((item) => recurrenceRecordFor(item, state.selectedDate)?.status === "done").length;
  const skipped = items.filter((item) => recurrenceRecordFor(item, state.selectedDate)?.status === "skipped").length;
  const open = items.length - done - skipped;
  return `${items.length} 个 · ${done} 完成 · ${open} 待完成${skipped ? ` · ${skipped} 跳过` : ""}`;
}

function recurrenceStatusText(item, iso) {
  const status = recurrenceRecordFor(item, iso)?.status;
  if (status) return recurrenceRecordLabels[status] || "已记录";
  return iso < toISODate(new Date()) ? "未完成" : "待完成";
}

function recurrencePeriodStats(item, startIso, endIso) {
  const dates = recurrenceDueDates(item, startIso, endIso);
  const stats = {
    due: dates.length,
    done: 0,
    missed: 0,
    skipped: 0,
    rate: 0,
    longestStreak: 0,
    currentStreak: 0,
  };
  let streak = 0;
  dates.forEach((iso) => {
    const status = recurrenceRecordFor(item, iso)?.status || (iso < toISODate(new Date()) ? "missed" : "open");
    if (status === "done") {
      stats.done += 1;
      streak += 1;
      stats.longestStreak = Math.max(stats.longestStreak, streak);
    } else {
      if (status === "missed") stats.missed += 1;
      if (status === "skipped") stats.skipped += 1;
      if (status !== "skipped") streak = 0;
    }
  });
  stats.currentStreak = currentRecurrenceStreak(item);
  const effectiveDue = stats.due - stats.skipped;
  stats.rate = effectiveDue ? Math.round((stats.done / effectiveDue) * 100) : 0;
  return stats;
}

function currentRecurrenceStreak(item) {
  let cursor = parseISODate(state.selectedDate);
  let streak = 0;
  for (let index = 0; index < 366; index += 1) {
    const iso = toISODate(cursor);
    if (isRecurrenceDueOn(item, iso)) {
      const status = recurrenceRecordFor(item, iso)?.status;
      if (status === "skipped") {
        cursor = addDays(cursor, -1);
        continue;
      }
      if (status !== "done") break;
      streak += 1;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function recurrenceDueDates(item, startIso, endIso) {
  const dates = [];
  let cursor = parseISODate(maxISODate(startIso, item.startDate));
  const end = parseISODate(endIso);
  while (cursor <= end) {
    const iso = toISODate(cursor);
    if (isRecurrenceDueOn(item, iso)) dates.push(iso);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function defaultRecurrenceSummaryRange(item) {
  const today = toISODate(new Date());
  return {
    start: isISODate(item.startDate) ? item.startDate : today,
    end: item.endDate && item.endDate < today ? item.endDate : today,
  };
}

function recurrenceRangeFor(item) {
  const defaults = defaultRecurrenceSummaryRange(item);
  const custom = state.recurrenceSummaryRanges[item.id] || {};
  let start = isISODate(custom.start) ? custom.start : defaults.start;
  let end = isISODate(custom.end) ? custom.end : defaults.end;
  if (start > end) [start, end] = [end, start];
  return { start, end };
}

function setRecurrenceSummaryRange(id, updates) {
  const current = state.recurrenceSummaryRanges[id] || {};
  state.recurrenceSummaryRanges = {
    ...state.recurrenceSummaryRanges,
    [id]: {
      ...current,
      ...updates,
    },
  };
}

function monthsBetween(startDate, endDate) {
  return (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth();
}

function recurrenceFrequencyText(item) {
  const frequency = normalizeRecurrenceFrequency(item.frequency);
  if (frequency.type === "weekly") return `每周${"一二三四五六日"[frequency.weekday - 1]}`;
  if (frequency.type === "interval") return `每隔 ${frequency.everyDays} 天`;
  if (frequency.type === "monthly") return `每月 ${frequency.monthDay} 日`;
  return recurrenceFrequencyLabels[frequency.type] || "每天";
}

function sortedShoppingCategories() {
  return [...state.shopping.categories].sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name, "zh-CN"));
}

function shoppingPlatformOptions(selected = "") {
  return shoppingPlatforms
    .map((platform) => `<option value="${escapeHtml(platform)}"${platform === selected ? " selected" : ""}>${escapeHtml(platform)}</option>`)
    .join("");
}

function shoppingCategoryProductCount(categoryId) {
  return state.shopping.products.filter((product) => product.categoryId === categoryId).length;
}

function shoppingSubcategoryProductCount(subcategoryId) {
  return state.shopping.products.filter((product) => product.subcategoryId === subcategoryId).length;
}

function shoppingSubcategoriesFor(categoryId) {
  return state.shopping.subcategories
    .filter((subcategory) => subcategory.categoryId === categoryId)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name, "zh-CN"));
}

function shoppingVisibleProducts() {
  const keyword = state.shoppingSearch.trim().toLowerCase();
  let products = state.shopping.products;
  if (keyword) {
    products = products.filter((product) => shoppingProductMatches(product, keyword));
  } else {
    if (state.shoppingCategoryId !== "all") {
      products = products.filter((product) => product.categoryId === state.shoppingCategoryId);
    }
    if (state.shoppingSubcategoryId !== "all") {
      products = products.filter((product) => product.subcategoryId === state.shoppingSubcategoryId);
    }
  }
  return sortShoppingProducts(products);
}

function sortShoppingProducts(products) {
  const sorted = [...products];
  if (state.shoppingSort === "name") return sorted.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  return sorted.sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name, "zh-CN"));
}

function shoppingProductMatches(product, keyword) {
  const recordText = product.records
    .map((record) => `${record.name || ""} ${record.platform} ${record.standardCode || ""} ${shoppingRecordStandardText(record)} ${record.note || ""}`)
    .join(" ");
  const path = shoppingProductPath(product);
  return `${product.name} ${path} ${recordText}`.toLowerCase().includes(keyword);
}

function shoppingProductPath(product) {
  const category = shoppingCategoryById(product.categoryId)?.name || "未分类";
  const subcategory = product.subcategoryId ? shoppingSubcategoryById(product.subcategoryId)?.name : "";
  return subcategory ? `${category} > ${subcategory}` : category;
}

function shoppingBestPriceText(product) {
  const best = shoppingBestRecord(product);
  if (!best) return "暂无价格记录";
  const unit = product.unit ? `/${product.unit}` : "";
  return `最低：${best.record.platform} ${formatUnitPrice(best.unitPrice)} 元${unit}`;
}

function shoppingBestRecord(product) {
  return product.records
    .map((record) => ({ record, unitPrice: shoppingUnitPrice(record) }))
    .filter((item) => Number.isFinite(item.unitPrice))
    .sort((a, b) => a.unitPrice - b.unitPrice || a.record.date.localeCompare(b.record.date))[0] || null;
}

function shoppingUnitPrice(record) {
  const quantity = Number(record.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return Number(record.totalPrice) / quantity;
}

function shoppingRecordName(product, record) {
  return record.name || product.name;
}

function shoppingRecordStandardText(record) {
  const code = normalizeShoppingStandardCode(record.standardCode);
  return code ? `GB/T ${code}` : "";
}

function normalizeShoppingStandardCode(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/^GB\/T\s*/i, "").trim();
}

function sortedShoppingRecords(product) {
  return [...product.records].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function shoppingCategoryById(id) {
  return state.shopping.categories.find((category) => category.id === id) || null;
}

function shoppingSubcategoryById(id) {
  return state.shopping.subcategories.find((subcategory) => subcategory.id === id) || null;
}

function shoppingProductById(id) {
  return state.shopping.products.find((product) => product.id === id) || null;
}

function nextShoppingCategoryOrder() {
  return Math.max(0, ...state.shopping.categories.map((category) => category.order || 0)) + 1;
}

function nextShoppingSubcategoryOrder(categoryId) {
  return Math.max(0, ...shoppingSubcategoriesFor(categoryId).map((subcategory) => subcategory.order || 0)) + 1;
}

function nextShoppingProductOrder() {
  return Math.max(0, ...state.shopping.products.map((product) => product.order || 0)) + 1;
}

function createShoppingWorkbookBlob(products, { exportedAt, scopeLabel }) {
  const detailRows = [
    ["一级分类", "二级分类", "商品词条", "本次名称", "平台", "购买日期", "国标", "总价", "数量", "单位", "单价", "备注"],
  ];
  products.forEach((product) => {
    sortedShoppingRecords(product).forEach((record) => {
      detailRows.push([
        shoppingCategoryById(product.categoryId)?.name || "未分类",
        product.subcategoryId ? shoppingSubcategoryById(product.subcategoryId)?.name || "" : "",
        product.name,
        shoppingRecordName(product, record),
        record.platform,
        record.date,
        shoppingRecordStandardText(record),
        Number(record.totalPrice) || 0,
        Number(record.quantity) || 0,
        product.unit || "",
        shoppingUnitPrice(record) ?? "",
        record.note || "",
      ]);
    });
  });

  const summaryRows = [
    ["一级分类", "二级分类", "商品词条", "单位", "记录数", "最低单价", "最低价平台", "最低价本次名称", "最低价日期", "最近购买日期"],
  ];
  products.forEach((product) => {
    const best = shoppingBestRecord(product);
    const latest = sortedShoppingRecords(product)[0];
    summaryRows.push([
      shoppingCategoryById(product.categoryId)?.name || "未分类",
      product.subcategoryId ? shoppingSubcategoryById(product.subcategoryId)?.name || "" : "",
      product.name,
      product.unit || "",
      product.records.length,
      best?.unitPrice ?? "",
      best?.record.platform || "",
      best ? shoppingRecordName(product, best.record) : "",
      best?.record.date || "",
      latest?.date || "",
    ]);
  });

  const recordCount = products.reduce((sum, product) => sum + product.records.length, 0);
  const infoRows = [
    ["项目", "内容"],
    ["导出时间", exportedAt.toLocaleString("zh-CN")],
    ["导出范围", scopeLabel],
    ["商品词条数", products.length],
    ["购买记录数", recordCount],
    ["说明", "购买记录明细是一行一条购买记录；商品汇总是一行一个商品词条。"],
  ];

  return createXlsxBlob([
    { name: "购买记录明细", rows: detailRows },
    { name: "商品汇总", rows: summaryRows },
    { name: "导出说明", rows: infoRows },
  ]);
}

function createXlsxBlob(sheets) {
  const worksheetFiles = sheets.map((sheet, index) => ({
    name: `xl/worksheets/sheet${index + 1}.xml`,
    content: createXlsxWorksheetXml(sheet.rows),
  }));
  const files = [
    {
      name: "[Content_Types].xml",
      content: createXlsxContentTypesXml(sheets.length),
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Workbuddy</dc:creator>
  <cp:lastModifiedBy>Workbuddy</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Workbuddy</Application>
</Properties>`,
    },
    {
      name: "xl/workbook.xml",
      content: createXlsxWorkbookXml(sheets),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: createXlsxWorkbookRelsXml(sheets.length),
    },
    {
      name: "xl/styles.xml",
      content: createXlsxStylesXml(),
    },
    ...worksheetFiles,
  ];
  return createZipBlob(files, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

function createXlsxContentTypesXml(sheetCount) {
  const sheets = Array.from({ length: sheetCount }, (_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${sheets}
</Types>`;
}

function createXlsxWorkbookXml(sheets) {
  const sheetNodes = sheets
    .map((sheet, index) => `<sheet name="${xmlAttribute(safeSheetName(sheet.name, index))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetNodes}</sheets>
</workbook>`;
}

function createXlsxWorkbookRelsXml(sheetCount) {
  const sheetRels = Array.from(
    { length: sheetCount },
    (_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function createXlsxStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function createXlsxWorksheetXml(rows) {
  const colCount = Math.max(1, ...rows.map((row) => row.length));
  const columnWidths = Array.from({ length: colCount }, (_, index) => {
    const maxLength = rows.reduce((max, row) => Math.max(max, stringLengthForWidth(row[index])), 8);
    return Math.min(Math.max(maxLength + 2, 10), 42);
  });
  const cols = columnWidths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  const rowNodes = rows
    .map((row, rowIndex) => {
      const cells = row.map((value, columnIndex) => createXlsxCell(value, rowIndex + 1, columnIndex + 1, rowIndex === 0)).join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${cols}</cols>
  <sheetData>${rowNodes}</sheetData>
</worksheet>`;
}

function createXlsxCell(value, rowIndex, columnIndex, isHeader) {
  const ref = `${columnName(columnIndex)}${rowIndex}`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}" s="${isHeader ? 1 : 2}"><v>${value}</v></c>`;
  }
  const text = value === null || value === undefined ? "" : String(value);
  return `<c r="${ref}" t="inlineStr" s="${isHeader ? 1 : 0}"><is><t>${xmlText(text)}</t></is></c>`;
}

function safeSheetName(name, index) {
  const cleaned = String(name || `Sheet${index + 1}`).replace(/[\[\]:*?/\\]/g, " ").trim();
  return (cleaned || `Sheet${index + 1}`).slice(0, 31);
}

function stringLengthForWidth(value) {
  if (value === null || value === undefined) return 0;
  return String(value).replace(/[^\x00-\xff]/g, "xx").length;
}

function columnName(index) {
  let name = "";
  let value = index;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function xmlText(value) {
  return String(value ?? "").replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]);
}

function xmlAttribute(value) {
  return xmlText(value).replace(/"/g, "&quot;");
}

function normalizeMoneyInput(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return roundMoney(number);
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function formatMoney(value) {
  return roundMoney(value).toFixed(2);
}

function formatQuantity(value) {
  const rounded = roundMoney(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function formatUnitPrice(value) {
  if (!Number.isFinite(value)) return "0.00";
  if (value > 0 && value < 0.01) return value.toFixed(4);
  return roundMoney(value).toFixed(2);
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
    note: "",
    checklist: [],
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
    note: "",
    checklist: [],
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
    note: "",
    checklist: [],
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
        {
          exportedAt: exportedAt.toISOString(),
          tasks: state.tasks,
          birthdays: state.birthdays,
          recurrences: state.recurrences,
          english: state.english,
          knowledge: state.knowledge,
          shopping: state.shopping,
        },
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

async function saveGeneratedFile(blob, filename, mimeType) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "Excel 工作簿",
            accept: { [mimeType]: [".xlsx"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "saved";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }
  downloadBackupFile(blob, filename);
  return "downloaded";
}

async function importTasks(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const shouldImport = await confirmDangerAction({
    title: "导入备份",
    message: "导入备份会覆盖当前任务、生日、周期、英语学习、知识文库和商品比价数据。建议先确认当前数据已经导出到坚果云。",
    confirmText: "导入",
  });
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
      state.recurrences = parsed.recurrences ? normalizeRecurrences(parsed.recurrences) : state.recurrences;
      state.english = normalizeEnglish(parsed.english);
      state.knowledge = parsed.knowledge ? normalizeKnowledge(parsed.knowledge) : state.knowledge;
      state.shopping = parsed.shopping ? normalizeShopping(parsed.shopping) : state.shopping;
      saveTasks();
      saveBirthdays();
      saveRecurrences();
      saveEnglish();
      saveKnowledge();
      saveShopping();
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
      recurrences: state.recurrences,
      english: state.english,
      knowledge: state.knowledge,
      shopping: state.shopping,
    }),
  );
}

async function restoreImportBackup() {
  const raw = readImportBackup();
  if (!raw) return;
  const shouldRestore = await confirmDangerAction({
    title: "恢复数据",
    message: "这会用最近一次导入前的本机数据覆盖当前任务、生日、周期、英语学习、知识文库和商品比价数据。",
    confirmText: "恢复",
  });
  if (!shouldRestore) return;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.tasks)) throw new Error("Invalid backup");
    state.tasks = normalizeTasks(parsed.tasks).filter((task) => task.title && typeof task.title === "string");
    state.birthdays = normalizeBirthdays(parsed.birthdays);
    state.recurrences = parsed.recurrences ? normalizeRecurrences(parsed.recurrences) : state.recurrences;
    state.english = normalizeEnglish(parsed.english);
    state.knowledge = parsed.knowledge ? normalizeKnowledge(parsed.knowledge) : state.knowledge;
    state.shopping = parsed.shopping ? normalizeShopping(parsed.shopping) : state.shopping;
    saveTasks();
    saveBirthdays();
    saveRecurrences();
    saveEnglish();
    saveKnowledge();
    saveShopping();
    render();
    showBackupStatus("已恢复数据");
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

function loadRecurrences() {
  try {
    const raw = localStorage.getItem(recurrenceStorageKey);
    if (raw) return normalizeRecurrences(JSON.parse(raw));
    return { items: [] };
  } catch {
    return { items: [] };
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

function loadKnowledge() {
  try {
    const raw = localStorage.getItem(knowledgeStorageKey);
    if (raw) return normalizeKnowledge(JSON.parse(raw));
    return normalizeKnowledge();
  } catch {
    return normalizeKnowledge();
  }
}

function loadShopping() {
  try {
    const raw = localStorage.getItem(shoppingStorageKey);
    if (raw) return normalizeShopping(JSON.parse(raw));
    return normalizeShopping();
  } catch {
    return normalizeShopping();
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

function normalizeRecurrences(recurrences = {}) {
  const source = Array.isArray(recurrences) ? recurrences : recurrences.items;
  const items = Array.isArray(source)
    ? source
        .filter((item) => item?.title && typeof item.title === "string")
        .map((item, index) => {
          const startDate = isISODate(item.startDate) ? item.startDate : toISODate(new Date());
          return {
            ...item,
            id: item.id || createId(),
            title: item.title,
            frequency: normalizeRecurrenceFrequency(item.frequency),
            startDate,
            endDate: isISODate(item.endDate) ? item.endDate : null,
            active: item.active !== false,
            priority: normalizePriority(item.priority),
            note: typeof item.note === "string" ? item.note : "",
            checklist: normalizeChecklist(item.checklist),
            order: normalizeNonNegativeInteger(item.order) || index + 1,
            records: normalizeRecurrenceRecords(item.records, startDate),
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || null,
          };
        })
    : [];
  return { items };
}

function normalizeRecurrenceFrequency(frequency = {}) {
  const type = ["daily", "weekly", "interval", "monthly"].includes(frequency.type) ? frequency.type : "daily";
  if (type === "weekly") {
    return {
      type,
      weekday: clampInteger(frequency.weekday, 1, 7, 1),
    };
  }
  if (type === "interval") {
    return {
      type,
      everyDays: clampInteger(frequency.everyDays, 2, 365, 2),
    };
  }
  if (type === "monthly") {
    return {
      type,
      monthDay: clampInteger(frequency.monthDay, 1, 31, 1),
    };
  }
  return { type: "daily" };
}

function normalizeRecurrenceRecords(records, startDate) {
  if (!records || typeof records !== "object") return {};
  return Object.fromEntries(
    Object.entries(records)
      .filter(([iso, record]) => isISODate(iso) && iso >= startDate && ["done", "missed", "skipped"].includes(record?.status))
      .map(([iso, record]) => [
        iso,
        {
          status: record.status,
          note: typeof record.note === "string" ? record.note : "",
          updatedAt: record.updatedAt || null,
        },
      ]),
  );
}

function normalizeShopping(shopping = {}) {
  const now = new Date().toISOString();
  const categories = normalizeShoppingCategories(shopping.categories, now);
  const categoryIds = new Set(categories.map((category) => category.id));
  const subcategories = normalizeShoppingSubcategories(shopping.subcategories, categoryIds, now);
  const subcategoryIds = new Set(subcategories.map((subcategory) => subcategory.id));
  return {
    categories,
    subcategories,
    products: normalizeShoppingProducts(shopping.products, categoryIds, subcategoryIds, now),
  };
}

function normalizeShoppingCategories(categories, now) {
  if (!Array.isArray(categories)) return [];
  return categories
    .filter((category) => category?.id && category?.name)
    .map((category, index) => ({
      id: String(category.id),
      name: String(category.name),
      order: normalizeNonNegativeInteger(category.order) || index + 1,
      createdAt: category.createdAt || now,
      updatedAt: category.updatedAt || null,
    }));
}

function normalizeShoppingSubcategories(subcategories, categoryIds, now) {
  if (!Array.isArray(subcategories)) return [];
  return subcategories
    .filter((subcategory) => subcategory?.id && subcategory?.name && categoryIds.has(String(subcategory.categoryId)))
    .map((subcategory, index) => ({
      id: String(subcategory.id),
      categoryId: String(subcategory.categoryId),
      name: String(subcategory.name),
      order: normalizeNonNegativeInteger(subcategory.order) || index + 1,
      createdAt: subcategory.createdAt || now,
      updatedAt: subcategory.updatedAt || null,
    }));
}

function normalizeShoppingProducts(products, categoryIds, subcategoryIds, now) {
  if (!Array.isArray(products)) return [];
  return products
    .filter((product) => product?.id && product?.name && categoryIds.has(String(product.categoryId)))
    .map((product, index) => {
      const subcategoryId = product.subcategoryId && subcategoryIds.has(String(product.subcategoryId))
        ? String(product.subcategoryId)
        : null;
      return {
        id: String(product.id),
        name: String(product.name),
        categoryId: String(product.categoryId),
        subcategoryId,
        unit: typeof product.unit === "string" ? product.unit : "",
        order: normalizeNonNegativeInteger(product.order) || index + 1,
        records: normalizeShoppingRecords(product.records, now),
        createdAt: product.createdAt || now,
        updatedAt: product.updatedAt || null,
      };
    });
}

function normalizeShoppingRecords(records, now) {
  if (!Array.isArray(records)) return [];
  return records
    .filter((record) => record?.id && isISODate(record.date) && record.platform)
    .map((record) => {
      const totalPrice = normalizeMoneyInput(record.totalPrice);
      const quantity = normalizeMoneyInput(record.quantity);
      return {
        id: String(record.id),
        date: record.date,
        name: typeof record.name === "string" ? record.name : "",
        platform: String(record.platform),
        totalPrice: totalPrice ?? 0,
        quantity: quantity && quantity > 0 ? quantity : 1,
        standardCode: normalizeShoppingStandardCode(record.standardCode),
        note: typeof record.note === "string" ? record.note : "",
        createdAt: record.createdAt || now,
        updatedAt: record.updatedAt || null,
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
    .map((group) => {
      const defaultPartSpeech = typeof group.defaultPartSpeech === "string" ? group.defaultPartSpeech : "";
      return {
        id: group.id || createId(),
        title: String(group.title),
        type: typeof group.type === "string" ? group.type : "自定义",
        defaultPartSpeech,
        words: normalizeEnglishGroupWords(group.words, defaultPartSpeech),
        note: typeof group.note === "string" ? group.note : "",
        createdAt: group.createdAt || new Date().toISOString(),
        updatedAt: group.updatedAt || null,
      };
    });
}

function normalizeEnglishGroupWords(words, defaultPartSpeech = "") {
  if (!Array.isArray(words)) return [];
  return words
    .map((item) => {
      if (typeof item === "string") {
        const word = item.trim();
        if (!word) return null;
        return {
          id: createId(),
          word,
          partSpeech: defaultPartSpeech,
          translation: "",
          note: "",
        };
      }
      if (!item?.word) return null;
      return {
        id: item.id || createId(),
        word: String(item.word),
        partSpeech: typeof item.partSpeech === "string" ? item.partSpeech : defaultPartSpeech,
        translation: typeof item.translation === "string" ? item.translation : "",
        note: typeof item.note === "string" ? item.note : "",
      };
    })
    .filter(Boolean);
}

function normalizeKnowledge(knowledge = {}) {
  const now = new Date().toISOString();
  const categories = normalizeKnowledgeCategories(knowledge.categories, now);
  const categoryIds = new Set(categories.map((category) => category.id));
  const documents = normalizeKnowledgeDocuments(knowledge.documents, categoryIds, now);
  return {
    categories,
    documents,
    trash: normalizeKnowledgeTrash(knowledge.trash, now),
  };
}

function normalizeKnowledgeCategories(categories, now) {
  const normalized = Array.isArray(categories)
    ? categories
        .filter((category) => category?.id && category?.name)
        .map((category, index) => ({
          id: String(category.id),
          name: String(category.name),
          order: normalizeNonNegativeInteger(category.order) || index + 1,
          createdAt: category.createdAt || now,
          updatedAt: category.updatedAt || null,
        }))
    : [];

  const defaultCategory = normalized.find((category) => category.id === "uncategorized");
  const withoutDefault = normalized.filter((category) => category.id !== "uncategorized");
  return [
    {
      id: "uncategorized",
      name: defaultCategory?.name || "未分类",
      order: normalizeNonNegativeInteger(defaultCategory?.order),
      createdAt: defaultCategory?.createdAt || now,
      updatedAt: defaultCategory?.updatedAt || null,
    },
    ...withoutDefault,
  ];
}

function normalizeKnowledgeDocuments(documents, categoryIds, now) {
  if (!Array.isArray(documents)) return [];
  return documents
    .filter((doc) => doc?.id && typeof doc.title === "string")
    .map((doc, index) => {
      const ids = Array.isArray(doc.categoryIds)
        ? doc.categoryIds.map(String).filter((id) => categoryIds.has(id))
        : [];
      const normalizedIds = ids.length ? Array.from(new Set(ids)) : ["uncategorized"];
      return {
        id: String(doc.id),
        title: doc.title || "未命名文档",
        content: typeof doc.content === "string" ? doc.content : "",
        categoryIds: normalizedIds,
        orderByCategory: normalizeKnowledgeOrderByCategory(doc.orderByCategory, normalizedIds, index + 1),
        sourceFileName: typeof doc.sourceFileName === "string" ? doc.sourceFileName : "",
        createdAt: doc.createdAt || now,
        updatedAt: doc.updatedAt || doc.createdAt || now,
      };
    });
}

function normalizeKnowledgeOrderByCategory(orderByCategory, categoryIds, fallbackOrder) {
  const source = orderByCategory && typeof orderByCategory === "object" ? orderByCategory : {};
  return Object.fromEntries(
    categoryIds.map((categoryId) => [categoryId, normalizeNonNegativeInteger(source[categoryId]) || fallbackOrder]),
  );
}

function normalizeKnowledgeTrash(trash, now) {
  if (!Array.isArray(trash)) return [];
  return trash
    .filter((item) => item?.id && (item.type === "category" || item.type === "document"))
    .map((item) => ({
      ...item,
      id: String(item.id),
      deletedAt: item.deletedAt || now,
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
    note: typeof task.note === "string" ? task.note : "",
    checklist: normalizeChecklist(task.checklist),
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
          note: typeof child.note === "string" ? child.note : "",
          checklist: normalizeChecklist(child.checklist),
          order: normalizeOrder(child),
          createdAt: child.createdAt || new Date().toISOString(),
          completedAt: child.completedAt || null,
          canceledAt: null,
        }))
    : [];
}

function normalizeChecklist(checklist) {
  if (!Array.isArray(checklist)) return [];
  return checklist
    .filter((item) => typeof item?.text === "string" && item.text.trim())
    .map((item) => ({
      id: item.id || createId(),
      text: item.text.trim(),
      done: Boolean(item.done),
      createdAt: item.createdAt || new Date().toISOString(),
      completedAt: item.done ? item.completedAt || new Date().toISOString() : null,
    }));
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

function saveRecurrences() {
  localStorage.setItem(recurrenceStorageKey, JSON.stringify(state.recurrences));
}

function saveEnglish() {
  localStorage.setItem(englishStorageKey, JSON.stringify(state.english));
}

function saveKnowledge() {
  localStorage.setItem(knowledgeStorageKey, JSON.stringify(state.knowledge));
}

function saveShopping() {
  localStorage.setItem(shoppingStorageKey, JSON.stringify(state.shopping));
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

function markMissedRecurrences() {
  const today = toISODate(new Date());
  const yesterday = toISODate(addDays(parseISODate(today), -1));
  let changed = false;

  state.recurrences.items = state.recurrences.items.map((item) => {
    if (!item.active && !item.endDate) return item;
    const end = item.endDate && item.endDate < yesterday ? item.endDate : yesterday;
    if (end < item.startDate) return item;

    const records = { ...item.records };
    recurrenceDueDates(item, item.startDate, end).forEach((iso) => {
      if (records[iso]) return;
      records[iso] = {
        status: "missed",
        note: "",
        updatedAt: new Date().toISOString(),
      };
      changed = true;
    });
    return changed ? { ...item, records } : item;
  });

  if (changed) saveRecurrences();
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
    ...state.recurrences.items.map((item) => item.order || 0),
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
      note: "",
      checklist: [],
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
      note: "",
      checklist: [],
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
      note: "",
      checklist: [],
      order: now + 2,
      createdAt: new Date().toISOString(),
      completedAt: null,
      canceledAt: null,
    },
  ];
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js?v=68").catch(() => {});
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

function isISODate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && toISODate(parseISODate(value)) === value;
}

function isoWeekday(date) {
  return date.getDay() || 7;
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
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(parseISODate(value));
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
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function cssEscape(value) {
  const text = String(value ?? "");
  if (window.CSS?.escape) return window.CSS.escape(text);
  return text.replace(/["\\]/g, "\\$&");
}
