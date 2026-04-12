(function () {
  async function init() {
    const p = await api.getPreferences();
    document.getElementById("sessionLengthMin").value = p.sessionLengthMin;
    document.getElementById("dayStartHour").value = p.dayStartHour;
    document.getElementById("dayEndHour").value = p.dayEndHour;
  }

  document.getElementById("prefs-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("prefs-msg");
    msg.textContent = "";
    try {
      await api.putPreferences({
        sessionLengthMin: Number(document.getElementById("sessionLengthMin").value),
        dayStartHour: Number(document.getElementById("dayStartHour").value),
        dayEndHour: Number(document.getElementById("dayEndHour").value),
      });
      msg.textContent = "Saved.";
    } catch {
      msg.textContent = "Save failed.";
    }
  });

  init().catch(() => {
    document.getElementById("prefs-msg").textContent = "Could not load settings.";
  });
})();
