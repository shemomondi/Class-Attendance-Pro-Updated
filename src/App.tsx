import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Clock, 
  MapPin, 
  Play, 
  CheckCircle, 
  XCircle, 
  UserPlus, 
  Plus,
  ShieldCheck,
  UserCircle,
  KeyRound,
  RefreshCw,
  Download,
  QrCode,
  Wifi,
  Info,
  ExternalLink,
  Edit,
  Trash2,
  RotateCcw,
  Lock,
  FileText,
  DoorOpen,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Send,
  Terminal,
  Database,
  AlertTriangle,
  Building,
  CreditCard,
  Bell,
  Megaphone,
  Upload,
  Calendar,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';

// --- Safe Storage Wrappers for Sandboxed iFrame Environments ---
const memoryStore: Record<string, string> = {};
const sessionMemoryStore: Record<string, string> = {};

const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return memoryStore[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      memoryStore[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      delete memoryStore[key];
    }
  }
};

const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return window.sessionStorage.getItem(key);
    } catch (e) {
      return sessionMemoryStore[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (e) {
      sessionMemoryStore[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      window.sessionStorage.removeItem(key);
    } catch (e) {
      delete sessionMemoryStore[key];
    }
  }
};

const localStorage = safeLocalStorage;
const sessionStorage = safeSessionStorage;

// --- Hybrid Client-Side Database & API Emulator for Vercel/Offline Resilience ---
const getLocalCollection = (name: string, defaultVal: any) => {
  const cached = localStorage.getItem('emulated_db_' + name);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }
  localStorage.setItem('emulated_db_' + name, JSON.stringify(defaultVal));
  return defaultVal;
};

const setLocalCollection = (name: string, val: any) => {
  localStorage.setItem('emulated_db_' + name, JSON.stringify(val));
};

const initEmulatedDb = () => {
  getLocalCollection('schools', [
    { id: 1, name: "Kenyatta University (KU)", status: "active", paid_status: "paid", billing_amount: 1500, last_billing_date: "2026-06-01" }
  ]);
  getLocalCollection('settings', {
    developer_password: "shem123",
    rep_password: "admin123",
    lecturer_password: "lecturer123",
    representative_name: "Class Representative",
    otp_duration_mins: "20",
    late_threshold_mins: "5",
    rep_email: "shemomondi746@gmail.com",
    rep_phone: "0712345678",
    rep_avatar: ""
  });
  getLocalCollection('departments', [
    { id: 1, school_id: 1, name: "Computing and Information Technology" }
  ]);
  getLocalCollection('courses', [
    { id: 1, department_id: 1, name: "BSc. Computer Science" }
  ]);
  getLocalCollection('intakes', [
    { id: 1, name: "May 2026" }
  ]);
  getLocalCollection('units', [
    { id: 1, name: "FIT 201 - Software Engineering", lecturer: "Dr. Kamau", school_id: 1, department_id: 1, intake: "May 2026" }
  ]);
  getLocalCollection('students', [
    { id: 1, name: "John Doe", admission_number: "CIT/001/2026", school_id: 1, course_id: 1, intake: "May 2026" },
    { id: 2, name: "Jane Smith", admission_number: "CIT/002/2026", school_id: 1, course_id: 1, intake: "May 2026" },
    { id: 3, name: "Arthur Pendragon", admission_number: "CIT/003/2026", school_id: 1, course_id: 1, intake: "May 2026" },
    { id: 4, name: "Grace Hopper", admission_number: "CIT/004/2026", school_id: 1, course_id: 1, intake: "May 2026" },
    { id: 5, name: "Albert Einstein", admission_number: "CIT/005/2026", school_id: 1, course_id: 1, intake: "May 2026" },
    { id: 6, name: "Marie Curie", admission_number: "CIT/006/2026", school_id: 1, course_id: 1, intake: "May 2026" }
  ]);
  getLocalCollection('superadmins', [
    { school_id: 1, username: "ku_admin", password: "super123" }
  ]);
  getLocalCollection('lessons', []);
  getLocalCollection('attendance', []);
  getLocalCollection('announcements', []);
  getLocalCollection('payment_submissions', []);
  getLocalCollection('student_warnings', []);
};

const nativeFetch = window.fetch;
let emulatorEnabled = false;

if (
  window.location.hostname.includes('vercel.app') || 
  window.location.hostname.includes('vercel.dev') ||
  localStorage.getItem('emulator_force_enabled') === 'true'
) {
  emulatorEnabled = true;
  console.log('[System] Vercel or Offline state detected. Activating Client-Side Local Database Emulator.');
  initEmulatedDb();
}

// Quietly check if dynamic service is active. Swap to emulator if it fails.
const probeBackend = async () => {
  if (emulatorEnabled) return;
  try {
    const res = await nativeFetch('/api/license/status').catch(() => null);
    if (!res || !res.ok) {
      emulatorEnabled = true;
      console.log('[System] Backend probe offline. Activating emulated local storage runtime for this session.');
      initEmulatedDb();
    }
  } catch (err) {
    emulatorEnabled = true;
    console.log('[System] Failover activated due to connection rejection.');
    initEmulatedDb();
  }
};
probeBackend();

const makeEmulatorResponse = (body: any, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

const handleEmulatedRequest = async (url: string, options?: RequestInit): Promise<Response> => {
  initEmulatedDb();
  
  const parsedUrl = new URL(url, window.location.origin);
  const path = parsedUrl.pathname;
  const method = (options?.method || 'GET').toUpperCase();
  
  let body: any = {};
  if (options?.body) {
    try {
      if (typeof options.body === 'string') {
        body = JSON.parse(options.body);
      }
    } catch(e) {}
  }
  
  const getCol = (name: string) => JSON.parse(localStorage.getItem('emulated_db_' + name) || '[]');
  const saveCol = (name: string, data: any) => localStorage.setItem('emulated_db_' + name, JSON.stringify(data));
  const getSettings = () => JSON.parse(localStorage.getItem('emulated_db_settings') || '{}');
  const saveSettings = (data: any) => localStorage.setItem('emulated_db_settings', JSON.stringify(data));

  // Endpoints Implementation
  if (path === '/api/developer/login' && method === 'POST') {
    const settings = getSettings();
    if (settings.developer_password === body.password) {
      return makeEmulatorResponse({ success: true, success_login: true });
    } else {
      return makeEmulatorResponse({ error: 'Invalid developer credentials' }, 401);
    }
  }
  
  if (path === '/api/auth/developer' && method === 'POST') {
    const settings = getSettings();
    if (settings.developer_password === body.password) {
      return makeEmulatorResponse({ success: true });
    } else {
      return makeEmulatorResponse({ error: 'Invalid developer credentials' }, 401);
    }
  }
  
  if (path === '/api/developer/settings/password' && method === 'POST') {
    const settings = getSettings();
    settings.developer_password = body.password;
    saveSettings(settings);
    return makeEmulatorResponse({ success: true });
  }

  if (path === '/api/developer/schools' && method === 'GET') {
    return makeEmulatorResponse(getCol('schools'));
  }
  
  if (path === '/api/developer/schools' && method === 'POST') {
    const schools = getCol('schools');
    const newId = schools.length > 0 ? Math.max(...schools.map((s: any) => s.id)) + 1 : 1;
    const newSchool = {
      id: newId,
      name: body.name,
      status: 'active',
      paid_status: 'paid',
      billing_amount: body.billing_amount || 1500,
      last_billing_date: new Date().toISOString().split('T')[0]
    };
    schools.push(newSchool);
    saveCol('schools', schools);
    
    const superadmins = getCol('superadmins');
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    superadmins.push({
      school_id: newId,
      username: `${slug}_admin`,
      password: 'super123'
    });
    saveCol('superadmins', superadmins);
    return makeEmulatorResponse({ success: true });
  }
  
  if (path === '/api/developer/schools/status' && method === 'POST') {
    const schools = getCol('schools');
    const school = schools.find((s: any) => s.id === Number(body.id));
    if (school) school.status = body.status;
    saveCol('schools', schools);
    return makeEmulatorResponse({ success: true });
  }
  
  if (path === '/api/developer/schools/billing' && method === 'POST') {
    const schools = getCol('schools');
    const school = schools.find((s: any) => s.id === Number(body.id));
    if (school) school.billing_amount = Number(body.amount);
    saveCol('schools', schools);
    return makeEmulatorResponse({ success: true });
  }
  
  if (path === '/api/developer/schools/bill' && method === 'POST') {
    const schools = getCol('schools');
    const school = schools.find((s: any) => s.id === Number(body.id));
    if (school) {
      school.last_billing_date = body.date || new Date().toISOString().split('T')[0];
      school.paid_status = 'unpaid';
    }
    saveCol('schools', schools);
    return makeEmulatorResponse({ success: true });
  }
  
  if (path.startsWith('/api/developer/schools/') && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    let schools = getCol('schools');
    schools = schools.filter((s: any) => s.id !== id);
    saveCol('schools', schools);
    return makeEmulatorResponse({ success: true });
  }
  
  if (path === '/api/developer/schools/superadmin' && method === 'POST') {
    const superadmins = getCol('superadmins');
    const existingIdx = superadmins.findIndex((sa: any) => sa.school_id === Number(body.school_id));
    const record = { school_id: Number(body.school_id), username: body.username, password: body.password };
    if (existingIdx >= 0) {
      superadmins[existingIdx] = record;
    } else {
      superadmins.push(record);
    }
    saveCol('superadmins', superadmins);
    return makeEmulatorResponse({ success: true });
  }

  if (path === '/api/developer/payment-submissions' && method === 'GET') {
    return makeEmulatorResponse(getCol('payment_submissions'));
  }
  
  if (path === '/api/developer/payment-submissions/approve' && method === 'POST') {
    const submissions = getCol('payment_submissions');
    const sub = submissions.find((s: any) => s.id === Number(body.id));
    if (sub) sub.status = 'approved';
    saveCol('payment_submissions', submissions);
    
    const schools = getCol('schools');
    const school = schools.find((s: any) => s.id === Number(body.school_id));
    if (school) {
      school.status = 'active';
      school.paid_status = 'paid';
      school.last_billing_date = new Date().toISOString().split('T')[0];
    }
    saveCol('schools', schools);
    return makeEmulatorResponse({ success: true });
  }
  
  if (path === '/api/developer/payment-submissions/reject' && method === 'POST') {
    const submissions = getCol('payment_submissions');
    const sub = submissions.find((s: any) => s.id === Number(body.id));
    if (sub) sub.status = 'rejected';
    saveCol('payment_submissions', submissions);
    
    if (body.school_id) {
      const schools = getCol('schools');
      const school = schools.find((s: any) => s.id === Number(body.school_id));
      if (school) school.paid_status = 'unpaid';
      saveCol('schools', schools);
    }
    return makeEmulatorResponse({ success: true });
  }

  if (path === '/api/developer/reports' && method === 'GET') {
    const schools = getCol('schools');
    const list = schools.map((s: any) => {
      return {
        school_id: s.id,
        school_name: s.name,
        students_count: getCol('students').filter((st: any) => st.school_id === s.id).length,
        lessons_count: getCol('lessons').filter((l: any) => l.school_id === s.id).length,
        attendance_percentage: 85,
        warnings_count: getCol('student_warnings').filter((w: any) => {
          const student = getCol('students').find((st: any) => st.id === w.student_id);
          return student && student.school_id === s.id;
        }).length,
        status: s.status,
        paid_status: s.paid_status
      };
    });
    return makeEmulatorResponse(list);
  }

  if (path === '/api/superadmin/login' && method === 'POST') {
    const superadmins = getCol('superadmins');
    const found = superadmins.find((sa: any) => sa.school_id === Number(body.school_id) && sa.username === body.username && sa.password === body.password);
    if (found) {
      const schools = getCol('schools');
      const school = schools.find((s: any) => s.id === Number(body.school_id)) || { id: Number(body.school_id), name: "Kenyatta University (KU)", status: "active", paid_status: "paid" };
      return makeEmulatorResponse({ success: true, school });
    } else {
      return makeEmulatorResponse({ error: 'Invalid superadmin credentials' }, 401);
    }
  }
  
  if (path.startsWith('/api/superadmin/report/') && method === 'GET') {
    const schoolId = Number(path.split('?')[0].split('/').pop());
    const schools = getCol('schools');
    const school = schools.find((s: any) => s.id === schoolId) || { name: 'Kenyatta University (KU)', paid_status: 'paid', status: 'active', billing_amount: 1500, last_billing_date: '' };
    const students = getCol('students').filter((s: any) => s.school_id === schoolId);
    const units = getCol('units').filter((u: any) => u.school_id === schoolId);
    const lessons = getCol('lessons').filter((l: any) => l.school_id === schoolId);
    return makeEmulatorResponse({
      school_name: school.name,
      paid_status: school.paid_status,
      status: school.status,
      billing_amount: school.billing_amount || 1500,
      last_billing_date: school.last_billing_date,
      metrics: {
        students_count: students.length,
        units_count: units.length,
        lessons_count: lessons.length,
        attendance_rate: 85,
        active_classes: lessons.filter((l: any) => !l.end_time).length
      },
      recent_lessons: lessons.slice(-5)
    });
  }
  
  if (path.startsWith('/api/superadmin/passwords/') && method === 'GET') {
    const schoolId = Number(path.split('?')[0].split('/').pop());
    const superadmins = getCol('superadmins');
    const settings = getSettings();
    const list = superadmins.filter((sa: any) => sa.school_id === schoolId).map((sa: any) => {
      return { user_name: sa.username, role: 'Super Admin', password: sa.password };
    });
    list.push({ user_name: "Class Representative", role: "Representative", password: settings.rep_password || 'admin123' });
    list.push({ user_name: "Course Lecturers (Standard)", role: "Lecturer", password: settings.lecturer_password || 'lecturer123' });
    return makeEmulatorResponse(list);
  }
  
  if (path === '/api/superadmin/passwords' && method === 'POST') {
    const superadmins = getCol('superadmins');
    const sa = superadmins.find((s: any) => s.school_id === Number(body.school_id));
    if (sa) {
      if (body.username) sa.username = body.username;
      if (body.password) sa.password = body.password;
      saveCol('superadmins', superadmins);
    }
    return makeEmulatorResponse({ success: true });
  }

  if (path.startsWith('/api/announcements/') && method === 'GET') {
    const lastPart = path.split('/').pop() || '1';
    const schoolId = Number(lastPart.split('?')[0]);
    const queryAudience = parsedUrl.searchParams.get('audience');
    const allAnn = getCol('announcements');
    const filtered = allAnn.filter((a: any) => {
      const matchSchool = (a.school_id === schoolId);
      if (!matchSchool) return false;
      if (!queryAudience) return true;
      if (queryAudience === 'all') return true;
      return a.audience === queryAudience || a.audience === 'all';
    });
    return makeEmulatorResponse(filtered);
  }
  
  if (path === '/api/announcements' && method === 'POST') {
    const all = getCol('announcements');
    const newId = all.length > 0 ? Math.max(...all.map((a: any) => a.id)) + 1 : 1;
    const item = {
      id: newId,
      school_id: Number(body.school_id || 1),
      title: body.title,
      content: body.content,
      audience: body.audience || 'all',
      created_at: new Date().toISOString()
    };
    all.push(item);
    saveCol('announcements', all);
    return makeEmulatorResponse({ success: true });
  }
  
  if (path.startsWith('/api/announcements/') && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    let all = getCol('announcements');
    all = all.filter((a: any) => a.id !== id);
    saveCol('announcements', all);
    return makeEmulatorResponse({ success: true });
  }

  if (path.startsWith('/api/superadmin/pay') && method === 'POST') {
    const schoolId = Number(path.split('/').pop() || body.school_id || 1);
    const schools = getCol('schools');
    const school = schools.find((s: any) => s.id === schoolId);
    const schoolName = school ? school.name : 'Unknown School';
    
    const submissions = getCol('payment_submissions');
    const newId = submissions.length > 0 ? Math.max(...submissions.map((s: any) => s.id)) + 1 : 1;
    submissions.push({
      id: newId,
      school_id: schoolId,
      school_name: schoolName,
      reference: body.reference || ('MPESA' + Math.random().toString(36).substring(4, 9).toUpperCase()),
      amount: body.amount || 1500,
      phone: body.phone || '254700000000',
      sender_name: body.sender_name || 'Admin Depositor',
      status: 'pending',
      created_at: new Date().toISOString()
    });
    saveCol('payment_submissions', submissions);

    if (school) {
      school.paid_status = 'pending_activation';
    }
    saveCol('schools', schools);
    return makeEmulatorResponse({ success: true });
  }

  if (path === '/api/students' && method === 'GET') {
    const students = getCol('students');
    const courses = getCol('courses');
    const departments = getCol('departments');
    const mapped = students.map((s: any) => {
      const course = courses.find((c: any) => c.id === s.course_id);
      const dept = course ? departments.find((d: any) => d.id === course.department_id) : null;
      return {
        ...s,
        course_name: course ? course.name : 'BSc. Computer Science',
        department_name: dept ? dept.name : 'Computing and Information Technology'
      };
    });
    return makeEmulatorResponse(mapped);
  }
  if (path === '/api/students' && method === 'POST') {
    const items = getCol('students');
    const newId = items.length > 0 ? Math.max(...items.map((i: any) => i.id)) + 1 : 1;
    const record = { id: newId, name: body.name, admission_number: body.admission_number, course_id: Number(body.course_id || 1), intake: body.intake || 'May 2026', school_id: Number(body.school_id || 1) };
    items.push(record);
    saveCol('students', items);
    return makeEmulatorResponse({ success: true });
  }
  if (path === '/api/students/import' && method === 'POST') {
    const students = getCol('students');
    const incoming = Array.isArray(body.students) ? body.students : [];
    let startId = students.length > 0 ? Math.max(...students.map((i: any) => i.id)) + 1 : 1;
    for (const st of incoming) {
      students.push({
        id: startId++,
        name: st.name,
        admission_number: st.admission_number,
        school_id: Number(body.school_id || 1),
        course_id: Number(body.course_id || 1),
        intake: body.intake || 'May 2026'
      });
    }
    saveCol('students', students);
    return makeEmulatorResponse({ success: true, count: incoming.length });
  }
  if (path.startsWith('/api/students/') && method === 'PUT') {
    const id = Number(path.split('/').pop());
    const items = getCol('students');
    const found = items.find((i: any) => i.id === id);
    if (found) {
      Object.assign(found, body);
      saveCol('students', items);
    }
    return makeEmulatorResponse({ success: true });
  }
  if (path.startsWith('/api/students/') && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    let items = getCol('students');
    items = items.filter((i: any) => i.id !== id);
    saveCol('students', items);
    return makeEmulatorResponse({ success: true });
  }

  if (path === '/api/units' && method === 'GET') {
    const units = getCol('units');
    const departments = getCol('departments');
    const mapped = units.map((u: any) => {
      const dept = departments.find((d: any) => d.id === u.department_id);
      return {
        ...u,
        department_name: dept ? dept.name : 'Computing and Information Technology'
      };
    });
    return makeEmulatorResponse(mapped);
  }
  if (path === '/api/units' && method === 'POST') {
    const items = getCol('units');
    const newId = items.length > 0 ? Math.max(...items.map((i: any) => i.id)) + 1 : 1;
    const record = { id: newId, name: body.name, lecturer: body.lecturer, department_id: Number(body.department_id || 1), intake: body.intake || 'May 2026', school_id: Number(body.school_id || 1) };
    items.push(record);
    saveCol('units', items);
    return makeEmulatorResponse({ success: true });
  }
  if (path.startsWith('/api/units/') && method === 'PUT') {
    const id = Number(path.split('/').pop());
    const items = getCol('units');
    const found = items.find((i: any) => i.id === id);
    if (found) {
      Object.assign(found, body);
      saveCol('units', items);
    }
    return makeEmulatorResponse({ success: true });
  }
  if (path.startsWith('/api/units/') && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    let items = getCol('units');
    items = items.filter((i: any) => i.id !== id);
    saveCol('units', items);
    return makeEmulatorResponse({ success: true });
  }

  if (path === '/api/departments' && method === 'GET') {
    return makeEmulatorResponse(getCol('departments'));
  }
  if (path === '/api/departments' && method === 'POST') {
    const items = getCol('departments');
    const newId = items.length > 0 ? Math.max(...items.map((i: any) => i.id)) + 1 : 1;
    const record = { id: newId, name: body.name, school_id: Number(body.school_id || 1) };
    items.push(record);
    saveCol('departments', items);
    return makeEmulatorResponse({ success: true });
  }
  if (path.startsWith('/api/departments/') && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    let items = getCol('departments');
    items = items.filter((i: any) => i.id !== id);
    saveCol('departments', items);
    return makeEmulatorResponse({ success: true });
  }

  if (path === '/api/courses' && method === 'GET') {
    return makeEmulatorResponse(getCol('courses'));
  }
  if (path === '/api/courses' && method === 'POST') {
    const items = getCol('courses');
    const newId = items.length > 0 ? Math.max(...items.map((i: any) => i.id)) + 1 : 1;
    const record = { id: newId, name: body.name, department_id: Number(body.department_id || 1) };
    items.push(record);
    saveCol('courses', items);
    return makeEmulatorResponse({ success: true });
  }
  if (path.startsWith('/api/courses/') && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    let items = getCol('courses');
    items = items.filter((i: any) => i.id !== id);
    saveCol('courses', items);
    return makeEmulatorResponse({ success: true });
  }

  if (path === '/api/intakes' && method === 'GET') {
    return makeEmulatorResponse(getCol('intakes'));
  }
  if (path === '/api/intakes' && method === 'POST') {
    const items = getCol('intakes');
    const newId = items.length > 0 ? Math.max(...items.map((i: any) => i.id)) + 1 : 1;
    const record = { id: newId, name: body.name };
    items.push(record);
    saveCol('intakes', items);
    return makeEmulatorResponse({ success: true });
  }
  if (path.startsWith('/api/intakes/') && method === 'DELETE') {
    const id = Number(path.split('/').pop());
    let items = getCol('intakes');
    items = items.filter((i: any) => i.id !== id);
    saveCol('intakes', items);
    return makeEmulatorResponse({ success: true });
  }

  if (path === '/api/auth/verify' && method === 'POST') {
    const settings = getSettings();
    const key = body.role === 'rep' ? 'rep_password' : 'lecturer_password';
    const originalPassword = settings[key] || (body.role === 'rep' ? 'admin123' : 'lecturer123');
    if (originalPassword === body.password) {
      return makeEmulatorResponse({ success: true });
    } else {
      return makeEmulatorResponse({ success: false, error: 'Invalid password' }, 401);
    }
  }

  if (path === '/api/settings/passwords' && method === 'POST') {
    const { rep_password, lecturer_password } = body;
    const settings = getSettings();
    if (rep_password) settings.rep_password = rep_password;
    if (lecturer_password) settings.lecturer_password = lecturer_password;
    saveSettings(settings);
    return makeEmulatorResponse({ success: true });
  }

  if (path === '/api/settings/profile' && method === 'GET') {
    const settings = getSettings();
    return makeEmulatorResponse({
      rep_name: settings.representative_name || 'Class Representative',
      rep_password: settings.rep_password || 'admin123',
      lecturer_password: settings.lecturer_password || 'lecturer123',
      rep_email: settings.rep_email || 'shemomondi746@gmail.com',
      rep_phone: settings.rep_phone || '0712345678',
      rep_avatar: settings.rep_avatar || '',
      otp_duration_mins: Number(settings.otp_duration_mins || 20),
      late_threshold_mins: Number(settings.late_threshold_mins || 5)
    });
  }

  if (path === '/api/settings/profile' && method === 'POST') {
    const settings = getSettings();
    Object.assign(settings, {
      representative_name: body.rep_name,
      rep_password: body.rep_password,
      lecturer_password: body.lecturer_password,
      rep_email: body.rep_email,
      rep_phone: body.rep_phone,
      rep_avatar: body.rep_avatar,
      otp_duration_mins: String(body.otp_duration_mins || 20),
      late_threshold_mins: String(body.late_threshold_mins || 5)
    });
    saveSettings(settings);
    return makeEmulatorResponse({ success: true });
  }

  if (path === '/api/settings/academic-map') {
    if (method === 'POST') {
      const settings = getSettings();
      settings.academic_map_image = body.image;
      saveSettings(settings);
      return makeEmulatorResponse({ success: true });
    }
    return makeEmulatorResponse({ image: getSettings().academic_map_image || '' });
  }

  if (path === '/api/license/status' && method === 'GET') {
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 365);
    return makeEmulatorResponse({
      isValid: true,
      daysLeft: 365,
      expiry: defaultExpiry.toISOString()
    });
  }

  if (path === '/api/units/lecturers' && method === 'GET') {
    const units = getCol('units');
    const lecturers = Array.from(new Set(units.map((u: any) => u.lecturer))).filter(Boolean);
    return makeEmulatorResponse(lecturers);
  }

  if (path.startsWith('/api/lecturer/my-otp') && method === 'GET') {
    const lessons = getCol('lessons');
    const active = lessons.find((l: any) => !l.end_time);
    if (!active) return makeEmulatorResponse({ error: 'No active session' }, 404);
    return makeEmulatorResponse({ otp: active.lecturer_otp });
  }

  if (path === '/api/lessons/start' && method === 'POST') {
    const lessons = getCol('lessons');
    const newId = lessons.length > 0 ? Math.max(...lessons.map((l: any) => l.id)) + 1 : 1;
    const lecturer_otp = Math.floor(100000 + Math.random() * 900000).toString();
    const newLesson = {
      id: newId,
      unit_id: Number(body.unit_id),
      date: new Date().toISOString().split('T')[0],
      venue: body.venue || 'Lecture Hall A',
      duration: Number(body.duration || 60),
      start_time: new Date().toISOString(),
      end_time: null,
      scheduled_start: new Date().toISOString(),
      scheduled_end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      lecturer_otp,
      lecturer_present: 0,
      otp_enabled: 0,
      school_id: Number(body.school_id || 1)
    };
    lessons.push(newLesson);
    saveCol('lessons', lessons);

    // Bootstrap standard student attendance with PENDING status & unique randomized codes
    const students = getCol('students');
    const attendance = getCol('attendance');
    let startAttId = attendance.length > 0 ? Math.max(...attendance.map((a: any) => a.id)) + 1 : 1;
    for (const student of students) {
      const studentOtp = Math.floor(100000 + Math.random() * 900000).toString();
      attendance.push({
        id: startAttId++,
        lesson_id: newId,
        student_id: student.id,
        otp: studentOtp,
        status: 'pending',
        marked_at: null
      });
    }
    saveCol('attendance', attendance);

    return makeEmulatorResponse({ success: true, lesson_id: newId, otp: lecturer_otp });
  }

  if (path === '/api/lessons/restart' && method === 'POST') {
    const lessons = getCol('lessons');
    const active = lessons.find((l: any) => !l.end_time);
    if (active) {
      active.lecturer_otp = Math.floor(100000 + Math.random() * 900000).toString();
      active.otp_enabled = 0;
      active.lecturer_present = 0;
      active.start_time = new Date().toISOString();
      saveCol('lessons', lessons);

      // Reset and seed attendance for the restarted lesson
      let attendance = getCol('attendance');
      attendance = attendance.filter((a: any) => a.lesson_id !== active.id);

      const students = getCol('students');
      let startAttId = attendance.length > 0 ? Math.max(...attendance.map((a: any) => a.id)) + 1 : 1;
      for (const student of students) {
        const studentOtp = Math.floor(100000 + Math.random() * 900000).toString();
        attendance.push({
          id: startAttId++,
          lesson_id: active.id,
          student_id: student.id,
          otp: studentOtp,
          status: 'pending',
          marked_at: null
        });
      }
      saveCol('attendance', attendance);

      return makeEmulatorResponse({ success: true, otp: active.lecturer_otp });
    }
    return makeEmulatorResponse({ error: 'No active lesson to restart' }, 400);
  }

  if (path.startsWith('/api/lessons/') && path.endsWith('/enable-otp') && method === 'POST') {
    const parts = path.split('/');
    const lessonIdStr = parts[parts.length - 2];
    const lessonId = Number(lessonIdStr);
    const lessons = getCol('lessons');
    const lesson = lessons.find((l: any) => l.id === lessonId);
    if (lesson) {
      lesson.otp_enabled = 1;
      saveCol('lessons', lessons);
    }
    return makeEmulatorResponse({ success: true });
  }

  if (path === '/api/lessons/active' && method === 'GET') {
    const lessons = getCol('lessons');
    const sortedLessons = [...lessons].sort((a: any, b: any) => b.id - a.id);
    const active = sortedLessons[0];
    
    if (active) {
      // Check expiry logic like in SQL
      const startTimeTime = new Date(active.start_time).getTime();
      const nowTime = Date.now();
      const durationMs = (active.duration || 60) * 60 * 1000;
      const bufferMs = 30 * 60 * 1000; // 30 mins buffer

      if (nowTime > (startTimeTime + durationMs + bufferMs)) {
        return makeEmulatorResponse(null);
      }

      const units = getCol('units');
      const unit = units.find((u: any) => u.id === active.unit_id) || { name: 'FIT 201 - Software Engineering', lecturer: 'Dr. Kamau' };
      
      const attendance = getCol('attendance');
      const activeAttendance = attendance.filter((a: any) => a.lesson_id === active.id);
      const students = getCol('students');
      
      const mappedAttendance = activeAttendance.map((a: any) => {
        const student = students.find((st: any) => st.id === a.student_id);
        return {
          id: a.id,
          student_id: a.student_id,
          student_name: student ? student.name : 'John Doe',
          admission_number: student ? student.admission_number : 'CIT/001/2026',
          otp: a.otp,
          status: a.status,
          marked_at: a.marked_at
        };
      });

      return makeEmulatorResponse({
        ...active,
        unit_name: unit.name,
        lecturer: unit.lecturer,
        attendance: mappedAttendance,
        server_time_now: new Date().toISOString()
      });
    }
    return makeEmulatorResponse(null);
  }

  if (path === '/api/attendance/mark' && method === 'POST') {
    const attendance = getCol('attendance');
    let record = attendance.find((a: any) => a.lesson_id === Number(body.lesson_id) && a.student_id === Number(body.student_id));
    
    if (!record) {
      return makeEmulatorResponse({ error: 'Student transaction not found for this active lesson. Restart the session.' }, 404);
    }

    if (String(record.otp) !== String(body.otp)) {
      return makeEmulatorResponse({ error: 'Invalid student validation OTP code.' }, 400);
    }

    if (record.status !== 'pending') {
      return makeEmulatorResponse({ error: `You have already been marked as ${record.status}.` }, 400);
    }

    // Determine late status dynamically by checking start_time threshold
    const lessons = getCol('lessons');
    const active = lessons.find((l: any) => l.id === Number(body.lesson_id));
    let markStatus = 'present';
    if (active) {
      const startTime = new Date(active.start_time).getTime();
      const diffMins = (Date.now() - startTime) / 60000;
      if (diffMins > 20) {
        markStatus = 'late';
      }
    }

    record.status = markStatus;
    record.marked_at = new Date().toISOString();
    saveCol('attendance', attendance);

    // If absent (standard tracking fallback)
    if (record.status === 'absent') {
      const warnings = getCol('student_warnings');
      const existingIdx = warnings.findIndex((w: any) => w.student_id === Number(body.student_id));
      if (existingIdx >= 0) {
        warnings[existingIdx].absent_count = (warnings[existingIdx].absent_count || 0) + 1;
        warnings[existingIdx].reason = `Absent for ${warnings[existingIdx].absent_count} lectures.`;
      } else {
        const newWId = warnings.length > 0 ? Math.max(...warnings.map((w: any) => w.id)) + 1 : 1;
        warnings.push({
          id: newWId,
          student_id: Number(body.student_id),
          absent_count: 1,
          reason: 'Absent for 1 lecture.',
          status: 'pending_rep',
          created_at: new Date().toISOString()
        });
      }
      saveCol('student_warnings', warnings);
    }

    return makeEmulatorResponse({ success: true, status: markStatus });
  }

  if (path === '/api/lecturer/mark' && method === 'POST') {
    const lessons = getCol('lessons');
    const active = lessons.find((l: any) => !l.end_time);
    if (!active) return makeEmulatorResponse({ error: 'No active session' }, 400);

    if (String(active.lecturer_otp) !== String(body.otp)) {
      return makeEmulatorResponse({ error: 'Invalid Lecturer OTP' }, 400);
    }

    active.lecturer_present = 1;
    saveCol('lessons', lessons);
    return makeEmulatorResponse({ success: true });
  }

  if (path.startsWith('/api/attendance/my-otp') && method === 'GET') {
    const lessonId = Number(parsedUrl.searchParams.get('lesson_id'));
    const studentId = Number(parsedUrl.searchParams.get('student_id'));
    const lessons = getCol('lessons');
    const lesson = lessons.find((l: any) => l.id === lessonId);
    if (!lesson) return makeEmulatorResponse({ error: 'Lesson not found' }, 404);
    
    const att = getCol('attendance');
    const found = att.find((a: any) => a.lesson_id === lessonId && a.student_id === studentId);
    if (found) {
      return makeEmulatorResponse({ otp: found.otp });
    }
    const generatedOtp = 'S-' + Math.floor(1000 + Math.random() * 9000);
    return makeEmulatorResponse({ otp: generatedOtp });
  }

  if (path.startsWith('/api/session/enter') && method === 'POST') {
    return makeEmulatorResponse({ success: true });
  }
  if (path.startsWith('/api/session/heartbeat') && method === 'POST') {
    return makeEmulatorResponse({ success: true });
  }

  if (path.startsWith('/api/reports/unit/') && method === 'GET') {
    const unitId = Number(path.split('/').pop());
    const attendance = getCol('attendance');
    const students = getCol('students');
    const lessons = getCol('lessons').filter((l: any) => l.unit_id === unitId);
    
    const records = lessons.flatMap((l: any) => {
      const attList = attendance.filter((a: any) => a.lesson_id === l.id);
      return students.map((s: any) => {
        const found = attList.find((a: any) => a.student_id === s.id);
        return {
          id: l.id + '-' + s.id,
          student_id: s.id,
          student_name: s.name,
          admission_number: s.admission_number,
          date: l.date,
          status: found ? found.status : 'absent',
          marked_at: found ? found.marked_at : null
        };
      });
    });
    return makeEmulatorResponse(records);
  }

  if (path === '/api/warnings' && method === 'GET') {
    const warnings = getCol('student_warnings');
    const students = getCol('students');
    const mapped = warnings.map((w: any) => {
      const st = students.find((s: any) => s.id === w.student_id);
      return {
        ...w,
        student_name: st ? st.name : 'John Doe',
        admission_number: st ? st.admission_number : 'CIT/001/2026'
      };
    });
    return makeEmulatorResponse(mapped);
  }
  if (path === '/api/warnings/forward' && method === 'POST') {
    const warnings = getCol('student_warnings');
    const found = warnings.find((w: any) => w.id === Number(body.warning_id));
    if (found) found.status = 'forwarded';
    saveCol('student_warnings', warnings);
    return makeEmulatorResponse({ success: true });
  }
  if (path === '/api/warnings/clear' && method === 'POST') {
    let warnings = getCol('student_warnings');
    warnings = warnings.filter((w: any) => w.id !== Number(body.warning_id));
    saveCol('student_warnings', warnings);
    return makeEmulatorResponse({ success: true });
  }

  if (path === '/api/reports/weekly' && method === 'GET') {
    return makeEmulatorResponse([
      { date: 'Mon', present: 45, absent: 5, late: 2 },
      { date: 'Tue', present: 48, absent: 3, late: 1 },
      { date: 'Wed', present: 42, absent: 7, late: 3 },
      { date: 'Thu', present: 50, absent: 1, late: 0 },
      { date: 'Fri', present: 46, absent: 4, late: 2 }
    ]);
  }

  if (path === '/api/ai/query' && method === 'POST') {
    return makeEmulatorResponse({
      reply: "Hello! I am Gemini. This system is currently offline or running in emulated Vercel environment, so physical database queries are fully simulated offline. Let me know how I can guide you!"
    });
  }

  if (path === '/api/ai/curriculum-analyzer' && method === 'POST') {
    const departments = getCol('departments');
    const courses = getCol('courses');
    const units = getCol('units');
    
    const parsedDepts = ["Telecommunication and Electrical Engineering", "School of Business"];
    const parsedCourses = ["BSc. Telecomm Engineering", "Bachelor of Commerce"];
    const parsedUnits = ["TCE 302 - Electro-Magnetics", "BBA 101 - Intro to Business"];
    
    let deptIdStart = departments.length > 0 ? Math.max(...departments.map((d: any) => d.id)) + 1 : 1;
    let courseIdStart = courses.length > 0 ? Math.max(...courses.map((c: any) => c.id)) + 1 : 1;
    let unitIdStart = units.length > 0 ? Math.max(...units.map((u: any) => u.id)) + 1 : 1;
    
    const newDeptId = deptIdStart;
    departments.push({ id: newDeptId, school_id: 1, name: "Telecommunication and Electrical Engineering" });
    courses.push({ id: courseIdStart, department_id: newDeptId, name: "BSc. Telecomm Engineering" });
    units.push({ id: unitIdStart, name: "TCE 302 - Electro-Magnetics", lecturer: "Dr. Mutua", school_id: 1, department_id: newDeptId, intake: "May 2026" });
    
    saveCol('departments', departments);
    saveCol('courses', courses);
    saveCol('units', units);
    
    return makeEmulatorResponse({
      success: true,
      summary: "Simulated Curriculum Parse: Successfully added Department of 'Telecommunication and Electrical Engineering' with major 'BSc. Telecomm Engineering' and core unit 'TCE 302 - Electro-Magnetics'.",
      details: "Parsed elements: 1 Department, 1 Course, 1 Unit."
    });
  }

  return makeEmulatorResponse({ error: 'Endpoint of emulated database API not found: ' + path }, 404);
};

const fetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.toString() : (url as Request).url || '');
  if (urlStr.includes('/api/')) {
    if (emulatorEnabled) {
      try {
        return await handleEmulatedRequest(urlStr, options);
      } catch (err: any) {
        console.error('[Emulated DB Router Error]', err);
        return makeEmulatorResponse({ error: err.message }, 500);
      }
    } else {
      try {
        const response = await nativeFetch(url, options);
        const contentType = response.headers.get('content-type') || '';
        if (response.status === 404 || contentType.includes('text/html') || response.status === 502) {
          console.warn('[System] Live host returned 404/html SPA layout for API. Invoking emulator failover...');
          emulatorEnabled = true;
          return await handleEmulatedRequest(urlStr, options);
        }
        return response;
      } catch (networkError) {
        console.warn('[System] Primary backend unreachable (Failed to Fetch). Switching live session to Emulator Mode...', networkError);
        emulatorEnabled = true;
        return await handleEmulatedRequest(urlStr, options);
      }
    }
  }
  return nativeFetch(url, options);
};

// --- Types ---
interface Student {
  id: number;
  name: string;
  admission_number: string;
  course_id?: number;
  course_name?: string;
  department_name?: string;
  intake?: string;
}

interface Unit {
  id: number;
  name: string;
  lecturer: string;
  department_id?: number;
  department_name?: string;
  intake?: string;
}

interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name: string;
  admission_number: string;
  otp: string;
  status: 'pending' | 'present' | 'absent';
  marked_at?: string;
}

interface ActiveLesson {
  id: number;
  unit_name: string;
  lecturer: string;
  venue: string;
  duration: number;
  start_time: string;
  end_time: string;
  scheduled_start: string;
  scheduled_end: string;
  lecturer_otp: string;
  lecturer_present: number;
  otp_enabled: boolean;
  attendance: AttendanceRecord[];
}

interface LicenseStatus {
  isValid: boolean;
  daysLeft: number;
  expiry: string;
}

// --- Components ---

const LoginScreen = ({ role, onLogin }: { role: 'rep' | 'lecturer', onLogin: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(`auth_${role}`, 'true');
        sessionStorage.setItem(`cached_pass_${role}`, password);
        onLogin();
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-transparent">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-2xl dark:shadow-none space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black dark:bg-zinc-800 text-white dark:text-zinc-200 rounded-3xl mb-4 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight uppercase dark:text-zinc-100">Secure Access</h2>
          <p className="text-sm text-neutral-500 dark:text-zinc-400">Enter password for {role === 'rep' ? 'Representative' : 'Lecturer'} Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 ml-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                className="w-full px-6 py-4 pr-12 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-2xl text-center text-lg focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-zinc-700 font-mono tracking-[0.2em]"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center font-bold bg-red-50 dark:bg-red-950/20 py-2 rounded-xl border border-red-100 dark:border-red-900/30">
              {error}
            </p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-2xl font-bold shadow-xl hover:bg-neutral-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50"
          >
            {loading ? 'VERIFYING...' : 'UNLOCK PORTAL'}
          </button>
        </form>
        
        <div className="text-center flex flex-col items-center gap-4">
          <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black dark:hover:text-zinc-200 transition-colors">
            Back to Student Portal
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

const AdminDashboard = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [activeLesson, setActiveLesson] = useState<ActiveLesson | null>(null);
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [repName, setRepName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [hotspotIP, setHotspotIP] = useState('192.168.43.1');
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ total: string, otp: string }>({ total: '00:00', otp: '00:00' });
  const [profile, setProfile] = useState({
    rep_name: 'Class Rep',
    rep_email: 'shemomondi746@gmail.com',
    rep_phone: '0712345678',
    rep_avatar: '',
    rep_password: 'admin123',
    lecturer_password: 'lecturer123',
    otp_duration_mins: '20',
    late_threshold_mins: '10'
  });
  const [showRepPassword, setShowRepPassword] = useState(false);
  const [showLecturerPassword, setShowLecturerPassword] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Form States
  const getFormTimeString = (offsetMins = 0) => {
    const d = new Date(Date.now() + offsetMins * 60 * 1000);
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  };

  const [newStudent, setNewStudent] = useState({ name: '', admission_number: '', department_id: '', course_id: '', intake: '' });
  const [newUnit, setNewUnit] = useState({ name: '', lecturer: '', department_id: '', intake: '' });
  const [lessonConfig, setLessonConfig] = useState({ 
    unit_id: '', 
    venue: 'Lecture Hall A', 
    duration: '60',
    scheduled_start: getFormTimeString(0),
    scheduled_end: getFormTimeString(60)
  });

  // Academic setups list states
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [intakes, setIntakes] = useState<any[]>([]);
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // New States for Academic Settings Modal
  const [showAcademicSettingsModal, setShowAcademicSettingsModal] = useState(false);
  const [deptNameInput, setDeptNameInput] = useState('');
  const [deptImageInput, setDeptImageInput] = useState<string | null>(null);
  const [courseNameInput, setCourseNameInput] = useState('');
  const [courseDeptInput, setCourseDeptInput] = useState('');
  const [intakeInput, setIntakeInput] = useState('');

  // Search queries for Department and Courses inside academic structure modal
  const [academicMapImage, setAcademicMapImage] = useState<string>('');
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

  // New States for Search, Batch Import, Warnings, and Weekly Report
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [activeSessionSearchQuery, setActiveSessionSearchQuery] = useState('');
  const [warningsList, setWarningsList] = useState<any[]>([]);
  const [importedStatus, setImportedStatus] = useState<{ success: boolean; message: string } | null>(null);
  
  // Import Panel States
  const [importText, setImportText] = useState('');
  const [importImageBase64, setImportImageBase64] = useState<string | null>(null);
  const [importImageName, setImportImageName] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Curriculum Analyzer States
  const [curriculumAnalyzing, setCurriculumAnalyzing] = useState(false);
  const [curriculumStatus, setCurriculumStatus] = useState<{ success: boolean; message: string; details?: string[] } | null>(null);
  const [activeUnitTab, setActiveUnitTab] = useState<'manual' | 'ai'>('manual');

  // Weekly Report States
  const [weeklyFilter, setWeeklyFilter] = useState({ 
    start: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [showWeeklyReportModal, setShowWeeklyReportModal] = useState(false);

  // Fetch helper with transient error retries
  const fetchWithRetry = async (url: string, options?: RequestInit, resLeft = 3, intervalMs = 1200): Promise<Response> => {
    for (let i = 0; i < resLeft; i++) {
      try {
        const response = await fetch(url, options);
        return response;
      } catch (err: any) {
        if (i === resLeft - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, intervalMs * (i + 1)));
      }
    }
    throw new Error("Failed to fetch after retries");
  };

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const fetchJson = async (url: string) => {
        const res = await fetchWithRetry(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
        return res.json();
      };

      const [sData, uData, lData, licData, profData, deptsData, coursesData, intakesData] = await Promise.all([
        fetchJson('/api/students'),
        fetchJson('/api/units'),
        fetchJson('/api/lessons/active'),
        fetchJson('/api/license/status'),
        fetchJson('/api/settings/profile'),
        fetchJson('/api/departments'),
        fetchJson('/api/courses'),
        fetchJson('/api/intakes')
      ]);

      setStudents(sData);
      setUnits(uData);
      setActiveLesson(lData);
      setLicense(licData);
      setProfile(profData);
      setRepName(profData.rep_name);
      setDepartments(deptsData);
      setCourses(coursesData);
      setIntakes(intakesData);
      setLastSynced(new Date());

      // Fetch relevant representative announcements
      const schId = lData?.school_id || 1;
      try {
        const annRes = await fetchWithRetry(`/api/announcements/${schId}?audience=reps`);
        if (annRes.ok) {
          setAnnouncements(await annRes.json());
        }
      } catch (err) {
        console.warn('Announcements fetch debug', err);
      }

      // Automatically sync and fetch students who missed lessons/consecutive absences
      try {
        const warnRes = await fetchWithRetry('/api/warnings');
        if (warnRes.ok) {
          const warnData = await warnRes.json();
          setWarningsList(warnData);
        }
      } catch (err) {
        console.warn('Warnings fetch failed gracefully', err);
      }

      // Fetch academic map image
      try {
        const mapRes = await fetchWithRetry('/api/settings/academic-map');
        if (mapRes.ok) {
          const mapData = await mapRes.json();
          setAcademicMapImage(mapData.image || '');
        }
      } catch (err) {
        console.warn('Academic map fetch failed gracefully', err);
      }
    } catch (e: any) {
      console.warn('Sync failed, retrying on next action focus', e);
      // Only alert if it's not the initial load to avoid spamming
      if (!loading) alert(`System Sync Error: ${e.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleForwardWarning = async (warningId: number) => {
    try {
      const res = await fetch('/api/warnings/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warning_id: warningId })
      });
      if (res.ok) {
        const warnRes = await fetch('/api/warnings');
        if (warnRes.ok) setWarningsList(await warnRes.json());
        alert("Warning of consecutive/multiple absences has been officially recorded and successfully forwarded to Superadmin.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearWarning = async (warningId: number) => {
    if (!window.confirm("Are you sure you want to clear/record-archive this warning?")) return;
    try {
      const res = await fetch('/api/warnings/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warning_id: warningId })
      });
      if (res.ok) {
        const warnRes = await fetch('/api/warnings');
        if (warnRes.ok) setWarningsList(await warnRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (file: File) => {
    if (!file) return;
    setImportImageName(file.name);
    setImportedStatus(null);

    const reader = new FileReader();
    if (file.type.startsWith('image/')) {
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        setImportImageBase64(base64Data);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        setImportText(reader.result as string);
        setImportImageBase64(null);
      };
      reader.readAsText(file);
    }
  };

  const handleBatchImport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!importText.trim() && !importImageBase64) {
      alert("Please either paste a list of students or upload an image scan first!");
      return;
    }

    setImportLoading(true);
    setImportedStatus(null);
    try {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: importText,
          imageBase64: importImageBase64,
          mimeType: 'image/jpeg'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setImportedStatus({
          success: true,
          message: `Successfully imported ${data.imported} student records into database. ${data.skipped} duplicate admissions were skipped. (Parsed total: ${data.totalParsed} via ${data.source.toUpperCase()})`
        });
        setImportText('');
        setImportImageBase64(null);
        setImportImageName('');
        fetchData(); // Reload registry list
      } else {
        const data = await res.json();
        setImportedStatus({
          success: false,
          message: data.error || 'Import failed. Please verify list formatting.'
        });
      }
    } catch (err) {
      setImportedStatus({
        success: false,
        message: 'Communication error with back-end import engine.'
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      let startStr = weeklyFilter.start;
      let endStr = weeklyFilter.end;
      let title = 'WEEKLY ACCUMULATED CLASS ATTENDANCE REPORT';
      let fileName = `Weekly_Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      if (reportType === 'monthly') {
        const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
        const lastDay = new Date(selectedYear, selectedMonth, 0);
        const pad = (num: number) => num.toString().padStart(2, '0');
        startStr = `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`;
        endStr = `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`;
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        title = `MONTHLY ATTENDANCE REPORT - ${monthNames[selectedMonth - 1].toUpperCase()} ${selectedYear}`;
        fileName = `Monthly_Attendance_Report_${monthNames[selectedMonth - 1]}_${selectedYear}.pdf`;
      }

      let url = `/api/reports/weekly?start_date=${startStr} 00:00:00&end_date=${endStr} 23:59:59`;
      const res = await fetch(url);
      if (!res.ok) {
        alert("Failed to fetch report data.");
        return;
      }
      const data = await res.json();
      
      if (!data.lessons || data.lessons.length === 0) {
        alert("No lessons found or taught in the specified period.");
        return;
      }

      const doc = new jsPDF('l', 'mm', 'a4');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(title, 14, 15);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 21);
      doc.text(`Period: ${startStr} to ${endStr}`, 14, 26);

      const headers = ['Student Name', 'Admission No.'];
      data.lessons.forEach((l: any) => {
        const formattedDate = new Date(l.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        headers.push(`${formattedDate}\n(${l.unit_name})`);
      });

      const rows = data.students.map((student: any) => {
        const row = [student.name, student.admission_number];
        data.lessons.forEach((l: any) => {
          const record = data.attendance.find((a: any) => a.student_id === student.id && a.lesson_id === l.id);
          if (!record) {
            row.push('—');
          } else if (record.status === 'present') {
            row.push('PRESENT');
          } else if (record.status === 'late') {
            row.push('LATE');
          } else {
            row.push('ABSENT');
          }
        });
        return row;
      });

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 32,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 },
          1: { halign: 'left', fontStyle: 'normal', cellWidth: 25 }
        },
        headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' }
      });

      doc.save(fileName);
    } catch (err: any) {
      console.error(err);
      alert(`Report PDF rendering error: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh data when window gets focus to ensure latest info for reports
    window.addEventListener('focus', fetchData);
    
    // Pre-populate scheduled start and end times for the lesson config
    const now = new Date();
    const formatTime = (d: Date) => {
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };
    setLessonConfig(prev => ({
      ...prev,
      scheduled_start: formatTime(now),
      scheduled_end: formatTime(new Date(now.getTime() + 60 * 60000))
    }));

    const socket = io();
    socket.on('attendance-updated', () => fetchData());
    
    return () => { 
      socket.disconnect(); 
      window.removeEventListener('focus', fetchData);
    };
  }, []);

  useEffect(() => {
    if (!activeLesson) return;

    const initialLocalTime = Date.now();
    const initialServerTime = new Date(activeLesson.server_time_now || new Date()).getTime();
    const startTimeTime = new Date(activeLesson.start_time).getTime();
    
    // Server-side sets activeLesson.end_time to expiry. If null or invalid, fallback to start_time + duration
    const endTimeFallback = startTimeTime + (Number(activeLesson.duration || 60) * 60 * 1000);
    const endTimeTime = activeLesson.end_time ? new Date(activeLesson.end_time).getTime() : endTimeFallback;
    
    // Calculate total minutes expiration
    const otpDur = Number(activeLesson.otp_duration_mins || profile.otp_duration_mins || 20);
    const otpExpiryTimeTime = startTimeTime + (otpDur * 60 * 1000);

    const formatSeconds = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const updateTimer = () => {
      const elapsed = Date.now() - initialLocalTime;
      const currentServerTime = initialServerTime + elapsed;
      
      const totalSecondsLeft = Math.max(0, Math.round((endTimeTime - currentServerTime) / 1000));
      const otpSecondsLeft = Math.max(0, Math.round((otpExpiryTimeTime - currentServerTime) / 1000));

      setTimeLeft({
        total: formatSeconds(totalSecondsLeft),
        otp: formatSeconds(otpSecondsLeft)
      });

      return { totalSecondsLeft };
    };

    // Run initial time check immediately
    updateTimer();

    const interval = setInterval(() => {
      const { totalSecondsLeft } = updateTimer();
      if (totalSecondsLeft === 0) {
        clearInterval(interval);
        fetchData();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeLesson]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newStudent.name,
        admission_number: newStudent.admission_number,
        course_id: newStudent.course_id ? Number(newStudent.course_id) : undefined,
        intake: newStudent.intake || undefined
      })
    });
    if (res.ok) {
      setNewStudent({ name: '', admission_number: '', course_id: '', intake: '' });
      fetchData();
    } else {
      alert('Error adding student (likely duplicate admission number)');
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newUnit.name,
        lecturer: newUnit.lecturer,
        department_id: newUnit.department_id ? Number(newUnit.department_id) : undefined,
        intake: newUnit.intake || undefined
      })
    });
    if (res.ok) {
      setNewUnit({ name: '', lecturer: '', department_id: '', intake: '' });
      fetchData();
    }
  };

  const handleCurriculumAnalysisImage = async (file: File) => {
    setCurriculumAnalyzing(true);
    setCurriculumStatus(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/ai/curriculum-analyzer', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: base64 })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setCurriculumStatus({
              success: true,
              message: data.summary,
              details: data.details
            });
            await fetchData(); // Reload fresh lists
          } else {
            setCurriculumStatus({
              success: false,
              message: data.error || 'Failed to analyze curriculum structure.'
            });
          }
        } catch (err: any) {
          setCurriculumStatus({
            success: false,
            message: err.message || 'Error communicating with server.'
          });
        } finally {
          setCurriculumAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      setCurriculumStatus({
        success: false,
        message: e.message || 'Error processing image file.'
      });
      setCurriculumAnalyzing(false);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptNameInput.trim()) return;
    const res = await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: deptNameInput,
        image_url: deptImageInput || undefined
      })
    });
    if (res.ok) {
      setDeptNameInput('');
      setDeptImageInput(null);
      fetchData();
    }
  };

  const handleDeleteDepartment = async (id: number) => {
    if (!window.confirm('Deleting department will also delete all its associated courses. Do you want to proceed?')) return;
    const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchData();
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseNameInput.trim() || !courseDeptInput) return;
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: courseNameInput, department_id: Number(courseDeptInput) })
    });
    if (res.ok) {
      setCourseNameInput('');
      fetchData();
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchData();
    }
  };

  const handleAddIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeInput.trim()) return;
    const res = await fetch('/api/intakes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: intakeInput })
    });
    if (res.ok) {
      setIntakeInput('');
      fetchData();
    }
  };

  const handleDeleteIntake = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this intake?')) return;
    const res = await fetch(`/api/intakes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchData();
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const res = await fetch(`/api/students/${editingStudent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingStudent)
    });
    if (res.ok) {
      setEditingStudent(null);
      fetchData();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to update student');
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!window.confirm('Are you sure? This will delete the student and all their attendance records.')) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to delete student'}`);
      }
    } catch (e: any) {
      alert(`Network Error: ${e.message}`);
    }
  };

  const handleUpdateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    const res = await fetch(`/api/units/${editingUnit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingUnit)
    });
    if (res.ok) {
      setEditingUnit(null);
      fetchData();
    }
  };

  const handleDeleteUnit = async (id: number) => {
    if (!window.confirm('Are you sure? This will delete the unit, all its lessons, and all attendance records for those lessons.')) return;
    try {
      const res = await fetch(`/api/units/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to delete unit'}`);
      }
    } catch (e: any) {
      alert(`Network Error: ${e.message}`);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        alert('Profile & settings saved successfully!');
        setRepName(profile.rep_name);
        await fetchData();
      } else {
        alert('Failed to update settings profile');
      }
    } catch (err: any) {
      alert(`Error updating settings: ${err.message}`);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, rep_avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonConfig.unit_id) return alert('Select a unit');
    try {
      const res = await fetch('/api/lessons/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonConfig)
      });
      if (res.ok) {
        await fetchData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to start lesson'}`);
      }
    } catch (error) {
      console.error('Start lesson error:', error);
      alert('Network error while starting lesson');
    }
  };

  const handleEnableOTP = async () => {
    if (!activeLesson) return;
    await fetch(`/api/lessons/${activeLesson.id}/enable-otp`, { method: 'POST' });
    fetchData();
  };

  const handleRestartSession = async () => {
    if (!window.confirm('Are you sure you want to restart this session? All current attendance for this session will be cleared.')) return;
    const res = await fetch('/api/lessons/restart', { method: 'POST' });
    if (res.ok) fetchData();
  };

  const exportToPDF = async (lessonToExport: any = activeLesson) => {
    if (!lessonToExport) return;
    
    setRefreshing(true);
    let dataToUse = lessonToExport;
    try {
      // Always fetch fresh data for the unit/lesson to ensure everything is up to date
      const unitId = lessonToExport.unit_id || lessonToExport.id;
      const res = await fetch(`/api/reports/unit/${unitId}`);
      if (res.ok) {
        dataToUse = await res.json();
      }
    } catch (e) {
      console.log("Using provided data for PDF due to fetch error");
    } finally {
      setRefreshing(false);
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Serial Number (Top Right)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Serial No: PCKTTI/ADM/36', pageWidth - 14, 15, { align: 'right' });

    // School Name & Report Title (Center)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize('P.C KINYANJUI TECHNICAL TRAINING INSTITUTE STUDENT/LECTURERS ATTENDANCE REPORT', pageWidth - 40);
    doc.text(titleLines, pageWidth / 2, 25, { align: 'center' });

    // Decorative Line
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 128, 0); // Emerald/Green color
    doc.line(14, 35, pageWidth - 14, 35);

    // Session Details Grid
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SESSION DETAILS', 14, 45);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Left Column
    doc.text(`Unit Name: ${dataToUse.unit_name || dataToUse.name || 'N/A'}`, 14, 52);
    doc.text(`Lecturer: ${dataToUse.lecturer || 'N/A'}`, 14, 57);
    doc.text(`Venue: ${dataToUse.venue || 'N/A'}`, 14, 62);
    
    // Right Column
    const rightColX = pageWidth / 2 + 10;
    doc.text(`Date: ${dataToUse.start_time ? new Date(dataToUse.start_time).toLocaleDateString() : new Date().toLocaleDateString()}`, rightColX, 52);
    doc.text(`Class Rep: ${repName || 'Not Set'}`, rightColX, 57);
    doc.text(`Lecturer Status: ${dataToUse.lecturer_present ? 'PRESENT' : 'ABSENT'}`, rightColX, 62);

    // Time Details
    doc.setFont('helvetica', 'italic');
    doc.text(`Scheduled: ${dataToUse.scheduled_start || '-'} to ${dataToUse.scheduled_end || '-'}`, 14, 70);
    doc.text(`Actual Duration: ${dataToUse.start_time ? new Date(dataToUse.start_time).toLocaleTimeString() : '-'} - ${dataToUse.end_time ? new Date(dataToUse.end_time).toLocaleTimeString() : '-'}`, 14, 75);

    const tableData = (dataToUse.attendance || []).map((record: any) => [
      record.student_name,
      record.admission_number,
      record.status.toUpperCase(),
      record.marked_at ? new Date(record.marked_at).toLocaleTimeString() : 'N/A'
    ]);

    autoTable(doc, {
      startY: 82,
      head: [['Student Name', 'Admission Number', 'Status', 'Time Marked']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [0, 0, 0], 
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 'auto' },
        1: { fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 82 }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('This is an electronically generated report from Class Attendance Pro System.', pageWidth / 2, finalY + 20, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, finalY + 25, { align: 'center' });

    doc.save(`Attendance_${dataToUse.unit_name || dataToUse.name || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDownloadUnitReport = async (unitId: number) => {
    try {
      const res = await fetch(`/api/reports/unit/${unitId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.attendance && data.attendance.length > 0) {
          exportToPDF(data);
        } else {
          alert('No attendance records found for this unit yet.');
        }
      } else {
        alert('Failed to fetch report data.');
      }
    } catch (error) {
      console.error('Report error:', error);
      alert('Network error while fetching report.');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen font-mono">INITIALIZING SYSTEM...</div>;

  if (license && !license.isValid) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <ShieldCheck className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold">Subscription Expired</h1>
        <p className="text-neutral-500 max-w-md">
          Your 30-day trial or subscription has ended. Please contact the administrator to renew your license and continue using Class Attendance Pro.
        </p>
        <div className="bg-neutral-100 p-4 rounded-2xl font-mono text-xs">
          EXPIRED ON: {new Date(license.expiry).toLocaleDateString()}
        </div>
      </div>
    );
  }

  const studentLink = `http://${hotspotIP}:3000/`;
  const repLink = `http://${hotspotIP}:3000/rep-portal-access`;
  const lecturerLink = `http://${hotspotIP}:3000/lecturer-portal`;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-black/10 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            REPRESENTATIVE DASHBOARD
          </h1>
          <p className="text-sm text-neutral-500 font-mono italic">Offline Attendance Management System • Rep: {repName || 'Not Set'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {lastSynced && (
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest hidden sm:block">
              Last Synced: {lastSynced.toLocaleTimeString()}
            </div>
          )}
          {license && (
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${license.daysLeft <= 5 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {license.daysLeft} DAYS LEFT
            </div>
          )}
          <button 
            onClick={() => setShowQR(!showQR)}
            className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <QrCode className="w-4 h-4" /> {showQR ? 'HIDE ACCESS' : 'SHOW ACCESS QR'}
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData}
              disabled={refreshing}
              className="p-2 text-neutral-400 hover:text-black dark:hover:text-white transition-colors rounded-xl hover:bg-neutral-100 dark:hover:bg-zinc-800"
              title="Sync Data"
            >
              <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {activeLesson && (
              <button 
                onClick={() => exportToPDF()}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
              >
                <Download className="w-4 h-4" /> DOWNLOAD ATTENDANCE REPORT
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Representative Portal Notices */}
      {announcements.length > 0 && (
        <div className="bg-indigo-50/10 dark:bg-zinc-900/40 border border-indigo-100/30 dark:border-white/10 p-5 rounded-3xl space-y-3">
          <div className="flex items-center gap-1.5 pb-1">
            <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-zinc-500">Superadmin announcements & notices</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.map((ann) => (
              <div 
                key={ann.id}
                className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-black/5 dark:border-white/10 space-y-1.5 shadow-sm text-xs text-left"
              >
                <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400">
                  <span className="uppercase tracking-widest font-black text-indigo-600 dark:text-indigo-400">📢 EXECUTIVE BOARD</span>
                  <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-extrabold text-neutral-800 dark:text-zinc-150 uppercase tracking-tight leading-tight">{ann.title}</h4>
                <p className="text-neutral-600 dark:text-zinc-350 font-normal leading-relaxed">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showQR && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-emerald-100 dark:border-white/10 shadow-xl space-y-6 text-neutral-900 dark:text-zinc-100"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4 text-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-zinc-400">Student Access Link</h3>
              <div className="bg-white p-4 rounded-2xl inline-block border border-zinc-200 shadow-sm">
                <QRCodeSVG value={studentLink} size={150} />
              </div>
              <p className="text-xs font-mono text-neutral-500 dark:text-zinc-400 break-all bg-neutral-50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg border border-black/5 dark:border-white/5">{studentLink}</p>
              <p className="text-[10px] text-neutral-500 dark:text-zinc-400 font-medium">Share this with students to mark attendance</p>
            </div>
            <div className="space-y-4 text-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-zinc-400">Representative Access Link</h3>
              <div className="bg-white p-4 rounded-2xl inline-block border border-zinc-200 shadow-sm">
                <QRCodeSVG value={repLink} size={150} />
              </div>
              <p className="text-xs font-mono text-neutral-500 dark:text-zinc-400 break-all bg-neutral-50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg border border-black/5 dark:border-white/5">{repLink}</p>
              <p className="text-[10px] text-neutral-500 dark:text-zinc-400 font-medium">Keep this private! Use this to manage the class</p>
            </div>
            <div className="space-y-4 text-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 dark:text-zinc-400">Lecturer Access Link</h3>
              <div className="bg-white p-4 rounded-2xl inline-block border border-zinc-200 shadow-sm">
                <QRCodeSVG value={lecturerLink} size={150} />
              </div>
              <p className="text-xs font-mono text-neutral-500 dark:text-zinc-400 break-all bg-neutral-50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg border border-black/5 dark:border-white/5">{lecturerLink}</p>
              <p className="text-[10px] text-neutral-500 dark:text-zinc-400 font-medium">Share this with the lecturer to mark themselves present</p>
            </div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-start gap-3">
            <Wifi className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-1" />
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Hotspot Configuration Guide</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                1. Turn on your phone's <b>Personal Hotspot</b>.<br />
                2. Tell students to connect to your Wi-Fi.<br />
                3. Find your phone's IP address (usually <b>192.168.43.1</b> on Android or <b>172.20.10.1</b> on iPhone).<br />
                4. Update the IP below if it's different so the QR codes work:
              </p>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={hotspotIP}
                  onChange={(e) => setHotspotIP(e.target.value)}
                  className="px-3 py-1 bg-white dark:bg-zinc-850 border border-emerald-200 dark:border-emerald-900/30 rounded-lg text-xs font-mono w-40 text-neutral-900 dark:text-zinc-100"
                  placeholder="e.g. 192.168.43.1"
                />
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">PORT: 3000</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Config */}
        <div className="space-y-6">
          {/* Rep Settings */}
          <motion.section 
            whileHover={{ y: -4, scale: 1.006, transition: { type: 'spring', stiffness: 220, damping: 22 } }}
            className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-xl dark:hover:shadow-neutral-950/40 hover:border-emerald-600/30 dark:hover:border-emerald-500/35 transition-all duration-300 space-y-4 text-neutral-900 dark:text-zinc-100"
          >
            <button 
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-full font-bold uppercase tracking-wider flex items-center justify-between text-xs cursor-pointer focus:outline-none focus:ring-0 select-none pb-1"
            >
              <span className="flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                REP PROFILE & DETAILS
              </span>
              <span>
                {isProfileOpen ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
              </span>
            </button>

            {isProfileOpen && (
              <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/10">
                {/* Avatar Selector */}
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div 
                    onClick={() => document.getElementById('profile-avatar-input')?.click()}
                    className="relative group w-20 h-20 bg-neutral-100 dark:bg-zinc-800 rounded-full flex items-center justify-center cursor-pointer overflow-hidden border-2 border-emerald-600/20 hover:border-emerald-600 transition-all shadow-inner"
                    title="Click to change profile picture"
                  >
                    {profile.rep_avatar ? (
                      <img 
                        src={profile.rep_avatar} 
                        alt="Rep Avatar" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-neutral-400 dark:text-zinc-500">
                        <UserCircle className="w-10 h-10 stroke-[1.5]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 group-hover:opacity-100 opacity-0 transition-opacity flex items-center justify-center text-[9px] font-bold text-white uppercase tracking-wider text-center p-1 font-mono">
                      EDIT PIC
                    </div>
                  </div>
                  <input 
                    id="profile-avatar-input"
                    type="file" 
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <span className="text-[10px] text-neutral-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Click circle to upload photo</span>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 dark:text-zinc-500 ml-1">Rep Name</label>
                    <input 
                      className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                      placeholder="Full Name (Class Rep)"
                      value={profile.rep_name}
                      onChange={e => setProfile({...profile, rep_name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 dark:text-zinc-500 ml-1">Personal Email</label>
                    <input 
                      type="email"
                      className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                      placeholder="e.g. shemomondi746@gmail.com"
                      value={profile.rep_email}
                      onChange={e => setProfile({...profile, rep_email: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 dark:text-zinc-500 ml-1">Phone Number</label>
                    <input 
                      type="tel"
                      className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                      placeholder="e.g. 0712345678"
                      value={profile.rep_phone}
                      onChange={e => setProfile({...profile, rep_phone: e.target.value})}
                      required
                    />
                  </div>

                  <div className="pt-4 border-t border-black/5 dark:border-white/10 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 dark:text-zinc-300">
                      <Lock className="w-3.5 h-3.5 text-neutral-400" /> Portal Passwords
                    </h3>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-400 dark:text-zinc-500 ml-1">Rep Password</label>
                      <div className="relative">
                        <input 
                          type={showRepPassword ? "text" : "password"}
                          className="w-full pl-4 pr-10 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-black/10"
                          placeholder="Rep Password"
                          value={profile.rep_password}
                          onChange={e => setProfile({...profile, rep_password: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRepPassword(!showRepPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                        >
                          {showRepPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-400 dark:text-zinc-500 ml-1">Lecturer Password</label>
                      <div className="relative">
                        <input 
                          type={showLecturerPassword ? "text" : "password"}
                          className="w-full pl-4 pr-10 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-black/10"
                          placeholder="Lecturer Password"
                          value={profile.lecturer_password}
                          onChange={e => setProfile({...profile, lecturer_password: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowLecturerPassword(!showLecturerPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                        >
                          {showLecturerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-2.5 bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl text-sm font-bold hover:bg-neutral-800 dark:hover:bg-zinc-200 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    Save Profile & Passwords
                  </button>
                </form>
              </div>
            )}
          </motion.section>

          {/* OTP Settings Card */}
          <motion.section 
            whileHover={{ y: -4, scale: 1.006, transition: { type: 'spring', stiffness: 220, damping: 22 } }}
            className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-xl dark:hover:shadow-neutral-950/40 hover:border-emerald-600/30 dark:hover:border-emerald-500/35 transition-all duration-300 space-y-4 text-neutral-900 dark:text-zinc-100"
          >
            <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Limits & Thresholds Configuration
            </h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-400 dark:text-zinc-500 ml-1">OTP Expiry (Minutes)</label>
                <input 
                  type="number"
                  min="1"
                  max="180"
                  className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                  placeholder="e.g. 20"
                  value={profile.otp_duration_mins}
                  onChange={e => setProfile({...profile, otp_duration_mins: e.target.value})}
                  required
                />
                <span className="text-[9px] text-neutral-400 dark:text-zinc-500 ml-1 block">Students must mark presence within this window after system initialized.</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-neutral-400 dark:text-zinc-500 ml-1">Late Attendance Threshold (Minutes)</label>
                <input 
                  type="number"
                  min="0"
                  max="180"
                  className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                  placeholder="e.g. 10"
                  value={profile.late_threshold_mins || ''}
                  onChange={e => setProfile({...profile, late_threshold_mins: e.target.value})}
                  required
                />
                <span className="text-[9px] text-neutral-400 dark:text-zinc-500 ml-1 block">Submissions after this duration from the start of the lesson will be automatically flagged as 'Late'.</span>
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
              >
                Save Limits Configuration
              </button>
            </form>
          </motion.section>

          {/* Add Student */}
          <motion.section 
            whileHover={{ y: -4, scale: 1.006, transition: { type: 'spring', stiffness: 220, damping: 22 } }}
            className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-xl dark:hover:shadow-neutral-950/40 hover:border-emerald-600/30 dark:hover:border-emerald-500/35 transition-all duration-300 text-neutral-900 dark:text-zinc-100"
          >
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Register Student
              </span>
              <button
                type="button"
                onClick={() => setShowAcademicSettingsModal(true)}
                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline uppercase tracking-wider"
              >
                ⚙️ Setup Academic Details
              </button>
            </h2>
            <form onSubmit={handleAddStudent} className="space-y-3">
              <input 
                className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                placeholder="Full Name"
                value={newStudent.name}
                onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                required
              />
              <input 
                className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10 font-mono"
                placeholder="Admission Number"
                value={newStudent.admission_number}
                onChange={e => setNewStudent({...newStudent, admission_number: e.target.value})}
                required
              />
              
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#666] dark:text-zinc-400 block ml-0.5 mb-0.5">Department Selection</label>
                  <select
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={newStudent.department_id}
                    onChange={e => setNewStudent({...newStudent, department_id: e.target.value, course_id: ''})}
                  >
                    <option value="">All Departments (No Filter)</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#666] dark:text-zinc-400 block ml-0.5 mb-1">Course Major</label>
                    <select
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={newStudent.course_id}
                      onChange={e => setNewStudent({...newStudent, course_id: e.target.value})}
                      required
                    >
                      <option value="">Select Course</option>
                      {courses
                        .filter(c => !newStudent.department_id || Number(c.department_id) === Number(newStudent.department_id))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))
                      }
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#666] dark:text-zinc-400 block ml-0.5 mb-1">Intake Group</label>
                    <select
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={newStudent.intake}
                      onChange={e => setNewStudent({...newStudent, intake: e.target.value})}
                      required
                    >
                      <option value="">Select Intake</option>
                      {intakes.map(i => (
                        <option key={i.id} value={i.name}>{i.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-2 bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl text-sm font-medium hover:bg-neutral-800 dark:hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 shadow-sm">
                <Plus className="w-4 h-4" /> Add to Registry
              </button>
            </form>
          </motion.section>

          {/* Batch Import Student List */}
          <motion.section 
            whileHover={{ y: -4, scale: 1.006, transition: { type: 'spring', stiffness: 220, damping: 22 } }}
            className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-xl dark:hover:shadow-neutral-950/40 hover:border-emerald-600/30 dark:hover:border-emerald-500/35 transition-all duration-300 text-neutral-900 dark:text-zinc-100 space-y-4 animate-fade-in"
          >
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Batch Roster Import
            </h2>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Drag-and-drop or select a roster file. Target photos of attendance sheets to scan via <span className="font-bold text-emerald-600 font-mono">Gemini AI</span>, or upload standard texts/CSVs.
            </p>

            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => document.getElementById('roster-import-input')?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors duration-150 flex flex-col items-center justify-center gap-2 ${
                isDragOver ? 'border-emerald-500 bg-emerald-50/20' : 'border-black/10 dark:border-white/10 hover:border-emerald-600/55'
              }`}
            >
              <Upload className="w-6 h-6 text-neutral-400 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-semibold text-neutral-600 dark:text-zinc-400">
                {importImageName || "Click to select, or drag-and-drop file"}
              </span>
              <span className="text-[10px] text-neutral-400">Support images, photos, .csv, .txt</span>
              <input 
                id="roster-import-input"
                type="file"
                className="hidden"
                accept="image/*,.txt,.csv"
                onChange={(e) => { if (e.target.files && e.target.files[0]) handleFileChange(e.target.files[0]); }}
              />
            </div>

            {/* Paste Box alternative */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 block ml-0.5">Or Paste Unstructured Student List</label>
              <textarea
                value={importText}
                onChange={(e) => { setImportText(e.target.value); setImportImageBase64(null); setImportImageName(''); }}
                placeholder="Example:&#10;John Smith, CIT/11/2024&#10;Alice Johnson CIT/12/2024"
                rows={3}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-800 text-xs border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono leading-relaxed text-neutral-900 dark:text-zinc-100"
              />
            </div>

            {importedStatus && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                importedStatus.success 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30' 
                  : 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 border border-red-100 dark:border-red-900/30'
              }`}>
                {importedStatus.message}
              </div>
            )}

            <button
              onClick={() => handleBatchImport()}
              disabled={importLoading}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {importLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning & Parsing...
                </>
              ) : importImageBase64 ? (
                <>
                  ✨ Scan & Register with Gemini AI
                </>
              ) : (
                <>
                  Import Student List
                </>
              )}
            </button>
          </motion.section>

          {/* Add Unit */}
          <motion.section 
            whileHover={{ y: -4, scale: 1.006, transition: { type: 'spring', stiffness: 220, damping: 22 } }}
            className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-xl dark:hover:shadow-neutral-950/40 hover:border-emerald-600/30 dark:hover:border-emerald-500/35 transition-all duration-300 text-neutral-900 dark:text-zinc-100"
          >
            <h2 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Define Unit
              </span>
              <button
                type="button"
                onClick={() => setShowAcademicSettingsModal(true)}
                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline uppercase tracking-wider"
              >
                ⚙️ Setup Academic Details
              </button>
            </h2>

            {/* Toggle tabs for manual entry vs AI image analysis */}
            <div className="flex bg-neutral-100 dark:bg-zinc-800 p-1 rounded-xl mb-4 gap-1">
              <button
                type="button"
                onClick={() => setActiveUnitTab('manual')}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  activeUnitTab === 'manual' 
                    ? 'bg-white dark:bg-zinc-700 shadow-sm text-neutral-900 dark:text-white' 
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                📝 Manual Setup
              </button>
              <button
                type="button"
                onClick={() => setActiveUnitTab('ai')}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeUnitTab === 'ai' 
                    ? 'bg-white dark:bg-zinc-700 shadow-sm text-neutral-900 dark:text-white' 
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                ✨ AI Ingestion Map
              </button>
            </div>

            {activeUnitTab === 'manual' ? (
              <form onSubmit={handleAddUnit} className="space-y-3">
                <input 
                  className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                  placeholder="Unit Name (e.g. Computer Science)"
                  value={newUnit.name}
                  onChange={e => setNewUnit({...newUnit, name: e.target.value})}
                  required
                />
                <input 
                  className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                  placeholder="Lecturer Name"
                  value={newUnit.lecturer}
                  onChange={e => setNewUnit({...newUnit, lecturer: e.target.value})}
                  required
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#666] dark:text-zinc-400 block ml-0.5 mb-1">Department</label>
                    <select
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={newUnit.department_id}
                      onChange={e => setNewUnit({...newUnit, department_id: e.target.value})}
                      required
                    >
                      <option value="">Select Dept</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#666] dark:text-zinc-400 block ml-0.5 mb-1">Intake</label>
                    <select
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={newUnit.intake}
                      onChange={e => setNewUnit({...newUnit, intake: e.target.value})}
                      required
                    >
                      <option value="">Select Intake</option>
                      {intakes.map(i => (
                        <option key={i.id} value={i.name}>{i.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full py-2 bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl text-sm font-medium hover:bg-neutral-800 dark:hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <Plus className="w-4 h-4" /> Register Unit
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-500/10 text-[10px] text-emerald-800 dark:text-emerald-400 leading-relaxed">
                  💡 <strong>Multilevel AI Ingestion:</strong> Upload a curriculum layout image, a department flowchart, or a syllabus list. Gemini AI will analyze the relations and create:
                  <div className="font-semibold mt-1">Departments ➔ Course Majors ➔ Course Units</div>
                  populated together instantly.
                </div>

                <div 
                  className="border-2 border-dashed border-neutral-200 dark:border-white/10 hover:border-emerald-500/30 rounded-2xl p-5 text-center relative transition-all duration-200 bg-neutral-50/50 dark:bg-neutral-950/20"
                >
                  <input 
                    type="file" 
                    accept="image/*"
                    disabled={curriculumAnalyzing}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCurriculumAnalysisImage(file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                  />
                  <Upload className="w-5 h-5 mx-auto text-neutral-400 mb-1.5" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                    {curriculumAnalyzing ? "Reading image..." : "Upload Syllabus / Chart Image"}
                  </span>
                  <p className="text-[9px] text-neutral-400 mt-0.5">Click or drag & drop file to analyze</p>
                </div>

                {curriculumAnalyzing && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" />
                    <span className="text-[11px] font-medium text-neutral-600 dark:text-zinc-300">Evaluating tree & storing units...</span>
                  </div>
                )}

                {curriculumStatus && (
                  <div className={`p-3 rounded-xl text-xs space-y-1.5 border ${
                    curriculumStatus.success 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-900/40' 
                      : 'bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-300 border-red-200/50 dark:border-red-900/40'
                  }`}>
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[9px]">
                      {curriculumStatus.success ? "✓ Processed Successfully" : "✗ Analysis Failed"}
                    </div>
                    <p className="font-medium text-[11px]">{curriculumStatus.message}</p>
                    {curriculumStatus.details && curriculumStatus.details.length > 0 && (
                      <div className="pt-1.5 border-t border-black/5 dark:border-white/5 space-y-1 max-h-[120px] overflow-y-auto font-mono text-[9px] text-neutral-500 dark:text-zinc-400">
                        {curriculumStatus.details.map((line, idx) => (
                          <div key={idx} className="flex gap-1">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                            <span>{line}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={() => setCurriculumStatus(null)}
                      className="text-[9px] font-bold underline text-neutral-400 hover:text-neutral-600 block pt-0.5 cursor-pointer"
                    >
                      Clear Status
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.section>

          {/* Start Lesson */}
          <motion.section 
            whileHover={{ y: -4, scale: 1.006, transition: { type: 'spring', stiffness: 220, damping: 22 } }}
            className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-xl dark:hover:shadow-neutral-950/40 hover:border-emerald-600/30 dark:hover:border-emerald-500/35 transition-all duration-300 text-neutral-900 dark:text-zinc-100"
          >
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Initialize Lesson
            </h2>
            {units.length === 0 ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 text-amber-500" />
                <div>
                  <p className="font-bold">No Units Defined</p>
                  <p className="mt-1">You must register at least one unit above before you can start a lesson.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleStartLesson} className="space-y-3">
                <select 
                  className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                  value={lessonConfig.unit_id}
                  onChange={e => setLessonConfig({...lessonConfig, unit_id: e.target.value})}
                  required
                >
                  <option value="" className="dark:bg-zinc-900">Select Unit</option>
                  {units.map(u => <option key={u.id} value={u.id} className="dark:bg-zinc-900">{u.name}</option>)}
                </select>
                <input 
                  className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                  placeholder="Venue (e.g. Hall 4)"
                  value={lessonConfig.venue}
                  onChange={e => setLessonConfig({...lessonConfig, venue: e.target.value})}
                  required
                />
                <input 
                  className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                  type="number"
                  placeholder="Duration (mins)"
                  value={lessonConfig.duration}
                  onChange={e => setLessonConfig({...lessonConfig, duration: e.target.value})}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 dark:text-zinc-500 ml-1">Start Time</label>
                    <input 
                      type="time"
                      className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                      value={lessonConfig.scheduled_start}
                      onChange={e => setLessonConfig({...lessonConfig, scheduled_start: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 dark:text-zinc-500 ml-1">End Time</label>
                    <input 
                      type="time"
                      className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                      value={lessonConfig.scheduled_end}
                      onChange={e => setLessonConfig({...lessonConfig, scheduled_end: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <Play className="w-4 h-4" /> Start Session
                </button>
              </form>
            )}
          </motion.section>
        </div>

        {/* Right Column: Active Session & Attendance */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {activeLesson ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Active Session Header */}
                <div className="bg-black text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-60">Active Session</span>
                        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">{activeLesson.unit_name}</h3>
                        <p className="text-emerald-400 font-mono text-sm">{activeLesson.lecturer}</p>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1">
                        <div className="flex items-center gap-2 text-sm opacity-80">
                          <MapPin className="w-4 h-4" /> {activeLesson.venue}
                        </div>
                        <div className="flex items-center gap-2 text-sm opacity-80">
                          <Clock className="w-4 h-4" /> {new Date(activeLesson.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(activeLesson.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="text-[10px] opacity-60 font-mono">
                          {activeLesson.duration} Mins Total
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mt-8">
                      {/* OTP Status */}
                      <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10">
                        <div className="text-[10px] font-bold uppercase text-emerald-400 mb-2">OTP Status</div>
                        {!activeLesson.otp_enabled ? (
                          <button 
                            onClick={handleEnableOTP}
                            className="w-full py-2 bg-white text-black rounded-xl text-[10px] sm:text-xs font-bold hover:bg-neutral-200 transition-all flex items-center justify-center gap-1"
                          >
                            <KeyRound className="w-3 h-3" /> ENABLE
                          </button>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="text-emerald-400 text-[10px] sm:text-xs font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> ACTIVE
                            </div>
                            <div className="text-[10px] font-mono opacity-60">
                              {timeLeft.otp === '00:00' ? (
                                <span className="text-red-400 font-bold">EXPIRED</span>
                              ) : (
                                <>Ends: <span className="text-white">{timeLeft.otp}</span></>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Lecturer OTP */}
                      <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10">
                        <div className="text-[10px] font-bold uppercase text-emerald-400 mb-2">Lecturer OTP</div>
                        <div className="font-mono text-xl font-black tracking-widest text-white">
                          {timeLeft.otp === '00:00' ? (
                            <span className="text-red-400/50 text-xs">HIDDEN</span>
                          ) : (
                            activeLesson.lecturer_otp
                          )}
                        </div>
                      </div>

                      {/* Lecturer Status */}
                      <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10">
                        <div className="text-[10px] font-bold uppercase text-emerald-400 mb-2">Lecturer Status</div>
                        {activeLesson.lecturer_present ? (
                          <div className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> PRESENT
                          </div>
                        ) : (
                          <div className="text-neutral-500 text-[10px] font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PENDING
                          </div>
                        )}
                      </div>

                      {/* Session Timer */}
                      <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10">
                        <div className="text-[10px] font-bold uppercase text-emerald-400 mb-2">Session Timer</div>
                        <div className="flex items-end gap-1">
                          <div className="text-xl sm:text-2xl font-mono font-bold text-white leading-none">{timeLeft.total}</div>
                          <div className="text-[8px] font-mono opacity-50">LEFT</div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10 flex items-center justify-around col-span-2 lg:col-span-1">
                        <button 
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to RESET all attendance for this session? This will wipe current progress.')) {
                              await handleRestartSession();
                            }
                          }}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
                          title="Reset Session"
                        >
                          <RotateCcw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                          onClick={fetchData}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
                          title="Refresh Data"
                          disabled={refreshing}
                        >
                          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Decorative Background Element */}
                  <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
                </div>

                 {/* Attendance List (OTP Distribution) */}
                 <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-neutral-200 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden text-neutral-900 dark:text-zinc-100">
                   <div className="p-5 border-b border-black/5 dark:border-white/10 flex justify-between items-center bg-neutral-50/50 dark:bg-zinc-800/50">
                     <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                       <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> OTP DISTRIBUTION CENTER ({activeLesson.attendance.filter(a => a.status === 'present' || a.status === 'late').length}/{activeLesson.attendance.length})
                     </h4>
                     <button onClick={fetchData} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors disabled:opacity-50" disabled={refreshing}>
                       <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                     </button>
                   </div>
                   <div className="px-5 py-3 border-b border-black/5 dark:border-white/10 bg-neutral-50/20 dark:bg-zinc-900/20">
                     <div className="relative">
                       <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                       <input
                         type="text"
                         value={activeSessionSearchQuery}
                         onChange={e => setActiveSessionSearchQuery(e.target.value)}
                         placeholder="Search active session student by admission or name..."
                         className="w-full pl-9 pr-4 py-2 bg-neutral-100 dark:bg-zinc-950 text-neutral-900 dark:text-zinc-100 placeholder-neutral-400 dark:placeholder-zinc-500 text-sm rounded-xl border border-neutral-300 dark:border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all"
                       />
                     </div>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                       <thead>
                         <tr className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-zinc-500 font-mono border-b border-black/5 dark:border-white/10">
                           <th className="px-6 py-4 font-medium">Student Name</th>
                           <th className="px-6 py-4 font-medium">Admission</th>
                           <th className="px-6 py-4 font-medium">OTP Code (Give to Student)</th>
                           <th className="px-6 py-4 font-medium">Status</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-black/5 dark:divide-white/10">
                         {(() => {
                           const filteredRecords = activeLesson.attendance.filter(record => 
                             record.student_name.toLowerCase().includes(activeSessionSearchQuery.toLowerCase()) ||
                             record.admission_number.toLowerCase().includes(activeSessionSearchQuery.toLowerCase())
                           );
                           return filteredRecords.length > 0 ? filteredRecords.map(record => (
                             <tr key={record.id} className="group hover:bg-neutral-50 dark:hover:bg-zinc-800 transition-colors">
                               <td className="px-6 py-4">
                                 <div className="text-sm font-bold">{record.student_name}</div>
                               </td>
                            <td className="px-6 py-4">
                              <div className="text-xs font-mono text-neutral-500">{record.admission_number}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {timeLeft.otp === '00:00' ? (
                                  <div className="text-[10px] font-bold uppercase text-red-400/50 bg-red-400/5 px-3 py-1 rounded-lg border border-red-400/10">
                                    Expired
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-lg font-black font-mono tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm">
                                      {record.otp}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(record.otp);
                                        alert(`OTP ${record.otp} copied for ${record.student_name}`);
                                      }}
                                      className="p-2 hover:bg-emerald-200 dark:hover:bg-zinc-800/40 rounded-lg text-emerald-700 dark:text-emerald-400 transition-colors"
                                      title="Copy OTP"
                                    >
                                      <KeyRound className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {record.status === 'present' ? (
                                <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">
                                  <CheckCircle className="w-3 h-3" /> PRESENT
                                </span>
                              ) : record.status === 'late' ? (
                                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-full border border-amber-200/50 dark:border-amber-900/30">
                                  <Clock className="w-3 h-3" /> LATE
                                </span>
                              ) : record.status === 'absent' ? (
                                <span className="flex items-center gap-1 text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded-full">
                                  <XCircle className="w-3 h-3" /> ABSENT
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-neutral-400 text-xs font-bold animate-pulse bg-neutral-100 px-2 py-1 rounded-full">
                                  <Clock className="w-3 h-3" /> PENDING
                                </span>
                              )}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-xs text-neutral-400 italic">
                              No students matched the search query in this active lesson session.
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-black/5 rounded-3xl bg-neutral-50/50">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                  <Play className="w-8 h-8 text-neutral-300" />
                </div>
                <h3 className="text-lg font-bold">No Active Session</h3>
                <p className="text-sm text-neutral-500 max-w-xs mt-2">
                  Configure a unit and click "Start Session" to begin tracking attendance for your class.
                </p>
              </div>
            )}
          </AnimatePresence>

          {/* Registry Lists (Always Visible) */}
          <div className="space-y-6 pt-6 border-t border-black/5">
            {/* ABSENCE MONITOR & WARNING BOARD */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-neutral-200 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden text-neutral-900 dark:text-zinc-100">
              <div className="p-5 border-b border-black/5 dark:border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-red-50/10 dark:bg-red-950/5">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4" /> Absence Alert Monitor (Missed Classes &gt;= 3)
                  </h4>
                  <p className="text-[10px] text-neutral-400 mt-1 font-mono">Real-time automatic consecutive missed lesson warnings</p>
                </div>
              </div>
              
              <div className="p-5">
                {warningsList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400 italic flex flex-col items-center justify-center gap-2">
                    <CheckCircle className="w-8 h-8 text-emerald-555 opacity-60" />
                    <span>All registered students are active. No warnings waiting for superadmin review.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-black/5 dark:divide-white/10 max-h-72 overflow-y-auto pr-1">
                    {warningsList.map((warn) => (
                      <div key={warn.id} className="py-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 first:pt-0 last:pb-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-neutral-900 dark:text-zinc-100">{warn.student_name}</span>
                            <span className="text-[10px] font-mono bg-neutral-100 dark:bg-zinc-850 text-neutral-500 px-2 py-0.5 rounded-md">{warn.admission_number}</span>
                          </div>
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1 font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> {warn.reason} ({warn.absent_count} absences)
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {warn.status === 'pending_rep' ? (
                            <>
                              <button
                                onClick={() => handleForwardWarning(warn.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl shadow-sm cursor-pointer transition-colors flex items-center gap-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Forward to Superadmin
                              </button>
                              <button
                                onClick={() => handleClearWarning(warn.id)}
                                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                                title="Dismiss Warning"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-950/60 uppercase tracking-wider">
                              ● Forwarded to Superadmin
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* WEEKLY & MONTHLY REPORTS CORNER */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-neutral-200 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden text-neutral-900 dark:text-zinc-100">
              <div className="p-5 border-b border-black/5 dark:border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-neutral-50/50 dark:bg-zinc-800/50">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Attendance Report Export Center
                  </h4>
                  <p className="text-[10px] text-neutral-400 mt-1">Export landscape class attendance matrix sheets</p>
                </div>
                {/* Friday Greeting Flare */}
                {new Date().getDay() === 5 && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 text-[10px] font-bold rounded-full animate-bounce">
                    🎉 Happy Friday!
                  </span>
                )}
              </div>
              <div className="p-5 space-y-4">
                <div className="flex bg-neutral-100 dark:bg-zinc-800/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setReportType('weekly')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      reportType === 'weekly' 
                        ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                        : 'text-neutral-500 hover:text-neutral-800 dark:text-zinc-400 dark:hover:text-zinc-100'
                    }`}
                  >
                    Weekly Date-Range
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportType('monthly')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      reportType === 'monthly' 
                        ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                        : 'text-neutral-500 hover:text-neutral-800 dark:text-zinc-400 dark:hover:text-zinc-100'
                    }`}
                  >
                    Monthly Period
                  </button>
                </div>

                <p className="text-xs text-neutral-500 dark:text-zinc-400">
                  {reportType === 'weekly' 
                    ? 'Select start and end dates to accumulate all lesson logs into a single condensed PDF attendance matrix sheet.'
                    : 'Select a month and year to generate a landscape accumulated monthly report containing every lecture during that month.'}
                </p>

                {reportType === 'weekly' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-400 dark:text-zinc-500 ml-1">Start Date</label>
                      <input 
                        type="date"
                        value={weeklyFilter.start}
                        onChange={(e) => setWeeklyFilter({...weeklyFilter, start: e.target.value})}
                        className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 border border-black/5 dark:border-white/10 rounded-xl text-xs text-neutral-900 dark:text-zinc-100 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-400 dark:text-zinc-500 ml-1">End Date</label>
                      <input 
                        type="date"
                        value={weeklyFilter.end}
                        onChange={(e) => setWeeklyFilter({...weeklyFilter, end: e.target.value})}
                        className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 border border-black/5 dark:border-white/10 rounded-xl text-xs text-neutral-900 dark:text-zinc-100 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-400 dark:text-zinc-500 ml-1">Month</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 border border-black/5 dark:border-white/10 rounded-xl text-xs text-neutral-900 dark:text-zinc-100 focus:outline-none"
                      >
                        <option value={1}>January</option>
                        <option value={2}>February</option>
                        <option value={3}>March</option>
                        <option value={4}>April</option>
                        <option value={5}>May</option>
                        <option value={6}>June</option>
                        <option value={7}>July</option>
                        <option value={8}>August</option>
                        <option value={9}>September</option>
                        <option value={10}>October</option>
                        <option value={11}>November</option>
                        <option value={12}>December</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-400 dark:text-zinc-500 ml-1">Year</label>
                      <input 
                        type="number"
                        min={2020}
                        max={2035}
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 border border-black/5 dark:border-white/10 rounded-xl text-xs text-neutral-900 dark:text-zinc-100 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="w-full py-2.5 bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl text-xs font-bold hover:bg-neutral-800 dark:hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" /> Export {reportType === 'weekly' ? 'Weekly' : 'Monthly'} Accumulated Matrix (PDF)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight">System Registry</h3>
              <div className="text-[10px] font-mono text-neutral-400 uppercase">Manage Students & Units</div>
            </div>

            {/* Student Registry List */}
            <div className="bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 rounded-3xl border border-neutral-200 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="p-5 border-b border-black/5 dark:border-white/10 flex justify-between items-center bg-neutral-50/50 dark:bg-zinc-800/50">
                <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Registered Students ({students.length})
                </h4>
              </div>
              <div className="px-5 py-3 border-b border-black/5 dark:border-white/10 bg-neutral-50/20 dark:bg-zinc-900/20">
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={e => setStudentSearchQuery(e.target.value)}
                    placeholder="Search students by admission number or full name..."
                    className="w-full pl-9 pr-4 py-2 bg-neutral-100 dark:bg-zinc-950 text-neutral-900 dark:text-zinc-100 placeholder-neutral-400 dark:placeholder-zinc-500 text-sm rounded-xl border border-neutral-300 dark:border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-zinc-500 font-mono border-b border-black/5 dark:border-white/10">
                      <th className="px-6 py-4 font-medium">Name</th>
                      <th className="px-6 py-4 font-medium">Admission Number</th>
                      <th className="px-6 py-4 font-medium">Course Major</th>
                      <th className="px-6 py-4 font-medium">Intake Group</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/10">
                    {(() => {
                      const filtered = students.filter(s => 
                        s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                        s.admission_number.toLowerCase().includes(studentSearchQuery.toLowerCase())
                      );
                      return filtered.length > 0 ? filtered.map(s => (
                        <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-zinc-800 transition-colors">
                          <td className="px-6 py-4">
                            {editingStudent?.id === s.id ? (
                              <input 
                                className="w-full px-2 py-1 border rounded text-sm bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border-neutral-300 dark:border-white/10"
                                value={editingStudent.name}
                                onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                              />
                            ) : (
                              <span className="text-sm font-medium">{s.name}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingStudent?.id === s.id ? (
                              <input 
                                className="w-full px-2 py-1 border rounded text-xs font-mono bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border-neutral-300 dark:border-white/10"
                                value={editingStudent.admission_number}
                                onChange={e => setEditingStudent({...editingStudent, admission_number: e.target.value})}
                              />
                            ) : (
                              <span className="text-xs font-mono text-neutral-500">{s.admission_number}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingStudent?.id === s.id ? (
                              <select
                                className="px-2 py-1 border rounded text-xs bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border-neutral-300 dark:border-white/10"
                                value={editingStudent.course_id || ''}
                                onChange={e => setEditingStudent({...editingStudent, course_id: Number(e.target.value)})}
                              >
                                <option value="">Select Course</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-1 bg-emerald-50 dark:bg-emerald-950/45 rounded-lg text-emerald-850 dark:text-emerald-300">{s.course_name || '—'}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingStudent?.id === s.id ? (
                              <select
                                className="px-2 py-1 border rounded text-xs bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border-neutral-300 dark:border-white/10"
                                value={editingStudent.intake || ''}
                                onChange={e => setEditingStudent({...editingStudent, intake: e.target.value})}
                              >
                                <option value="">Select Intake</option>
                                {intakes.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                              </select>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-1 bg-purple-50 dark:bg-purple-950/45 rounded-lg text-purple-850 dark:text-purple-300">{s.intake || '—'}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {editingStudent?.id === s.id ? (
                                <>
                                  <button onClick={handleUpdateStudent} className="text-emerald-600 hover:text-emerald-700 text-xs font-bold">SAVE</button>
                                  <button onClick={() => setEditingStudent(null)} className="text-neutral-400 hover:text-neutral-500 text-xs font-bold">CANCEL</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => setEditingStudent(s)} className="p-1.5 hover:bg-black/5 rounded-lg text-neutral-400 hover:text-black transition-colors-colors">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteStudent(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 transition-colors-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-sm text-neutral-400 italic">
                            No matching students found in registry helper list.
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Unit Registry List */}
            <div className="bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 rounded-3xl border border-neutral-200 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="p-5 border-b border-black/5 dark:border-white/10 flex justify-between items-center bg-neutral-50/50 dark:bg-zinc-800/50">
                <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Registered Units ({units.length})
                </h4>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-zinc-500 font-mono border-b border-black/5 dark:border-white/10">
                      <th className="px-6 py-4 font-medium">Unit Name</th>
                      <th className="px-6 py-4 font-medium">Lecturer</th>
                      <th className="px-6 py-4 font-medium">Department</th>
                      <th className="px-6 py-4 font-medium">Intake Group</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/10">
                    {units.length > 0 ? units.map(u => (
                      <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-zinc-800 transition-colors">
                        <td className="px-6 py-4">
                          {editingUnit?.id === u.id ? (
                            <input 
                              className="w-full px-2 py-1 border rounded text-xs text-[#111827] bg-white dark:bg-zinc-800 border-neutral-300 dark:border-white/10"
                              value={editingUnit.name}
                              onChange={e => setEditingUnit({...editingUnit, name: e.target.value})}
                            />
                          ) : (
                            <span className="text-sm font-medium">{u.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingUnit?.id === u.id ? (
                            <input 
                              className="w-full px-2 py-1 border rounded text-xs text-[#111827] bg-white dark:bg-zinc-805 border-neutral-300 dark:border-white/10"
                              value={editingUnit.lecturer}
                              onChange={e => setEditingUnit({...editingUnit, lecturer: e.target.value})}
                            />
                          ) : (
                            <span className="text-sm text-neutral-500">{u.lecturer}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingUnit?.id === u.id ? (
                            <select
                              className="px-2 py-1 border rounded text-xs bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border-neutral-300 dark:border-white/10"
                              value={editingUnit.department_id || ''}
                              onChange={e => setEditingUnit({...editingUnit, department_id: Number(e.target.value)})}
                            >
                              <option value="">Select Dept</option>
                              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-1 bg-blue-50 dark:bg-blue-950/45 rounded-lg text-blue-850 dark:text-blue-300">{u.department_name || '—'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingUnit?.id === u.id ? (
                            <select
                              className="px-2 py-1 border rounded text-xs bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border-neutral-300 dark:border-white/10"
                              value={editingUnit.intake || ''}
                              onChange={e => setEditingUnit({...editingUnit, intake: e.target.value})}
                            >
                              <option value="">Select Intake</option>
                              {intakes.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                            </select>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-1 bg-purple-50 dark:bg-purple-950/45 rounded-lg text-purple-850 dark:text-purple-300">{u.intake || '—'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {editingUnit?.id === u.id ? (
                              <>
                                <button onClick={handleUpdateUnit} className="text-emerald-600 hover:text-emerald-700 text-xs font-bold">SAVE</button>
                                <button onClick={() => setEditingUnit(null)} className="text-neutral-400 hover:text-neutral-500 text-xs font-bold">CANCEL</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => setEditingUnit(u)} className="p-1.5 hover:bg-black/5 rounded-lg text-neutral-400 hover:text-black transition-colors">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDownloadUnitReport(u.id)} 
                                  className="p-1.5 hover:bg-emerald-50 rounded-lg text-neutral-400 hover:text-emerald-600 transition-colors"
                                  title="Download Latest Report"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteUnit(u.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-neutral-400 italic">
                          No units registered yet. Use the form on the left to add units.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACADEMIC STRUCTURE CONFIGURATION OVERLAY MODAL */}
      {showAcademicSettingsModal && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-md z-[8888] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-white/10 p-6 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto space-y-6 text-neutral-900 dark:text-zinc-100"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold tracking-tight uppercase flex items-center gap-2">
                  <span>⚙️ Academic Structuring Center</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">Configure your university's departments, course lists, and student intakes</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAcademicSettingsModal(false)}
                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-200 transition-colors cursor-pointer text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* REFERENCE GUIDE MAP UPLOADER DROPAREA */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-3xl border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">🗺️ General Academic matrix & Department Flowchart Map</h4>
                  <p className="text-[10px] text-neutral-400">Upload a schematic diagram representing the structural layout of your university's departments</p>
                </div>
                {academicMapImage && (
                  <button 
                    onClick={() => {
                      if(confirm("Remove current academic map?")) {
                        setAcademicMapImage('');
                        fetch('/api/settings/academic-map', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ image: '' })
                        }).then(() => fetchData());
                      }
                    }}
                    className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                  >
                    Clear Map
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="border-2 border-dashed border-neutral-200 dark:border-white/10 rounded-2xl p-4 text-center relative hover:border-emerald-500/30 transition-all">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const base64 = reader.result as string;
                        setAcademicMapImage(base64);
                        fetch('/api/settings/academic-map', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ image: base64 })
                        }).then(() => fetchData());
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  />
                  <Upload className="w-5 h-5 mx-auto text-neutral-400 mb-1" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Drag & drop or Click to Upload Layout Chart</span>
                  <p className="text-[9px] text-neutral-400 mt-0.5">Supports high zoom JPG, PNG, WebP representation</p>
                </div>

                <div className="bg-white dark:bg-zinc-800 border border-neutral-100 dark:border-white/5 rounded-2xl h-[95px] flex items-center justify-center overflow-hidden">
                  {academicMapImage ? (
                    <a href={academicMapImage} target="_blank" rel="noreferrer" className="relative group block w-full h-full">
                      <img src={academicMapImage} alt="Academic Map" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                        🔍 Click to Expand Flowchart
                      </div>
                    </a>
                  ) : (
                    <div className="text-center p-3 text-neutral-400 italic text-[10px]">
                      No flowchart map uploaded. Upload one to provide structural clarity.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* DEPARTMENTS CARD */}
              <div className="bg-neutral-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-neutral-150 dark:border-white/5 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block pb-1 border-b border-neutral-200 dark:border-white/5">
                  📁 Departments
                </span>
                
                <form onSubmit={handleAddDepartment} className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="E.g. Engineering, Computing"
                    value={deptNameInput}
                    onChange={(e) => setDeptNameInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-white/10 rounded-xl text-xs focus:outline-none text-neutral-900 dark:text-zinc-100"
                  />
                  <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-white/10 px-2 py-1.5 rounded-xl text-xs relative hover:bg-neutral-50 dark:hover:bg-zinc-700 transition-colors">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const r = new FileReader();
                          r.onload = () => setDeptImageInput(r.result as string);
                          r.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    <Upload className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="text-[10px] text-neutral-400 truncate flex-grow">
                      {deptImageInput ? "✓ Layout Loaded" : "Optional Dept Banner/Logo"}
                    </span>
                    {deptImageInput && (
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDeptImageInput(null); }}
                        className="text-[9px] text-red-500 hover:underline z-10 font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {deptImageInput && (
                    <div className="h-10 rounded-xl overflow-hidden border border-black/5 flex items-center justify-center bg-black/5 dark:bg-white/5">
                      <img src={deptImageInput} alt="Preview" className="h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-neutral-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-bold rounded-xl transition-all hover:opacity-90 cursor-pointer"
                  >
                    + Add Department
                  </button>
                </form>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-neutral-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search departments..."
                    value={deptSearchQuery}
                    onChange={(e) => setDeptSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-white/10 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {departments.filter(d => d.name.toLowerCase().includes(deptSearchQuery.toLowerCase())).length === 0 ? (
                    <p className="text-[10px] text-neutral-404 italic">No matching departments found.</p>
                  ) : (
                    departments.filter(d => d.name.toLowerCase().includes(deptSearchQuery.toLowerCase())).map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800/60 rounded-xl border border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-2 truncate max-w-[170px]">
                          {d.image_url ? (
                            <img src={d.image_url} alt={d.name} className="w-6 h-6 rounded-lg object-cover shrink-0 border border-black/5" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {d.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-xs font-medium truncate">{d.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDepartment(d.id)}
                          className="p-1 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* COURSES CARD */}
              <div className="bg-neutral-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-neutral-150 dark:border-white/5 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block pb-1 border-b border-neutral-200 dark:border-white/5">
                  🎓 Course Majors
                </span>
                
                <form onSubmit={handleAddCourse} className="space-y-2">
                  <select
                    required
                    value={courseDeptInput}
                    onChange={(e) => setCourseDeptInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-white/10 rounded-xl text-xs focus:outline-none text-neutral-900 dark:text-zinc-100"
                  >
                    <option value="">Select Dept</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="E.g. BSc. Computer Science"
                    value={courseNameInput}
                    onChange={(e) => setCourseNameInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-white/10 rounded-xl text-xs focus:outline-none text-neutral-900 dark:text-zinc-100"
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-neutral-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-bold rounded-xl transition-all hover:opacity-90 cursor-pointer"
                  >
                    + Add Course
                  </button>
                </form>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-neutral-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={courseSearchQuery}
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-white/10 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {courses.filter(c => 
                    c.name.toLowerCase().includes(courseSearchQuery.toLowerCase()) || 
                    c.department_name?.toLowerCase().includes(courseSearchQuery.toLowerCase())
                  ).length === 0 ? (
                    <p className="text-[10px] text-neutral-400 italic">No courses matched search.</p>
                  ) : (
                    courses.filter(c => 
                      c.name.toLowerCase().includes(courseSearchQuery.toLowerCase()) || 
                      c.department_name?.toLowerCase().includes(courseSearchQuery.toLowerCase())
                    ).map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800/60 rounded-xl border border-black/5 dark:border-white/5 gap-2">
                        <div className="flex flex-col truncate">
                          <span className="text-xs font-semibold truncate">{c.name}</span>
                          <span className="text-[9px] text-neutral-405 truncate font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{c.department_name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(c.id)}
                          className="p-1 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-xs cursor-pointer flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* INTAKES CARD */}
              <div className="bg-neutral-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-neutral-150 dark:border-white/5 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block pb-1 border-b border-neutral-200 dark:border-white/5">
                  📅 Student Intakes
                </span>
                
                <form onSubmit={handleAddIntake} className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="E.g. May 2026"
                    value={intakeInput}
                    onChange={(e) => setIntakeInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-white/10 rounded-xl text-xs focus:outline-none text-neutral-900 dark:text-zinc-100"
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-neutral-905 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-bold rounded-xl transition-all hover:opacity-90 cursor-pointer animate-fade-in"
                  >
                    + Add Intake
                  </button>
                </form>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {intakes.length === 0 ? (
                    <p className="text-[10px] text-neutral-405 italic">No intakes configured yet.</p>
                  ) : (
                    intakes.map((i) => (
                      <div key={i.id} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800/60 rounded-xl border border-black/5 dark:border-white/5">
                        <span className="text-xs font-medium truncate max-w-[150px]">{i.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteIntake(i.id)}
                          className="p-1 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const StudentPortal = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activeLesson, setActiveLesson] = useState<ActiveLesson | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isMarked, setIsMarked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [buttonDelay, setButtonDelay] = useState(10);
  const [hasSession, setHasSession] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [studentOtp, setStudentOtp] = useState('');
  const [fetchingOtp, setFetchingOtp] = useState(false);
  const [fetchOtpError, setFetchOtpError] = useState('');
  const [timeLeft, setTimeLeft] = useState<{ total: string, otp: string }>({ total: '00:00', otp: '00:00' });
  const [sessionId] = useState(() => {
    let sid = sessionStorage.getItem('attendance_session_id');
    if (!sid) {
      sid = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('attendance_session_id', sid);
    }
    return sid;
  });

  const handleFetchMyOtp = async (studentId: string) => {
    if (!activeLesson || !studentId) return;
    setFetchingOtp(true);
    setFetchOtpError('');
    try {
      const res = await fetch(`/api/attendance/my-otp?lesson_id=${activeLesson.id}&student_id=${studentId}`);
      const data = await res.json();
      if (res.ok) {
        setStudentOtp(data.otp);
        setOtp(data.otp);
      } else {
        setFetchOtpError(data.error || 'Failed to fetch OTP');
      }
    } catch (e) {
      setFetchOtpError('Connection error fetching OTP');
    } finally {
      setFetchingOtp(false);
    }
  };

  const enterSession = async () => {
    try {
      const res = await fetch('/api/session/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      if (res.ok) {
        setHasSession(true);
        setIsBusy(false);
      } else if (res.status === 429) {
        setIsBusy(true);
      }
    } catch (e) {
      console.error('Session enter error:', e);
    }
  };

  const heartbeat = async () => {
    if (!hasSession) return;
    try {
      const res = await fetch('/api/session/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      if (!res.ok) setHasSession(false);
    } catch (e) {
      console.error('Heartbeat error:', e);
    }
  };

  const fetchStatus = async () => {
    if (!hasSession) {
      await enterSession();
      return;
    }
    const [sRes, lRes] = await Promise.all([
      fetch('/api/students'),
      fetch('/api/lessons/active')
    ]);
    const sData = await sRes.json();
    const lData = await lRes.json();
    setStudents(sData);
    setActiveLesson(lData);

    if (lData && selectedStudent) {
      const record = lData.attendance.find((a: any) => a.student_id === parseInt(selectedStudent));
      if (record?.status === 'present' || record?.status === 'late') setIsMarked(true);
    }

    // Fetch student announcements
    const schId = lData?.school_id || 1;
    try {
      const annRes = await fetch(`/api/announcements/${schId}?audience=students`);
      if (annRes.ok) {
        setAnnouncements(await annRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const hInterval = setInterval(heartbeat, 30000);
    const socket = io();
    socket.on('otp-enabled', () => fetchStatus());
    return () => { 
      clearInterval(hInterval);
      socket.disconnect(); 
    };
  }, [selectedStudent, hasSession]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeLesson?.otp_enabled && buttonDelay > 0 && !isMarked) {
      timer = setInterval(() => {
        setButtonDelay(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeLesson?.otp_enabled, buttonDelay, isMarked]);

  useEffect(() => {
    if (!activeLesson) return;

    const initialLocalTime = Date.now();
    const initialServerTime = new Date(activeLesson.server_time_now || new Date()).getTime();
    const startTimeTime = new Date(activeLesson.start_time).getTime();
    
    // Server-side sets activeLesson.end_time to expiry. If null or invalid, fallback to start_time + duration
    const endTimeFallback = startTimeTime + (Number(activeLesson.duration || 60) * 60 * 1000);
    const endTimeTime = activeLesson.end_time ? new Date(activeLesson.end_time).getTime() : endTimeFallback;
    
    // Calculate total minutes expiration
    const otpDur = Number(activeLesson.otp_duration_mins || 20);
    const otpExpiryTimeTime = startTimeTime + (otpDur * 60 * 1000);

    const formatSeconds = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const updateTimer = () => {
      const elapsed = Date.now() - initialLocalTime;
      const currentServerTime = initialServerTime + elapsed;
      
      const totalSecondsLeft = Math.max(0, Math.round((endTimeTime - currentServerTime) / 1000));
      const otpSecondsLeft = Math.max(0, Math.round((otpExpiryTimeTime - currentServerTime) / 1000));

      setTimeLeft({
        total: formatSeconds(totalSecondsLeft),
        otp: formatSeconds(otpSecondsLeft)
      });

      return { totalSecondsLeft };
    };

    // Run initial time check immediately
    updateTimer();

    const interval = setInterval(() => {
      const { totalSecondsLeft } = updateTimer();
      if (totalSecondsLeft === 0) {
        clearInterval(interval);
        fetchStatus();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeLesson]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLesson || !selectedStudent || submitting || buttonDelay > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: activeLesson.id,
          student_id: parseInt(selectedStudent),
          otp,
          session_id: sessionId
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: 'Attendance marked successfully!' });
        setIsMarked(true);
        // Delay logout so they can see the success screen
        setTimeout(() => {
          setHasSession(false);
          sessionStorage.removeItem('attendance_session_id'); // Clear session to allow next person
        }, 5000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to mark attendance' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Connection error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 pt-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-black dark:bg-zinc-800 text-white dark:text-zinc-200 rounded-3xl shadow-xl mb-4">
          <UserCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight dark:text-zinc-100">Student Portal</h1>
        <p className="text-sm text-neutral-500 dark:text-zinc-400">Mark your attendance for the current session</p>
      </div>

      <AnimatePresence mode="wait">
        {isMarked ? (
          (() => {
            const studentRecord = activeLesson?.attendance?.find((a: any) => a.student_id === parseInt(selectedStudent));
            const isLate = studentRecord?.status === 'late';
            return (
              <motion.div 
                key="success"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={isLate 
                  ? "bg-amber-50 dark:bg-amber-950/20 p-8 rounded-3xl text-center border border-amber-200 dark:border-amber-900/40" 
                  : "bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-3xl text-center border border-emerald-100 dark:border-emerald-900/40"}
              >
                {isLate ? (
                  <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
                ) : (
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                )}
                <h3 className={`text-xl font-bold ${isLate ? 'text-amber-900 dark:text-amber-100' : 'text-emerald-900 dark:text-emerald-100'}`}>
                  {isLate ? "You are marked Late!" : "You are Present!"}
                </h3>
                <p className={`text-sm mt-2 ${isLate ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {isLate 
                    ? `Your attendance for ${activeLesson?.unit_name || 'the unit'} has been successfully recorded, but flagged as LATE because you checked in past the set threshold.`
                    : `Your attendance for ${activeLesson?.unit_name || 'the unit'} has been recorded.`}
                </p>
                <p className={`text-[10px] mt-4 uppercase tracking-widest font-bold ${isLate ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  Auto-logging out in 5s...
                </p>
              </motion.div>
            );
          })()
        ) : isBusy ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-amber-50 dark:bg-amber-950/20 p-8 rounded-3xl text-center border border-amber-100 dark:border-amber-900/40"
          >
            <Users className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-bold text-amber-900 dark:text-amber-100">Server Busy</h3>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">Maximum student capacity reached (10 students). Please wait a moment for someone to finish, then try again.</p>
            <button 
              onClick={enterSession}
              className="mt-6 px-6 py-2 bg-amber-600 dark:bg-amber-700 text-white rounded-xl text-xs font-bold hover:bg-amber-700 dark:hover:bg-amber-600 transition-colors"
            >
              TRY AGAIN
            </button>
          </motion.div>
        ) : !hasSession ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-neutral-100 dark:bg-zinc-900 p-8 rounded-3xl text-center border border-black/5 dark:border-white/10"
          >
            <DoorOpen className="w-10 h-10 text-neutral-400 dark:text-zinc-500 mx-auto mb-3" />
            <h3 className="font-bold dark:text-zinc-100">Ready to Mark?</h3>
            <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-2">Click below to enter the attendance portal. Only 10 students are allowed at a time.</p>
            <button 
              onClick={enterSession}
              className="mt-6 px-8 py-3 bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-2xl text-sm font-bold hover:bg-neutral-800 dark:hover:bg-zinc-200 transition-all active:scale-95 shadow-lg"
            >
              ENTER PORTAL
            </button>
          </motion.div>
        ) : !activeLesson ? (
          <motion.div 
            key="no-lesson"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-neutral-100 dark:bg-zinc-900 p-8 rounded-3xl text-center border border-black/5 dark:border-white/10"
          >
            <Clock className="w-10 h-10 text-neutral-400 dark:text-zinc-500 mx-auto mb-3" />
            <h3 className="font-bold dark:text-zinc-100">Waiting for Session</h3>
            <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-2">No active lesson found. Please wait for the representative to start the session.</p>
          </motion.div>
        ) : (
          <motion.form 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onSubmit={handleSubmit} 
            className="space-y-6"
          >
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm space-y-4">
              
              {/* COUNTDOWN TIMERS */}
              <div className="grid grid-cols-2 gap-3 mb-2 font-sans text-left">
                <div className="bg-neutral-50 dark:bg-zinc-800/40 p-3 rounded-2xl border border-black/5 dark:border-white/5 text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 dark:text-zinc-500 block mb-1">Session Active</span>
                  <span className="text-base font-extrabold font-mono text-neutral-800 dark:text-zinc-100">{timeLeft.total}</span>
                </div>
                <div className="bg-neutral-55 dark:bg-zinc-800/40 p-3 rounded-2xl border border-black/5 dark:border-white/5 text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 dark:text-zinc-500 block mb-1">OTP Expires</span>
                  <span className={`text-base font-extrabold font-mono ${timeLeft.otp === '00:00' ? 'text-neutral-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{timeLeft.otp}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 ml-1">Identity</label>
                <select 
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                  value={selectedStudent}
                  onChange={e => {
                    setSelectedStudent(e.target.value);
                    setStudentOtp('');
                    setFetchOtpError('');
                    if (e.target.value && activeLesson.otp_enabled) {
                      handleFetchMyOtp(e.target.value);
                    }
                  }}
                  required
                >
                  <option value="">Select your name</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.admission_number})</option>
                  ))}
                </select>
              </div>

              {selectedStudent && activeLesson?.otp_enabled && (
                <div className="bg-neutral-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-black/5 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-500 dark:text-zinc-400">Personal OTP Retrieval</span>
                    <button
                      type="button"
                      onClick={() => handleFetchMyOtp(selectedStudent)}
                      disabled={fetchingOtp}
                      className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                    >
                      <RefreshCw className={`w-3 h-3 ${fetchingOtp ? 'animate-spin' : ''}`} />
                      {studentOtp ? 'Refresh Code' : 'Get My OTP'}
                    </button>
                  </div>
                  {studentOtp ? (
                    <div className="text-center bg-white dark:bg-zinc-800 p-3 rounded-xl border border-black/5 dark:border-white/10">
                      <p className="text-[10px] text-neutral-400 dark:text-zinc-500 uppercase tracking-widest font-bold">Your OTP Code</p>
                      <p className="text-2xl font-extrabold font-mono tracking-widest text-emerald-600 dark:text-emerald-400 my-1">{studentOtp}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setOtp(studentOtp);
                          setStatus(null);
                        }}
                        className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        Autofill Code
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-xs text-neutral-400 dark:text-zinc-500">
                      {fetchOtpError ? (
                        <span className="text-red-500 font-medium">{fetchOtpError}</span>
                      ) : (
                        <span>Auto-fetching or click "Get My OTP" to retrieve code</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 ml-1">OTP Code</label>
                <input 
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-2xl text-lg font-mono tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-black/5"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  required
                  disabled={!activeLesson.otp_enabled}
                />
                {!activeLesson.otp_enabled && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Waiting for representative to enable input...
                  </p>
                )}
              </div>
            </div>

            {status && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  status.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
                }`}
              >
                {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {status.message}
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={!activeLesson.otp_enabled || submitting || buttonDelay > 0}
              className="w-full py-4 bg-black text-white rounded-2xl font-bold shadow-lg hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <RotateCcw className="w-5 h-5 animate-spin" />
              ) : buttonDelay > 0 && activeLesson.otp_enabled ? (
                <span>WAIT {buttonDelay}s TO SUBMIT</span>
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              {submitting ? 'SUBMITTING...' : buttonDelay > 0 && activeLesson.otp_enabled ? '' : 'MARK ME PRESENT'}
            </button>

            <div className="text-center">
              <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest">
                Session: {activeLesson.unit_name} • {activeLesson.venue}
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Student Noticeboard */}
      {announcements.length > 0 && (
        <div className="mt-8 pt-8 border-t border-black/5 dark:border-white/10 space-y-4 font-sans">
          <div className="flex items-center gap-1.5 px-1 pb-1">
            <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-bounce" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-zinc-500">Official Noticeboard Notices</h3>
          </div>

          <div className="space-y-3">
            {announcements.map((ann) => (
              <div 
                key={ann.id}
                className="p-4 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm text-xs space-y-1 hover:border-black/10 dark:hover:border-white/20 transition-all text-left"
              >
                <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400">
                  <span className="uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">📢 SCHOOL ADMIN</span>
                  <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-extrabold text-neutral-800 dark:text-zinc-200 uppercase tracking-tight leading-tight">{ann.title}</h4>
                <p className="text-neutral-600 dark:text-zinc-350 font-normal leading-relaxed">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const LecturerPortal = () => {
  const [activeLesson, setActiveLesson] = useState<ActiveLesson | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lecturers, setLecturers] = useState<string[]>([]);
  const [selectedLecturer, setSelectedLecturer] = useState('');
  const [fetchingOtp, setFetchingOtp] = useState(false);
  const [fetchOtpError, setFetchOtpError] = useState('');
  const [lecturerOtp, setLecturerOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState<{ total: string, otp: string }>({ total: '00:00', otp: '00:00' });

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/lessons/active');
      const lData = await res.json();
      setActiveLesson(lData);

      // Fetch relevant lecturer announcements
      const schId = lData?.school_id || 1;
      const annRes = await fetch(`/api/announcements/${schId}?audience=lecturers`);
      if (annRes.ok) {
        setAnnouncements(await annRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLecturers = async () => {
    try {
      const res = await fetch('/api/units/lecturers');
      if (res.ok) {
        setLecturers(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLecturers();
    const socket = io();
    socket.on('attendance-updated', () => fetchStatus());
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (!activeLesson) return;

    const initialLocalTime = Date.now();
    const initialServerTime = new Date(activeLesson.server_time_now || new Date()).getTime();
    const startTimeTime = new Date(activeLesson.start_time).getTime();
    
    // Server-side sets activeLesson.end_time to expiry. If null or invalid, fallback to start_time + duration
    const endTimeFallback = startTimeTime + (Number(activeLesson.duration || 60) * 60 * 1000);
    const endTimeTime = activeLesson.end_time ? new Date(activeLesson.end_time).getTime() : endTimeFallback;
    
    // Calculate total minutes expiration
    const otpDur = Number(activeLesson.otp_duration_mins || 20);
    const otpExpiryTimeTime = startTimeTime + (otpDur * 60 * 1000);

    const formatSeconds = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const updateTimer = () => {
      const elapsed = Date.now() - initialLocalTime;
      const currentServerTime = initialServerTime + elapsed;
      
      const totalSecondsLeft = Math.max(0, Math.round((endTimeTime - currentServerTime) / 1000));
      const otpSecondsLeft = Math.max(0, Math.round((otpExpiryTimeTime - currentServerTime) / 1000));

      setTimeLeft({
        total: formatSeconds(totalSecondsLeft),
        otp: formatSeconds(otpSecondsLeft)
      });

      return { totalSecondsLeft };
    };

    // Run initial time check immediately
    updateTimer();

    const interval = setInterval(() => {
      const { totalSecondsLeft } = updateTimer();
      if (totalSecondsLeft === 0) {
        clearInterval(interval);
        fetchStatus();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeLesson]);

  const handleLecturerSelect = async (name: string) => {
    setSelectedLecturer(name);
    setLecturerOtp('');
    setFetchOtpError('');
    if (!name) {
      setOtp('');
      return;
    }
    handleFetchLecturerOtp(name);
  };

  const handleFetchLecturerOtp = async (name: string) => {
    if (!name) return;
    setFetchingOtp(true);
    setFetchOtpError('');
    try {
      const res = await fetch(`/api/lecturer/my-otp?lecturer=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.otp) {
          setLecturerOtp(data.otp);
          setOtp(data.otp);
          setStatus({ type: 'success', message: `OTP for Representative Prof. ${name} successfully retrieved and autofilled!` });
        } else {
          setFetchOtpError(`No active lesson schedule mapped to Prof. ${name} at this time.`);
          setOtp('');
        }
      } else {
        const errData = await res.json();
        setFetchOtpError(errData.error || 'Could not fetch lecturer OTP.');
        setOtp('');
      }
    } catch (err) {
      console.error("Autofill lecturer error:", err);
      setFetchOtpError('Failed requesting dynamic lecturer OTP service.');
    } finally {
      setFetchingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLesson || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/lecturer/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: activeLesson.id, otp })
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: `Attendance verified successfully, Prof. ${activeLesson.lecturer}!` });
      } else {
        setStatus({ type: 'error', message: data.error || 'Invalid OTP or session validation error' });
      }
    } catch (err) {
      console.error("Lecturer mark error:", err);
      setStatus({ type: 'error', message: 'Server communication error. Please check your connection.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 pt-12 text-neutral-900 dark:text-zinc-100">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 text-white rounded-3xl shadow-xl mb-4 relative">
          <ShieldCheck className="w-8 h-8" />
          <button 
            onClick={() => { fetchStatus(); fetchLecturers(); }}
            className="absolute -top-2 -right-2 p-2 bg-white dark:bg-zinc-800 rounded-full shadow-md text-neutral-400 hover:text-emerald-600 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight dark:text-zinc-100">Lecturer Portal</h1>
        <p className="text-sm text-neutral-500 dark:text-zinc-400">Verify your presence for the session</p>
      </div>

      <AnimatePresence mode="wait">
        {!activeLesson ? (
          <div className="bg-neutral-100 dark:bg-zinc-900 p-8 rounded-3xl text-center border border-black/5 dark:border-white/10">
            <Clock className="w-10 h-10 text-neutral-400 dark:text-zinc-500 mx-auto mb-3" />
            <h3 className="font-bold dark:text-zinc-100">No Active Session</h3>
          </div>
        ) : activeLesson.lecturer_present ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-3xl text-center border border-emerald-100 dark:border-emerald-900/40">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">Welcome, Professor!</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-2">Your presence has been verified for <b>{activeLesson.unit_name}</b>.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm space-y-4">
              
              {/* COUNTDOWN TIMERS */}
              <div className="grid grid-cols-2 gap-3 mb-2 font-sans text-left">
                <div className="bg-neutral-50 dark:bg-zinc-800/40 p-3 rounded-2xl border border-black/5 dark:border-white/5 text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 dark:text-zinc-500 block mb-1">Session Active</span>
                  <span className="text-base font-extrabold font-mono text-neutral-800 dark:text-zinc-100">{timeLeft.total}</span>
                </div>
                <div className="bg-neutral-55 dark:bg-zinc-800/40 p-3 rounded-2xl border border-black/5 dark:border-white/5 text-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 dark:text-zinc-500 block mb-1">OTP Expires</span>
                  <span className={`text-base font-extrabold font-mono ${timeLeft.otp === '00:00' ? 'text-neutral-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{timeLeft.otp}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 ml-1">CHOOSE YOUR NAME</label>
                <select
                  value={selectedLecturer}
                  onChange={e => handleLecturerSelect(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs font-bold focus:outline-none transition-all cursor-pointer font-sans"
                >
                  <option value="">-- SELECT INDIVIDUAL NAME --</option>
                  {lecturers.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <span className="text-[9px] text-zinc-400 mt-1 block">Choosing your name automatically fetches and fills your registered session OTP.</span>
              </div>

              {selectedLecturer && (
                <div className="bg-neutral-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-black/5 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-500 dark:text-zinc-400">Lecturer OTP Retrieval</span>
                    <button
                      type="button"
                      onClick={() => handleFetchLecturerOtp(selectedLecturer)}
                      disabled={fetchingOtp}
                      className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${fetchingOtp ? 'animate-spin' : ''}`} />
                      {lecturerOtp ? 'Refresh Code' : 'Get My OTP'}
                    </button>
                  </div>
                  {lecturerOtp ? (
                    <div className="text-center bg-white dark:bg-zinc-800 p-3 rounded-xl border border-black/5 dark:border-white/10">
                      <p className="text-[10px] text-neutral-400 dark:text-zinc-500 uppercase tracking-widest font-bold">Your OTP Code</p>
                      <p className="text-2xl font-extrabold font-mono tracking-widest text-emerald-600 dark:text-emerald-400 my-1">{lecturerOtp}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setOtp(lecturerOtp);
                          setStatus(null);
                        }}
                        className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                      >
                        Autofill Code
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-xs text-neutral-400 dark:text-zinc-500">
                      {fetchOtpError ? (
                        <span className="text-red-500 font-medium">{fetchOtpError}</span>
                      ) : (
                        <span>Auto-fetching or click "Get My OTP" to retrieve code</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="text-center p-4 bg-neutral-50 dark:bg-zinc-800 rounded-2xl mb-4">
                <p className="text-xs text-neutral-500 dark:text-zinc-400 uppercase font-bold tracking-widest mb-1">Active Unit</p>
                <p className="text-lg font-bold dark:text-zinc-100">{activeLesson.unit_name}</p>
                <p className="text-xs text-neutral-400 dark:text-zinc-500 italic mt-0.5">Professor: {activeLesson.lecturer}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 ml-1">Lecturer OTP</label>
                <input 
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-2xl text-lg font-mono tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-black/5"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  required
                />
              </div>
            </div>

            {status && (
              <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                status.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
              }`}>
                {status.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                <span className="leading-relaxed">{status.message}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full py-4 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? <RotateCcw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {submitting ? 'VERIFYING...' : 'VERIFY PRESENCE'}
            </button>
          </form>
        )}
      </AnimatePresence>

      {/* Lecturer Noticeboard */}
      {announcements.length > 0 && (
        <div className="mt-8 pt-8 border-t border-black/5 dark:border-white/10 space-y-4 font-sans max-w-md mx-auto">
          <div className="flex items-center gap-1.5 px-1 pb-1">
            <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-bounce" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-zinc-500">Official Faculty Notices</h3>
          </div>

          <div className="space-y-3">
            {announcements.map((ann) => (
              <div 
                key={ann.id}
                className="p-4 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm text-xs space-y-1 hover:border-black/10 dark:hover:border-white/20 transition-all text-left"
              >
                <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400">
                  <span className="uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">📢 SCHOOL ADMIN</span>
                  <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-extrabold text-neutral-800 dark:text-zinc-200 uppercase tracking-tight leading-tight">{ann.title}</h4>
                <p className="text-neutral-600 dark:text-zinc-350 font-normal leading-relaxed">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// DEVELOPER PANEL (SHEM OMONDI)
// ==========================================
const DeveloperPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('auth_developer') === 'true');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  
  // States after login
  const [schools, setSchools] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
  const [schoolInspectionData, setSchoolInspectionData] = useState<any | null>(null);
  const [billingAmount, setBillingAmount] = useState('15000');
  const [superUsername, setSuperUsername] = useState('');
  const [superPassword, setSuperPassword] = useState('');
  
  // Create school fields
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolBilling, setNewSchoolBilling] = useState('15000');
  const [newSchoolSuperUser, setNewSchoolSuperUser] = useState('');
  const [newSchoolSuperPass, setNewSchoolSuperPass] = useState('');

  // AI Chat States
  const [aiChat, setAiChat] = useState<{ sender: 'user' | 'bot', text: string }[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'schools' | 'passwords' | 'payments' | 'ai'>('schools');

  // Payments log states
  const [paymentSubmissions, setPaymentSubmissions] = useState<any[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/developer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('auth_developer', 'true');
        sessionStorage.setItem('cached_pass_developer', password);
        fetchDeveloperData();
      } else {
        setError(data.error || 'Invalid developer credentials.');
      }
    } catch (e) {
      setError('Error connecting to authentication service.');
    }
  };

  const fetchPaymentSubmissions = async () => {
    try {
      const pRes = await fetch('/api/developer/payment-submissions');
      if (pRes.ok) setPaymentSubmissions(await pRes.json());
    } catch (err) {
      console.error('Failed to load payment submissions', err);
    }
  };

  const fetchDeveloperData = async () => {
    try {
      const sRes = await fetch('/api/developer/schools');
      if (sRes.ok) setSchools(await sRes.json());
      
      const rRes = await fetch('/api/developer/reports');
      if (rRes.ok) setReports(await rRes.json());

      await fetchPaymentSubmissions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveSubmission = async (id: number, schoolId: number, ref: string) => {
    if (!window.confirm(`Are you sure you want to approve M-Pesa transaction ${ref}? This will activate school portal access instantly.`)) return;
    try {
      const res = await fetch('/api/developer/payment-submissions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, school_id: schoolId })
      });
      if (res.ok) {
        alert('Transaction approved successfully! Portal activated.');
        await fetchDeveloperData();
      } else {
        const d = await res.json();
        alert(`Approval failed: ${d.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error approving payment: ${err.message}`);
    }
  };

  const handleRejectSubmission = async (id: number, schoolId: number, ref: string) => {
    if (!window.confirm(`Are you sure you want to decline/reject transaction ${ref}?`)) return;
    try {
      const res = await fetch('/api/developer/payment-submissions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, school_id: schoolId })
      });
      if (res.ok) {
        alert('Transaction status updated to Rejected.');
        await fetchDeveloperData();
      } else {
        const d = await res.json();
        alert(`Declination failed: ${d.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error declining payment: ${err.message}`);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDeveloperData();
      
      const socket = io();
      socket.on('payment-submitted', () => {
        fetchDeveloperData();
      });
      socket.on('attendance-updated', () => {
        fetchDeveloperData();
      });
      return () => {
        socket.disconnect();
      };
    }
  }, [isAuthenticated]);

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName || !newSchoolSuperUser || !newSchoolSuperPass) return;
    try {
      const res = await fetch('/api/developer/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSchoolName,
          billing_amount: Number(newSchoolBilling),
          super_username: newSchoolSuperUser,
          super_password: newSchoolSuperPass
        })
      });
      if (res.ok) {
        setNewSchoolName('');
        setNewSchoolSuperUser('');
        setNewSchoolSuperPass('');
        fetchDeveloperData();
        alert('School and its respective Superadmin created successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create school.');
      }
    } catch (e) {
      alert('Error communicating with database.');
    }
  };

  const handleToggleStatus = async (schoolId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch('/api/developer/schools/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, status: nextStatus })
      });
      if (res.ok) {
        fetchDeveloperData();
        if (selectedSchool && selectedSchool.id === schoolId) {
          setSelectedSchool({ ...selectedSchool, status: nextStatus });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBilling = async (schoolId: number) => {
    try {
      const res = await fetch('/api/developer/schools/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, billing_amount: Number(billingAmount) })
      });
      if (res.ok) {
        fetchDeveloperData();
        alert('Billing configuration updated standardly.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateInvoice = async (schoolId: number) => {
    try {
      const res = await fetch('/api/developer/schools/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId })
      });
      if (res.ok) {
        fetchDeveloperData();
        alert('New month subscription billed successfully. The school subscription is now unpaid/due.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSchool = async (schoolId: number, schoolName: string) => {
    if (!window.confirm(`CRITICAL WARNING: Are you absolutely sure you want to delete ${schoolName}?\nThis action is permanent and will cascade-delete all students, units, lessons, attendance history, departments, courses, and superadmins related to this school!`)) {
      return;
    }
    try {
      const res = await fetch(`/api/developer/schools/${schoolId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSelectedSchool(null);
        fetchDeveloperData();
        alert(`School "${schoolName}" and all associated records have been successfully and cascade-purged.`);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to delete school registry.');
      }
    } catch (e) {
      alert('Error communicating with database server.');
    }
  };

  const handleUpdateSchoolSuperadmin = async (schoolId: number) => {
    if (!superUsername || !superPassword) {
      alert('Please fill out username and password fields.');
      return;
    }
    try {
      const res = await fetch('/api/developer/schools/superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, super_username: superUsername, super_password: superPassword })
      });
      if (res.ok) {
        fetchDeveloperData();
        alert('Superadmin user updated successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const inspectSchool = async (school: any) => {
    setSelectedSchool(school);
    setBillingAmount(String(school.billing_amount || '15000'));
    setSuperUsername(school.super_username || '');
    setSuperPassword(school.super_password || '');
    
    // fetch detailed units/students for this school
    try {
      const repRes = await fetch(`/api/superadmin/report/${school.id}`);
      if (repRes.ok) {
        const repr = await rResJsonSafe(repRes);
        setSchoolInspectionData(repr);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const rResJsonSafe = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || aiLoading) return;
    const userMsg = aiPrompt;
    setAiPrompt('');
    setAiChat(prev => [...prev, { sender: 'user', text: userMsg }]);
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'developer',
          prompt: userMsg
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiChat(prev => [...prev, { sender: 'bot', text: data.reply }]);
      } else {
        setAiChat(prev => [...prev, { sender: 'bot', text: 'An error occurred during AI prompt processing.' }]);
      }
    } catch (err) {
      setAiChat(prev => [...prev, { sender: 'bot', text: 'Error in server AI communication.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('auth_developer');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-50 dark:bg-zinc-950 text-neutral-900 dark:text-zinc-100">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600" />
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-4">
              <Terminal className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight uppercase">Developer Command</h1>
            <p className="text-xs text-neutral-400 mt-1">Authorized access mandatory — Shem Omondi System Control</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 ml-1">SYSTEM PASSWORD</label>
              <div className="relative">
                <input 
                  type={showPass ? "text" : "password"}
                  className="w-full pl-4 pr-10 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-black/10"
                  placeholder="••••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg flex items-center gap-1.5 font-mono">
                <AlertTriangle className="w-3.5 h-3.5" /> {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-3 bg-black dark:bg-zinc-100 dark:text-zinc-950 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-neutral-800 dark:hover:bg-zinc-200 transition-all cursor-pointer"
            >
              Verify Dev Access
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 text-neutral-900 dark:text-zinc-100 font-sans pb-24">
      {/* Dev Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-black/5 dark:border-white/10 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded-full font-mono uppercase tracking-widest">Platform Creator</span>
            <span className="text-xs text-indigo-500 font-bold font-mono">Shem Omondi</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase flex items-center gap-2">
            <Terminal className="text-emerald-600" /> Developer Console
          </h1>
          <p className="text-xs text-neutral-400 dark:text-zinc-500">Global System Billing, Schools Provisioning & Master Password Registry</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchDeveloperData}
            className="px-4 py-2 text-xs bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Force Sync
          </button>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <DoorOpen className="w-3.5 h-3.5" /> Logout dev
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/5 dark:border-white/10 mb-6 gap-2">
        <button 
          onClick={() => setActiveTab('schools')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === 'schools' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-neutral-400 hover:text-neutral-900 dark:hover:text-zinc-100'}`}
        >
          <Building className="w-3.5 h-3.5 inline mr-1" /> School Provisioning
        </button>
        <button 
          onClick={() => setActiveTab('passwords')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === 'passwords' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-neutral-400 hover:text-neutral-900 dark:hover:text-zinc-100'}`}
        >
          <KeyRound className="w-3.5 h-3.5 inline mr-1" /> Master Passwords ({reports.length})
        </button>
        <button 
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === 'ai' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-neutral-400 hover:text-neutral-900 dark:hover:text-zinc-100'}`}
        >
          <Terminal className="w-3.5 h-3.5 inline mr-1" /> Gemini Assist GPT
        </button>
        <button 
          onClick={() => {
            setActiveTab('payments');
            fetchPaymentSubmissions();
          }}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === 'payments' ? 'border-emerald-600 text-emerald-600 font-extrabold' : 'border-transparent text-neutral-400 hover:text-neutral-900 dark:hover:text-zinc-100'}`}
        >
          <CreditCard className="w-3.5 h-3.5 inline mr-1" /> M-Pesa Submissions ({paymentSubmissions.filter(p => p.status === 'pending').length})
        </button>
      </div>

      {/* Content tabs */}
      {activeTab === 'schools' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400 ml-1">Registered Schools & Universities</h2>
            
            {/* Real-time Payment approvals alerts notifications board */}
            {paymentSubmissions.filter(p => p.status === 'pending').length > 0 && (
              <div className="space-y-3 bg-amber-500/10 dark:bg-amber-950/20 border border-amber-600/30 p-5 rounded-2xl animate-pulse">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                  <h3 className="text-xs font-black uppercase tracking-widest font-mono">Real-Time Notice: Payment Submissions to Till Number 3439291</h3>
                </div>
                <div className="space-y-3 mt-2">
                  {paymentSubmissions.filter(p => p.status === 'pending').map(sub => (
                    <div key={sub.id} className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-md">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black uppercase text-neutral-900 dark:text-zinc-150">{sub.school_name || 'Anonymous School'}</span>
                          <span className="px-2 py-0.5 bg-amber-500 text-white rounded font-mono font-bold text-[8.5px]">PENDING VERIFICATION</span>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-zinc-400 leading-relaxed font-sans">
                          M-Pesa Ref: <strong className="font-mono text-neutral-900 dark:text-zinc-300 uppercase">{sub.reference}</strong> • Amount: <strong className="font-mono text-neutral-900 dark:text-zinc-300">KES {sub.amount}</strong> • Phone: <strong className="font-mono text-neutral-900 dark:text-zinc-300">{sub.phone}</strong> • Sender: <strong className="font-sans font-bold text-neutral-900 dark:text-zinc-300">{sub.sender_name}</strong>
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch('/api/developer/payment-submissions/approve', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: sub.id, school_id: sub.school_id })
                              });
                              if (res.ok) {
                                fetchDeveloperData();
                                alert(`School subscription approved & activation finalized! Notifications dispatched in real-time.`);
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm cursor-pointer"
                        >
                          Approve Open Portal
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm('Reject this payment submission?')) return;
                            try {
                              const res = await fetch('/api/developer/payment-submissions/reject', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: sub.id, school_id: sub.school_id })
                              });
                              if (res.ok) {
                                fetchDeveloperData();
                                alert('Payment verification rejected. Status updated instantly.');
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registered schools list in unified table form structure */}
            <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-zinc-800/10 uppercase tracking-widest font-mono text-[9px] text-neutral-400 font-bold border-b border-black/5 dark:border-white/10">
                      <th className="py-3 px-4">School Name</th>
                      <th className="py-3 px-4">Portal Credentials</th>
                      <th className="py-3 px-4">Portal Status</th>
                      <th className="py-3 px-4">Billing Status</th>
                      <th className="py-3 px-4">Monthly Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/10 font-sans">
                    {schools.map(school => (
                      <tr 
                        key={school.id}
                        onClick={() => inspectSchool(school)}
                        className={`hover:bg-neutral-50/70 dark:hover:bg-zinc-800/20 cursor-pointer transition-colors ${selectedSchool?.id === school.id ? 'bg-emerald-50/50 dark:bg-emerald-950/15' : ''}`}
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-black text-neutral-900 dark:text-zinc-100 uppercase block">{school.name}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">ID: #{school.id}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-600 dark:text-zinc-400 select-all">
                          <div>User: <span className="font-bold text-neutral-900 dark:text-zinc-150">{school.super_username}</span></div>
                          <div className="text-neutral-400 dark:text-zinc-500">Pass: <span className="font-bold">{school.super_password || '********'}</span></div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase font-mono tracking-widest whitespace-nowrap inline-block ${school.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-red-50 dark:bg-red-950/20 text-red-500'}`}>
                            ● {school.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase font-mono tracking-wider whitespace-nowrap inline-block ${school.paid_status === 'paid' ? 'bg-emerald-600 text-white shadow-xs' : school.paid_status === 'pending_activation' ? 'bg-amber-500 text-white animate-pulse' : 'bg-rose-600 text-white'}`}>
                            {school.paid_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-black font-mono text-neutral-900 dark:text-zinc-150 whitespace-nowrap text-right pr-4">
                          KES {school.billing_amount}/mo
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* School Details Inspector Drawer/Modal */}
            {selectedSchool && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl space-y-6 shadow-sm"
              >
                <div className="flex justify-between items-start border-b border-black/5 dark:border-white/10 pb-4">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">{selectedSchool.name}</h3>
                    <p className="text-[11px] text-neutral-400 font-mono">Database Registry ID Reference: #{selectedSchool.id}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedSchool(null)}
                    className="p-1 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold uppercase rounded-lg cursor-pointer"
                  >
                    Close Inspection
                  </button>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-neutral-50 dark:bg-zinc-850 rounded-2xl text-center">
                    <span className="text-[9px] font-black uppercase text-neutral-400 block">Students</span>
                    <span className="text-xl font-black font-mono">{selectedSchool.student_count}</span>
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-zinc-850 rounded-2xl text-center">
                    <span className="text-[9px] font-black uppercase text-neutral-400 block">Lecturers</span>
                    <span className="text-xl font-black font-mono">{selectedSchool.lecturer_count}</span>
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-zinc-850 rounded-2xl text-center">
                    <span className="text-[9px] font-black uppercase text-neutral-400 block">Departments</span>
                    <span className="text-xl font-black font-mono">{selectedSchool.dept_count}</span>
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-zinc-850 rounded-2xl text-center">
                    <span className="text-[9px] font-black uppercase text-neutral-400 block">Courses</span>
                    <span className="text-xl font-black font-mono">{selectedSchool.course_count}</span>
                  </div>
                </div>

                {/* Control Actions Panel */}
                <div className="border-t border-black/5 dark:border-white/10 pt-4 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400">School Control Actions</h4>
                  
                  <div className="flex flex-wrap gap-4 items-center">
                    {/* Status Toggle */}
                    <button 
                      onClick={() => handleToggleStatus(selectedSchool.id, selectedSchool.status)}
                      className={`px-4 py-2 text-xs font-black rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all text-white cursor-pointer ${selectedSchool.status === 'active' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                      <Lock className="w-3.5 h-3.5" /> 
                      {selectedSchool.status === 'active' ? 'Pause Portal System' : 'Activate Portal System'}
                    </button>

                    {/* Manual Billing invoice trigger */}
                    <button 
                      onClick={() => handleGenerateInvoice(selectedSchool.id)}
                      className="px-4 py-2 text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Trigger Monthly Bill Cycle (Unpaid Status)
                    </button>

                    {/* Delete School Registry */}
                    <button 
                      onClick={() => handleDeleteSchool(selectedSchool.id, selectedSchool.name)}
                      className="px-4 py-2 text-xs font-black bg-red-600 text-white hover:bg-red-750 rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete School Registry (Permanent)
                    </button>
                  </div>
                </div>

                {/* Superadmin configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-black/5 dark:border-white/10">
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 font-mono">Adjust School Billing Fee</h4>
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm font-mono focus:outline-none"
                        value={billingAmount}
                        onChange={e => setBillingAmount(e.target.value)}
                      />
                      <button 
                        onClick={() => handleUpdateBilling(selectedSchool.id)}
                        className="px-4 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer"
                      >
                        Save Fee Changes
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 font-mono">Update School Superadmin Logins</h4>
                    <div className="space-y-2">
                      <input 
                        placeholder="Superadmin Username"
                        className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-lg text-xs"
                        value={superUsername}
                        onChange={e => setSuperUsername(e.target.value)}
                      />
                      <input 
                        placeholder="Superadmin Password"
                        className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-lg text-xs font-mono"
                        value={superPassword}
                        onChange={e => setSuperPassword(e.target.value)}
                      />
                      <button 
                        onClick={() => handleUpdateSchoolSuperadmin(selectedSchool.id)}
                        className="w-full py-1.5 bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-neutral-800 dark:hover:bg-zinc-200 text-[10px] font-black uppercase tracking-widest rounded-lg cursor-pointer"
                      >
                        Update Credentials
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Provision New School Form */}
          <div className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400 ml-1">New School Provisioning System</h2>
            
            <form onSubmit={handleCreateSchool} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 ml-1">SCHOOL / UNIVERSITY NAME</label>
                <input 
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm focus:outline-none"
                  placeholder="e.g. Kenyatta University"
                  value={newSchoolName}
                  onChange={e => setNewSchoolName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 ml-1">MONTHLY SUBSCRIPTION AMOUNT (KES)</label>
                <input 
                  type="number"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm font-mono focus:outline-none"
                  value={newSchoolBilling}
                  onChange={e => setNewSchoolBilling(e.target.value)}
                  required
                />
              </div>

              <div className="border-t border-black/5 dark:border-white/10 pt-3 space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500">SCHOOL SUPERADMIN ACCOUNT INITIALS</h4>
                
                <div className="space-y-2">
                  <input 
                    placeholder="Superadmin username"
                    className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs focus:outline-none"
                    value={newSchoolSuperUser}
                    onChange={e => setNewSchoolSuperUser(e.target.value)}
                    required
                  />
                  <input 
                    placeholder="Superadmin password password"
                    className="w-full px-4 py-2 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs font-mono focus:outline-none"
                    value={newSchoolSuperPass}
                    onChange={e => setNewSchoolSuperPass(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-emerald-600 dark:bg-emerald-700 text-white text-xs font-extrabold uppercase tracking-wider hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Provision Registered School
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Master Password panel */}
      {activeTab === 'passwords' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight">System Password Registry</h2>
              <p className="text-xs text-neutral-400">Total credentials of all class reps, superadmins, and student hashes registered</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-zinc-800/50 uppercase tracking-widest font-mono text-[9px] text-neutral-400 font-bold border-b border-black/5 dark:border-white/10">
                    <th className="py-3 px-4">Entity User</th>
                    <th className="py-3 px-4">School/University</th>
                    <th className="py-3 px-4">User Role</th>
                    <th className="py-3 px-4 font-mono">Password Credentials</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10 font-sans">
                  {reports.map((p, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-zinc-900/40 text-neutral-700 dark:text-zinc-100">
                      <td className="py-3 px-4 font-bold">{p.user_name}</td>
                      <td className="py-3 px-4 uppercase text-[10px] text-neutral-500">{p.school_name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-mono tracking-wider font-bold ${p.role === 'Superadmin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300' : p.role === 'Representative' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20' : 'bg-neutral-100 text-neutral-600 dark:bg-zinc-800'}`}>
                          {p.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400 text-sm select-all">{p.password}</td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-neutral-400 uppercase font-mono tracking-widest text-[10px]">No password reports indexed yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* M-Pesa Submissions Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/10 pb-4 mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-zinc-100 flex items-center gap-1.5">
                  💵 M-Pesa Business Till #3439291 Verification Console
                </h2>
                <p className="text-[11px] text-neutral-500 mt-1">
                  School administrators submit transactions here or via WhatsApp (+254112675636). Reconcile statements and approve portals below.
                </p>
              </div>
              <button
                onClick={fetchPaymentSubmissions}
                className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[10px] font-bold rounded-lg uppercase tracking-wider text-neutral-600 dark:text-zinc-300"
              >
                🔄 Refresh Logs
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/10 rounded-2xl">
                <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-800 dark:text-emerald-400 block">System Collected Revenue</span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                  KES {(paymentSubmissions.filter(p => p.status === 'approved').reduce((accum, curr) => accum + (curr.amount || 0), 0)).toLocaleString()}
                </span>
                <span className="text-[9px] text-neutral-400 block mt-0.5">Approved & Settled</span>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/10 rounded-2xl">
                <span className="text-[9px] uppercase font-bold tracking-widest text-amber-800 dark:text-amber-400 block">Pending Verifications</span>
                <span className="text-xl font-black text-amber-750 dark:text-amber-300 font-mono animate-pulse">
                  {paymentSubmissions.filter(p => p.status === 'pending').length} Requests
                </span>
                <span className="text-[9px] text-neutral-400 block mt-0.5">Requires Shem's approval</span>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-500/10 rounded-2xl">
                <span className="text-[9px] uppercase font-bold tracking-widest text-purple-800 dark:text-purple-400 block">Total Submission Volume</span>
                <span className="text-xl font-black text-purple-700 dark:text-purple-300 font-mono">
                  {paymentSubmissions.length} Transactions
                </span>
                <span className="text-[9px] text-neutral-400 block mt-0.5 font-sans">Accumulated submissions</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 bg-neutral-50/50 dark:bg-zinc-800/20">
                    <th className="py-3 px-4">TX ID</th>
                    <th className="py-3 px-4">Date Submitted</th>
                    <th className="py-3 px-4">School Submitting</th>
                    <th className="py-3 px-4">M-Pesa Reference</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">M-Pesa Sender Info</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions / Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5 text-xs">
                  {paymentSubmissions.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-400">#{p.id}</td>
                      <td className="py-3 px-4 text-neutral-500 font-mono text-[11px] whitespace-nowrap">
                        {p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-neutral-900 dark:text-white uppercase">{p.school_name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">ID: {p.school_id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 bg-neutral-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 font-mono font-black tracking-wider uppercase rounded text-xs select-all">
                          {p.reference}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black font-mono text-neutral-900 dark:text-white text-xs">
                        KES {(p.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 space-y-0.5">
                        <div className="font-semibold text-neutral-800 dark:text-zinc-200">{p.sender_name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{p.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        {p.status === 'pending' && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full text-[9px] font-black uppercase tracking-wider font-mono inline-block animate-pulse">
                            ● PENDING APPROVAL
                          </span>
                        )}
                        {p.status === 'approved' && (
                          <span className="px-2 py-0.5 bg-emerald-600 text-white dark:bg-emerald-950/40 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-wider font-mono inline-block">
                            ✓ APPROVED
                          </span>
                        )}
                        {p.status === 'rejected' && (
                          <span className="px-2 py-0.5 bg-neutral-200 dark:bg-zinc-805 text-neutral-600 dark:text-zinc-400 rounded-full text-[9px] font-black uppercase tracking-wider font-mono inline-block">
                            ✗ REJECTED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.status === 'pending' ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleRejectSubmission(p.id, p.school_id, p.reference)}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded text-[10px] font-bold uppercase transition-colors"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleApproveSubmission(p.id, p.school_id, p.reference)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              Approve & Activate
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">
                            {p.status === 'approved' ? 'Active Sub' : 'Unprocessed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {paymentSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-400 uppercase font-mono tracking-widest text-[10px]">
                        No payment submissions received yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Gemini AI Bot tab */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[600px] justify-between">
            <div className="bg-neutral-50 dark:bg-zinc-800/50 p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-widest font-mono">Gemini Technical Core Advisor</h3>
              </div>
              <button 
                onClick={() => setAiChat([])}
                className="text-[10px] text-red-500 uppercase font-bold tracking-widest hover:underline cursor-pointer"
              >
                Reset Feed
              </button>
            </div>

            {/* Message feed */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {aiChat.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-400">
                  <Terminal className="w-12 h-12 stroke-[1.5] text-neutral-300 dark:text-zinc-650 mb-3" />
                  <p className="text-sm font-bold">Ask Gemini regarding platform architecture records & reports</p>
                  <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-1 max-w-sm">AI maps current school subscription statuses, fees, system metrics, and technical databases directly into contextual telemetry.</p>
                </div>
              )}
              {aiChat.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-black text-white dark:bg-zinc-150 dark:text-zinc-900 rounded-tr-none' : 'bg-neutral-100 dark:bg-zinc-850 text-neutral-800 dark:text-zinc-200 rounded-tl-none border border-black/5 dark:border-white/10'}`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-100 dark:bg-zinc-850 p-4 rounded-2xl rounded-tl-none border border-black/5 dark:border-white/10 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 animate-spin text-emerald-600" />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-neutral-400">AI Core is thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt input Form */}
            <form onSubmit={handleAskAI} className="p-4 border-t border-black/5 dark:border-white/10 flex gap-2">
              <input 
                placeholder="Ask about Kenyatta University metrics / generate monthly school records..."
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-zinc-800 text-xs border border-black/5 dark:border-white/10 rounded-xl focus:outline-none"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                disabled={aiLoading}
              />
              <button 
                type="submit"
                disabled={aiLoading}
                className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 ml-1">Quick Prompt Directives</h3>
            <div className="space-y-2">
              {[
                "Calculate total pending monthly billings for all system schools",
                "Summarize registered computing departments",
                "Review password hygiene across Kenyan schools"
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setAiPrompt(suggestion)}
                  className="w-full p-4 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 rounded-2xl text-left text-xs text-neutral-600 dark:text-zinc-300 transition-colors uppercase font-mono tracking-tight cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ==========================================
// SCHOOL SUPERADMIN PORTAL (SCHOOL ADMIN)
// ==========================================
const SuperadminPortal = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('auth_superadmin') === 'true');
  const [schoolId, setSchoolId] = useState(() => {
    const cached = localStorage.getItem('school_super_id');
    return cached ? Number(cached) : 1;
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [schools, setSchools] = useState<any[]>([]);

  // States after login
  const [kpis, setKPIs] = useState<any | null>(null);
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [passwordsList, setPasswordsList] = useState<any[]>([]);
  const [schoolObj, setSchoolObj] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'passwords' | 'ai' | 'announcements' | 'billing'>('dashboard');

  // AI Chat States
  const [aiChat, setAiChat] = useState<{ sender: 'user' | 'bot', text: string }[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Announcement noticeboard states
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnAudience, setNewAnnAudience] = useState<'all' | 'students' | 'lecturers' | 'reps'>('all');

  // Mpesa payment confirmation states
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  useEffect(() => {
    // Fetch registered schools list to allow selecting their school during login
    const fetchSchoolsList = async () => {
      try {
        const res = await fetch('/api/developer/schools');
        if (res.ok) {
          const list = await res.json();
          setSchools(list);
          const cachedId = localStorage.getItem('school_super_id');
          const initialSchoolId = cachedId ? Number(cachedId) : (list[0]?.id || 1);
          setSchoolId(initialSchoolId);
          
          const sel = list.find((s: any) => s.id === initialSchoolId);
          if (sel?.super_username && sel.super_username !== 'None') {
            setUsername(sel.super_username);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSchoolsList();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setSchoolObj(data.school);
        localStorage.setItem('auth_superadmin', 'true');
        localStorage.setItem('school_super_id', String(schoolId));
        sessionStorage.setItem('cached_pass_superadmin', password);
        fetchSuperAdminViewDetails();
      } else {
        setError(data.error || 'Invalid username or password mapping to selected school.');
      }
    } catch (e) {
      setError('Error connecting to school auth server.');
    }
  };

  const fetchSuperAdminViewDetails = async () => {
    try {
      // Get School details again
      const sRes = await fetch('/api/developer/schools');
      if (sRes.ok) {
        const list = await sRes.json();
        const found = list.find((s: any) => s.id === schoolId);
        if (found) {
          setSchoolObj(found);
          setPaymentAmount(String(found.billing_amount || 1500));
        }
      }

      const repRes = await fetch(`/api/superadmin/report/${schoolId}`);
      if (repRes.ok) {
        const data = await repRes.json();
        setKPIs(data.metrics);
        setRecentLessons(data.recent_lessons);
      }

      const pwdRes = await fetch(`/api/superadmin/passwords/${schoolId}`);
      if (pwdRes.ok) {
        setPasswordsList(await pwdRes.json());
      }

      // Fetch announcements
      const annRes = await fetch(`/api/announcements/${schoolId}?audience=all`);
      if (annRes.ok) {
        setAnnouncements(await annRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnnouncementsList = async () => {
    try {
      const res = await fetch(`/api/announcements/${schoolId}?audience=all`);
      if (res.ok) setAnnouncements(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) {
      alert('Please fill in both the title and text details of the announcement notice.');
      return;
    }
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          title: newAnnTitle.trim(),
          content: newAnnContent.trim(),
          audience: newAnnAudience
        })
      });
      if (res.ok) {
        setNewAnnTitle('');
        setNewAnnContent('');
        setNewAnnAudience('all');
        fetchAnnouncementsList();
        alert('Notice successfully posted and broadcasted to school portals!');
      } else {
        alert('Failed to post announcement.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this announcement?')) return;
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAnnouncementsList();
        alert('Announcement deleted.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSuperAdminViewDetails();
      
      const socket = io();
      socket.on('attendance-updated', () => {
        fetchSuperAdminViewDetails();
      });
      return () => {
        socket.disconnect();
      };
    }
  }, [isAuthenticated, schoolId]);

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolObj) return;
    if (!paymentRef.trim() || !paymentPhone.trim() || !paymentName.trim()) {
      alert('Please fill out all required fields: Mpesa Reference, Sender Name, and Sender Phone Number.');
      return;
    }
    setPaymentSubmitting(true);
    try {
      const res = await fetch(`/api/superadmin/pay/${schoolId}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: paymentRef.toUpperCase(),
          amount: parseFloat(paymentAmount) || 1500,
          phone: paymentPhone,
          sender_name: paymentName
        })
      });
      if (res.ok) {
        // notify Developer Shem Omondi via WhatsApp +254112675636 showing Mpesa ref and payment details:
        const msg = `Hello Shem Omondi,

I am writing to submit subscription payment confirmations for our school.

Here are our payment details:
- School: ${schoolObj.name} (School ID: ${schoolId})
- M-Pesa Till Paid: 3439291
- M-Pesa Transaction Ref: ${paymentRef.toUpperCase()}
- Paid Amount: KES ${paymentAmount}
- Sender Registered Name: ${paymentName}
- Sender Phone Number: ${paymentPhone}

Please verify the transaction and activate our portal access standardly. Thank you!`;

        const waLink = `https://wa.me/254112675636?text=${encodeURIComponent(msg)}`;
        
        // update local layout
        fetchSuperAdminViewDetails();
        
        alert('Payment registered on the database! Now opening WhatsApp to submit transaction details to Shem Omondi (+254112675636) for confirmation.');
        
        // redirect/open WhatsApp
        window.open(waLink, '_blank');
        
        setPaymentRef('');
        setPaymentPhone('');
        setPaymentName('');
      } else {
        alert('Failed to update payment status on the server.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || aiLoading) return;
    const userMsg = aiPrompt;
    setAiPrompt('');
    setAiChat(prev => [...prev, { sender: 'user', text: userMsg }]);
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'superadmin',
          school_id: schoolId,
          prompt: userMsg
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiChat(prev => [...prev, { sender: 'bot', text: data.reply }]);
      } else {
        setAiChat(prev => [...prev, { sender: 'bot', text: 'An error occurred during AI prompt processing.' }]);
      }
    } catch (err) {
      setAiChat(prev => [...prev, { sender: 'bot', text: 'Error in server AI communication.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('auth_superadmin');
    localStorage.removeItem('school_super_id');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-50 dark:bg-zinc-950 text-neutral-900 dark:text-zinc-100">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600" />
          
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight uppercase">School Superadmin</h1>
            <p className="text-xs text-neutral-400 mt-1">Academics Oversight & Registration Dashboard Login</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 ml-1">SELECT YOUR SCHOOL</label>
              <select 
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs font-bold"
                value={schoolId}
                onChange={e => {
                  const newId = Number(e.target.value);
                  setSchoolId(newId);
                  const sel = schools.find(s => s.id === newId);
                  if (sel?.super_username && sel.super_username !== 'None') {
                    setUsername(sel.super_username);
                  } else {
                    setUsername('');
                  }
                }}
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center mr-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 ml-1">SUPERADMIN USERNAME</label>
                {schools.find(s => s.id === schoolId)?.super_username && schools.find(s => s.id === schoolId)?.super_username !== 'None' && (
                  <span className="text-[8px] uppercase tracking-wider font-bold text-neutral-400 dark:text-zinc-500 font-mono">
                    Registered: {schools.find(s => s.id === schoolId)?.super_username}
                  </span>
                )}
              </div>
              
              {/* Choice dropdown for username selection */}
              <div className="space-y-2">
                <select 
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs font-bold focus:outline-[#059669]"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                >
                  <option value="">-- Choose Account Username --</option>
                  {(() => {
                    const sel = schools.find(s => s.id === schoolId);
                    if (sel?.super_username && sel.super_username !== 'None') {
                      return (
                        <option value={sel.super_username}>
                          {sel.super_username} (Assigned Superadmin)
                        </option>
                      );
                    }
                    return null;
                  })()}
                  <option value="admin">admin (Standard Test Account)</option>
                  <option value="developer">developer (Standard Dev Account)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 ml-1">SUPERADMIN PASSWORD</label>
              <div className="relative">
                <input 
                  type={showPass ? "text" : "password"}
                  className="w-full pl-4 pr-10 py-2.5 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-black/10"
                  placeholder="••••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg flex items-center gap-1.5 font-mono">
                <AlertTriangle className="w-3.5 h-3.5" /> {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-3 bg-black dark:bg-zinc-100 dark:text-zinc-950 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-neutral-800 dark:hover:bg-zinc-200 transition-all cursor-pointer"
            >
              School Portal Authorization
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 text-neutral-900 dark:text-zinc-100 font-sans pb-24">
      {/* School Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-black/5 dark:border-white/10 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded-full font-mono uppercase tracking-widest">School Administration Board</span>
            {schoolObj && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono tracking-widest ${schoolObj.paid_status === 'paid' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-red-50 dark:bg-red-950/20 text-red-500 animate-pulse'}`}>
                ● Status: {schoolObj.paid_status === 'paid' ? 'Paid / Active Access' : 'Unpaid / Access Paused'}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase flex items-center gap-2">
            <Building className="text-emerald-600" /> {schoolObj?.name || 'School Control Center'}
          </h1>
          <p className="text-xs text-neutral-400 dark:text-zinc-500">School Superadmin Oversight, Academic KPIs & Department Password Logs</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchSuperAdminViewDetails}
            className="px-4 py-2 text-xs bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync Data
          </button>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <DoorOpen className="w-3.5 h-3.5" /> Close Portal
          </button>
        </div>
      </div>

      {schoolObj?.status === 'paused' || schoolObj?.paid_status === 'unpaid' || schoolObj?.paid_status === 'pending_activation' ? (
        <div className="p-8 bg-red-50 dark:bg-zinc-900/50 border border-red-200 dark:border-white/10 rounded-3xl mb-8 space-y-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400 animate-pulse" />
            <div>
              <h3 className="text-lg font-extrabold uppercase text-red-900 dark:text-red-400 leading-tight">
                {schoolObj?.paid_status === 'pending_activation' 
                  ? 'Portal Pending Activation' 
                  : 'Portal Access Suspended'}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-zinc-400 mt-1">
                {schoolObj?.paid_status === 'pending_activation' 
                  ? "Your transaction details have been submitted. Standard registration takes less than 15 minutes. To accelerate verification, message Shem on WhatsApp with details below."
                  : "Your school premium billing accounts are currently due or have not been enabled by the system developer."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Payment visual details card */}
            <div className="bg-emerald-600 text-white p-6 rounded-2xl space-y-4 shadow-sm border border-emerald-700">
              <span className="text-[9px] uppercase tracking-widest font-black bg-white/20 px-2.5 py-1 rounded">Lipa Na M-Pesa Official Till</span>
              <div className="space-y-1">
                <span className="text-[9px] text-emerald-100 block font-mono">BUY GOODS TILL NUMBER</span>
                <span className="text-3xl font-black font-mono tracking-wider">3439291</span>
                <span className="text-[9px] text-emerald-100/80 block italic">Pre-populated and automatically filled in your submission sheet.</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-emerald-100 block font-mono">REGISTERED MERCHANT HOLDER NAME</span>
                <span className="text-base font-bold font-sans">Shem Omondi</span>
              </div>
              <div className="h-px bg-white/20 my-2" />
              <div className="flex justify-between text-xs text-emerald-100">
                <span>Standard Monthly License Cost:</span>
                <span className="font-bold">KES {schoolObj?.billing_amount || '1,500'}</span>
              </div>
            </div>

            {/* Form to capture transaction details */}
            <form onSubmit={handleSimulatePayment} className="space-y-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-zinc-100 flex items-center gap-1.5 border-b border-black/5 dark:border-white/10 pb-2">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Enter Payment Details for Confirmation
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 font-sans">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500">M-PESA REF NUMBER</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. QRT5XZ67SP"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-850 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500">PAID AMOUNT (KES)</label>
                  <input
                    type="number"
                    required
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-850 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500">SENDER PHONE NUMBER</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0712345678"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-850 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={paymentPhone}
                    onChange={e => setPaymentPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500">SENDER NAME / ALIAS</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-850 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={paymentName}
                    onChange={e => setPaymentName(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={paymentSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <QrCode className="w-4 h-4 animate-pulse" />
                {paymentSubmitting ? 'PROCESSING...' : 'Verify Payment & Open WhatsApp Link'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex border-b border-black/5 dark:border-white/10 mb-6 gap-2 overflow-x-auto scroller-none">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'dashboard' ? 'border-emerald-600 text-emerald-600 font-black' : 'border-transparent text-neutral-400 hover:text-neutral-900 dark:hover:text-zinc-100'}`}
        >
          <Building className="w-3.5 h-3.5 inline mr-1" /> General KPIs & Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('passwords')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'passwords' ? 'border-emerald-600 text-emerald-600 font-black' : 'border-transparent text-neutral-400 hover:text-neutral-900 dark:hover:text-zinc-100'}`}
        >
          <KeyRound className="w-3.5 h-3.5 inline mr-1" /> Campus Password board
        </button>
        <button 
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'announcements' ? 'border-emerald-600 text-emerald-600 font-black' : 'border-transparent text-neutral-400 hover:text-neutral-900 dark:hover:text-zinc-100'}`}
        >
          <Bell className="w-3.5 h-3.5 inline mr-1" /> Broadcast Announcements
        </button>
        <button 
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'ai' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-neutral-400 hover:text-neutral-900 dark:hover:text-zinc-100'}`}
        >
          <Terminal className="w-3.5 h-3.5 inline mr-1" /> Academics AI Bot assistant
        </button>
        <button 
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'billing' ? 'border-emerald-600 text-emerald-600 font-extrabold' : 'border-transparent text-neutral-400 hover:text-neutral-900 dark:hover:text-zinc-100'}`}
        >
          <CreditCard className="w-3.5 h-3.5 inline mr-1" /> Billing & Subscriptions
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* General KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-5 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm text-center">
              <span className="text-[9px] font-bold uppercase text-neutral-400 dark:text-zinc-500 block">Total Students</span>
              <span className="text-2xl font-black font-mono">{kpis?.total_students || 0}</span>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm text-center">
              <span className="text-[9px] font-bold uppercase text-neutral-400 dark:text-zinc-500 block">Unique Lecturers</span>
              <span className="text-2xl font-black font-mono">{kpis?.total_lecturers || 0}</span>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm text-center">
              <span className="text-[9px] font-bold uppercase text-neutral-400 dark:text-zinc-500 block">Academic Departments</span>
              <span className="text-2xl font-black font-mono">{kpis?.total_departments || 0}</span>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm text-center">
              <span className="text-[9px] font-bold uppercase text-neutral-400 dark:text-zinc-500 block">Courses Underway</span>
              <span className="text-2xl font-black font-mono">{kpis?.total_courses || 0}</span>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm text-center">
              <span className="text-[9px] font-bold uppercase text-neutral-400 dark:text-zinc-500 block">Total Sessions Scheduled</span>
              <span className="text-2xl font-black font-mono">{kpis?.total_lessons || 0}</span>
            </div>
          </div>

          {/* Recent Lesson Schedules */}
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400 ml-1">Recent Scheduled Class Lesson Logs</h2>
            <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-zinc-800/50 uppercase tracking-widest font-mono text-[9px] text-neutral-400 border-b border-black/5 dark:border-white/10">
                    <th className="py-3 px-4">Subject Unit Name</th>
                    <th className="py-3 px-4">Professor Conducting</th>
                    <th className="py-3 px-4">Scheduled Start</th>
                    <th className="py-3 px-4">Scheduled Duration</th>
                    <th className="py-3 px-4">Class Room Venue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10 font-sans text-neutral-700 dark:text-zinc-200">
                  {recentLessons.map((l, index) => (
                    <tr key={index} className="hover:bg-neutral-50 dark:hover:bg-zinc-900/40">
                      <td className="py-3 px-4 font-bold">{l.unit_name}</td>
                      <td className="py-3 px-4">{l.lecturer}</td>
                      <td className="py-3 px-4">{new Date(l.start_time).toLocaleString()}</td>
                      <td className="py-3 px-4">{l.duration} Minutes</td>
                      <td className="py-3 px-4 font-mono font-bold uppercase">{l.venue || 'Lecture Hall A'}</td>
                    </tr>
                  ))}
                  {recentLessons.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-400 font-mono text-[10px] uppercase tracking-wider">No active lesson schedules recorded yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'passwords' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">Active User Password registries</h2>
            <p className="text-xs text-neutral-400">Restricted School superadmin database logs containing active credentials for teachers or class managers within this school.</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-zinc-800/50 uppercase tracking-widest font-mono text-[9px] text-neutral-400 border-b border-black/5 dark:border-white/10">
                  <th className="py-3 px-4">Register User Name</th>
                  <th className="py-3 px-4">Class / Role Mapping</th>
                  <th className="py-3 px-4 font-mono">Password Credential</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10 text-neutral-700 dark:text-zinc-200">
                {passwordsList.map((p, index) => (
                  <tr key={index} className="hover:bg-neutral-50 dark:hover:bg-zinc-900/40">
                    <td className="py-3 px-4 font-bold">{p.user_name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-mono tracking-widest font-bold ${p.role === 'Representative' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/20'}`}>
                        {p.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 select-all tracking-wider">{p.password}</td>
                  </tr>
                ))}
                {passwordsList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-neutral-400 font-mono uppercase text-[9px] tracking-widest">No credential registry logs listed</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Create announcement Form */}
            <form onSubmit={handleAddAnnouncement} className="p-6 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-800 dark:text-zinc-100 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Create School Notice
                </h3>
                <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-1">Broadcast an announcement that will be displayed in real time on active student, lecturer, and representative screens.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 block">Notice Header Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. End of Semester Exam Attendance Reminder"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-850 text-neutral-900 dark:text-zinc-150 text-xs border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={newAnnTitle}
                  onChange={e => setNewAnnTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 block">Target Audience Group</label>
                <select
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-850 text-neutral-900 dark:text-zinc-150 text-xs border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  value={newAnnAudience}
                  onChange={e => setNewAnnAudience(e.target.value as any)}
                >
                  <option value="all">📢 ALL PORTALS (Broad Site Announcement)</option>
                  <option value="students">🎓 Students Portal Only</option>
                  <option value="lecturers">👨‍🏫 Lecturers Portal Only</option>
                  <option value="reps">💼 Class Representatives Only</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500 block">Notice Body Message</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Draft your detailed campus message announcement..."
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-850 text-neutral-900 dark:text-zinc-150 text-xs border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={newAnnContent}
                  onChange={e => setNewAnnContent(e.target.value)}
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Broadcast Announcement
              </button>
            </form>

            {/* List existing announcements */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Published Noticeboard Logs ({announcements.length})</h3>
                <button 
                  onClick={fetchAnnouncementsList}
                  type="button"
                  className="text-[10px] text-emerald-600 uppercase font-bold tracking-widest hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Sync Notices
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 text-xs">
                {announcements.length === 0 ? (
                  <div className="p-12 text-center text-neutral-400 dark:text-zinc-500 font-mono uppercase text-[9px] tracking-widest bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl">
                    No active noticeboard announcements found for this school.
                  </div>
                ) : (
                  announcements.map((ann) => (
                    <div 
                      key={ann.id}
                      className="p-5 bg-white dark:bg-zinc-950 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-black/10 dark:hover:border-white/20 transition-all font-sans"
                    >
                      <div className="space-y-1.5 flex-1 col-span-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            ann.audience === 'all' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' :
                            ann.audience === 'students' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' :
                            ann.audience === 'lecturers' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' :
                            'bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400'
                          }`}>
                            Audience: {ann.audience}
                          </span>
                          <span className="text-[9px] font-mono text-neutral-400">{new Date(ann.created_at).toLocaleString()}</span>
                        </div>
                        <h4 className="text-xs font-extrabold text-neutral-800 dark:text-zinc-150 tracking-tight uppercase">{ann.title}</h4>
                        <p className="text-xs text-neutral-600 dark:text-zinc-300 leading-relaxed font-sans">{ann.content}</p>
                      </div>

                      <button 
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        type="button"
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/50 dark:text-red-400 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Remove Notice
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[550px] justify-between">
            <div className="bg-neutral-50 dark:bg-zinc-800/50 p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-widest font-mono">Academics Smart Advisor Bot</h3>
              </div>
              <button 
                onClick={() => setAiChat([])}
                className="text-[10px] text-red-500 uppercase font-bold tracking-widest hover:underline cursor-pointer"
              >
                Reset Feed
              </button>
            </div>

            {/* Message feed */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {aiChat.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-400">
                  <Terminal className="w-12 h-12 stroke-[1.5] text-neutral-300 dark:text-zinc-650 mb-3" />
                  <p className="text-sm font-bold">Ask the Academics AI concerning students, classes & course tracks</p>
                  <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-1 max-w-sm">The AI matches database courses, lecturer logs, and registers to assist with pinpointing attendance pattern errors standardly.</p>
                </div>
              )}
              {aiChat.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-black text-white dark:bg-zinc-150 dark:text-zinc-900 rounded-tr-none' : 'bg-neutral-100 dark:bg-zinc-850 text-neutral-800 dark:text-zinc-200 rounded-tl-none border border-black/5 dark:border-white/10'}`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-100 dark:bg-zinc-850 p-4 rounded-2xl rounded-tl-none border border-black/5 dark:border-white/10 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 animate-spin text-emerald-600" />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-neutral-400">Analyzing school telemetry...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt input Form */}
            <form onSubmit={handleAskAI} className="p-4 border-t border-black/5 dark:border-white/10 flex gap-2">
              <input 
                placeholder="Analyze active class registers / outline department metrics..."
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-zinc-800 text-xs border border-black/5 dark:border-white/10 rounded-xl focus:outline-none"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                disabled={aiLoading}
              />
              <button 
                type="submit"
                disabled={aiLoading}
                className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 ml-1">Academics Inquiries</h3>
            <div className="space-y-2">
              {[
                "Flag students with missing attendance records",
                "Recommend courses tracking high absence",
                "Formulate standard monthly report summary request"
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setAiPrompt(suggestion)}
                  className="w-full p-4 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 rounded-2xl text-left text-xs text-neutral-600 dark:text-zinc-300 transition-colors uppercase font-mono tracking-tight cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Guidelines details */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-8 rounded-3xl space-y-6 shadow-md border border-emerald-800">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-black bg-white/20 px-3 py-1 rounded-full">Lipa Na M-Pesa</span>
              <span className="text-[10px] uppercase font-bold text-emerald-100 italic font-mono">Official Guidelines</span>
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] text-emerald-100 block font-mono">STEP-BY-STEP PAYMENT PROCEDURE</span>
              <h2 className="text-2xl font-black uppercase tracking-tight leading-tight">Pay to Till Number 3439291</h2>
              <p className="text-xs text-emerald-50/90 leading-relaxed font-sans">
                Follow these simple steps on your mobile phone to complete the subscription renewal and keep your university attendance tracking portals fully active.
              </p>
            </div>

            <div className="space-y-3.5 text-xs font-sans">
              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 font-black text-[10px] shrink-0 mt-0.5 font-mono">1</span>
                <div>
                  <h4 className="font-bold uppercase tracking-wide">Access M-Pesa client</h4>
                  <p className="text-emerald-100/90 text-[11px] mt-0.5">Open your Safaricom SIM Toolkit or M-Pesa application on your phone.</p>
                </div>
              </div>
              
              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 font-black text-[10px] shrink-0 mt-0.5 font-mono">2</span>
                <div>
                  <h4 className="font-bold uppercase tracking-wide font-sans">Lipa Na M-Pesa Menu</h4>
                  <p className="text-emerald-100/90 text-[11px] mt-0.5">Select the <strong>Lipa Na M-Pesa</strong> option, then choose the <strong>Buy Goods and Services</strong> option.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 font-black text-[10px] shrink-0 mt-0.5 font-mono">3</span>
                <div>
                  <h4 className="font-bold uppercase tracking-wide font-sans">Enter Till Number</h4>
                  <p className="text-emerald-100/90 text-[11px] mt-0.5">
                    Input Till Number: <strong className="font-mono text-white bg-black/20 px-1.5 py-0.5 rounded ml-0.5 select-all">3439291</strong>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 font-black text-[10px] shrink-0 mt-0.5 font-mono">4</span>
                <div>
                  <h4 className="font-bold uppercase tracking-wide font-sans">Enter Invoice Amount</h4>
                  <p className="text-emerald-100/90 text-[11px] mt-0.5">
                    Specify: <strong>KES {schoolObj?.billing_amount || '1,500'}</strong> (standard monthly license invoice).
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 font-black text-[10px] shrink-0 mt-0.5 font-mono">5</span>
                <div>
                  <h4 className="font-bold uppercase tracking-wide font-sans">Merchant & Pin Verification</h4>
                  <p className="text-emerald-100/90 text-[11px] mt-0.5">
                    Verify the destination merchant displays as <strong className="text-white">Shem Omondi</strong>, then complete the transaction with your standard M-Pesa Pin code.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 font-black text-[10px] shrink-0 mt-0.5 font-mono">6</span>
                <div>
                  <h4 className="font-bold uppercase tracking-wide font-sans">Log Confirmation Reference</h4>
                  <p className="text-emerald-100/90 text-[11px] mt-0.5">
                    Copy the unique 10-character code (e.g. QRT5XZ67SP) and paste it in the Verification Form on the right. Standard activations run in less than 15 minutes!
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/10 my-4" />

            <div className="flex flex-col sm:flex-row justify-between text-xs text-emerald-100 gap-2 font-mono uppercase">
              <div>
                <span className="block text-[10px] opacity-75 font-sans uppercase">Subscription status</span>
                <span className="font-bold text-white uppercase mt-0.5 block font-sans">
                  {schoolObj?.paid_status === 'paid' ? 'Active Account (Paid)' : schoolObj?.paid_status === 'pending_activation' ? 'Verification Awaiting (Pending)' : 'Unpaid (Quota Inactive)'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] opacity-75 font-sans uppercase">Configured Billing</span>
                <span className="font-bold text-white mt-0.5 block">KES {schoolObj?.billing_amount || '1,500'}/month</span>
              </div>
            </div>
          </div>

          {/* Verification input card */}
          <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
            <div className="border-b border-black/5 dark:border-white/10 pb-4">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5 dark:text-zinc-100">
                <CreditCard className="text-emerald-600" /> Subscription Renewal Verification Form
              </h3>
              <p className="text-[11px] text-neutral-400 dark:text-zinc-500 mt-1">If you have paid via Till 3439291, enter verification details to instantly submit to developer.</p>
            </div>

            <form onSubmit={handleSimulatePayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500">M-PESA REF NUMBER</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. QRT5XZ67SP"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-850 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-500">PAID AMOUNT (KES)</label>
                  <input
                    type="number"
                    required
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-850 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-400">SENDER PHONE NUMBER</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0712345678"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-850 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={paymentPhone}
                    onChange={e => setPaymentPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-zinc-400">SENDER NAME / ALIAS</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-zinc-850 text-neutral-900 dark:text-zinc-100 border border-black/5 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={paymentName}
                    onChange={e => setPaymentName(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={paymentSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <QrCode className="w-4 h-4 animate-pulse" />
                {paymentSubmitting ? 'PROCESSING...' : 'Verify Payment & Open WhatsApp Link'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const location = useLocation();
  const [repAuth, setRepAuth] = useState(localStorage.getItem('auth_rep') === 'true');
  const [lecturerAuth, setLecturerAuth] = useState(localStorage.getItem('auth_lecturer') === 'true');
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') !== 'light');
  const [isLocked, setIsLocked] = useState(localStorage.getItem('portal_locked_state') === 'true');
  const [emulatedMode] = useState(emulatorEnabled);

  const toggleApiMode = () => {
    if (emulatorEnabled) {
      localStorage.removeItem('emulator_force_enabled');
      alert('Reconnecting to your Live Server SQLite database in progress...');
    } else {
      localStorage.setItem('emulator_force_enabled', 'true');
      alert('Switching to Offline local browser sandbox database storage...');
    }
    window.location.reload();
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // fresh session tracker to lock the website when it was closed
  useEffect(() => {
    const wasClosed = !sessionStorage.getItem('fresh_session_tracker');
    sessionStorage.setItem('fresh_session_tracker', 'active');
    
    // Automatically trigger lock screen if they were authenticated
    const hasAnyAuth = localStorage.getItem('auth_rep') === 'true' || 
                       localStorage.getItem('auth_lecturer') === 'true' || 
                       localStorage.getItem('auth_developer') === 'true' || 
                       localStorage.getItem('auth_superadmin') === 'true';

    if (wasClosed && hasAnyAuth) {
      // Clear active credentials to securely prompt for full password login upon re-opening website.
      localStorage.removeItem('auth_rep');
      localStorage.removeItem('auth_lecturer');
      localStorage.removeItem('auth_developer');
      localStorage.removeItem('auth_superadmin');
      localStorage.removeItem('portal_locked_state');
      setRepAuth(false);
      setLecturerAuth(false);
      setIsLocked(false);
    }
  }, []);

  // 20 minutes inactivity lockout timer
  useEffect(() => {
    let lastActivity = Date.now();
    
    const hasAnyActiveAuth = () => {
      const active = localStorage.getItem('auth_rep') === 'true' || 
                     localStorage.getItem('auth_lecturer') === 'true' || 
                     localStorage.getItem('auth_developer') === 'true' || 
                     localStorage.getItem('auth_superadmin') === 'true';
      return active;
    };

    const updateActivity = () => {
      lastActivity = Date.now();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    const interval = setInterval(() => {
      const now = Date.now();
      const twentyMins = 20 * 60 * 1000;
      if (now - lastActivity >= twentyMins && hasAnyActiveAuth()) {
        setIsLocked(true);
        localStorage.setItem('portal_locked_state', 'true');
      }
    }, 15000); // Check every 15 seconds

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      clearInterval(interval);
    };
  }, []);

  const isRepPortal = location.pathname === '/rep-portal-access';
  const isLecturerPortal = location.pathname === '/lecturer-portal';
  const isDevPortal = location.pathname === '/developer/panel';
  const isSuperAdminPortal = location.pathname === '/school-superadmin';

  return (
    <div className="min-h-screen bg-[#f5f5f4] dark:bg-[#080b11] text-neutral-900 dark:text-zinc-50 font-sans selection:bg-emerald-100 dark:selection:bg-emerald-900/50 transition-colors duration-200 relative overflow-x-hidden">
      {/* PREMIUM AMBIENT GLOWING ANIMATED BACKDROP ORBS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {/* Soft emerald pulse orb */}
        <div className="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-emerald-400/12 dark:bg-emerald-950/15 blur-[120px] animate-float-slow-1" />
        
        {/* Soft coastal blue pulse orb */}
        <div className="absolute bottom-[-15%] right-[-10%] w-[65vw] h-[65vw] rounded-full bg-sky-400/10 dark:bg-indigo-950/20 blur-[140px] animate-float-slow-2" />
        
        {/* Soft amber highlight center-right */}
        <div className="absolute top-[35%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-amber-400/6 dark:bg-amber-950/10 blur-[100px] animate-float-slow-3" />
      </div>

      {/* GLOBAL WELCOME RUNNING MESSAGE BANNER */}
      <div className="bg-emerald-600 dark:bg-emerald-950 text-white dark:text-emerald-100 text-[11px] font-semibold py-2 px-4 shadow-sm relative z-40 overflow-hidden border-b border-emerald-700/30">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="bg-white/20 select-none text-white text-[8px] uppercase tracking-widest font-black px-2 py-0.5 rounded shrink-0 font-mono animate-pulse">VISION UPDATE</span>
          <marquee className="w-full font-medium" scrollamount="4">
            ✨ Welcome to the Attendance Matrix! 🚀 Our Grand Hybrid Attendance System is coming soon! This will comprise full digital online video classes, direct virtual lecture tracking, and live attendance authentication to perfectly favor and support both physical and online students. ✨
          </marquee>
        </div>
      </div>

      <main className="pb-24 relative z-10">
        <Routes>
          <Route path="/" element={<StudentPortal />} />
          <Route 
            path="/rep-portal-access" 
            element={repAuth ? <AdminDashboard /> : <LoginScreen role="rep" onLogin={() => setRepAuth(true)} />} 
          />
          <Route 
            path="/lecturer-portal" 
            element={lecturerAuth ? <LecturerPortal /> : <LoginScreen role="lecturer" onLogin={() => setLecturerAuth(true)} />} 
          />
          <Route 
            path="/developer/panel" 
            element={<DeveloperPanel />} 
          />
          <Route 
            path="/school-superadmin" 
            element={<SuperadminPortal />} 
          />
        </Routes>
      </main>

      {/* Footer Info */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-900/95 backdrop-blur-md border-t border-black/5 dark:border-white/10 py-2 px-3 flex flex-wrap justify-center items-center gap-x-3 gap-y-1 sm:gap-x-4 sm:gap-y-1.5 z-50 select-none">
        <div 
          onClick={() => alert('HYBRID OFFLINE COEXISTENCE:\n\nThis application is engineered for student offline resilience. If students are offline or have limited connection, the local storage caches state automatically. Lecturers, Reps, and Superadmins can update courses, lectures, and active rosters online, and these changes are cached of student-side records and seamlessly synchronise, rendering continuous coordination reliable in both connected and disconnected environments.')}
          className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-full cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all select-none"
          title="Click to view details on offline/online synchronization"
        >
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          <span>🌐 Hybrid Sync: Active</span>
        </div>

        {emulatedMode ? (
          <div 
            onClick={toggleApiMode}
            className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest rounded-full cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all select-none"
            title="Engine: Offline Sandbox Emulator. Click to attempt connecting to the Live Server database."
          >
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
            <span>📴 ENGINE: Sandbox Offline Emulator (Click to Sync Server)</span>
          </div>
        ) : (
          <div 
            onClick={toggleApiMode}
            className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/45 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-full cursor-pointer hover:bg-blue-105 dark:hover:bg-blue-900/35 transition-all select-none"
            title="Engine: Live Server SQLite. Click to lock in Offline Sandbox Emulator mode."
          >
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
            <span>🟢 ENGINE: SQLite Live DB (Click to Emulate Offline)</span>
          </div>
        )}
        
        <div className="hidden sm:block h-3.5 w-px bg-black/10 dark:bg-white/10" />
        
        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-zinc-400">
          <Info className="w-2.5 h-2.5" /> 
          {isLecturerPortal ? 'LECTURER MODE' : isRepPortal ? 'REPRESENTATIVE MODE' : isDevPortal ? 'DEVELOPER CONTROL' : isSuperAdminPortal ? 'SUPERADMIN OVERSIGHT' : 'STUDENT MODE'}
        </div>
        
        <div className="hidden sm:block h-3.5 w-px bg-black/10 dark:bg-white/10" />
        
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link 
            to="/" 
            className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${location.pathname === '/' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors'}`}
          >
            Student
          </Link>
          <Link 
            to="/lecturer-portal" 
            className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${location.pathname === '/lecturer-portal' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors'}`}
          >
            Lecturer
          </Link>
          <Link 
            to="/rep-portal-access" 
            className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${location.pathname === '/rep-portal-access' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors'}`}
          >
            Rep Portal
          </Link>
          <Link 
            to="/school-superadmin" 
            className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${location.pathname === '/school-superadmin' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors'}`}
          >
            Superadmin
          </Link>
          <Link 
            to="/developer/panel" 
            className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${location.pathname === '/developer/panel' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors'}`}
          >
            Developer
          </Link>
        </div>
        
        {/* Manual Lock Action trigger for password-login systems */}
        {(repAuth || lecturerAuth || localStorage.getItem('auth_developer') === 'true' || localStorage.getItem('auth_superadmin') === 'true') && (
          <>
            <div className="hidden sm:block h-3.5 w-px bg-black/10 dark:bg-white/10" />
            <button
              onClick={() => {
                setIsLocked(true);
                localStorage.setItem('portal_locked_state', 'true');
              }}
              className="p-0.5 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-md transition-colors flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest cursor-pointer border border-red-500/10"
              title="Lock Current Session"
            >
              <Lock className="w-3 h-3" />
              <span>Lock Portal</span>
            </button>
          </>
        )}

        <div className="hidden sm:block h-3.5 w-px bg-black/10 dark:bg-white/10" />
        
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-0.5 px-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 cursor-pointer"
          title={isDarkMode ? 'Switch to Eye-Safe Light Mode' : 'Switch to Space Dark Mode'}
        >
          {isDarkMode ? (
            <>
              <svg className="w-3 h-3 text-emerald-600 fill-emerald-600 dark:text-emerald-400 dark:fill-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464a1 1 0 10-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" />
              </svg>
              <span>EYE-SAFE LIGHT</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3 text-emerald-600 fill-emerald-600 dark:text-emerald-400 dark:fill-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              <span>SPACE DARK</span>
            </>
          )}
        </button>
      </footer>

      {/* FULLGLASS INACTIVITY AUTO-LOCK OVERLAY CONTAINER */}
      {isLocked && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-2xl z-[9999] flex items-center justify-center p-6 text-neutral-900 dark:text-zinc-100"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-2xl max-w-sm w-full space-y-6 text-center"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-500/10 text-red-500 dark:text-red-400 rounded-3xl animate-pulse">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold tracking-tight uppercase">Portal Locked</h3>
              <p className="text-xs text-neutral-400 max-w-[250px] mx-auto leading-relaxed">
                This portal is locked due to manual execution or 20 minutes inactivity. Please input active password to resume.
              </p>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const passInput = (e.currentTarget.elements.namedItem('lockPassword') as HTMLInputElement).value;
                
                // Determine active role
                const isRep = localStorage.getItem('auth_rep') === 'true';
                const isLecturer = localStorage.getItem('auth_lecturer') === 'true';
                const isDeveloper = localStorage.getItem('auth_developer') === 'true';
                const isSuperadmin = localStorage.getItem('auth_superadmin') === 'true';

                let correctPassword = '';
                if (isRep) correctPassword = sessionStorage.getItem('cached_pass_rep') || '';
                else if (isLecturer) correctPassword = sessionStorage.getItem('cached_pass_lecturer') || '';
                else if (isDeveloper) correctPassword = sessionStorage.getItem('cached_pass_developer') || '';
                else if (isSuperadmin) correctPassword = sessionStorage.getItem('cached_pass_superadmin') || '';

                if (passInput === correctPassword && correctPassword) {
                  setIsLocked(false);
                  localStorage.removeItem('portal_locked_state');
                } else {
                  alert('Incorrect verification password. Please try again or re-authenticate.');
                }
              }}
              className="space-y-4 text-left"
            >
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-[#059669] ml-1">🔒 Password</label>
                <input
                  type="password"
                  name="lockPassword"
                  autoFocus
                  required
                  placeholder="Enter your security password..."
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-zinc-850 border border-black/5 dark:border-white/10 rounded-xl text-sm text-neutral-900 dark:text-zinc-100 focus:outline-[#059669] font-mono shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-xs rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Unlock Session
              </button>
            </form>

            <button
              onClick={() => {
                // Clear active authentication levels and lock flag
                localStorage.removeItem('auth_rep');
                localStorage.removeItem('auth_lecturer');
                localStorage.removeItem('auth_developer');
                localStorage.removeItem('auth_superadmin');
                localStorage.removeItem('portal_locked_state');
                setIsLocked(false);
                setRepAuth(false);
                setLecturerAuth(false);
                window.location.reload();
              }}
              className="text-[10px] font-mono text-neutral-400 hover:text-red-500 hover:underline tracking-tight block mx-auto pt-2 uppercase cursor-pointer"
            >
              Exit &amp; Terminate Session (For Full Login)
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
