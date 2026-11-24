import { downloadSubmissionFile } from '@/lib/tasks/download';

/** A Learner's file, for the Mentors of its Session and for Officers. */
export async function GET(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  return downloadSubmissionFile(request, (await params).submissionId);
}
