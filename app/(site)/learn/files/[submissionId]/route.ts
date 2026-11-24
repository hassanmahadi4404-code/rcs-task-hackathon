import { downloadSubmissionFile } from '@/lib/tasks/download';

/** A Learner's own file, by the Submission it belongs to. */
export async function GET(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  return downloadSubmissionFile(request, (await params).submissionId);
}
