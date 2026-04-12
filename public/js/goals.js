(function () {
  const STORAGE_KEY = "ssp.goals.v1";

  function weekKey() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d.toISOString().slice(0, 10);
  }

  function weekLabel() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const fmt = (x) =>
      x.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `Week of ${fmt(d)} – ${fmt(end)}`;
  }

  function load() {
    const wk = weekKey();
    let data = { weekKey: wk, minutesTarget: "", tasksTarget: "", note: "" };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.weekKey === wk) {
          data = { ...data, ...parsed };
        }
      }
    } catch (_) {}
    return data;
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  const form = document.getElementById("goals-form");
  const msg = document.getElementById("goals-msg");
  document.getElementById("goals-week-label").textContent = weekLabel();

  const state = load();
  document.getElementById("minutesTarget").value = state.minutesTarget === "" ? "" : state.minutesTarget;
  document.getElementById("tasksTarget").value = state.tasksTarget === "" ? "" : state.tasksTarget;
  document.getElementById("goals-note").value = state.note || "";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const minutesRaw = document.getElementById("minutesTarget").value;
    const tasksRaw = document.getElementById("tasksTarget").value;
    const data = {
      weekKey: weekKey(),
      minutesTarget: minutesRaw === "" ? "" : Math.max(0, Number(minutesRaw) || 0),
      tasksTarget: tasksRaw === "" ? "" : Math.max(0, Number(tasksRaw) || 0),
      note: document.getElementById("goals-note").value,
    };
    save(data);
    msg.textContent = "Saved for this week.";
  });
})();
