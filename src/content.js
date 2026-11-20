(() => {
  const allowedPaths = ['/puzzles', '/puzzles/rated'];
  const currentPath = window.location.pathname;

  if (!allowedPaths.some(path => currentPath === path || currentPath.startsWith(`${path}/`))) {
    return;
  }

  const defaults = {
    autoNext: true,
    autoRetry: true,
    autoNextDelay: 50,
    autoRetryDelay: 150
  };

  const settings = { ...defaults };
  let settingsLoaded = false;
  let lastClickedButton = null;
  let pendingAction = null;
  let pendingTimer = null;
  let footerControls = null;
  let scheduledCheck = null;

  document.getElementById('chess-auto-next-toggle')?.remove();
  document.getElementById('anp-header-controls')?.remove();
  document.getElementById('anp-header-styles')?.remove();

  extensionStorage.get(['autoNext', 'enabled', 'autoRetry', 'autoNextDelay', 'autoRetryDelay'], result => {
    settings.autoNext = typeof result.autoNext === 'boolean'
      ? result.autoNext
      : typeof result.enabled === 'boolean'
        ? result.enabled
        : defaults.autoNext;
    settings.autoRetry = typeof result.autoRetry === 'boolean'
      ? result.autoRetry
      : defaults.autoRetry;
    settings.autoNextDelay = normalizeDelay(result.autoNextDelay, defaults.autoNextDelay);
    settings.autoRetryDelay = normalizeDelay(result.autoRetryDelay, defaults.autoRetryDelay);
    settingsLoaded = true;
    injectFooterControls();
    updateFooterControls();
    handlePuzzleAction();
  });

  extensionStorage.onChanged.addListener(changes => {
    if (changes.autoNext) settings.autoNext = changes.autoNext.newValue === true;
    else if (changes.enabled) settings.autoNext = changes.enabled.newValue !== false;
    if (changes.autoRetry) settings.autoRetry = changes.autoRetry.newValue === true;
    if (changes.autoNextDelay) settings.autoNextDelay = normalizeDelay(changes.autoNextDelay.newValue, defaults.autoNextDelay);
    if (changes.autoRetryDelay) settings.autoRetryDelay = normalizeDelay(changes.autoRetryDelay.newValue, defaults.autoRetryDelay);
    updateFooterControls();
    handlePuzzleAction();
  });

  function normalizeDelay(value, fallback) {
    return Number.isInteger(value) && value >= 0 && value <= 10000 ? value : fallback;
  }

  function addStyles() {
    if (document.getElementById('anp-footer-styles')) return;

    const style = document.createElement('style');
    style.id = 'anp-footer-styles';
    style.textContent = `
      #anp-footer-controls {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        width: 100%;
        margin-bottom: 8px;
        box-sizing: border-box;
      }
      #anp-footer-controls .anp-fat-button {
        appearance: none;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        height: 44px;
        margin: 0;
        padding: 0 12px;
        border: 0;
        border-radius: 10px;
        background-color: var(--anp-off-bg, #45423e);
        background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.01) 48%, rgba(0, 0, 0, 0.12) 100%);
        color: var(--anp-off-fg, #e7e6e4);
        box-shadow: 0 3px 0 0 var(--anp-off-lip, #2d2b28), 0 4px 8px rgba(0, 0, 0, 0.24), inset 0 1.5px 0 rgba(255, 255, 255, 0.2);
        font-family: inherit;
        font-size: 14px;
        font-weight: 700;
        line-height: 1;
        text-align: center;
        white-space: nowrap;
        cursor: pointer;
        user-select: none;
        transition: background-color 120ms ease, color 120ms ease, box-shadow 70ms ease, transform 70ms ease, filter 120ms ease;
      }
      #anp-footer-controls .anp-fat-button:hover {
        filter: brightness(1.07);
      }
      #anp-footer-controls .anp-fat-button:active {
        transform: translateY(2px);
        box-shadow: 0 1px 0 0 var(--anp-off-lip, #2d2b28), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }
      #anp-footer-controls .anp-fat-button.anp-on {
        background-color: #81b64c;
        background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.02) 48%, rgba(0, 0, 0, 0.1) 100%);
        color: #ffffff;
        box-shadow: 0 3px 0 0 #537a2b, 0 4px 8px rgba(0, 0, 0, 0.24), inset 0 1.5px 0 rgba(255, 255, 255, 0.36);
      }
      #anp-footer-controls .anp-fat-button.anp-on:active {
        transform: translateY(2px);
        box-shadow: 0 1px 0 0 #537a2b, inset 0 1px 0 rgba(255, 255, 255, 0.16);
      }
      #anp-footer-controls .anp-fat-button:focus-visible {
        outline: 2px solid #81b64c;
        outline-offset: 2px;
      }
      #anp-footer-controls .anp-fat-button svg {
        width: 22px;
        height: 22px;
        flex: 0 0 auto;
        display: block;
      }
      #anp-footer-controls .anp-fat-button .anp-btn-label {
        display: block;
        line-height: 1;
        transform: translateY(-1px);
      }
      #anp-footer-controls .anp-tooltip {
        position: absolute;
        left: 50%;
        bottom: calc(100% + 10px);
        transform: translate(-50%, 4px);
        width: max-content;
        max-width: 220px;
        padding: 7px 12px;
        border-radius: 6px;
        background: #0b0b0a;
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.2;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        z-index: 9999;
        transition: opacity 100ms ease-out 60ms, transform 100ms ease-out 60ms;
      }
      #anp-footer-controls .anp-tooltip::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 6px solid transparent;
        border-top-color: #0b0b0a;
        border-bottom: 0;
      }
      #anp-footer-controls .anp-fat-button:hover .anp-tooltip,
      #anp-footer-controls .anp-fat-button:focus-visible .anp-tooltip {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    `;
    document.head.appendChild(style);
  }

  function syncThemeFromSidebar(footer) {
    if (!footer) return;
    const sidebar = footer.closest('#sidebar') || document.body;
    const bg = window.getComputedStyle(sidebar).backgroundColor;
    const match = bg?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      const isLight = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
      footer.style.setProperty('--anp-off-bg', isLight ? '#dbd8d2' : '#45423e');
      footer.style.setProperty('--anp-off-fg', isLight ? '#312e2b' : '#e7e6e4');
      footer.style.setProperty('--anp-off-lip', isLight ? '#bab6af' : '#2d2b28');
    }
  }

  function createIcon(type) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');

    if (type === 'autoNext') {
      // Bold Lucide-inspired fast-forward >> matching our brand mark
      const p1 = document.createElementNS(svgNS, 'path');
      p1.setAttribute('fill', 'currentColor');
      p1.setAttribute('d', 'M3 6.2a1.2 1.2 0 0 1 1.98-.91l6.6 5.8a1.2 1.2 0 0 1 0 1.82l-6.6 5.8A1.2 1.2 0 0 1 3 17.8V6.2Z');
      const p2 = document.createElementNS(svgNS, 'path');
      p2.setAttribute('fill', 'currentColor');
      p2.setAttribute('d', 'M12.5 6.2a1.2 1.2 0 0 1 1.98-.91l6.6 5.8a1.2 1.2 0 0 1 0 1.82l-6.6 5.8a1.2 1.2 0 0 1-1.98-.91V6.2Z');
      svg.append(p1, p2);
    } else {
      // Clean Chess.com-style counterclockwise retry arrow sized to match Auto Next
      const arc = document.createElementNS(svgNS, 'path');
      arc.setAttribute('fill', 'none');
      arc.setAttribute('stroke', 'currentColor');
      arc.setAttribute('stroke-width', '2.8');
      arc.setAttribute('stroke-linecap', 'round');
      arc.setAttribute('d', 'M5.4 7.4A8.2 8.2 0 1 1 4.2 14.2');
      const head = document.createElementNS(svgNS, 'path');
      head.setAttribute('fill', 'currentColor');
      head.setAttribute('d', 'M3.2 3.6v5.2a.7.7 0 0 0 .7.7h5.2a.55.55 0 0 0 .39-.94L4.14 3.21a.55.55 0 0 0-.94.39Z');
      svg.append(arc, head);
    }

    return svg;
  }

  function injectFooterControls() {
    if (!settingsLoaded) return;
    if (footerControls && footerControls.isConnected) return;

    const footers = document.querySelectorAll('.rated-sidebar-footer-component');
    if (footers.length === 0) return;

    let footer = footers[0];
    if (footers.length > 1) {
      for (const candidate of footers) {
        if (isVisible(candidate)) {
          footer = candidate;
          break;
        }
      }
    }

    addStyles();
    syncThemeFromSidebar(footer);

    const existing = document.getElementById('anp-footer-controls');
    if (existing && existing.parentElement === footer) {
      footerControls = existing;
      updateFooterControls();
      return;
    }
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'anp-footer-controls';
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Automatic puzzle controls');

    const nextButton = createFooterButton('autoNext', 'Auto Next');
    const retryButton = createFooterButton('autoRetry', 'Auto Retry');

    nextButton.addEventListener('click', () => toggleSetting('autoNext'));
    retryButton.addEventListener('click', () => toggleSetting('autoRetry'));
    container.append(nextButton, retryButton);

    const primaryRow = footer.querySelector('.primary-control-buttons-component');
    if (primaryRow) {
      footer.insertBefore(container, primaryRow);
    } else {
      footer.prepend(container);
    }

    footerControls = container;
    updateFooterControls();
  }

  function createFooterButton(key, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'anp-fat-button';
    button.dataset.setting = key;
    button.setAttribute('aria-label', `Toggle ${label}`);
    button.setAttribute('aria-pressed', 'false');
    

    const icon = createIcon(key);
    const text = document.createElement('span');
    text.className = 'anp-btn-label';
    text.textContent = label;

    const tooltip = document.createElement('span');
    tooltip.className = 'anp-tooltip';
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.textContent = `Disable ${label}`;

    button.append(icon, text, tooltip);
    return button;
  }

  function toggleSetting(key) {
    settings[key] = !settings[key];
    updateFooterControls();
    extensionStorage.set({ [key]: settings[key] });
    handlePuzzleAction();
  }

  function updateFooterControls() {
    if (!footerControls || !footerControls.isConnected) return;

    for (const button of footerControls.querySelectorAll('button[data-setting]')) {
      const key = button.dataset.setting;
      const enabled = settings[key] === true;
      const label = key === 'autoNext' ? 'Auto Next' : 'Auto Retry';
      button.classList.toggle('anp-on', enabled);
      button.setAttribute('aria-pressed', String(enabled));
      const tip = button.querySelector('.anp-tooltip');
      if (tip) tip.textContent = `${enabled ? 'Disable' : 'Enable'} ${label}`;
    }
  }

  function isVisible(element) {
    return Boolean(element && element.isConnected && element.getClientRects().length > 0);
  }

  function isActionable(button) {
    return isVisible(button) && !button.disabled && button.getAttribute('data-disabled') !== 'true' && button.getAttribute('data-loading') !== 'true';
  }

  function getPuzzleControls() {
    const panels = document.querySelectorAll('.rated-sidebar-footer-component .primary-control-buttons-component');
    if (panels.length === 0) return null;

    let panel = panels[0];
    if (panels.length > 1) {
      for (const candidate of panels) {
        if (isVisible(candidate)) {
          panel = candidate;
          break;
        }
      }
    }

    const buttons = Array.from(panel.querySelectorAll('button'));
    const byLabel = label => buttons.find(button => (button.getAttribute('aria-label') || '').trim().toLowerCase() === label.toLowerCase()) || null;

    return {
      retry: byLabel('Retry'),
      next: byLabel('Next Puzzle') || byLabel('Next'),
      showSolution: byLabel('Show Solution')
    };
  }

  function getPuzzleState() {
    const controls = getPuzzleControls();
    if (!controls) return { type: 'playing', controls: null };

    const failed = Boolean(
      controls.retry && controls.retry.getAttribute('data-variant') === 'danger'
    ) || Boolean(controls.showSolution);

    const successful = Boolean(
      controls.next && controls.next.getAttribute('data-variant') === 'primary' && !failed
    );

    if (failed) return { type: 'failed', controls };
    if (successful) return { type: 'success', controls };
    return { type: 'playing', controls };
  }

  function chooseAction(state) {
    if (!state.controls) return null;

    if (state.type === 'failed') {
      if (settings.autoRetry) {
        return isActionable(state.controls.retry)
          ? { type: 'retry', button: state.controls.retry, delay: settings.autoRetryDelay }
          : null;
      }
      if (settings.autoNext && isActionable(state.controls.next)) {
        return { type: 'next', button: state.controls.next, delay: settings.autoNextDelay };
      }
      return null;
    }

    if (state.type === 'success' && settings.autoNext && isActionable(state.controls.next)) {
      return { type: 'next', button: state.controls.next, delay: settings.autoNextDelay };
    }

    return null;
  }

  function cancelPendingAction() {
    if (pendingTimer !== null) window.clearTimeout(pendingTimer);
    pendingTimer = null;
    pendingAction = null;
  }

  function handlePuzzleAction() {
    if (!settingsLoaded) return;

    const state = getPuzzleState();
    if (state.type === 'playing') {
      lastClickedButton = null;
      cancelPendingAction();
      return;
    }

    const action = chooseAction(state);
    if (!action || action.button === lastClickedButton) {
      if (!action) cancelPendingAction();
      return;
    }

    if (pendingAction && pendingAction.button === action.button && pendingAction.type === action.type && pendingAction.delay === action.delay) return;
    cancelPendingAction();
    pendingAction = action;

    pendingTimer = window.setTimeout(() => {
      pendingTimer = null;
      const currentState = getPuzzleState();
      const currentAction = chooseAction(currentState);

      if (!currentAction || currentAction.button !== action.button || currentAction.type !== action.type || !isActionable(action.button)) {
        pendingAction = null;
        handlePuzzleAction();
        return;
      }

      action.button.click();
      lastClickedButton = action.button;
      pendingAction = null;
    }, action.delay);
  }

  function scheduleCheck() {
    if (scheduledCheck !== null) return;
    scheduledCheck = window.requestAnimationFrame(() => {
      scheduledCheck = null;
      injectFooterControls();
      handlePuzzleAction();
    });
  }

  const observer = new MutationObserver(scheduleCheck);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-variant', 'aria-label', 'data-disabled', 'disabled']
  });

  const themeObserver = new MutationObserver(() => {
    const footer = document.querySelector('.rated-sidebar-footer-component');
    if (footer) syncThemeFromSidebar(footer);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  window.setTimeout(injectFooterControls, 300);
  window.setTimeout(injectFooterControls, 1000);
  window.setTimeout(injectFooterControls, 2000);
})();
