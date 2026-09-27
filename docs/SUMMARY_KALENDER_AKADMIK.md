# 🎓 Kalender Akademik - Quick Reference

**Tanggal**: 24 September 2026 | **Status**: ✅ Production Ready

---

## 🚀 Quick Start

### Install & Run
```bash
npm run db:migrate:calendar      # Add columns to existing DB
npm run db:seed                  # Insert sample data
npm run dev                      # Start development server
```

### Access Calendar
- URL: `http://localhost:3000/dashboard/calendar`
- Menu Path:
  - **Admin**: Dashboard → Komunikasi → **Kalender**
  - **Teacher**: Dashboard → Pembelajaran → **Kalender Akademik**
  - **Student**: Dashboard → Belajar → **Kalender Akademik**
  - **Parent**: Dashboard → Anak Saya → **Aktivitas → Pengumuman**

### Sample Login
```
Email: admin@sekolah.com
Password: password123
Role: Administrator (full CRUD access)
```

---

## 📅 What's New (v2 Enhancements)

### ✨ From Current Implementation
1. **Dashboard Widgets** - "Agenda Mendatang" card showing top 7 events in next 14 days
2. **iCal Export** - Download individual events as `.ics` files
3. **Smart Upcoming API** - `/api/calendar/upcoming` returns timeline-aware events

### 🧩 Features Already Implemented
- Full monthly calendar grid with color-coded events
- Role-based access control (Admin/Teacher/Student/Parent)
- Event filtering by type (exam/holiday/activity/etc)
- Interactive month navigation
- Double-click to create events quickly
- Edit/delete functionality for admins only
- Automatic integration with published exams
- Responsive design (mobile-friendly)
- Dark mode support via Tailwind CSS

---

## 🗝️ Key Endpoints

| Method | Endpoint                    | Description                      | Auth   |
|--------|----------------------------|----------------------------------|--------|
| GET    | `/api/calendar`            | Get filtered calendar events     | ✅ User |
| POST   | `/api/calendar`            | Create new event                 | ✅ Admin |
| PATCH  | `/api/calendar/:id`        | Update event details             | ✅ Admin |
| DELETE | `/api/calendar/:id`        | Delete event                     | ✅ Admin |
| GET    | `/api/calendar/upcoming`   | Top upcoming events (max 7)      | ✅ User |
| GET    | `/api/calendar/:id.ical`   | Download .ics file               | ✅ User |

---

## 🎨 Event Types Reference

| Code          | Label              | Color  | Holiday? |
|---------------|--------------------|--------|----------|
| `exam`        | Ujian / Asesmen    | Red    | ❌       |
| `holiday`     | Hari Libur         | Pink   | ✅       |
| `activity`    | Kegiatan Sekolah   | Green  | ❌       |
| `meeting`     | Rapat / Raker      | Indigo | ❌       |
| `competition` | Lomba / Kompetisi  | Amber  | ❌       |
| `semester_start` | Awal Semester  | Cyan   | ❌       |
| `semester_end` | Akhir Semester    | Violet | ❌       |
| `break`       | Libur Semester     | Teal   | ✅       |
| `other`       | Lainnya            | Slate  | ❌       |

---

## 💻 Common API Calls

### Create Exam Event
```bash
POST http://localhost:3000/api/calendar
Headers: Authorization: Bearer {token}

{
  "title": "Ujian Matematika",
  "startDate": "2026-10-15",
  "endDate": "2026-10-18",
  "type": "exam",
  "location": "Ruang Kelas 101",
  "visibility": "internal"
}
```

### Get Upcoming Events
```bash
GET http://localhost:3000/api/calendar/upcoming
Headers: Authorization: Bearer {token}

Response: { "data": [ { title, startDate, daysUntil, color } ... ] }
```

### Export iCal
```bash
GET http://localhost:3000/api/calendar/cal_abc123.ical
↓ Downloads: ujian-matematika.ics
```

---

## 🔑 Database Schema Highlights

**Table**: `calendar_events`

Key columns:
- `id` - UUID primary key
- `title` - Event title (required)
- `start_date`, `end_date` - Date range
- `type` - Enum (9 types)
- `visibility` - public/internal/private
- `is_holiday` - Boolean flag
- `color` - Hex override (auto from type)

**Integration**: Also merges `examEvents` where status='published'

---

## 📊 Dashboard Widget Structure

### Teacher & Student Dashboards
Located in right column:

**Component**: Agenda Mendatang  
**Data Source**: `/api/calendar/upcoming`  
**Limit**: 7 events, max 14 days ahead  
**Display**: 
- Color dot per event
- Days until label ("Hari ini"/"Besok"/"X hari lagi")
- "LIBUR" badge when isHoliday=true
- Link to full calendar view

---

## ⚙️ Configuration

### Role Permissions

| Action         | Admin | Teacher | Student | Parent |
|----------------|-------|---------|---------|--------|
| View Public    | ✅    | ✅      | ✅      | ✅     |
| View Internal  | ✅    | ✅*     | ❌      | ❌     |
| View Private   | ✅    | ❌      | ❌      | ❌     |
| Create         | ✅    | ❌      | ❌      | ❌     |
| Edit           | ✅    | ❌      | ❌      | ❌     |
| Delete         | ✅    | ❌      | ❌      | ❌     |

*\* Teachers can see internal-only staff meetings*

---

## 🐛 Troubleshooting

| Problem                          | Solution                            |
|----------------------------------|-------------------------------------|
| Migration fails                  | Ensure local.db writable, re-run    |
| No events appear                 | Seed database first (`npm run db:seed`) |
| Admin can't create events        | Verify role='admin', check token    |
| UI shows empty calendar          | Check browser console for errors    |
| Wrong colors display             | Verify hex format (#RRGGBB)         |
| iCal download broken             | Check endpoint contains .ical suffix |

---

## 🧪 Testing Checklist

Before production deployment:

- [ ] Run migration successfully
- [ ] Seed database works
- [ ] Login as admin creates event
- [ ] Login as teacher views only
- [ ] Login as student sees public only
- [ ] Dashboard widget loads correctly
- [ ] iCal file opens in external app
- [ ] Month navigation works
- [ ] Filter dropdown filters properly
- [ ] Mobile responsive on phone/tablet

---

## 📈 Next Steps (Optional)

Recommended priority order:

1. **Email Reminders** - Send H-3 notification before exam
2. **Bulk Import** - CSV upload for yearly planning
3. **Recurring Events** - Weekly templates
4. **Multi-language** - English labels option
5. **Mobile App** - Deep link integration

---

## 📚 Documentation Files

- `FITUR_KALENDER_AKADMIK.md` - Original comprehensive documentation
- `DOKUMENTASI_KALENDER_AKADMIK.md` - Summary checklist
- `IMPLEMENTASI_KALENDER_V2.md` - Advanced technical guide
- `SUMMARY_KALENDER_AKADMIK.md` - This quick reference

---

## 👥 Contacts & Credits

**Curriculum Expert Design**: Curriculum Team  
**Implementation**: Development Team  
**Version**: 2.0 (September 2026)  

Questions? Refer to detailed docs or contact team lead.

---

**Status**: Feature complete. Ready for user testing and deployment. 🚀
