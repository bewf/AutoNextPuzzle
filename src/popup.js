document.addEventListener('DOMContentLoaded', () => {
  const autoNextButton = document.getElementById('autoNextButton');
  const autoRetryButton = document.getElementById('autoRetryButton');
  const autoNextDelayInput = document.getElementById('autoNextDelayInput');
  const autoRetryDelayInput = document.getElementById('autoRetryDelayInput');
  const autoNextDelayWrap = document.getElementById('autoNextDelayWrap');
  const autoRetryDelayWrap = document.getElementById('autoRetryDelayWrap');

  const settings = {
    autoNext: true,
    autoRetry: true,
    autoNextDelay: 50,
    autoRetryDelay: 150
  };

  let settingsLoaded = false;
  let saveTimer = null;

  extensionStorage.get(['autoNext', 'enabled', 'autoRetry', 'autoNextDelay', 'autoRetryDelay'], result => {
    settings.autoNext = typeof result.autoNext === 'boolean'
      ? result.autoNext
      : typeof result.enabled === 'boolean'
        ? result.enabled
        : true;
    settings.autoRetry = typeof result.autoRetry === 'boolean'
      ? result.autoRetry
      : true;
    settings.autoNextDelay = normalizeDelay(result.autoNextDelay, 50);
    settings.autoRetryDelay = normalizeDelay(result.autoRetryDelay, 150);
    settingsLoaded = true;
    autoNextDelayInput.value = settings.autoNextDelay;
    autoRetryDelayInput.value = settings.autoRetryDelay;
    setControlsDisabled(false);
    renderSettings();
  });

  autoNextButton.addEventListener('click', () => {
    if (!settingsLoaded) return;
    settings.autoNext = !settings.autoNext;
    renderSettings();
    extensionStorage.set({ autoNext: settings.autoNext });
  });

  autoRetryButton.addEventListener('click', () => {
    if (!settingsLoaded) return;
    settings.autoRetry = !settings.autoRetry;
    renderSettings();
    extensionStorage.set({ autoRetry: settings.autoRetry });
  });

  bindDelayInput(autoNextDelayInput, autoNextDelayWrap, 'autoNextDelay');
  bindDelayInput(autoRetryDelayInput, autoRetryDelayWrap, 'autoRetryDelay');

  function normalizeDelay(value, fallback) {
    return Number.isInteger(value) && value >= 0 && value <= 10000 ? value : fallback;
  }

  function setControlsDisabled(disabled) {
    autoNextButton.disabled = disabled;
    autoRetryButton.disabled = disabled;
    autoNextDelayInput.disabled = disabled;
    autoRetryDelayInput.disabled = disabled;
  }

  function renderSettings() {
    autoNextButton.setAttribute('aria-checked', String(settings.autoNext));
    autoRetryButton.setAttribute('aria-checked', String(settings.autoRetry));
  }

  function bindDelayInput(input, wrap, key) {
    input.addEventListener('input', () => {
      if (!settingsLoaded) return;
      const value = Number(input.value);
      const valid = input.value !== '' && Number.isInteger(value) && value >= 0 && value <= 10000;
      wrap.classList.toggle('invalid', !valid);
      input.setAttribute('aria-invalid', String(!valid));
      if (!valid) return;

      settings[key] = value;
      queueSave();
    });

    input.addEventListener('change', flushSave);
    input.addEventListener('blur', flushSave);
  }

  function queueSave() {
    if (saveTimer !== null) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveDelays, 250);
  }

  function flushSave() {
    if (saveTimer === null) return;
    window.clearTimeout(saveTimer);
    saveTimer = null;
    saveDelays();
  }

  function saveDelays() {
    saveTimer = null;
    extensionStorage.set({
      autoNextDelay: settings.autoNextDelay,
      autoRetryDelay: settings.autoRetryDelay
    });
  }

  window.addEventListener('pagehide', flushSave);
});
