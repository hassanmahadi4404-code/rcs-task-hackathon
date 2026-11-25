/**
 * The way around the Learner area: Tasks, the leaderboard, and the Mentor
 * area for someone who has one. Two or three large links, each with a
 * picture, so nobody has to hunt for where to go next.
 */

import { LayoutDashboard, ListChecks, Trophy } from 'lucide-react';
import Link from 'next/link';

import { learnCopy, taskPaths } from '@/content/tasks';

const copy = learnCopy.nav;

export interface LearnNavProps {
  current: 'tasks' | 'leaderboard';
  /** The viewer is an Officer or mentors a Session. */
  hasMentorArea: boolean;
  /** The viewer is a Member, so the Tasks are theirs to do. */
  hasTasks?: boolean;
}

export default function LearnNav({ current, hasMentorArea, hasTasks = true }: LearnNavProps) {
  return (
    <nav className="learn-nav" aria-label={copy.label}>
      {hasTasks && (
        <Link href={taskPaths.learn} aria-current={current === 'tasks' ? 'page' : undefined}>
          <ListChecks className="learn-nav__icon" aria-hidden="true" />
          {copy.tasks}
        </Link>
      )}
      <Link href={taskPaths.leaderboard} aria-current={current === 'leaderboard' ? 'page' : undefined}>
        <Trophy className="learn-nav__icon" aria-hidden="true" />
        {copy.leaderboard}
      </Link>
      {hasMentorArea && (
        <Link href={taskPaths.mentor}>
          <LayoutDashboard className="learn-nav__icon" aria-hidden="true" />
          {copy.mentor}
        </Link>
      )}
    </nav>
  );
}
