"use strict";
(function () {
  //elements
  const addBtn = document.querySelector("#add-task-btn");
  const taskTodo = document.querySelector("#tasks-todo");
  const taskProgress = document.querySelector("#tasks-in-progress");
  const taskComplete = document.querySelector("#tasks-completed");
  const taskAppear = document.querySelector("#columns-container");
  const modal = document.getElementById("modal-show");
  const taskModel = document.getElementById("task-modal");
  const modelTitle = document.getElementById("modal-title");
  const modelIcon = document.querySelector("#modal-icon");
  const modelClose = document.querySelector("#close-modal-btn");
  const modelForm = document.getElementById("task-form");
  const modelFormTitle = document.getElementById("task-title");
  const modelFormError = document.getElementById("title-error");
  const modelFormProf = document.getElementById("task-priority");
  const modelFormDate = document.getElementById("task-due-date");
  const modelFormDateError = document.getElementById("date-error");
  const modelFormDesc = document.getElementById("task-description");
  const modelFormDescError = document.getElementById("description-error");
  const modelFormDescCount = document.getElementById("char-count");
  const cancelBtn = document.getElementById("cancel-btn");
  const sumbitBtn = document.querySelector("#submit-btn");
  const submitBtnText = document.getElementById("submit-btn-text");

  /* ---------- state + localStorage ---------- */
  const STORAGE_KEY = "Total-Tasks";
  let tasks = [];
  let nextId = 1;
  let editingTaskId = null;

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        tasks = JSON.parse(raw);
        for (const t of tasks) {
          if (t.id >= nextId) nextId = t.id + 1;
        }
      }
    } catch {
      tasks = [];
    }
  }

  /* ---------- helpers ---------- */
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function dueTime(d) {
    return new Date(d + "T00:00:00").getTime();
  }

  function todayMid() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  }

  function isPast(d) {
    return dueTime(d) < todayMid();
  }

  function isOverdue(d) {
    return dueTime(d) < Date.now();
  }

  function isDueSoon(d) {
    return !isOverdue(d) && dueTime(d) - Date.now() <= 2 * 86400000;
  }

  function fmtDate(d) {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "Just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }

  function emptyHTML() {
    return `<div class="flex flex-col items-center justify-center py-12 text-slate-400">
      <i class="fa-regular fa-folder-open text-4xl mb-3 opacity-50"></i>
      <p class="text-sm">No tasks yet</p>
      <p class="text-xs mt-1">Click + to add one</p>
    </div>`;
  }
  function renumberTasks() {
    for (let i = 0; i < tasks.length; i++) {
      tasks[i].id = i + 1; // #002 → #001, #003 → #002 ...
    }
    nextId = tasks.length + 1; // next new task gets the next number
  }

  /* ---------- errors ---------- */
  function showTitleError(msg) {
    if (modelFormError) {
      modelFormError.textContent = msg;
      modelFormError.classList.remove("hidden");
      modelFormError.classList.add("text-red-500");
    }
    if (modelFormTitle) {
      // Add Error Styles (Red)
      modelFormTitle.classList.add(
        "border-red-500",
        "focus:border-red-500",
        "focus:ring-red-500",
      );

      modelFormTitle.classList.remove(
        "border-slate-200",
        "border-slate-300",
        "focus:border-indigo-500",
        "focus:ring-indigo-500",
      );
    }
  }

  function clearTitleError() {
    if (modelFormError) {
      modelFormError.textContent = "";
      modelFormError.classList.add("hidden");
      modelFormError.classList.remove("text-red-500");
    }
    if (modelFormTitle) {
      modelFormTitle.classList.remove(
        "border-red-500",
        "focus:border-red-500",
        "focus:ring-red-500",
      );

      modelFormTitle.classList.add(
        "border-slate-200",
        "focus:border-indigo-500",
        "focus:ring-indigo-500",
      );
    }
  }
  function showDateError(msg) {
    if (modelFormDateError) {
      modelFormDateError.textContent = msg;
      modelFormDateError.classList.remove("hidden");
    }
    if (modelFormDate) {
      modelFormDate.classList.add("border-red-500");
      modelFormDate.classList.remove("border-slate-200");
    }
  }

  function clearDateError() {
    if (modelFormDateError) {
      modelFormDateError.textContent = "";
      modelFormDateError.classList.add("hidden");
    }
    if (modelFormDate) {
      modelFormDate.classList.remove("border-red-500");
      modelFormDate.classList.add("border-slate-200");
    }
  }

  /* ---------- task card ---------- */
  function createTaskCardHTML(t) {
    const badge = {
      Low: {
        bg: "bg-blue-50",
        text: "text-blue-600",
        dot: "bg-blue-500",
        label: "Low",
      },
      Medium: {
        bg: "bg-amber-50",
        text: "text-amber-600",
        dot: "bg-amber-500",
        label: "Medium",
      },
      High: {
        bg: "bg-red-50",
        text: "text-red-600",
        dot: "bg-red-500",
        label: "High Priority",
      },
    };

    const p = badge[t.priority] || badge.Medium;

    const over =
      t.dueDate !== "" && t.status !== "completed" && isOverdue(t.dueDate);
    const soon =
      t.dueDate !== "" && t.status !== "completed" && isDueSoon(t.dueDate);

    let badges = `<span class="${p.bg} ${p.text} text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 rounded-full ${p.dot}"></span>${p.label}</span>`;

    if (over && t.status !== "completed") {
      badges += `  <span class="bg-red-100 text-red-600 text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1"> <i class="fa-solid fa-triangle-exclamation"></i>  Overdue</span>`;
    } else if (soon && t.status !== "completed") {
      badges += ` <span class="bg-orange-100 text-orange-600 text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide"> Due Soon  </span>`;
    }

    const dateRow =
      t.dueDate !== ""
        ? `<div class="flex items-center gap-3 text-xs text-slate-400 pb-3 mb-3 border-b border-slate-100">
          <div class="flex items-center gap-1.5 ${over ? "text-red-500" : soon ? "text-orange-500" : ""}"><i class="fa-regular fa-calendar"></i><span>${fmtDate(t.dueDate)}</span></div>
          <div class="flex items-center gap-1.5"><i class="fa-regular fa-clock"></i><span>${timeAgo(t.createdAt)}</span></div>
        </div>`
        : `<div class="flex items-center gap-3 text-xs text-slate-400 pb-3 mb-3 border-b border-slate-100">
          <div class="flex items-center gap-1.5"><i class="fa-regular fa-clock"></i><span>${timeAgo(t.createdAt)}</span></div>
        </div>`;

    let buttons = "";
    if (t.status === "todo") {
      buttons = ` <button class="move-btn  text-xs px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 bg-amber-100 text-amber-700 hover:bg-amber-200" data-task-id="${t.id}" data-target="in-progress">
          <i class="fa-solid fa-play"></i> <span class="pointer-events-none">Start</span>
        </button>
      
        <button class="move-btn text-xs px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 bg-emerald-100 text-emerald-700 hover:bg-emerald-200" data-task-id="${t.id}" data-target="completed">
          <i class="fa-solid fa-check pointer-events-none"></i> <span class="pointer-events-none">Complete</span>
        </button>`;
    } else if (t.status === "in-progress") {
      buttons = ` <button class="move-btn text-[11px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700" data-task-id="${t.id}" data-target="todo">
          <i class="fa-solid fa-arrow-rotate-left pointer-events-none"></i> <span class="pointer-events-none">To Do</span>
        </button>
      
        <button class="move-btn text-[11px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 bg-emerald-100 text-emerald-700 hover:bg-emerald-200" data-task-id="${t.id}" data-target="completed">
          <i class="fa-solid fa-check pointer-events-none"></i> <span class="pointer-events-none">Complete</span>
        </button>
`;
    } else {
      buttons = `  <button class="move-btn text-[11px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700" data-task-id="${t.id}" data-target="todo">
          <i class="fa-solid fa-arrow-rotate-left pointer-events-none"></i> <span class="pointer-events-none">To Do</span>
        </button>
      
        <button class="move-btn text-[11px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 bg-amber-100 text-amber-700 hover:bg-amber-200" data-task-id="${t.id}" data-target="in-progress">
          <i class="fa-solid fa-play pointer-events-none"></i> <span class="pointer-events-none">Start</span>
        </button>
`;
    }

    return `<div class="group bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-200 ${t.status === "completed" ? "opacity-75" : ""}    ${over ? "ring-2 ring-red-100 border-red-200" : ""}" data-task-id="${t.id}">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full ${t.status === "todo" ? "bg-slate-400" : t.status === "in-progress" ? "bg-amber-500" : "bg-emerald-500"}"></span>
          <span class="text-[10px] font-medium text-slate-400 uppercase tracking-wider">#${String(t.id).padStart(3, "0")}</span>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="edit-btn text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 w-7 h-7 rounded-lg flex items-center justify-center transition-colors" data-task-id="${t.id}" title="Edit task"><i class="fa-solid fa-pen text-xs pointer-events-none"></i></button>
          <button class="delete-btn text-slate-400 hover:text-red-500 hover:bg-red-50 w-7 h-7 rounded-lg flex items-center justify-center transition-colors" data-task-id="${t.id}" title="Delete task"><i class="fa-solid fa-trash-can text-xs pointer-events-none"></i></button>
        </div>
      </div>
      <h3 class="font-semibold mb-2 ${t.status === "completed" ? "line-through text-slate-500" : t.status !== "completed" ? " text-slate-800" : ""}">${escapeHtml(t.title)}</h3>
      ${t.description ? `<p class=""text-slate-400 text-sm mb-4 leading-relaxed line-clamp-2">${escapeHtml(t.description)}</p>` : ""}
      <div class="flex flex-wrap items-center gap-2 mb-4">${badges}
      
      ${
        t.status === "completed"
          ? `<span class="bg-emerald-100 text-emerald-600 text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
              <i class="fa-solid fa-check"></i>
              Done
            </span>`
          : ""
      }
      </div>
      ${dateRow}
      <div class="flex flex-wrap gap-2">${buttons}</div>
    </div>`;
  }

  /* ---------- render ---------- */
  function renderColumns() {
    // Step 1: Match each status name to its actual HTML container element
    const columnElements = {
      todo: taskTodo,
      "in-progress": taskProgress,
      completed: taskComplete,
    };

    // Step 2: Loop through the 3 possible statuses
    const allStatuses = ["todo", "in-progress", "completed"];

    for (const currentStatus of allStatuses) {
      // Get the correct HTML column for this status (e.g., the "To Do" column)
      const columnContainer = columnElements[currentStatus];

      // Safety check: If the HTML element doesn't exist, skip to the next status
      if (!columnContainer) continue;

      // Step 3: Filter the main 'tasks' array to only get tasks for this specific column
      const tasksForThisColumn = tasks.filter(
        (task) => task.status === currentStatus,
      );

      // Step 4: Update the task count text in the column header (e.g., "2 tasks" or "1 task")
      const columnHeader = columnContainer.parentElement;
      if (columnHeader) {
        const countTextElement = columnHeader.querySelector(
          ".text-xs.text-slate-400",
        );
        if (countTextElement) {
          const count = tasksForThisColumn.length;
          const taskWord = count === 1 ? "task" : "tasks"; // Handle singular/plural
          countTextElement.textContent = `${count} ${taskWord}`;
        }
      }

      // Step 5: Inject the HTML into the column
      if (tasksForThisColumn.length === 0) {
        // If there are no tasks, show the empty state message
        columnContainer.innerHTML = emptyHTML();
      } else {
        // Convert each task object into an HTML string, then combine them into one big string
        const htmlStringsArray = tasksForThisColumn.map(createTaskCardHTML);
        const combinedHTML = htmlStringsArray.join("");
        columnContainer.innerHTML = combinedHTML;
      }
    }
  }

  /* ---------- modal ---------- */
  function setSubmitMode(edit) {
    if (modelTitle)
      modelTitle.textContent = edit ? "Edit Task" : "Create New Task";
    if (submitBtnText)
      submitBtnText.textContent = edit ? "Save Changes" : "Add Task";
    if (sumbitBtn) {
      const icon = sumbitBtn.querySelector("i");
      if (icon)
        icon.className = edit ? "fa-solid fa-floppy-disk" : "fa-solid fa-plus";
    }
  }

  function openModal(taskId = null) {
    if (
      !modal ||
      !modelForm ||
      !modelFormTitle ||
      !modelFormProf ||
      !modelFormDate ||
      !modelFormDesc ||
      !modelFormDescCount
    )
      return;

    editingTaskId = taskId;
    modelForm.reset();
    clearTitleError();
    clearDateError();
    if (modelFormDescError) modelFormDescError.textContent = "";
    modelFormDescCount.textContent = "0/500";

    if (taskId !== null) {
      const t = tasks.find((x) => x.id === taskId);
      if (!t) return;
      modelFormTitle.value = t.title;
      modelFormProf.value = t.priority;
      modelFormDate.value = t.dueDate;
      modelFormDesc.value = t.description;
      modelFormDescCount.textContent = `${t.description.length}/500`;
      setSubmitMode(true);
    } else {
      modelFormProf.value = "Medium";
      setSubmitMode(false);
    }
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modelFormTitle.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    editingTaskId = null;
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className =
      "fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.remove();
    }, 2500);
  }

  /* ---------- submit ---------- */
  function handleSubmit(e) {
    e.preventDefault(); // Prevent the page from reloading

    // 1. Safety Check: Ensure all required form elements exist
    if (!modelFormTitle || !modelFormProf || !modelFormDate || !modelFormDesc) {
      return;
    }

    // 2. Get and clean form values
    const titleValue = modelFormTitle.value.trim();
    const priorityValue = modelFormProf.value;
    const dueDateValue = modelFormDate.value;
    const descriptionValue = modelFormDesc.value.trim();

    // 3. Validate Title
    if (titleValue === "") {
      showTitleError("Task title is required");
      return; // Stop here, don't proceed
    }
    if (titleValue.length < 3) {
      showTitleError("Title must be at least 3 characters");
      return; // Stop here, don't proceed
    }
    clearTitleError(); // Title is valid, clear any old errors

    // 4. Validate Due Date
    if (dueDateValue !== "" && isPast(dueDateValue)) {
      showDateError("Due date cannot be in the past");
      return; // Stop here, don't proceed
    }
    clearDateError(); // Date is valid, clear any old errors

    // 5. Process the Task (Update existing OR Create new)
    if (editingTaskId !== null) {
      // --- UPDATE EXISTING TASK ---
      const taskToUpdate = tasks.find((task) => task.id === editingTaskId);

      if (taskToUpdate) {
        taskToUpdate.title = titleValue;
        taskToUpdate.priority = priorityValue;
        taskToUpdate.dueDate = dueDateValue;
        taskToUpdate.description = descriptionValue;
      }

      saveTasks();
      renderColumns();
      closeModal();
      showToast("Task updated successfully!");
    } else {
      // --- CREATE NEW TASK ---
      const newTask = {
        id: nextId++,
        title: titleValue,
        priority: priorityValue,
        dueDate: dueDateValue,
        description: descriptionValue,
        status: "todo", // New tasks always start in "To Do"
        createdAt: new Date().toISOString(),
      };

      tasks.push(newTask);
      saveTasks();
      renderColumns();
      closeModal();
      showToast("Task added successfully!");
    }
  }

  /* ---------- events ---------- */
  if (addBtn) {
    addBtn.addEventListener("click", function () {
      openModal(null);
    });
  }

  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
  if (modelClose) modelClose.addEventListener("click", closeModal);

  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });

  if (modelForm) modelForm.addEventListener("submit", handleSubmit);

  if (sumbitBtn) {
    sumbitBtn.addEventListener("click", function (e) {
      e.preventDefault();
      handleSubmit(e);
    });
  }

  if (modelFormTitle) {
    modelFormTitle.addEventListener("input", clearTitleError);
  }

  if (modelFormDate) {
    modelFormDate.addEventListener("input", clearDateError);
  }

  if (modelFormDesc) {
    modelFormDesc.addEventListener("input", function () {
      if (!modelFormDescCount) return;
      const len = modelFormDesc.value.length;
      modelFormDescCount.textContent = `${len}/500`;
      if (len > 500) modelFormDescCount.classList.add("text-red-500");
      else modelFormDescCount.classList.remove("text-red-500");
    });
  }

  if (taskAppear) {
    taskAppear.addEventListener("click", function (e) {
      const target = e.target;

      const del = target.closest(".delete-btn");
      if (del) {
        const id = Number(del.getAttribute("data-task-id"));
        tasks = tasks.filter((t) => t.id !== id);
        if (tasks.length === 0) {
          nextId = 1;
        }
        renumberTasks();
        saveTasks();
        renderColumns();
        showToast("Task deleted successfully!");
        return;
      }

      const edit = target.closest(".edit-btn");
      if (edit) {
        openModal(Number(edit.getAttribute("data-task-id")));
        return;
      }

      const move = target.closest(".move-btn");
      if (move) {
        const id = Number(move.getAttribute("data-task-id"));
        const go = move.getAttribute("data-target");
        if (!go) return;
        for (const t of tasks) {
          if (t.id === id) {
            t.status = go;
            break;
          }
        }
        saveTasks();
        renderColumns();
      }
    });
  }

  /* ---------- start ---------- */
  loadTasks();
  renderColumns();
})();
