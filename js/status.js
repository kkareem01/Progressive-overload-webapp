/**
 * Tiny status pill in the top bar (sync state, errors, "saved").
 */

let hideTimer = null;

function getPill() {
  return document.getElementById('status-pill');
}

export function setStatus(state, text, { sticky = false } = {}) {
  const pill = getPill();
  if (!pill) return;
  pill.hidden = false;
  pill.dataset.state = state;
  pill.textContent = text;
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  if (!sticky) {
    hideTimer = setTimeout(() => { pill.hidden = true; }, 1800);
  }
}

export function clearStatus() {
  const pill = getPill();
  if (!pill) return;
  pill.hidden = true;
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
}
