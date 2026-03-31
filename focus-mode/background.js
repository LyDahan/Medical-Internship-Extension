// Phase 1: when alarm fires, click the scheduled row button
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'internship-spam') return;

  const { schedule } = await chrome.storage.local.get('schedule');
  if (!schedule) return;

  const { tabId, buttonName } = schedule;
  await chrome.storage.local.remove('schedule');

  // Store pending confirm so phase 2 knows to act on next page load
  await chrome.storage.local.set({ pendingConfirm: { tabId } });

  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: (name) => {
      const btn = document.querySelector(`input[name="${name}"]`);
      console.log('[ext] phase1: looking for', name, '→', btn);
      if (!btn) return;
      const onclick = btn.getAttribute('onclick') || '';
      if (onclick.includes('this.disabled')) {
        btn.setAttribute('onclick', onclick.replace(/this\.disabled\s*=\s*true\s*;?\s*/g, ''));
      }
      btn.click();
    },
    args: [buttonName],
  });
});

// Phase 2: after the page reloads, click the Soumettre/confirm button
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  const { pendingConfirm } = await chrome.storage.local.get('pendingConfirm');
  if (!pendingConfirm || pendingConfirm.tabId !== tabId) return;
  if (!tab.url || !tab.url.includes('DemandeCapacite.aspx')) return;

  await chrome.storage.local.remove('pendingConfirm');

  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: () => {
      const tryClick = () => {
        const candidates = [
          ...document.querySelectorAll('input[type="button"], input[type="submit"]'),
          ...document.querySelectorAll('button'),
          ...document.querySelectorAll('a'),
        ];
        const accepted = ['soumettre', 'submit', 'confirm', 'confirmer', 'continuer', 'continue', 'oui', 'yes', 'ok', 'valider'];
        for (const el of candidates) {
          const text = (el.innerText || el.value || '').trim().toLowerCase();
          if (!text) continue;
          if (accepted.some(a => text === a || text.includes(a))) {
            const onclick = el.getAttribute('onclick') || '';
            if (onclick.includes('this.disabled')) {
              el.setAttribute('onclick', onclick.replace(/this\.disabled\s*=\s*true\s*;?\s*/g, ''));
            }
            console.log('[ext] phase2: clicking confirm:', el);
            el.click();
            return true;
          }
        }
        return false;
      };

      const interval = setInterval(() => {
        if (tryClick()) clearInterval(interval);
      }, 10);
      setTimeout(() => clearInterval(interval), 10000);
    },
  });
});
