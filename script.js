const taskInput = document.getElementById("task-input");
const addButton = document.getElementById("add-task");
const taskList = document.getElementById("task-list");
const taskCount = document.getElementById("task-count");
const progressText = document.getElementById("progress-text");
const progressBar = document.getElementById("progress-bar");

// Browser se saved tasks load karo
let tasks = JSON.parse(localStorage.getItem("studentTasks")) || [];
/* ===== Daily Study History ===== */

let studyHistory =
    JSON.parse(localStorage.getItem("dailyStudyHistory")) || {};

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function saveStudyHistory() {
    localStorage.setItem(
        "dailyStudyHistory",
        JSON.stringify(studyHistory)
    );
}

function recordTaskCompletion(wasCompleted, isCompleted) {
    if (wasCompleted === isCompleted) return;

    const today = getLocalDateKey();

    if (!studyHistory[today]) {
        studyHistory[today] = 0;
    }

    studyHistory[today] += isCompleted ? 1 : -1;

    if (studyHistory[today] <= 0) {
        delete studyHistory[today];
    }

    saveStudyHistory();
}

function saveTasks() {
    localStorage.setItem("studentTasks", JSON.stringify(tasks));
}

function renderTasks() {
    taskList.innerHTML = "";

    const searchInput = document.getElementById("task-search");
    const statusFilter = document.getElementById("status-filter");
    const priorityFilter = document.getElementById("priority-filter");

    const searchText = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const selectedStatus = statusFilter
        ? statusFilter.value
        : "all";

    const selectedPriority = priorityFilter
        ? priorityFilter.value
        : "all";

    // Original task indexes ko preserve karo
    const filteredTasks = tasks
        .map((task, index) => ({ task, index }))
        .filter(({ task }) => {
            const matchesSearch = task.text
                .toLowerCase()
                .includes(searchText);

            const matchesStatus =
                selectedStatus === "all" ||
                (selectedStatus === "pending" && !task.completed) ||
                (selectedStatus === "completed" && task.completed);

            const matchesPriority =
                selectedPriority === "all" ||
                (task.priority || "Medium") === selectedPriority;

            return matchesSearch && matchesStatus && matchesPriority;
        });

    if (filteredTasks.length === 0) {
        taskList.textContent = tasks.length === 0
            ? "No tasks added yet."
            : "No matching tasks found.";
    }

    filteredTasks.forEach(({ task, index }) => {
        const taskItem = document.createElement("li");
        const taskLabel = document.createElement("span");
        const completeButton = document.createElement("button");
        const deleteButton = document.createElement("button");

        taskLabel.textContent =
            `${task.text} [${task.priority || "Medium"}]`;

        taskLabel.classList.add(
            `priority-${(task.priority || "Medium").toLowerCase()}`
        );

        if (task.completed) {
            taskLabel.style.textDecoration = "line-through";
        }

        completeButton.textContent = task.completed ? "Undo" : "Done";
        deleteButton.textContent = "Delete";

        completeButton.addEventListener("click", function () {
            const wasCompleted = tasks[index].completed;
            tasks[index].completed = !wasCompleted;

            // First completion par hi XP do.
            // Undo karke dobara complete karne se extra XP nahi milega.
            if (!wasCompleted && !tasks[index].xpAwarded) {
                tasks[index].xpAwarded = true;
                awardXP(10, "Task completed");
            }

            // Daily study history update karo
            if (typeof recordTaskCompletion === "function") {
                recordTaskCompletion(
                    wasCompleted,
                    tasks[index].completed
                );
            }

            saveTasks();
            renderTasks();
        });

        deleteButton.addEventListener("click", function () {
            tasks.splice(index, 1);
            saveTasks();
            renderTasks();
        });

        taskItem.append(
            taskLabel,
            document.createTextNode(" "),
            completeButton,
            document.createTextNode(" "),
            deleteButton
        );

        taskList.appendChild(taskItem);
    });

    updateTaskCount();
}

function updateTaskCount() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;

    taskCount.textContent = `${totalTasks} Tasks`;

    const progress = totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100);

    progressText.textContent = `${progress}% Completed`;
    progressBar.value = progress;
    renderStatistics();
}
/* ===== Streak and Weekly Statistics ===== */

function renderStatistics() {
    const streakElement = document.getElementById("current-streak");
    const bestElement = document.getElementById("best-streak");
    const weeklyCompletedElement =
        document.getElementById("weekly-completed");
    const weeklySummaryElement =
        document.getElementById("weekly-summary");
    const weeklyChart = document.getElementById("weekly-chart");

    // Recent activity dates
    const today = getLocalDateKey();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getLocalDateKey(yesterdayDate);

    // Current streak: today, or yesterday if today has no activity yet
    let streak = 0;
    const cursor = new Date();

    if ((studyHistory[today] || 0) <= 0) {
        cursor.setDate(cursor.getDate() - 1);
    }

    while (true) {
        const key = getLocalDateKey(cursor);

        if ((studyHistory[key] || 0) <= 0) break;

        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }

    // Best streak across recorded history
    const activeDates = Object.keys(studyHistory)
        .filter(date => studyHistory[date] > 0)
        .sort();

    let bestStreak = 0;
    let runningStreak = 0;
    let previousDate = null;

    activeDates.forEach(date => {
        const currentDate = new Date(date + "T12:00:00");

        if (previousDate) {
            const difference =
                (currentDate - previousDate) / (1000 * 60 * 60 * 24);

            runningStreak = difference === 1
                ? runningStreak + 1
                : 1;
        } else {
            runningStreak = 1;
        }

        bestStreak = Math.max(bestStreak, runningStreak);
        previousDate = currentDate;
    });

    streakElement.textContent =
        `${streak} ${streak === 1 ? "day" : "days"}`;

    bestElement.textContent =
        `${bestStreak} ${bestStreak === 1 ? "day" : "days"}`;

    // Current week, Monday to Sunday
    const now = new Date();
    const monday = new Date(now);
    const dayNumber = (now.getDay() + 6) % 7;

    monday.setDate(now.getDate() - dayNumber);
    monday.setHours(12, 0, 0, 0);

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dailyValues = [];

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);

        const key = getLocalDateKey(date);

        dailyValues.push({
            label: weekDays[i],
            count: studyHistory[key] || 0,
            isFuture: date > now
        });
    }

    const weeklyTotal = dailyValues.reduce(
        (sum, day) => sum + day.count,
        0
    );

    const activeDays = dailyValues.filter(
        day => day.count > 0
    ).length;

    weeklyCompletedElement.textContent =
        `${weeklyTotal} tasks completed`;

    weeklySummaryElement.textContent =
        `${activeDays} of 7 days active this week`;

    // Draw weekly bar chart
    weeklyChart.innerHTML = "";

    const maxCount = Math.max(
        1,
        ...dailyValues.map(day => day.count)
    );

    dailyValues.forEach(day => {
        const dayColumn = document.createElement("div");
        dayColumn.className = "week-day";

        const countLabel = document.createElement("strong");
        countLabel.textContent = day.isFuture ? "—" : day.count;

        const track = document.createElement("div");
        track.className = "week-bar-track";

        const bar = document.createElement("div");
        bar.className = "week-bar";

        bar.style.height = day.isFuture
            ? "0%"
            : `${(day.count / maxCount) * 100}%`;

        bar.title = `${day.label}: ${day.count} completed`;

        track.appendChild(bar);

        const dayLabel = document.createElement("small");
        dayLabel.textContent = day.label;

        dayColumn.append(countLabel, track, dayLabel);
        weeklyChart.appendChild(dayColumn);
    });
}

addButton.addEventListener("click", function () {
    const taskText = taskInput.value.trim();

    if (taskText === "") {
        alert("Please enter a task!");
        return;
    }

    const priority = document.getElementById("task-priority").value;

    tasks.push({
        text: taskText,
        completed: false,
        priority: priority
    });

    saveTasks();
    renderTasks();
    taskInput.value = "";
});

// Page open hone par saved tasks dikhao
renderTasks();

const eventNameInput = document.getElementById("event-name");
const eventDateInput = document.getElementById("event-date");
const addEventButton = document.getElementById("add-event");
const eventList = document.getElementById("event-list");
const eventCount = document.getElementById("event-count");

let events = JSON.parse(localStorage.getItem("studentEvents")) || [];

function saveEvents() {
    localStorage.setItem("studentEvents", JSON.stringify(events));
}

function renderEvents() {
    eventList.innerHTML = "";

    events.forEach((event, index) => {
        const li = document.createElement("li");
        const eventInfo = document.createElement("span");
        const deleteButton = document.createElement("button");

        eventInfo.textContent = `${event.name} — ${event.date}`;
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", function () {
            events.splice(index, 1);
            saveEvents();
            renderEvents();
        });

        li.append(
            eventInfo,
            document.createTextNode(" "),
            deleteButton
        );

        eventList.appendChild(li);
    });

    eventCount.textContent = events.length === 0
        ? "No upcoming events"
        : `${events.length} Upcoming Event(s)`;
}

addEventButton.addEventListener("click", function () {
    const name = eventNameInput.value.trim();
    const date = eventDateInput.value;

    if (name === "" || date === "") {
        alert("Please enter event name and date!");
        return;
    }

    events.push({ name, date });
    saveEvents();
    renderEvents();

    eventNameInput.value = "";
    eventDateInput.value = "";
});

renderEvents();

const subjectInput = document.getElementById("subject-name");
const dayInput = document.getElementById("study-day");
const startInput = document.getElementById("study-start");
const endInput = document.getElementById("study-end");
const addStudyButton = document.getElementById("add-study");
const timetableList = document.getElementById("timetable-list");

let studySessions =
    JSON.parse(localStorage.getItem("studyTimetable")) || [];

function saveTimetable() {
    localStorage.setItem(
        "studyTimetable",
        JSON.stringify(studySessions)
    );
}

function renderTimetable() {
    timetableList.innerHTML = "";

    const days = [
        "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday", "Sunday"
    ];

    days.forEach(day => {
        const daySessions = studySessions
            .filter(session => session.day === day)
            .sort((a, b) => a.start.localeCompare(b.start));

        if (daySessions.length === 0) return;

        const dayHeading = document.createElement("h3");
        dayHeading.textContent = day;
        timetableList.appendChild(dayHeading);

        daySessions.forEach(session => {
            const row = document.createElement("div");
            row.className = "study-session";

            const details = document.createElement("span");
            details.textContent =
                `${session.subject} | ${session.start} - ${session.end}`;

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", function () {
                studySessions = studySessions.filter(
                    item => item.id !== session.id
                );

                saveTimetable();
                renderTimetable();
            });

            row.append(details, deleteButton);
            timetableList.appendChild(row);
        });
    });

    if (studySessions.length === 0) {
        timetableList.textContent = "No study sessions added yet.";
    }
}

addStudyButton.addEventListener("click", function () {
    const subject = subjectInput.value.trim();
    const day = dayInput.value;
    const start = startInput.value;
    const end = endInput.value;

    if (!subject || !day || !start || !end) {
        alert("Please fill in all timetable fields.");
        return;
    }

    if (end <= start) {
        alert("End time must be later than start time.");
        return;
    }

    const hasOverlap = studySessions.some(session =>
        session.day === day &&
        start < session.end &&
        end > session.start
    );

    if (hasOverlap) {
        alert("This session overlaps with another session on that day.");
        return;
    }

    studySessions.push({
        id: Date.now().toString(),
        subject,
        day,
        start,
        end
    });

    saveTimetable();
    renderTimetable();

    subjectInput.value = "";
    dayInput.value = "";
    startInput.value = "";
    endInput.value = "";
});

renderTimetable();
/* ===== Dark Mode Toggle ===== */

const themeToggle = document.getElementById("theme-toggle");

// Saved theme load karo
const savedTheme = localStorage.getItem("studentTheme");

if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
}

function updateThemeButton() {
    const isDark = document.body.classList.contains("dark-mode");

    themeToggle.textContent = isDark
        ? "☀️ Light Mode"
        : "🌙 Dark Mode";
}

updateThemeButton();

themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");

    const isDark = document.body.classList.contains("dark-mode");

    localStorage.setItem(
        "studentTheme",
        isDark ? "dark" : "light"
    );

    updateThemeButton();
});
/* ===== Study Streak Calendar Functionality ===== */

const calendarElement = document.getElementById("study-calendar");
const calendarTitle = document.getElementById("calendar-month-year");
const previousMonthButton = document.getElementById("prev-month");
const nextMonthButton = document.getElementById("next-month");

let displayedMonth = new Date();
displayedMonth.setDate(1);

function renderStudyCalendar() {
    calendarElement.innerHTML = "";

    const year = displayedMonth.getFullYear();
    const month = displayedMonth.getMonth();

    calendarTitle.textContent = displayedMonth.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
    );

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Monday = first day of the week
    const startingOffset = (firstDay.getDay() + 6) % 7;

    const todayKey = getLocalDateKey();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < startingOffset; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "calendar-day empty";
        calendarElement.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = getLocalDateKey(date);
        const count = studyHistory[dateKey] || 0;

        const dayCell = document.createElement("div");
        dayCell.className = "calendar-day";

        const number = document.createElement("span");
        number.textContent = day;
        dayCell.appendChild(number);

        if (count > 0) {
            dayCell.classList.add("studied");

            const countLabel = document.createElement("span");
            countLabel.className = "day-count";
            countLabel.textContent = `${count} task${count === 1 ? "" : "s"}`;

            dayCell.appendChild(countLabel);
            dayCell.title = `${dateKey}: ${count} task(s) completed`;
        } else {
            dayCell.title = `${dateKey}: No study record`;
        }

        if (dateKey === todayKey) {
            dayCell.classList.add("today");
            dayCell.title += " — Today";
        }

        if (date > today) {
            dayCell.classList.add("future");
            dayCell.title = `${dateKey}: Future date`;
        }

        calendarElement.appendChild(dayCell);
    }

    // Sync streak labels with the weekly statistics
    const currentStreakElement =
        document.getElementById("calendar-current-streak");
    const bestStreakElement =
        document.getElementById("calendar-best-streak");

    currentStreakElement.textContent =
        document.getElementById("current-streak").textContent;

    bestStreakElement.textContent =
        document.getElementById("best-streak").textContent;

    // Prevent browsing into future months
    const currentMonth = new Date();
    currentMonth.setDate(1);

    nextMonthButton.disabled =
        displayedMonth >= currentMonth;

    nextMonthButton.style.opacity =
        nextMonthButton.disabled ? "0.4" : "1";
}

previousMonthButton.addEventListener("click", function () {
    displayedMonth.setMonth(displayedMonth.getMonth() - 1);
    renderStudyCalendar();
});

nextMonthButton.addEventListener("click", function () {
    const currentMonth = new Date();
    currentMonth.setDate(1);

    if (displayedMonth < currentMonth) {
        displayedMonth.setMonth(displayedMonth.getMonth() + 1);
        renderStudyCalendar();
    }
});

// First render after the statistics are calculated
renderStatistics();
renderStudyCalendar();

/* ===== Activate Task Search and Filters ===== */

const taskSearch = document.getElementById("task-search");
const statusFilter = document.getElementById("status-filter");
const priorityFilter = document.getElementById("priority-filter");

if (taskSearch) {
    taskSearch.addEventListener("input", renderTasks);
}

if (statusFilter) {
    statusFilter.addEventListener("change", renderTasks);
}

if (priorityFilter) {
    priorityFilter.addEventListener("change", renderTasks);
}
let timerSeconds = 25 * 60;
let timerInterval = null;
let isBreakTime = false;
let completedSessions = Number(
    localStorage.getItem("pomodoroSessions") || 0
);

const timerDisplay = document.getElementById("pomodoro-timer");
const timerMode = document.getElementById("timer-mode");
const sessionDisplay = document.getElementById("session-count");
const startButton = document.getElementById("start-timer");
const pauseButton = document.getElementById("pause-timer");
const resetButton = document.getElementById("reset-timer");
const switchButton = document.getElementById("switch-timer");

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;

    timerDisplay.textContent =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function selectTimerMode(isBreak) {
    stopTimer();
    isBreakTime = isBreak;
    timerSeconds = isBreakTime ? 5 * 60 : 25 * 60;

    timerMode.textContent = isBreakTime
        ? "Break Time ☕"
        : "Study Time 📚";

    switchButton.textContent = isBreakTime
        ? "Back to Study"
        : "Take a Break";

    updateTimerDisplay();
}

function startTimer() {
    if (timerInterval !== null) return;

    if (timerSeconds <= 0) {
        selectTimerMode(isBreakTime);
    }

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();

        if (timerSeconds <= 0) {
            stopTimer();

            if (!isBreakTime) {
                completedSessions++;
                awardXP(25, "Pomodoro study session completed");
                localStorage.setItem(
                    "pomodoroSessions",
                    completedSessions
                );
                const todayKey = getGoalDateKey(new Date());

                studyHistory[todayKey] =
                    Number(studyHistory[todayKey] || 0) + 1;

                localStorage.setItem(
                    "dailyStudyHistory",
                    JSON.stringify(studyHistory)
                );

                updateStudyGoals();
                sessionDisplay.textContent = completedSessions;
            }

            alert(
                isBreakTime
                    ? "Break finished! Time to study 📚"
                    : "Study session completed! Take a break ☕"
            );

            selectTimerMode(!isBreakTime);
        }
    }, 1000);
}

startButton.addEventListener("click", startTimer);

pauseButton.addEventListener("click", stopTimer);

resetButton.addEventListener("click", () => {
    stopTimer();
    timerSeconds = isBreakTime ? 5 * 60 : 25 * 60;
    updateTimerDisplay();
});

switchButton.addEventListener("click", () => {
    selectTimerMode(!isBreakTime);
});

sessionDisplay.textContent = completedSessions;
updateTimerDisplay();

/* ===== Exam & Assignment Tracker ===== */

let reminders = JSON.parse(
    localStorage.getItem("studentReminders") || "[]"
);

const reminderForm = document.getElementById("reminder-form");
const reminderList = document.getElementById("reminder-list");
const reminderDate = document.getElementById("reminder-date");
const reminderSummary = document.getElementById("reminder-summary");
const reminderFilterButtons = document.querySelectorAll(
    "[data-reminder-filter]"
);

let activeReminderFilter = "all";

// Purane reminders ko compatible rakho
reminders = reminders.map((reminder, index) => ({
    ...reminder,
    id: reminder.id || `reminder-${index}-${reminder.date}`,
    completed: reminder.completed || false,
    notes: reminder.notes || ""
}));

function saveReminders() {
    localStorage.setItem(
        "studentReminders",
        JSON.stringify(reminders)
    );
}

function getReminderDaysRemaining(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);

    const dueDate = Date.UTC(year, month - 1, day);
    const now = new Date();

    const today = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    return Math.round((dueDate - today) / 86400000);
}

function renderReminders() {
    reminderList.innerHTML = "";

    const pendingCount = reminders.filter(
        reminder => !reminder.completed
    ).length;

    const completedCount = reminders.filter(
        reminder => reminder.completed
    ).length;

    if (reminderSummary) {
        reminderSummary.textContent =
            `Total: ${reminders.length} | Pending: ${pendingCount} | Completed: ${completedCount}`;
    }

    const filteredReminders = reminders
        .map((reminder, index) => ({ ...reminder, index }))
        .filter(reminder => {
            if (activeReminderFilter === "pending") {
                return !reminder.completed;
            }

            if (activeReminderFilter === "completed") {
                return reminder.completed;
            }

            return true;
        })
        .sort((a, b) => a.date.localeCompare(b.date));

    if (filteredReminders.length === 0) {
        reminderList.textContent = reminders.length === 0
            ? "No exams or assignments added yet."
            : "No reminders in this category.";

        return;
    }

    filteredReminders.forEach(reminder => {
        const days = getReminderDaysRemaining(reminder.date);

        const item = document.createElement("div");
        item.className = "reminder-item";

        if (reminder.completed) {
            item.classList.add("reminder-completed");
        }

        const title = document.createElement("h3");
        title.textContent = reminder.title;

        const subject = document.createElement("p");
        subject.textContent = `Subject: ${reminder.subject}`;

        const type = document.createElement("p");
        type.textContent = `Type: ${reminder.type}`;

        const date = document.createElement("p");
        date.textContent = `Due date: ${reminder.date}`;

        const status = document.createElement("p");
        status.className = "reminder-status";

        if (reminder.completed) {
            status.textContent = "✅ Completed";
        } else if (days < 0) {
            status.textContent = `⚠️ Overdue by ${Math.abs(days)} day(s)`;
            status.classList.add("overdue");
        } else if (days === 0) {
            status.textContent = "🔔 Due today!";
        } else if (days === 1) {
            status.textContent = "⏳ Due tomorrow";
        } else {
            status.textContent = `📅 ${days} days remaining`;
        }

        item.append(title, subject, type, date, status);

        if (reminder.notes) {
            const notes = document.createElement("p");
            notes.textContent = `Notes: ${reminder.notes}`;
            item.appendChild(notes);
        }

        const completeButton = document.createElement("button");
        completeButton.type = "button";
        completeButton.textContent = reminder.completed
            ? "Mark Pending"
            : "Mark Completed";

        completeButton.addEventListener("click", () => {
            reminders[reminder.index].completed =
                !reminders[reminder.index].completed;

            saveReminders();
            renderReminders();
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "reminder-delete";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            reminders.splice(reminder.index, 1);
            saveReminders();
            renderReminders();
        });

        item.append(
            document.createTextNode(" "),
            completeButton,
            document.createTextNode(" "),
            deleteButton
        );

        reminderList.appendChild(item);
    });
}

// Add new exam or assignment
reminderForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = document
        .getElementById("reminder-title").value.trim();

    const subject = document
        .getElementById("reminder-subject").value.trim();

    const type = document.getElementById("reminder-type").value;
    const date = reminderDate.value;

    const notesInput = document.getElementById("reminder-notes");
    const notes = notesInput ? notesInput.value.trim() : "";

    if (!title || !subject || !date) {
        alert("Please fill in the name, subject and due date.");
        return;
    }

    reminders.push({
        id: Date.now().toString(),
        title,
        subject,
        type,
        date,
        notes,
        completed: false
    });

    saveReminders();
    renderReminders();
    reminderForm.reset();
});

// All / Pending / Completed filters
reminderFilterButtons.forEach(button => {
    button.addEventListener("click", () => {
        activeReminderFilter = button.dataset.reminderFilter;
        renderReminders();
    });
});

saveReminders();
renderReminders();

/* ========== STUDY GOALS ========== */

function getGoalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

const dailyGoalInput = document.getElementById("daily-goal-input");
const weeklyGoalInput = document.getElementById("weekly-goal-input");
const saveDailyGoalButton = document.getElementById("save-daily-goal");
const saveWeeklyGoalButton = document.getElementById("save-weekly-goal");

let dailyGoal = Number(localStorage.getItem("studentDailyGoal")) || 3;
let weeklyGoal = Number(localStorage.getItem("studentWeeklyGoal")) || 15;

function getWeeklySessions() {
    let total = 0;
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        total += Number(studyHistory[getGoalDateKey(date)]) || 0;
    }

    return total;
}

function updateStudyGoals() {
    const todayKey = getGoalDateKey();
    const dailySessions = Number(studyHistory[todayKey]) || 0;
    const weeklySessions = getWeeklySessions();

    const dailyProgress = document.getElementById("daily-goal-progress");
    const dailyBar = document.getElementById("daily-goal-bar");
    const dailyMessage = document.getElementById("daily-goal-message");

    const weeklyProgress = document.getElementById("weekly-goal-progress");
    const weeklyBar = document.getElementById("weekly-goal-bar");
    const weeklyMessage = document.getElementById("weekly-goal-message");

    if (dailyGoalInput) dailyGoalInput.value = dailyGoal;
    if (weeklyGoalInput) weeklyGoalInput.value = weeklyGoal;

    if (dailyProgress) {
        dailyProgress.textContent =
            `${dailySessions} / ${dailyGoal} sessions completed`;
    }

    if (dailyBar) {
        dailyBar.max = dailyGoal;
        dailyBar.value = Math.min(dailySessions, dailyGoal);
    }

    if (dailyMessage) {
        dailyMessage.textContent =
            dailySessions >= dailyGoal
                ? "🎉 Daily goal completed!"
                : "Keep going—you can do it!";
    }

    if (weeklyProgress) {
        weeklyProgress.textContent =
            `${weeklySessions} / ${weeklyGoal} sessions completed`;
    }

    if (weeklyBar) {
        weeklyBar.max = weeklyGoal;
        weeklyBar.value = Math.min(weeklySessions, weeklyGoal);
    }

    if (weeklyMessage) {
        weeklyMessage.textContent =
            weeklySessions >= weeklyGoal
                ? "🌟 Weekly goal completed!"
                : "Every study session counts!";
    }
}

if (saveDailyGoalButton) {
    saveDailyGoalButton.addEventListener("click", () => {
        const value = Number(dailyGoalInput.value);

        if (!Number.isInteger(value) || value < 1 || value > 168) {
            alert("Enter a goal between 1 and 168.");
            return;
        }

        dailyGoal = value;
        localStorage.setItem("studentDailyGoal", String(dailyGoal));
        updateStudyGoals();
    });
}

if (saveWeeklyGoalButton) {
    saveWeeklyGoalButton.addEventListener("click", () => {
        const value = Number(weeklyGoalInput.value);

        if (!Number.isInteger(value) || value < 1 || value > 168) {
            alert("Enter a goal between 1 and 168.");
            return;
        }

        weeklyGoal = value;
        localStorage.setItem("studentWeeklyGoal", String(weeklyGoal));
        updateStudyGoals();
    });
}

updateStudyGoals();


/* ========== MARKS TRACKER ========== */

const marksForm = document.getElementById("marks-form");
const marksList = document.getElementById("marks-list");
const marksFilter = document.getElementById("marks-filter");
const marksSummary = document.getElementById("marks-summary");

let subjectMarks = JSON.parse(
    localStorage.getItem("studentSubjectMarks")
) || [];

function saveSubjectMarks() {
    localStorage.setItem(
        "studentSubjectMarks",
        JSON.stringify(subjectMarks)
    );
}

function renderSubjectMarks() {
    if (!marksList) return;

    marksList.innerHTML = "";

    const filterValue = marksFilter ? marksFilter.value : "all";

    const filteredMarks = subjectMarks.filter(mark =>
        filterValue === "all" ||
        mark.semester === filterValue ||
        mark.subject === filterValue
    );

    if (filteredMarks.length === 0) {
        marksList.innerHTML = "<p>No marks added yet.</p>";
    } else {
        filteredMarks.forEach(mark => {
            const percentage = mark.maximum > 0
                ? (mark.obtained / mark.maximum) * 100
                : 0;

            const item = document.createElement("div");
            item.className = "reminder-item";

            const heading = document.createElement("h3");
            heading.textContent = mark.subject;

            const details = document.createElement("p");
            details.textContent =
                `Semester: ${mark.semester} | ` +
                `Marks: ${mark.obtained}/${mark.maximum} | ` +
                `${percentage.toFixed(1)}%`;

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "reminder-delete";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", () => {
                subjectMarks = subjectMarks.filter(
                    entry => entry.id !== mark.id
                );

                saveSubjectMarks();
                renderSubjectMarks();
            });

            item.append(heading, details, deleteButton);
            marksList.appendChild(item);
        });
    }

    if (marksSummary) {
        if (subjectMarks.length === 0) {
            marksSummary.textContent = "No marks recorded yet.";
        } else {
            const obtained = subjectMarks.reduce(
                (sum, mark) => sum + mark.obtained, 0
            );
            const maximum = subjectMarks.reduce(
                (sum, mark) => sum + mark.maximum, 0
            );
            const percentage = maximum > 0
                ? (obtained / maximum) * 100
                : 0;

            marksSummary.textContent =
                `Overall: ${obtained}/${maximum} ` +
                `(${percentage.toFixed(1)}%)`;
        }
    }
}

if (marksForm) {
    marksForm.addEventListener("submit", event => {
        event.preventDefault();

        const subject = document
            .getElementById("marks-subject").value.trim();

        const semester = document
            .getElementById("marks-semester").value;

        const obtained = Number(
            document.getElementById("marks-obtained").value
        );

        const maximum = Number(
            document.getElementById("marks-maximum").value
        );

        if (!subject || !semester ||
            !Number.isFinite(obtained) ||
            !Number.isFinite(maximum) ||
            maximum <= 0 || obtained < 0 || obtained > maximum) {
            alert("Please enter valid marks.");
            return;
        }

        subjectMarks.push({
            id: Date.now().toString(),
            subject,
            semester,
            obtained,
            maximum
        });

        saveSubjectMarks();
        renderSubjectMarks();
        marksForm.reset();
    });
}

if (marksFilter) {
    marksFilter.addEventListener("change", renderSubjectMarks);
}

renderSubjectMarks();


/* ========== STUDY NOTES ========== */

(() => {
    const notesForm = document.getElementById("notes-form");
    const notesList = document.getElementById("notes-list");
    const notesSearch = document.getElementById("notes-search");

    if (!notesForm || !notesList) return;

    let notes = [];

    try {
        notes = JSON.parse(
            localStorage.getItem("studentLifeNotes")
        ) || [];
    } catch (error) {
        notes = [];
    }

    function saveNotes() {
        localStorage.setItem("studentLifeNotes", JSON.stringify(notes));
    }

    function renderNotes() {
        notesList.innerHTML = "";

        const query = notesSearch
            ? notesSearch.value.trim().toLowerCase()
            : "";

        const filteredNotes = notes.filter(note =>
            `${note.title} ${note.subject} ${note.content}`
                .toLowerCase()
                .includes(query)
        );

        if (filteredNotes.length === 0) {
            notesList.innerHTML = "<p>No notes found.</p>";
            return;
        }

        filteredNotes.forEach(note => {
            const card = document.createElement("article");
            card.className = "note-card";

            const title = document.createElement("h3");
            title.textContent = note.title;

            const subject = document.createElement("small");
            subject.textContent = note.subject || "General";

            const content = document.createElement("p");
            content.textContent = note.content;

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", () => {
                notes = notes.filter(item => item.id !== note.id);
                saveNotes();
                renderNotes();
            });

            card.append(title, subject, content, deleteButton);
            notesList.appendChild(card);
        });
    }

    notesForm.addEventListener("submit", event => {
        event.preventDefault();

        const title = document.getElementById("note-title")
            .value.trim();
        const subject = document.getElementById("note-subject")
            .value.trim();
        const content = document.getElementById("note-content")
            .value.trim();

        if (!title || !content) {
            alert("Please enter a title and note content.");
            return;
        }

        notes.push({
            id: Date.now().toString(),
            title,
            subject,
            content
        });

        saveNotes();
        renderNotes();
        notesForm.reset();
    });

    if (notesSearch) {
        notesSearch.addEventListener("input", renderNotes);
    }

    renderNotes();
})();
/* ===== Exam Countdown ===== */

const examForm = document.getElementById("exam-form");
const examNameInput = document.getElementById("exam-name");
const examSubjectInput = document.getElementById("exam-subject");
const examDateInput = document.getElementById("exam-date");
const examList = document.getElementById("exam-list");
const examSummary = document.getElementById("exam-summary");

let studentExams = [];

try {
    const savedExams = JSON.parse(
        localStorage.getItem("studentExams") || "[]"
    );

    studentExams = Array.isArray(savedExams)
        ? savedExams.filter(exam =>
            exam &&
            typeof exam.name === "string" &&
            typeof exam.subject === "string" &&
            typeof exam.date === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(exam.date)
        )
        : [];
} catch (error) {
    studentExams = [];
}

function saveExams() {
    try {
        localStorage.setItem(
            "studentExams",
            JSON.stringify(studentExams)
        );
    } catch (error) {
        alert("Exams could not be saved. Please check browser storage.");
    }
}

function getExamDaysLeft(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);

    const examDate = Date.UTC(year, month - 1, day);

    const now = new Date();
    const today = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    return Math.round((examDate - today) / 86400000);
}

function formatExamDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);

    return new Date(year, month - 1, day).toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}

function renderExams() {
    examList.innerHTML = "";

    const sortedExams = [...studentExams].sort(
        (a, b) => a.date.localeCompare(b.date)
    );

    const upcomingCount = sortedExams.filter(
        exam => getExamDaysLeft(exam.date) >= 0
    ).length;

    examSummary.textContent = sortedExams.length === 0
        ? "No exams added yet. Add your first exam above!"
        : `${upcomingCount} upcoming exam(s) · ${sortedExams.length} total`;

    if (sortedExams.length === 0) {
        return;
    }

    sortedExams.forEach(exam => {
        const card = document.createElement("article");
        card.className = "exam-card";

        const details = document.createElement("div");
        details.className = "exam-details";

        const title = document.createElement("h3");
        title.textContent = exam.name;

        const subject = document.createElement("p");
        subject.textContent = `📚 Subject: ${exam.subject}`;

        const date = document.createElement("p");
        date.textContent = `📅 ${formatExamDate(exam.date)}`;

        const countdown = document.createElement("p");
        countdown.className = "exam-countdown";

        const daysLeft = getExamDaysLeft(exam.date);

        if (daysLeft === 0) {
            countdown.textContent = "🎯 Your exam is today!";
        } else if (daysLeft === 1) {
            countdown.textContent = "⏳ Only 1 day left!";
        } else if (daysLeft > 1) {
            countdown.textContent = `⏳ ${daysLeft} days left`;
        } else {
            const daysPassed = Math.abs(daysLeft);
            countdown.textContent = daysPassed === 1
                ? "Exam date passed 1 day ago"
                : `Exam date passed ${daysPassed} days ago`;
        }

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "exam-delete";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute(
            "aria-label",
            `Delete ${exam.name}`
        );

        deleteButton.addEventListener("click", () => {
            studentExams = studentExams.filter(
                item => item.id !== exam.id
            );

            saveExams();
            renderExams();
        });

        details.append(title, subject, date, countdown);
        card.append(details, deleteButton);
        examList.appendChild(card);
    });
}

examForm.addEventListener("submit", event => {
    event.preventDefault();

    const name = examNameInput.value.trim();
    const subject = examSubjectInput.value.trim();
    const date = examDateInput.value;

    if (!name || !subject || !date) {
        alert("Please enter the exam name, subject and date.");
        return;
    }

    studentExams.push({
        id: Date.now().toString() + Math.random().toString(16).slice(2),
        name,
        subject,
        date
    });

    saveExams();
    renderExams();
    examForm.reset();
});

renderExams();
/* ===== XP Points & Badges System ===== */

const xpTotalElement = document.getElementById("xp-total");
const xpLevelElement = document.getElementById("xp-level");
const xpProgressBar = document.getElementById("xp-progress-bar");
const xpProgressText = document.getElementById("xp-progress-text");
const xpBadgesElement = document.getElementById("xp-badges");
const xpMessageElement = document.getElementById("xp-message");

let xpData = {
    total: 0,
    badges: []
};

try {
    const savedXP = JSON.parse(
        localStorage.getItem("studentXP") || "null"
    );

    if (savedXP && typeof savedXP === "object") {
        xpData.total = Math.max(
            0,
            Number.isFinite(Number(savedXP.total))
                ? Math.floor(Number(savedXP.total))
                : 0
        );

        xpData.badges = Array.isArray(savedXP.badges)
            ? savedXP.badges.filter(badge => typeof badge === "string")
            : [];
    }
} catch (error) {
    console.warn("Could not read saved XP data.");
}

const xpBadgeDefinitions = [
    {
        id: "first-task",
        icon: "🌱",
        name: "First Step",
        description: "Earn 10 XP",
        requiredXP: 10
    },
    {
        id: "learner",
        icon: "📚",
        name: "Learner",
        description: "Earn 50 XP",
        requiredXP: 50
    },
    {
        id: "focused",
        icon: "🎯",
        name: "Focused Mind",
        description: "Earn 100 XP",
        requiredXP: 100
    },
    {
        id: "achiever",
        icon: "🏆",
        name: "Achiever",
        description: "Earn 250 XP",
        requiredXP: 250
    },
    {
        id: "champion",
        icon: "👑",
        name: "Study Champion",
        description: "Earn 500 XP",
        requiredXP: 500
    }
];

function saveXP() {
    try {
        localStorage.setItem("studentXP", JSON.stringify(xpData));
        return true;
    } catch (error) {
        alert("XP could not be saved. Please check browser storage.");
        return false;
    }
}

function awardXP(points, reason) {
    const amount = Number(points);

    if (!Number.isFinite(amount) || amount <= 0) return;

    const oldTotal = xpData.total;
    xpData.total += Math.floor(amount);

    xpBadgeDefinitions.forEach(badge => {
        if (
            oldTotal < badge.requiredXP &&
            xpData.total >= badge.requiredXP &&
            !xpData.badges.includes(badge.id)
        ) {
            xpData.badges.push(badge.id);
            xpMessageElement.textContent =
                `🎉 Badge unlocked: ${badge.name}!`;
        }
    });

    saveXP();
    renderXP();

    if (reason && !xpBadgeDefinitions.some(
        badge => badge.requiredXP > oldTotal &&
            badge.requiredXP <= xpData.total
    )) {
        xpMessageElement.textContent = `+${Math.floor(amount)} XP — ${reason}`;
    }
}

function renderXP() {
    const total = xpData.total;
    const level = Math.floor(total / 100) + 1;
    const progress = total % 100;

    xpTotalElement.textContent = `${total} XP`;
    xpLevelElement.textContent = `Level ${level}`;
    xpProgressBar.style.width = `${progress}%`;

    xpProgressText.textContent = `${progress} / 100 XP to next level`;

    xpBadgesElement.innerHTML = "";

    xpBadgeDefinitions.forEach(badge => {
        const unlocked = xpData.badges.includes(badge.id);

        const card = document.createElement("div");
        card.className = `xp-badge${unlocked ? "" : " locked"}`;

        const icon = document.createElement("span");
        icon.textContent = unlocked ? badge.icon : "🔒";

        const title = document.createElement("strong");
        title.textContent = badge.name;

        const description = document.createElement("p");
        description.textContent = unlocked
            ? "Unlocked!"
            : badge.description;

        card.append(icon, title, description);
        xpBadgesElement.appendChild(card);
    });
}

renderXP();

/* ===== Flashcards & Quick Revision System ===== */

(function initFlashcards() {
    function startFlashcards() {
        const form = document.getElementById("flashcard-form");
        const questionInput = document.getElementById("flashcard-question");
        const answerInput = document.getElementById("flashcard-answer");
        const countElement = document.getElementById("flashcard-count");
        const positionElement = document.getElementById("flashcard-position");
        const reviewCard = document.getElementById("flashcard-review-card");
        const sideLabel = document.getElementById("flashcard-side-label");
        const displayElement = document.getElementById("flashcard-display");
        const hintElement = document.getElementById("flashcard-hint");
        const previousButton = document.getElementById("flashcard-prev");
        const flipButton = document.getElementById("flashcard-flip");
        const nextButton = document.getElementById("flashcard-next");
        const deleteButton = document.getElementById("flashcard-delete");
        const listElement = document.getElementById("flashcard-list");
        const messageElement = document.getElementById("flashcard-message");

        // HTML section missing ho to existing app ko affect mat karo.
        if (
            !form || !questionInput || !answerInput ||
            !countElement || !positionElement || !reviewCard ||
            !sideLabel || !displayElement || !hintElement ||
            !previousButton || !flipButton || !nextButton ||
            !deleteButton || !listElement || !messageElement
        ) {
            return;
        }

        const STORAGE_KEY = "studentFlashcards";
        let flashcards = [];
        let currentIndex = 0;
        let showingAnswer = false;

        // Saved cards safely load karo.
        try {
            const savedCards = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            if (Array.isArray(savedCards)) {
                flashcards = savedCards.filter(card =>
                    card &&
                    typeof card.id === "string" &&
                    typeof card.question === "string" &&
                    typeof card.answer === "string"
                );
            }
        } catch (error) {
            messageElement.textContent =
                "Saved cards could not be read. You can still add cards.";
        }

        function saveFlashcards() {
            try {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(flashcards)
                );
                return true;
            } catch (error) {
                messageElement.textContent =
                    "Cards could not be saved. Browser storage may be full.";
                return false;
            }
        }

        function renderFlashcards() {
            const total = flashcards.length;
            countElement.textContent = total;

            listElement.replaceChildren();

            if (total === 0) {
                currentIndex = 0;
                showingAnswer = false;

                positionElement.textContent = "Card 0 of 0";
                sideLabel.textContent = "QUESTION";
                displayElement.textContent =
                    "Add your first flashcard to begin!";
                hintElement.textContent =
                    "Your revision cards will appear here.";

                previousButton.disabled = true;
                nextButton.disabled = true;
                flipButton.disabled = true;
                deleteButton.disabled = true;

                reviewCard.setAttribute(
                    "aria-label",
                    "No flashcards available."
                );

                return;
            }

            currentIndex = Math.max(
                0,
                Math.min(currentIndex, total - 1)
            );

            const card = flashcards[currentIndex];

            positionElement.textContent =
                `Card ${currentIndex + 1} of ${total}`;

            sideLabel.textContent = showingAnswer
                ? "ANSWER"
                : "QUESTION";

            displayElement.textContent = showingAnswer
                ? card.answer
                : card.question;

            hintElement.textContent = showingAnswer
                ? "Tap to see the question again."
                : "Tap this card to reveal the answer.";

            reviewCard.setAttribute(
                "aria-label",
                showingAnswer
                    ? "Answer displayed. Select to see question."
                    : "Question displayed. Select to reveal answer."
            );

            previousButton.disabled = currentIndex === 0;
            nextButton.disabled = currentIndex === total - 1;
            flipButton.disabled = false;
            deleteButton.disabled = false;

            flashcards.forEach((savedCard, index) => {
                const cardButton = document.createElement("button");
                cardButton.type = "button";
                cardButton.className = "flashcard-list-item";

                if (index === currentIndex) {
                    cardButton.classList.add("active");
                    cardButton.setAttribute("aria-current", "true");
                }

                // textContent keeps user-entered text safe.
                cardButton.textContent =
                    `${index + 1}. ${savedCard.question}`;

                cardButton.addEventListener("click", function () {
                    currentIndex = index;
                    showingAnswer = false;
                    renderFlashcards();
                });

                listElement.appendChild(cardButton);
            });
        }

        function flipFlashcard() {
            if (flashcards.length === 0) return;

            showingAnswer = !showingAnswer;
            renderFlashcards();
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            const question = questionInput.value.trim();
            const answer = answerInput.value.trim();

            if (!question || !answer) {
                messageElement.textContent =
                    "Please enter both a question and an answer.";
                return;
            }

            const newCard = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                question: question,
                answer: answer
            };

            flashcards.push(newCard);
            currentIndex = flashcards.length - 1;
            showingAnswer = false;

            if (saveFlashcards()) {
                messageElement.textContent =
                    "✅ Flashcard added and saved!";
                form.reset();
            } else {
                // Storage failed: keep the card in memory, but warn the user.
                flashcards.pop();
                currentIndex = Math.max(0, flashcards.length - 1);
            }

            renderFlashcards();
        });

        flipButton.addEventListener("click", flipFlashcard);

        reviewCard.addEventListener("click", flipFlashcard);

        reviewCard.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                flipFlashcard();
            }
        });

        previousButton.addEventListener("click", function () {
            if (currentIndex > 0) {
                currentIndex--;
                showingAnswer = false;
                renderFlashcards();
            }
        });

        nextButton.addEventListener("click", function () {
            if (currentIndex < flashcards.length - 1) {
                currentIndex++;
                showingAnswer = false;
                renderFlashcards();
            }
        });

        deleteButton.addEventListener("click", function () {
            if (flashcards.length === 0) return;

            const removedCard = flashcards.splice(currentIndex, 1)[0];

            if (!saveFlashcards()) {
                // Restore the card if it could not be saved.
                flashcards.splice(currentIndex, 0, removedCard);
                renderFlashcards();
                return;
            }

            currentIndex = Math.min(
                currentIndex,
                Math.max(0, flashcards.length - 1)
            );

            showingAnswer = false;
            messageElement.textContent = "Flashcard deleted.";
            renderFlashcards();
        });

        renderFlashcards();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            startFlashcards,
            { once: true }
        );
    } else {
        startFlashcards();
    }
})();

/* ===== Focus Mode System ===== */

(function initFocusMode() {
    const toggleButton = document.getElementById("focus-toggle");
    const startButton = document.getElementById("focus-start");
    const pauseButton = document.getElementById("focus-pause");
    const resetButton = document.getElementById("focus-reset");
    const exitButton = document.getElementById("focus-exit");
    const durationSelect = document.getElementById("focus-duration");
    const timerDisplay = document.getElementById("focus-timer");
    const messageDisplay = document.getElementById("focus-message");
    const statusLabel = document.getElementById("focus-status-label");

    // Missing HTML elements? Existing app ko disturb mat karo.
    if (
        !toggleButton || !startButton || !pauseButton ||
        !resetButton || !exitButton || !durationSelect ||
        !timerDisplay || !messageDisplay || !statusLabel
    ) {
        return;
    }

    const STORAGE_KEY = "studentFocusMode";
    let isFocusMode = false;
    let isRunning = false;
    let remainingSeconds = Number(durationSelect.value) * 60;
    let endTime = null;
    let intervalId = null;

    // Sirf Focus Mode ki preference load karo.
    try {
        isFocusMode =
            localStorage.getItem(STORAGE_KEY) === "true";
    } catch (error) {
        isFocusMode = false;
    }

    function saveFocusPreference() {
        try {
            localStorage.setItem(STORAGE_KEY, String(isFocusMode));
        } catch (error) {
            // Storage unavailable hone par bhi feature kaam karega.
        }
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;

        return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    function renderTimer() {
        timerDisplay.textContent = formatTime(remainingSeconds);
        document.title = isRunning
            ? `${formatTime(remainingSeconds)} — Focus Mode`
            : "Student Life Management";

        toggleButton.textContent = isFocusMode
            ? "🎯 Focus Mode ON"
            : "🎯 Enter Focus Mode";

        statusLabel.textContent = isFocusMode
            ? "Focus Mode is ON — you've got this!"
            : "Focus Mode is OFF";

        startButton.disabled = isRunning || remainingSeconds <= 0;
        pauseButton.disabled = !isRunning;
        durationSelect.disabled = isRunning;
    }

    function stopInterval() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function updateCountdown() {
        if (!isRunning || endTime === null) return;

        remainingSeconds = Math.max(
            0,
            Math.ceil((endTime - Date.now()) / 1000)
        );

        if (remainingSeconds <= 0) {
            isRunning = false;
            endTime = null;
            stopInterval();

            messageDisplay.textContent =
                "🎉 Focus session complete! Great work. Take a short break.";

            renderTimer();
            return;
        }

        renderTimer();
    }

    function startTimer() {
        if (isRunning || remainingSeconds <= 0) return;

        isRunning = true;
        endTime = Date.now() + remainingSeconds * 1000;

        messageDisplay.textContent =
            "Stay focused. One step at a time!";

        stopInterval();
        intervalId = setInterval(updateCountdown, 250);
        renderTimer();
    }

    function pauseTimer() {
        if (!isRunning) return;

        updateCountdown();

        if (!isRunning) return;

        isRunning = false;
        endTime = null;
        stopInterval();

        messageDisplay.textContent = "⏸ Timer paused. Resume when ready.";
        renderTimer();
    }

    function resetTimer() {
        isRunning = false;
        endTime = null;
        stopInterval();

        remainingSeconds = Number(durationSelect.value) * 60;
        messageDisplay.textContent = "Timer reset. Ready to focus again!";

        renderTimer();
    }

    function setFocusMode(enabled) {
        isFocusMode = enabled;
        document.body.classList.toggle(
            "focus-mode-active",
            isFocusMode
        );

        saveFocusPreference();

        if (isFocusMode) {
            messageDisplay.textContent =
                "🎯 Focus Mode is ON. Let's get started!";
        } else {
            messageDisplay.textContent =
                "Focus Mode is OFF. Welcome back to your dashboard!";
        }

        renderTimer();
    }

    toggleButton.addEventListener("click", function () {
        setFocusMode(!isFocusMode);
    });

    exitButton.addEventListener("click", function () {
        setFocusMode(false);
    });

    startButton.addEventListener("click", startTimer);
    pauseButton.addEventListener("click", pauseTimer);
    resetButton.addEventListener("click", resetTimer);

    durationSelect.addEventListener("change", function () {
        if (isRunning) return;

        remainingSeconds = Number(durationSelect.value) * 60;
        messageDisplay.textContent = "Duration updated. Ready to focus!";
        renderTimer();
    });

    // Restore the saved Focus Mode preference on refresh.
    document.body.classList.toggle(
        "focus-mode-active",
        isFocusMode
    );

    renderTimer();
})();

/* ===== Backup & Restore System ===== */

(function initBackupRestore() {
    function setupBackupRestore() {
        const downloadButton =
            document.getElementById("backup-download");
        const chooseButton =
            document.getElementById("backup-choose");
        const fileInput =
            document.getElementById("backup-file-input");
        const fileName =
            document.getElementById("backup-file-name");
        const restoreButton =
            document.getElementById("backup-restore-button");
        const statusElement =
            document.getElementById("backup-status");

        // HTML section missing ho to existing app unaffected rahe.
        if (
            !downloadButton || !chooseButton || !fileInput ||
            !fileName || !restoreButton || !statusElement
        ) {
            return;
        }

        const FORMAT = "student-life-management-backup";
        const VERSION = 1;
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

        let selectedBackup = null;

        function readAllStorage() {
            const data = {};

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);

                if (key !== null) {
                    data[key] = localStorage.getItem(key);
                }
            }

            return data;
        }

        function createBackupObject() {
            return {
                format: FORMAT,
                version: VERSION,
                createdAt: new Date().toISOString(),
                data: readAllStorage()
            };
        }

        function downloadJSON(backup, prefix) {
            const json = JSON.stringify(backup, null, 2);
            const blob = new Blob(
                [json],
                { type: "application/json;charset=utf-8" }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            const timestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, "-");

            link.href = url;
            link.download =
                `${prefix}-${timestamp}.json`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            // Download start hone ke baad temporary URL release karo.
            setTimeout(function () {
                URL.revokeObjectURL(url);
            }, 1000);
        }

        function validateBackup(backup) {
            if (
                !backup ||
                typeof backup !== "object" ||
                Array.isArray(backup) ||
                backup.format !== FORMAT ||
                backup.version !== VERSION ||
                !backup.data ||
                typeof backup.data !== "object" ||
                Array.isArray(backup.data)
            ) {
                throw new Error(
                    "This is not a supported Student Life Management backup."
                );
            }

            const keys = Object.keys(backup.data);

            // Backup mein sirf string keys aur localStorage values allowed hain.
            for (const key of keys) {
                if (
                    key === "__proto__" ||
                    key === "constructor" ||
                    key === "prototype" ||
                    typeof backup.data[key] !== "string"
                ) {
                    throw new Error(
                        "The backup contains invalid storage data."
                    );
                }
            }

            return true;
        }

        downloadButton.addEventListener("click", function () {
            try {
                const backup = createBackupObject();

                downloadJSON(backup, "student-life-backup");

                statusElement.textContent =
                    "✅ Backup download requested. Check your Downloads folder.";
            } catch (error) {
                statusElement.textContent =
                    "❌ Backup failed. Check browser storage and try again.";
            }
        });

        chooseButton.addEventListener("click", function () {
            fileInput.click();
        });

        fileInput.addEventListener("change", async function () {
            selectedBackup = null;
            restoreButton.disabled = true;

            const file = fileInput.files && fileInput.files[0];

            if (!file) {
                fileName.textContent = "No backup file selected.";
                return;
            }

            fileName.textContent = `Selected: ${file.name}`;

            if (file.size > MAX_FILE_SIZE) {
                statusElement.textContent =
                    "❌ File is too large. Maximum supported size is 10 MB.";
                fileInput.value = "";
                return;
            }

            try {
                const text = await file.text();
                const backup = JSON.parse(text);

                validateBackup(backup);

                selectedBackup = backup;
                restoreButton.disabled = false;

                statusElement.textContent =
                    "✅ Backup file validated. You can restore it now.";
            } catch (error) {
                selectedBackup = null;
                restoreButton.disabled = true;

                statusElement.textContent =
                    `❌ Invalid backup file: ${error.message}`;
            }
        });

        restoreButton.addEventListener("click", function () {
            if (!selectedBackup) {
                statusElement.textContent =
                    "Please choose a valid backup file first.";
                return;
            }

            const confirmed = window.confirm(
                "Restore this backup?\n\n" +
                "Current browser storage will be replaced by the backup. " +
                "A safety backup will be downloaded first. " +
                "Keep that safety file if you need to undo the restore."
            );

            if (!confirmed) {
                statusElement.textContent =
                    "Restore cancelled. Your current data is unchanged.";
                return;
            }

            let previousData;

            try {
                // In-memory safety copy in case storage update fails.
                previousData = readAllStorage();

                // Download the current data before changing anything.
                downloadJSON(
                    {
                        format: FORMAT,
                        version: VERSION,
                        createdAt: new Date().toISOString(),
                        data: previousData
                    },
                    "student-life-safety-backup"
                );

                // Restore an exact snapshot of the same-origin storage.
                localStorage.clear();

                for (const [key, value] of Object.entries(
                    selectedBackup.data
                )) {
                    localStorage.setItem(key, value);
                }

                statusElement.textContent =
                    "✅ Restore completed! Reloading your app...";

                // Reload lets existing app features read restored values.
                window.location.reload();
            } catch (error) {
                // Try to recover the previous state if restore failed.
                try {
                    localStorage.clear();

                    if (previousData) {
                        for (const [key, value] of Object.entries(
                            previousData
                        )) {
                            localStorage.setItem(key, value);
                        }
                    }

                    statusElement.textContent =
                        "❌ Restore failed. Previous data recovery was attempted. " +
                        "Check your downloaded safety backup.";
                } catch (rollbackError) {
                    statusElement.textContent =
                        "❌ Storage recovery failed. Do not close the page; " +
                        "use your downloaded safety backup to recover.";
                }
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            setupBackupRestore,
            { once: true }
        );
    } else {
        setupBackupRestore();
    }
})();

