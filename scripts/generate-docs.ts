import * as fs from 'fs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TableOfContents, Header, Footer, PageNumber, NumberFormat } from 'docx';

const doc = new Document({
    sections: [
        {
            headers: {
                default: new Header({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Class Attendance Pro - Project Documentation",
                                    color: "888888",
                                    size: 16,
                                }),
                            ],
                            alignment: AlignmentType.RIGHT,
                        }),
                    ],
                }),
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    children: ["Page ", PageNumber.CURRENT],
                                }),
                            ],
                            alignment: AlignmentType.CENTER,
                        }),
                    ],
                }),
            },
            children: [
                // Title Page
                new Paragraph({
                    text: "P.C KINYANJUI TECHNICAL TRAINING INSTITUTE",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 2000 },
                }),
                new Paragraph({
                    text: "DEPARTMENT OF COMPUTER SCIENCE / ICT",
                    heading: HeadingLevel.HEADING_2,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "PROJECT PROPOSAL & USER DOCUMENTATION",
                            bold: true,
                            size: 32,
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 800, after: 800 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "SYSTEM NAME: CLASS ATTENDANCE PRO (OFFLINE HOTSPOT VERSION)",
                            bold: true,
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    text: "PRESENTED BY: [YOUR NAME / CLASS REP]",
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 1200 },
                }),
                new Paragraph({
                    text: "DATE: FEBRUARY 2026",
                    alignment: AlignmentType.CENTER,
                }),

                // Table of Contents Placeholder
                new Paragraph({
                    text: "1. INTRODUCTION",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 2000 },
                    pageBreakBefore: true,
                }),
                new Paragraph({
                    text: "Class Attendance Pro is a specialized offline attendance management system designed to work in environments with limited internet connectivity. It utilizes a local Wi-Fi hotspot to create a private network where students and lecturers can interact with a central server hosted on a mobile device (Termux) or laptop.",
                }),

                new Paragraph({
                    text: "2. PROBLEM STATEMENT",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400 },
                }),
                new Paragraph({
                    text: "Traditional attendance tracking methods (paper-based) are prone to proxy marking, data loss, and time-consuming manual entry. Existing digital solutions often require expensive internet data bundles, which is a barrier in many technical institutions.",
                }),

                new Paragraph({
                    text: "3. OBJECTIVES",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "• Eliminate proxy marking using time-sensitive OTPs.", break: 1 }),
                        new TextRun({ text: "• Provide real-time verification for lecturers.", break: 1 }),
                        new TextRun({ text: "• Enable offline operation via local hotspot.", break: 1 }),
                        new TextRun({ text: "• Generate professional PDF reports for administration.", break: 1 }),
                    ],
                }),

                new Paragraph({
                    text: "4. SYSTEM FEATURES",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "• Dual-Timer System: Session timer and 20-minute OTP window.", bold: true, break: 1 }),
                        new TextRun({ text: "• Secure Portals: Password-protected Representative and Lecturer areas.", bold: true, break: 1 }),
                        new TextRun({ text: "• Automated Cleanup: Sessions reset automatically when timers elapse.", bold: true, break: 1 }),
                        new TextRun({ text: "• PDF Reporting: Official school-branded reports with serial numbers.", bold: true, break: 1 }),
                    ],
                }),

                new Paragraph({
                    text: "5. USER GUIDE & NAVIGATION",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400 },
                    pageBreakBefore: true,
                }),

                new Paragraph({
                    text: "5.1 REPRESENTATIVE DASHBOARD",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "The Rep Dashboard is the control center. Use it to register students, add units, and start sessions.",
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "[INSERT SCREENSHOT OF REP DASHBOARD HERE]", color: "FF0000", italics: true }),
                    ],
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Steps:", bold: true }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "1. Login with password (default: admin123).", break: 1 }),
                        new TextRun({ text: "2. Add Students and Units in the Registry section.", break: 1 }),
                        new TextRun({ text: "3. Select a Unit and click 'Start Session'.", break: 1 }),
                        new TextRun({ text: "4. Click 'Enable OTP' to allow students to mark attendance.", break: 1 }),
                    ],
                }),

                new Paragraph({
                    text: "5.2 STUDENT PORTAL",
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400 },
                }),
                new Paragraph({
                    text: "Students access this portal via the shared hotspot link.",
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "[INSERT SCREENSHOT OF STUDENT PORTAL HERE]", color: "FF0000", italics: true }),
                    ],
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Steps:", bold: true }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "1. Connect to the Rep's Hotspot.", break: 1 }),
                        new TextRun({ text: "2. Select name from the list.", break: 1 }),
                        new TextRun({ text: "3. Enter the 6-digit OTP provided by the Rep.", break: 1 }),
                        new TextRun({ text: "4. Wait for the 10-second security countdown (staggered access control).", break: 1 }),
                        new TextRun({ text: "5. Click 'Mark Attendance'.", break: 1 }),
                    ],
                }),

                new Paragraph({
                    text: "5.3 LECTURER PORTAL",
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400 },
                }),
                new Paragraph({
                    text: "Lecturers use this to verify their presence for the class.",
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "[INSERT SCREENSHOT OF LECTURER PORTAL HERE]", color: "FF0000", italics: true }),
                    ],
                    alignment: AlignmentType.CENTER,
                }),

                new Paragraph({
                    text: "6. TECHNICAL SETUP (TERMUX)",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400 },
                    pageBreakBefore: true,
                }),
                new Paragraph({
                    text: "To run the system on your mobile phone:",
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "1. Install Termux and Python.", break: 1 }),
                        new TextRun({ text: "2. Copy the project folder to your phone.", break: 1 }),
                        new TextRun({ text: "3. Run 'python server.py' in the project directory.", break: 1 }),
                        new TextRun({ text: "4. Ensure the 'dist' folder is present for the web interface.", break: 1 }),
                    ],
                }),

                new Paragraph({
                    text: "7. CONCLUSION",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400 },
                }),
                new Paragraph({
                    text: "Class Attendance Pro provides a robust, cost-effective, and professional solution for attendance management at P.C Kinyanjui Technical Training Institute, ensuring integrity and efficiency in academic record-keeping.",
                }),
                new Paragraph({
                    children: [
                        new TextRun({ 
                            text: "Note: Using a smartphone as a local server is suitable for small-scale or demonstration environments. For larger classes, dedicated networking hardware is recommended.",
                            italics: true,
                            size: 18,
                        }),
                    ],
                    spacing: { before: 200 },
                }),
            ],
        },
    ],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("Project_Documentation.docx", buffer);
    console.log("Documentation generated successfully in Project_Documentation.docx");
});
