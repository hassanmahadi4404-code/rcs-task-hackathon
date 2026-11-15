# RCS Task Hackathon

A one-off, solo hackathon in which RUET Computing Society members build the task platform extension of ruetcs.org. The top three Candidates become Contributors, and the best of their Entries are merged into the club site.

## Hackathon

**Hackathon**:
The time-boxed competition (a take-home with one deadline) in which Candidates build the task platform from the Brief. Its winning code is merged into the club site.
_Avoid_: Trial, contest, test

**Candidate**:
A society member, from any intake, who enters the Hackathon alone. Has no access to the club site's repository.
_Avoid_: Participant, applicant, team

**Brief**:
The problem statement every Candidate solves. It fixes the core of the product and leaves some points deliberately open for the Candidate to decide.
_Avoid_: Problem statement, assignment, spec

**Starter kit**:
The public template carved from the club site that every Candidate builds in. It has the same layout, stack and theme, but none of the club site's server-side code or real data.
_Avoid_: Boilerplate, template repo, scaffold

**Entry**:
One Candidate's complete solution to the Brief, built in the Starter kit.
_Avoid_: Submission, project, PR

**Gate**:
The pass-or-fail automatic checks an Entry must pass before it is scored.
_Avoid_: CI, qualifier

**Rubric**:
The weighted scoring sheet applied to every Entry that passes the Gate. The three highest scores win.
_Avoid_: Marking scheme, criteria

**Contributor**:
A person with write access who changes the club site through reviewed pull requests. Each Hackathon winner becomes one.
_Avoid_: Winner, collaborator, developer

## Task platform

The product the Brief asks Candidates to build.

**Learner**:
An existing society Member who attends Sessions and submits solutions to Tasks.
_Avoid_: Student, user, participant

**Member**:
A paid member of the society, recorded per intake on the club site. Every Learner is a Member.
_Avoid_: User, student, applicant

**Mentor**:
A person assigned by an Officer to run one Session. Being a Mentor is an assignment to a Session, not a standing role, and the person need not be a Member.
_Avoid_: Teacher, instructor, admin

**Officer**:
A club site dashboard admin (super admin or moderator). An Officer can do everything a Mentor can, on every Session.
_Avoid_: Admin, track lead, moderator (when the distinction does not matter)

**Track**:
A standing stream of weekly Sessions on one subject, such as Web or CP.
_Avoid_: Course, wing, segment

**Session**:
One dated meeting within a Track, with the Tasks set for it.
_Avoid_: Class, event, lecture

**Task**:
A piece of work set for a Session, with instructions, a deadline, Grading criteria and the submission formats it accepts.
_Avoid_: Assignment, homework, problem

**Grading criteria**:
What the AI judges a Submission against, written for one Task.
_Avoid_: Rubric (that word belongs to the Hackathon), marking scheme

**Submission**:
One attempt by a Learner at a Task. A Learner may make several.
_Avoid_: Entry, upload, answer

**Evaluation**:
The AI's score and feedback on one Submission, which a mentor may override.
_Avoid_: Grade, review, result

## Relationships

- A **Candidate** builds exactly one **Entry** in the **Starter kit**.
- An **Entry** is scored with the **Rubric** only after it passes the **Gate**.
- A **Session** has one or more **Mentors**; a person may be a **Mentor** of several **Sessions**.
- A **Mentor** can change a **Session** only for a limited time after its last **Task** deadline; after that, only an **Officer** can.
- A **Track** has many **Sessions**; a **Session** has many **Tasks**; a **Task** has many **Submissions**; each **Submission** has one **Evaluation**.
