(function () {
  const display = document.getElementById("focus-display");
  const phaseEl = document.getElementById("focus-phase");
  const workInput = document.getElementById("focus-work");
  const breakInput = document.getElementById("focus-break");
  const btnStart = document.getElementById("focus-start");
  const btnPause = document.getElementById("focus-pause");
  const btnReset = document.getElementById("focus-reset");

  let mode = "idle";
  let segment = "work";
  let remainingSec = 0;
  let tickId = null;
  let lastTick = 0;

  function workSec() {
    return Math.max(60, (Number(workInput.value) || 25) * 60);
  }

  function breakSec() {
    return Math.max(60, (Number(breakInput.value) || 5) * 60);
  }

  function format(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function render() {
    display.textContent = format(remainingSec);
    if (mode === "idle" && segment === "work") {
      phaseEl.textContent = "Ready";
      display.textContent = format(workSec());
    } else if (segment === "work") {
      phaseEl.textContent = "Focus";
    } else {
      phaseEl.textContent = "Break";
    }
  }

  function stopTick() {
    if (tickId != null) {
      clearInterval(tickId);
      tickId = null;
    }
  }

  function beginBreak() {
    segment = "break";
    remainingSec = breakSec();
    mode = "running";
    lastTick = Date.now();
    tickId = setInterval(tick, 250);
    render();
  }

  function finishBreak() {
    stopTick();
    segment = "work";
    remainingSec = workSec();
    mode = "idle";
    btnStart.disabled = false;
    btnStart.textContent = "Start";
    btnPause.disabled = true;
    workInput.disabled = false;
    breakInput.disabled = false;
    render();
  }

  function tick() {
    const now = Date.now();
    const delta = Math.floor((now - lastTick) / 1000);
    if (delta < 1) return;
    lastTick = now;
    remainingSec = Math.max(0, remainingSec - delta);
    render();
    if (remainingSec > 0) return;

    stopTick();
    if (segment === "work") {
      beginBreak();
    } else {
      finishBreak();
    }
  }

  function start() {
    if (mode === "paused") {
      mode = "running";
      lastTick = Date.now();
      tickId = setInterval(tick, 250);
      btnStart.textContent = "Start";
      btnPause.disabled = false;
      return;
    }
    if (mode === "idle") {
      segment = "work";
      remainingSec = workSec();
    }
    mode = "running";
    lastTick = Date.now();
    stopTick();
    tickId = setInterval(tick, 250);
    btnStart.disabled = true;
    btnPause.disabled = false;
    workInput.disabled = true;
    breakInput.disabled = true;
    render();
  }

  function pause() {
    if (mode !== "running") return;
    stopTick();
    mode = "paused";
    btnStart.disabled = false;
    btnStart.textContent = "Resume";
    btnPause.disabled = true;
  }

  function reset() {
    stopTick();
    mode = "idle";
    segment = "work";
    remainingSec = workSec();
    btnStart.disabled = false;
    btnStart.textContent = "Start";
    btnPause.disabled = true;
    workInput.disabled = false;
    breakInput.disabled = false;
    render();
  }

  btnStart.addEventListener("click", start);
  btnPause.addEventListener("click", pause);
  btnReset.addEventListener("click", reset);
  workInput.addEventListener("change", () => {
    if (mode === "idle") render();
  });

  render();
})();
