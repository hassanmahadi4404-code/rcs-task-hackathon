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
  title: 'What is waiting for you',
  lede: 'Every Task from your Sessions, with its deadline. Hand your work in here: it is saved at once, an AI gives it a first read within seconds, and your Mentor has the last word.',
  caption: 'WAITING · HANDED IN · MISSED',
  metaTitle: `Learn — ${brand.name}`,
  metaDescription: 'Tasks from RUET Computing Society Sessions: what is due, what you handed in, and the feedback on it.',
};

export const learnCopy = {
  /** Signed in, but not a Member. */
  outsider: {
    eyebrow: 'NOT A MEMBER',
    title: 'Nothing here for this account',
    body: 'This area is for society Members. You are signed in as {email}, which is not on the Member list. If you are a Member, sign in with the address you joined with.',
    mentorLink: 'Open the Mentor area',
    signOut: 'Sign out',
  },
  notFound: {
    eyebrow: 'NOT FOUND',
    title: 'There is no Task here',
    lede: 'It may not be published yet, or the link is wrong. Everything set for you is on your Tasks page.',
  },
  sections: {
    waiting: { index: '01', title: 'Waiting for you', caption: 'SOONEST DEADLINE FIRST' },
    handedIn: { index: '02', title: 'Handed in', caption: 'YOUR LATEST ATTEMPT AT EACH' },
    missed: { index: '03', title: 'Closed without your work', caption: 'NO LONGER TAKING SUBMISSIONS' },
  },
  empty: {
    waiting: 'Nothing is waiting for you. New Tasks appear here as soon as a Mentor sets them.',
    waitingAllDone: 'You have handed in everything that is open.',
    handedIn: 'You have not handed anything in yet.',
  },
  card: {
    /** `{track}` · `{session}` above a Task's title. */
    where: '{track} · {session}',
    due: 'Due {when} ({relative})',
    closes: 'Was due {when}. Late work is taken until {closes}.',
    closed: 'Was due {when}. Closed {closes}.',
    handedIn: 'Handed in {when}',
    handedInLate: 'Handed in {when}, {late} late',
    open: 'Open the Task',
    score: '{score}/100',
  },
  state: {
    todo: { label: 'To do', tone: 'live' },
    todo_late: { label: 'Late, still open', tone: 'upcoming' },
    reading: { label: 'Being read', tone: 'upcoming' },
    feedback: { label: 'Feedback ready', tone: 'done' },
    mentor: { label: 'Mentor replied', tone: 'live' },
    needs_mentor: { label: 'Waiting for your Mentor', tone: 'draft' },
    missed: { label: 'Closed', tone: 'off' },
  } satisfies Record<string, Status>,
  task: {
    back: 'All your Tasks',
    eyebrow: '{track} / {session}',
    ledeOpen: 'Due {when} ({relative}). Hand in {formats}.',
    ledeLate: 'Was due {when}. Late work is taken until {closes} and marked late. Hand in {formats}.',
    ledeClosed: 'Was due {when}. This Task closed on {closes} and takes no more work.',
    captionOpen: 'OPEN',
    captionLate: 'LATE WINDOW',
    captionClosed: 'CLOSED',
    metaTitle: `{task} — ${brand.name}`,
    metaDescription: 'A Task from a RUET Computing Society Session.',
    brief: { index: '01', title: 'The Task', caption: 'SET BY YOUR MENTOR' },
    criteriaTitle: 'What a good answer has',
    criteriaNote: 'Your work is marked against each of these. The AI reads first; your Mentor can change its marks.',
    points: '{points} points',
    work: { index: '02', title: 'Your work', caption: 'SAVED THE MOMENT YOU HAND IT IN' },
    ownSession: 'You are a Mentor of this Session, so you cannot hand in work for its Tasks. Review it in the Mentor area.',
    ownSessionLink: 'Open this Task in the Mentor area',
    closedNoWork: 'This Task is closed and you did not hand anything in.',
    closedNote: 'This Task is closed. What you handed in stays here.',
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
    pendingFirst: 'The AI is reading your work. This usually takes a few seconds.',
    pendingRetry: 'The AI did not finish reading this (try {n} of {max}). It tries again {when}. Your work is saved; you do not need to hand it in again.',
    pendingQuota: 'The AI has used up its free quota for now, so feedback is delayed. It tries again {when}. Your work is saved; you do not need to hand it in again.',
    pendingStalled: 'Feedback is delayed. Your work is saved; you do not need to hand it in again.',
    check: 'Check again',
    checking: 'Checking',
    failedTitle: 'Waiting for your Mentor',
    failed: {
      unreadable: 'The AI could not read this: there was no text, and the file is a kind it cannot open. Your work is saved, and your Mentor can open it and mark it.',
      default: 'The AI could not read this after {max} tries. Your work is saved, and your Mentor can mark it.',
    },
  },
  form: {
    title: 'Hand in your work',
    another: 'Hand in another attempt',
    attemptsLeft: 'You have {left} of {max} attempts left. Your latest attempt is the one that counts.',
    noAttemptsLeft: 'You have used all {max} attempts at this Task.',
    lateWarning: 'The deadline has passed. This will be saved and marked late.',
    text: 'Your answer',
    textHint: 'Plain text. Paste code as it is. Up to 50,000 characters.',
    file: 'Your file',
    fileHint: 'One file, up to 10 MB. Code and text files, PDFs and images are read by the AI; any other kind is kept for your Mentor.',
    fileNoScript: 'JavaScript is off, so only files up to 3.5 MB can be sent from this form.',
    privacy: 'Leave your name, roll, email and phone out of your work and out of any PDF or image. Your Mentor already knows whose it is, and the AI must not be told.',
    either: 'Write an answer, attach a file, or both.',
    submit: 'Hand in',
    submitLate: 'Hand in late',
    uploading: 'Uploading your file: {percent}%',
    saving: 'Saving your work',
    chosen: '{name} ({size})',
  },
  /** One sentence per refusal; the keys are the words the database raises. */
  errors: {
    not_a_member: 'Only society Members can hand in work.',
    task_not_found: 'This Task is not open to you.',
    own_session: 'You are a Mentor of this Session, so you cannot hand in work for it.',
    task_closed: 'This Task closed while you were writing. Nothing was sent.',
    text_not_accepted: 'This Task does not take a text answer. Attach a file instead.',
    file_not_accepted: 'This Task does not take a file. Write your answer instead.',
    empty_submission: 'There is nothing to hand in yet. Write an answer or attach a file.',
    too_many_attempts: 'You have used all your attempts at this Task.',
    file_missing: 'Your file did not finish uploading. Choose it again and hand in once more; your text is still here.',
    file_too_large: 'That file is larger than 10 MB. Choose a smaller one; your text is still here.',
    file_too_large_posted: 'That file is too large to send without JavaScript (3.5 MB at most). Turn JavaScript on, or choose a smaller file.',
    body_too_long: 'Your answer is longer than 50,000 characters. Shorten it, or attach it as a file.',
    upload_failed: 'The upload did not finish, so nothing was handed in. Check your connection and try again; your text is still here.',
    unknown: 'Your work could not be saved just now, so nothing was handed in. Try again; your text is still here.',
  },
} as const;

// ---------------------------------------------------------------------------
// Mentor area
// ---------------------------------------------------------------------------

export const mentorNav = {
  overview: { label: 'Overview', href: taskPaths.mentor },
  sessions: { label: 'Sessions', href: taskPaths.sessions, group: 'sessions' },
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
      empty: 'Nothing needs you right now. The AI has read everything that was handed in.',
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
    ledeMentor: 'The Sessions an Officer named you a Mentor of. Open one to set its Tasks and read what came in.',
    ledeOfficer: 'Every Session, grouped by Track. Plan a Session, name its Mentors by email, and step in on any of them.',
    new: 'New Session',
    label: 'Sessions',
    tracksLabel: 'Sessions by Track',
    columns: ['Session', 'Held on', 'Tasks', 'Submissions'],
    status: 'Status',
    phase: {
      upcoming: { label: 'Upcoming', tone: 'upcoming' },
      open: { label: 'Running', tone: 'live' },
      closed: { label: 'Finished', tone: 'done' },
    } satisfies Record<string, Status>,
    emptyMentor: 'You are not a Mentor of any Session yet. An Officer names a Mentor by email on the Session’s page.',
    emptyOfficer: 'No Sessions yet. Add a Track first, then plan its first Session.',
    emptyTrack: 'No Sessions in this Track yet.',
    archived: 'Archived Track',
  },

  session: {
    window: {
      mentorOpen: 'You can change this Session’s Tasks and marks until {until}.',
      mentorClosed: 'Your say over this Session ended on {until}, a week after its last deadline. You can still read everything; an Officer can change it.',
      officer: 'Its Mentors can change it until {until}. As an Officer you always can.',
      label: 'Mentor window',
    },
    heldOn: 'Held on {date}',
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
        open: { label: 'Open', tone: 'live' },
        late: { label: 'Taking late work', tone: 'upcoming' },
        closed: { label: 'Closed', tone: 'done' },
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
      blocked: 'This Session has Submissions, so it cannot be deleted. Nothing a Learner handed in is ever thrown away.',
      delete: 'Delete Session',
      confirm: 'Delete this Session and its Tasks? This cannot be undone.',
    },
  },

  sessionForm: {
    newTitle: 'New Session',
    editTitle: 'Edit Session',
    lede: 'One dated meeting in a Track. Name its Mentors after you save it.',
    section: { title: 'The Session', description: 'Learners see the Track, the title and the date.' },
    track: 'Track',
    title: 'Title',
    titleHint: 'For example "Web 04: Forms and validation".',
    heldOn: 'Held on',
    mentors: 'Mentors’ emails',
    mentorsHint: 'Optional. One address per line. You can add or remove Mentors later.',
    save: 'Save Session',
    noTracks: 'Add a Track before you plan a Session.',
    errors: {
      track: 'Choose a Track.',
      title: 'Give the Session a title of up to 160 characters.',
      heldOn: 'Choose the date the Session is held.',
      mentors: 'This is not an email address: {email}',
      unknown: 'The Session could not be saved. Try again.',
    },
  },

  taskForm: {
    newTitle: 'New Task',
    editTitle: 'Edit Task',
    lede: 'A piece of work for Learners to hand in after the Session.',
    brief: {
      title: 'The work',
      description: 'What Learners read when they open the Task.',
    },
    name: 'Title',
    instructions: 'Instructions',
    instructionsHint: 'What to build or solve, and what to hand in.',
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
    formats: 'Learners can hand in',
    formatText: 'A text answer',
    formatFile: 'A file, up to 10 MB',
    published: 'Published',
    publishedHint: 'Learners see a published Task at once. Leave it off to keep a draft only Mentors and Officers see.',
    save: 'Save Task',
    saved: 'Saved.',
    hasSubmissions:
      'Learners have already handed in work for this Task. A change to the deadline changes who is late; a change to the criteria does not re-run the AI.',
    errors: {
      title: 'Give the Task a title of up to 160 characters.',
      instructions: 'Write the instructions (up to 8,000 characters).',
      criteria: 'Write the grading criteria (up to 4,000 characters).',
      deadline: 'Choose a date and time for the deadline.',
      formats: 'Choose at least one thing Learners can hand in.',
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
      learners: 'Learners handed in',
      late: 'Handed in late',
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
      columns: ['Learner', 'Roll', 'Handed in', 'Attempts', 'Score'],
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
      handedIn: 'Handed in',
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
      columns: ['Attempt', 'Handed in', 'Score'],
      status: 'State',
      name: 'Attempt {n}',
      current: 'Attempt {n} (this one)',
    },
  },

  tracks: {
    title: 'Tracks',
    lede: 'The standing streams Sessions belong to, such as Web or CP. Archive a Track that has stopped running; its work stays.',
    new: 'New Track',
    label: 'Tracks',
    columns: ['Track', 'About', 'Sessions'],
    status: 'Status',
    state: {
      active: { label: 'Running', tone: 'live' },
      archived: { label: 'Archived', tone: 'off' },
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
    archived: 'Archived',
    archivedHint: 'An archived Track stays readable but is shown as no longer running.',
    save: 'Save Track',
    danger: {
      title: 'Delete this Track',
      note: 'Only a Track nobody has handed work in to can be deleted. Its Sessions and Tasks go with it.',
      blocked: 'This Track has Submissions, so it cannot be deleted. Archive it instead.',
      delete: 'Delete Track',
      confirm: 'Delete this Track with its Sessions and Tasks? This cannot be undone.',
    },
    errors: {
      name: 'Give the Track a name of up to 80 characters.',
      description: 'Keep the description to 400 characters.',
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
  nextWhenThin: 'Hand in a fuller answer: say what you built and how it meets each criterion.',
} as const;
