const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '../prisma/dev.db');
console.log('Connecting to database at:', dbPath);

const db = new Database(dbPath);

try {
  db.pragma('journal_mode = WAL');

  const batchName = 'Official Verified Emails';
  let batchId;

  const existingBatch = db.prepare('SELECT * FROM ImportBatch WHERE name = ?').get(batchName);
  if (existingBatch) {
    batchId = existingBatch.id;
    console.log('Using existing batch:', batchId);
  } else {
    batchId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO ImportBatch (id, name, fileName, totalCount, validCount, invalidCount, pendingCount, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(batchId, batchName, 'official_emails.csv', 12, 12, 0, 0, 'completed', now, now);
    console.log('Created new batch:', batchId);
  }

  const emails = [
    { address: 'sales@asteredu.guru', name: 'Sales (Guru) [Forwarded]' },
    { address: 'info@asteredu.guru', name: 'Info (Guru) [Forwarded]' },
    { address: 'sales@asteredu.site', name: 'Sales (Site) [Forwarded]' },
    { address: 'info@asteredu.site', name: 'Info (Site) [Forwarded]' },
    { address: 'marketing@asteredu.site', name: 'Marketing (Site) [Forwarded]' },
    { address: 'contact@asteredu.site', name: 'Contact (Site) [Forwarded]' },
    { address: 'support@asteredu.site', name: 'Support (Site) [Forwarded]' },
    { address: 'sales@asteredu.buzz', name: 'Sales (Buzz) [Active Zoho Mailbox]' },
    { address: 'info@asteredu.buzz', name: 'Info (Buzz) [Zoho Alias]' },
    { address: 'marketing@asteredu.buzz', name: 'Marketing (Buzz) [Zoho Alias]' },
    { address: 'contact@asteredu.buzz', name: 'Contact (Buzz) [Zoho Alias]' },
    { address: 'support@asteredu.buzz', name: 'Support (Buzz) [Zoho Alias]' }
  ];

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO Email (
      id, address, name, domain, syntaxValid, mxValid, smtpValid, aiVerified, status, source, batchId, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let addedCount = 0;
  const now = new Date().toISOString();

  for (const email of emails) {
    const domain = email.address.split('@')[1];
    
    // Check if email already exists in this batch to preserve id if possible, else create new
    const existingEmail = db.prepare('SELECT id FROM Email WHERE address = ? AND batchId = ?').get(email.address, batchId);
    const id = existingEmail ? existingEmail.id : uuidv4();

    insertStmt.run(
      id,
      email.address,
      email.name,
      domain,
      1, // syntaxValid = true
      1, // mxValid = true
      1, // smtpValid = true
      1, // aiVerified = true
      'valid', // status
      'import', // source
      batchId,
      now,
      now
    );
    console.log(`Pre-seeded email: ${email.address}`);
    addedCount++;
  }

  db.prepare(`
    UPDATE ImportBatch
    SET totalCount = (SELECT COUNT(*) FROM Email WHERE batchId = ?),
        validCount = (SELECT COUNT(*) FROM Email WHERE batchId = ? AND status = 'valid'),
        invalidCount = (SELECT COUNT(*) FROM Email WHERE batchId = ? AND status = 'invalid'),
        pendingCount = (SELECT COUNT(*) FROM Email WHERE batchId = ? AND status = 'pending'),
        updatedAt = ?
    WHERE id = ?
  `).run(batchId, batchId, batchId, batchId, now, batchId);

  console.log(`Successfully seeded/updated all ${addedCount} official emails in the database!`);
} catch (error) {
  console.error('Error seeding emails:', error);
} finally {
  db.close();
}
