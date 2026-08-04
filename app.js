const storageKey = "workbuddy.tasks.v1";
const legacyStorageKeys = ["daily-planner.tasks.v1"];
const importBackupKey = "workbuddy.import-backup.v1";
const legacyImportBackupKeys = ["daily-planner.import-backup.v1"];

const state = {
  tasks: loadTasks(),
  selectedDate: toISODate(new Date()),
  view: "today",
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
  editing: null,
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
  backupStatus: document.querySelector("#backupStatus"),
  restoreImportBackup: document.querySelector("#restoreImportBackup"),
  exportBtn: document.querySelector("#exportBtn"),
  importInput: document.querySelector("#importInput"),
  taskTemplate: document.querySelector("#taskTemplate"),
  segments: document.querySelectorAll(".segment"),
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
  search: "搜索",
};

init();

function init() {
  rolloverOpenScheduleTasks();
  elements.taskDate.value = state.selectedDate;
  elements.todayText.textContent = formatLongDate(new Date());
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

  elements.segments.forEach((segment) => {
    segment.addEventListener("click", () => {
      state.view = segment.dataset.view;
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

  elements.exportBtn.addEventListener("click", exportTasks);
  elements.importInput.addEventListener("change", importTasks);
  elements.restoreImportBackup.addEventListener("click", restoreImportBackup);
}

function render() {
  renderDateStrip();
  renderSegments();
  renderStatusFilters();
  renderSearchPanel();
  renderTaskMode();
  renderPrioritySelect();
  renderSearchPrioritySelect();
  renderStats();
  renderList();
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

function renderStatusFilters() {
  const visible = state.view !== "search";
  elements.statusFilters.hidden = !visible;
  elements.statusFilterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.statusFilter === currentStatusFilter());
  });
}

function renderSearchPanel() {
  elements.searchPanel.hidden = state.view !== "search";
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
  elements.doneCount.textContent = totalCompletedUnits();
}

function renderList() {
  const entries = filteredEntries();
  elements.taskList.innerHTML = "";
  elements.taskList.classList.toggle("is-medium-list", state.view === "medium" || state.view === "search");
  elements.taskList.classList.toggle("is-reorderable", canReorderCurrentView());
  elements.viewTitle.textContent = currentViewTitle();
  elements.viewMeta.textContent = currentViewMeta(entries);
  elements.emptyState.hidden = state.view === "schedule" || entries.length > 0;

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

function filteredEntries() {
  if (state.view === "search") return searchResults();
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
  if (state.view === "today") return formatShortDate(parseISODate(state.selectedDate));
  return viewTitles[state.view];
}

function currentViewMeta(entries) {
  if (state.view === "search") return `${countSearchResults(entries)} 项匹配`;
  if (state.view === "medium") return `${entries.length} 个目标 · ${formatRatio(goalCompletionStats(allMediumGoals()))} 已完成`;
  const canceled = canceledCount(entries);
  return `${formatRatio(unitCompletionStats(entries))} 已完成${canceled ? ` · ${canceled} 已取消` : ""}`;
}

function countSearchResults(results) {
  return results.reduce((total, result) => total + (result.kind === "task" ? 1 : 1 + result.children.length), 0);
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
  return ["today", "medium"].includes(state.view) && currentStatusFilter() === "all";
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

async function exportTasks() {
  const exportedAt = new Date();
  const filename = `Workbuddy-${formatFileStamp(exportedAt)}.json`;
  const blob = new Blob([JSON.stringify({ exportedAt: exportedAt.toISOString(), tasks: state.tasks }, null, 2)], {
    type: "application/json",
  });
  const file = new File([blob], filename, { type: "application/json" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: "Workbuddy 备份",
        text: "Workbuddy 任务数据备份",
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

  const shouldImport = confirm("导入备份会覆盖当前任务。建议先确认当前数据已经导出到坚果云。继续导入吗？");
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
      saveTasks();
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
    }),
  );
}

function restoreImportBackup() {
  const raw = readImportBackup();
  if (!raw) return;
  const shouldRestore = confirm("这会用最近一次导入前的本机数据覆盖当前任务。继续恢复吗？");
  if (!shouldRestore) return;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.tasks)) throw new Error("Invalid backup");
    state.tasks = normalizeTasks(parsed.tasks).filter((task) => task.title && typeof task.title === "string");
    saveTasks();
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

function sameDate(value, isoDate) {
  if (!value) return false;
  return toISODate(new Date(value)) === isoDate;
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
