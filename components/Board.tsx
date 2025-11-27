import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, deleteDoc, getDoc, deleteField, collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Card, Comment, UserProfile, Checklist, ChecklistItem, Priority, Label, NotificationType, ActivityType, Column } from '../types';
import { Board as BoardType, BoardData } from '../types';
import { ActivityFeed } from './ActivityFeed';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  MoreHorizontal, 
  Plus, 
  Settings, 
  Trash2, 
  Copy, 
  RefreshCw,
  X,
  Loader2,
  Calendar,
  AlertTriangle,
  MessageSquare,
  User,
  FileText,
  Edit,
  Users,
  Palette,
  Archive,
  Download,
  Edit3,
  UserMinus,
  Lock,
  Unlock,
  Info,
  Search,
  Filter,
  CheckSquare,
  Clock,
  Flag,
  Tag,
  CheckCircle2,
  Circle,
  History as HistoryIcon
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface BoardProps {
  userId: string;
}

export const BoardView: React.FC<BoardProps> = ({ userId }) => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<BoardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [newCardText, setNewCardText] = useState('');
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [showActivityHistory, setShowActivityHistory] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: UserProfile }>({});

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<Priority | null>(null);
  const [filterLabels, setFilterLabels] = useState<string[]>([]);
  const [filterDueDate, setFilterDueDate] = useState<'overdue' | 'today' | 'thisWeek' | 'all' | null>(null);
  const [showCompleted, setShowCompleted] = useState(false); // Показывать выполненные задачи

  // Board labels
  const [boardLabels, setBoardLabels] = useState<Label[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');

  // Settings state
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'members' | 'appearance' | 'advanced'>('general');
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  
  // Флаг для игнорирования обновлений из Firebase во время локального обновления
  const isLocalUpdateRef = useRef(false);
  const lastLocalUpdateRef = useRef<string>('');

  useEffect(() => {
    if (!boardId) return;

    const unsubscribe = onSnapshot(doc(db, 'boards', boardId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as BoardType;
        // Ensure data structure integrity
        if (!data.data) {
           data.data = { columns: {}, cards: {}, columnOrder: [] };
        }
        
        // Игнорируем обновления из Firebase, если мы сами обновляем данные
        // Сравниваем хеш данных, чтобы убедиться, что это не наше собственное обновление
        const dataHash = JSON.stringify(data.data);
        if (isLocalUpdateRef.current && dataHash === lastLocalUpdateRef.current) {
          return;
        }
        
        setBoard({ ...data, id: docSnap.id });
        setPermissionError(false);
        
        // Инициализируем состояние настроек
        setNewTitle(data.title);
        setBoardDescription(data.description || '');
        setSelectedColor(data.color || '#3b82f6');
        
        // Загружаем профили участников
        if (data.memberIds && data.memberIds.length > 0) {
          loadUserProfiles(data.memberIds);
        }

        // Загружаем метки доски (если есть)
        if (data.labels) {
          setBoardLabels(data.labels);
        } else {
          // Создаем дефолтные метки
          const defaultLabels: Label[] = [
            { id: 'label-1', name: 'Важно', color: '#ef4444' },
            { id: 'label-2', name: 'В работе', color: '#3b82f6' },
            { id: 'label-3', name: 'Готово', color: '#10b981' },
            { id: 'label-4', name: 'Блокер', color: '#f59e0b' },
          ];
          setBoardLabels(defaultLabels);
        }
      } else {
        navigate('/');
      }
      setLoading(false);
    }, (error) => {
      console.error("Board snapshot error:", error);
      if (error.code === 'permission-denied') {
        setPermissionError(true);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [boardId, navigate]);

  const loadUserProfiles = async (memberIds: string[]) => {
    const profiles: { [key: string]: UserProfile } = {};
    
    await Promise.all(
      memberIds.map(async (memberId) => {
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', memberId));
          if (profileDoc.exists()) {
            profiles[memberId] = { ...profileDoc.data(), uid: memberId } as UserProfile;
          }
        } catch (error) {
          console.error(`Error loading profile for ${memberId}:`, error);
        }
      })
    );
    
    setUserProfiles(profiles);
  };

  const getUserDisplayName = (memberId: string): string => {
    const profile = userProfiles[memberId];
    if (profile) {
      const parts = [profile.lastName, profile.firstName, profile.middleName].filter(Boolean);
      if (parts.length > 0) return parts.join(' ');
      if (profile.displayName) return profile.displayName;
    }
    return memberId === userId ? 'Вы' : (memberId.slice(0, 8) + '...');
  };

  // Функция для создания уведомлений
  const createNotification = async (
    targetUserId: string,
    type: NotificationType,
    title: string,
    message: string,
    boardId?: string,
    cardId?: string,
    link?: string
  ) => {
    // Не создаем уведомление самому себе
    if (targetUserId === userId) return;

    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'notifications'), {
        userId: targetUserId,
        type,
        title,
        message,
        boardId: boardId || board?.id,
        cardId,
        authorId: userId,
        authorEmail: user?.email || null,
        read: false,
        createdAt: Date.now(),
        link: link || (boardId && cardId ? `/board/${boardId}#card-${cardId}` : boardId ? `/board/${boardId}` : undefined)
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Функция для создания записи активности
  const createActivity = async (
    type: ActivityType,
    description: string,
    cardId?: string,
    oldValue?: any,
    newValue?: any,
    metadata?: { [key: string]: any }
  ) => {
    if (!board) return;

    try {
      const user = auth.currentUser;
      const userName = getUserDisplayName(userId);
      
      // Создаем объект активности, исключая undefined значения
      const activityData: any = {
        boardId: board.id,
        type,
        userId,
        userEmail: user?.email || null,
        userName,
        description,
        createdAt: Date.now()
      };

      // Добавляем поля только если они определены
      if (cardId !== undefined) {
        activityData.cardId = cardId;
      }
      if (oldValue !== undefined) {
        activityData.oldValue = oldValue;
      }
      if (newValue !== undefined) {
        activityData.newValue = newValue;
      }
      if (metadata !== undefined) {
        activityData.metadata = metadata;
      }
      
      await addDoc(collection(db, 'activities'), activityData);
    } catch (error) {
      console.error('Error creating activity:', error);
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (!board) return;

    const newBoardData = JSON.parse(JSON.stringify(board.data)) as BoardData;
    let startCol: Column | undefined;
    let finishCol: Column | undefined;

    // Moving Columns
    if (type === 'column') {
      const newColumnOrder = Array.from(newBoardData.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);
      newBoardData.columnOrder = newColumnOrder;
    } 
    // Moving Cards
    else {
      startCol = newBoardData.columns[source.droppableId];
      finishCol = newBoardData.columns[destination.droppableId];

      if (startCol === finishCol) {
        const newCardIds = Array.from(startCol.cardIds);
        newCardIds.splice(source.index, 1);
        newCardIds.splice(destination.index, 0, draggableId);
        
        newBoardData.columns[startCol.id].cardIds = newCardIds;
      } else {
        const startCardIds = Array.from(startCol.cardIds);
        startCardIds.splice(source.index, 1);
        
        const finishCardIds = Array.from(finishCol.cardIds);
        finishCardIds.splice(destination.index, 0, draggableId);

        newBoardData.columns[startCol.id].cardIds = startCardIds;
        newBoardData.columns[finishCol.id].cardIds = finishCardIds;
      }
    }

    // Optimistic update
    const dataHash = JSON.stringify(newBoardData);
    lastLocalUpdateRef.current = dataHash;
    isLocalUpdateRef.current = true;
    setBoard(prev => prev ? { ...prev, data: newBoardData } : null);

    // Persist to Firebase
    updateDoc(doc(db, 'boards', board.id), {
      data: newBoardData
    }).then(() => {
      // Разрешаем обновления из Firebase после успешного сохранения
      // Используем небольшую задержку, чтобы дать Firebase время синхронизироваться
      setTimeout(() => {
        isLocalUpdateRef.current = false;
        lastLocalUpdateRef.current = '';
      }, 500);
    }).catch((error: any) => {
      console.error("Failed to update board:", error);
      if (error.code === 'permission-denied') setPermissionError(true);
      // Разрешаем обновления из Firebase даже при ошибке
      isLocalUpdateRef.current = false;
      lastLocalUpdateRef.current = '';
    });

    // Создаем запись активности для перемещения карточки
    if (type === 'card' && startCol && finishCol && startCol !== finishCol) {
      const card = board.data.cards[draggableId];
      if (card) {
        createActivity(
          'card_moved',
          `Карточка "${card.content.substring(0, 50)}${card.content.length > 50 ? '...' : ''}" перемещена из "${startCol.title}" в "${finishCol.title}"`,
          draggableId,
          { fromColumn: startCol.id, fromColumnTitle: startCol.title },
          { toColumn: finishCol.id, toColumnTitle: finishCol.title }
        );
      }
    }
  };

  const handleAddList = async () => {
    if (!board) return;
    const title = prompt("Название новой колонки:");
    if (!title) return;

    const newId = `col-${Date.now()}`;
    const newBoardData = { ...board.data };
    newBoardData.columns[newId] = {
      id: newId,
      title,
      cardIds: []
    };
    newBoardData.columnOrder.push(newId);

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!board || !confirm("Удалить эту колонку и все задачи в ней?")) return;
    
    const newBoardData = { ...board.data };
    
    // Remove cards in this list from the cards map
    const list = newBoardData.columns[listId];
    list.cardIds.forEach(cardId => {
      delete newBoardData.cards[cardId];
    });

    delete newBoardData.columns[listId];
    newBoardData.columnOrder = newBoardData.columnOrder.filter(id => id !== listId);

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleAddCard = async (listId: string) => {
    if (!board || !newCardText.trim()) return;

    const newCardId = `card-${Date.now()}`;
    const now = Date.now();
    const cardContent = newCardText.trim();
    const newCard = {
      id: newCardId,
      content: cardContent,
      createdAt: now,
      updatedAt: now,
    };

    const newBoardData = { ...board.data };
    newBoardData.cards[newCardId] = newCard;
    newBoardData.columns[listId].cardIds.push(newCardId);

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      setNewCardText('');
      setActiveListId(null);

      // Создаем запись активности
      await createActivity(
        'card_created',
        `Создана карточка "${cardContent}"`,
        newCardId,
        undefined,
        { columnId: listId, columnTitle: board.data.columns[listId].title }
      );
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!board || !confirm("Удалить эту карточку?")) return;

    const card = board.data.cards[cardId];
    const cardContent = card?.content || 'Карточка';

    const newBoardData = { ...board.data };
    
    // Удаляем карточку из всех колонок
    Object.keys(newBoardData.columns).forEach(colId => {
      newBoardData.columns[colId].cardIds = newBoardData.columns[colId].cardIds.filter(id => id !== cardId);
    });
    
    // Удаляем саму карточку
    delete newBoardData.cards[cardId];

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      setSelectedCard(null);
      setEditingCard(null);

      // Создаем запись активности
      await createActivity(
        'card_deleted',
        `Удалена карточка "${cardContent}"`,
        cardId,
        { content: cardContent, description: card?.description }
      );
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleUpdateCard = async () => {
    if (!board || !editingCard) return;

    const oldCard = board.data.cards[editingCard.id];
    const newBoardData = { ...board.data };
    newBoardData.cards[editingCard.id] = {
      ...editingCard,
      updatedAt: Date.now()
    };

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      
      // Создаем запись активности если изменилось содержимое или описание
      if (oldCard && (oldCard.content !== editingCard.content || oldCard.description !== editingCard.description)) {
        await createActivity(
          'card_updated',
          `Обновлена карточка "${editingCard.content.substring(0, 50)}${editingCard.content.length > 50 ? '...' : ''}"`,
          editingCard.id,
          { content: oldCard.content, description: oldCard.description },
          { content: editingCard.content, description: editingCard.description }
        );
      }

      setSelectedCard(null);
      setEditingCard(null);
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleAddComment = async () => {
    if (!board || !editingCard || !newComment.trim()) return;

    const commentId = `comment-${Date.now()}`;
    const user = auth.currentUser;
    const commentText = newComment.trim();
    const newCommentObj = {
      id: commentId,
      text: commentText,
      authorId: userId,
      authorEmail: user?.email || null,
      createdAt: Date.now()
    };

    const updatedCard = {
      ...editingCard,
      comments: [...(editingCard.comments || []), newCommentObj],
      updatedAt: Date.now()
    };

    const newBoardData = { ...board.data };
    newBoardData.cards[editingCard.id] = updatedCard;

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      setEditingCard(updatedCard);
      setNewComment('');

      // Создаем запись активности
      await createActivity(
        'comment_added',
        `Добавлен комментарий к карточке "${editingCard.content.substring(0, 50)}${editingCard.content.length > 50 ? '...' : ''}"`,
        editingCard.id,
        undefined,
        { commentId, text: commentText }
      );

      // Создаем уведомление для исполнителя карточки (если он не автор комментария)
      if (editingCard.assignedTo && editingCard.assignedTo !== userId) {
        await createNotification(
          editingCard.assignedTo,
          'comment',
          'Новый комментарий',
          `${user?.email || 'Пользователь'} оставил комментарий к карточке "${editingCard.content.substring(0, 50)}${editingCard.content.length > 50 ? '...' : ''}"`,
          board.id,
          editingCard.id
        );
      }
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!board || !editingCard) return;

    const comment = editingCard.comments?.find(c => c.id === commentId);
    if (!comment) return;

    // Проверяем, что пользователь может удалить комментарий (только свой)
    if (comment.authorId !== userId) {
      alert('Вы можете удалять только свои комментарии');
      return;
    }

    const updatedCard = {
      ...editingCard,
      comments: editingCard.comments?.filter(c => c.id !== commentId) || [],
      updatedAt: Date.now()
    };

    const newBoardData = { ...board.data };
    newBoardData.cards[editingCard.id] = updatedCard;

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      setEditingCard(updatedCard);

      // Создаем запись активности
      await createActivity(
        'comment_deleted',
        `Удален комментарий из карточки "${editingCard.content.substring(0, 50)}${editingCard.content.length > 50 ? '...' : ''}"`,
        editingCard.id,
        { commentId, text: comment.text }
      );
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleAssignUser = async (userIdToAssign: string, userEmail: string | null) => {
    if (!board || !editingCard) return;

    const oldAssignee = editingCard.assignedTo;
    const updatedCard = {
      ...editingCard,
      assignedTo: userIdToAssign,
      assignedToEmail: userEmail,
      updatedAt: Date.now()
    };

    const newBoardData = { ...board.data };
    newBoardData.cards[editingCard.id] = updatedCard;

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      setEditingCard(updatedCard);

      // Создаем запись активности
      if (userIdToAssign && userIdToAssign !== oldAssignee) {
        await createActivity(
          'card_assigned',
          `Назначен исполнитель для карточки "${editingCard.content.substring(0, 50)}${editingCard.content.length > 50 ? '...' : ''}"`,
          editingCard.id,
          { userId: oldAssignee },
          { userId: userIdToAssign, email: userEmail }
        );
      } else if (!userIdToAssign && oldAssignee) {
        await createActivity(
          'card_unassigned',
          `Снят исполнитель с карточки "${editingCard.content.substring(0, 50)}${editingCard.content.length > 50 ? '...' : ''}"`,
          editingCard.id,
          { userId: oldAssignee }
        );
      }

      // Создаем уведомление при назначении
      if (userIdToAssign && userIdToAssign !== userId) {
        const user = auth.currentUser;
        await createNotification(
          userIdToAssign,
          'assignment',
          'Вас назначили исполнителем',
          `${user?.email || 'Пользователь'} назначил вас исполнителем карточки "${editingCard.content.substring(0, 50)}${editingCard.content.length > 50 ? '...' : ''}"`,
          board.id,
          editingCard.id
        );
      }
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const openCardModal = (cardId: string) => {
    if (!board) return;
    const card = board.data.cards[cardId];
    if (card) {
      setEditingCard({ ...card });
      setSelectedCard(cardId);
    }
  };

  const handleRegenerateCode = async () => {
    if (!board) return;
    setRegeneratingCode(true);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    try {
      await updateDoc(doc(db, 'boards', board.id), { inviteCode: result });
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    } finally {
      setRegeneratingCode(false);
    }
  };

  const deleteBoard = async () => {
    if (!board || !confirm("Вы уверены? Это действие необратимо.")) return;
    try {
      await deleteDoc(doc(db, 'boards', board.id));
      navigate('/');
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleUpdateBoardTitle = async () => {
    if (!board || !newTitle.trim()) return;
    try {
      await updateDoc(doc(db, 'boards', board.id), { title: newTitle.trim() });
      setEditingTitle(false);
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleUpdateBoardDescription = async () => {
    if (!board) return;
    try {
      await updateDoc(doc(db, 'boards', board.id), { description: boardDescription.trim() || undefined });
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleUpdateBoardColor = async (color: string) => {
    if (!board) return;
    setSelectedColor(color);
    try {
      await updateDoc(doc(db, 'boards', board.id), { color });
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!board || memberId === board.ownerId) return;
    if (!confirm(`Удалить участника из доски?`)) return;
    
    setRemovingMember(memberId);
    try {
      const newMemberIds = board.memberIds.filter(id => id !== memberId);
      await updateDoc(doc(db, 'boards', board.id), { memberIds: newMemberIds });
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    } finally {
      setRemovingMember(null);
    }
  };

  const handleArchiveBoard = async () => {
    if (!board || !confirm("Архивировать доску? Вы сможете восстановить её позже.")) return;
    try {
      await updateDoc(doc(db, 'boards', board.id), { isArchived: true });
      navigate('/');
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleExportBoard = () => {
    if (!board) return;
    const exportData = {
      title: board.title,
      description: board.description,
      createdAt: new Date(board.createdAt).toISOString(),
      columns: board.data.columnOrder.map(colId => ({
        title: board.data.columns[colId].title,
        cards: board.data.columns[colId].cardIds.map(cardId => ({
          content: board.data.cards[cardId].content,
          description: board.data.cards[cardId].description,
          assignedTo: board.data.cards[cardId].assignedToEmail,
          comments: board.data.cards[cardId].comments?.length || 0,
        })),
      })),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${board.title.replace(/[^a-z0-9]/gi, '_')}_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleSetting = async (setting: 'allowMembersToEdit' | 'allowMembersToInvite', value: boolean) => {
    if (!board) return;
    try {
      const currentSettings = board.settings || {};
      await updateDoc(doc(db, 'boards', board.id), {
        settings: {
          ...currentSettings,
          [setting]: value,
        },
      });
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  // Функции для работы с датами
  const handleSetDueDate = async (cardId: string, dueDate: number | null) => {
    if (!board || !editingCard || editingCard.id !== cardId) return;
    
    const oldDueDate = editingCard.dueDate;
    const updatedCard = {
      ...editingCard,
      dueDate: dueDate || undefined,
      updatedAt: Date.now()
    };

    const newBoardData = { ...board.data };
    newBoardData.cards[cardId] = updatedCard;

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      setEditingCard(updatedCard);

      // Создаем запись активности
      if (dueDate && !oldDueDate) {
        await createActivity(
          'due_date_set',
          `Установлен срок выполнения для карточки "${editingCard.content.substring(0, 50)}${editingCard.content.length > 50 ? '...' : ''}"`,
          editingCard.id,
          undefined,
          { dueDate: new Date(dueDate).toLocaleDateString('ru-RU') }
        );
      } else if (!dueDate && oldDueDate) {
        await createActivity(
          'due_date_removed',
          `Удален срок выполнения у карточки "${editingCard.content.substring(0, 50)}${editingCard.content.length > 50 ? '...' : ''}"`,
          editingCard.id,
          { dueDate: new Date(oldDueDate).toLocaleDateString('ru-RU') }
        );
      }

      // Создаем уведомление о дедлайне для исполнителя
      if (dueDate && editingCard.assignedTo && editingCard.assignedTo !== userId) {
        const user = auth.currentUser;
        const dueDateStr = new Date(dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        await createNotification(
          editingCard.assignedTo,
          'deadline',
          'Установлен срок выполнения',
          `Для карточки "${editingCard.content.substring(0, 50)}${editingCard.content.length > 50 ? '...' : ''}" установлен срок: ${dueDateStr}`,
          board.id,
          editingCard.id
        );
      }
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  // Функции для работы с приоритетами
  const handleSetPriority = async (cardId: string, priority: Priority | null) => {
    if (!board || !editingCard || editingCard.id !== cardId) return;
    
    const oldPriority = editingCard.priority;
    const updatedCard = {
      ...editingCard,
      priority: priority || undefined,
      updatedAt: Date.now()
    };

    const newBoardData = { ...board.data };
    newBoardData.cards[cardId] = updatedCard;

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      setEditingCard(updatedCard);

      // Создаем запись активности
      if (priority !== oldPriority) {
        await createActivity(
          'priority_set',
          `Установлен приоритет "${getPriorityLabel(priority)}" для карточки "${editingCard.content.substring(0, 50)}${editingCard.content.length > 50 ? '...' : ''}"`,
          editingCard.id,
          { priority: oldPriority },
          { priority }
        );
      }
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  // Функции для работы с метками
  const handleToggleLabel = async (cardId: string, labelId: string) => {
    if (!board || !editingCard || editingCard.id !== cardId) return;
    
    const currentLabels = editingCard.labels || [];
    const isAdding = !currentLabels.includes(labelId);
    const label = boardLabels.find(l => l.id === labelId);
    const newLabels = isAdding
      ? [...currentLabels, labelId]
      : currentLabels.filter(id => id !== labelId);

    const updatedCard = {
      ...editingCard,
      labels: newLabels.length > 0 ? newLabels : undefined,
      updatedAt: Date.now()
    };

    const newBoardData = { ...board.data };
    newBoardData.cards[cardId] = updatedCard;

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      setEditingCard(updatedCard);

      // Создаем запись активности
      await createActivity(
        isAdding ? 'label_added' : 'label_removed',
        `${isAdding ? 'Добавлена' : 'Удалена'} метка "${label?.name || 'неизвестная'}" к карточке "${editingCard.content.substring(0, 50)}${editingCard.content.length > 50 ? '...' : ''}"`,
        editingCard.id,
        undefined,
        { labelId, labelName: label?.name }
      );
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleCreateLabel = async () => {
    if (!board || !newLabelName.trim()) return;
    
    const newLabel: Label = {
      id: `label-${Date.now()}`,
      name: newLabelName.trim(),
      color: newLabelColor
    };

    const updatedLabels = [...boardLabels, newLabel];
    setBoardLabels(updatedLabels);
    setNewLabelName('');
    setNewLabelColor('#3b82f6');

    try {
      await updateDoc(doc(db, 'boards', board.id), { labels: updatedLabels });
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  // Функции для работы с чеклистами
  const handleAddChecklist = async (cardId: string) => {
    if (!board || !editingCard || editingCard.id !== cardId) return;
    
    const newChecklist: Checklist = {
      id: `checklist-${Date.now()}`,
      title: 'Новый чеклист',
      items: [],
      createdAt: Date.now()
    };

    const updatedCard = {
      ...editingCard,
      checklists: [...(editingCard.checklists || []), newChecklist],
      updatedAt: Date.now()
    };

    const newBoardData = { ...board.data };
    newBoardData.cards[cardId] = updatedCard;

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      setEditingCard(updatedCard);
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleDeleteChecklist = async (cardId: string, checklistId: string) => {
    if (!board || !editingCard || editingCard.id !== cardId) return;
    
    const updatedCard = {
      ...editingCard,
      checklists: editingCard.checklists?.filter(c => c.id !== checklistId) || [],
      updatedAt: Date.now()
    };

    const newBoardData = { ...board.data };
    newBoardData.cards[cardId] = updatedCard;

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      setEditingCard(updatedCard);
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleAddChecklistItem = async (cardId: string, checklistId: string, text: string) => {
    if (!board || !editingCard || editingCard.id !== cardId || !text.trim()) return;
    
    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: text.trim(),
      completed: false,
      createdAt: Date.now()
    };

    const updatedCard = {
      ...editingCard,
      checklists: editingCard.checklists?.map(checklist =>
        checklist.id === checklistId
          ? { ...checklist, items: [...checklist.items, newItem] }
          : checklist
      ) || [],
      updatedAt: Date.now()
    };

    const newBoardData = { ...board.data };
    newBoardData.cards[cardId] = updatedCard;

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      setEditingCard(updatedCard);
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleToggleChecklistItem = async (cardId: string, checklistId: string, itemId: string) => {
    if (!board || !editingCard || editingCard.id !== cardId) return;
    
    const updatedCard = {
      ...editingCard,
      checklists: editingCard.checklists?.map(checklist =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: checklist.items.map(item =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
              )
            }
          : checklist
      ) || [],
      updatedAt: Date.now()
    };

    const newBoardData = { ...board.data };
    newBoardData.cards[cardId] = updatedCard;

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      setEditingCard(updatedCard);
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const handleDeleteChecklistItem = async (cardId: string, checklistId: string, itemId: string) => {
    if (!board || !editingCard || editingCard.id !== cardId) return;
    
    const updatedCard = {
      ...editingCard,
      checklists: editingCard.checklists?.map(checklist =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: checklist.items.filter(item => item.id !== itemId)
            }
          : checklist
      ) || [],
      updatedAt: Date.now()
    };

    const newBoardData = { ...board.data };
    newBoardData.cards[cardId] = updatedCard;

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
      setEditingCard(updatedCard);
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  // Функция для переключения статуса выполнения карточки
  const handleToggleCardCompleted = async (cardId: string) => {
    if (!board) return;

    const card = board.data.cards[cardId];
    if (!card) return;

    const newCompleted = !card.completed;
    const newCompletedAt = newCompleted ? Date.now() : null;

    // Создаем обновленную карточку
    const updatedCard: any = {
      ...card,
      completed: newCompleted,
      updatedAt: Date.now()
    };

    // Если задача выполнена - добавляем дату, если нет - удаляем поле
    if (newCompleted) {
      updatedCard.completedAt = newCompletedAt;
    } else {
      // Используем deleteField для удаления поля из Firestore
      updatedCard.completedAt = deleteField();
    }

    const newBoardData = { ...board.data };
    newBoardData.cards[cardId] = updatedCard;

    // Обновляем editingCard если она открыта (для UI, без deleteField)
    if (editingCard && editingCard.id === cardId) {
      setEditingCard({
        ...card,
        completed: newCompleted,
        completedAt: newCompleted ? newCompletedAt : undefined,
        updatedAt: Date.now()
      });
    }

    try {
      await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });

      // Создаем запись активности
      await createActivity(
        newCompleted ? 'card_completed' : 'card_uncompleted',
        `Карточка "${card.content.substring(0, 50)}${card.content.length > 50 ? '...' : ''}" ${newCompleted ? 'отмечена как выполненная' : 'отмечена как невыполненная'}`,
        cardId
      );
    } catch (error: any) {
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  // Функции фильтрации
  const filterCards = (cards: Card[]): Card[] => {
    return cards.filter(card => {
      // Фильтр по статусу выполнения
      if (!showCompleted && card.completed) {
        return false;
      }

      // Поиск по тексту
      if (searchQuery && !card.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !card.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Фильтр по исполнителю
      if (filterAssignee && card.assignedTo !== filterAssignee) {
        return false;
      }

      // Фильтр по приоритету
      if (filterPriority && card.priority !== filterPriority) {
        return false;
      }

      // Фильтр по меткам
      if (filterLabels.length > 0) {
        const cardLabels = card.labels || [];
        if (!filterLabels.some(labelId => cardLabels.includes(labelId))) {
          return false;
        }
      }

      // Фильтр по дате
      if (filterDueDate && filterDueDate !== 'all') {
        if (!card.dueDate) return false;
        const now = Date.now();
        const cardDate = card.dueDate;
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const todayEnd = new Date().setHours(23, 59, 59, 999);
        const weekEnd = todayEnd + 7 * 24 * 60 * 60 * 1000;

        switch (filterDueDate) {
          case 'overdue':
            if (cardDate >= now) return false;
            break;
          case 'today':
            if (cardDate < todayStart || cardDate > todayEnd) return false;
            break;
          case 'thisWeek':
            if (cardDate < todayStart || cardDate > weekEnd) return false;
            break;
        }
      }

      return true;
    });
  };

  const getPriorityColor = (priority?: Priority): string => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getPriorityLabel = (priority?: Priority): string => {
    switch (priority) {
      case 'low': return 'Низкий';
      case 'medium': return 'Средний';
      case 'high': return 'Высокий';
      case 'critical': return 'Критический';
      default: return 'Без приоритета';
    }
  };

  const isDueDateOverdue = (dueDate?: number): boolean => {
    if (!dueDate) return false;
    return dueDate < Date.now();
  };

  const formatDueDate = (dueDate: number): string => {
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Завтра';
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)]">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-400 w-8 h-8" />
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-6 text-center bg-slate-50 dark:bg-slate-950">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-8 rounded-xl max-w-2xl w-full shadow-lg">
          <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">Ошибка доступа к доске</h2>
          <p className="text-red-700 dark:text-red-300 mb-6">
            Не удалось загрузить данные доски из-за ограничений безопасности.
            <br />
            Пожалуйста, настройте <strong>Firestore Security Rules</strong> в консоли Firebase.
          </p>
          
          <div className="text-left bg-slate-900 rounded-lg p-4 relative group overflow-hidden">
             <div className="absolute top-2 right-2 text-xs text-slate-500 uppercase font-mono tracking-wider">Rules</div>
             <pre className="text-green-400 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
            </pre>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            Я обновил правила, перезагрузить
          </button>
        </div>
      </div>
    );
  }

  if (!board) return null;

  const isOwner = board.ownerId === userId;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Board Header */}
      <div 
        className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors"
        style={{
          backgroundColor: board.color ? `${board.color}15` : undefined,
          borderBottomColor: board.color ? `${board.color}30` : undefined,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{board.title}</h1>
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
              {board.memberIds.length} {board.memberIds.length === 1 ? 'участник' : 'участников'}
            </span>
          </div>
        <div className="flex items-center space-x-2">
           <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSettings(true);
              }}
              className="flex items-center px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
              type="button"
          >
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </button>
        </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск карточек..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
              showFilters
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
            type="button"
          >
            <Filter className="w-4 h-4" />
            Фильтры
            {(filterAssignee || filterPriority || filterLabels.length > 0 || filterDueDate) && (
              <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {(filterAssignee ? 1 : 0) + (filterPriority ? 1 : 0) + filterLabels.length + (filterDueDate ? 1 : 0)}
              </span>
            )}
          </button>

          {(filterAssignee || filterPriority || filterLabels.length > 0 || filterDueDate) && (
            <button
              onClick={() => {
                setFilterAssignee(null);
                setFilterPriority(null);
                setFilterLabels([]);
                setFilterDueDate(null);
              }}
              className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              type="button"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Filter className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">Фильтры</h3>
                {(filterAssignee || filterPriority || filterLabels.length > 0 || filterDueDate) && (
                  <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                    {(filterAssignee ? 1 : 0) + (filterPriority ? 1 : 0) + filterLabels.length + (filterDueDate ? 1 : 0)}
                  </span>
                )}
              </div>
              {(filterAssignee || filterPriority || filterLabels.length > 0 || filterDueDate) && (
                <button
                  onClick={() => {
                    setFilterAssignee(null);
                    setFilterPriority(null);
                    setFilterLabels([]);
                    setFilterDueDate(null);
                  }}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
                  type="button"
                >
                  Сбросить все
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filter by Assignee */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <User className="w-3.5 h-3.5" />
                  Исполнитель
                </label>
                <select
                  value={filterAssignee || ''}
                  onChange={(e) => setFilterAssignee(e.target.value || null)}
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none shadow-sm transition-all hover:shadow-md"
                >
                  <option value="">Все исполнители</option>
                  {board.memberIds.map(memberId => (
                    <option key={memberId} value={memberId}>
                      {getUserDisplayName(memberId)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Priority */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Flag className="w-3.5 h-3.5" />
                  Приоритет
                </label>
                <select
                  value={filterPriority || ''}
                  onChange={(e) => setFilterPriority(e.target.value as Priority || null)}
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none shadow-sm transition-all hover:shadow-md"
                >
                  <option value="">Все приоритеты</option>
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                  <option value="critical">Критический</option>
                </select>
              </div>

              {/* Filter by Labels */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Tag className="w-3.5 h-3.5" />
                  Метки
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[42px]">
                  {boardLabels.length === 0 ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">Нет меток</span>
                  ) : (
                    boardLabels.map(label => (
                      <button
                        key={label.id}
                        onClick={() => {
                          setFilterLabels(prev =>
                            prev.includes(label.id)
                              ? prev.filter(id => id !== label.id)
                              : [...prev, label.id]
                          );
                        }}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium rounded-lg transition-all shadow-sm hover:shadow-md",
                          filterLabels.includes(label.id)
                            ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-800 scale-105"
                            : "opacity-70 hover:opacity-100 hover:scale-105"
                        )}
                        style={{ backgroundColor: label.color + '40', color: label.color }}
                        type="button"
                      >
                        {label.name}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Filter by Due Date */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5" />
                  Срок выполнения
                </label>
                <select
                  value={filterDueDate || ''}
                  onChange={(e) => setFilterDueDate(e.target.value as any || null)}
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none shadow-sm transition-all hover:shadow-md"
                >
                  <option value="">Все даты</option>
                  <option value="overdue">Просроченные</option>
                  <option value="today">Сегодня</option>
                  <option value="thisWeek">На этой неделе</option>
                </select>
              </div>
            </div>

            {/* Show Completed Toggle */}
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-green-500 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 cursor-pointer transition-all appearance-none checked:bg-green-500 checked:border-green-500"
                  />
                  {showCompleted && (
                    <CheckCircle2 className="w-5 h-5 text-white absolute top-0 left-0 pointer-events-none" />
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    Показать выполненные задачи
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Отобразить задачи, отмеченные как выполненные
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Board Canvas */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-100 dark:bg-slate-900">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="all-columns" direction="horizontal" type="column">
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex h-full p-6 gap-4 items-start min-w-max"
                style={{ overflowY: 'hidden' }}
              >
                {board.data.columnOrder.map((colId, index) => {
                  const column = board.data.columns[colId];
                  const allCards = column.cardIds.map(id => board.data.cards[id]).filter(Boolean);
                  const cards = filterCards(allCards);

                  return (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="w-72 flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl shadow-md max-h-full flex flex-col border border-slate-200 dark:border-slate-700"
                          >
                            {/* Column Header */}
                            <div className="p-4 flex items-center justify-between group border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-xl">
                            <div 
                              {...provided.dragHandleProps}
                                className="flex-1 flex items-center gap-2 cursor-grab active:cursor-grabbing"
                            >
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">{column.title}</h3>
                                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                  {cards.length}
                                </span>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteList(column.id);
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all z-10 relative"
                                title="Удалить колонку"
                                type="button"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Cards List */}
                            <Droppable droppableId={column.id} type="card">
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={cn(
                                    "p-3 flex-1 overflow-y-auto custom-scrollbar min-h-[100px] transition-colors",
                                    snapshot.isDraggingOver ? "bg-blue-50 dark:bg-blue-900/20" : ""
                                  )}
                                  style={{ 
                                    maxHeight: 'calc(100vh - 200px)',
                                    overflowY: 'auto',
                                    overflowX: 'hidden'
                                  }}
                                >
                                  {cards.map((card, index) => (
                                    <Draggable key={card.id} draggableId={card.id} index={index}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                          className={cn(
                                            "bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 mb-2 group hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all relative",
                                            snapshot.isDragging ? "rotate-1 scale-[1.02] shadow-lg ring-2 ring-blue-500 z-50 cursor-grabbing" : "cursor-pointer"
                                          )}
                                        >
                                          {/* Drag Handle */}
                                          <div 
                                            {...provided.dragHandleProps}
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                          </div>
                                          
                                          {/* Completion Checkbox */}
                                          <div className="absolute top-2 left-2 z-20">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleCardCompleted(card.id);
                                              }}
                                            className={cn(
                                                "w-5 h-5 rounded border-2 flex items-center justify-center transition-all hover:scale-110",
                                                card.completed
                                                  ? "bg-green-500 border-green-500 text-white"
                                                  : "border-slate-300 dark:border-slate-600 hover:border-green-500 dark:hover:border-green-500 bg-white dark:bg-slate-800"
                                              )}
                                              type="button"
                                              title={card.completed ? "Отметить как невыполненную" : "Отметить как выполненную"}
                                            >
                                              {card.completed && (
                                                <CheckCircle2 className="w-4 h-4" />
                                              )}
                                            </button>
                                          </div>

                                          {/* Card Content - кликабельно для открытия модального окна */}
                                          <div 
                                            className={cn(
                                              "card-content pr-6",
                                              card.completed && "opacity-60"
                                            )}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openCardModal(card.id);
                                            }}
                                          >
                                            {/* Priority Badge */}
                                            {card.priority && (
                                              <div className="absolute top-2 right-2">
                                                <div className={cn("px-1.5 py-0.5 rounded text-xs font-medium", getPriorityColor(card.priority))}>
                                                  <Flag className="w-3 h-3 inline" />
                                                </div>
                                              </div>
                                            )}

                                            <p className={cn(
                                              "text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed mb-2 pl-7",
                                              card.completed && "line-through"
                                            )}>{card.content}</p>
                                            
                                            {/* Labels */}
                                            {card.labels && card.labels.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mb-2">
                                                {card.labels.map(labelId => {
                                                  const label = boardLabels.find(l => l.id === labelId);
                                                  if (!label) return null;
                                                  return (
                                                    <span
                                                      key={labelId}
                                                      className="px-1.5 py-0.5 rounded text-xs font-medium"
                                                      style={{ backgroundColor: label.color + '40', color: label.color }}
                                                    >
                                                      {label.name}
                                                    </span>
                                                  );
                                                })}
                                              </div>
                                            )}

                                            <div className="flex items-center gap-2 flex-wrap">
                                              {card.description && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                  <FileText className="w-3 h-3" />
                                                  <span>Описание</span>
                                                </div>
                                              )}
                                              {card.comments && card.comments.length > 0 && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                  <MessageSquare className="w-3 h-3" />
                                                  <span>{card.comments.length}</span>
                                                </div>
                                              )}
                                              {card.checklists && card.checklists.length > 0 && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                  <CheckSquare className="w-3 h-3" />
                                                  <span>
                                                    {card.checklists.reduce((acc, cl) => {
                                                      const completed = cl.items.filter(i => i.completed).length;
                                                      return acc + completed;
                                                    }, 0)}/{card.checklists.reduce((acc, cl) => acc + cl.items.length, 0)}
                                                  </span>
                                                </div>
                                              )}
                                              {card.dueDate && (
                                                <div className={cn(
                                                  "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                                                  isDueDateOverdue(card.dueDate)
                                                    ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"
                                                    : "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700"
                                                )}>
                                                  <Clock className="w-3 h-3" />
                                                  <span>{formatDueDate(card.dueDate)}</span>
                                                </div>
                                              )}
                                              {card.assignedTo && (
                                                <div 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/profile/user/${card.assignedTo}`);
                                                  }}
                                                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer transition-colors"
                                                  title="Посмотреть профиль"
                                                >
                                                  <User className="w-3 h-3" />
                                                  <span className="truncate max-w-[100px]">
                                                    {userProfiles[card.assignedTo] 
                                                      ? (() => {
                                                          const profile = userProfiles[card.assignedTo];
                                                          const parts = [profile.lastName, profile.firstName, profile.middleName].filter(Boolean);
                                                          return parts.length > 0 ? parts.join(' ') : (profile.displayName || card.assignedToEmail || 'Назначено');
                                                        })()
                                                      : (card.assignedToEmail || 'Назначено')
                                                    }
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          </div>
                                        )}
                                      </Draggable>
                                  ))}
                                  {provided.placeholder}
                                  
                                  {activeListId === column.id ? (
                                    <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border-2 border-blue-300 dark:border-blue-600 shadow-md">
                                      <textarea
                                        autoFocus
                                        placeholder="Введите название карточки..."
                                        className="w-full text-sm p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none resize-none h-24 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                                        value={newCardText}
                                        onChange={(e) => setNewCardText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddCard(column.id);
                                          }
                                          if (e.key === 'Escape') {
                                            setActiveListId(null);
                                            setNewCardText('');
                                          }
                                        }}
                                      />
                                      <div className="flex items-center justify-between mt-3">
                                        <button 
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleAddCard(column.id);
                                          }}
                                          disabled={!newCardText.trim()}
                                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                                          type="button"
                                        >
                                          Добавить карточку
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setActiveListId(null);
                                            setNewCardText('');
                                          }}
                                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                          title="Отмена"
                                          type="button"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setActiveListId(column.id);
                                      }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                      }}
                                      className="w-full mt-2 py-2.5 flex items-center justify-center px-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium border border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500"
                                      type="button"
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Добавить карточку
                                    </button>
                                  )}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                  );
                })}
                {provided.placeholder}
                
                {/* Add List Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddList();
                  }}
                  className="w-72 flex-shrink-0 h-14 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium rounded-xl transition-all border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm hover:shadow-md"
                  type="button"
                >
                  <Plus className="w-5 h-5 mr-2" /> Добавить колонку
                </button>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Settings Modal */}
      {showSettings && board && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Настройки доски</h2>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowSettings(false);
                  setSettingsTab('general');
                }} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Закрыть"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              {[
                { id: 'general', label: 'Основные', icon: Settings },
                { id: 'members', label: 'Участники', icon: Users },
                { id: 'appearance', label: 'Внешний вид', icon: Palette },
                { id: 'advanced', label: 'Дополнительно', icon: Info },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2",
                      settingsTab === tab.id
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900"
                        : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    )}
                    type="button"
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {settingsTab === 'general' && (
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Название доски
                    </label>
                    {editingTitle ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateBoardTitle();
                            if (e.key === 'Escape') {
                              setEditingTitle(false);
                              setNewTitle(board.title);
                            }
                          }}
                          className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-slate-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          onClick={handleUpdateBoardTitle}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          type="button"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => {
                            setEditingTitle(false);
                            setNewTitle(board.title);
                          }}
                          className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          type="button"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-slate-800 dark:text-slate-100 font-medium">{board.title}</p>
                        {isOwner && (
                          <button
                            onClick={() => setEditingTitle(true)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            type="button"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Описание доски
                    </label>
                    <textarea
                      value={boardDescription}
                      onChange={(e) => setBoardDescription(e.target.value)}
                      onBlur={handleUpdateBoardDescription}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-slate-900 dark:text-white resize-none h-24"
                      placeholder="Добавьте описание доски..."
                    />
                  </div>

                  {/* Invite Code */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="font-semibold text-slate-700 dark:text-slate-200">Код приглашения</h3>
                      <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">Для новых участников</span>
                </div>
                
                    <div className="p-4 bg-slate-900 dark:bg-slate-950 rounded-lg flex items-center justify-between border border-slate-700">
                  <code className="text-green-400 font-mono text-lg tracking-wider select-all">
                    {board.inviteCode}
                  </code>
                     <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(board.inviteCode);
                          } catch (err) {
                            console.error('Failed to copy:', err);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        title="Копировать код"
                        type="button"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                </div>

                {isOwner && (
                  <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRegenerateCode();
                        }}
                    disabled={regeneratingCode}
                        className="flex items-center text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        type="button"
                  >
                    <RefreshCw className={cn("w-4 h-4 mr-2", regeneratingCode && "animate-spin")} />
                    Сгенерировать новый код
                  </button>
                )}
                  </div>

                  {/* Permissions */}
                  {isOwner && (
                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <h3 className="font-semibold text-slate-700 dark:text-slate-200">Разрешения</h3>
                      
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Участники могут редактировать</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Разрешить участникам изменять карточки и колонки</p>
                        </div>
                        <button
                          onClick={() => handleToggleSetting('allowMembersToEdit', !board.settings?.allowMembersToEdit)}
                          className={cn(
                            "relative w-11 h-6 rounded-full transition-colors",
                            board.settings?.allowMembersToEdit ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
                          )}
                          type="button"
                        >
                          <span className={cn(
                            "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                            board.settings?.allowMembersToEdit ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Участники могут приглашать</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Разрешить участникам приглашать новых членов</p>
                        </div>
                        <button
                          onClick={() => handleToggleSetting('allowMembersToInvite', !board.settings?.allowMembersToInvite)}
                          className={cn(
                            "relative w-11 h-6 rounded-full transition-colors",
                            board.settings?.allowMembersToInvite ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
                          )}
                          type="button"
                        >
                          <span className={cn(
                            "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                            board.settings?.allowMembersToInvite ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {settingsTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                      Участники ({board.memberIds.length})
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    {board.memberIds.map(memberId => {
                      const profile = userProfiles[memberId];
                      const isOwnerMember = memberId === board.ownerId;
                      const displayName = getUserDisplayName(memberId);
                      
                      return (
                        <div
                          key={memberId}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                {displayName}
                                {isOwnerMember && (
                                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                                    Владелец
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {profile?.email || memberId}
                              </p>
                            </div>
              </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/profile/user/${memberId}`)}
                              className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Посмотреть профиль"
                              type="button"
                            >
                              <User className="w-4 h-4" />
                            </button>
                            {isOwner && !isOwnerMember && (
                              <button
                                onClick={() => handleRemoveMember(memberId)}
                                disabled={removingMember === memberId}
                                className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                title="Удалить участника"
                                type="button"
                              >
                                {removingMember === memberId ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UserMinus className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {settingsTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Цвет доски</h3>
                    <div className="grid grid-cols-8 gap-3">
                      {[
                        '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
                        '#10b981', '#ef4444', '#06b6d4', '#6366f1',
                        '#84cc16', '#f97316', '#a855f7', '#14b8a6',
                      ].map(color => (
                        <button
                          key={color}
                          onClick={() => handleUpdateBoardColor(color)}
                          className={cn(
                            "w-12 h-12 rounded-lg transition-all hover:scale-110",
                            selectedColor === color && "ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-900"
                          )}
                          style={{ backgroundColor: color }}
                          type="button"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'advanced' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Лента активности</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      История всех действий на доске
                    </p>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <ActivityFeed boardId={board.id} userId={userId} />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Экспорт данных</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Экспортируйте все данные доски в формате JSON для резервного копирования или переноса.
                    </p>
                    <button
                      onClick={handleExportBoard}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      type="button"
                    >
                      <Download className="w-4 h-4" />
                      Экспортировать доску
                    </button>
                  </div>

              {isOwner && (
                    <>
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Архивация</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                          Архивированная доска будет скрыта из списка, но данные сохранятся.
                        </p>
                  <button
                          onClick={handleArchiveBoard}
                          className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          type="button"
                        >
                          <Archive className="w-4 h-4" />
                          Архивировать доску
                        </button>
                      </div>

                      <div className="pt-4 border-t border-red-200 dark:border-red-900/50">
                        <h3 className="text-red-600 dark:text-red-400 font-semibold mb-4">Опасная зона</h3>
                        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                          Удаление доски необратимо. Все данные будут безвозвратно удалены.
                        </p>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteBoard();
                          }}
                          className="px-4 py-2 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
                          type="button"
                  >
                          <Trash2 className="w-4 h-4 inline mr-2" />
                    Удалить доску
                  </button>
                </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card Edit Modal */}
      {selectedCard && editingCard && board && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedCard(null);
              setEditingCard(null);
              setNewComment('');
            }
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start bg-slate-50 dark:bg-slate-800">
              <div className="flex-1 flex items-start gap-3">
                {/* Completion Checkbox */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleCardCompleted(editingCard.id);
                  }}
                  className={cn(
                    "w-6 h-6 rounded border-2 flex items-center justify-center transition-all hover:scale-110 flex-shrink-0 mt-1",
                    editingCard.completed
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-slate-300 dark:border-slate-600 hover:border-green-500 dark:hover:border-green-500 bg-white dark:bg-slate-800"
                  )}
                  type="button"
                  title={editingCard.completed ? "Отметить как невыполненную" : "Отметить как выполненную"}
                >
                  {editingCard.completed && (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </button>
                
                <div className="flex-1">
                  <textarea
                    value={editingCard.content}
                    onChange={(e) => setEditingCard({ ...editingCard, content: e.target.value })}
                    className={cn(
                      "w-full text-xl font-bold bg-transparent border-none outline-none resize-none text-slate-800 dark:text-slate-100 mb-2",
                      editingCard.completed && "line-through opacity-60"
                    )}
                    placeholder="Название карточки..."
                    rows={2}
                  />
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span>В колонке: {board.data.columnOrder.find(colId => board.data.columns[colId].cardIds.includes(editingCard.id)) ? board.data.columns[board.data.columnOrder.find(colId => board.data.columns[colId].cardIds.includes(editingCard.id))!].title : 'Неизвестно'}</span>
                    {editingCard.completed && editingCard.completedAt && (
                      <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Выполнена {new Date(editingCard.completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
      )}
    </div>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedCard(null);
                  setEditingCard(null);
                  setNewComment('');
                }} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ml-4"
                title="Закрыть"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Description */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Описание</h3>
                </div>
                <textarea
                  value={editingCard.description || ''}
                  onChange={(e) => setEditingCard({ ...editingCard, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none resize-none h-32 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                  placeholder="Добавьте более подробное описание..."
                />
              </div>

              {/* Priority */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Flag className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Приоритет</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['low', 'medium', 'high', 'critical'] as Priority[]).map(priority => (
                    <button
                      key={priority}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSetPriority(editingCard.id, editingCard.priority === priority ? null : priority);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        editingCard.priority === priority
                          ? getPriorityColor(priority) + " ring-2 ring-blue-500"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                      type="button"
                    >
                      <Flag className="w-3 h-3 inline mr-1" />
                      {getPriorityLabel(priority)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Срок выполнения</h3>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={editingCard.dueDate ? new Date(editingCard.dueDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value).getTime() : null;
                      handleSetDueDate(editingCard.id, date);
                    }}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none text-sm text-slate-900 dark:text-white"
                  />
                  {editingCard.dueDate && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSetDueDate(editingCard.id, null);
                      }}
                      className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      type="button"
                    >
                      Удалить
                    </button>
                  )}
                </div>
                {editingCard.dueDate && (
                  <p className={cn(
                    "text-xs mt-2",
                    isDueDateOverdue(editingCard.dueDate)
                      ? "text-red-600 dark:text-red-400 font-medium"
                      : "text-slate-500 dark:text-slate-400"
                  )}>
                    {isDueDateOverdue(editingCard.dueDate) ? '⚠️ Просрочено: ' : ''}
                    {formatDueDate(editingCard.dueDate)}
                  </p>
                )}
              </div>

              {/* Labels */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Метки</h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const name = prompt('Название метки:');
                      if (name) {
                        setNewLabelName(name);
                        handleCreateLabel();
                      }
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    type="button"
                  >
                    + Создать метку
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {boardLabels.map(label => {
                    const isSelected = editingCard.labels?.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleLabel(editingCard.id, label.id);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                          isSelected
                            ? "ring-2 ring-blue-500"
                            : "opacity-60 hover:opacity-100"
                        )}
                        style={{ backgroundColor: label.color + '40', color: label.color }}
                        type="button"
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assigned To */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Исполнитель</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {board.memberIds.map(memberId => {
                      const profile = userProfiles[memberId];
                      const displayName = getUserDisplayName(memberId);
                      const isAssigned = editingCard.assignedTo === memberId;
                      
                      return (
                        <button
                          key={memberId}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isAssigned) {
                              handleAssignUser('', null);
                            } else {
                              handleAssignUser(memberId, profile?.email || null);
                            }
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                            isAssigned 
                              ? "bg-blue-600 text-white hover:bg-blue-700" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          )}
                          type="button"
                        >
                          {displayName}
                        </button>
                      );
                    })}
                  </div>
                  
                  {editingCard.assignedTo && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Исполнитель:</p>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/profile/user/${editingCard.assignedTo}`);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium w-full"
                        type="button"
                      >
                        <User className="w-4 h-4" />
                        <span className="flex-1 text-left">{getUserDisplayName(editingCard.assignedTo)}</span>
                        <span className="text-xs">→</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Checklists */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                      Чеклисты {editingCard.checklists && editingCard.checklists.length > 0 && `(${editingCard.checklists.length})`}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddChecklist(editingCard.id);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    type="button"
                  >
                    <Plus className="w-3 h-3" />
                    Добавить чеклист
                  </button>
                </div>
                
                <div className="space-y-4">
                  {editingCard.checklists && editingCard.checklists.length > 0 ? (
                    editingCard.checklists.map((checklist: Checklist) => {
                      const completedCount = checklist.items.filter(item => item.completed).length;
                      const totalCount = checklist.items.length;
                      const [editingTitle, setEditingTitle] = React.useState(false);
                      const [checklistTitle, setChecklistTitle] = React.useState(checklist.title);
                      const [newItemText, setNewItemText] = React.useState('');

                      const handleUpdateChecklistTitle = async () => {
                        if (!board || !editingCard) return;
                        const updatedCard = {
                          ...editingCard,
                          checklists: editingCard.checklists?.map(cl =>
                            cl.id === checklist.id ? { ...cl, title: checklistTitle } : cl
                          ) || [],
                          updatedAt: Date.now()
                        };
                        const newBoardData = { ...board.data };
                        newBoardData.cards[editingCard.id] = updatedCard;
                        try {
                          await updateDoc(doc(db, 'boards', board.id), { data: newBoardData });
                          setEditingCard(updatedCard);
                          setEditingTitle(false);
                        } catch (error: any) {
                          if (error.code === 'permission-denied') setPermissionError(true);
                        }
                      };

                      return (
                        <div key={checklist.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            {editingTitle ? (
                              <input
                                type="text"
                                value={checklistTitle}
                                onChange={(e) => setChecklistTitle(e.target.value)}
                                onBlur={handleUpdateChecklistTitle}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateChecklistTitle();
                                  } else if (e.key === 'Escape') {
                                    setChecklistTitle(checklist.title);
                                    setEditingTitle(false);
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded outline-none"
                                autoFocus
                              />
                            ) : (
                              <h4
                                onClick={() => setEditingTitle(true)}
                                className="text-sm font-medium text-slate-800 dark:text-slate-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                {checklist.title}
                              </h4>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {completedCount}/{totalCount}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteChecklist(editingCard.id, checklist.id);
                                }}
                                className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                                type="button"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-1 mb-2">
                            {checklist.items.map((item: ChecklistItem) => (
                              <div key={item.id} className="flex items-center gap-2 group">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleToggleChecklistItem(editingCard.id, checklist.id, item.id);
                                  }}
                                  className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                                  type="button"
                                >
                                  {item.completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <Circle className="w-4 h-4" />
                                  )}
                                </button>
                                <span className={cn(
                                  "text-sm flex-1",
                                  item.completed && "line-through text-slate-400 dark:text-slate-500"
                                )}>
                                  {item.text}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteChecklistItem(editingCard.id, checklist.id, item.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  type="button"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              value={newItemText}
                              onChange={(e) => setNewItemText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newItemText.trim()) {
                                  e.preventDefault();
                                  handleAddChecklistItem(editingCard.id, checklist.id, newItemText);
                                  setNewItemText('');
                                }
                              }}
                              placeholder="Добавить элемент..."
                              className="flex-1 px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded outline-none"
                            />
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (newItemText.trim()) {
                                  handleAddChecklistItem(editingCard.id, checklist.id, newItemText);
                                  setNewItemText('');
                                }
                              }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                              type="button"
                            >
                              Добавить
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">Нет чеклистов</p>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    Комментарии {editingCard.comments && editingCard.comments.length > 0 && `(${editingCard.comments.length})`}
                  </h3>
                </div>
                
                {/* Comments List */}
                <div className="space-y-3 mb-4">
                  {editingCard.comments && editingCard.comments.length > 0 ? (
                    editingCard.comments.map((comment: Comment) => (
                      <div key={comment.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 group hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors relative">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                              {comment.authorEmail || 'Неизвестный'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(comment.createdAt).toLocaleDateString('ru-RU', { 
                                day: 'numeric', 
                                month: 'short', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          {comment.authorId === userId && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (confirm('Удалить этот комментарий?')) {
                                  handleDeleteComment(comment.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              type="button"
                              title="Удалить комментарий"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{comment.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">Пока нет комментариев</p>
                  )}
                </div>

                {/* Add Comment */}
                <div className="flex gap-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && newComment.trim()) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none resize-none h-20 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                    placeholder="Написать комментарий... (Enter для отправки)"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddComment();
                    }}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-sm self-end"
                    type="button"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Activity History Button */}
              <div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowActivityHistory(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-all hover:shadow-md font-medium"
                  type="button"
                >
                  <HistoryIcon className="w-5 h-5" />
                  <span>История активности</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteCard(editingCard.id);
                }}
                className="px-4 py-2 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
                type="button"
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                Удалить карточку
              </button>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedCard(null);
                    setEditingCard(null);
                    setNewComment('');
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-all"
                  type="button"
                >
                  Отмена
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUpdateCard();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
                  type="button"
                >
                  Сохранить изменения
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity History Modal */}
      {showActivityHistory && editingCard && board && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowActivityHistory(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <HistoryIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    История активности
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {editingCard.content}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowActivityHistory(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <ActivityFeed boardId={board.id} cardId={editingCard.id} userId={userId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};