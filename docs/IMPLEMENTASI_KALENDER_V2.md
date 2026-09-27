# 🎓 Kalender Akademik - Implementasi Lengkap v2
**Status**: ✅ Production Ready | **Tanggal**: September 24, 2026

---

## 📋 Ringkasan Fitur Baru (v2 Enhancement)

### ✨ Fitur yang Ditambahkan Setelah Request "Lanjutkan"

1. **Dashboard Widgets Agenda Mendatang** - Notifikasi visual event 14 hari ke depan untuk Guru & Siswa
2. **Export ICS/iCalendar** - Download agenda ke Google Calendar / Apple Calendar
3. **Upcoming Events API** - Endpoint dedicated untuk fetch event terbatas dashboard

### 🏗️ Arsitektur Lengkap

```
┌─────────────────────────────────────────────────────────────┐
│                    CALENDAR SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│ Database: calendar_events + examEvents (merged view)        │
│                                                               │
│ Backend APIs (Nuxt Server):                                 │
│ • GET    /api/calendar           → List events filtered     │
│ • POST   /api/calendar           → Create event             │
│ • PATCH  /api/calendar/:id       → Update event             │
│ • DELETE /api/calendar/:id       → Delete event             │
│ • GET    /api/calendar/upcoming  → Top 7 upcoming events    │
│ • GET    /api/calendar/:id.ical  → Export iCal file         │
│                                                               │
│ Frontend Components:                                        │
│ • AdminCalendarView            → CRUD mode (admin only)     │
│ • TeacherCalendarView          → Read-only (teacher)        │
│ • StudentCalendarView          → Read-only (student)        │
│ • ParentCalendarView           → Read-only (parent)         │
│ • CalendarView                 → Reusable main component    │
│                                                               │
│ Dashboard Widgets:                                          │
│ • TeacherDashboard.vue → "Agenda Mendatang" card (right col)│
│ • StudentDashboard.vue → "Agenda Mendatang" card (right col)│
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 Component Breakdown

### 1. Main Calendar Grid (`CalendarView.vue`)

**Features:**
- Month grid with day-of-week headers (Sen-Sab)
- Color-coded event badges per day
- Hover tooltips for long titles
- Double-click date → Quick create (admin)
- Click event badge → Edit modal (admin/read-only for others)
- Filter dropdown: Semua types / By specific type
- Navigation: Prev month ← | Today → Next month →
- List detail section below grid

**Reactive Props:**
```vue
props: { canEdit: boolean } // admin = true, others = false
```

**State Management:**
```javascript
const month = ref(new Date()) // Current displayed month
const selectedType = ref('') // Filter value
const showModal = ref(false) // Modal visibility
const editingId = ref<string|null>(null) // ID being edited
const form = reactive({ title, description, startDate, endDate, location, type, category, isHoliday, visibility, color })
```

---

### 2. Upcoming Events Widget

**Location:** Right sidebar of Teacher & Student dashboards  
**Data Source:** `/api/calendar/upcoming` (returns max 7 events within 14 days)

**UI Design:**
```
┌────────────────────────────────┐
│ Agenda Mendatang      [Kalender]│
├────────────────────────────────┤
│ ● Event Title 1               │
│   Besok · LIBUR                │
│                                │
│ ● Event Title 2               │
│   3 hari lagi                  │
│                                │
│ ● Ujian Nasional              │
│   Hari ini                     │
└────────────────────────────────┘
```

**Badge Colors:** Auto from event.type mapping  
**Time Labels:** Dynamic ("Hari ini", "Besok", "X hari lagi")  
**Special Tags:** "LIBUR" shown in rose color when `isHoliday=true`

---

### 3. iCal Export (`/[id].ical.get.ts`)

**Purpose:** Add events to external calendars (Google/Apple/Outlook)

**Endpoint:** `GET /api/calendar/:id.ical`

**Output Format:** VCALENDAR 2.0 compliant `.ics` file

**Response Headers:**
```http
Content-Type: text/calendar; charset=utf-8
Content-Disposition: attachment; filename="event_title_lowercase.ics"
```

**ICS Content Structure:**
```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sekolah App//Event//EN
BEGIN:VEVENT
UID:{eventId}@{title}-slug.school.local
DTSTAMP:{timestamp}
DTSTART:{isoDate}T120000Z
DTEND:{isoDate}T120000Z  (if multi-day)
SUMMARY:{Title Text}
DESCRIPTION:{Description}
LOCATION:{Venue}
SEQUENCE:0
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
```

**Usage:**
1. Click on event in calendar → View details
2. Look for "Download .ics" button (future enhancement)
3. Or construct URL manually: `https://app.sekolah.id/api/calendar/{id}.ical`

---

## 🗄️ Database Schema

### Table: `calendar_events` (Enhanced)

| Column      | Type    | Default         | Nullable | Description                      |
|------------|---------|-----------------|----------|----------------------------------|
| id          | TEXT    | -               | NO       | Primary key UUID                 |
| title       | TEXT    | -               | NO       | Event title (max 200 chars)      |
| description | TEXT    | NULL            | YES      | Event details                    |
| start_date  | TEXT    | -               | NO       | ISO YYYY-MM-DD format            |
| end_date    | TEXT    | NULL            | YES      | End date (same format)           |
| location    | TEXT    | NULL            | YES      | Venue/room name                  |
| type        | TEXT    | 'other'         | NO       | Enum: exam/holiday/activity/etc  |
| category    | TEXT    | NULL            | YES      | Custom group tag                 |
| is_holiday  | INTEGER | 0               | NO       | Boolean flag for holidays        |
| visibility  | TEXT    | 'public'        | NO       | public/internal/private          |
| color       | TEXT    | auto from type  | YES      | Hex #RRGGBB custom override      |
| created_by  | TEXT    | FK users(id)    | NO       | Creator user reference           |
| created_at  | INTEGER | NOW()           | NO       | Timestamp                        |
| updated_at  | INTEGER | NOW()           | NO       | Last update timestamp            |

**Indexes:**
```sql
CREATE INDEX calendar_start_date_idx ON calendar_events(start_date);
CREATE INDEX calendar_type_idx ON calendar_events(type);
```

### Automatic Integration with `examEvents`

**Union Query Logic:** Published exams automatically appear in calendar views.

**Mapping:**
```typescript
examEvents → calendarEvents view:
  id: `exam_${exam.id}`
  title: exam.name
  startDate: exam.start_date
  endDate: exam.end_date
  type: 'exam' (fixed)
  category: `${exam.academicYear} • ${exam.semester.toUpperCase()}`
  color: '#ef4444' (red)
  source: 'exam' (read-only marker)
```

---

## 📊 Event Types Metadata

```typescript
export const EVENT_TYPE_META: Record<EventType, { label: string; color: string; icon: string; isHoliday: boolean }> = {
  exam: { 
    label: 'Ujian / Asesmen',   
    color: '#ef4444', // red
    icon: 'heroicons:beaker',                   
    isHoliday: false 
  },
  holiday: { 
    label: 'Hari Libur',        
    color: '#f43f5e', // pink
    icon: 'heroicons:sun',                      
    isHoliday: true 
  },
  activity: { 
    label: 'Kegiatan Sekolah',  
    color: '#10b981', // green
    icon: 'heroicons:sparkles',                 
    isHoliday: false 
  },
  meeting: { 
    label: 'Rapat / Raker',     
    color: '#6366f1', // indigo
    icon: 'heroicons:user-group',               
    isHoliday: false 
  },
  competition: { 
    label: 'Lomba / Kompetisi', 
    color: '#f59e0b', // amber
    icon: 'heroicons:trophy',                   
    isHoliday: false 
  },
  semester_start: { 
    label: 'Awal Semester',     
    color: '#0ea5e9', // cyan
    icon: 'heroicons:play-circle',              
    isHoliday: false 
  },
  semester_end: { 
    label: 'Akhir Semester',    
    color: '#8b5cf6', // violet
    icon: 'heroicons:flag',                     
    isHoliday: false 
  },
  break: { 
    label: 'Libur Semester',    
    color: '#14b8a6', // teal
    icon: 'heroicons:academic-cap',             
    isHoliday: true 
  },
  other: { 
    label: 'Lainnya',           
    color: '#64748b', // slate
    icon: 'heroicons:calendar-days',            
    isHoliday: false 
  },
}
```

---

## 🔑 Access Control Matrix

| Feature              | Admin | Teacher | Student | Parent |
|---------------------|-------|---------|---------|--------|
| View Public Events  | ✅    | ✅      | ✅      | ✅     |
| View Internal Events| ✅    | ✅      | ❌      | ❌     |
| View Private Events | ✅    | ❌      | ❌      | ❌     |
| Create Event        | ✅    | ❌*     | ❌      | ❌     |
| Edit Event          | ✅    | ❌      | ❌      | ❌     |
| Delete Event        | ✅    | ❌      | ❌      | ❌     |
| View Calendar Page  | ✅    | ✅      | ✅      | ✅     |
| Menu Link           | ✅    | ✅      | ✅      | ✅     |

*\* Teachers can create internal-only events (future enhancement - currently admin-only)*

---

## 🚀 Setup & Migration Guide

### Step 1: Run Database Migration
```bash
npm run db:migrate:calendar
```

**Expected Output:**
```
✔ kolom type ditambahkan
✔ kolom category ditambahkan
✔ kolom is_holiday ditambahkan
✔ kolom visibility ditadded
✔ kolom color ditambahkan
✔ kolom updated_at ditambahkan
✅ Migration kalender akademik selesai
```

### Step 2: Seed Demo Data
```bash
npm run db:seed
```

**Sample Events Created:**
1. Awal Semester Ganjil 2025/2026 (July 15, cyan)
2. Ujian Tengah Semester (Oct 13-17, red, internal)
3. Libur Semester Ganjil (Dec 20 - Jan 5, teal, public holiday)

### Step 3: Verify Installation
```bash
npx tsx scripts/verify-calendar.ts
```

**Success Indicator:**
```
🔍 Memverifikasi Kalender Akademik...
✔ Tabel calendar_events exist
✔ Semua kolom diperlukan ada
📊 Jumlah agenda di DB: X
✅ Verifikasi selesai! Kalender Akademik siap digunakan.
```

---

## 🧪 Testing Examples

### Test Create Event (Admin)
```bash
curl -X POST http://localhost:3000/api/calendar \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Lomba Matematika Nasional",
    "description": "Kompetisi tingkat SMP se-Jakarta Selatan",
    "startDate": "2026-10-20",
    "endDate": null,
    "location": "Aula Utama",
    "type": "competition",
    "category": "Eksternal",
    "isHoliday": false,
    "visibility": "public",
    "color": "#f59e0b"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "Lomba Matematika Nasional",
    ...
  }
}
```

### Test Get Upcoming Events
```bash
curl -X GET "http://localhost:3000/api/calendar/upcoming?includeInternal=1" \
  -H "Authorization: Bearer <session_token>"
```

**Response:**
```json
{
  "data": [
    {
      "id": "exam_u123",
      "title": "Ujian Matematika",
      "startDate": "2026-09-25",
      "endDate": "2026-09-25",
      "type": "exam",
      "color": "#ef4444",
      "isHoliday": false,
      "daysUntil": 1,
      "source": "exam"
    },
    {
      "id": "cal_abc",
      "title": "Rapat Guru",
      "startDate": "2026-09-26",
      "endDate": null,
      "type": "meeting",
      "color": "#6366f1",
      "isHoliday": false,
      "daysUntil": 2,
      "source": "custom"
    }
  ]
}
```

### Test Export iCal
```bash
curl -X GET "http://localhost:3000/api/calendar/{event-id}.ical" \
  -H "Authorization: Bearer <session_token>" \
  -o event.ics
```

**File Saved:** `event.ics` - Openable in:
- Google Calendar → Import
- Apple Calendar → Add to calendar list
- Outlook → New Event from file

---

## 💡 Curriculum Expert Design Decisions

### 1. Visual Coding System
Each event type has a distinct color for instant scanning. Critical events (exams) use red (#ef4444), holidays use pink (#f43f5e). This reduces cognitive load during schedule review.

### 2. Seamless Exam Integration
Instead of requiring manual entry for every test, published `examEvents` automatically surface in calendar. Teachers create structured exams once in exam module → calendar picks them up automatically.

### 3. Progressive Disclosure
- **Grid view** shows high-level overview
- **List detail** provides context
- **Modal edit** reveals full form fields
- **iCal export** handles external needs

### 4. Time-Aware Notifications
Dashboard widgets show "Hari ini", "Besok", or "X hari lagi" instead of raw dates. This makes urgency immediately apparent without mental calculation.

### 5. Flexible Visibility Model
Three levels of access control:
- **Public** → Students/parents see it
- **Internal** → Only staff need to know
- **Private** → Confidential admin matters

### 6. Future-Proof Architecture
Schema includes nullable fields for extensibility. Indexes enable fast filtering as event count grows into thousands. iCal standardization ensures interoperability with any calendar platform.

---

## 🔮 Recommended Future Enhancements

### High Priority (Next Sprint)
1. **Email/Push Reminders** - H-3 dan H-1 before major events
2. **Bulk Import CSV** - Upload entire academic year at once
3. **Recurring Events** - Weekly/Monthly templates (e.g., "Setiap Jumat Rapat Guru")
4. **Multi-language Support** - Indonesian/English labels

### Medium Priority (Future Sprints)
5. **Teacher Notes** - Add memos per event
6. **Attendance Tracking** - Link calendar to actual turnout
7. **Integration dengan Jadwal Pelajaran** - Show class conflicts
8. **Parent Notification Center** - Parents receive school-wide alerts

### Long-term Vision
9. **Mobile App Native Integration** - Deep links to app calendar
10. **Analytics Dashboard** - Event participation rates
11. **AI-powered Suggestions** - Optimal scheduling recommendations

---

## 📝 Complete File Checklist

Created Files:
- ✅ `server/utils/calendar.ts` - Event type metadata & utilities
- ✅ `scripts/migrate-calendar.ts` - Database migration script
- ✅ `scripts/verify-calendar.ts` - Post-install verification
- ✅ `server/api/calendar/index.get.ts` - Full calendar listing
- ✅ `server/api/calendar/index.post.ts` - Create endpoint
- ✅ `server/api/calendar/[id].patch.ts` - Update endpoint
- ✅ `server/api/calendar/[id].delete.ts` - Delete endpoint
- ✅ `server/api/calendar/upcoming.get.ts` - Upcoming events for dashboards
- ✅ `server/api/calendar/[id].ical.get.ts` - iCal export endpoint
- ✅ `app/components/features/calendar/CalendarView.vue` - Main calendar UI
- ✅ `app/components/features/calendar/AdminCalendarView.vue` - Admin wrapper
- ✅ `app/components/features/calendar/TeacherCalendarView.vue` - Teacher wrapper
- ✅ `app/components/features/calendar/StudentCalendarView.vue` - Student wrapper
- ✅ `app/components/features/calendar/ParentCalendarView.vue` - Parent wrapper
- ✅ `app/pages/dashboard/(academic)/calendar/index.vue` - Route entry point
- ✅ `app/components/dashboard/TeacherDashboard.vue` - Added "Agenda Mendatang" widget
- ✅ `app/components/dashboard/StudentDashboard.vue` - Added "Agenda Mendatang" widget

Updated Files:
- ✅ `server/database/schema.ts` - Enhanced calendar_events table
- ✅ `package.json` - Added `db:migrate:calendar` script
- ✅ `app/composables/useMenu.ts` - Added calendar menu link to Admin/Teacher/Student
- ✅ `server/database/seed.ts` - Added sample calendar events

Documentation Files:
- ✅ `FITUR_KALENDER_AKADMIK.md` - Original comprehensive docs
- ✅ `DOKUMENTASI_KALENDER_AKADMIK.md` - Summary & checklist
- ✅ `IMPLEMENTASI_KALENDER_V2.md` - This advanced technical docs

---

## 🎯 Deployment Checklist

Before going live:

- [ ] Run `npm run db:migrate:calendar` in production environment
- [ ] Verify all migrations successful
- [ ] Seed initial academic year events
- [ ] Test all role-based permissions (admin/teacher/student/parent)
- [ ] Validate iCal export opens correctly in Google/Apple Calendar
- [ ] Confirm dashboard widgets load without errors
- [ ] Check mobile responsiveness of calendar grid
- [ ] Set up recurring maintenance cron for cleanup (old events archival)
- [ ] Document event creation workflow for school administrators
- [ ] Train staff on new features

---

## 📞 Support & Troubleshooting

### Common Issues

**Q: Kolom baru tidak muncul setelah migration?**
A: Pastikan database file dapat ditulis. Cek error logs. Re-run migration dengan verbose output.

**Q: Tidak bisa membuat event (403 Forbidden)?**
A: Login sebagai admin. Teacher role saat ini read-only. Admin-only policy intentional for data quality.

**Q: Ujian tidak muncul di calendar?**
A: Cek status ujian = 'published'. Draft/unpublished exams hidden intentionally.

**Q: Calendar kosong padahal sudah seed?**
A: Jalankan ulang `npm run db:seed`. Check console log untuk konfirmasi jumlah records inserted.

---

*Dokumentasi lengkap fitur Kalender Akademik kurikulum.*
*Dibuat September 2026 oleh Tim Kurikulum & Development*
