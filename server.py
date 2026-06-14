import sqlite3
import json
import os
import random
import string
from datetime import datetime, timedelta
import time
from flask import Flask, request, jsonify, send_from_directory, session

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

DB_PATH = 'attendance.db'
MAX_SESSIONS = 10
SESSION_TIMEOUT = 300 # 5 minutes
active_sessions = {} # {session_id: last_seen}

def cleanup_sessions():
    now = time.time()
    expired = [sid for sid, last_seen in active_sessions.items() if now - last_seen > SESSION_TIMEOUT]
    for sid in expired:
        del active_sessions[sid]

@app.route('/api/session/enter', methods=['POST'])
def enter_session():
    cleanup_sessions()
    data = request.json
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({'error': 'Session ID required'}), 400
        
    if session_id in active_sessions:
        active_sessions[session_id] = time.time()
        return jsonify({'success': True, 'position': 0})
        
    if len(active_sessions) >= MAX_SESSIONS:
        return jsonify({'error': 'Server busy. Please wait for a slot.', 'busy': True}), 429
        
    active_sessions[session_id] = time.time()
    return jsonify({'success': True})

@app.route('/api/session/heartbeat', methods=['POST'])
def session_heartbeat():
    data = request.json
    session_id = data.get('session_id')
    if session_id in active_sessions:
        active_sessions[session_id] = time.time()
        return jsonify({'success': True})
    return jsonify({'error': 'Session expired'}), 401

@app.route('/api/session/exit', methods=['POST'])
def exit_session():
    data = request.json
    session_id = data.get('session_id')
    if session_id in active_sessions:
        del active_sessions[session_id]
    return jsonify({'success': True})

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Create tables if they don't exist
    cursor.execute('''CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        admission_number TEXT UNIQUE NOT NULL
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        lecturer TEXT NOT NULL
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit_id INTEGER NOT NULL,
        venue TEXT NOT NULL,
        duration INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        scheduled_start TEXT,
        scheduled_end TEXT,
        lecturer_otp TEXT,
        lecturer_present INTEGER DEFAULT 0,
        otp_enabled INTEGER DEFAULT 0,
        FOREIGN KEY (unit_id) REFERENCES units (id)
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        otp TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        marked_at TEXT,
        FOREIGN KEY (lesson_id) REFERENCES lessons (id),
        FOREIGN KEY (student_id) REFERENCES students (id)
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )''')
    
     # Initial settings
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('license_expiry', ?)", 
                  [(datetime.now() + timedelta(days=365)).isoformat()])
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('rep_name', 'Class Rep')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('rep_password', 'admin123')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('lecturer_password', 'lecturer123')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('rep_email', 'shemomondi746@gmail.com')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('rep_phone', '0712345678')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('rep_avatar', '')")
    
    # Migrations (Add missing columns)
    try:
        cursor.execute("ALTER TABLE lessons ADD COLUMN end_time TEXT")
    except: pass
    try:
        cursor.execute("ALTER TABLE lessons ADD COLUMN scheduled_start TEXT")
    except: pass
    try:
        cursor.execute("ALTER TABLE lessons ADD COLUMN scheduled_end TEXT")
    except: pass
    try:
        cursor.execute("ALTER TABLE lessons ADD COLUMN lecturer_otp TEXT")
    except: pass
    try:
        cursor.execute("ALTER TABLE lessons ADD COLUMN lecturer_present INTEGER DEFAULT 0")
    except: pass
    try:
        cursor.execute("ALTER TABLE lessons ADD COLUMN otp_enabled INTEGER DEFAULT 0")
    except: pass

    conn.commit()
    conn.close()

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

@app.route('/api/students', methods=['GET', 'POST'])
def students():
    conn = get_db()
    if request.method == 'GET':
        students = conn.execute('SELECT * FROM students ORDER BY name ASC').fetchall()
        return jsonify([dict(row) for row in students])
    else:
        data = request.json
        try:
            cursor = conn.execute('INSERT INTO students (name, admission_number) VALUES (?, ?)', 
                                (data['name'], data['admission_number']))
            conn.commit()
            return jsonify({'id': cursor.lastrowid})
        except:
            return jsonify({'error': 'Admission number already exists'}), 400
        finally:
            conn.close()

@app.route('/api/students/<int:id>', methods=['PUT', 'DELETE'])
def student_detail(id):
    conn = get_db()
    if request.method == 'PUT':
        data = request.json
        try:
            conn.execute('UPDATE students SET name = ?, admission_number = ? WHERE id = ?',
                        (data['name'], data['admission_number'], id))
            conn.commit()
            return jsonify({'success': True})
        except:
            return jsonify({'error': 'Admission number already exists'}), 400
    else:
        conn.execute('DELETE FROM attendance WHERE student_id = ?', (id,))
        conn.execute('DELETE FROM students WHERE id = ?', (id,))
        conn.commit()
        return jsonify({'success': True})
    conn.close()

@app.route('/api/units', methods=['GET', 'POST'])
def units():
    conn = get_db()
    if request.method == 'GET':
        units = conn.execute('SELECT * FROM units ORDER BY name ASC').fetchall()
        return jsonify([dict(row) for row in units])
    else:
        data = request.json
        cursor = conn.execute('INSERT INTO units (name, lecturer) VALUES (?, ?)', 
                            (data['name'], data['lecturer']))
        conn.commit()
        return jsonify({'id': cursor.lastrowid})
    conn.close()

@app.route('/api/units/<int:id>', methods=['PUT', 'DELETE'])
def unit_detail(id):
    conn = get_db()
    if request.method == 'PUT':
        data = request.json
        conn.execute('UPDATE units SET name = ?, lecturer = ? WHERE id = ?',
                    (data['name'], data['lecturer'], id))
        conn.commit()
        return jsonify({'success': True})
    else:
        lessons = conn.execute('SELECT id FROM lessons WHERE unit_id = ?', (id,)).fetchall()
        for lesson in lessons:
            conn.execute('DELETE FROM attendance WHERE lesson_id = ?', (lesson['id'],))
        conn.execute('DELETE FROM lessons WHERE unit_id = ?', (id,))
        conn.execute('DELETE FROM units WHERE id = ?', (id,))
        conn.commit()
        return jsonify({'success': True})
    conn.close()

@app.route('/api/lessons/active', methods=['GET'])
def active_lesson():
    conn = get_db()
    # Get the latest lesson
    lesson = conn.execute('''
        SELECT l.*, u.name as unit_name, u.lecturer 
        FROM lessons l 
        JOIN units u ON l.unit_id = u.id 
        ORDER BY l.id DESC LIMIT 1
    ''').fetchone()
    
    if not lesson:
        conn.close()
        return jsonify(None)
    
    # Check if lesson is still active (within its duration + 30 mins buffer)
    start_time = datetime.fromisoformat(lesson['start_time'])
    now = datetime.now()
    duration = int(lesson['duration'] or 60)
    expiry_time = start_time + timedelta(minutes=duration + 30)
    
    if now > expiry_time:
        conn.close()
        return jsonify(None)
    
    # Auto-expire pending records if 20 mins passed
    if (now - start_time).total_seconds() > 20 * 60:
        conn.execute("UPDATE attendance SET status = 'absent' WHERE lesson_id = ? AND status = 'pending'", (lesson['id'],))
        conn.commit()

    lesson_dict = dict(lesson)
    attendance = conn.execute('''
        SELECT a.*, s.name as student_name, s.admission_number 
        FROM attendance a 
        JOIN students s ON a.student_id = s.id 
        WHERE a.lesson_id = ?
    ''', (lesson['id'],)).fetchall()
    
    lesson_dict['attendance'] = [dict(row) for row in attendance]
    conn.close()
    return jsonify(lesson_dict)

@app.route('/api/lessons/start', methods=['POST'])
def start_lesson():
    data = request.json
    conn = get_db()
    now = datetime.now()
    duration = int(data.get('duration', 60))
    end_time = now + timedelta(minutes=duration)
    
    cursor = conn.execute('''
        INSERT INTO lessons (unit_id, venue, duration, start_time, end_time, scheduled_start, scheduled_end, lecturer_otp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (data['unit_id'], data['venue'], duration, now.isoformat(), end_time.isoformat(), 
          data['scheduled_start'], data['scheduled_end'], generate_otp()))
    
    lesson_id = cursor.lastrowid
    
    students = conn.execute('SELECT id FROM students').fetchall()
    for s in students:
        conn.execute('INSERT INTO attendance (lesson_id, student_id, otp) VALUES (?, ?, ?)',
                    (lesson_id, s['id'], generate_otp()))
    
    conn.commit()
    conn.close()
    socketio.emit('attendance-updated', {'lessonId': lesson_id})
    return jsonify({'id': lesson_id})

@app.route('/api/lessons/restart', methods=['POST'])
def restart_lesson():
    conn = get_db()
    lesson = conn.execute('SELECT id, duration FROM lessons ORDER BY id DESC LIMIT 1').fetchone()
    if lesson:
        now = datetime.now()
        duration = int(lesson['duration'] or 60)
        end_time = now + timedelta(minutes=duration)
        
        conn.execute("UPDATE attendance SET status = 'pending', marked_at = NULL WHERE lesson_id = ?", (lesson['id'],))
        conn.execute("UPDATE lessons SET lecturer_present = 0, otp_enabled = 0, start_time = ?, end_time = ? WHERE id = ?", 
                    (now.isoformat(), end_time.isoformat(), lesson['id']))
        conn.commit()
        socketio.emit('attendance-updated', {'lessonId': lesson['id']})
    conn.close()
    return jsonify({'success': True})

@app.route('/api/lessons/<int:id>/enable-otp', methods=['POST'])
def enable_otp(id):
    conn = get_db()
    conn.execute("UPDATE lessons SET otp_enabled = 1 WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    socketio.emit('attendance-updated', {'lessonId': id})
    return jsonify({'success': True})

@app.route('/api/attendance/mark', methods=['POST'])
def mark_attendance():
    data = request.json
    conn = get_db()
    
    # Check if lesson exists
    lesson = conn.execute('SELECT * FROM lessons WHERE id = ?', (data['lesson_id'],)).fetchone()
    if not lesson:
        conn.close()
        return jsonify({'error': 'Lesson not found'}), 404
    
    # Check for 20-minute OTP expiry (for both students and lecturers)
    start_time = datetime.fromisoformat(lesson['start_time'])
    now = datetime.now()
    if (now - start_time).total_seconds() > 20 * 60:
        conn.close()
        return jsonify({'error': 'OTP has expired (20 minutes elapsed)'}), 400
        
    if data.get('is_lecturer'):
        if str(data['otp']) == str(lesson['lecturer_otp']):
            conn.execute('UPDATE lessons SET lecturer_present = 1 WHERE id = ?', (data['lesson_id'],))
            conn.commit()
            conn.close()
            socketio.emit('attendance-updated', {'lessonId': data['lesson_id']})
            return jsonify({'success': True})
        conn.close()
        return jsonify({'error': 'Invalid Lecturer OTP'}), 400

    # Student OTP check for enabled status
    if not lesson['otp_enabled']:
        conn.close()
        return jsonify({'error': 'OTP input is not yet enabled by the representative'}), 400

    # Student OTP
    record = conn.execute('SELECT * FROM attendance WHERE lesson_id = ? AND student_id = ? AND otp = ?',
                         (data['lesson_id'], data['student_id'], str(data['otp']))).fetchone()
    
    if not record:
        conn.close()
        return jsonify({'error': 'Invalid OTP'}), 400
    if record['status'] == 'present':
        conn.close()
        return jsonify({'error': 'Already marked present'}), 400
        
    conn.execute("UPDATE attendance SET status = 'present', marked_at = ? WHERE id = ?",
                (datetime.now().isoformat(), record['id']))
    conn.commit()
    conn.close()
    
    # Auto-logout: Remove session after marking attendance
    session_id = data.get('session_id')
    if session_id in active_sessions:
        del active_sessions[session_id]
        
    socketio.emit('attendance-updated', {'lessonId': data['lesson_id']})
    return jsonify({'success': True})

@app.route('/api/lecturer/mark', methods=['POST'])
def mark_lecturer():
    data = request.json
    lesson_id = data.get('lesson_id')
    otp = data.get('otp')
    
    conn = get_db()
    lesson = conn.execute('SELECT lecturer_otp FROM lessons WHERE id = ?', (lesson_id,)).fetchone()
    
    if not lesson:
        conn.close()
        return jsonify({'error': 'Lesson not found'}), 404
    
    if str(lesson['lecturer_otp']) != str(otp):
        conn.close()
        return jsonify({'error': 'Invalid Lecturer OTP'}), 400

    conn.execute('UPDATE lessons SET lecturer_present = 1 WHERE id = ?', (lesson_id,))
    conn.commit()
    conn.close()
    
    socketio.emit('attendance-updated', {'lessonId': lesson_id})
    return jsonify({'success': True})

@app.route('/api/license/status')
def license_status():
    conn = get_db()
    license = conn.execute("SELECT value FROM settings WHERE key = 'license_expiry'").fetchone()
    expiry = datetime.fromisoformat(license['value'])
    now = datetime.now()
    days_left = (expiry - now).days
    return jsonify({
        'isValid': now < expiry,
        'daysLeft': max(0, days_left),
        'expiry': license['value']
    })

@app.route('/api/settings/rep-name', methods=['GET', 'POST'])
def rep_name():
    conn = get_db()
    if request.method == 'GET':
        setting = conn.execute("SELECT value FROM settings WHERE key = 'rep_name'").fetchone()
        return jsonify({'name': setting['value'] if setting else ''})
    else:
        data = request.json
        conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('rep_name', ?)", (data['name'],))
        conn.commit()
        return jsonify({'success': True})

@app.route('/api/auth/verify', methods=['POST'])
def verify_auth():
    data = request.json
    role = data.get('role') # 'rep' or 'lecturer'
    password = data.get('password')
    
    conn = get_db()
    key = 'rep_password' if role == 'rep' else 'lecturer_password'
    setting = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    conn.close()
    
    if setting and setting['value'] == password:
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Invalid password'}), 401

@app.route('/api/settings/passwords', methods=['POST'])
def update_passwords():
    data = request.json
    conn = get_db()
    if 'rep_password' in data:
        conn.execute("UPDATE settings SET value = ? WHERE key = 'rep_password'", (data['rep_password'],))
    if 'lecturer_password' in data:
        conn.execute("UPDATE settings SET value = ? WHERE key = 'lecturer_password'", (data['lecturer_password'],))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/attendance/my-otp')
def get_my_otp():
    lesson_id = request.args.get('lesson_id')
    student_id = request.args.get('student_id')
    
    if not lesson_id or not student_id:
        return jsonify({'error': 'lesson_id and student_id required'}), 400
        
    conn = get_db()
    
    lesson = conn.execute('SELECT start_time, otp_enabled FROM lessons WHERE id = ?', (lesson_id,)).fetchone()
    if not lesson:
        conn.close()
        return jsonify({'error': 'Lesson not found'}), 404
        
    if not lesson['otp_enabled']:
        conn.close()
        return jsonify({'error': 'OTP input has not been enabled'}), 400
        
    # Check 20 minute expiry
    start_time = datetime.fromisoformat(lesson['start_time'])
    now = datetime.now()
    if (now - start_time).total_seconds() > 20 * 60:
        conn.close()
        return jsonify({'error': 'OTP has expired (20 minutes elapsed)'}), 400
        
    record = conn.execute('SELECT otp FROM attendance WHERE lesson_id = ? AND student_id = ?', 
                          (lesson_id, student_id)).fetchone()
    conn.close()
    
    if not record:
        return jsonify({'error': 'Student registration not found for this lesson'}), 404
        
    return jsonify({'otp': record['otp']})

@app.route('/api/settings/profile', methods=['GET', 'POST'])
def api_profile_settings():
    conn = get_db()
    if request.method == 'GET':
        rep_name_row = conn.execute("SELECT value FROM settings WHERE key = 'rep_name'").fetchone()
        rep_password_row = conn.execute("SELECT value FROM settings WHERE key = 'rep_password'").fetchone()
        lecturer_password_row = conn.execute("SELECT value FROM settings WHERE key = 'lecturer_password'").fetchone()
        rep_email_row = conn.execute("SELECT value FROM settings WHERE key = 'rep_email'").fetchone()
        rep_phone_row = conn.execute("SELECT value FROM settings WHERE key = 'rep_phone'").fetchone()
        rep_avatar_row = conn.execute("SELECT value FROM settings WHERE key = 'rep_avatar'").fetchone()
        
        conn.close()
        return jsonify({
            'rep_name': rep_name_row['value'] if rep_name_row else 'Class Rep',
            'rep_password': rep_password_row['value'] if rep_password_row else 'admin123',
            'lecturer_password': lecturer_password_row['value'] if lecturer_password_row else 'lecturer123',
            'rep_email': rep_email_row['value'] if rep_email_row else 'shemomondi746@gmail.com',
            'rep_phone': rep_phone_row['value'] if rep_phone_row else '0712345678',
            'rep_avatar': rep_avatar_row['value'] if rep_avatar_row else ''
        })
    else:
        data = request.json
        if 'rep_name' in data:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('rep_name', ?)", (data['rep_name'],))
        if 'rep_password' in data:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('rep_password', ?)", (data['rep_password'],))
        if 'lecturer_password' in data:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('lecturer_password', ?)", (data['lecturer_password'],))
        if 'rep_email' in data:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('rep_email', ?)", (data['rep_email'],))
        if 'rep_phone' in data:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('rep_phone', ?)", (data['rep_phone'],))
        if 'rep_avatar' in data:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('rep_avatar', ?)", (data['rep_avatar'],))
            
        conn.commit()
        conn.close()
        return jsonify({'success': True})

@app.route('/api/reports/unit/<int:unit_id>')
def get_unit_report(unit_id):
    conn = get_db()
    unit = conn.execute("SELECT * FROM units WHERE id = ?", (unit_id,)).fetchone()
    if not unit:
        conn.close()
        return jsonify({'error': 'Unit not found'}), 404
    
    # Get the most recent lesson for this unit
    lesson = conn.execute("""
        SELECT * FROM lessons 
        WHERE unit_id = ? 
        ORDER BY id DESC LIMIT 1
    """, (unit_id,)).fetchone()
    
    if not lesson:
        conn.close()
        return jsonify({
            'unit_name': unit['name'],
            'lecturer': unit['lecturer'],
            'attendance': []
        })
    
    attendance = conn.execute("""
        SELECT a.*, s.name as student_name, s.admission_number 
        FROM attendance a 
        JOIN students s ON a.student_id = s.id 
        WHERE a.lesson_id = ?
    """, (lesson['id'],)).fetchall()
    
    result = dict(lesson)
    result['unit_name'] = unit['name']
    result['lecturer'] = unit['lecturer']
    result['attendance'] = [dict(a) for a in attendance]
    
    conn.close()
    return jsonify(result)

# Serve static files (Frontend)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists("dist/" + path):
        return send_from_directory('dist', path)
    else:
        return send_from_directory('dist', 'index.html')

if __name__ == '__main__':
    init_db()
    print("Python Server running on http://0.0.0.0:3000")
    socketio.run(app, host='0.0.0.0', port=3000, debug=False)
