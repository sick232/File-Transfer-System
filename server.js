const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

// Initialize SQLite database
const db = new sqlite3.Database('./file_sharing.db');

// Create the files table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT,
    random_code TEXT,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: './uploads', // Directory where files will be stored locally
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to avoid name conflicts
    }
});
const upload = multer({ storage });

// Serve static HTML files (e.g., share.html, receive.html)
app.use(express.static('public'));
// parse urlencoded bodies for text shares
app.use(express.urlencoded({ extended: false }));

// Ensure text_content column exists (migration for older DBs)
db.serialize(() => {
    db.all("PRAGMA table_info(files)", (err, rows) => {
        if (err) return console.error('Migration check failed', err);
        const hasText = rows && rows.some(r => r.name === 'text_content');
        if (!hasText) {
            console.log('Migration: adding text_content column to files table');
            db.run('ALTER TABLE files ADD COLUMN text_content TEXT', (e) => { if (e) console.error('Could not add column', e); });
        }
    });
});

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const randomCode = Math.random().toString(36).substr(2, 6).toUpperCase(); // Generate a random code
    const fileName = req.file.filename;

    // Insert file details into the SQLite database
    db.run(`INSERT INTO files (file_name, random_code) VALUES (?, ?)`, [fileName, randomCode], (err) => {
        if (err) {
            console.error(err); // Log the error
            return res.status(500).json({ message: 'Error uploading file' });
        }
        res.json({ message: 'File uploaded successfully', code: randomCode });
    });
});

// Share text route
app.post('/share-text', (req, res) => {
    const text = req.body && req.body.text;
    if (!text) return res.status(400).json({ message: 'No text provided' });
    const randomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    db.run(`INSERT INTO files (text_content, random_code) VALUES (?, ?)`, [text, randomCode], (err) => {
        if (err) { console.error(err); return res.status(500).json({ message: 'Error saving text' }); }
        res.json({ message: 'Text shared', code: randomCode });
    });
});

// Route to retrieve file by random code
app.get('/receive/:code', (req, res) => {
    const code = req.params.code;
    db.get('SELECT * FROM files WHERE random_code = ?', [code], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ message: 'File not found' });
        }
        // if text_content present, return text, otherwise return file info
        if (row.text_content) {
            return res.json({ text: row.text_content, upload_time: row.upload_time });
        }
        res.json({ file_name: row.file_name, upload_time: row.upload_time });
    });
});

// Route to download file by random code
app.get('/download/:code', (req, res) => {
    const code = req.params.code;
    db.get('SELECT * FROM files WHERE random_code = ?', [code], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ message: 'File not found' });
        }
        const filePath = path.join(__dirname, 'uploads', row.file_name);
        res.download(filePath, row.file_name, (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Could not download the file.');
            }
        });
    });
});

// Start the server - production ready configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Allow external connections for hosting

app.listen(PORT, HOST, () => {
    console.log(`🚀 File Transfer System running on port ${PORT}`);
    console.log(`📱 Mobile-responsive and ready for hosting!`);
    console.log(`🌐 Access at: http://localhost:${PORT}`);
    if (process.env.NODE_ENV === 'production') {
        console.log('🔒 Running in production mode');
    }
});

// Cleanup job: delete DB rows and uploaded files older than 10 minutes
const fs = require('fs');
const CLEANUP_INTERVAL_MS = 60 * 1000; // run every minute
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanupOldFiles(){
    const cutoff = Date.now() - TTL_MS;
    // select rows older than cutoff
    db.all('SELECT id, file_name, upload_time FROM files', (err, rows) => {
        if(err) return console.error('Cleanup: could not query files', err);
        rows.forEach(row => {
            const t = new Date(row.upload_time).getTime();
            if(isNaN(t)) return; // skip malformed
            if(t < cutoff){
                // delete db row
                db.run('DELETE FROM files WHERE id = ?', [row.id], (e)=>{ if(e) console.error('Cleanup: failed to delete row', e); else console.log('Cleanup: removed row id', row.id); });
                // delete file from disk if present
                if(row.file_name){
                    const fp = path.join(__dirname, 'uploads', row.file_name);
                    fs.unlink(fp, (e)=>{ if(e && e.code !== 'ENOENT') console.error('Cleanup: could not remove file', fp, e); else console.log('Cleanup: removed file', fp); });
                }
            }
        });
    });
}

// Run cleanup immediately at startup and then every minute
cleanupOldFiles();
setInterval(cleanupOldFiles, CLEANUP_INTERVAL_MS);
