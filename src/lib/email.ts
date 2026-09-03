import { Resend } from 'resend';
import { escapeHtml, headerSafe } from './validation';

interface SendArgs {
  apiKey: string | undefined;
  from: string;
  to: string;
  subject: string;
  /** Used for Reply-To so replying in the inbox reaches the enquirer. */
  replyTo?: string;
  /** Rendered as a definition list in the email body. */
  fields: { label: string; value: string; pre?: boolean }[];
  attachments?: { filename: string; content: string }[];
}

export async function sendNotification({
  apiKey,
  from,
  to,
  subject,
  replyTo,
  fields,
  attachments,
}: SendArgs): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY is not configured');
    return { ok: false, reason: 'email_unavailable' };
  }

  const rows = fields
    .map(
      (f) => `
      <tr>
        <td style="padding:8px 16px 8px 0;vertical-align:top;color:#454545;font-size:13px;white-space:nowrap">
          <strong>${escapeHtml(f.label)}</strong>
        </td>
        <td style="padding:8px 0;vertical-align:top;color:#0a0a0a;font-size:14px${
          f.pre ? ';white-space:pre-wrap' : ''
        }">${escapeHtml(f.value)}</td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html><body style="margin:0;background:#f6f8fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:24px">
    <div style="background:#004b80;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:16px;font-weight:600">${escapeHtml(subject)}</h1>
    </div>
    <div style="background:#fff;padding:8px 24px 24px;border:1px solid #dbeefe;border-top:0;border-radius:0 0 12px 12px">
      <table style="width:100%;border-collapse:collapse">${rows}</table>
    </div>
    <p style="color:#8a94a6;font-size:11px;text-align:center;margin-top:16px">
      Sent from the alphalize.com website form.
    </p>
  </div>
</body></html>`;

  const text = fields.map((f) => `${f.label}: ${f.value}`).join('\n');

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject: headerSafe(subject),
      html,
      text,
      // Reply-To is header-sanitised; a CRLF here would let a crafted address
      // append arbitrary headers.
      ...(replyTo ? { replyTo: headerSafe(replyTo) } : {}),
      ...(attachments?.length ? { attachments } : {}),
    });

    if (error) {
      console.error('[email] Resend rejected the message', error);
      return { ok: false, reason: 'email_send_failed' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[email] send threw', err);
    return { ok: false, reason: 'email_send_failed' };
  }
}
