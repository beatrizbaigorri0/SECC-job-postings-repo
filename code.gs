const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1W6ZQah7mg34XshGFLEHjEHOpPQLLEHKb7daATCeX5JQ/edit?gid=0';
const SHEET_GID = 0; // the "gid=" number in the sheet's URL
const RECIPIENTS = 'etobin@mit.edu,bea_bai@mit.edu';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('SECC Opportunities')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Reads the Google Sheet and returns each row as an object keyed by column header.
function getOpportunities() {
  const ss = SpreadsheetApp.openByUrl(SHEET_URL);
  const sheet = ss.getSheets().find(s => s.getSheetId() === SHEET_GID) || ss.getSheets()[0];
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const head = values[0].map(h => h.trim());
  return values.slice(1)
    .filter(r => r[0])
    .map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

// Called by the "Add an opportunity" form.
function submitOpportunity(f) {
  f = f || {};
  const clean = s => String(s || '').trim().slice(0, 3000);
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  if (f.website) return { ok: true };            // honeypot: bots fill this, humans don't

  const d = {
    role: clean(f.role),
    company: clean(f.company),
    types: clean(f.types),
    focus: clean(f.focus),
    location: clean(f.location),
    deadline: clean(f.deadline),
    link: clean(f.link),
    description: clean(f.description),
    name: clean(f.name),
    email: clean(f.email)
  };

  if (!d.role || !d.company || !d.link || !d.description) {
    throw new Error('Please fill in role, company, link and description.');
  }
  if (!/^https?:\/\//i.test(d.link)) {
    throw new Error('The link must start with http:// or https://');
  }

  const lines = [
    ['Company', d.company], ['Role', d.role], ['Type', d.types], ['Focus area', d.focus],
    ['Location', d.location], ['Deadline', d.deadline], ['Link', d.link],
    ['Description', d.description],
    ['Submitted by', [d.name, d.email].filter(Boolean).join(' · ') || 'Anonymous']
  ];

  const text = lines.map(([k, v]) => `${k}: ${v || '-'}`).join('\n');
  const html = '<h3>New SECC opportunity submission</h3><table cellpadding="6">' +
    lines.map(([k, v]) =>
      `<tr><td valign="top"><b>${k}</b></td><td>${esc(v || '-').replace(/\n/g, '<br>')}</td></tr>`
    ).join('') + '</table>';

  const opts = {
    to: RECIPIENTS,
    subject: `[SECC] New opportunity: ${d.company} - ${d.role}`,
    body: text,
    htmlBody: html,
    name: 'SECC Opportunities Board'
  };
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) opts.replyTo = d.email;

  MailApp.sendEmail(opts);
  return { ok: true };
}

// Run once from the editor to grant permissions (sheet access + email sending).
function authorize() {
  MailApp.getRemainingDailyQuota();
  Logger.log('Rows found: ' + getOpportunities().length);
}
