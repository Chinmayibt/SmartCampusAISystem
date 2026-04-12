const express = require("express");
const store = require("../lib/store");

const router = express.Router();

router.get("/preferences", (req, res) => {
  res.json(store.getPreferences());
});

router.put("/preferences", express.json(), (req, res) => {
  const { sessionLengthMin, dayStartHour, dayEndHour } = req.body || {};
  const patch = {};
  if (sessionLengthMin != null) patch.sessionLengthMin = Number(sessionLengthMin);
  if (dayStartHour != null) patch.dayStartHour = Number(dayStartHour);
  if (dayEndHour != null) patch.dayEndHour = Number(dayEndHour);
  store.updatePreferences(patch).then((p) => res.json(p));
});

router.get("/timetable", (req, res) => {
  res.json(store.listTimetable());
});

router.post("/timetable", express.json(), (req, res) => {
  store.createTimetableBlock(req.body || {}).then((b) => res.status(201).json(b));
});

router.put("/timetable/:id", express.json(), (req, res) => {
  store.updateTimetableBlock(req.params.id, req.body || {}).then((b) => {
    if (!b) return res.status(404).json({ error: "Not found" });
    res.json(b);
  });
});

router.delete("/timetable/:id", (req, res) => {
  store.deleteTimetableBlock(req.params.id).then((ok) => {
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  });
});

router.get("/tasks", (req, res) => {
  const upcoming = req.query.upcoming === "1" || req.query.upcoming === "true";
  res.json(store.listTasks(upcoming));
});

router.post("/tasks", express.json(), (req, res) => {
  store.createTask(req.body || {}).then((t) => res.status(201).json(t));
});

router.put("/tasks/:id", express.json(), (req, res) => {
  store.updateTask(req.params.id, req.body || {}).then((t) => {
    if (!t) return res.status(404).json({ error: "Not found" });
    res.json(t);
  });
});

router.delete("/tasks/:id", (req, res) => {
  store.deleteTask(req.params.id).then((ok) => {
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  });
});

router.get("/suggestions", (req, res) => {
  const weekday = req.query.weekday != null ? Number(req.query.weekday) : new Date().getDay();
  res.json(store.getSuggestions(weekday));
});

module.exports = router;
