// Sternen-Challenge — App-Logik

let KID = KIDS[ACTIVE_KID_ID];

// Nur im Test-Repo relevant: simuliertes "Heute" (gemeinsam fuer beide Kinder),
// verschoben ueber den "Naechster Tag"-Debug-Button. Ueberlebt einen Browser-Neustart.
function todayISO() {
  const d = new Date();
  if (TEST_MODE) {
    const offsetDays = parseInt(localStorage.getItem("scDateOffsetDays") || "0", 10);
    d.setDate(d.getDate() + offsetDays);
  }
  return isoFromDate(d);
}

function isoFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekdayName(iso) {
  const names = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const d = new Date(iso + "T00:00:00");
  return names[d.getDay()];
}

function isWeekend(iso) {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

function formatDateHuman(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dayIndex(iso) {
  const start = new Date(CHALLENGE.startDate + "T00:00:00");
  const cur = new Date(iso + "T00:00:00");
  const diffDays = Math.round((cur - start) / 86400000) + 1;
  return diffDays;
}

// Anwendung der Konfiguration (Kind-Theme) auf CSS-Variablen
function applyKidTheme() {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", KID.colorPrimary);
  root.style.setProperty("--color-accent", KID.colorAccent);
  root.style.setProperty("--color-bg", KID.colorBg);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", KID.colorPrimary);
  document.getElementById("kid-emoji").textContent = KID.emoji;
  document.getElementById("kid-name").textContent = KID.name;
}

function computeMainStars(record) {
  let stars = 0;
  for (const t of TASKS) {
    if (t.auto) {
      const done = t.dependsOn.every((id) => record.checked[id]);
      if (done) stars += t.stars;
    } else if (record.checked[t.id]) {
      stars += t.stars;
    }
  }
  return stars;
}

function computeBonusStars(record) {
  let stars = 0;
  for (const b of BONUS_TASKS) {
    stars += record.bonus[b.id] || 0;
  }
  return stars;
}

// Haupt- + Bonus-Sterne zusammen, maximal 14 (9 Hauptaufgaben + 3 + 2 Extra-Bonus).
function computeDayTotalStars(record) {
  return computeMainStars(record) + computeBonusStars(record);
}

function starsToCHF(stars) {
  return (stars * CHALLENGE.starValueCHF).toFixed(2);
}

async function computeGrandTotal() {
  const days = await getAllDaysForKid(KID.id);
  let stars = 0;
  for (const rec of days) {
    stars += computeDayTotalStars(rec);
  }
  return stars;
}

async function resizeImageFile(file, maxDim = 800, quality = 0.6) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function dataUrlToFile(dataUrl, filename) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

let currentRecord = null;
let currentIso = null;

async function render() {
  currentIso = todayISO();
  const dayView = document.getElementById("day-view");
  const dayCounter = document.getElementById("day-counter");
  applyKidTheme();

  const idx = dayIndex(currentIso);

  if (!TEST_MODE) {
    if (idx < 1) {
      dayCounter.textContent = "";
      dayView.innerHTML = `<div class="gate-screen"><span class="gate-emoji">🎉</span>Die Challenge startet am ${formatDateHuman(CHALLENGE.startDate)}!<br>Bald geht's los, ${KID.name}!</div>`;
      renderTotalBar(null);
      return;
    }
    if (idx > CHALLENGE.totalDays) {
      const total = await computeGrandTotal();
      dayCounter.textContent = "";
      dayView.innerHTML = `<div class="gate-screen"><span class="gate-emoji">🏆</span>Die Challenge ist geschafft!<br><strong>${total} ⭐ = ${starsToCHF(total)} CHF</strong><br>Super gemacht, ${KID.name}!</div>`;
      renderTotalBar(null);
      return;
    }
    dayCounter.textContent = `Tag ${idx} von ${CHALLENGE.totalDays}`;
  } else {
    dayCounter.textContent = "Testversion";
  }

  currentRecord = await getDay(KID.id, currentIso);

  if (isWeekend(currentIso)) {
    dayView.innerHTML = `<div class="gate-screen"><span class="gate-emoji">🛝</span>Heute ist Pause-Tag!<br>Schönes Wochenende, ${KID.name}! 🎉</div>` + renderDebugPanelHtml();
    renderTotalBar(0);
    wireDebugPanelEvents(dayView);
    return;
  }

  if (currentRecord.submitted) {
    dayView.innerHTML = `
      <div class="wait-screen">
        <img src="${WAIT_IMAGE}" alt="Bis morgen" />
        <div class="wait-screen-text">Super gemacht, ${KID.name}! Der heutige Bericht ist unterwegs zu Mama.<br>Bis morgen! 🌙</div>
      </div>` + renderDebugPanelHtml();
    renderTotalBar(computeDayTotalStars(currentRecord), { shareable: false });
    wireDebugPanelEvents(dayView);
    return;
  }

  renderTaskDay(dayView);
  renderTotalBar(computeDayTotalStars(currentRecord));
}

function renderTaskCardHtml(t, rec) {
  const isAuto = !!t.auto;
  const done = isAuto ? t.dependsOn.every((id) => rec.checked[id]) : !!rec.checked[t.id];
  const photo = rec.photos[t.id];
  return `
      <div class="task-card ${done ? "done" : ""} ${isAuto ? "auto" : ""} ${t.mandatory ? "mandatory" : ""}" data-task="${t.id}">
        <div class="task-check" data-role="check" data-task="${t.id}" ${isAuto ? "" : ""}>${done ? "✓" : ""}</div>
        <div class="task-body">
          <div class="task-label">${t.label}${t.mandatory ? " (Pflicht)" : ""}</div>
          ${t.hint ? `<div class="task-hint">${t.hint}</div>` : ""}
          <div class="task-stars">${"⭐".repeat(t.stars)}</div>
        </div>
        ${!isAuto ? `
          ${photo
            ? `<img class="task-photo-thumb" src="${photo}" data-role="photo-view" data-task="${t.id}" />`
            : `<button class="task-photo-btn" data-role="photo-add" data-task="${t.id}">📷</button>`}
        ` : ""}
      </div>`;
}

const MAX_MAIN_STARS = TASKS.reduce((sum, t) => sum + t.stars, 0);

function renderTaskDay(container) {
  const rec = currentRecord;
  const mainStars = computeMainStars(rec);

  let html = `<div class="today-stars-banner">${weekdayName(currentIso)}, ${formatDateHuman(currentIso)} — ${mainStars} / ${MAX_MAIN_STARS} ⭐ heute</div>`;

  html += `<div class="section-title">Heutige Aufgaben</div>`;
  for (const t of TASKS) {
    html += renderTaskCardHtml(t, rec);
  }

  html += `<div class="section-title">Bonus-Aufgaben (Extra)</div>`;
  for (const b of BONUS_TASKS) {
    const val = rec.bonus[b.id] || 0;
    const photo = rec.photos[b.id];
    let stars = "";
    for (let i = 1; i <= b.maxStars; i++) {
      stars += `<span class="bonus-star ${i <= val ? "active" : ""}" data-role="bonus-star" data-task="${b.id}" data-value="${i}">⭐</span>`;
    }
    html += `
      <div class="bonus-card">
        <div class="bonus-body">
          <div class="bonus-label">${b.label} <span style="opacity:.6">(bis zu ${b.maxStars} Extra-${b.maxStars === 1 ? "Stern" : "Sterne"})</span></div>
          <div class="bonus-stars">${stars}</div>
        </div>
        ${photo
          ? `<img class="task-photo-thumb" src="${photo}" data-role="photo-view" data-task="${b.id}" />`
          : `<button class="task-photo-btn" data-role="photo-add" data-task="${b.id}">📷</button>`}
      </div>`;
  }

  html += renderDebugPanelHtml();

  container.innerHTML = html;
  wireTaskEvents(container);
  wireDebugPanelEvents(container);
}

function wireTaskEvents(container) {
  container.querySelectorAll('[data-role="check"]').forEach((el) => {
    const taskId = el.dataset.task;
    const task = TASKS.find((t) => t.id === taskId);
    if (task.auto) return; // nicht klickbar, wird automatisch berechnet
    el.addEventListener("click", async () => {
      currentRecord.checked[taskId] = !currentRecord.checked[taskId];
      await putDay(currentRecord);
      renderTaskDay(container);
      renderTotalBar(computeDayTotalStars(currentRecord));
    });
  });

  container.querySelectorAll('[data-role="photo-add"]').forEach((el) => {
    const taskId = el.dataset.task;
    el.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      input.addEventListener("change", async () => {
        if (!input.files || !input.files[0]) return;
        const dataUrl = await resizeImageFile(input.files[0]);
        currentRecord.photos[taskId] = dataUrl;
        await putDay(currentRecord);
        renderTaskDay(container);
      });
      input.click();
    });
  });

  container.querySelectorAll('[data-role="photo-view"]').forEach((el) => {
    const taskId = el.dataset.task;
    el.title = "Antippen zum Entfernen";
    el.addEventListener("click", async () => {
      delete currentRecord.photos[taskId];
      await putDay(currentRecord);
      renderTaskDay(container);
    });
  });

  container.querySelectorAll('[data-role="bonus-star"]').forEach((el) => {
    const taskId = el.dataset.task;
    const value = parseInt(el.dataset.value, 10);
    el.addEventListener("click", async () => {
      const current = currentRecord.bonus[taskId] || 0;
      // Erneutes Klicken auf den aktuellen Wert setzt zurück auf 0
      currentRecord.bonus[taskId] = current === value ? value - 1 : value;
      await putDay(currentRecord);
      renderTaskDay(container);
      renderTotalBar(computeDayTotalStars(currentRecord));
    });
  });
}

async function renderTotalBar(todayStars, { shareable = true } = {}) {
  const bar = document.getElementById("total-bar");
  const grand = await computeGrandTotal();
  let html = "";
  if (todayStars !== null) {
    html += `<div id="total-text">Heute: <strong>${todayStars} ⭐ = ${starsToCHF(todayStars)} CHF</strong> &nbsp;·&nbsp; Gesamt: <strong>${grand} ⭐ = ${starsToCHF(grand)} CHF</strong></div>`;
    if (shareable) {
      const mandatoryTasks = TASKS.filter((t) => t.mandatory);
      const mandatoryDone = mandatoryTasks.every((t) => currentRecord.checked[t.id]);
      if (!mandatoryDone) {
        const missing = mandatoryTasks.filter((t) => !currentRecord.checked[t.id]).map((t) => t.label).join(", ");
        html += `<div class="share-blocked-hint">Erst „${missing}“ erledigen, um den Tag abzuschliessen.</div>`;
      }
      html += `<button class="share-button" id="share-btn" ${mandatoryDone ? "" : "disabled"}>Tag abschliessen & teilen</button>`;
    }
  } else {
    html = `<div id="total-text">Gesamt bisher: <strong>${grand} ⭐ = ${starsToCHF(grand)} CHF</strong></div>`;
  }
  bar.innerHTML = html;
  const btn = document.getElementById("share-btn");
  if (btn && !btn.disabled) btn.addEventListener("click", shareDay);
}

async function shareDay() {
  const rec = currentRecord;
  rec.submitted = true;
  await putDay(rec);

  const todayTotal = computeDayTotalStars(rec);
  const grand = await computeGrandTotal();

  let lines = [];
  lines.push(`⭐ Sternen-Challenge — ${KID.name}`);
  lines.push(`${weekdayName(currentIso)}, ${formatDateHuman(currentIso)}`);
  lines.push("");
  for (const t of TASKS) {
    const done = t.auto
      ? t.dependsOn.every((id) => rec.checked[id])
      : !!rec.checked[t.id];
    lines.push(`${done ? "✅" : "⬜"} ${t.label} (${t.stars}⭐)`);
  }
  for (const b of BONUS_TASKS) {
    const val = rec.bonus[b.id] || 0;
    if (val > 0) lines.push(`✅ ${b.label} (${val}⭐ extra)`);
  }
  lines.push("");
  lines.push(`Heute: ${todayTotal} ⭐ = ${starsToCHF(todayTotal)} CHF`);
  lines.push(`Gesamt bisher: ${grand} ⭐ = ${starsToCHF(grand)} CHF`);

  const text = lines.join("\n");
  const files = [];
  for (const t of TASKS) {
    const photo = rec.photos[t.id];
    if (photo) files.push(dataUrlToFile(photo, `${t.id}.jpg`));
  }

  const shareData = { title: "Sternen-Challenge", text };
  if (files.length && navigator.canShare && navigator.canShare({ files })) {
    shareData.files = files;
  }

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (e) {
      // Nutzer hat Teilen abgebrochen — Tag gilt trotzdem als abgeschlossen
    }
  } else {
    showTextOverlay(text);
  }

  render(); // wechselt jetzt auf den Wartebild-Screen (rec.submitted === true)
}

function showTextOverlay(text) {
  const overlay = document.createElement("div");
  overlay.className = "share-overlay";
  overlay.innerHTML = `
    <div class="share-card">
      <div class="share-card-title">Tagesbericht (Teilen wird hier nicht unterstützt)</div>
      <pre class="share-text"></pre>
      <button class="share-close-btn" data-role="share-close">Schliessen</button>
    </div>`;
  overlay.querySelector(".share-text").textContent = text;
  overlay.querySelector('[data-role="share-close"]').addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

function showConfirmOverlay(title, message, onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "share-overlay";
  overlay.innerHTML = `
    <div class="share-card">
      <div class="share-card-title">${title}</div>
      <p class="install-instructions">${message}</p>
      <div class="confirm-actions">
        <button class="share-close-btn confirm-cancel-btn" data-role="confirm-cancel">Abbrechen</button>
        <button class="share-close-btn" data-role="confirm-ok">Ja, fortfahren</button>
      </div>
    </div>`;
  overlay.querySelector('[data-role="confirm-cancel"]').addEventListener("click", () => overlay.remove());
  overlay.querySelector('[data-role="confirm-ok"]').addEventListener("click", async () => {
    overlay.remove();
    await onConfirm();
  });
  document.body.appendChild(overlay);
}

// Debug-Werkzeuge (Reset / Tag zuruecksetzen / Naechster Tag / Kind wechseln) —
// existieren nur im Test-Repo (TEST_MODE=true), gesteuert allein ueber diesen Flag.
// In den Produktiv-Repos (Elias/Linda, TEST_MODE=false) rendern diese Funktionen nichts.
function renderDebugPanelHtml() {
  if (!TEST_MODE) return "";
  return `
    <div class="debug-panel">
      <div class="debug-panel-title">🧪 Nur für den Test (${KID.name})</div>
      <div class="debug-panel-buttons">
        <button class="debug-btn" data-role="debug-reset-day">Tag zurücksetzen</button>
        <button class="debug-btn" data-role="debug-next-day">Nächster Tag ▶</button>
        <button class="debug-btn debug-btn-danger" data-role="debug-reset-all">Alles zurücksetzen</button>
        <button class="debug-btn" data-role="debug-switch-kid">Kind wechseln</button>
      </div>
    </div>`;
}

function wireDebugPanelEvents(container) {
  if (!TEST_MODE) return;

  const resetDayBtn = container.querySelector('[data-role="debug-reset-day"]');
  if (resetDayBtn) {
    resetDayBtn.addEventListener("click", async () => {
      currentRecord.submitted = false;
      await putDay(currentRecord);
      render();
    });
  }

  const nextDayBtn = container.querySelector('[data-role="debug-next-day"]');
  if (nextDayBtn) {
    nextDayBtn.addEventListener("click", () => {
      const offset = parseInt(localStorage.getItem("scDateOffsetDays") || "0", 10);
      localStorage.setItem("scDateOffsetDays", String(offset + 1));
      render();
    });
  }

  const resetAllBtn = container.querySelector('[data-role="debug-reset-all"]');
  if (resetAllBtn) {
    resetAllBtn.addEventListener("click", () => {
      showConfirmOverlay(
        "Wirklich alles zurücksetzen?",
        `Alle bisher eingegebenen Tage von ${KID.name} werden gelöscht. Das lässt sich nicht rückgängig machen.`,
        async () => {
          await deleteAllDaysForKid(KID.id);
          render();
        }
      );
    });
  }

  const switchKidBtn = container.querySelector('[data-role="debug-switch-kid"]');
  if (switchKidBtn) {
    switchKidBtn.addEventListener("click", () => {
      localStorage.removeItem("scSelectedKid");
      showKidPickerScreen(() => showTitleScreen(() => render()));
    });
  }
}

function showKidPickerScreen(onChosen) {
  const overlay = document.createElement("div");
  overlay.id = "kid-picker-screen";
  const kidIds = Object.keys(KIDS);
  overlay.innerHTML = `
    <div class="kid-picker-title">Wer bist du?</div>
    <div class="kid-picker-options">
      ${kidIds
        .map(
          (id) => `
        <button class="kid-picker-option" data-kid="${id}">
          <span class="kid-picker-emoji">${KIDS[id].emoji}</span>
          <span class="kid-picker-name">${KIDS[id].name}</span>
        </button>`
        )
        .join("")}
    </div>`;
  overlay.querySelectorAll(".kid-picker-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.kid;
      KID = KIDS[id];
      localStorage.setItem("scSelectedKid", id);
      overlay.remove();
      onChosen();
    });
  });
  document.body.appendChild(overlay);
}

function showTitleScreen(onDismiss) {
  const overlay = document.createElement("div");
  overlay.id = "title-screen";
  overlay.innerHTML = `
    <img src="${KID.titleImage}" alt="${KID.name}" />
    <div class="title-tap-hint">Antippen zum Starten</div>`;
  overlay.addEventListener("click", () => {
    overlay.remove();
    onDismiss();
  });
  document.body.appendChild(overlay);
}

function maybeShowInstallHint() {
  const alreadyInstalled = window.matchMedia("(display-mode: standalone)").matches;
  const alreadyDismissed = localStorage.getItem("scInstallHintDismissed");
  const isAndroid = /Android/i.test(navigator.userAgent);
  if (alreadyInstalled || alreadyDismissed || !isAndroid) return;

  const overlay = document.createElement("div");
  overlay.className = "share-overlay";
  overlay.innerHTML = `
    <div class="share-card">
      <div class="share-card-title">Auf dem Handy einrichten</div>
      <p class="install-instructions">Tippe oben rechts im Browser auf <strong>⋮</strong> und dann auf <strong>"Zum Startbildschirm hinzufügen"</strong> — dann hast du das Stern-Symbol direkt auf deinem Handy und kannst die App auch offline öffnen.</p>
      <button class="share-close-btn" data-role="install-hint-close">Verstanden</button>
    </div>`;
  overlay.querySelector('[data-role="install-hint-close"]').addEventListener("click", () => {
    localStorage.setItem("scInstallHintDismissed", "1");
    overlay.remove();
  });
  document.body.appendChild(overlay);
}

window.addEventListener("DOMContentLoaded", () => {
  const start = () => {
    showTitleScreen(() => {
      render();
      maybeShowInstallHint();
    });
  };

  if (TEST_MODE) {
    const storedKidId = localStorage.getItem("scSelectedKid");
    if (storedKidId && KIDS[storedKidId]) {
      KID = KIDS[storedKidId];
      start();
    } else {
      showKidPickerScreen(start);
    }
  } else {
    start();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
});
