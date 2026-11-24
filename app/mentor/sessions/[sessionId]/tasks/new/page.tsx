import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import PageHeader from '@/components/admin/PageHeader';
import TaskForm from '@/components/tasks/TaskForm';
import { mentorCopy, taskPaths } from '@/content/tasks';
import { mentorSession } from '@/lib/tasks/data';
import { sessionEditUntil } from '@/lib/tasks/deadlines';
import { isUuid } from '@/lib/tasks/files';
import { mentorAccess } from '@/lib/tasks/mentor-page';
import { requestNow } from '@/lib/tasks/now';

const copy = mentorCopy.taskForm;

export const metadata: Metadata = { title: copy.newTitle };

/** A Mentor in their window, or an Officer, sets a Task for a Session. */
export default async function NewTaskPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const { scope } = await mentorAccess(taskPaths.taskNew(sessionId));
  const item = isUuid(sessionId) ? await mentorSession(scope, sessionId) : null;
  if (!item) notFound();

  // The Session's page says why: the window has closed.
  const until = sessionEditUntil(item.session.held_on, item.tasks.map((task) => task.deadline));
  if (!scope.isOfficer && requestNow() > until) redirect(taskPaths.session(item.session.id));

  return (
    <>
      <PageHeader
        title={copy.newTitle}
        lede={copy.lede}
        crumbs={[
          { label: mentorCopy.sessions.title, href: taskPaths.sessions },
          { label: item.session.title, href: taskPaths.session(item.session.id) },
        ]}
      />
      <TaskForm
        sessionId={item.session.id}
        initial={{ title: '', instructions: '', grading_criteria: '', deadline: '', formats: ['text'], published: true }}
        hasSubmissions={false}
        cancelHref={taskPaths.session(item.session.id)}
      />
    </>
  );
}
