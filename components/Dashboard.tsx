import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  updateDoc,
  arrayUnion,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Board } from '../types';
import { Link } from 'react-router-dom';
import { Plus, Users, ArrowRight, Loader2, Search, AlertTriangle } from 'lucide-react';
import { OnboardingTour, TourStep } from './OnboardingTour';

interface DashboardProps {
  userId: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ userId }) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'boards'), where('memberIds', 'array-contains', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const boardsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Board[];
      // Sort by created date desc
      setBoards(boardsData.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
      setPermissionError(false);
    }, (error) => {
      console.error("Firestore error:", error);
      if (error.code === 'permission-denied') {
        setPermissionError(true);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    setIsCreating(true);

    try {
      const newBoard: Omit<Board, 'id'> = {
        title: newBoardTitle,
        ownerId: userId,
        memberIds: [userId],
        inviteCode: generateInviteCode(),
        createdAt: Date.now(),
        data: {
          columns: {
            'col-1': { id: 'col-1', title: 'Нужно сделать', cardIds: [] },
            'col-2': { id: 'col-2', title: 'В процессе', cardIds: [] },
            'col-3': { id: 'col-3', title: 'Готово', cardIds: [] },
          },
          cards: {},
          columnOrder: ['col-1', 'col-2', 'col-3']
        }
      };
      await addDoc(collection(db, 'boards'), newBoard);
      setNewBoardTitle('');
    } catch (error: any) {
      console.error("Error creating board:", error);
      if (error.code === 'permission-denied') setPermissionError(true);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || joinCode.length !== 16) {
      setJoinError('Код должен состоять из 16 символов');
      return;
    }
    setJoining(true);
    setJoinError('');

    try {
      const q = query(collection(db, 'boards'), where('inviteCode', '==', joinCode.toUpperCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setJoinError('Доска с таким кодом не найдена');
      } else {
        const boardDoc = snapshot.docs[0];
        const boardData = boardDoc.data();
        
        if (boardData.memberIds.includes(userId)) {
          setJoinError('Вы уже являетесь участником этой доски');
        } else {
          await updateDoc(doc(db, 'boards', boardDoc.id), {
            memberIds: arrayUnion(userId)
          });
          setJoinCode('');
        }
      }
    } catch (error: any) {
      console.error("Error joining board:", error);
      if (error.code === 'permission-denied') {
        setJoinError('Ошибка доступа (Permission denied)');
        setPermissionError(true);
      } else {
        setJoinError('Ошибка при подключении');
      }
    } finally {
      setJoining(false);
    }
  };

  const onboardingSteps: TourStep[] = [
    {
      id: 'welcome',
      target: 'center',
      title: 'Добро пожаловать в TaskFlow!',
      content: 'TaskFlow - это современное приложение для управления задачами с использованием Kanban-досок. Давайте начнем знакомство!',
      position: 'center'
    },
    {
      id: 'create-board',
      target: '[data-tour="create-board"]',
      title: 'Создание доски',
      content: 'Нажмите здесь, чтобы создать новую доску. Доска - это пространство для организации ваших задач и проектов.',
      position: 'right'
    },
    {
      id: 'join-board',
      target: '[data-tour="join-board"]',
      title: 'Присоединение к доске',
      content: 'Используйте код приглашения, чтобы присоединиться к существующей доске. Код можно получить у владельца доски.',
      position: 'right'
    },
    {
      id: 'boards-list',
      target: '[data-tour="boards-list"]',
      title: 'Ваши доски',
      content: 'Здесь отображаются все доски, к которым у вас есть доступ. Кликните на доску, чтобы открыть её.',
      position: 'bottom'
    }
  ];

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <OnboardingTour steps={onboardingSteps} storageKey={`taskflow-onboarding-${userId}`} />
      {permissionError && (
        <div className="mb-8 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-l-4 border-red-500 dark:border-red-400 p-6 rounded-xl shadow-lg animate-fade-in">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">
                Ошибка доступа к базе данных
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4 text-sm leading-relaxed">
                Firestore отклонил запрос. Это происходит, когда правила безопасности (Security Rules) не настроены. 
                Чтобы исправить это, перейдите в <strong>Firebase Console &gt; Firestore Database &gt; Rules</strong> и вставьте следующий код:
              </p>
              <div className="bg-slate-900 rounded-lg p-4 relative group border border-slate-700">
                <pre className="text-green-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
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
              <p className="mt-4 text-xs text-red-600/80 dark:text-red-400/80">
                * Примечание: Это правило разрешает доступ любому авторизованному пользователю. Для продакшена рекомендуется настроить более строгие правила.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">Мои доски</h1>
        <p className="text-slate-600 dark:text-slate-400">Управляйте своими проектами и задачами</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Content - Board List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6" data-tour="boards-list">
            {boards.map((board, index) => (
              <Link 
                key={board.id} 
                to={`/board/${board.id}`}
                className="group relative p-6 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 rounded-2xl hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 flex flex-col justify-between min-h-[160px] overflow-hidden card-hover animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Gradient background */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: board.color 
                      ? `linear-gradient(135deg, ${board.color}15 0%, ${board.color}05 100%)`
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)'
                  }}
                />
                
                {/* Decorative element */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100/50 to-indigo-100/50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-bl-full -mr-12 -mt-12 transition-transform duration-300 group-hover:scale-150 group-hover:rotate-12" />
                
                <div className="relative z-10">
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-3 pr-4 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {board.title}
                  </h3>
                  {board.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                      {board.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm relative z-10 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {board.memberIds.length} {board.memberIds.length === 1 ? 'участник' : 'участников'}
                  </span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}

            {!loading && boards.length === 0 && !permissionError && (
              <div className="col-span-full p-16 text-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 animate-fade-in">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Users className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Начните работу</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">Создайте свою первую доску или присоединитесь к существующей</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-6">
          {/* Create Board Widget */}
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-lg backdrop-blur-sm" data-tour="create-board">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Создать доску</h3>
            </div>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
              <input
                type="text"
                placeholder="Название проекта..."
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400 transition-all shadow-sm"
              />
              </div>
              <button
                type="submit"
                disabled={isCreating || !newBoardTitle.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.98]"
              >
                {isCreating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" /> Создать доску
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Join Board Widget */}
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-lg backdrop-blur-sm" data-tour="join-board">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Search className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Присоединиться</h3>
            </div>
            <form onSubmit={handleJoinBoard} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Введите код доски..."
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={16}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent outline-none text-sm font-mono uppercase text-slate-900 dark:text-white placeholder-slate-400 transition-all shadow-sm tracking-wider"
                />
                {joinError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1 animate-fade-in">
                    <AlertTriangle className="w-3 h-3" />
                    {joinError}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={joining || joinCode.length !== 16}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.98]"
              >
                {joining ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" /> Найти доску
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};