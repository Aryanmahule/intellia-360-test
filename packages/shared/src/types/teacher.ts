export interface TeacherProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
  schoolName: string;
  assignedClasses: string[];
}

export interface ClassOverview {
  id: string;
  className: string;
  grade: string;
  studentCount: number;
  averageScore: number;
  completionRate: number;
  atRiskCount: number;
}

export interface StudentRosterItem {
  id: string;
  name: string;
  avatar: string;
  grade: string;
  completionPercentage: number;
  averageQuizScore: number;
  lastActive: string;
  status: "on-track" | "excelling" | "at-risk";
}

export interface TopicAnalytics {
  topicId: string;
  topicTitle: string;
  masteryPercentage: number;
  strugglingStudentsCount: number;
}

export interface AssignmentItem {
  id: string;
  title: string;
  targetClass: string;
  assignedDate: string;
  dueDate: string;
  submissionsCount: number;
  totalStudents: number;
  status: "active" | "draft" | "completed";
}

export interface AILessonPlanOutput {
  id: string;
  topicTitle: string;
  gradeLevel: string;
  objectives: string[];
  suggestedActivities: string[];
  quizQuestionsSummary: string[];
}
