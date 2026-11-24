/**
 * Decisions about an uploaded file: where it is stored, what it is called,
 * and whether an AI can read it.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

/** Files read as text: they are redacted and given to the AI as part of the work. */
const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'html', 'htm', 'css', 'js', 'mjs', 'jsx', 'ts', 'tsx', 'json', 'py', 'c', 'h', 'cpp',
  'cc', 'hpp', 'java', 'kt', 'go', 'rs', 'rb', 'php', 'sql', 'sh', 'yml', 'yaml', 'xml', 'csv', 'ipynb',
]);

/** Files an AI reads whole, as they are. */
const DOCUMENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/** `text` and `document` files reach the AI; an `other` one waits for the Mentor. */
export type FileKind = 'text' | 'document' | 'other';

export function extensionOf(name: string): string {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(name);
  return match ? match[1].toLowerCase() : '';
}

export function fileKind(name: string): FileKind {
  const extension = extensionOf(name);
  if (TEXT_EXTENSIONS.has(extension)) return 'text';
  return extension in DOCUMENT_TYPES ? 'document' : 'other';
}

/** The media type an AI is told, from the extension; the browser's guess is not trusted. */
export function mediaTypeOf(name: string): string {
  const extension = extensionOf(name);
  if (TEXT_EXTENSIONS.has(extension)) return 'text/plain';
  return DOCUMENT_TYPES[extension] ?? 'application/octet-stream';
}

const MAX_NAME = 80;

/** A file name that is safe as a Storage path segment: ASCII, no slashes, extension kept. */
export function safeFileName(name: string): string {
  const extension = extensionOf(name);
  const stem = (extension ? name.slice(0, -(extension.length + 1)) : name)
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+/, '')
    .slice(0, MAX_NAME)
    .replace(/[-.]+$/, '');
  return extension ? `${stem || 'file'}.${extension}` : stem || 'file';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

/**
 * `<task>/<member>/<upload>/<name>`: the shape the Storage policies read. Each
 * upload gets its own folder, so choosing a corrected file of the same name
 * never meets the old one.
 */
export function submissionPath(taskId: string, memberId: string, uploadId: string, name: string): string {
  return `${taskId}/${memberId}/${uploadId}/${safeFileName(name)}`;
}

export function fileNameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** `812 KB`, `4.2 MB`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
