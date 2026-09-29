// Intellia360 — Teacher Dashboard mock data
// Modeled on the Intellia360 PRD/TRD entity groups:
// Identity (Users, Students), Learning (Courses, Lessons, Quiz),
// Gamification (XP, Coins, Badges, Leaderboards), Reports, Payments (read-only here).

const AVATAR_PALETTE = ["#5B3DF5","#F5A524","#12B76A","#F04438","#0EA5EA","#EC4899","#8B5CF6","#F59E0B"];

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260807);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

export const BADGES = [
  { id: "b1", name: "Streak Starter", icon: "Flame", tint: "amber", criteria: "3-day activity streak" },
  { id: "b2", name: "Quiz Whiz", icon: "Sparkles", tint: "violet", criteria: "Score 90%+ on 5 quizzes" },
  { id: "b3", name: "Fraction Master", icon: "PieChart", tint: "jade", criteria: "Complete the Fractions unit" },
  { id: "b4", name: "Early Bird", icon: "Sunrise", tint: "sky", criteria: "Complete a lesson before 9am" },
  { id: "b5", name: "Perfect Ten", icon: "Trophy", tint: "coral", criteria: "10/10 on a timed quiz" },
  { id: "b6", name: "Helper Badge", icon: "HandHeart", tint: "violet", criteria: "Answer 5 peer questions" },
  { id: "b7", name: "Century Club", icon: "Medal", tint: "amber", criteria: "Earn 1,000 XP" },
  { id: "b8", name: "Mission Complete", icon: "Target", tint: "jade", criteria: "Finish 5 daily missions" },
];

export const CLASSES = [
  { id: "c1", name: "Grade 3 Math — Section A", grade: 3, color: "violet", schedule: "Mon–Fri · 9:00 AM", room: "Virtual Room 3A" },
  { id: "c2", name: "Grade 2 Math — Morning", grade: 2, color: "sky", schedule: "Mon–Fri · 10:15 AM", room: "Virtual Room 2M" },
  { id: "c3", name: "Grade 4 Math — Section B", grade: 4, color: "amber", schedule: "Mon–Fri · 11:30 AM", room: "Virtual Room 4B" },
  { id: "c4", name: "Grade 5 Math — Advanced", grade: 5, color: "jade", schedule: "Tue/Thu · 1:00 PM", room: "Virtual Room 5X" },
];

const TOPICS_BY_GRADE = {
  2: ["Addition & Subtraction", "Place Value", "Shapes & Patterns", "Time & Money"],
  3: ["Multiplication Tables", "Fractions", "Measurement", "Bar Graphs"],
  4: ["Long Division", "Decimals", "Area & Perimeter", "Angles"],
  5: ["Fractions & Ratios", "Percentages", "Volume", "Pre-Algebra Basics"],
};

function makeStudents() {
  const students = [];
  let n = 1;
  CLASSES.forEach((cls) => {
    const count = cls.id === "c4" ? 22 : cls.id === "c1" ? 34 : cls.id === "c2" ? 28 : 30;
    for (let i = 0; i < count; i++) {
      const name = `Student ${n}`;
      const progress = int(38, 99);
      const status = progress < 55 ? "at-risk" : progress > 85 ? "ahead" : "on-track";
      students.push({
        id: `s${n}`,
        name,
        initials: `S${n}`,
        color: pick(AVATAR_PALETTE),
        classId: cls.id,
        grade: cls.grade,
        xp: int(120, 1450),
        coins: int(20, 480),
        streak: int(0, 21),
        progress,
        status,
        weakTopic: pick(TOPICS_BY_GRADE[cls.grade]),
        badges: BADGES.filter(() => rand() > 0.62).map((b) => b.id),
        lastActive: pick(["2h ago", "5h ago", "Yesterday", "3d ago", "Just now", "1d ago"]),
        parentLinked: rand() > 0.15,
      });
      n++;
    }
  });
  return students;
}

export const STUDENTS = makeStudents();

CLASSES.forEach((cls) => {
  const roster = STUDENTS.filter((s) => s.classId === cls.id);
  cls.studentIds = roster.map((s) => s.id);
  cls.avgProgress = Math.round(roster.reduce((a, s) => a + s.progress, 0) / roster.length);
  cls.avgXp = Math.round(roster.reduce((a, s) => a + s.xp, 0) / roster.length);
});

export const COURSES = Object.entries(TOPICS_BY_GRADE).map(([grade, topics]) => ({
  id: `course-g${grade}`,
  grade: Number(grade),
  title: `Grade ${grade} Math`,
  chapters: topics.map((t, ti) => ({
    id: `ch-${grade}-${ti}`,
    title: t,
    lessons: [1, 2, 3].map((n) => ({
      id: `lsn-${grade}-${ti}-${n}`,
      title: `${t} — Lesson ${n}`,
      type: pick(["video", "interactive", "text"]),
      duration: `${int(6, 18)} min`,
      status: rand() > 0.15 ? "published" : "draft",
      grade: Number(grade),
      chapter: t,
    })),
  })),
}));

export const LESSONS = COURSES.flatMap((c) => c.chapters.flatMap((ch) => ch.lessons));

export const QUIZZES = LESSONS.slice(0, 26).map((l, i) => ({
  id: `qz${i + 1}`,
  title: `${l.chapter} Check-in`,
  grade: l.grade,
  lessonId: l.id,
  questions: int(6, 12),
  avgScore: int(58, 97),
  attempts: int(12, 34),
  status: pick(["Published", "Published", "Draft"]),
  aiGenerated: rand() > 0.6,
}));

export const ASSIGNMENTS = [
  { id: "a1", title: "Fractions Quiz", classId: "c1", type: "Quiz", due: "Today, 6:00 PM", status: "Completed", submitted: 28, total: 34 },
  { id: "a2", title: "Place Value Worksheet", classId: "c2", type: "Worksheet", due: "Tomorrow", status: "In Progress", submitted: 14, total: 28 },
  { id: "a3", title: "Addition Practice Set", classId: "c1", type: "Practice", due: "Yesterday", status: "Completed", submitted: 32, total: 34 },
  { id: "a4", title: "Long Division Homework", classId: "c3", type: "Homework", due: "Fri, Aug 8", status: "In Progress", submitted: 9, total: 30 },
  { id: "a5", title: "Angles Mini-Project", classId: "c3", type: "Project", due: "Aug 3", status: "Overdue", submitted: 18, total: 30 },
  { id: "a6", title: "Ratios Challenge Set", classId: "c4", type: "Practice", due: "Mon, Aug 10", status: "Not Started", submitted: 0, total: 22 },
  { id: "a7", title: "Bar Graph Reading", classId: "c1", type: "Worksheet", due: "Aug 2", status: "Overdue", submitted: 21, total: 34 },
  { id: "a8", title: "Decimals Quiz", classId: "c3", type: "Quiz", due: "Aug 9", status: "In Progress", submitted: 11, total: 30 },
];

export const ACTIVITY_ENGAGEMENT = [
  { name: "Completed", value: 68, color: "#12B76A" },
  { name: "In Progress", value: 32, color: "#F89F2D" },
  { name: "Not Started", value: 18, color: "#216ACE" },
  { name: "Overdue", value: 10, color: "#F04438" },
];

export const WEEKLY_TREND = [
  { day: "Mon", completion: 62, engagement: 71 },
  { day: "Tue", completion: 68, engagement: 74 },
  { day: "Wed", completion: 71, engagement: 69 },
  { day: "Thu", completion: 75, engagement: 80 },
  { day: "Fri", completion: 73, engagement: 78 },
  { day: "Sat", completion: 58, engagement: 60 },
  { day: "Sun", completion: 51, engagement: 55 },
];

export const CLASS_PERFORMANCE = CLASSES.map((c) => ({
  name: c.name.split(" — ")[0],
  avg: c.avgProgress,
}));

export const RECENT_ACTIVITY = [
  { id: 1, title: "Fractions Quiz", meta: "Grade 3 Math · 28 students", status: "Completed", time: "2h ago", icon: "Sparkles" },
  { id: 2, title: "Place Value Assignment", meta: "Grade 2 Math · 28 students", status: "In Progress", time: "4h ago", icon: "ClipboardList" },
  { id: 3, title: "Addition Practice", meta: "Grade 3 Math · 34 students", status: "Completed", time: "1d ago", icon: "PlusCircle" },
  { id: 4, title: "Angles Mini-Project", meta: "Grade 4 Math · 30 students", status: "Overdue", time: "2d ago", icon: "AlertTriangle" },
  { id: 5, title: "Ratios Challenge Set", meta: "Grade 5 Math · 22 students", status: "Not Started", time: "3d ago", icon: "Target" },
];

export const REMINDERS = [
  { id: 1, title: "Quiz due tomorrow", meta: "Grade 3 Math", icon: "CalendarClock" },
  { id: 2, title: "Parent meeting at 4 PM", meta: "Student guardian", icon: "Users" },
  { id: 3, title: "2 assignments need review", meta: "Grade 4 Math", icon: "FileCheck2" },
];

export const MESSAGES = [
  { id: "m1", from: "Student Guardian", subject: "Question about the fractions homework", preview: "Hi Teacher, my child was a bit stuck on question 4...", time: "10:12 AM", unread: true, thread: [
    { from: "them", text: "Hi Teacher, my child was a bit stuck on question 4 of last night's fractions homework — could you point us to a resource?", time: "10:12 AM" },
  ]},
  { id: "m2", from: "School Admin", subject: "Grade 3 curriculum sync — Friday", preview: "Reminder: curriculum alignment call this Friday at 3 PM.", time: "9:40 AM", unread: true, thread: [
    { from: "them", text: "Reminder: curriculum alignment call this Friday at 3 PM for all Grade 3 Math teachers.", time: "9:40 AM" },
  ]},
  { id: "m3", from: "Student 12", subject: "Can I redo the assignment?", preview: "I think I clicked submit too early, can I retake it?", time: "Yesterday", unread: false, thread: [
    { from: "them", text: "I think I clicked submit too early on the Multiplication Tables assignment, can I retake it?", time: "Yesterday, 4:02 PM" },
    { from: "me", text: "Sure, I've reopened it for you until Friday. Good luck!", time: "Yesterday, 5:15 PM" },
  ]},
  { id: "m4", from: "Student Guardian", subject: "Thank you!", preview: "My child came home so excited about their badge today.", time: "2 days ago", unread: false, thread: [
    { from: "them", text: "My child came home so excited about earning the Fraction Master badge today — thank you for making math fun!", time: "2 days ago" },
  ]},
];

export const RESOURCES = [
  { id: "r1", title: "Fractions Visual Pack (PDF)", grade: 3, type: "PDF", size: "2.4 MB" },
  { id: "r2", title: "Multiplication Flash Deck", grade: 3, type: "Slides", size: "1.1 MB" },
  { id: "r3", title: "Place Value Manipulatives Guide", grade: 2, type: "PDF", size: "3.0 MB" },
  { id: "r4", title: "Angles & Shapes Poster Set", grade: 4, type: "Image", size: "5.6 MB" },
  { id: "r5", title: "Weekly Parent Update Template", grade: null, type: "Doc", size: "0.4 MB" },
  { id: "r6", title: "Ratios Real-World Problems", grade: 5, type: "PDF", size: "1.8 MB" },
];

export const TEACHER = {
  name: "Teacher",
  initials: "T",
  role: "Teacher",
  school: "Intellia360 — Singapore Campus",
  classCode: "INTEL360",
  xp: 2450,
  gems: 320,
  notifications: 3,
};

export const XP_RULES = [
  { action: "Complete a lesson", xp: 50, coins: 10 },
  { action: "Pass a quiz (80%+)", xp: 75, coins: 15 },
  { action: "Perfect quiz score", xp: 120, coins: 25 },
  { action: "Maintain a 7-day streak", xp: 100, coins: 20 },
  { action: "Finish a daily mission", xp: 40, coins: 8 },
];
