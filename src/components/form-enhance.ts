/**
 * Progressive enhancement for the two site forms.
 *
 * The forms are real <form method="post"> elements pointed at their API route,
 * so they still work with JavaScript disabled. This script intercepts the
 * submit to render inline errors and a success state without a page reload.
 */
interface ApiResult {
  ok: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string>;
}

function clearErrors(form: HTMLFormElement) {
  form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((el) => {
    el.textContent = '';
    el.classList.add('hidden');
  });
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  const banner = form.querySelector<HTMLElement>('[data-form-banner]');
  if (banner) {
    banner.textContent = '';
    banner.className = 'hidden';
  }
}

function showBanner(form: HTMLFormElement, message: string, kind: 'error' | 'success') {
  const banner = form.querySelector<HTMLElement>('[data-form-banner]');
  if (!banner) return;
  banner.textContent = message;
  banner.className =
    kind === 'success'
      ? 'rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900'
      : 'rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800';
}

function applyFieldErrors(form: HTMLFormElement, fields: Record<string, string>) {
  let firstInvalid: HTMLElement | null = null;
  for (const [name, message] of Object.entries(fields)) {
    const slot = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    const input = form.querySelector<HTMLElement>(`[name="${name}"]`);
    if (slot) {
      slot.textContent = message;
      slot.classList.remove('hidden');
    }
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      firstInvalid ??= input;
    }
  }
  firstInvalid?.focus();
}

/**
 * Submit with real upload progress.
 *
 * `fetch` has no progress event on the request body, so a form carrying a file
 * goes over XMLHttpRequest instead — `xhr.upload` is the only way to know how
 * many bytes have actually gone. Both paths resolve to the same ApiResult, so
 * the caller does not care which ran.
 */
function post(form: HTMLFormElement, onProgress?: (fraction: number) => void): Promise<ApiResult> {
  const body = new FormData(form);
  const isUpload = form.enctype === 'multipart/form-data';

  if (!isUpload || !onProgress) {
    return fetch(form.action, { method: 'POST', body, headers: { accept: 'application/json' } })
      .then((res) => res.json() as Promise<ApiResult>)
      .catch(() => ({ ok: false, error: 'Unexpected response from the server.' }));
  }

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', form.action);
    xhr.setRequestHeader('accept', 'application/json');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    });
    // Bytes are all sent, but the server is still verifying the captcha,
    // sniffing the file, compressing it, storing it and sending the mail.
    xhr.upload.addEventListener('load', () => onProgress(1));

    xhr.addEventListener('load', () => {
      try {
        resolve(JSON.parse(xhr.responseText) as ApiResult);
      } catch {
        resolve({ ok: false, error: 'Unexpected response from the server.' });
      }
    });
    xhr.addEventListener('error', () => resolve({ ok: false, error: 'network' }));
    xhr.addEventListener('abort', () => resolve({ ok: false, error: 'network' }));
    xhr.send(body);
  });
}

function enhance(form: HTMLFormElement) {
  if (form.dataset.enhanced) return;
  form.dataset.enhanced = '1';

  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  // Write into the label span where there is one. The careers button also holds
  // an icon, a spinner and a progress bar, and setting textContent on the button
  // itself would delete them.
  const label = submit?.querySelector<HTMLElement>('[data-submit-label]') ?? submit;
  const submitLabel = label?.textContent ?? 'Send';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);

    // Drives the sending state in CSS (spinner, progress bar).
    form.classList.add('is-sending');
    form.classList.remove('is-sent');
    if (submit) submit.disabled = true;
    if (label) label.textContent = 'Sending…';

    const bar = form.querySelector<HTMLElement>('[data-progress]');
    const onProgress = (fraction: number) => {
      if (bar) bar.style.transform = `scaleX(${fraction})`;
      if (!label) return;
      // At 100% the upload is done but the request is not: hold the bar and say
      // so, rather than sitting at "100%" looking hung.
      label.textContent =
        fraction >= 1 ? 'Processing…' : `Uploading ${Math.round(fraction * 100)}%`;
    };

    try {
      if (bar) bar.style.transform = 'scaleX(0)';
      const result = await post(form, onProgress);

      if (result.error === 'network') {
        showBanner(
          form,
          'We could not reach the server. Please check your connection and try again.',
          'error'
        );
      } else if (result.ok) {
        form.reset();
        // form.reset() does not clear the file-picker's confirmed state.
        form
          .querySelectorAll<HTMLElement>('[data-drop]')
          .forEach((el) => el.classList.remove('has', 'bad'));
        form.dispatchEvent(new CustomEvent('form:reset-drop'));
        // Reset the captcha so a second submission gets a fresh token.
        window.turnstile?.reset?.();
        form.classList.add('is-sent');
        showBanner(form, result.message ?? 'Thanks — we have received your message.', 'success');
      } else {
        if (result.fields) applyFieldErrors(form, result.fields);
        showBanner(form, result.error ?? 'Something went wrong. Please try again.', 'error');
        window.turnstile?.reset?.();
      }
    } catch {
      showBanner(
        form,
        'We could not reach the server. Please check your connection and try again.',
        'error'
      );
    } finally {
      form.classList.remove('is-sending');
      if (bar) bar.style.transform = '';
      if (submit) submit.disabled = false;
      if (label) label.textContent = submitLabel;
    }
  });
}

export function initForms() {
  document.querySelectorAll<HTMLFormElement>('form[data-enhance]').forEach(enhance);
}

declare global {
  interface Window {
    turnstile?: { reset?: () => void; render?: (el: Element) => void };
    onTurnstileReady?: () => void;
  }
}
