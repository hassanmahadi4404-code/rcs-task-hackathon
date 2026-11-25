import type { Metadata } from 'next';
import Link from 'next/link';

import StatusPill from '@/components/admin/StatusPill';
import PageShell from '@/components/chrome/PageShell';
import Frame from '@/components/hud/Frame';
import LearnNav from '@/components/tasks/LearnNav';
import LearnOutsider from '@/components/tasks/LearnOutsider';
import SectionHeading from '@/components/tasks/SectionHeading';
import { leaderboardPage, learnCopy, taskPaths } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { listHref } from '@/lib/admin-lists';
import { leaderboardRows, mentoredSessionIds, tracks } from '@/lib/tasks/data';
import { isUuid } from '@/lib/tasks/files';
import { rankRows, type RankedRow } from '@/lib/tasks/leaderboard';
import { viewerAt } from '@/lib/tasks/viewer';

export const metadata: Metadata = {
  title: leaderboardPage.metaTitle,
  description: leaderboardPage.metaDescription,
};

const copy = learnCopy.leaderboard;

const meta = (row: RankedRow) =>
  fill(copy.meta, {
    tasks: row.tasks === 1 ? copy.task : fill(copy.tasks, { n: String(row.tasks) }),
    average: String(row.average),
  });

/**
 * How Learners are doing, for everyone who is part of this: Members, Mentors
 * and Officers. Names and totals only; the database gives nothing more, and
 * nothing at all to anyone else.
 */
export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const viewer = await viewerAt(taskPaths.leaderboard);
  const hasMentorArea = viewer.isOfficer || (await mentoredSessionIds(viewer.email)).length > 0;
  const isMember = viewer.memberId !== null;
  if (!isMember && !hasMentorArea) return <LearnOutsider email={viewer.email} hasMentorArea={false} />;

  const { track } = await searchParams;
  const trackId = isUuid(track) ? track : null;
  const [rows, allTracks] = await Promise.all([leaderboardRows(trackId), tracks()]);
  const ranked = rankRows(rows);
  const podium = ranked.slice(0, 3);
  const mine = ranked.find((row) => row.is_viewer);

  return (
    <PageShell page={leaderboardPage}>
      <section className="section" aria-labelledby="podium">
        <div className="section__inner">
          <LearnNav current="leaderboard" hasMentorArea={hasMentorArea} hasTasks={isMember} />

          <nav className="learn-filter" aria-label={copy.tracksLabel}>
            <Link href={taskPaths.leaderboard} aria-current={trackId === null ? 'true' : undefined}>
              {copy.allTracks}
            </Link>
            {allTracks.map((item) => (
              <Link
                key={item.id}
                href={listHref(taskPaths.leaderboard, { track: item.id })}
                aria-current={trackId === item.id ? 'true' : undefined}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {isMember && (
            <p className="learn-notice" data-tone={mine ? undefined : 'quiet'} role="status">
              {mine
                ? fill(copy.yourPlace, { rank: String(mine.rank), total: String(ranked.length), points: String(mine.points) })
                : copy.notYet}
            </p>
          )}

          <SectionHeading id="podium" {...copy.podium} />
          {podium.length > 0 ? (
            <ol className="learn-podium">
              {podium.map((row) => (
                <li key={`${row.rank}-${row.name}`}>
                  <Frame size="md" accent={row.rank === 1} label={fill(copy.place, { rank: String(row.rank) })}>
                    <p className="learn-podium__name">
                      {row.name} {row.is_viewer && <StatusPill tone="live">{copy.you}</StatusPill>}
                    </p>
                    <p className="learn-score">
                      <span className="learn-score__value">{row.points}</span>
                      <span className="learn-score__of">{copy.pointsUnit}</span>
                    </p>
                    <p className="learn-note">{meta(row)}</p>
                  </Frame>
                </li>
              ))}
            </ol>
          ) : (
            <p className="learn-empty">{trackId ? copy.emptyTrack : copy.empty}</p>
          )}
        </div>
      </section>

      {ranked.length > 0 && (
        <section className="section section--ruled" aria-labelledby="everyone">
          <div className="section__inner">
            <SectionHeading id="everyone" {...copy.everyone} />
            <table className="learn-board">
              <thead>
                <tr>
                  <th scope="col">{copy.columns.rank}</th>
                  <th scope="col">{copy.columns.learner}</th>
                  <th scope="col">{copy.columns.points}</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((row) => (
                  <tr key={`${row.rank}-${row.name}`} data-you={row.is_viewer || undefined}>
                    <td className="learn-board__rank">{row.rank}</td>
                    <th scope="row" className="learn-board__who">
                      <span>
                        {row.name} {row.is_viewer && <StatusPill tone="live">{copy.you}</StatusPill>}
                      </span>
                      <span className="learn-note">{meta(row)}</span>
                    </th>
                    <td className="learn-board__points">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="learn-note">{copy.how}</p>
          </div>
        </section>
      )}
    </PageShell>
  );
}
