(function () {
  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function startOfWeek(d) {
    const x = new Date(d);
    const day = x.getDay();
    const diff = x.getDate() - day;
    x.setHours(0, 0, 0, 0);
    x.setDate(diff);
    return x.getTime();
  }

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

  async function init() {
    const tasks = await api.getTasks(false);
    const weekStart = startOfWeek(new Date());
    let completedThisWeek = 0;
    const entries = [];

    tasks.forEach((t) => {
      if (t.completed && t.completedAt) {
        if (new Date(t.completedAt).getTime() >= weekStart) completedThisWeek += 1;
      }
      (Array.isArray(t.studyLogs) ? t.studyLogs : []).forEach((l) => {
        entries.push({
          at: l.at,
          minutes: l.minutes,
          task: t.title,
        });
      });
    });

    entries.sort((a, b) => new Date(b.at) - new Date(a.at));
    const totalMins = entries.reduce((a, e) => a + (e.minutes || 0), 0);
    const open = tasks.filter((t) => !t.completed).length;

    document.getElementById("stats").innerHTML = `
      <div class="stat"><strong>${completedThisWeek}</strong> completed this week</div>
      <div class="stat"><strong>${totalMins}</strong> total minutes logged</div>
      <div class="stat"><strong>${open}</strong> open tasks</div>
    `;

    const logEl = document.getElementById("logs");
    const recent = entries.slice(0, 25);
    if (!recent.length) {
      logEl.innerHTML = '<p class="empty">No study logs yet. Log minutes on the Tasks page.</p>';
      return;
    }
    logEl.innerHTML =
      "<ul class='plain'>" +
      recent
        .map(
          (e) =>
            `<li class="task-item"><strong>${e.minutes} min</strong> · ${escapeHtml(
              e.task
            )} <span class="task-meta">${formatShort(e.at)}</span></li>`
        )
        .join("") +
      "</ul>";
  }

  init().catch(() => {
    document.getElementById("stats").innerHTML = '<p class="empty">Could not load progress.</p>';
    document.getElementById("logs").innerHTML = "";
  });
})();
