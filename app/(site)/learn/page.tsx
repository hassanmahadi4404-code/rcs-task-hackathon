import type { Metadata } from 'next';

import PageShell from '@/components/chrome/PageShell';
import LearnOutsider from '@/components/tasks/LearnOutsider';
import SectionHeading from '@/components/tasks/SectionHeading';
import TaskCard from '@/components/tasks/TaskCard';
import { learnCopy, learnPage, taskPaths } from '@/content/tasks';
import { learnerTasks, mentoredSessionIds, type LearnerTask } from '@/lib/tasks/data';
import { groupTasks, summarise } from '@/lib/tasks/learner';
import { requestNow } from '@/lib/tasks/now';
import { viewerAt } from '@/lib/tasks/viewer';

export const metadata: Metadata = {
  title: learnPage.metaTitle,
  description: learnPage.metaDescription,
};

const { sections, empty } = learnCopy;

function TaskList({ items, now }: { items: LearnerTask[]; now: number }) {
  return (
    <ul className="learn-list">
      {items.map((item) => (
        <li key={item.task.id}>
          <TaskCard item={item} now={now} />
        </li>
      ))}
    </ul>
  );
}

/** What is waiting for this Learner, what they handed in, and what closed without them. */
export default async function LearnPage() {
  const viewer = await viewerAt(taskPaths.learn);
  const { memberId } = viewer;
  if (!memberId) {
    const mentors = (await mentoredSessionIds(viewer.email)).length > 0;
    return <LearnOutsider email={viewer.email} hasMentorArea={viewer.isOfficer || mentors} />;
  }

  const now = requestNow();
  const tasks = await learnerTasks({ ...viewer, memberId });
  const groups = groupTasks(
    tasks.map((item) => ({
      item,
      deadline: item.task.deadline,
      attempts: item.submissions.map((submission) => summarise(submission.created_at, submission.evaluation)),
    })),
    now,
  );
  const waiting = groups.waiting.map((entry) => entry.item);
  const handedIn = groups.handedIn.map((entry) => entry.item);
  const missed = groups.missed.map((entry) => entry.item);

  return (
    <PageShell page={learnPage}>
      <section className="section" aria-labelledby="waiting">
        <div className="section__inner">
          <SectionHeading id="waiting" {...sections.waiting} />
          {waiting.length > 0 ? (
            <TaskList items={waiting} now={now} />
          ) : (
            <p className="learn-empty">{handedIn.length > 0 ? empty.waitingAllDone : empty.waiting}</p>
          )}
        </div>
      </section>

      <section className="section section--ruled" aria-labelledby="handed-in">
        <div className="section__inner">
          <SectionHeading id="handed-in" {...sections.handedIn} />
          {handedIn.length > 0 ? <TaskList items={handedIn} now={now} /> : <p className="learn-empty">{empty.handedIn}</p>}
        </div>
      </section>

      {missed.length > 0 && (
        <section className="section section--ruled" aria-labelledby="missed">
          <div className="section__inner">
            <SectionHeading id="missed" {...sections.missed} />
            <TaskList items={missed} now={now} />
          </div>
        </section>
      )}
    </PageShell>
  );
}
