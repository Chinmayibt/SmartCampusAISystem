const path = require("path");
const express = require("express");
const store = require("./lib/store");
const api = require("./routes/api");

store.loadStore();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api", api);
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`SmartStudy Planner at http://localhost:${PORT}`);
});
