(function () {
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function fillWeekdaySelect(selectEl, shortLabel) {
    selectEl.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = shortLabel ? DAYS[i].slice(0, 3) : DAYS[i];
      selectEl.appendChild(o);
    }
  }

  let blocks = [];

  async function refresh() {
    blocks = await api.getTimetable();
    renderGrid();
  }

  function renderGrid() {
    const grid = document.getElementById("week-grid");
    grid.innerHTML = "";
    for (let d = 0; d < 7; d++) {
      const col = document.createElement("div");
      col.className = "day-column card";
      const h = document.createElement("h3");
      h.textContent = DAYS[d];
      col.appendChild(h);
      const list = blocks.filter((b) => b.weekday === d).sort((a, b) => a.start.localeCompare(b.start));
      if (!list.length) {
        const p = document.createElement("p");
        p.className = "empty";
        p.textContent = "No blocks";
        col.appendChild(p);
      } else {
        list.forEach((b) => {
          const div = document.createElement("div");
          div.className = "block-item";
          div.innerHTML = `<div><strong>${escapeHtml(b.label)}</strong></div>
            <div class="task-meta">${escapeHtml(b.start)} – ${escapeHtml(b.end)}</div>
            <div class="row-actions">
              <button type="button" class="secondary btn-edit" data-id="${escapeHtml(b.id)}">Edit</button>
              <button type="button" class="danger btn-del" data-id="${escapeHtml(b.id)}">Delete</button>
            </div>`;
          col.appendChild(div);
        });
      }
      grid.appendChild(col);
    }

    grid.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", () => startEdit(btn.getAttribute("data-id")));
    });
    grid.querySelectorAll(".btn-del").forEach((btn) => {
      btn.addEventListener("click", () => del(btn.getAttribute("data-id")));
    });
  }

  function startEdit(id) {
    const b = blocks.find((x) => x.id === id);
    if (!b) return;
    document.getElementById("edit-id").value = b.id;
    document.getElementById("weekday").value = String(b.weekday);
    document.getElementById("start").value = b.start.length === 5 ? b.start : b.start.slice(0, 5);
    document.getElementById("end").value = b.end.length === 5 ? b.end : b.end.slice(0, 5);
    document.getElementById("label").value = b.label;
    document.getElementById("submit-btn").textContent = "Save block";
    document.getElementById("cancel-edit").hidden = false;
  }

  function resetForm() {
    document.getElementById("edit-id").value = "";
    document.getElementById("block-form").reset();
    document.getElementById("weekday").value = String(new Date().getDay());
    document.getElementById("submit-btn").textContent = "Add block";
    document.getElementById("cancel-edit").hidden = true;
  }

  async function del(id) {
    if (!confirm("Delete this block?")) return;
    await api.deleteTimetable(id);
    if (document.getElementById("edit-id").value === id) resetForm();
    await refresh();
    await loadSuggestions();
  }

  document.getElementById("block-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("edit-id").value;
    const body = {
      weekday: Number(document.getElementById("weekday").value),
      start: document.getElementById("start").value,
      end: document.getElementById("end").value,
      label: document.getElementById("label").value.trim(),
    };
    if (editId) await api.putTimetable(editId, body);
    else await api.postTimetable(body);
    resetForm();
    await refresh();
    await loadSuggestions();
  });

  document.getElementById("cancel-edit").addEventListener("click", resetForm);

  async function loadSuggestions() {
    const el = document.getElementById("suggestions-panel");
    const wd = Number(document.getElementById("suggest-day").value);
    try {
      const data = await api.getSuggestions(wd);
      if (!data.slots || !data.slots.length) {
        el.innerHTML =
          '<p class="empty">No slots for this day. Try another day or adjust Settings.</p>';
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
    } catch {
      el.innerHTML = '<p class="empty">Could not load suggestions.</p>';
    }
  }

  fillWeekdaySelect(document.getElementById("weekday"), false);
  const suggestSel = document.getElementById("suggest-day");
  fillWeekdaySelect(suggestSel, true);
  suggestSel.value = String(new Date().getDay());
  suggestSel.addEventListener("change", loadSuggestions);

  refresh().then(loadSuggestions);
})();
