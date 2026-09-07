# MyProjects Dashboard — setup

## 1. Set up the Google Sheet
Open your sheet (ID `1hM2EV9KPcdyPYQJVcTfa4bHV1FUSuZTWV52J-phN8j4`) and create these tabs.
Row 1 of each must be the exact header names below.

| Tab | Headers (row 1) |
|---|---|
| Users | Username, Password, DisplayName, Role, Active |
| Sessions | Token, Username, Created, Expires |
| Projects | ProjectID, Name, Category, Owner, Partner, Status, Progress, StartDate, TargetDate, Description, LastUpdated |
| Books | BookID, Title, Genre, Authors, Status, TargetDate, Synopsis, LastUpdated |
| Chapters | ChapterID, BookID, ChapterNo, Title, Content, WordCount, Author, LastUpdated |
| StickyNotes | NoteID, Text, ProjectID, CreatedBy, TargetDate, Status, CreatedDate, CompletedDate |
| Ideas | IdeaID, Text, Category, CreatedBy, CreatedDate |

Add one row per person in **Users**, e.g.:

| Username | Password | DisplayName | Role | Active |
|---|---|---|---|---|
| sarada | choose-a-password | Sarada | admin | TRUE |
| niharika | choose-a-password | Niharika | member | TRUE |

Add 3–5 rows total for your accounts. Passwords are stored as plain text in the sheet —
that's fine because only you can open/edit the sheet, but don't reuse a password you use
elsewhere.

## 2. Deploy the backend
1. In the Sheet: **Extensions → Apps Script**.
2. Delete any existing code, paste in `Code.gs` (attached).
3. **Deploy → New deployment → Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
4. Copy the deployment URL — it should match the one you're already using
   (`.../AKfycbzUJVYozVwDFhHlyn8bEoUAZeCMpJWlglc2NGwmLNbme1cDnxk-Gas9YnD5ml0YlCGvwg/exec`).
   If it's a new URL, paste it into `index.html` in place of the `SCRIPT_URL` constant.
5. Every time you edit `Code.gs` afterwards, use **Deploy → Manage deployments → Edit → New
   version**, or your changes won't go live.

## 3. Publish the frontend
Replace `index.html` in your `saradasutar/MyProjects` GitHub repo with the attached file, and
push to `main`. GitHub Pages will pick it up automatically at
`https://saradasutar.github.io/MyProjects/`.

## 4. What you get
- **Login** — username/password, checked against the Users tab, session token valid 72 hours.
- **Dashboard** — project cards grouped by category (Website / App Dev / Book / YouTube /
  Instagram-FB), with a progress slider you can drag to update % complete on the spot.
- **New Project** — log a new website, app, book, or content project, solo or with a partner.
- **Book Writing** — its own library: create a book, add chapters, and a distraction-free
  drafting editor with a live word count, saved straight to the Chapters tab.
- **Ideas** — a running brainstorm log, tagged by category.
- **Sticky notes** — a slide-out panel (bottom-right pin button) for targets/reminders, shared
  across everyone who logs in — same pattern as your ADG-B Report Portal, but stored in the
  Sheet so all 3–5 accounts see the same notes rather than only the device that created them.

## Notes / things you may want to tweak
- Progress bars currently only move by dragging the slider on the dashboard card — there's no
  separate "edit project" form yet. Say the word if you want one (status dropdown, rename,
  archive, delete).
- The Book Writing module here is fully separate from SarNi's planned book module, as you asked
  — worth deciding later whether you want one shared "Books" system across both dashboards
  instead of two.
- Content-calendar specifics (posting schedule, publish dates) aren't modeled yet — right now
  YouTube/Instagram/Facebook are just project categories with a progress bar. Tell me if you
  want a proper content calendar view instead.
