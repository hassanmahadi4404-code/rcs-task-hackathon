import Link from 'next/link';

import PageShell from '@/components/chrome/PageShell';
import { learnCopy, learnPage, taskPaths } from '@/content/tasks';

/** A Task that does not exist, is still a draft, or is not this Learner's to see: all one answer. */
export default function LearnNotFound() {
  const copy = learnCopy.notFound;
  return (
    <PageShell page={{ ...learnPage, eyebrow: copy.eyebrow, title: copy.title, lede: copy.lede, caption: copy.eyebrow }}>
      <section className="section">
        <div className="section__inner">
          <Link className="learn-button" href={taskPaths.learn}>
            {learnCopy.task.back}
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
