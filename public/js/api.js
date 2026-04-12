const API_BASE = "/api";

async function apiRequest(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API_BASE + path, opts);
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || res.statusText || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

const api = {
  getPreferences: () => apiRequest("GET", "/preferences"),
  putPreferences: (body) => apiRequest("PUT", "/preferences", body),
  getTimetable: () => apiRequest("GET", "/timetable"),
  postTimetable: (body) => apiRequest("POST", "/timetable", body),
  putTimetable: (id, body) => apiRequest("PUT", `/timetable/${encodeURIComponent(id)}`, body),
  deleteTimetable: (id) => apiRequest("DELETE", `/timetable/${encodeURIComponent(id)}`),
  getTasks: (upcoming) =>
    apiRequest("GET", upcoming ? "/tasks?upcoming=1" : "/tasks"),
  postTask: (body) => apiRequest("POST", "/tasks", body),
  putTask: (id, body) => apiRequest("PUT", `/tasks/${encodeURIComponent(id)}`, body),
  deleteTask: (id) => apiRequest("DELETE", `/tasks/${encodeURIComponent(id)}`),
  getSuggestions: (weekday) =>
    apiRequest("GET", `/suggestions?weekday=${encodeURIComponent(weekday)}`),
};
