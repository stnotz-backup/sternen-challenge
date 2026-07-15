// Sternen-Challenge — App-Logik

function todayISO() {
  const d = new Date();
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
  const days = await getAllDays();
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

  currentRecord = await getDay(currentIso);

  if (isWeekend(currentIso)) {
    dayView.innerHTML = `<div class="gate-screen"><span class="gate-emoji">🛝</span>Heute ist Pause-Tag!<br>Schönes Wochenende, ${KID.name}! 🎉</div>`;
    renderTotalBar(0);
    return;
  }

  if (currentRecord.submitted) {
    dayView.innerHTML = `
      <div class="wait-screen">
        <img src="${WAIT_IMAGE}" alt="Bis morgen" />
        <div class="wait-screen-text">Super gemacht, ${KID.name}! Der heutige Bericht ist unterwegs zu Mama.<br>Bis morgen! 🌙</div>
      </div>`;
    renderTotalBar(computeDayTotalStars(currentRecord), { shareable: false });
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

function renderTaskDay(container) {
  const rec = currentRecord;
  const mainStars = computeMainStars(rec);

  let html = `<div class="today-stars-banner">${weekdayName(currentIso)}, ${formatDateHuman(currentIso)} — ${mainStars} / 9 ⭐ heute</div>`;

  html += `<div class="section-title">Heutige Aufgaben</div>`;
  for (const t of TASKS) {
    if (t.id === "bonus_geholfen") continue; // wird weiter unten, hinter den Extra-Bonusaufgaben, gerendert
    html += renderTaskCardHtml(t, rec);
  }

  html += `<div class="section-title">Bonus-Aufgaben (Extra)</div>`;
  for (const b of BONUS_TASKS) {
    const val = rec.bonus[b.id] || 0;
    let stars = "";
    for (let i = 1; i <= b.maxStars; i++) {
      stars += `<span class="bonus-star ${i <= val ? "active" : ""}" data-role="bonus-star" data-task="${b.id}" data-value="${i}">⭐</span>`;
    }
    html += `
      <div class="bonus-card">
        <div class="bonus-label">${b.label} <span style="opacity:.6">(bis zu ${b.maxStars} Extra-Sterne)</span></div>
        <div class="bonus-stars">${stars}</div>
      </div>`;
  }

  html += renderTaskCardHtml(TASKS.find((t) => t.id === "bonus_geholfen"), rec);

  container.innerHTML = html;
  wireTaskEvents(container);
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
      html += `<button class="share-button" id="share-btn">Tag abschliessen & teilen</button>`;
    }
  } else {
    html = `<div id="total-text">Gesamt bisher: <strong>${grand} ⭐ = ${starsToCHF(grand)} CHF</strong></div>`;
  }
  bar.innerHTML = html;
  const btn = document.getElementById("share-btn");
  if (btn) btn.addEventListener("click", shareDay);
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
  showTitleScreen(() => {
    render();
    maybeShowInstallHint();
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
});
