export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  // Расширенные данные профиля
  firstName?: string;
  lastName?: string;
  middleName?: string;
  telegram?: string;
  discord?: string;
  updatedAt?: number;
}

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorEmail: string | null;
  createdAt: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  createdAt: number;
}

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Label {
  id: string;
  name: string;
  color: string; // hex color
}

export interface Card {
  id: string;
  content: string;
  description?: string;
  labels?: string[]; // label IDs
  priority?: Priority;
  assignedTo?: string; // userId исполнителя
  assignedToEmail?: string | null; // email исполнителя для отображения
  comments?: Comment[];
  dueDate?: number; // timestamp
  checklists?: Checklist[];
  completed?: boolean; // Задача выполнена
  completedAt?: number; // Дата выполнения
  createdAt: number;
  updatedAt: number;
}

export interface Column {
  id: string;
  title: string;
  cardIds: string[];
}

export interface BoardData {
  columns: { [key: string]: Column };
  cards: { [key: string]: Card };
  columnOrder: string[];
}

export interface Board {
  id: string;
  title: string;
  ownerId: string;
  memberIds: string[];
  inviteCode: string;
  createdAt: number;
  data: BoardData; // Storing all board data in one doc for simplicity and atomicity in this demo
  // Расширенные настройки
  color?: string; // Цвет доски (hex)
  isArchived?: boolean; // Архивирована ли доска
  description?: string; // Описание доски
  labels?: Label[]; // Метки доски
  settings?: {
    allowMembersToEdit?: boolean; // Могут ли участники редактировать доску
    allowMembersToInvite?: boolean; // Могут ли участники приглашать других
    defaultColumns?: string[]; // Колонки по умолчанию для новых досок
  };
}

export type Theme = 'light' | 'dark';

export type NotificationType = 'assignment' | 'comment' | 'deadline' | 'mention' | 'card_update' | 'board_update';

export interface Notification {
  id: string;
  userId: string; // Кому адресовано уведомление
  type: NotificationType;
  title: string;
  message: string;
  boardId?: string;
  cardId?: string;
  authorId?: string; // Кто создал уведомление
  authorEmail?: string | null;
  read: boolean;
  createdAt: number;
  link?: string; // Ссылка для перехода (например, на карточку)
}

export type ActivityType = 
  | 'card_created' 
  | 'card_updated' 
  | 'card_deleted' 
  | 'card_moved' 
  | 'card_assigned' 
  | 'card_unassigned'
  | 'comment_added'
  | 'comment_deleted'
  | 'due_date_set'
  | 'due_date_removed'
  | 'priority_set'
  | 'label_added'
  | 'label_removed'
  | 'checklist_added'
  | 'checklist_item_completed'
  | 'card_completed'
  | 'card_uncompleted';

export interface Activity {
  id: string;
  boardId: string;
  cardId?: string;
  type: ActivityType;
  userId: string; // Кто выполнил действие
  userEmail: string | null;
  userName?: string; // Имя пользователя для отображения
  description: string; // Описание действия
  oldValue?: any; // Старое значение (для отката)
  newValue?: any; // Новое значение
  metadata?: { [key: string]: any }; // Дополнительные данные
  createdAt: number;
}
