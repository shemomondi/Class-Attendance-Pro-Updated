# Class Attendance Pro

A full-stack offline attendance management system designed for schools and institutions.

## Project Structure

- **Backend (Python)**: `server.py` handles API requests, OTP generation, and real-time updates using Flask and Socket.io.
- **Backend (Node.js)**: `server.ts` is the original backend used for development and preview.
- **Frontend**: Built with React, Vite, and TypeScript in the `src/` directory.
- **Database**: SQLite (`attendance.db`) stores all student, unit, and attendance data.
- **Production Files**: The `dist/` folder contains the compiled frontend served by the Python backend.

## How to Run (Termux / Phone)

1.  **Install Python**: `pkg install python`
2.  **Install Dependencies**: `pip install flask flask-cors flask-socketio`
3.  **Run the Server**: `python server.py`
4.  **Access the App**: Open your browser and go to `http://<your-phone-ip>:3000`

## Key Features

- **OTP-Based Attendance**: Students mark themselves present using a unique 6-digit code.
- **Lecturer Verification**: Lecturers verify their presence for each session.
- **PDF Reports**: Generate professional attendance reports for each unit.
- **Offline First**: Designed to work on a local network without internet.
- **Real-time Sync**: Dashboard updates instantly as students mark attendance.
