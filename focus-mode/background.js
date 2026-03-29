chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'internship-spam') return;

  const { schedule } = await chrome.storage.local.get('schedule');
  if (!schedule) return;

  const { tabId, buttonName } = schedule;

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (name) => {
      const interval = setInterval(() => {
        const btn = document.querySelector(`input[name="${name}"]`);
        if (!btn) { clearInterval(interval); return; }
        btn.click();
      }, 200);
      setTimeout(() => clearInterval(interval), 60000);
    },
    args: [buttonName],
  });

  await chrome.storage.local.remove('schedule');
});
