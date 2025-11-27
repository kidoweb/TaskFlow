import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Activity, ActivityType } from '../types';
import { 
  History, 
  FileText, 
  MessageSquare, 
  User, 
  Clock, 
  Flag, 
  Tag, 
  CheckSquare,
  ArrowRight,
  Plus,
  Trash2,
  X,
  Calendar,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface ActivityFeedProps {
  boardId: string;
  cardId?: string; // Если указан, показываем только активность для этой карточки
  userId: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ boardId, cardId, userId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q;
    if (cardId) {
      q = query(
        collection(db, 'activities'),
        where('boardId', '==', boardId),
        where('cardId', '==', cardId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    } else {
      q = query(
        collection(db, 'activities'),
        where('boardId', '==', boardId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const acts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      
      setActivities(acts);
      setLoading(false);
    }, (error) => {
      console.error('Error loading activities:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [boardId, cardId]);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'card_created':
        return <Plus className="w-4 h-4" />;
      case 'card_updated':
        return <FileText className="w-4 h-4" />;
      case 'card_deleted':
        return <Trash2 className="w-4 h-4" />;
      case 'card_moved':
        return <ArrowRight className="w-4 h-4" />;
      case 'card_assigned':
      case 'card_unassigned':
        return <User className="w-4 h-4" />;
      case 'comment_added':
      case 'comment_deleted':
        return <MessageSquare className="w-4 h-4" />;
      case 'due_date_set':
      case 'due_date_removed':
        return <Calendar className="w-4 h-4" />;
      case 'priority_set':
        return <Flag className="w-4 h-4" />;
      case 'label_added':
      case 'label_removed':
        return <Tag className="w-4 h-4" />;
      case 'checklist_added':
      case 'checklist_item_completed':
        return <CheckSquare className="w-4 h-4" />;
      case 'card_completed':
      case 'card_uncompleted':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'card_created':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'card_deleted':
        return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      case 'card_updated':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'card_moved':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      case 'card_assigned':
      case 'card_unassigned':
        return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'comment_added':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'comment_deleted':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      case 'due_date_set':
      case 'due_date_removed':
        return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'priority_set':
        return 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400';
      case 'label_added':
      case 'label_removed':
        return 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400';
      case 'checklist_added':
      case 'checklist_item_completed':
        return 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400';
      case 'card_completed':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'card_uncompleted':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const formatActivityTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'} назад`;
    if (hours < 24) return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} назад`;
    if (days < 7) return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} назад`;
    return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Загрузка активности...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <History className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Нет активности</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {cardId ? 'История изменений этой карточки появится здесь' : 'История активности доски появится здесь'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
            getActivityColor(activity.type)
          )}>
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm text-slate-900 dark:text-white leading-relaxed">
                <span className="font-semibold">{activity.userName || activity.userEmail || 'Пользователь'}</span>
                {' '}
                <span className="text-slate-600 dark:text-slate-400">{activity.description}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatActivityTime(activity.createdAt)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

