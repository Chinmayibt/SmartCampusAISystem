(function () {
  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function toLocalInput(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function toIsoFromLocal(val) {
    if (!val) return null;
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
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

  let tasks = [];

  async function refresh() {
    tasks = await api.getTasks(false);
    render();
  }

  function render() {
    const el = document.getElementById("task-list");
    if (!tasks.length) {
      el.innerHTML = '<p class="empty">No tasks yet.</p>';
      return;
    }
    el.innerHTML = tasks
      .map((t) => {
        const done = t.completed ? " (done)" : "";
        const logs = Array.isArray(t.studyLogs) ? t.studyLogs : [];
        const mins = logs.reduce((a, l) => a + (l.minutes || 0), 0);
        return `<div class="task-item" data-id="${escapeHtml(t.id)}">
          <span class="badge ${t.kind === "exam" ? "exam" : ""}">${escapeHtml(t.kind)}</span>
          <strong>${escapeHtml(t.title)}${done}</strong>
          <div class="task-meta">Due ${formatShort(t.dueAt)}${
          t.remindAt ? ` · Remind ${formatShort(t.remindAt)}` : ""
        }</div>
          ${t.notes ? `<div>${escapeHtml(t.notes)}</div>` : ""}
          <div class="task-meta">Studied: ${mins} min total</div>
          <div class="row-actions">
            <button type="button" class="secondary btn-edit">Edit</button>
            <button type="button" class="secondary btn-toggle">${t.completed ? "Reopen" : "Complete"}</button>
            <label style="flex-direction:row;align-items:center;gap:0.35rem;margin:0">
              <span class="task-meta">Log</span>
              <input type="number" class="log-min" min="1" max="600" value="25" style="width:4rem" />
              <button type="button" class="secondary btn-log">min</button>
            </label>
            <button type="button" class="danger btn-del">Delete</button>
          </div>
        </div>`;
      })
      .join("");

    el.querySelectorAll(".task-item").forEach((row) => {
      const id = row.getAttribute("data-id");
      const t = tasks.find((x) => x.id === id);
      row.querySelector(".btn-edit").addEventListener("click", () => startEdit(t));
      row.querySelector(".btn-toggle").addEventListener("click", async () => {
        await api.putTask(id, { completed: !t.completed });
        await refresh();
      });
      row.querySelector(".btn-log").addEventListener("click", async () => {
        const input = row.querySelector(".log-min");
        const n = Number(input.value);
        if (!n || n < 1) return;
        await api.putTask(id, { logMinutes: n });
        await refresh();
      });
      row.querySelector(".btn-del").addEventListener("click", async () => {
        if (!confirm("Delete this task?")) return;
        await api.deleteTask(id);
        if (document.getElementById("edit-id").value === id) resetForm();
        await refresh();
      });
    });
  }

  function startEdit(t) {
    document.getElementById("edit-id").value = t.id;
    document.getElementById("title").value = t.title;
    document.getElementById("kind").value = t.kind;
    document.getElementById("dueAt").value = toLocalInput(t.dueAt);
    document.getElementById("remindAt").value = toLocalInput(t.remindAt) || "";
    document.getElementById("notes").value = t.notes || "";
    document.getElementById("submit-btn").textContent = "Save task";
    document.getElementById("cancel-edit").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    document.getElementById("edit-id").value = "";
    document.getElementById("task-form").reset();
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById("dueAt").value = now.toISOString().slice(0, 16);
    document.getElementById("submit-btn").textContent = "Add task";
    document.getElementById("cancel-edit").hidden = true;
  }

  document.getElementById("task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("edit-id").value;
    const dueLocal = document.getElementById("dueAt").value;
    const remindLocal = document.getElementById("remindAt").value;
    const body = {
      title: document.getElementById("title").value.trim(),
      kind: document.getElementById("kind").value,
      dueAt: toIsoFromLocal(dueLocal),
      remindAt: remindLocal ? toIsoFromLocal(remindLocal) : null,
      notes: document.getElementById("notes").value,
    };
    if (editId) await api.putTask(editId, body);
    else await api.postTask(body);
    resetForm();
    await refresh();
  });

  document.getElementById("cancel-edit").addEventListener("click", resetForm);

  resetForm();
  refresh().catch(() => {
    document.getElementById("task-list").innerHTML = '<p class="empty">Could not load tasks.</p>';
  });
})();
