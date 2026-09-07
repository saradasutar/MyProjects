/**
 * Utils.gs — the sheet handle, the doGet/doPost router, and small helpers
 * shared by every other file. Apps Script treats all .gs files in a project
 * as one shared scope, so functions in Auth.gs / Projects.gs / etc. are all
 * reachable from here without any import.
 */

const SS = SpreadsheetApp.openById('1hM2EV9KPcdyPYQJVcTfa4bHV1FUSuZTWV52J-phN8j4');

function doGet(e) { return handle_(e); }
function doPost(e) { return handle_(e); }

function handle_(e) {
  let out;
  try {
    const params = e.postData ? JSON.parse(e.postData.contents) : e.parameter;
    const action = params.action;

    switch (action) {
      case 'login':          out = login_(params); break;
      case 'getDashboard':   out = withAuth_(params, getDashboard_); break;
      case 'addProject':     out = withAuth_(params, addProject_); break;
      case 'updateProject':  out = withAuth_(params, updateProject_); break;
      case 'addSticky':      out = withAuth_(params, addSticky_); break;
      case 'completeSticky': out = withAuth_(params, completeSticky_); break;
      case 'deleteSticky':   out = withAuth_(params, deleteSticky_); break;
      case 'addBook':        out = withAuth_(params, addBook_); break;
      case 'getBookDetail':  out = withAuth_(params, getBookDetail_); break;
      case 'saveChapter':    out = withAuth_(params, saveChapter_); break;
      case 'addIdea':        out = withAuth_(params, addIdea_); break;
      default:                out = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    out = { success: false, error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Reads an entire tab into an array of {header: value} objects. */
function sheetToObjects_(name) {
  const sheet = SS.getSheetByName(name);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0];
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].join('') === '') continue;
    out.push(obj_(headers, rows[i]));
  }
  return out;
}

function obj_(headers, row) {
  const o = {};
  headers.forEach((h, i) => { o[h] = row[i]; });
  return o;
}
/**
 * Auth.gs — login and session checks. Reads/writes the Users and Sessions
 * tabs. This is the file to open if you're changing who can log in or how
 * long a session lasts.
 */

const SESSION_HOURS = 72;

function login_(p) {
  const sheet = SS.getSheetByName('Users');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  for (let i = 1; i < rows.length; i++) {
    const row = obj_(headers, rows[i]);
    if (row.Username === p.username && String(row.Password) === String(p.password) &&
        row.Active !== false && row.Active !== 'FALSE') {
      const token = Utilities.getUuid();
      SS.getSheetByName('Sessions').appendRow([
        token, row.Username, new Date(), new Date(Date.now() + SESSION_HOURS * 3600 * 1000)
      ]);
      return { success: true, token: token, displayName: row.DisplayName || row.Username, role: row.Role || 'member' };
    }
  }
  return { success: false, error: 'Invalid username or password' };
}

/** Wraps any action that requires a signed-in user; passes the username through to fn. */
function withAuth_(params, fn) {
  const sheet = SS.getSheetByName('Sessions');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  let user = null;
  for (let i = 1; i < rows.length; i++) {
    const row = obj_(headers, rows[i]);
    if (row.Token === params.token && new Date(row.Expires) > new Date()) { user = row.Username; break; }
  }
  if (!user) return { success: false, error: 'Session expired — please log in again' };
  return fn(params, user);
}
/**
 * Dashboard.gs — the single combined read that powers the whole app on
 * load: every project, sticky note, idea, and book in one response.
 */

function getDashboard_(p, user) {
  return {
    success: true,
    projects: sheetToObjects_('Projects'),
    stickies: sheetToObjects_('StickyNotes'),
    ideas: sheetToObjects_('Ideas').reverse(),
    books: sheetToObjects_('Books')
  };
}
/**
 * Projects.gs — everything about the Projects tab: creating a project and
 * updating its status/progress from the dashboard slider.
 */

function addProject_(p, user) {
  const sheet = SS.getSheetByName('Projects');
  const id = 'P' + Date.now();
  sheet.appendRow([
    id, p.name, p.category, user, p.partner || '', p.status || 'Planning',
    p.progress || 0, p.startDate || '', p.targetDate || '', p.description || '', new Date()
  ]);
  return { success: true, projectId: id };
}

function updateProject_(p, user) {
  const sheet = SS.getSheetByName('Projects');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol = headers.indexOf('ProjectID');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === p.projectId) {
      const r = i + 1;
      if (p.status !== undefined)      sheet.getRange(r, headers.indexOf('Status') + 1).setValue(p.status);
      if (p.progress !== undefined)    sheet.getRange(r, headers.indexOf('Progress') + 1).setValue(p.progress);
      if (p.description !== undefined) sheet.getRange(r, headers.indexOf('Description') + 1).setValue(p.description);
      if (p.targetDate !== undefined)  sheet.getRange(r, headers.indexOf('TargetDate') + 1).setValue(p.targetDate);
      sheet.getRange(r, headers.indexOf('LastUpdated') + 1).setValue(new Date());
      return { success: true };
    }
  }
  return { success: false, error: 'Project not found' };
}
/**
 * Books.gs — the Book Writing module: creating a book, listing its
 * chapters, and saving a chapter draft (new or edited).
 */

function addBook_(p, user) {
  const sheet = SS.getSheetByName('Books');
  const id = 'B' + Date.now();
  sheet.appendRow([id, p.title, p.genre || '', p.authors || user, p.status || 'Drafting', p.targetDate || '', p.synopsis || '', new Date()]);
  return { success: true, bookId: id };
}

function getBookDetail_(p, user) {
  const chapters = sheetToObjects_('Chapters').filter(c => c.BookID === p.bookId)
    .sort((a, b) => (a.ChapterNo || 0) - (b.ChapterNo || 0));
  return { success: true, chapters: chapters };
}

function saveChapter_(p, user) {
  const sheet = SS.getSheetByName('Chapters');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol = headers.indexOf('ChapterID');
  const plainText = (p.content || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;

  if (p.chapterId) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idCol] === p.chapterId) {
        const r = i + 1;
        sheet.getRange(r, headers.indexOf('Title') + 1).setValue(p.title);
        sheet.getRange(r, headers.indexOf('Content') + 1).setValue(p.content);
        sheet.getRange(r, headers.indexOf('WordCount') + 1).setValue(wordCount);
        sheet.getRange(r, headers.indexOf('LastUpdated') + 1).setValue(new Date());
        return { success: true, chapterId: p.chapterId, wordCount: wordCount };
      }
    }
  }
  const id = 'C' + Date.now();
  sheet.appendRow([id, p.bookId, p.chapterNo || 1, p.title, p.content, wordCount, user, new Date()]);
  return { success: true, chapterId: id, wordCount: wordCount };
}
/**
 * Stickies.gs — targets/reminders shared across everyone who logs in.
 */

function addSticky_(p, user) {
  const sheet = SS.getSheetByName('StickyNotes');
  const id = 'N' + Date.now();
  sheet.appendRow([id, p.text, p.projectId || '', user, p.targetDate || '', 'active', new Date(), '']);
  return { success: true, noteId: id };
}

function completeSticky_(p, user) {
  return setStickyStatus_(p.noteId, 'done', true);
}

function deleteSticky_(p, user) {
  const sheet = SS.getSheetByName('StickyNotes');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol = headers.indexOf('NoteID');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === p.noteId) { sheet.deleteRow(i + 1); return { success: true }; }
  }
  return { success: false, error: 'Note not found' };
}

function setStickyStatus_(noteId, status, stampCompleted) {
  const sheet = SS.getSheetByName('StickyNotes');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol = headers.indexOf('NoteID');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idCol] === noteId) {
      const r = i + 1;
      sheet.getRange(r, headers.indexOf('Status') + 1).setValue(status);
      if (stampCompleted) sheet.getRange(r, headers.indexOf('CompletedDate') + 1).setValue(new Date());
      return { success: true };
    }
  }
  return { success: false, error: 'Note not found' };
}
/**
 * Ideas.gs — the brainstorm log.
 */

function addIdea_(p, user) {
  const sheet = SS.getSheetByName('Ideas');
  const id = 'I' + Date.now();
  sheet.appendRow([id, p.text, p.category || 'General', user, new Date()]);
  return { success: true, ideaId: id };
}

/* ---------- one-time setup ---------- */

/**
 * Run this once from the Apps Script editor (select setupSheets in the
 * function dropdown at the top, then click Run). It creates any of the 7
 * required tabs that are missing, with the exact header row each one
 * needs. Safe to run again later — it never touches a tab that already
 * exists, so it won't wipe your data.
 */
function setupSheets() {
  const specs = {
    Users:       ['Username', 'Password', 'DisplayName', 'Role', 'Active'],
    Sessions:    ['Token', 'Username', 'Created', 'Expires'],
    Projects:    ['ProjectID', 'Name', 'Category', 'Owner', 'Partner', 'Status', 'Progress', 'StartDate', 'TargetDate', 'Description', 'LastUpdated'],
    Books:       ['BookID', 'Title', 'Genre', 'Authors', 'Status', 'TargetDate', 'Synopsis', 'LastUpdated'],
    Chapters:    ['ChapterID', 'BookID', 'ChapterNo', 'Title', 'Content', 'WordCount', 'Author', 'LastUpdated'],
    StickyNotes: ['NoteID', 'Text', 'ProjectID', 'CreatedBy', 'TargetDate', 'Status', 'CreatedDate', 'CompletedDate'],
    Ideas:       ['IdeaID', 'Text', 'Category', 'CreatedBy', 'CreatedDate']
  };

  const created = [];
  const already = [];

  Object.keys(specs).forEach(name => {
    let sheet = SS.getSheetByName(name);
    if (sheet) { already.push(name); return; }
    sheet = SS.insertSheet(name);
    sheet.getRange(1, 1, 1, specs[name].length).setValues([specs[name]]);
    sheet.setFrozenRows(1);
    created.push(name);
  });

  const msg = 'Created: ' + (created.length ? created.join(', ') : 'none') +
    '\nAlready existed: ' + (already.length ? already.join(', ') : 'none');
  Logger.log(msg);
  return msg;
}

/**
 * Optional: run this to add your first admin user without typing directly
 * into the sheet. Change the values below first, then run once.
 */
function addFirstUser_() {
  const username = 'admin';
  const password = 'CHANGE-THIS-PASSWORD';
  const displayName = 'Admin';

  const sheet = SS.getSheetByName('Users');
  const existing = sheetToObjects_('Users').some(u => u.Username === username);
  if (existing) { Logger.log('User already exists: ' + username); return; }
  sheet.appendRow([username, password, displayName, 'admin', true]);
  Logger.log('Added user: ' + username);
}
