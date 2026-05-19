export type Role = "child" | "father" | "mother";

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string; // emoji
  level: number;
  xp: number;
  xpToNext: number;
  streakDays: number;
  allowanceBalance: number;
}

export type TaskStatus = "active" | "submitted" | "approved" | "rejected";
export type RepeatType = "today" | "daily" | "weekly" | "none";

export interface Task {
  id: string;
  title: string;
  icon: string; // emoji
  reward: number;
  requesterId: string;
  assignedChildId: string;
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD
  repeatType: RepeatType;
  weekdays: number[]; // 0=Sun..6=Sat
  memo?: string;
  createdAt: string;
}

export interface AllowanceHistory {
  id: string;
  childId: string;
  taskId?: string;
  title: string;
  amount: number;
  type: "earn" | "spend" | "paid";
  status: "approved" | "pending";
  createdAt: string;
}

export type NotificationType = "task" | "approval" | "reminder" | "system";

export interface Notification {
  id: string;
  userId: string; // 'all' で全員
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface TaskTemplate {
  id: string;
  title: string;
  icon: string;
  reward: number;
  usedCount?: number;
}

export interface RewardItem {
  id: string;
  title: string;
  icon: string;
  cost: number;
  description?: string;
  stock?: number;
}

export interface RedemptionRequest {
  id: string;
  childId: string;
  rewardId: string;
  cost: number;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

export interface Badge {
  id: string;
  title: string;
  icon: string;
  description: string;
  acquired: boolean;
}

export interface NotificationSettings {
  push: boolean;
  onNewTask: boolean;
  onSubmit: boolean;
  onApproval: boolean;
  reminder: boolean;
  streak: boolean;
  reminderTime: string; // "HH:MM"
}

export interface ParentPin {
  hash: string;
  salt: string;
}

export interface AppState {
  currentUserId: string | null;
  parentPin?: ParentPin;
  lastRolloverDate?: string;
  lastReminderDate?: string;
  taskOrder?: string[];
  users: User[];
  tasks: Task[];
  history: AllowanceHistory[];
  notifications: Notification[];
  rewards: RewardItem[];
  taskTemplates: TaskTemplate[];
  redemptions: RedemptionRequest[];
  badges: Badge[];
  settings: NotificationSettings;
}
