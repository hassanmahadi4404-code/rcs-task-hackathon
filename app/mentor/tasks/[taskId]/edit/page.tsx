import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import PageHeader from '@/components/admin/PageHeader';
import TaskForm from '@/components/tasks/TaskForm';
import { mentorCopy, taskPaths } from '@/content/tasks';
import { mentorTask } from '@/lib/tasks/data';
import { instantToLocal, sessionEditUntil } from '@/lib/tasks/deadlines';
import { isUuid } from '@/lib/tasks/files';
import { mentorAccess } from '@/lib/tasks/mentor-page';
import { requestNow } from '@/lib/tasks/now';

const copy = mentorCopy.taskForm;

export const metadata: Metadata = { title: copy.editTitle };

/** A Mentor in their window, or an Officer, changes a Task. */
export default async function EditTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const { scope } = await mentorAccess(taskPaths.taskEdit(taskId));
  const work = isUuid(taskId) ? await mentorTask(scope, taskId) : null;
  if (!work) notFound();
  const { task, session, deadlines, submissions } = work;
  if (!scope.isOfficer && requestNow() > sessionEditUntil(session.held_on, deadlines, session.date_tbc)) redirect(taskPaths.task(task.id));

  return (
    <>
      <PageHeader
        title={copy.editTitle}
        crumbs={[
          { label: mentorCopy.sessions.title, href: taskPaths.sessions },
          { label: session.title, href: taskPaths.session(session.id) },
          { label: task.title, href: taskPaths.task(task.id) },
        ]}
      />
      <TaskForm
        id={task.id}
        sessionId={session.id}
        initial={{
          title: task.title,
          instructions: task.instructions,
          grading_criteria: task.grading_criteria,
          deadline: instantToLocal(task.deadline),
          formats: task.formats,
          published: task.published_at !== null,
        }}
        hasSubmissions={submissions.length > 0}
        cancelHref={taskPaths.task(task.id)}
      />
    </>
  );
}
