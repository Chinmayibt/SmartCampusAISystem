(function () {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function formatShort(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderReminders(tasks) {
    const el = document.getElementById("reminder-panel");
    const now = Date.now();
    const lines = [];

    const overdue = tasks.filter((t) => !t.completed && new Date(t.dueAt).getTime() < now);
    const dueSoon = tasks.filter((t) => {
      if (t.completed) return false;
      const due = new Date(t.dueAt).getTime();
      return due >= now && due <= now + 48 * 3600000;
    });
    const remindDue = tasks.filter((t) => {
      if (t.completed || !t.remindAt) return false;
      return new Date(t.remindAt).getTime() <= now;
    });

    if (overdue.length) {
      lines.push(
        `<div class="alert danger"><strong>Overdue:</strong> ${overdue
          .map((t) => `${escapeHtml(t.title)} (${formatShort(t.dueAt)})`)
          .join(" · ")}</div>`
      );
    }
    if (remindDue.length) {
      lines.push(
        `<div class="alert"><strong>Reminder:</strong> ${remindDue
          .map((t) => `${escapeHtml(t.title)}`)
          .join(" · ")}</div>`
      );
    }
    if (dueSoon.length && !lines.length) {
      lines.push(
        `<div class="alert"><strong>Due within 48h:</strong> ${dueSoon
          .map((t) => `${escapeHtml(t.title)} (${formatShort(t.dueAt)})`)
          .join(" · ")}</div>`
      );
    }
    if (!lines.length) {
      lines.push('<p class="empty">No urgent reminders right now.</p>');
    }
    el.innerHTML = lines.join("");

    if ("Notification" in window && Notification.permission === "granted") {
      remindDue.slice(0, 3).forEach((t) => {
        const k = "ssp-notify-" + t.id;
        if (sessionStorage.getItem(k)) return;
        try {
          new Notification("SmartStudy: " + t.title, { body: "Reminder — check your tasks." });
          sessionStorage.setItem(k, "1");
        } catch (_) {}
      });
    }
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function renderTasks(tasks) {
    const el = document.getElementById("tasks-panel");
    const open = tasks.filter((t) => !t.completed).slice(0, 8);
    if (!open.length) {
      el.innerHTML = '<p class="empty">No open tasks. Add some on the Tasks page.</p>';
      return;
    }
    el.innerHTML =
      "<ul class='plain'>" +
      open
        .map(
          (t) => `<li class="task-item">
        <span class="badge ${t.kind === "exam" ? "exam" : ""}">${t.kind}</span>
        <strong>${escapeHtml(t.title)}</strong>
        <div class="task-meta">Due ${formatShort(t.dueAt)}</div>
      </li>`
        )
        .join("") +
      "</ul>";
  }

  function fillDaySelect(select) {
    select.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = DAYS[i];
      if (i === new Date().getDay()) opt.selected = true;
      select.appendChild(opt);
    }
  }

  async function loadSuggestions(weekday) {
    const el = document.getElementById("suggestions-panel");
    try {
      const data = await api.getSuggestions(weekday);
      if (!data.slots || !data.slots.length) {
        el.innerHTML =
          '<p class="empty">No free windows long enough for your session length. Add gaps in Timetable or tweak Settings.</p>';
        return;
      }
      el.innerHTML =
        '<ul class="plain suggestion-list">' +
        data.slots
          .map(
            (s) =>
              `<li><strong>${escapeHtml(s.start)} – ${escapeHtml(s.end)}</strong> <span class="task-meta">(${escapeHtml(
                s.reason
              )})</span></li>`
          )
          .join("") +
        "</ul>";
    } catch (e) {
      el.innerHTML = `<p class="empty">Could not load suggestions.</p>`;
    }
  }

  async function init() {
    fillDaySelect(document.getElementById("suggest-day"));

    try {
      const tasks = await api.getTasks(false);
      renderReminders(tasks);
      renderTasks(tasks);
    } catch (e) {
      document.getElementById("reminder-panel").innerHTML =
        '<p class="empty">Could not load tasks.</p>';
    }

    const daySel = document.getElementById("suggest-day");
    await loadSuggestions(Number(daySel.value));
    daySel.addEventListener("change", () => loadSuggestions(Number(daySel.value)));

    const btn = document.getElementById("btn-notify");
    const status = document.getElementById("notify-status");
    if (!("Notification" in window)) {
      btn.disabled = true;
      status.textContent = "Notifications not supported in this browser.";
    } else if (Notification.permission === "granted") {
      status.textContent = "Notifications on.";
      btn.textContent = "Notifications enabled";
      btn.disabled = true;
    } else if (Notification.permission === "denied") {
      status.textContent = "Notifications blocked in browser settings.";
      btn.disabled = true;
    } else {
      btn.addEventListener("click", async () => {
        const p = await Notification.requestPermission();
        if (p === "granted") {
          status.textContent = "Notifications on.";
          btn.disabled = true;
        } else {
          status.textContent = "Permission not granted.";
        }
      });
    }
  }

  init();
})();
