import express from 'express';
import { GoogleGenAI, Type } from "@google/genai";
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('attendance.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    admission_number TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lecturer TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER,
    date TEXT NOT NULL,
    venue TEXT NOT NULL,
    duration INTEGER,
    start_time TEXT,
    end_time TEXT,
    scheduled_start TEXT,
    scheduled_end TEXT,
    lecturer_otp TEXT,
    lecturer_present INTEGER DEFAULT 0,
    otp_enabled INTEGER DEFAULT 0,
    FOREIGN KEY(unit_id) REFERENCES units(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER,
    student_id INTEGER,
    otp TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    marked_at TEXT,
    FOREIGN KEY(lesson_id) REFERENCES lessons(id),
    FOREIGN KEY(student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active',
    paid_status TEXT DEFAULT 'paid',
    billing_amount INTEGER DEFAULT 1500,
    last_billing_date TEXT
  );

  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    name TEXT NOT NULL,
    FOREIGN KEY(school_id) REFERENCES schools(id)
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER,
    name TEXT NOT NULL,
    FOREIGN KEY(department_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS intakes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS superadmins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER UNIQUE,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    FOREIGN KEY(school_id) REFERENCES schools(id)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    audience TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS student_warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER UNIQUE NOT NULL,
    absent_count INTEGER,
    reason TEXT,
    status TEXT DEFAULT 'pending_rep',
    created_at TEXT NOT NULL,
    FOREIGN KEY(student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS payment_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    school_name TEXT,
    reference TEXT UNIQUE,
    amount INTEGER,
    phone TEXT,
    sender_name TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    FOREIGN KEY(school_id) REFERENCES schools(id)
  );
`);

// Migration helper for any table columns
const runColumnMigration = (tableName: string, requiredCols: { name: string, type: string }[]) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
  const columnNames = columns.map(c => c.name);
  for (const col of requiredCols) {
    if (!columnNames.includes(col.name)) {
      console.log(`Migrating: Adding column ${col.name} ${col.type} to Table ${tableName}`);
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}`);
    }
  }
};

runColumnMigration('lessons', [
  { name: 'end_time', type: 'TEXT' },
  { name: 'scheduled_start', type: 'TEXT' },
  { name: 'scheduled_end', type: 'TEXT' },
  { name: 'lecturer_otp', type: 'TEXT' },
  { name: 'lecturer_present', type: 'INTEGER DEFAULT 0' },
  { name: 'otp_enabled', type: 'INTEGER DEFAULT 0' },
  { name: 'school_id', type: 'INTEGER DEFAULT 1' }
]);

runColumnMigration('students', [
  { name: 'school_id', type: 'INTEGER DEFAULT 1' },
  { name: 'course_id', type: 'INTEGER DEFAULT 1' },
  { name: 'intake', type: 'TEXT' }
]);

runColumnMigration('units', [
  { name: 'school_id', type: 'INTEGER DEFAULT 1' },
  { name: 'department_id', type: 'INTEGER DEFAULT 1' },
  { name: 'intake', type: 'TEXT' }
]);

runColumnMigration('departments', [
  { name: 'image_url', type: 'TEXT' }
]);

  // Initial settings
  const license = db.prepare("SELECT value FROM settings WHERE key = 'license_expiry'").get() as { value: string } | undefined;
  if (!license || new Date(license.value) < new Date()) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 365);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_expiry', ?)").run(expiry.toISOString());
  }
  
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('rep_name', 'Class Rep')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('rep_password', 'admin123')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('lecturer_password', 'lecturer123')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('rep_email', 'shemomondi746@gmail.com')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('rep_phone', '0712345678')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('rep_avatar', '')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('developer_password', 'shem123')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('otp_duration_mins', '20')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('late_threshold_mins', '10')").run();

  // Populate default school structures if none exist to avoid empty state
  const checkSchools = db.prepare("SELECT count(*) as count FROM schools").get() as { count: number };
  if (checkSchools.count === 0) {
    db.prepare("INSERT INTO schools (id, name, status, paid_status, billing_amount) VALUES (1, 'Kenyatta University', 'active', 'paid', 1500)").run();
    db.prepare("INSERT INTO departments (id, school_id, name) VALUES (1, 1, 'Computing and Information Technology')").run();
    db.prepare("INSERT INTO departments (id, school_id, name) VALUES (2, 1, 'School of Engineering')").run();
    db.prepare("INSERT INTO courses (id, department_id, name) VALUES (1, 1, 'BSc. Computer Science')").run();
    db.prepare("INSERT INTO courses (id, department_id, name) VALUES (2, 1, 'BSc. Information Technology')").run();
    db.prepare("INSERT OR IGNORE INTO superadmins (school_id, username, password) VALUES (1, 'ku_admin', 'super123')").run();
  }

  // Populate default intakes
  const checkIntakes = db.prepare("SELECT count(*) as count FROM intakes").get() as { count: number };
  if (checkIntakes.count === 0) {
    db.prepare("INSERT OR IGNORE INTO intakes (name) VALUES ('January 2026')").run();
    db.prepare("INSERT OR IGNORE INTO intakes (name) VALUES ('May 2026')").run();
    db.prepare("INSERT OR IGNORE INTO intakes (name) VALUES ('September 2026')").run();
    db.prepare("INSERT OR IGNORE INTO intakes (name) VALUES ('January 2025')").run();
    db.prepare("INSERT OR IGNORE INTO intakes (name) VALUES ('May 2025')").run();
    db.prepare("INSERT OR IGNORE INTO intakes (name) VALUES ('September 2025')").run();
  }

  // Force defaults if they are missing (in case table existed but keys didn't)
  const checkRep = db.prepare("SELECT value FROM settings WHERE key = 'rep_password'").get();
  if (!checkRep) db.prepare("INSERT INTO settings (key, value) VALUES ('rep_password', 'admin123')").run();
  
  const checkLecturer = db.prepare("SELECT value FROM settings WHERE key = 'lecturer_password'").get();
  if (!checkLecturer) db.prepare("INSERT INTO settings (key, value) VALUES ('lecturer_password', 'lecturer123')").run();

interface StudentRow { id: number; name: string; admission_number: string; }
interface UnitRow { id: number; name: string; lecturer: string; }
interface LessonRow { 
  id: number; 
  unit_id: number; 
  date: string; 
  venue: string; 
  duration: number; 
  start_time: string; 
  end_time: string; 
  scheduled_start: string;
  scheduled_end: string;
  lecturer_otp: string;
  lecturer_present: number;
  otp_enabled: number; 
  unit_name?: string; 
  lecturer?: string; 
}
interface AttendanceRow { id: number; lesson_id: number; student_id: number; otp: string; status: string; marked_at: string; student_name?: string; admission_number?: string; }

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get('/api/students', (req, res) => {
    try {
      const students = db.prepare(`
        SELECT s.*, c.name as course_name, d.name as department_name 
        FROM students s 
        LEFT JOIN courses c ON s.course_id = c.id
        LEFT JOIN departments d ON c.department_id = d.id
        ORDER BY s.name ASC
      `).all() as any[];
      res.json(students);
    } catch (err: any) {
      const students = db.prepare('SELECT * FROM students ORDER BY name ASC').all() as StudentRow[];
      res.json(students);
    }
  });

  const MAX_SESSIONS = 10;
  const SESSION_TIMEOUT = 300 * 1000; // 5 minutes
  const activeSessions = new Map<string, number>(); // session_id -> last_seen

  const cleanupSessions = () => {
    const now = Date.now();
    for (const [sid, lastSeen] of activeSessions.entries()) {
      if (now - lastSeen > SESSION_TIMEOUT) {
        activeSessions.delete(sid);
      }
    }
  };

  app.post('/api/session/enter', (req, res) => {
    cleanupSessions();
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'Session ID required' });
    
    if (activeSessions.has(session_id)) {
      activeSessions.set(session_id, Date.now());
      return res.json({ success: true });
    }
    
    if (activeSessions.size >= MAX_SESSIONS) {
      return res.status(429).json({ error: 'Server busy. Please wait for a slot.', busy: true });
    }
    
    activeSessions.set(session_id, Date.now());
    res.json({ success: true });
  });

  app.post('/api/session/heartbeat', (req, res) => {
    const { session_id } = req.body;
    if (activeSessions.has(session_id)) {
      activeSessions.set(session_id, Date.now());
      return res.json({ success: true });
    }
    res.status(401).json({ error: 'Session expired' });
  });

  app.post('/api/session/exit', (req, res) => {
    const { session_id } = req.body;
    activeSessions.delete(session_id);
    res.json({ success: true });
  });

  app.post('/api/students', (req, res) => {
    const { name, admission_number, course_id, intake } = req.body;
    try {
      const info = db.prepare('INSERT INTO students (name, admission_number, course_id, intake) VALUES (?, ?, ?, ?)')
        .run(name, admission_number, course_id || 1, intake || '');
      const studentId = Number(info.lastInsertRowid);

      // Check for an active lesson (within last 24 hours) to add this student to it
      const activeLesson = db.prepare(`
        SELECT id, start_time FROM lessons 
        WHERE datetime(start_time) > datetime('now', '-24 hours')
        ORDER BY id DESC LIMIT 1
      `).get() as { id: number, start_time: string } | undefined;

      if (activeLesson) {
        const startTime = new Date(activeLesson.start_time).getTime();
        const now = new Date().getTime();
        const otp_duration_mins = parseInt((db.prepare("SELECT value FROM settings WHERE key = 'otp_duration_mins'").get() as any)?.value || '20');
        const diffMins = (now - startTime) / (1000 * 60);
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const status = diffMins > otp_duration_mins ? 'absent' : 'pending';

        db.prepare('INSERT INTO attendance (lesson_id, student_id, otp, status) VALUES (?, ?, ?, ?)')
          .run(activeLesson.id, studentId, otp, status);
        
        io.emit('attendance-updated', { lessonId: activeLesson.id });
      }

      res.json({ id: studentId });
    } catch (e) {
      res.status(400).json({ error: 'Admission number already exists' });
    }
  });

  app.get('/api/units', (req, res) => {
    try {
      const units = db.prepare(`
        SELECT u.*, d.name as department_name 
        FROM units u
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY u.name ASC
      `).all() as any[];
      res.json(units);
    } catch (err: any) {
      const units = db.prepare('SELECT * FROM units ORDER BY name ASC').all() as UnitRow[];
      res.json(units);
    }
  });

  app.post('/api/units', (req, res) => {
    const { name, lecturer, department_id, intake } = req.body;
    try {
      const info = db.prepare('INSERT INTO units (name, lecturer, department_id, intake) VALUES (?, ?, ?, ?)')
        .run(name, lecturer, department_id || 1, intake || '');
      res.json({ id: Number(info.lastInsertRowid) });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to register unit' });
    }
  });

  app.put('/api/students/:id', (req, res) => {
    const { name, admission_number, course_id, intake } = req.body;
    try {
      db.prepare('UPDATE students SET name = ?, admission_number = ?, course_id = ?, intake = ? WHERE id = ?')
        .run(name, admission_number, course_id || 1, intake || '', req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: 'Admission number already exists or invalid update' });
    }
  });

  app.delete('/api/students/:id', (req, res) => {
    const id = parseInt(req.params.id);
    console.log(`Attempting to delete student ID: ${id}`);
    try {
      db.transaction(() => {
        const attendanceDeleted = db.prepare('DELETE FROM attendance WHERE student_id = ?').run(id);
        const studentDeleted = db.prepare('DELETE FROM students WHERE id = ?').run(id);
        console.log(`Deleted ${attendanceDeleted.changes} attendance records and ${studentDeleted.changes} student record`);
      })();
      res.json({ success: true });
    } catch (e: any) {
      console.error(`Error deleting student ${id}:`, e);
      res.status(500).json({ error: e.message || 'Failed to delete student' });
    }
  });

  app.put('/api/units/:id', (req, res) => {
    const { name, lecturer, department_id, intake } = req.body;
    try {
      db.prepare('UPDATE units SET name = ?, lecturer = ?, department_id = ?, intake = ? WHERE id = ?')
        .run(name, lecturer, department_id || 1, intake || '', req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to update unit' });
    }
  });

  // --- NEW ACADEMIC CONFIGURATION ENDPOINTS ---
  app.get('/api/departments', (req, res) => {
    try {
      const departments = db.prepare('SELECT * FROM departments WHERE school_id = 1 ORDER BY name ASC').all();
      res.json(departments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/departments', (req, res) => {
    const { name, image_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Department name is required' });
    try {
      const info = db.prepare('INSERT INTO departments (school_id, name, image_url) VALUES (?, ?, ?)').run(1, name, image_url || null);
      res.json({ id: Number(info.lastInsertRowid), school_id: 1, name, image_url });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/departments/:id', (req, res) => {
    const { name, image_url } = req.body;
    const { id } = req.params;
    try {
      if (name !== undefined && image_url !== undefined) {
        db.prepare('UPDATE departments SET name = ?, image_url = ? WHERE id = ?').run(name, image_url, id);
      } else if (name !== undefined) {
        db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(name, id);
      } else if (image_url !== undefined) {
        db.prepare('UPDATE departments SET image_url = ? WHERE id = ?').run(image_url, id);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/settings/academic-map', (req, res) => {
    try {
      const mapImage = (db.prepare("SELECT value FROM settings WHERE key = 'academic_structure_image'").get() as { value: string })?.value || '';
      res.json({ image: mapImage });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/settings/academic-map', (req, res) => {
    const { image } = req.body;
    try {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('academic_structure_image', ?)")
        .run(image || '');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/departments/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM courses WHERE department_id = ?').run(id);
      db.prepare('DELETE FROM departments WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/courses', (req, res) => {
    try {
      const courses = db.prepare(`
        SELECT c.*, d.name as department_name 
        FROM courses c
        JOIN departments d ON c.department_id = d.id
        WHERE d.school_id = 1
        ORDER BY c.name ASC
      `).all();
      res.json(courses);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/courses', (req, res) => {
    const { department_id, name } = req.body;
    if (!department_id || !name) return res.status(400).json({ error: 'Department ID and Course name are required' });
    try {
      const info = db.prepare('INSERT INTO courses (department_id, name) VALUES (?, ?)').run(department_id, name);
      res.json({ id: Number(info.lastInsertRowid), department_id: Number(department_id), name });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/courses/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM courses WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/intakes', (req, res) => {
    try {
      const intakes = db.prepare('SELECT * FROM intakes ORDER BY name DESC').all();
      res.json(intakes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/intakes', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Intake name is required' });
    try {
      const info = db.prepare('INSERT OR IGNORE INTO intakes (name) VALUES (?)').run(name);
      res.json({ id: Number(info.lastInsertRowid) || 0, name });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/intakes/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM intakes WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/units/:id', (req, res) => {
    const id = parseInt(req.params.id);
    console.log(`Attempting to delete unit ID: ${id}`);
    try {
      db.transaction(() => {
        // Find all lessons for this unit
        const lessons = db.prepare('SELECT id FROM lessons WHERE unit_id = ?').all() as { id: number }[];
        console.log(`Found ${lessons.length} lessons for unit ${id}`);
        for (const lesson of lessons) {
          db.prepare('DELETE FROM attendance WHERE lesson_id = ?').run(lesson.id);
        }
        db.prepare('DELETE FROM lessons WHERE unit_id = ?').run(id);
        db.prepare('DELETE FROM units WHERE id = ?').run(id);
      })();
      res.json({ success: true });
    } catch (e: any) {
      console.error(`Error deleting unit ${id}:`, e);
      res.status(500).json({ error: e.message || 'Failed to delete unit' });
    }
  });

  app.get('/api/license/status', (req, res) => {
    let license = db.prepare("SELECT value FROM settings WHERE key = 'license_expiry'").get() as { value: string } | undefined;
    let expiry = license ? new Date(license.value) : new Date();
    const now = new Date();
    let daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Auto-renew if expired or near expiration
    if (!license || daysLeft < 10) {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 365);
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_expiry', ?)").run(newExpiry.toISOString());
      expiry = newExpiry;
      daysLeft = 365;
    }
    
    res.json({ 
      isValid: true,
      daysLeft: Math.max(1, daysLeft),
      expiry: expiry.toISOString()
    });
  });

  app.get('/api/settings/rep-name', (req, res) => {
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'rep_name'").get() as { value: string } | undefined;
    res.json({ name: setting?.value || '' });
  });

  app.post('/api/settings/rep-name', (req, res) => {
    const { name } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('rep_name', ?)").run(name);
    res.json({ success: true });
  });

  // --- DYNAMIC LECTURER AUTOFILL ENDPOINTS ---

  app.get('/api/units/lecturers', (req, res) => {
    try {
      const lecturers = db.prepare('SELECT DISTINCT lecturer FROM units ORDER BY lecturer ASC').all() as { lecturer: string }[];
      res.json(lecturers.map(l => l.lecturer));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/lecturer/my-otp', (req, res) => {
    const { lecturer } = req.query;
    if (!lecturer) return res.status(400).json({ error: 'Lecturer name is required' });
    
    try {
      const lesson = db.prepare(`
        SELECT l.*, u.lecturer 
        FROM lessons l 
        JOIN units u ON l.unit_id = u.id 
        ORDER BY l.id DESC LIMIT 1
      `).get() as LessonRow | undefined;
      
      if (!lesson) return res.status(404).json({ error: 'No active session found' });
      if (lesson.lecturer !== lecturer) {
        return res.status(400).json({ error: 'Selected lecturer does not match the active session unit' });
      }
      
      res.json({ otp: lesson.lecturer_otp });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- DEVELOPER PANEL WORKFLOW (Shem Omondi) ---

  app.post('/api/auth/developer', (req, res) => {
    const { password } = req.body;
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'developer_password'").get() as { value: string } | undefined;
    if (setting && setting.value === password) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid developer credentials' });
    }
  });

  app.post('/api/developer/login', (req, res) => {
    const { password } = req.body;
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'developer_password'").get() as { value: string } | undefined;
    if (setting && setting.value === password) {
      res.json({ success: true, success_login: true });
    } else {
      res.status(401).json({ error: 'Invalid developer credentials' });
    }
  });

  app.post('/api/developer/settings/password', (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('developer_password', ?)").run(password);
    res.json({ success: true });
  });

  app.get('/api/developer/schools', (req, res) => {
    try {
      const schools = db.prepare('SELECT * FROM schools ORDER BY id ASC').all() as any[];
      for (const school of schools) {
        school.student_count = (db.prepare('SELECT count(*) as cnt FROM students WHERE school_id = ?').get(school.id) as any)?.cnt || 0;
        school.dept_count = (db.prepare('SELECT count(*) as cnt FROM departments WHERE school_id = ?').get(school.id) as any)?.cnt || 0;
        school.course_count = (db.prepare('SELECT count(*) as cnt FROM courses WHERE department_id IN (SELECT id FROM departments WHERE school_id = ?)').get(school.id) as any)?.cnt || 0;
        school.lecturer_count = (db.prepare('SELECT count(DISTINCT lecturer) as cnt FROM units WHERE school_id = ?').get(school.id) as any)?.cnt || 0;
        
        const super_admin = db.prepare('SELECT username, password FROM superadmins WHERE school_id = ?').get(school.id) as any;
        school.super_username = super_admin?.username || 'None';
        school.super_password = super_admin?.password || 'None';
      }
      res.json(schools);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/developer/schools', (req, res) => {
    const { name, billing_amount, super_username, super_password } = req.body;
    if (!name || !super_username || !super_password) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    try {
      let schoolId = 0;
      db.transaction(() => {
        const info = db.prepare('INSERT INTO schools (name, billing_amount, status, paid_status) VALUES (?, ?, ?, ?)').run(
          name, 
          billing_amount || 1500, 
          'active', 
          'paid'
        );
        schoolId = Number(info.lastInsertRowid);
        
        // Auto-create a default department and course for the school
        const deptInfo = db.prepare('INSERT INTO departments (school_id, name) VALUES (?, ?)').run(
          schoolId, 
          'Department of Science'
        );
        const deptId = Number(deptInfo.lastInsertRowid);
        db.prepare('INSERT INTO courses (department_id, name) VALUES (?, ?)').run(
          deptId, 
          'General Computing course'
        );
        
        // Create superadmin
        db.prepare('INSERT INTO superadmins (school_id, username, password) VALUES (?, ?, ?)').run(
          schoolId, 
          super_username, 
          super_password
        );
      })();
      
      res.json({ success: true, schoolId });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'School name or Superadmin username already exists' });
    }
  });

  app.put('/api/developer/schools/:id', (req, res) => {
    const { name, billing_amount, super_username, super_password } = req.body;
    const schoolId = req.params.id;
    try {
      db.transaction(() => {
        db.prepare('UPDATE schools SET name = ?, billing_amount = ? WHERE id = ?').run(name, billing_amount, schoolId);
        // Update super admin
        db.prepare('INSERT OR REPLACE INTO superadmins (school_id, username, password) VALUES (?, ?, ?)').run(
          schoolId,
          super_username,
          super_password
        );
      })();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/developer/schools/:id', (req, res) => {
    const schoolId = req.params.id;
    try {
      db.transaction(() => {
        // Delete attendance first
        db.prepare('DELETE FROM attendance WHERE lesson_id IN (SELECT id FROM lessons WHERE school_id = ?)').run(schoolId);
        db.prepare('DELETE FROM attendance WHERE student_id IN (SELECT id FROM students WHERE school_id = ?)').run(schoolId);
        
        // Delete lessons
        db.prepare('DELETE FROM lessons WHERE school_id = ?').run(schoolId);
        
        // Delete units
        db.prepare('DELETE FROM units WHERE school_id = ?').run(schoolId);
        
        // Delete students
        db.prepare('DELETE FROM students WHERE school_id = ?').run(schoolId);
        
        // Delete courses
        db.prepare('DELETE FROM courses WHERE department_id IN (SELECT id FROM departments WHERE school_id = ?)').run(schoolId);
        
        // Delete departments
        db.prepare('DELETE FROM departments WHERE school_id = ?').run(schoolId);
        
        // Delete superadmins
        db.prepare('DELETE FROM superadmins WHERE school_id = ?').run(schoolId);
        
        // Finally delete school
        db.prepare('DELETE FROM schools WHERE id = ?').run(schoolId);
      })();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/developer/schools/:id/pause', (req, res) => {
    try {
      db.prepare("UPDATE schools SET status = 'paused' WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/developer/schools/:id/unpause', (req, res) => {
    try {
      db.prepare("UPDATE schools SET status = 'active' WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/developer/schools/:id/mark-paid', (req, res) => {
    try {
      db.prepare("UPDATE schools SET paid_status = 'paid' WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/developer/schools/:id/bill', (req, res) => {
    try {
      db.prepare("UPDATE schools SET paid_status = 'unpaid', last_billing_date = ? WHERE id = ?").run(
        new Date().toISOString().split('T')[0],
        req.params.id
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/developer/schools/:id/details', (req, res) => {
    const schoolId = req.params.id;
    try {
      const school = db.prepare('SELECT * FROM schools WHERE id = ?').get(schoolId);
      if (!school) return res.status(404).json({ error: 'School not found' });
      
      const departments = db.prepare('SELECT * FROM departments WHERE school_id = ?').all(schoolId) as any[];
      for (const dept of departments) {
        dept.courses = db.prepare('SELECT * FROM courses WHERE department_id = ?').all(dept.id);
      }
      
      const lecturers = db.prepare('SELECT DISTINCT lecturer, name as unit_name FROM units WHERE school_id = ?').all(schoolId);
      const students = db.prepare('SELECT s.*, c.name as course_name FROM students s LEFT JOIN courses c ON s.course_id = c.id WHERE s.school_id = ?').all(schoolId);
      
      res.json({
        school,
        departments,
        lecturers,
        students
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/developer/passwords-report', (req, res) => {
    try {
      const rep_password = (db.prepare("SELECT value FROM settings WHERE key = 'rep_password'").get() as any)?.value || 'admin123';
      const lecturer_password = (db.prepare("SELECT value FROM settings WHERE key = 'lecturer_password'").get() as any)?.value || 'lecturer123';
      
      const superadmins = db.prepare(`
        SELECT s.username, s.password, sc.name as school_name 
        FROM superadmins s
        JOIN schools sc ON s.school_id = sc.id
      `).all();
      
      res.json({
        rep_password,
        lecturer_password,
        superadmins
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/developer/reports', (req, res) => {
    try {
      const rep_password = (db.prepare("SELECT value FROM settings WHERE key = 'rep_password'").get() as any)?.value || 'admin123';
      const lecturer_password = (db.prepare("SELECT value FROM settings WHERE key = 'lecturer_password'").get() as any)?.value || 'lecturer123';
      
      const superadmins = db.prepare(`
        SELECT s.username, s.password, sc.name as school_name 
        FROM superadmins s
        JOIN schools sc ON s.school_id = sc.id
      `).all() as any[];

      const results: any[] = [];
      
      // superadmins first
      for (const sa of superadmins) {
        results.push({
          user_name: sa.username,
          school_name: sa.school_name,
          role: 'Superadmin',
          password: sa.password
        });
      }

      // Add default representative credentials entries
      const schoolsList = db.prepare('SELECT name FROM schools').all() as any[];
      const firstSchoolName = schoolsList[0]?.name || 'Kenyatta University';

      results.push({
        user_name: 'Class Representative',
        school_name: firstSchoolName,
        role: 'Representative',
        password: rep_password
      });

      results.push({
        user_name: 'University Lecturer',
        school_name: 'All Registered Universities',
        role: 'Lecturer',
        password: lecturer_password
      });

      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/developer/schools/status', (req, res) => {
    const { school_id, status } = req.body;
    try {
      db.prepare('UPDATE schools SET status = ? WHERE id = ?').run(status, school_id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/developer/schools/billing', (req, res) => {
    const { school_id, billing_amount } = req.body;
    try {
      db.prepare('UPDATE schools SET billing_amount = ? WHERE id = ?').run(billing_amount, school_id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/developer/schools/bill', (req, res) => {
    const { school_id } = req.body;
    try {
      db.prepare("UPDATE schools SET paid_status = 'unpaid', last_billing_date = ? WHERE id = ?").run(
        new Date().toISOString().split('T')[0],
        school_id
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/developer/schools/superadmin', (req, res) => {
    const { school_id, super_username, super_password } = req.body;
    try {
      db.prepare('INSERT OR REPLACE INTO superadmins (school_id, username, password) VALUES (?, ?, ?)').run(
        school_id,
        super_username,
        super_password
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- DEV PAYMENT SUBMISSIONS ENDPOINTS ---
  app.get('/api/developer/payment-submissions', (req, res) => {
    try {
      const submissions = db.prepare('SELECT * FROM payment_submissions ORDER BY id DESC').all();
      res.json(submissions);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/developer/payment-submissions/approve', (req, res) => {
    const { id, school_id } = req.body;
    try {
      db.transaction(() => {
        db.prepare("UPDATE payment_submissions SET status = 'approved' WHERE id = ?").run(id);
        db.prepare("UPDATE schools SET status = 'active', paid_status = 'paid', last_billing_date = ? WHERE id = ?")
          .run(new Date().toISOString().split('T')[0], school_id);
      })();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/developer/payment-submissions/reject', (req, res) => {
    const { id, school_id } = req.body;
    try {
      db.transaction(() => {
        db.prepare("UPDATE payment_submissions SET status = 'rejected' WHERE id = ?").run(id);
        if (school_id) {
          db.prepare("UPDATE schools SET paid_status = 'unpaid' WHERE id = ?").run(school_id);
        }
      })();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/developer/departments', (req, res) => {
    const { school_id, name } = req.body;
    try {
      db.prepare('INSERT INTO departments (school_id, name) VALUES (?, ?)').run(school_id, name);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/developer/courses', (req, res) => {
    const { department_id, name } = req.body;
    try {
      db.prepare('INSERT INTO courses (department_id, name) VALUES (?, ?)').run(department_id, name);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- SCHOOL SUPERADMIN ENDPOINTS ---

  app.post('/api/auth/superadmin', (req, res) => {
    const { username, password } = req.body;
    try {
      const superadmin = db.prepare(`
        SELECT s.*, sc.name as school_name, sc.status as school_status, sc.paid_status as school_paid_status 
        FROM superadmins s
        JOIN schools sc ON s.school_id = sc.id
        WHERE s.username = ? AND s.password = ?
      `).get(username, password) as any;
      
      if (superadmin) {
        res.json({ success: true, superadmin });
      } else {
        res.status(401).json({ error: 'Invalid username or password' });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/superadmin/login', (req, res) => {
    const { school_id, username, password } = req.body;
    try {
      const superadmin = db.prepare(`
        SELECT s.*, sc.name as school_name, sc.status as school_status, sc.paid_status as school_paid_status 
        FROM superadmins s
        JOIN schools sc ON s.school_id = sc.id
        WHERE s.school_id = ? AND s.username = ? AND s.password = ?
      `).get(school_id, username, password) as any;
      
      const schoolObj = db.prepare('SELECT * FROM schools WHERE id = ?').get(school_id) as any;
      
      if (superadmin && schoolObj) {
        res.json({ success: true, superadmin, school: schoolObj });
      } else {
        res.status(401).json({ error: 'Invalid username or password mapping to selected school.' });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/superadmin/report/:school_id', (req, res) => {
    const schoolId = req.params.school_id;
    try {
      const metrics = {
        total_students: (db.prepare('SELECT count(*) as cnt FROM students WHERE school_id = ?').get(schoolId) as any)?.cnt || 0,
        total_lecturers: (db.prepare('SELECT count(DISTINCT lecturer) as cnt FROM units WHERE school_id = ?').get(schoolId) as any)?.cnt || 0,
        total_departments: (db.prepare('SELECT count(*) as cnt FROM departments WHERE school_id = ?').get(schoolId) as any)?.cnt || 0,
        total_courses: (db.prepare('SELECT count(*) as cnt FROM courses WHERE department_id IN (SELECT id FROM departments WHERE school_id = ?)').get(schoolId) as any)?.cnt || 0,
        total_lessons: (db.prepare('SELECT count(*) as cnt FROM lessons WHERE school_id = ?').get(schoolId) as any)?.cnt || 0,
      };
      
      const recent_lessons = db.prepare(`
        SELECT l.*, u.name as unit_name, u.lecturer 
        FROM lessons l
        JOIN units u ON l.unit_id = u.id
        WHERE l.school_id = ?
        ORDER BY l.id DESC LIMIT 10
      `).all(schoolId);
      
      res.json({ metrics, recent_lessons });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/superadmin/pay', (req, res) => {
    const { school_id, reference, amount, phone, sender_name } = req.body;
    try {
      const school = db.prepare('SELECT name FROM schools WHERE id = ?').get(school_id) as { name: string } | undefined;
      const schoolName = school ? school.name : 'Unknown School';

      db.prepare(`
        INSERT OR REPLACE INTO payment_submissions (school_id, school_name, reference, amount, phone, sender_name, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(school_id, schoolName, reference || 'N/A', amount || 1500, phone || 'N/A', sender_name || 'N/A', new Date().toISOString());

      db.prepare("UPDATE schools SET paid_status = 'pending_activation' WHERE id = ?").run(school_id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/superadmin/pay/:school_id', (req, res) => {
    const schoolId = req.params.school_id;
    const { reference, amount, phone, sender_name } = req.body;
    try {
      const school = db.prepare('SELECT name FROM schools WHERE id = ?').get(schoolId) as { name: string } | undefined;
      const schoolName = school ? school.name : 'Unknown School';

      db.prepare(`
        INSERT OR REPLACE INTO payment_submissions (school_id, school_name, reference, amount, phone, sender_name, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(schoolId, schoolName, reference || 'N/A', amount || 1500, phone || 'N/A', sender_name || 'N/A', new Date().toISOString());

      db.prepare("UPDATE schools SET paid_status = 'pending_activation' WHERE id = ?").run(schoolId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/superadmin/passwords/:school_id', (req, res) => {
    const schoolId = req.params.school_id;
    try {
      const rep_password = (db.prepare("SELECT value FROM settings WHERE key = 'rep_password'").get() as any)?.value || 'admin123';
      const lecturer_password = (db.prepare("SELECT value FROM settings WHERE key = 'lecturer_password'").get() as any)?.value || 'lecturer123';
      res.json([
        { user_name: "Class Representative", role: "Representative", password: rep_password },
        { user_name: "Course Lecturers (Standard)", role: "Lecturer", password: lecturer_password }
      ]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/superadmin/passwords', (req, res) => {
    const { rep_password, lecturer_password } = req.body;
    try {
      if (rep_password) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('rep_password', ?)").run(rep_password);
      if (lecturer_password) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('lecturer_password', ?)").run(lecturer_password);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- SCHOOL ANNOUNCEMENTS API ---
  app.get('/api/announcements/:school_id', (req, res) => {
    const schoolId = req.params.school_id;
    const audience = req.query.audience || 'all'; // 'all', 'students', 'lecturers', 'reps'
    try {
      let rows;
      if (audience === 'all') {
        rows = db.prepare('SELECT * FROM announcements WHERE school_id = ? ORDER BY created_at DESC').all(schoolId);
      } else {
        rows = db.prepare("SELECT * FROM announcements WHERE school_id = ? AND (audience = ? OR audience = 'all') ORDER BY created_at DESC").all(schoolId, audience);
      }
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/announcements', (req, res) => {
    const { school_id, title, content, audience } = req.body;
    try {
      if (!school_id || !title || !content || !audience) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const createdAt = new Date().toISOString();
      db.prepare('INSERT INTO announcements (school_id, title, content, audience, created_at) VALUES (?, ?, ?, ?, ?)').run(school_id, title, content, audience, createdAt);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/announcements/:id', (req, res) => {
    const id = req.params.id;
    try {
      db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- DYNAMIC AI BOT REPORT GENERATOR (INTEGRATED CONTEXT-AWARE GEMINI) ---

  const aiApiKey = process.env.GEMINI_API_KEY;
  let aiClient: GoogleGenAI | null = null;

  function getAiClient() {
    if (!aiClient && aiApiKey) {
      aiClient = new GoogleGenAI({
        apiKey: aiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  app.post('/api/ai/query', async (req, res) => {
    const { prompt, school_id, role } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    try {
      const client = getAiClient();
      if (!client) {
        const fallbackText = "**AI Notice**: Gemini API Key is not configured in Secrets. Operating in Offline analysis mode:\n\n*Based on local database structures, registered elements are properly tracked. Kenyatta University is fully active with registered computing and software engineering pipelines. Your system latency is optimized for real-time mobile and desktop sync.*";
        return res.json({ 
          text: fallbackText,
          reply: fallbackText
        });
      }

      let context = "";
      if (role === 'developer') {
        const schoolsList = db.prepare('SELECT * FROM schools').all() as any[];
        const summary = schoolsList.map(s => {
          const students = (db.prepare('SELECT count(*) as cnt FROM students WHERE school_id = ?').get(s.id) as any)?.cnt || 0;
          const depts = (db.prepare('SELECT count(*) as cnt FROM departments WHERE school_id = ?').get(s.id) as any)?.cnt || 0;
          return `- ${s.name} (ID: ${s.id}): Status: ${s.status}, Paid: ${s.paid_status}, Billing: KES ${s.billing_amount}/mo, Students: ${students}, Depts: ${depts}`;
        }).join('\n');
        
        context = `You are a specialized Developer Technical Support Bot assisting Shem Omondi, the lead systems architect of Class Attendance Pro.
        Current Database Context:
        ${summary}
        Offer actionable, professional insights. Limit to 180 words.`;
      } else {
        const schoolObj = db.prepare('SELECT * FROM schools WHERE id = ?').get(school_id) as any;
        if (schoolObj) {
          const students = (db.prepare('SELECT count(*) as cnt FROM students WHERE school_id = ?').get(school_id) as any)?.cnt || 0;
          const depts = db.prepare('SELECT name FROM departments WHERE school_id = ?').all(school_id) as any[];
          
          context = `You are a Smart School Administration Bot assisting the Superadmin of ${schoolObj.name}.
          School Context:
          - Active enrollment: ${students} students
          - Academic Departments: ${depts.map(d => d.name).join(', ')}
          Analyze problems, formulate reports and assist with attendance tracking. Limit to 180 words.`;
        }
      }

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `${context}\n\nUser Question: ${prompt}`,
      });

      res.json({ 
        text: response.text,
        reply: response.text
      });
    } catch (error: any) {
      console.error('AI error:', error);
      res.status(500).json({ error: error.message || 'AI generation failed' });
    }
  });

  // Helper for resilient Gemini API calls on transient 503 error status
  async function callGenerateWithRetry(client: any, params: any, retries = 2, delayMs = 2000) {
    let lastError: any = null;
    for (let i = 0; i < retries; i++) {
       try {
         return await client.models.generateContent(params);
       } catch (err: any) {
         lastError = err;
         const errMsg = err.message || '';
         const errStr = JSON.stringify(err) || '';
         const isTransient = errMsg.includes('503') || 
                             errMsg.includes('UNAVAILABLE') || 
                             errStr.includes('503') || 
                             errStr.includes('UNAVAILABLE') ||
                             err.status === 503 ||
                             err.status === 'UNAVAILABLE';
         if (isTransient && i < retries - 1) {
           console.warn(`[Gemini API] 503/UNAVAILABLE detected. Retrying in ${delayMs}ms (Attempt ${i + 1}/${retries})...`);
           await new Promise(resolve => setTimeout(resolve, delayMs));
           continue;
         }
         throw err;
       }
    }
    throw lastError;
  }

  app.post('/api/ai/curriculum-analyzer', async (req, res) => {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Syllabus/curriculum image data is required' });

    try {
      const client = getAiClient();
      if (!client) {
        return res.status(500).json({ error: 'Gemini API Key is not configured. Please add GEMINI_API_KEY in secrets setup.' });
      }

      let base64Data = image;
      let mimeType = 'image/png';
      if (image.includes(';base64,')) {
        const parts = image.split(';base64,');
        mimeType = parts[0].replace('data:', '') || 'image/png';
        base64Data = parts[1];
      }

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data
        }
      };

      const promptString = `You are a high precision academic curriculum parser. 
Analyze this curriculum map, academic structure diagram, syllabus list, or document screenshot.
Extract all listed academic Departments, the Course majors under each department, and the Course Units / modules belonging to that department or under those courses.
Return the structured relationship cleanly in the requested JSON structure. Keep department name, course major names, and unit titles descriptive. Do not hallucinate fields.`;

      const response = await callGenerateWithRetry(client, {
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, { text: promptString }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              academic_elements: {
                type: Type.ARRAY,
                description: "Array of extracted department contexts",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    departmentName: { type: Type.STRING, description: "Name of the department (e.g. Computing Science, Civil Engineering)" },
                    coursesNameList: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Course majors, e.g. ['BSc. Computer Science', 'BSc. Information Technology']"
                    },
                    unitsNameList: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Academic unit subjects, e.g. ['Software Engineering', 'Automata Theory', 'Database Systems']"
                    }
                  },
                  required: ["departmentName", "coursesNameList", "unitsNameList"]
                }
              }
            },
            required: ["academic_elements"]
          }
        }
      });

      const resultText = response.text || "{}";
      const parsed = JSON.parse(resultText);
      const elements = parsed.academic_elements || [];

      // Query default intake
      const intakes = db.prepare('SELECT name FROM intakes').all() as { name: string }[];
      const defaultIntake = intakes.length > 0 ? intakes[0].name : 'May 2026';

      let insertedDepts = 0;
      let insertedCourses = 0;
      let insertedUnits = 0;

      const summaryList: string[] = [];

      db.transaction(() => {
        for (const el of elements) {
          if (!el.departmentName) continue;
          
          let deptId: number;
          // Check if dept exists
          const existingDept = db.prepare('SELECT id FROM departments WHERE name = ?').get(el.departmentName) as { id: number } | undefined;
          if (existingDept) {
            deptId = existingDept.id;
          } else {
            const info = db.prepare('INSERT INTO departments (school_id, name) VALUES (?, ?)').run(1, el.departmentName);
            deptId = Number(info.lastInsertRowid);
            insertedDepts++;
          }

          // Ingest courses
          for (const courseName of (el.coursesNameList || [])) {
            const existingCourse = db.prepare('SELECT id FROM courses WHERE name = ? AND department_id = ?').get(courseName, deptId) as { id: number } | undefined;
            if (!existingCourse) {
              db.prepare('INSERT INTO courses (department_id, name) VALUES (?, ?)').run(deptId, courseName);
              insertedCourses++;
            }
          }

          // Ingest units
          for (const unitName of (el.unitsNameList || [])) {
            const existingUnit = db.prepare('SELECT id FROM units WHERE name = ? AND department_id = ?').get(unitName, deptId) as { id: number } | undefined;
            if (!existingUnit) {
              db.prepare('INSERT INTO units (name, lecturer, department_id, intake) VALUES (?, ?, ?, ?)').run(unitName, 'Faculty Staff (AI)', deptId, defaultIntake);
              insertedUnits++;
            }
          }

          summaryList.push(`${el.departmentName}: ${el.coursesNameList?.length || 0} Courses, ${el.unitsNameList?.length || 0} Units`);
        }
      })();

      res.json({
        success: true,
        summary: `Successfully parsed and appended: ${insertedDepts} departments, ${insertedCourses} courses, and ${insertedUnits} units.`,
        details: summaryList,
        elements
      });

    } catch (err: any) {
      console.error('Curriculum analysis failed:', err);
      const errMsg = err.message || '';
      const errStr = JSON.stringify(err) || '';
      if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errStr.includes('503') || errStr.includes('UNAVAILABLE')) {
        return res.status(503).json({ 
          error: 'The upstream Google Gemini AI Service is temporarily overloaded or unavailable (503). Please click to upload the template/syllabus image again in a few moments to retry.' 
        });
      }
      res.status(500).json({ error: err.message || 'Error processing curriculum image via Gemini model.' });
    }
  });

  // --- CORE API FALLBACKS & UPDATED CONFIGS ---

  app.post('/api/auth/verify', (req, res) => {
    const { role, password } = req.body;
    const key = role === 'rep' ? 'rep_password' : 'lecturer_password';
    const setting = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
    
    if (setting && setting.value === password) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: 'Invalid password' });
    }
  });

  app.post('/api/settings/passwords', (req, res) => {
    const { rep_password, lecturer_password } = req.body;
    if (rep_password) {
      db.prepare("UPDATE settings SET value = ? WHERE key = 'rep_password'").run(rep_password);
    }
    if (lecturer_password) {
      db.prepare("UPDATE settings SET value = ? WHERE key = 'lecturer_password'").run(lecturer_password);
    }
    res.json({ success: true });
  });

  app.get('/api/attendance/my-otp', (req, res) => {
    const { lesson_id, student_id } = req.query;
    if (!lesson_id || !student_id) {
      return res.status(400).json({ error: 'lesson_id and student_id required' });
    }
    
    const lesson = db.prepare('SELECT start_time, otp_enabled FROM lessons WHERE id = ?').get(lesson_id) as LessonRow | undefined;
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    if (!lesson.otp_enabled) {
      return res.status(400).json({ error: 'OTP input has not been enabled' });
    }
    
    const startTime = new Date(lesson.start_time).getTime();
    const now = Date.now();
    const otp_duration_mins = parseInt((db.prepare("SELECT value FROM settings WHERE key = 'otp_duration_mins'").get() as any)?.value || '20');
    if ((now - startTime) > otp_duration_mins * 60 * 1000) {
      return res.status(400).json({ error: `OTP has expired (${otp_duration_mins} minutes elapsed)` });
    }
    
    const record = db.prepare('SELECT otp FROM attendance WHERE lesson_id = ? AND student_id = ?').get(lesson_id, student_id) as { otp: string } | undefined;
    if (!record) {
      return res.status(404).json({ error: 'Student registration not found for this lesson' });
    }
    
    res.json({ otp: record.otp });
  });

  app.get('/api/settings/profile', (req, res) => {
    const rep_name = (db.prepare("SELECT value FROM settings WHERE key = 'rep_name'").get() as { value: string })?.value || 'Class Rep';
    const rep_password = (db.prepare("SELECT value FROM settings WHERE key = 'rep_password'").get() as { value: string })?.value || 'admin123';
    const lecturer_password = (db.prepare("SELECT value FROM settings WHERE key = 'lecturer_password'").get() as { value: string })?.value || 'lecturer123';
    const rep_email = (db.prepare("SELECT value FROM settings WHERE key = 'rep_email'").get() as { value: string })?.value || 'shemomondi746@gmail.com';
    const rep_phone = (db.prepare("SELECT value FROM settings WHERE key = 'rep_phone'").get() as { value: string })?.value || '0712345678';
    const rep_avatar = (db.prepare("SELECT value FROM settings WHERE key = 'rep_avatar'").get() as { value: string })?.value || '';
    const otp_duration_mins = (db.prepare("SELECT value FROM settings WHERE key = 'otp_duration_mins'").get() as { value: string })?.value || '20';
    const late_threshold_mins = (db.prepare("SELECT value FROM settings WHERE key = 'late_threshold_mins'").get() as { value: string })?.value || '10';

    res.json({
      rep_name,
      rep_password,
      lecturer_password,
      rep_email,
      rep_phone,
      rep_avatar,
      otp_duration_mins,
      late_threshold_mins
    });
  });

  app.post('/api/settings/profile', (req, res) => {
    const { rep_name, rep_password, lecturer_password, rep_email, rep_phone, rep_avatar, otp_duration_mins, late_threshold_mins } = req.body;
    
    if (rep_name !== undefined) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('rep_name', ?)").run(rep_name);
    if (rep_password !== undefined) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('rep_password', ?)").run(rep_password);
    if (lecturer_password !== undefined) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('lecturer_password', ?)").run(lecturer_password);
    if (rep_email !== undefined) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('rep_email', ?)").run(rep_email);
    if (rep_phone !== undefined) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('rep_phone', ?)").run(rep_phone);
    if (rep_avatar !== undefined) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('rep_avatar', ?)").run(rep_avatar);
    if (otp_duration_mins !== undefined) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('otp_duration_mins', ?)").run(String(otp_duration_mins));
    if (late_threshold_mins !== undefined) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('late_threshold_mins', ?)").run(String(late_threshold_mins));

    res.json({ success: true });
  });

  app.get('/api/reports/unit/:id', (req, res) => {
    try {
      const unitId = req.params.id;
      const unit = db.prepare('SELECT * FROM units WHERE id = ?').get(unitId) as UnitRow | undefined;
      if (!unit) return res.status(404).json({ error: 'Unit not found' });

      // Get the most recent lesson for this unit
      const lesson = db.prepare(`
        SELECT * FROM lessons 
        WHERE unit_id = ? 
        ORDER BY id DESC LIMIT 1
      `).get(unitId) as LessonRow | undefined;

      if (!lesson) return res.json({ unit, attendance: [] });

      const attendance = db.prepare(`
        SELECT a.*, s.name as student_name, s.admission_number 
        FROM attendance a 
        JOIN students s ON a.student_id = s.id 
        WHERE a.lesson_id = ?
      `).all(lesson.id) as AttendanceRow[];

      res.json({ ...lesson, unit_name: unit.name, lecturer: unit.lecturer, attendance });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch report' });
    }
  });

  app.post('/api/lessons/start', (req, res) => {
    console.log('Starting lesson with config:', req.body);
    try {
      const { unit_id, venue, duration, scheduled_start, scheduled_end } = req.body;
      
      if (!unit_id) {
        return res.status(400).json({ error: 'Unit ID is required' });
      }

      const unitIdNum = parseInt(unit_id);
      const now = new Date();
      const start_time = now.toISOString();
      const durationNum = parseInt(duration) || 60;
      const end_time = new Date(now.getTime() + durationNum * 60000).toISOString();
      const lecturer_otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const lessonInfo = db.prepare(`
        INSERT INTO lessons (unit_id, date, venue, duration, start_time, end_time, scheduled_start, scheduled_end, lecturer_otp) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(unitIdNum, start_time, venue, durationNum, start_time, end_time, scheduled_start, scheduled_end, lecturer_otp);
      
      const lessonId = Number(lessonInfo.lastInsertRowid);
      console.log('Lesson created with ID:', lessonId);

      const students = db.prepare('SELECT id FROM students').all() as { id: number }[];
      console.log(`Adding ${students.length} students to attendance`);
      
      const insertAttendance = db.prepare('INSERT INTO attendance (lesson_id, student_id, otp) VALUES (?, ?, ?)');
      
      db.transaction(() => {
        for (const student of students) {
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          insertAttendance.run(lessonId, student.id, otp);
        }
      })();

      io.emit('attendance-updated', { lessonId });
      res.json({ lessonId, success: true });
    } catch (error: any) {
      console.error('Error starting lesson:', error);
      res.status(500).json({ error: error.message || 'Failed to start lesson' });
    }
  });

  app.post('/api/lecturer/mark', (req, res) => {
    const { lesson_id, otp } = req.body;
    const lesson = db.prepare('SELECT lecturer_otp FROM lessons WHERE id = ?').get(lesson_id) as { lecturer_otp: string } | undefined;
    
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    if (String(lesson.lecturer_otp) !== String(otp)) return res.status(400).json({ error: 'Invalid Lecturer OTP' });

    db.prepare('UPDATE lessons SET lecturer_present = 1 WHERE id = ?').run(lesson_id);
    io.emit('attendance-updated', { lessonId: lesson_id });
    res.json({ success: true });
  });

  app.post('/api/lessons/restart', (req, res) => {
    const activeLesson = db.prepare(`
      SELECT id, duration FROM lessons 
      WHERE datetime(start_time) > datetime('now', '-24 hours')
      ORDER BY id DESC LIMIT 1
    `).get() as { id: number, duration: number } | undefined;

    if (!activeLesson) return res.status(404).json({ error: 'No active lesson to restart' });

    const now = new Date();
    const start_time = now.toISOString();
    const end_time = new Date(now.getTime() + activeLesson.duration * 60000).toISOString();

    // Update lesson times
    db.prepare('UPDATE lessons SET start_time = ?, end_time = ?, otp_enabled = 0 WHERE id = ?')
      .run(start_time, end_time, activeLesson.id);

    // Reset attendance for this lesson
    const students = db.prepare('SELECT id FROM students').all() as { id: number }[];
    db.prepare('DELETE FROM attendance WHERE lesson_id = ?').run(activeLesson.id);
    
    const insertAttendance = db.prepare('INSERT INTO attendance (lesson_id, student_id, otp) VALUES (?, ?, ?)');
    for (const student of students) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      insertAttendance.run(activeLesson.id, student.id, otp);
    }

    io.emit('attendance-updated', { lessonId: activeLesson.id });
    res.json({ success: true });
  });

  app.post('/api/lessons/:id/enable-otp', (req, res) => {
    db.prepare('UPDATE lessons SET otp_enabled = 1 WHERE id = ?').run(req.params.id);
    io.emit('otp-enabled', { lessonId: req.params.id });
    res.json({ success: true });
  });

  app.get('/api/lessons/active', (req, res) => {
    try {
      console.log('Fetching active lesson...');
      const lesson = db.prepare(`
        SELECT l.*, u.name as unit_name, u.lecturer 
        FROM lessons l 
        JOIN units u ON l.unit_id = u.id 
        ORDER BY l.id DESC LIMIT 1
      `).get() as LessonRow | undefined;
      
      if (!lesson) {
        console.log('No lessons found in database.');
        return res.json(null);
      }

      // Check if lesson is still active (within its duration + 30 mins buffer)
      const startTime = new Date(lesson.start_time).getTime();
      const now = new Date().getTime();
      const durationMs = (lesson.duration || 60) * 60 * 1000;
      const bufferMs = 30 * 60 * 1000; // 30 mins buffer
      
      if (now > (startTime + durationMs + bufferMs)) {
        console.log('Latest lesson has ended and buffer expired. Returning null.');
        return res.json(null);
      }

      console.log('Active lesson found:', lesson.unit_name);

      // Auto-expire pending records if dynamic duration passed
      const otp_duration_mins = parseInt((db.prepare("SELECT value FROM settings WHERE key = 'otp_duration_mins'").get() as any)?.value || '20');
      const diffMins = (now - startTime) / (1000 * 60);
      if (diffMins > otp_duration_mins) {
        const result = db.prepare("UPDATE attendance SET status = 'absent' WHERE lesson_id = ? AND status = 'pending'").run(lesson.id);
        if (result.changes > 0) {
          console.log(`Auto-expired ${result.changes} pending attendance records.`);
        }
      }

      const attendance = db.prepare(`
        SELECT a.*, s.name as student_name, s.admission_number 
        FROM attendance a 
        JOIN students s ON a.student_id = s.id 
        WHERE a.lesson_id = ?
      `).all(lesson.id) as AttendanceRow[];

      res.json({ ...lesson, attendance, otp_duration_mins });
    } catch (error) {
      console.error('Error fetching active lesson:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/attendance/mark', (req, res) => {
    const { lesson_id, student_id, otp } = req.body;
    
    const lesson = db.prepare('SELECT start_time, otp_enabled FROM lessons WHERE id = ?').get(lesson_id) as LessonRow | undefined;
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    
    if (!lesson.otp_enabled) return res.status(400).json({ error: 'OTP input is not yet enabled by the representative' });

    const startTime = new Date(lesson.start_time).getTime();
    const now = new Date().getTime();
    const otp_duration_mins = parseInt((db.prepare("SELECT value FROM settings WHERE key = 'otp_duration_mins'").get() as any)?.value || '20');
    const diffMins = (now - startTime) / (1000 * 60);

    if (diffMins > otp_duration_mins) {
      db.prepare("UPDATE attendance SET status = 'absent' WHERE lesson_id = ? AND student_id = ? AND status = 'pending'").run(lesson_id, student_id);
      return res.status(400).json({ error: `OTP has expired (${otp_duration_mins} minutes elapsed)` });
    }

    const record = db.prepare('SELECT * FROM attendance WHERE lesson_id = ? AND student_id = ? AND otp = ?').get(lesson_id, student_id, String(otp)) as AttendanceRow | undefined;
    
    if (!record) return res.status(400).json({ error: 'Invalid OTP' });
    if (record.status === 'present' || record.status === 'late') {
      return res.status(400).json({ error: `Already marked ${record.status}` });
    }

    const late_threshold_mins = parseInt((db.prepare("SELECT value FROM settings WHERE key = 'late_threshold_mins'").get() as any)?.value || '10');
    const markStatus = diffMins > late_threshold_mins ? 'late' : 'present';

    db.prepare("UPDATE attendance SET status = ?, marked_at = ? WHERE id = ?")
      .run(markStatus, new Date().toISOString(), record.id);

    // Auto-logout: Remove session after marking attendance
    const { session_id } = req.body;
    if (session_id) {
      activeSessions.delete(session_id);
    }

    io.emit('attendance-updated', { lessonId: lesson_id, studentId: student_id, status: markStatus });
    res.json({ success: true, status: markStatus });
  });

  // --- BATCH IMPORT STUDENTS ENDPOINT ---
  app.post('/api/students/import', async (req, res) => {
    const { rawText, imageBase64, mimeType } = req.body;
    let studentsToInsert: { name: string, admission_number: string }[] = [];
    let methodUsed = 'manual';

    try {
      if (imageBase64 && getAiClient()) {
        const client = getAiClient();
        if (client) {
          methodUsed = 'ai';
          const prompt = `You are a specialized document scan bot. Analyze this student roster image and extract all student full names and their corresponding admission numbers. Return the list as a structured JSON array matching this exact JSON schema:
          
          {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "admission_number": { "type": "string" }
              },
              "required": ["name", "admission_number"]
            }
          }
          
          Ensure you capture every single student visible. Do not add any text or explanation, return only the JSON output.`;

          const aiResponse = await client.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: mimeType || 'image/jpeg'
                }
              },
              prompt
            ],
            config: {
              responseMimeType: 'application/json'
            }
          });

          const replyText = aiResponse.text;
          if (replyText) {
            studentsToInsert = JSON.parse(replyText);
          }
        }
      }
    } catch (aiErr) {
      console.error('AI student scan failed, falling back to manual parsing:', aiErr);
    }

    // Manual parser fallback (if AI failed or wasn't used/available)
    if (studentsToInsert.length === 0 && rawText) {
      methodUsed = 'manual';
      const lines = rawText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let name = '';
        let admission = '';

        // Try parsing delimiters: tab, comma, semicolon, or hyphen
        const delimiters = ['\t', ',', ';', ' - '];
        let splitResult: string[] = [];
        for (const delim of delimiters) {
          const parts = trimmed.split(delim);
          if (parts.length >= 2) {
            splitResult = parts;
            break;
          }
        }

        if (splitResult.length >= 2) {
          // Check which part matches standard admission patterns (contains numbers, slashes, or hyphens)
          const part0 = splitResult[0].trim();
          const part1 = splitResult[1].trim();

          const isPart0Admission = /[\/\d-]/.test(part0) && part0.length < part1.length;
          if (isPart0Admission) {
            admission = part0;
            name = part1;
          } else {
            name = part0;
            admission = part1;
          }
        } else {
          // Simple heuristic: look for trailing/leading word that contains numbers or slashes
          const words = trimmed.split(/\s+/);
          if (words.length >= 2) {
            const lastWord = words[words.length - 1];
            const firstWord = words[0];
            if (/[\/\d]/.test(lastWord)) {
              admission = lastWord;
              name = words.slice(0, words.length - 1).join(' ');
            } else if (/[\/\d]/.test(firstWord)) {
              admission = firstWord;
              name = words.slice(1).join(' ');
            } else {
              admission = 'ADM-' + Math.floor(1000 + Math.random() * 9000);
              name = trimmed;
            }
          } else {
            admission = 'ADM-' + Math.floor(1000 + Math.random() * 9000);
            name = trimmed;
          }
        }

        if (name && admission) {
          studentsToInsert.push({
            name: name.replace(/^[\s\d.\-_]+/, '').trim(), // Strip leading line numbers like "1." or "2 -"
            admission_number: admission.trim()
          });
        }
      }
    }

    if (studentsToInsert.length === 0) {
      return res.status(400).json({ error: 'No valid student entries found in roster' });
    }

    // Insert students into SQLite in a transaction
    let importedCount = 0;
    let duplicateCount = 0;

    try {
      const insertStmt = db.prepare('INSERT INTO students (name, admission_number) VALUES (?, ?)');
      const checkStmt = db.prepare('SELECT id FROM students WHERE admission_number = ?');

      db.transaction(() => {
        for (const s of studentsToInsert) {
          const exists = checkStmt.get(s.admission_number);
          if (exists) {
            duplicateCount++;
          } else {
            insertStmt.run(s.name, s.admission_number);
            importedCount++;
          }
        }
      })();

      res.json({
        success: true,
        source: methodUsed,
        imported: importedCount,
        skipped: duplicateCount,
        totalParsed: studentsToInsert.length
      });
    } catch (dbErr: any) {
      console.error('Database importing failure:', dbErr);
      res.status(500).json({ error: 'Database import failed' });
    }
  });

  // --- AUTOMATIC WARNING SYSTEM ENDPOINTS ---
  app.get('/api/warnings', (req, res) => {
    try {
      const students = db.prepare('SELECT * FROM students').all() as any[];
      const now = new Date();

      for (const student of students) {
        // Fetch last 5 attendance details for this student
        const history = db.prepare(`
          SELECT a.status, l.end_time 
          FROM attendance a 
          JOIN lessons l ON a.lesson_id = l.id 
          WHERE a.student_id = ? 
          ORDER BY l.start_time DESC
        `).all(student.id) as any[];

        let totalAbsences = 0;
        let consecutiveAbsences = 0;
        let countingConsecutive = true;

        for (const record of history) {
          const ended = new Date(record.end_time) < now;
          const isAbsent = record.status === 'absent' || (record.status === 'pending' && ended);

          if (isAbsent) {
            totalAbsences++;
            if (countingConsecutive) {
              consecutiveAbsences++;
            }
          } else {
            if (record.status === 'present' || record.status === 'late') {
              countingConsecutive = false;
            }
          }
        }

        // If consecutive absences >= 3, record/upsert the warning
        if (consecutiveAbsences >= 3) {
          try {
            db.prepare(`
              INSERT INTO student_warnings (student_id, absent_count, reason, status, created_at)
              VALUES (?, ?, ?, 'pending_rep', ?)
              ON CONFLICT(student_id) DO UPDATE SET 
                absent_count = excluded.absent_count,
                reason = excluded.reason
              WHERE status = 'pending_rep'
            `).run(
              student.id,
              consecutiveAbsences,
              `Missed ${consecutiveAbsences} consecutive lessons.`,
              new Date().toISOString()
            );
          } catch (e) {
            // Ignore if already locked/forwarded
          }
        } else if (totalAbsences > 3) {
          try {
            db.prepare(`
              INSERT INTO student_warnings (student_id, absent_count, reason, status, created_at)
              VALUES (?, ?, ?, 'pending_rep', ?)
              ON CONFLICT(student_id) DO UPDATE SET 
                absent_count = excluded.absent_count,
                reason = excluded.reason
              WHERE status = 'pending_rep'
            `).run(
              student.id,
              totalAbsences,
              `Missed total of ${totalAbsences} lessons.`,
              new Date().toISOString()
            );
          } catch (e) {
            // Ignore
          }
        }
      }

      // Query and return warning list containing joined student names/details
      const warningsList = db.prepare(`
        SELECT w.*, s.name as student_name, s.admission_number 
        FROM student_warnings w 
        JOIN students s ON w.student_id = s.id 
        ORDER BY w.id DESC
      `).all() as any[];

      res.json(warningsList);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to sync warnings records' });
    }
  });

  app.post('/api/warnings/forward', (req, res) => {
    const { warning_id } = req.body;
    try {
      db.prepare("UPDATE student_warnings SET status = 'forwarded' WHERE id = ?").run(warning_id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/warnings/clear', (req, res) => {
    const { warning_id } = req.body;
    try {
      db.prepare("DELETE FROM student_warnings WHERE id = ?").run(warning_id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- WEEKLY ACCUMULATED REPORT ENDPOINT ---
  app.get('/api/reports/weekly', (req, res) => {
    try {
      let { start_date, end_date } = req.query;
      
      // Default to current week (Monday to Friday) if not specified
      if (!start_date || !end_date) {
        const today = new Date();
        const first = today.getDate() - today.getDay() + 1; // Monday
        const last = first + 4; // Friday

        start_date = new Date(today.setDate(first)).toISOString().split('T')[0] + ' 00:00:00';
        end_date = new Date(today.setDate(last)).toISOString().split('T')[0] + ' 23:59:59';
      }

      console.log(`Generating weekly report from ${start_date} to ${end_date}`);

      const lessons = db.prepare(`
        SELECT l.id, l.date, l.venue, u.name as unit_name, u.lecturer 
        FROM lessons l
        JOIN units u ON l.unit_id = u.id
        WHERE datetime(l.start_time) BETWEEN datetime(?) AND datetime(?)
        ORDER BY l.start_time ASC
      `).all(start_date, end_date) as any[];

      const students = db.prepare('SELECT id, name, admission_number FROM students ORDER BY name ASC').all() as any[];

      const attendance = db.prepare(`
        SELECT a.lesson_id, a.student_id, a.status 
        FROM attendance a
        JOIN lessons l ON a.lesson_id = l.id
        WHERE datetime(l.start_time) BETWEEN datetime(?) AND datetime(?)
      `).all(start_date, end_date) as any[];

      res.json({ lessons, students, attendance });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to generate weekly report data' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist/index.html')));
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
