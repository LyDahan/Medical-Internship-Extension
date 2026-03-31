const statusEl = document.getElementById('status');
const tbody = document.getElementById('tbody');
const schedulePanel = document.getElementById('schedule-panel');
const selectedLabel = document.getElementById('selected-label');
const scheduleBtn = document.getElementById('schedule-btn');
const datetimeInput = document.getElementById('schedule-time');
const confirmMsg = document.getElementById('confirm-msg');

let selectedRow = null;
let currentTabId = null;

function scrapeRows() {
  const rows = document.querySelectorAll('tr.rgRow, tr.rgAltRow');
  return Array.from(rows).map(row => {
    const cells = row.querySelectorAll('td');
    const btn = row.querySelector('input[type="submit"], input[type="button"]');
    return {
      hospital:   cells[0]?.innerText.trim() ?? '',
      specialty:  cells[1]?.innerText.trim() ?? '',
      date:       cells[2]?.innerText.trim() ?? '',
      spots:      cells[3]?.innerText.trim() ?? '',
      statusText: btn?.value ?? cells[4]?.innerText.trim() ?? '',
      statusColor: btn?.style.color ?? '',
      buttonName: btn?.name ?? '',
    };
  });
}

function badgeClass(color) {
  if (color.toLowerCase() === 'green') return 'available';
  if (color.toLowerCase() === 'red')   return 'unavailable';
  return 'other';
}

async function load() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;

  let results;
  try {
    [{ result: results }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeRows,
    });
  } catch (e) {
    statusEl.textContent = 'Could not scrape page. Make sure you are on the internship site.';
    return;
  }

  if (!results || results.length === 0) {
    statusEl.textContent = 'No internship rows found on this page.';
    return;
  }

  statusEl.textContent = `${results.length} internship(s) found. Click a row to schedule.`;

  tbody.innerHTML = '';
  results.forEach(row => {
    const tr = document.createElement('tr');
    tr.className = 'selectable';
    tr.innerHTML = `
      <td>${row.hospital}</td>
      <td>${row.specialty}</td>
      <td>${row.date}</td>
      <td>${row.spots}</td>
      <td><span class="badge ${badgeClass(row.statusColor)}">${row.statusText}</span></td>
    `;
    tr.addEventListener('click', () => {
      document.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
      tr.classList.add('selected');
      selectedRow = row;
      selectedLabel.textContent = `${row.hospital} — ${row.specialty}`;
      schedulePanel.style.display = 'block';
      confirmMsg.textContent = '';
    });
    tbody.appendChild(tr);
  });
}

scheduleBtn.addEventListener('click', async () => {
  if (!selectedRow || !datetimeInput.value) return;

  const targetTime = new Date(datetimeInput.value).getTime();
  if (targetTime <= Date.now()) {
    confirmMsg.textContent = 'Please pick a future date/time.';
    confirmMsg.style.color = 'red';
    return;
  }

  await chrome.storage.local.set({
    schedule: {
      tabId: currentTabId,
      buttonName: selectedRow.buttonName,
      hospital: selectedRow.hospital,
      specialty: selectedRow.specialty,
      targetTime,
    }
  });

  await chrome.alarms.create('internship-spam', { when: targetTime });

  confirmMsg.textContent = `Scheduled for ${new Date(targetTime).toLocaleString()}`;
  confirmMsg.style.color = 'green';
});

load();
