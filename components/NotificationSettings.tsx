import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { NotificationSettings, NotificationType } from '../types';
import { Bell, Volume2, VolumeX, Mail, X, Save } from 'lucide-react';
import { soundManager } from '../utils/soundNotifications';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  soundVolume: 0.5,
  emailNotifications: false,
  types: {
    assignment: true,
    comment: true,
    deadline: true,
    mention: true,
    card_update: true,
    board_update: true,
  },
};

export const NotificationSettingsModal: React.FC<NotificationSettingsProps> = ({
  isOpen,
  onClose,
  userId
}) => {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, userId]);

  const loadSettings = async () => {
    try {
      const profileRef = doc(db, 'profiles', userId);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        if (profileData.notificationSettings) {
          setSettings({ ...defaultSettings, ...profileData.notificationSettings });
        } else {
          setSettings(defaultSettings);
        }
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const profileRef = doc(db, 'profiles', userId);
      const profileDoc = await getDoc(profileRef);
      
      const updateData: any = {};
      if (profileDoc.exists()) {
        updateData.notificationSettings = settings;
      } else {
        updateData.uid = userId;
        updateData.email = auth.currentUser?.email;
        updateData.notificationSettings = settings;
      }

      await setDoc(profileRef, updateData, { merge: true });
      
      // Применяем настройки звука
      soundManager.setEnabled(settings.soundEnabled);
      soundManager.setVolume(settings.soundVolume);
      
      // Тестовый звук
      if (settings.soundEnabled) {
        await soundManager.play('notification');
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleType = (type: NotificationType) => {
    setSettings(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: !prev.types[type]
      }
    }));
  };

  const handleTestSound = async () => {
    await soundManager.play('notification');
  };

  if (!isOpen) return null;

  const notificationTypeLabels: Record<NotificationType, string> = {
    assignment: 'Назначения',
    comment: 'Комментарии',
    deadline: 'Сроки выполнения',
    mention: 'Упоминания',
    card_update: 'Обновления карточек',
    board_update: 'Обновления досок',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Настройки уведомлений
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Управляйте уведомлениями и звуками
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Общие настройки */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Общие настройки
                </h3>
                
                {/* Включить уведомления */}
                <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      Включить уведомления
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Звуковые уведомления */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <label className="flex items-center justify-between mb-4 cursor-pointer">
                    <div className="flex items-center gap-3">
                      {settings.soundEnabled ? (
                        <Volume2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      ) : (
                        <VolumeX className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      )}
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        Звуковые уведомления
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  
                  {settings.soundEnabled && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Громкость</span>
                        <button
                          onClick={handleTestSound}
                          className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          type="button"
                        >
                          Тест
                        </button>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.soundVolume}
                        onChange={(e) => setSettings(prev => ({ ...prev, soundVolume: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  )}
                </div>

                {/* Email уведомления */}
                <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      Email уведомления
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </div>

              {/* Типы уведомлений */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Типы уведомлений
                </h3>
                <div className="space-y-2">
                  {(Object.keys(settings.types) as NotificationType[]).map((type) => (
                    <label
                      key={type}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {notificationTypeLabels[type]}
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.types[type]}
                        onChange={() => handleToggleType(type)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
            type="button"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            type="button"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};

