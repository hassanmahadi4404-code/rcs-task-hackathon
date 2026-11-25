/**
 * Every string the task platform shows: the Learner area at `/learn`, the
 * Mentor area at `/mentor`, and the mock evaluator's feedback.
 *
 * The words are CONTEXT.md's: Learner, Mentor, Officer, Track, Session, Task,
 * Submission, Evaluation. `{name}` placeholders are filled by `fill()` from
 * `lib/admin-payments.ts`.
 *
 * Relative imports only: Node's test runner executes this file directly,
 * through `lib/tasks/evaluator-mock.ts`.
 */

import type { StatusTone } from '@/components/admin/StatusPill';
import type { AdminSection } from '@/content/admin';
import type { PageMeta } from '@/content/pages';

import { brand } from './site.ts';

/** Every address the task platform links to. `trailingSlash` is on, so each ends in one. */
export const taskPaths = {
  learn: '/learn/',
  learnTask: (taskId: string) => `/learn/tasks/${taskId}/`,
  learnFile: (submissionId: string) => `/learn/files/${submissionId}/`,
  leaderboard: '/learn/leaderboard/',
  mentor: '/mentor/',
  sessions: '/mentor/sessions/',
  sessionNew: '/mentor/sessions/new/',
  session: (sessionId: string) => `/mentor/sessions/${sessionId}/`,
  sessionEdit: (sessionId: string) => `/mentor/sessions/${sessionId}/edit/`,
  taskNew: (sessionId: string) => `/mentor/sessions/${sessionId}/tasks/new/`,
  task: (taskId: string) => `/mentor/tasks/${taskId}/`,
  taskEdit: (taskId: string) => `/mentor/tasks/${taskId}/edit/`,
  submission: (submissionId: string) => `/mentor/submissions/${submissionId}/`,
  mentorFile: (submissionId: string) => `/mentor/files/${submissionId}/`,
  tracks: '/mentor/tracks/',
  trackNew: '/mentor/tracks/new/',
  track: (trackId: string) => `/mentor/tracks/${trackId}/`,
} as const;

/** A label and the pill tone it is shown in. */
export interface Status {
  label: string;
  tone: StatusTone;
}

/** What a Task accepts, as a Learner reads it. */
export const formatCopy = {
  text: 'a text answer',
  file: 'a file up to 10 MB',
  both: 'a text answer, a file up to 10 MB, or both',
  short: { text: 'Text', file: 'File' },
} as const;

// ---------------------------------------------------------------------------
// Learner area
// ---------------------------------------------------------------------------

export const learnPage: PageMeta = {
  path: '/learn',
  eyebrow: 'LEARN / TASKS',
  title: 'Your Tasks',
  lede: 'Pick a Task, do it, and submit it here. Your work is saved at once, an AI reads it in seconds, and your Mentor has the last word.',
  caption: 'RUNNING · FINISHED',
  metaTitle: `Learn — ${brand.name}`,
  metaDescription: 'Tasks from RUET Computing Society Sessions: what is running, what has finished, and the feedback on your work.',
};

export const leaderboardPage: PageMeta = {
  path: '/learn/leaderboard',
  eyebrow: 'LEARN / LEADERBOARD',
  title: 'Leaderboard',
  lede: 'Every score a Learner earns on a Task adds to their points. Do more Tasks, and do them well, to climb.',
  caption: 'POINTS · TASKS · AVERAGE',
  metaTitle: `Leaderboard — ${brand.name}`,
  metaDescription: 'How RUET Computing Society Learners are doing on their Session Tasks.',
};

export const learnCopy = {
  /** Signed in, but not a Member. */
  outsider: {
    eyebrow: 'NOT A MEMBER',
    title: 'Nothing here for this account',
    body: 'This area is for society Members. You are signed in as {email}, which is not on the Member list. If you are a Member, sign in with the address you joined with.',
    mentorLink: 'Open the Mentor area',
    leaderboardLink: 'See the leaderboard',
    signOut: 'Sign out',
  },
  notFound: {
    eyebrow: 'NOT FOUND',
    title: 'There is no Task here',
    lede: 'It may not be published yet, or the link is wrong. Everything set for you is on your Tasks page.',
  },
  /** The links at the top of every Learner page. */
  nav: {
    label: 'Learner area',
    tasks: 'Tasks',
    leaderboard: 'Leaderboard',
    mentor: 'Mentor area',
  },
  /** The four numbers above the lists. */
  summary: {
    label: 'Where you stand',
    running: 'Running',
    todo: 'To do',
    finished: 'Finished',
    points: 'Your points',
  },
  sections: {
    running: { index: '01', title: 'Running', caption: 'STILL OPEN · WHAT YOU HAVE NOT DONE COMES FIRST' },
    finished: { index: '02', title: 'Finished', caption: 'CLOSED · NEWEST FIRST' },
  },
  empty: {
    running: 'Nothing is running right now. New Tasks show up here as soon as a Mentor sets them.',
    finished: 'Nothing has finished yet.',
  },
  card: {
    /** `{track}` · `{session}` above a Task's title. */
    where: '{track} · {session}',
    due: 'Due {when}',
    wasDue: 'Was due {when}. Late work is still taken.',
    closed: 'Closed {when}',
    submitted: 'You submitted {when}',
    submittedLate: 'You submitted {when}, {late} late',
    score: '{score}/100',
    /** Above the clock on a running Task. */
    timeLeft: 'Time left',
    lateLeft: 'Late · closes in',
    /** Read out in place of the ticking digits. */
    timerLabel: 'Time left: due {when}',
    lateTimerLabel: 'Late work is taken until {when}',
    finished: 'Finished',
    units: { d: 'd', h: 'h', m: 'm', s: 's' },
  },
  state: {
    todo: { label: 'To do', tone: 'live' },
    todo_late: { label: 'To do · late', tone: 'upcoming' },
    reading: { label: 'Being read', tone: 'upcoming' },
    feedback: { label: 'Done', tone: 'done' },
    mentor: { label: 'Mentor replied', tone: 'live' },
    needs_mentor: { label: 'Waiting for Mentor', tone: 'draft' },
    missed: { label: 'Missed', tone: 'off' },
  } satisfies Record<string, Status>,
  task: {
    back: 'All your Tasks',
    /** The three steps across the top of a Task. */
    steps: { label: 'How it works', read: 'Read the Task', submit: 'Submit your work', feedback: 'Get feedback' },
    deadline: { open: 'Time left', late: 'Late · closes in', closed: 'Finished', due: 'Due {when}', closedOn: 'Closed {when}' },
    eyebrow: '{track} / {session}',
    ledeOpen: 'Due {when} ({relative}). Submit {formats}.',
    ledeLate: 'Was due {when}. Late work is taken until {closes} and marked late. Submit {formats}.',
    ledeClosed: 'Was due {when}. This Task closed on {closes} and takes no more work.',
    captionOpen: 'RUNNING',
    captionLate: 'RUNNING · LATE',
    captionClosed: 'FINISHED',
    metaTitle: `{task} — ${brand.name}`,
    metaDescription: 'A Task from a RUET Computing Society Session.',
    brief: { index: '01', title: 'The Task', caption: 'SET BY YOUR MENTOR' },
    criteriaTitle: 'What a good answer has',
    criteriaNote: 'Your work is marked against each of these. The AI reads first; your Mentor can change its marks.',
    points: '{points} points',
    work: { index: '02', title: 'Your work', caption: 'SAVED THE MOMENT YOU SUBMIT IT' },
    ownSession: 'You are a Mentor of this Session, so you cannot submit work for its Tasks. Review it in the Mentor area.',
    ownSessionLink: 'Open this Task in the Mentor area',
    closedNoWork: 'This Task has finished and you did not submit anything.',
    closedNote: 'This Task has finished. What you submitted stays here.',
    earlier: 'Earlier attempts ({n})',
  },
  receipt: {
    title: 'Received',
    body: 'Your work arrived and is saved. Attempt {n}, received {when}.',
    onTime: 'On time',
    late: '{late} late',
    again: 'It was already saved; this is the same attempt, not a second one.',
  },
  attempt: {
    title: 'Attempt {n}',
    latest: 'Latest attempt',
    received: 'Received {when}',
    yourText: 'Your text',
    yourFile: 'Your file',
    download: 'Download {name} ({size})',
    fileSkipped: 'The AI cannot read this kind of file, so it was not part of the first read. Your Mentor can open it.',
  },
  evaluation: {
    region: 'Feedback on this attempt',
    aiTitle: 'AI first read',
    aiNote: 'An AI read this against the criteria. It is a first reader, not the last word: your Mentor can change it.',
    model: 'Read by {model}',
    mentorTitle: "Your Mentor's word",
    mentorScore: 'Your Mentor set the score to {score}/100. The AI had given {ai}/100.',
    mentorScoreNoAi: 'Your Mentor set the score to {score}/100.',
    mentorNoteOnly: 'Your Mentor added a note. The score is the AI’s.',
    mentorWhen: 'Updated {when}',
    scoreLabel: 'Score',
    outOf: '/100',
    nextStep: 'Next step',
    pendingTitle: 'Being read',
    inLineTitle: 'In line for the AI',
    pendingFirst: 'The AI is reading your work. This usually takes a few seconds.',
    /** A line has formed: where the Learner is in it, and about how long. */
    place: 'Your place in line',
    pendingQueued: 'Your work is saved. Others submitted before you, so the AI reads theirs first. Your turn comes in {wait}. You can leave this page; it will still be read.',
    pendingPaused: 'The AI has reached its limit for now. Your work is saved and keeps its place; the line starts again in {wait}. You can leave this page.',
    wait: {
      moments: 'a few seconds',
      seconds: 'about {n} seconds',
      minute: 'about a minute',
      minutes: 'about {n} minutes',
      hour: 'about an hour',
      hours: 'about {n} hours',
    },
    pendingRetry: 'The AI did not finish reading this (try {n} of {max}). It tries again {when}. Your work is saved; you do not need to submit it again.',
    pendingQuota: 'The AI has used up its free quota for now, so feedback is delayed. It tries again {when}. Your work is saved; you do not need to submit it again.',
    pendingStalled: 'Feedback is delayed. Your work is saved; you do not need to submit it again.',
    check: 'Check again',
    checking: 'Checking',
    failedTitle: 'Waiting for your Mentor',
    supersededTitle: 'Not read',
    failed: {
      unreadable: 'The AI could not read this: there was no text, and the file is a kind it cannot open. Your work is saved, and your Mentor can open it and mark it.',
      superseded: 'You sent a newer attempt before the AI got to this one, so it was not read. Your latest attempt is the one that counts.',
      default: 'The AI could not read this after {max} tries. Your work is saved, and your Mentor can mark it.',
    },
  },
  form: {
    title: 'Submit your work',
    another: 'Submit another attempt',
    attemptsLeft: 'You have {left} of {max} attempts left. Your latest attempt is the one that counts.',
    noAttemptsLeft: 'You have used all {max} attempts at this Task.',
    lateWarning: 'The deadline has passed. Your work will be saved and marked late.',
    text: 'Your answer',
    textHint: 'Plain text. Paste code as it is. Up to 50,000 characters.',
    file: 'Your file',
    fileHint: 'One file, up to 10 MB. Code and text files, PDFs and images are read by the AI; any other kind is kept for your Mentor.',
    fileNoScript: 'JavaScript is off, so only files up to 3.5 MB can be sent from this form.',
    privacy: 'Leave your name, roll, email and phone out of your work and out of any PDF or image. Your Mentor already knows whose it is, and the AI must not be told.',
    either: 'Write an answer, attach a file, or both.',
    submit: 'Submit',
    submitLate: 'Submit late',
    uploading: 'Uploading your file: {percent}%',
    saving: 'Saving your work',
    chosen: '{name} ({size})',
  },
  leaderboard: {
    how: 'Points are the scores on each Learner\u2019s latest attempt at every Task, added up. A Mentor\u2019s score counts in place of the AI\u2019s. Only names and totals are shown: nobody\u2019s work or single scores.',
    tracksLabel: 'Leaderboard by Track',
    allTracks: 'All Tracks',
    podium: { index: '01', title: 'Top three', caption: 'MOST POINTS' },
    everyone: { index: '02', title: 'Everyone', caption: 'BEST FIRST · SAME POINTS SHARE A PLACE' },
    columns: { rank: 'Place', learner: 'Learner', points: 'Points' },
    place: '#{rank}',
    meta: '{tasks} · average {average}',
    task: '1 Task',
    tasks: '{n} Tasks',
    pointsUnit: 'points',
    you: 'You',
    yourPlace: 'You are in place {rank} of {total}, with {points} points.',
    notYet: 'You are not on the board yet. Submit a Task and you will be.',
    empty: 'Nobody has points yet. The first scored Task starts the board.',
    emptyTrack: 'Nobody has points in this Track yet.',
  },
  /** One sentence per refusal; the keys are the words the database raises. */
  errors: {
    not_a_member: 'Only society Members can submit work.',
    task_not_found: 'This Task is not open to you.',
    own_session: 'You are a Mentor of this Session, so you cannot submit work for it.',
    task_closed: 'This Task finished while you were writing. Nothing was sent.',
    text_not_accepted: 'This Task does not take a text answer. Attach a file instead.',
    file_not_accepted: 'This Task does not take a file. Write your answer instead.',
    empty_submission: 'There is nothing to submit yet. Write an answer or attach a file.',
    too_many_attempts: 'You have used all your attempts at this Task.',
    file_missing: 'Your file did not finish uploading. Choose it again and submit once more; your text is still here.',
    file_too_large: 'That file is larger than 10 MB. Choose a smaller one; your text is still here.',
    file_too_large_posted: 'That file is too large to send without JavaScript (3.5 MB at most). Turn JavaScript on, or choose a smaller file.',
    body_too_long: 'Your answer is longer than 50,000 characters. Shorten it, or attach it as a file.',
    upload_failed: 'The upload did not finish, so nothing was submitted. Check your connection and try again; your text is still here.',
    unknown: 'Your work could not be saved just now, so nothing was submitted. Try again; your text is still here.',
  },
} as const;

// ---------------------------------------------------------------------------
// Mentor area
// ---------------------------------------------------------------------------

export const mentorNav = {
  overview: { label: 'Overview', href: taskPaths.mentor },
  sessions: { label: 'Sessions', href: taskPaths.sessions, group: 'sessions' },
  leaderboard: { label: 'Leaderboard', href: taskPaths.leaderboard, group: 'sessions' },
  tracks: { label: 'Tracks', href: taskPaths.tracks, group: 'officers' },
} satisfies Record<string, AdminSection>;

export const mentorCopy = {
  metaTitle: 'Mentor area',
  metaTemplate: '%s · Mentor area',
  roles: { officer: 'Officer', mentor: 'Mentor' },
  /** Signed in, but neither an Officer nor a Mentor of anything. */
  notInvited: {
    eyebrow: 'MENTOR AREA',
    title: 'Nothing here for this account',
    lede: 'You are signed in as {email}. That address is not an Officer and has not been named a Mentor of any Session. If an Officer invited you, sign in with the address they used.',
    learn: 'Go to your Tasks',
    signOut: 'Sign out',
  },
  notFound: {
    title: 'Nothing at this address',
    lede: 'It may have been deleted, or it belongs to a Session you do not mentor.',
    home: 'Back to the overview',
  },
  when: {
    /** `{when}` is an absolute time, `{relative}` its distance from now. */
    both: '{when} ({relative})',
  },

  overview: {
    title: 'Overview',
    ledeMentor: 'The Sessions you mentor, and the work in them that needs a person rather than the AI.',
    ledeOfficer: 'Every Session, and the work that needs a person rather than the AI. As an Officer you can step in on any of it.',
    stats: {
      sessions: 'Sessions you can change',
      tasks: 'Tasks taking work',
      submissions: 'Submissions',
      reading: 'Waiting on the AI',
      attention: 'Need a person',
    },
    attention: {
      title: 'Needs a person',
      note: 'Work the AI could not read, or that reads like an attempt to steer it.',
      item: '{n} in "{task}"',
      empty: 'Nothing needs you right now. The AI has read everything that was submitted.',
    },
    deadlines: {
      title: 'Deadlines in the next week',
      item: '{task} · {session}',
      empty: 'No deadlines in the next seven days.',
    },
    sessions: 'All Sessions',
  },

  sessions: {
    title: 'Sessions',
    ledeMentor: 'The Sessions an Officer named you a Mentor of, in the order they are taught. Open one to set its Tasks and read what came in.',
    ledeOfficer: 'The whole plan: every Track in the order it is taught, and every Session in it with its syllabus, Mentors and date. Open a Session to name its Mentors or step in.',
    new: 'New Session',
    label: 'Sessions',
    tracksLabel: 'Sessions by Track',
    /** Above the timeline; each count picks its own singular or plural. */
    summary: '{sessions} · {tracks}',
    count: { session: '1 Session', sessions: '{n} Sessions', track: '1 Track', tracks: '{n} Tracks' },
    columns: ['Session', 'Syllabus / Topic', 'Mentor 1', 'Mentor 2', 'Date', 'Tasks', 'Submissions'],
    status: 'Status',
    /** A cell with nothing to show: no Mentor named, no syllabus written. */
    none: '–',
    moreMentors: '+{n} more',
    dateTbc: 'To be announced',
    phase: {
      unscheduled: { label: 'Date not set', tone: 'draft' },
      upcoming: { label: 'Upcoming', tone: 'upcoming' },
      open: { label: 'Running', tone: 'live' },
      closed: { label: 'Finished', tone: 'done' },
    } satisfies Record<string, Status>,
    emptyMentor: 'You are not a Mentor of any Session yet. An Officer names a Mentor by email on the Session’s page.',
    emptyOfficer: 'No Sessions yet. Add a Track first, then plan its first Session.',
    emptyTrack: 'No Sessions in this Track yet.',
    trackNote: { upcoming: 'Upcoming Track', finished: 'Finished Track' },
  },

  session: {
    window: {
      mentorOpen: 'You can change this Session’s Tasks and marks until {until}.',
      mentorClosed: 'Your say over this Session ended on {until}, a week after its last deadline. You can still read everything; an Officer can change it.',
      officer: 'Its Mentors can change it until {until}. As an Officer you always can.',
      mentorUnscheduled: 'This Session has no date yet. You can set its Tasks now; your say over it ends a week after its last deadline.',
      officerUnscheduled: 'This Session has no date yet. Its Mentors can set Tasks now, and their say ends a week after its last deadline.',
      label: 'Mentor window',
    },
    heldOn: 'Held on {date}',
    dateTbc: 'Date to be announced',
    topic: 'Syllabus / Topic',
    edit: 'Edit Session',
    tasks: {
      title: 'Tasks',
      note: 'What Learners were asked to do, and how much of it came in.',
      new: 'New Task',
      columns: ['Task', 'Deadline', 'Accepts', 'Submissions'],
      status: 'Status',
      empty: 'No Tasks yet.',
      emptyHint: 'Set the first one so Learners know what to do after the Session.',
      phase: {
        draft: { label: 'Draft', tone: 'draft' },
        open: { label: 'Running', tone: 'live' },
        late: { label: 'Running late', tone: 'upcoming' },
        closed: { label: 'Finished', tone: 'done' },
      } satisfies Record<string, Status>,
    },
    mentors: {
      title: 'Mentors',
      note: 'Named by an Officer. A Mentor signs in with this address and need not be a Member.',
      empty: 'This Session has no Mentor. An Officer can run it, or name one below.',
      emptyMentorView: 'No other Mentors.',
      you: 'you',
      email: 'Mentor’s email',
      emailHint: 'They become a Mentor of this Session the moment they sign in with this address.',
      add: 'Add Mentor',
      remove: 'Remove {email}',
      removeConfirm: 'Remove {email} as a Mentor of this Session? They lose access to it at once.',
      errors: {
        invalid: 'That is not an email address.',
        exists: 'That address is already a Mentor of this Session.',
        unknown: 'The Mentor could not be added. Try again.',
      },
    },
    danger: {
      title: 'Delete this Session',
      note: 'Only a Session nobody has handed work in to can be deleted. Its Tasks go with it.',
      blocked: 'This Session has Submissions, so it cannot be deleted. Nothing a Learner submitted is ever thrown away.',
      delete: 'Delete Session',
      confirm: 'Delete this Session and its Tasks? This cannot be undone.',
    },
  },

  sessionForm: {
    newTitle: 'New Session',
    editTitle: 'Edit Session',
    lede: 'One dated meeting in a Track. Name its Mentors after you save it.',
    section: { title: 'The Session', description: 'Learners see the Track and the Session\u2019s name on every Task.' },
    plan: { title: 'In the plan', description: 'Where the Session sits in its Track, and when it is held.' },
    track: 'Track',
    title: 'Session',
    titleHint: 'Its short name in the Track, like "S1" or "Web 04: Forms and validation".',
    topic: 'Syllabus / Topic',
    topicHint: 'What the Session covers, up to 600 characters.',
    position: 'Order in the Track',
    positionHint: '1 for the first Session. Sessions are listed in this order.',
    heldOn: 'Held on',
    heldOnHint: 'Leave it empty if the date is not settled.',
    dateTbc: 'Date not settled yet',
    dateTbcHint: 'Shown as "To be announced". The Session\u2019s Mentors can still set its Tasks.',
    mentors: 'Mentors’ emails',
    mentorsHint: 'Optional. One address per line. You can add or remove Mentors later.',
    save: 'Save Session',
    noTracks: 'Add a Track before you plan a Session.',
    errors: {
      track: 'Choose a Track.',
      title: 'Give the Session a name of up to 160 characters.',
      topic: 'Keep the syllabus to 600 characters.',
      position: 'The order is a whole number from 0 to 999.',
      heldOn: 'Choose the date the Session is held, or tick "Date not settled yet".',
      mentors: 'This is not an email address: {email}',
      unknown: 'The Session could not be saved. Try again.',
    },
  },

  taskForm: {
    newTitle: 'New Task',
    editTitle: 'Edit Task',
    lede: 'A piece of work for Learners to submit after the Session.',
    brief: {
      title: 'The work',
      description: 'What Learners read when they open the Task.',
    },
    name: 'Title',
    instructions: 'Instructions',
    instructionsHint: 'What to build or solve, and what to submit.',
    marking: {
      title: 'Marking',
      description:
        'The AI marks each criterion on its own, and Learners see the list, so write it as you would say it to them.',
    },
    criteria: 'Grading criteria',
    criteriaHint:
      'One thing a good answer has, a colon, then its points. For example "Works on a phone: 30. Clean CSS: 30." Points are scaled to a score out of 100.',
    criteriaParsed: 'Read as {n} criteria worth {total} points.',
    criteriaWhole: 'No points found, so the whole text is one criterion worth 100.',
    handIn: {
      title: 'Handing in',
      description: 'Late work is taken for 3 days after the deadline and marked late.',
    },
    deadline: 'Deadline',
    deadlineHint: 'Bangladesh time.',
    formats: 'Learners can submit',
    formatText: 'A text answer',
    formatFile: 'A file, up to 10 MB',
    published: 'Published',
    publishedHint: 'Learners see a published Task at once. Leave it off to keep a draft only Mentors and Officers see.',
    save: 'Save Task',
    saved: 'Saved.',
    hasSubmissions:
      'Learners have already submitted work for this Task. A change to the deadline changes who is late; a change to the criteria does not re-run the AI.',
    errors: {
      title: 'Give the Task a title of up to 160 characters.',
      instructions: 'Write the instructions (up to 8,000 characters).',
      criteria: 'Write the grading criteria (up to 4,000 characters).',
      deadline: 'Choose a date and time for the deadline.',
      formats: 'Choose at least one thing Learners can submit.',
      not_allowed: 'You can no longer change this Session. Its window closed a week after its last deadline; ask an Officer.',
      unknown: 'The Task could not be saved. Try again.',
    },
  },

  task: {
    edit: 'Edit Task',
    deadline: 'Deadline',
    accepts: 'Accepts',
    brief: 'What Learners were asked',
    instructions: 'Instructions',
    criteria: 'Grading criteria',
    stats: {
      learners: 'Learners submitted',
      late: 'Submitted late',
      average: 'Average score',
      reading: 'Waiting on the AI',
      attention: 'Need a person',
    },
    noAverage: '–',
    list: {
      title: 'Submissions',
      note: 'Each Learner’s latest attempt. Open one to read the work and have your say.',
      label: 'Submissions to this Task',
      groupsLabel: 'Submissions by state',
      groups: { all: 'All', attention: 'Need a person', reading: 'Waiting on the AI', changed: 'Mentor marked', late: 'Late' },
      search: 'Search by name or roll',
      sorts: { recent: 'Newest first', name: 'Name', score: 'Lowest score first' },
      columns: ['Learner', 'Roll', 'Submitted', 'Attempts', 'Score'],
      status: 'State',
      empty: 'Nobody has handed anything in yet.',
      emptyFiltered: 'No Submissions match.',
      late: '{late} late',
      scoreChanged: '{score} (AI {ai})',
      noScore: '–',
    },
    state: {
      reading: { label: 'Being read', tone: 'upcoming' },
      read: { label: 'AI read', tone: 'done' },
      changed: { label: 'Mentor marked', tone: 'live' },
      failed: { label: 'AI could not read', tone: 'error' },
      skipped: { label: 'Not read', tone: 'off' },
      flagged: { label: 'Check this one', tone: 'error' },
    } satisfies Record<string, Status>,
    run: 'Run waiting evaluations',
    runNote: '{n} waiting. They also run on their own when a Learner looks.',
    danger: {
      title: 'Delete this Task',
      note: 'Only a Task nobody has handed work in to can be deleted. Unpublish it instead to hide it.',
      delete: 'Delete Task',
      confirm: 'Delete this Task? This cannot be undone.',
    },
  },

  submission: {
    metaTitle: 'Submission',
    title: '{name}’s work',
    unknownLearner: 'A Learner',
    facts: {
      learner: 'Learner',
      roll: 'Roll',
      submittedAt: 'Submitted',
      attempt: 'Attempt',
      attemptOf: '{n} of {total}',
      onTime: 'On time',
      late: '{late} late',
    },
    work: {
      title: 'The work',
      description: 'Exactly as the Learner handed it in.',
      text: 'Text answer',
      noText: 'No text answer.',
      file: 'File',
      download: 'Download {name} ({size})',
      fileSkipped: 'The AI cannot read this kind of file. Open it yourself before you mark.',
    },
    ai: {
      title: 'AI first read',
      description: 'The AI saw the work with the Learner’s name, roll, email and phone taken out.',
      score: 'AI score',
      model: 'Read by {model}, {when}',
      flagged: 'This work reads like an attempt to steer the AI (it addresses the reader, or asks for marks). Read it yourself before you trust the score.',
      pending: 'The AI has not finished reading this. Tries so far: {n}. Next try {when}.',
      failed: {
        unreadable: 'The AI could not read this: there is no text, and the file is a kind it cannot open.',
        quota: 'The AI ran out of quota and gave up on this after two days.',
        superseded: 'The AI was not asked to read this: the Learner submitted a newer attempt first, and the latest attempt is the one that counts.',
        default: 'The AI could not read this after {n} tries.',
      },
      rerun: 'Ask the AI again',
      rerunConfirm: 'Throw away the AI’s score and feedback for this Submission and ask it again?',
    },
    override: {
      title: 'Your word',
      description: 'The AI is a first reader. If you disagree, say so here: the Learner sees your score and note above the AI’s.',
      score: 'Your score',
      scoreHint: 'A whole number from 0 to 100. Leave it empty to keep the AI’s score and only add a note.',
      note: 'Note to the Learner',
      noteHint: 'Up to 2,000 characters.',
      save: 'Save',
      clear: 'Remove your word',
      clearConfirm: 'Remove the Mentor’s score and note? The Learner goes back to seeing only the AI’s.',
      by: 'Set by {email}, {when}. The Learner sees it now.',
      closed: 'Your say over this Session has ended, so you can read this but not change it. An Officer still can.',
      errors: {
        override_empty: 'Give a score, a note, or both.',
        score_out_of_range: 'The score must be a whole number from 0 to 100.',
        note_too_long: 'The note is longer than 2,000 characters.',
        not_allowed: 'You can no longer change this Session. Ask an Officer.',
        unknown: 'Your word could not be saved. Try again.',
      },
    },
    attempts: {
      title: 'All attempts by this Learner',
      note: 'The latest attempt is the one that counts.',
      label: 'Attempts',
      columns: ['Attempt', 'Submitted', 'Score'],
      status: 'State',
      name: 'Attempt {n}',
      current: 'Attempt {n} (this one)',
    },
  },

  tracks: {
    title: 'Tracks',
    lede: 'The standing streams Sessions belong to, such as Web or CP. Mark a Track finished when it has stopped running; its work stays.',
    new: 'New Track',
    label: 'Tracks',
    columns: ['Track', 'About', 'Sessions'],
    status: 'Status',
    state: {
      upcoming: { label: 'Upcoming', tone: 'upcoming' },
      running: { label: 'Running', tone: 'live' },
      finished: { label: 'Finished', tone: 'done' },
    } satisfies Record<string, Status>,
    empty: 'No Tracks yet. Add the first one.',
  },

  trackForm: {
    newTitle: 'New Track',
    editTitle: 'Edit Track',
    section: { title: 'The Track', description: 'Learners see the name on every Task.' },
    name: 'Name',
    nameHint: 'Short, like "Web" or "CP".',
    description: 'About',
    descriptionHint: 'One sentence, up to 400 characters.',
    position: 'Order',
    positionHint: 'Tracks are listed in the order they are taught: 1 first.',
    status: 'Status',
    statusHint: 'Upcoming before it starts, running while it is taught, finished after. A finished Track stays readable.',
    statuses: { upcoming: 'Upcoming', running: 'Running', finished: 'Finished' },
    save: 'Save Track',
    danger: {
      title: 'Delete this Track',
      note: 'Only a Track nobody has handed work in to can be deleted. Its Sessions and Tasks go with it.',
      blocked: 'This Track has Submissions, so it cannot be deleted. Mark it finished instead.',
      delete: 'Delete Track',
      confirm: 'Delete this Track with its Sessions and Tasks? This cannot be undone.',
    },
    errors: {
      name: 'Give the Track a name of up to 80 characters.',
      description: 'Keep the description to 400 characters.',
      position: 'The order is a whole number from 0 to 999.',
      status: 'Choose upcoming, running or finished.',
      taken: 'Another Track already has that name.',
      unknown: 'The Track could not be saved. Try again.',
    },
  },
} as const;

// ---------------------------------------------------------------------------
// The mock evaluator's feedback (`lib/tasks/evaluator-mock.ts`)
// ---------------------------------------------------------------------------

export const mockFeedback = {
  found: 'Your work speaks to this: it mentions {found}.',
  partly: 'Your work mentions {found}, but says nothing about {missing}.',
  missing: 'Nothing in your work mentions {missing} yet.',
  general: 'Marked on how much of the Task your work covers.',
  thin: 'There is too little here to mark.',
  next: 'Work on "{label}" first: that is where most of your points are still open.',
  nextWhenThin: 'Submit a fuller answer: say what you built and how it meets each criterion.',
} as const;
