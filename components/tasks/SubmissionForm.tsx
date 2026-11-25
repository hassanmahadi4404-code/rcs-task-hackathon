'use client';

/**
 * Handing work in.
 *
 * Without JavaScript this is an ordinary form posted to a server action:
 * text, and a file small enough to pass through the server. With JavaScript a
 * file goes straight from the browser to Storage first, over a signed URL and
 * with a progress bar, because Vercel refuses request bodies over 4.5 MB;
 * then the same action saves the Submission. This upload is the one place
 * the browser talks to Supabase (CONTRIBUTING.md).
 *
 * Whatever goes wrong, the text stays in the box and the reason is said.
 * `clientKey` names this attempt, so sending it twice saves it once.
 */

import { useActionState, useState, useTransition } from 'react';

import { requestUpload, submitWork, type SubmitError, type SubmitState } from '@/app/(site)/learn/actions';
import SmoothTextarea from '@/components/tasks/SmoothTextarea';
import { learnCopy } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { formatBytes } from '@/lib/tasks/files';
import { MAX_FILE_BYTES } from '@/lib/tasks/rules';

const copy = learnCopy.form;
const initial: SubmitState = { error: null, body: '' };

/** PUT the file to a signed Storage URL, reporting how far it has got. */
function upload(url: string, file: File, onProgress: (percent: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('content-type', file.type || 'application/octet-stream');
    request.setRequestHeader('x-upsert', 'false');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => resolve(request.status >= 200 && request.status < 300);
    request.onerror = request.onabort = request.ontimeout = () => resolve(false);
    request.send(file);
  });
}

export interface SubmissionFormProps {
  taskId: string;
  /** Names this attempt; a new one arrives with every Submission saved. */
  clientKey: string;
  acceptsText: boolean;
  acceptsFile: boolean;
  /** The deadline has passed; the work will be marked late. */
  late: boolean;
}

export default function SubmissionForm({ taskId, clientKey, acceptsText, acceptsFile, late }: SubmissionFormProps) {
  const [state, formAction, saving] = useActionState(submitWork, initial);
  const [, startSave] = useTransition();
  const [percent, setPercent] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<SubmitError | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  const uploading = percent !== null;
  const busy = saving || uploading;
  const error = uploadError ?? state.error;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const file = data.get('file');
    // No file: the form posts itself, exactly as it does without JavaScript.
    if (!(file instanceof File) || file.size === 0) {
      setUploadError(null);
      return;
    }

    event.preventDefault();
    if (busy) return;
    if (file.size > MAX_FILE_BYTES) {
      setUploadError('file_too_large');
      return;
    }

    setUploadError(null);
    setPercent(0);
    const ticket = await requestUpload(taskId, file.name).catch(() => null);
    const stored = ticket?.ok ? await upload(ticket.url, file, setPercent) : false;
    setPercent(null);
    if (!ticket?.ok || !stored) {
      setUploadError(ticket && !ticket.ok ? ticket.error : 'upload_failed');
      return;
    }

    data.delete('file');
    data.set('uploaded_path', ticket.path);
    startSave(() => formAction(data));
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="learn-form">
      <input type="hidden" name="task_id" value={taskId} />
      <input type="hidden" name="client_key" value={clientKey} />

      {error && (
        <div className="learn-notice" data-tone="error" role="alert">
          <p>{learnCopy.errors[error]}</p>
        </div>
      )}
      {late && (
        <div className="learn-notice" data-tone="quiet">
          <p>{copy.lateWarning}</p>
        </div>
      )}

      {acceptsText && (
        <p className="learn-field" data-invalid={error === 'body_too_long' || undefined}>
          <label className="learn-field__label" htmlFor="submission-body">
            {copy.text}
          </label>
          <SmoothTextarea
            className="learn-field__input"
            id="submission-body"
            name="body"
            rows={10}
            defaultValue={state.body}
            required={!acceptsFile}
            aria-describedby="submission-body-hint"
          />
          <span className="learn-field__hint" id="submission-body-hint">
            {copy.textHint}
          </span>
        </p>
      )}

      {acceptsFile && (
        <p className="learn-field">
          <label className="learn-field__label" htmlFor="submission-file">
            {copy.file}
          </label>
          <input
            className="learn-field__file"
            id="submission-file"
            name="file"
            type="file"
            required={!acceptsText}
            aria-describedby="submission-file-hint"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              setChosen(file ? fill(copy.chosen, { name: file.name, size: formatBytes(file.size) }) : null);
              setUploadError(file && file.size > MAX_FILE_BYTES ? 'file_too_large' : null);
            }}
          />
          <span className="learn-field__hint" id="submission-file-hint">
            {copy.fileHint}
            {chosen && ` ${chosen}`}
          </span>
          <noscript>
            <span className="learn-field__hint">{copy.fileNoScript}</span>
          </noscript>
        </p>
      )}

      <p className="learn-note">{copy.privacy}</p>

      {uploading && (
        <progress className="learn-progress" max={100} value={percent} aria-label={fill(copy.uploading, { percent: String(percent) })} />
      )}
      <div className="learn-actions">
        <button type="submit" className="learn-button" disabled={busy} aria-busy={busy || undefined}>
          {late ? copy.submitLate : copy.submit}
        </button>
        <p className="learn-form__status" role="status">
          {uploading ? fill(copy.uploading, { percent: String(percent) }) : saving ? copy.saving : ''}
        </p>
      </div>
    </form>
  );
}
