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

function enhance(form: HTMLFormElement) {
  if (form.dataset.enhanced) return;
  form.dataset.enhanced = '1';

  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const submitLabel = submit?.textContent ?? 'Send';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);

    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Sending…';
    }

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { accept: 'application/json' },
      });

      let result: ApiResult;
      try {
        result = (await res.json()) as ApiResult;
      } catch {
        result = { ok: false, error: 'Unexpected response from the server.' };
      }

      if (result.ok) {
        form.reset();
        // Reset the captcha so a second submission gets a fresh token.
        window.turnstile?.reset?.();
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
      if (submit) {
        submit.disabled = false;
        submit.textContent = submitLabel;
      }
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
