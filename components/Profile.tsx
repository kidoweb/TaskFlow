import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, setDoc, onSnapshot, deleteField } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile } from '../types';
import { User, Mail, Save, ArrowLeft, Loader2, MessageCircle, Hash, Edit2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface ProfileProps {
  userId: string;
  isOwnProfile?: boolean;
}

export const Profile: React.FC<ProfileProps> = ({ userId, isOwnProfile = false }) => {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Форма редактирования
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    telegram: '',
    discord: '',
  });

  useEffect(() => {
    if (!userId) return;

    const profileRef = doc(db, 'profiles', userId);
    
    const unsubscribe = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile({ ...data, uid: userId });
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          middleName: data.middleName || '',
          telegram: data.telegram || '',
          discord: data.discord || '',
        });
      } else {
        // Создаем базовый профиль если его нет
        const basicProfile: UserProfile = {
          uid: userId,
          email: currentUser?.email || null,
          displayName: currentUser?.displayName || null,
          emailVerified: currentUser?.emailVerified || false,
        };
        setProfile(basicProfile);
        setFormData({
          firstName: '',
          lastName: '',
          middleName: '',
          telegram: '',
          discord: '',
        });
      }
      setLoading(false);
    }, (error) => {
      console.error('Error loading profile:', error);
      setError('Ошибка загрузки профиля');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, currentUser]);

  const handleSave = async () => {
    if (!currentUser || !isOwnProfile) return;

    setSaving(true);
    setError(null);

    try {
      const profileRef = doc(db, 'profiles', currentUser.uid);
      
      // Подготавливаем данные, удаляя пустые поля или используя deleteField для существующих
      const updateData: any = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        emailVerified: currentUser.emailVerified,
        updatedAt: Date.now(),
      };

      // Добавляем поля только если они не пустые
      const firstName = formData.firstName.trim();
      const lastName = formData.lastName.trim();
      const middleName = formData.middleName.trim();
      const telegram = formData.telegram.trim();
      const discord = formData.discord.trim();

      if (firstName) {
        updateData.firstName = firstName;
      } else if (profile?.firstName) {
        updateData.firstName = deleteField();
      }

      if (lastName) {
        updateData.lastName = lastName;
      } else if (profile?.lastName) {
        updateData.lastName = deleteField();
      }

      if (middleName) {
        updateData.middleName = middleName;
      } else if (profile?.middleName) {
        updateData.middleName = deleteField();
      }

      if (telegram) {
        updateData.telegram = telegram;
      } else if (profile?.telegram) {
        updateData.telegram = deleteField();
      }

      if (discord) {
        updateData.discord = discord;
      } else if (profile?.discord) {
        updateData.discord = deleteField();
      }

      await setDoc(profileRef, updateData, { merge: true });

      setIsEditing(false);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError('Ошибка сохранения профиля');
      if (err.code === 'permission-denied') {
        setError('Нет прав на редактирование профиля');
      }
    } finally {
      setSaving(false);
    }
  };

  const getFullName = () => {
    if (!profile) return 'Не указано';
    const parts = [
      profile.lastName,
      profile.firstName,
      profile.middleName
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : (profile.displayName || profile.email || 'Не указано');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">Профиль не найден</p>
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
            Вернуться на главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Назад</span>
        </button>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-xl ring-4 ring-blue-100 dark:ring-blue-900/30">
              {getFullName().charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">
                {getFullName()}
              </h1>
              {profile.email && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Mail className="w-4 h-4" />
                  <p>{profile.email}</p>
                </div>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl active:scale-95",
                isEditing
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              )}
            >
              {isEditing ? (
                <>
                  <X className="w-5 h-5" />
                  Отмена
                </>
              ) : (
                <>
                  <Edit2 className="w-5 h-5" />
                  Редактировать
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-l-4 border-red-500 dark:border-red-400 rounded-xl text-red-700 dark:text-red-400 shadow-sm animate-fade-in">
          {error}
        </div>
      )}

      {/* Profile Content */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-6 sm:p-8">
        {isEditing && isOwnProfile ? (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                Личная информация
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Фамилия
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-slate-900 dark:text-white shadow-sm transition-all"
                    placeholder="Иванов"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Имя
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-slate-900 dark:text-white shadow-sm transition-all"
                    placeholder="Иван"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Отчество
                  </label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-slate-900 dark:text-white shadow-sm transition-all"
                    placeholder="Иванович"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
                Контактные данные
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Telegram
                  </label>
                  <input
                    type="text"
                    value={formData.telegram}
                    onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-slate-900 dark:text-white shadow-sm transition-all"
                    placeholder="@username"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Discord
                  </label>
                  <input
                    type="text"
                    value={formData.discord}
                    onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-slate-900 dark:text-white shadow-sm transition-all"
                    placeholder="username#1234"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    firstName: profile.firstName || '',
                    lastName: profile.lastName || '',
                    middleName: profile.middleName || '',
                    telegram: profile.telegram || '',
                    discord: profile.discord || '',
                  });
                }}
                className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
                disabled={saving}
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Сохранить
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                Личная информация
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">ФИО</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {getFullName()}
                    </p>
                  </div>
                </div>
                
                {profile.email && (
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Email</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">{profile.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
                Контактные данные
              </h2>
              <div className="space-y-4">
                {profile.telegram ? (
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Telegram</p>
                      <a 
                        href={`https://t.me/${profile.telegram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {profile.telegram}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 opacity-60">
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Telegram</p>
                      <p className="text-lg font-semibold text-slate-400 dark:text-slate-500 italic">Не указано</p>
                    </div>
                  </div>
                )}
                
                {profile.discord ? (
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Hash className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Discord</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">{profile.discord}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 opacity-60">
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                      <Hash className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Discord</p>
                      <p className="text-lg font-semibold text-slate-400 dark:text-slate-500 italic">Не указано</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент для просмотра чужого профиля
export const ProfileView: React.FC<{ userId: string }> = ({ userId }) => {
  const params = useParams<{ userId: string }>();
  const viewUserId = params.userId || userId;
  
  return <Profile userId={viewUserId} isOwnProfile={false} />;
};

