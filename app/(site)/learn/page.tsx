import type { Metadata } from 'next';
import Link from 'next/link';

import PageShell from '@/components/chrome/PageShell';
import LearnNav from '@/components/tasks/LearnNav';
import LearnOutsider from '@/components/tasks/LearnOutsider';
import SectionHeading from '@/components/tasks/SectionHeading';
import TaskCard from '@/components/tasks/TaskCard';
import { learnCopy, learnPage, taskPaths } from '@/content/tasks';
import { learnerTasks, mentoredSessionIds, type LearnerTask } from '@/lib/tasks/data';
import { groupTasks, learnerSummary, summarise } from '@/lib/tasks/learner';
import { requestNow } from '@/lib/tasks/now';
import { viewerAt } from '@/lib/tasks/viewer';

export const metadata: Metadata = {
  title: learnPage.metaTitle,
  description: learnPage.metaDescription,
};

const { sections, empty, summary: summaryCopy } = learnCopy;

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

/** A Learner's Tasks: what is running, with the time left on each, and what has finished. */
export default async function LearnPage() {
  const viewer = await viewerAt(taskPaths.learn);
  const { memberId } = viewer;
  const hasMentorArea = viewer.isOfficer || (await mentoredSessionIds(viewer.email)).length > 0;
  if (!memberId) return <LearnOutsider email={viewer.email} hasMentorArea={hasMentorArea} />;

  const now = requestNow();
  const tasks = (await learnerTasks({ ...viewer, memberId })).map((item) => ({
    item,
    deadline: item.task.deadline,
    attempts: item.submissions.map((submission) => summarise(submission.created_at, submission.evaluation)),
  }));
  const groups = groupTasks(tasks, now);
  const totals = learnerSummary(tasks, now);
  const running = groups.running.map((entry) => entry.item);
  const finished = groups.finished.map((entry) => entry.item);

  return (
    <PageShell page={learnPage}>
      <section className="section" aria-labelledby="running">
        <div className="section__inner">
          <LearnNav current="tasks" hasMentorArea={hasMentorArea} />

          <dl className="learn-stats" aria-label={summaryCopy.label}>
            <div className="learn-stat">
              <dt>{summaryCopy.running}</dt>
              <dd>{totals.running}</dd>
            </div>
            <div className="learn-stat" data-accent={totals.todo > 0 || undefined}>
              <dt>{summaryCopy.todo}</dt>
              <dd>{totals.todo}</dd>
            </div>
            <div className="learn-stat">
              <dt>{summaryCopy.finished}</dt>
              <dd>{totals.finished}</dd>
            </div>
            <div className="learn-stat">
              <dt>
                <Link className="learn-link" href={taskPaths.leaderboard}>
                  {summaryCopy.points}
                </Link>
              </dt>
              <dd>{totals.points}</dd>
            </div>
          </dl>

          <SectionHeading id="running" {...sections.running} />
          {running.length > 0 ? <TaskList items={running} now={now} /> : <p className="learn-empty">{empty.running}</p>}
        </div>
      </section>

      <section className="section section--ruled" aria-labelledby="finished">
        <div className="section__inner">
          <SectionHeading id="finished" {...sections.finished} />
          {finished.length > 0 ? <TaskList items={finished} now={now} /> : <p className="learn-empty">{empty.finished}</p>}
        </div>
      </section>
    </PageShell>
  );
}
