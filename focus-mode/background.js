chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'internship-spam') return;

  const { schedule } = await chrome.storage.local.get('schedule');
  if (!schedule) return;

  const { tabId, buttonName } = schedule;

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (name) => {
      const clickBtnInterval = setInterval(() => {
        const btn = document.querySelector(`input[name="${name}"]`);
        if (!btn) return;
        btn.click();
        clearInterval(clickBtnInterval);

        const tryClickContinue = () => {
          const candidates = [];
          candidates.push(...Array.from(document.querySelectorAll('button')));
          candidates.push(...Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]')));
          candidates.push(...Array.from(document.querySelectorAll('a')));

          const accepted = ['continue', 'continuer', 'confirm', 'confirmer', 'yes', 'oui', 'ok', 'valider'];

          for (const el of candidates) {
            const text = (el.innerText || el.value || '').trim().toLowerCase();
            if (!text) continue;
            if (accepted.some(a => text === a || text.includes(a))) {
              try { el.click(); } catch (e) {}
              return true;
            }
          }
          return false;
        };

        const contInterval = setInterval(() => {
          if (tryClickContinue()) clearInterval(contInterval);
        }, 50);
        setTimeout(() => clearInterval(contInterval), 60000);
      }, 200);
      setTimeout(() => clearInterval(clickBtnInterval), 60000);
    },
    args: [buttonName],
  });

  await chrome.storage.local.remove('schedule');
});
