const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(path.resolve(__dirname, '..', 'file_sharing.db'));
const UPLOADS = path.resolve(__dirname, '..', 'uploads');

console.log('Scanning uploads folder and DB...');

// read all files in uploads folder
const diskFiles = new Set(fs.readdirSync(UPLOADS));

// gather file_name values referenced in DB
const referenced = new Set();

db.all('SELECT file_name FROM files WHERE file_name IS NOT NULL', (err, rows) => {
  if(err){ console.error('DB error', err); process.exit(1); }
  rows.forEach(r => { if(r.file_name) referenced.add(r.file_name); });

  // delete files not referenced
  const toDelete = [...diskFiles].filter(f => !referenced.has(f));
  if(toDelete.length === 0){ console.log('No unreferenced files found.'); process.exit(0); }

  console.log('Unreferenced files to delete:', toDelete);
  toDelete.forEach(f => {
    const fp = path.join(UPLOADS, f);
    try{ fs.unlinkSync(fp); console.log('Deleted', f); }catch(e){ console.error('Could not delete', f, e.message); }
  });
  console.log('Cleanup complete.');
  process.exit(0);
});
