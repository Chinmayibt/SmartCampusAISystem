const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_PATH = path.join(__dirname, "..", "data", "store.json");

const defaultStore = () => ({
  preferences: {
    sessionLengthMin: 45,
    dayStartHour: 8,
    dayEndHour: 22,
  },
  timetable: [],
  tasks: [],
});

let cache = null;
let writeChain = Promise.resolve();

function readFileSyncSafe() {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}

function loadStore() {
  if (cache) return cache;
  const existing = readFileSyncSafe();
  if (existing && typeof existing === "object") {
    cache = {
      ...defaultStore(),
      ...existing,
      preferences: { ...defaultStore().preferences, ...existing.preferences },
      timetable: Array.isArray(existing.timetable) ? existing.timetable : [],
      tasks: Array.isArray(existing.tasks) ? existing.tasks : [],
    };
  } else {
    cache = defaultStore();
    saveStoreSync(cache);
  }
  return cache;
}

function saveStoreSync(data) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

function saveStore(data) {
  cache = data;
  writeChain = writeChain.then(() => {
    saveStoreSync(data);
  });
  return writeChain;
}

function getPreferences() {
  return { ...loadStore().preferences };
}

function updatePreferences(patch) {
  const s = loadStore();
  s.preferences = {
    ...s.preferences,
    ...patch,
  };
  if (s.preferences.sessionLengthMin < 5) s.preferences.sessionLengthMin = 5;
  if (s.preferences.sessionLengthMin > 240) s.preferences.sessionLengthMin = 240;
  s.preferences.dayStartHour = Math.max(0, Math.min(23, Number(s.preferences.dayStartHour) || 8));
  s.preferences.dayEndHour = Math.max(0, Math.min(24, Number(s.preferences.dayEndHour) || 22));
  if (s.preferences.dayEndHour <= s.preferences.dayStartHour) {
    s.preferences.dayEndHour = Math.min(24, s.preferences.dayStartHour + 1);
  }
  return saveStore(s).then(() => ({ ...s.preferences }));
}

function listTimetable() {
  return [...loadStore().timetable];
}

function createTimetableBlock(body) {
  const s = loadStore();
  const block = {
    id: crypto.randomUUID(),
    weekday: Number(body.weekday),
    start: String(body.start || "09:00"),
    end: String(body.end || "10:00"),
    label: String(body.label || "").trim() || "Block",
  };
  if (block.weekday < 0 || block.weekday > 6) block.weekday = 0;
  s.timetable.push(block);
  return saveStore(s).then(() => block);
}

function updateTimetableBlock(id, body) {
  const s = loadStore();
  const i = s.timetable.findIndex((b) => b.id === id);
  if (i === -1) return Promise.resolve(null);
  const b = s.timetable[i];
  if (body.weekday !== undefined) b.weekday = Math.max(0, Math.min(6, Number(body.weekday)));
  if (body.start !== undefined) b.start = String(body.start);
  if (body.end !== undefined) b.end = String(body.end);
  if (body.label !== undefined) b.label = String(body.label).trim() || b.label;
  return saveStore(s).then(() => b);
}

function deleteTimetableBlock(id) {
  const s = loadStore();
  const before = s.timetable.length;
  s.timetable = s.timetable.filter((b) => b.id !== id);
  if (s.timetable.length === before) return Promise.resolve(false);
  return saveStore(s).then(() => true);
}

function listTasks(upcomingOnly) {
  let tasks = [...loadStore().tasks];
  if (upcomingOnly) {
    const now = Date.now();
    tasks = tasks.filter((t) => !t.completed && new Date(t.dueAt).getTime() >= now - 86400000);
  }
  tasks.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  return tasks;
}

function createTask(body) {
  const s = loadStore();
  const task = {
    id: crypto.randomUUID(),
    title: String(body.title || "").trim() || "Untitled",
    kind: body.kind === "exam" ? "exam" : "assignment",
    dueAt: body.dueAt ? String(body.dueAt) : new Date().toISOString(),
    remindAt: body.remindAt != null && body.remindAt !== "" ? String(body.remindAt) : null,
    notes: String(body.notes || ""),
    completed: false,
    studyLogs: [],
  };
  s.tasks.push(task);
  return saveStore(s).then(() => task);
}

function updateTask(id, body) {
  const s = loadStore();
  const t = s.tasks.find((x) => x.id === id);
  if (!t) return Promise.resolve(null);
  if (body.title !== undefined) t.title = String(body.title).trim() || t.title;
  if (body.kind !== undefined) t.kind = body.kind === "exam" ? "exam" : "assignment";
  if (body.dueAt !== undefined) t.dueAt = String(body.dueAt);
  if (body.remindAt !== undefined) t.remindAt = body.remindAt ? String(body.remindAt) : null;
  if (body.notes !== undefined) t.notes = String(body.notes);
  if (body.completed !== undefined) {
    t.completed = Boolean(body.completed);
    if (t.completed) t.completedAt = new Date().toISOString();
    else delete t.completedAt;
  }
  if (body.logMinutes != null && Number(body.logMinutes) > 0) {
    if (!Array.isArray(t.studyLogs)) t.studyLogs = [];
    t.studyLogs.push({
      at: new Date().toISOString(),
      minutes: Math.round(Number(body.logMinutes)),
    });
  }
  return saveStore(s).then(() => t);
}

function deleteTask(id) {
  const s = loadStore();
  const before = s.tasks.length;
  s.tasks = s.tasks.filter((t) => t.id !== id);
  if (s.tasks.length === before) return Promise.resolve(false);
  return saveStore(s).then(() => true);
}

function timeToMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!m) return 0;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return h * 60 + min;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out = [sorted[0].slice()];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
    else out.push(cur.slice());
  }
  return out;
}

function getSuggestions(weekday) {
  const s = loadStore();
  const w = Math.max(0, Math.min(6, Number(weekday)));
  const { sessionLengthMin, dayStartHour, dayEndHour } = s.preferences;
  const dayStartMin = dayStartHour * 60;
  const dayEndMin = Math.min(24 * 60, dayEndHour * 60);

  const blocks = s.timetable.filter((b) => b.weekday === w);
  const busy = blocks.map((b) => {
    const a = timeToMinutes(b.start);
    const e = timeToMinutes(b.end);
    return a < e ? [a, e] : [e, a];
  });

  busy.push([0, dayStartMin]);
  busy.push([dayEndMin, 24 * 60]);

  const merged = mergeIntervals(busy);
  const slots = [];
  const step = 15;
  const maxSlots = 5;

  for (let i = 0; i < merged.length - 1 && slots.length < maxSlots; i++) {
    const gapStart = merged[i][1];
    const gapEnd = merged[i + 1][0];
    const gapLen = gapEnd - gapStart;
    if (gapLen < sessionLengthMin) continue;

    let pos = gapStart;
    while (pos + sessionLengthMin <= gapEnd && slots.length < maxSlots) {
      const aligned = Math.ceil(pos / step) * step;
      const start = aligned;
      if (start + sessionLengthMin > gapEnd) break;
      const before = blocks
        .filter((b) => timeToMinutes(b.end) <= gapStart)
        .sort((a, b) => timeToMinutes(b.end) - timeToMinutes(a.end));
      const lastBefore = before[before.length - 1];
      const reason = lastBefore
        ? `free_after_${lastBefore.label.replace(/\s+/g, "_")}`
        : "free_window";
      slots.push({
        start: minutesToTime(start),
        end: minutesToTime(start + sessionLengthMin),
        reason,
      });
      pos = start + sessionLengthMin;
    }
  }

  return { weekday: w, slots };
}

module.exports = {
  loadStore,
  getPreferences,
  updatePreferences,
  listTimetable,
  createTimetableBlock,
  updateTimetableBlock,
  deleteTimetableBlock,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  getSuggestions,
};
