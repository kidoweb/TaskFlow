import React, { useState } from 'react';
import { X, HelpCircle, Book, Keyboard, Lightbulb, MessageCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'getting-started' | 'keyboard' | 'tips'>('getting-started');

  if (!isOpen) return null;

  const helpSections = {
    'getting-started': {
      title: 'Начало работы',
      icon: Book,
      content: [
        {
          title: 'Создание доски',
          text: 'Нажмите кнопку "Создать доску" на главной странице, чтобы создать новую Kanban-доску. Вы можете настроить название, описание и цвет доски.'
        },
        {
          title: 'Добавление карточек',
          text: 'Кликните на кнопку "+" в колонке, чтобы добавить новую карточку. Вы можете добавить описание, назначить исполнителя, установить срок выполнения и приоритет.'
        },
        {
          title: 'Управление карточками',
          text: 'Перетаскивайте карточки между колонками для изменения их статуса. Кликните на карточку, чтобы открыть детальный просмотр и редактирование.'
        },
        {
          title: 'Комментарии и чеклисты',
          text: 'Добавляйте комментарии к карточкам для обсуждения задач. Создавайте чеклисты для разбиения задач на подзадачи.'
        },
        {
          title: 'Фильтрация и поиск',
          text: 'Используйте панель фильтров для поиска карточек по исполнителю, приоритету, меткам или сроку выполнения.'
        }
      ]
    },
    'keyboard': {
      title: 'Горячие клавиши',
      icon: Keyboard,
      content: [
        {
          title: 'Навигация',
          text: 'Esc - закрыть модальное окно\nEnter - подтвердить действие\nTab - переключение между элементами'
        },
        {
          title: 'Работа с карточками',
          text: 'Ctrl/Cmd + N - создать новую карточку\nCtrl/Cmd + F - открыть поиск\nCtrl/Cmd + S - сохранить изменения'
        },
        {
          title: 'Редактирование',
          text: 'Ctrl/Cmd + Z - отменить действие\nCtrl/Cmd + Y - повторить действие\nDelete - удалить выбранный элемент'
        }
      ]
    },
    'tips': {
      title: 'Советы и рекомендации',
      icon: Lightbulb,
      content: [
        {
          title: 'Организация работы',
          text: 'Используйте метки для категоризации карточек. Устанавливайте приоритеты для важных задач. Регулярно проверяйте сроки выполнения.'
        },
        {
          title: 'Командная работа',
          text: 'Назначайте исполнителей на карточки для четкого распределения задач. Используйте комментарии для обсуждения деталей.'
        },
        {
          title: 'Уведомления',
          text: 'Настройте уведомления в профиле, чтобы получать информацию о назначениях, комментариях и приближающихся дедлайнах.'
        },
        {
          title: 'Архивирование',
          text: 'Завершенные задачи автоматически отмечаются. Вы можете фильтровать их или архивировать доски для лучшей организации.'
        },
        {
          title: 'Экспорт данных',
          text: 'Используйте функцию экспорта в настройках доски для резервного копирования данных или создания отчетов.'
        }
      ]
    }
  };

  const activeSection = helpSections[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Справка
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Узнайте больше о возможностях TaskFlow
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

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {Object.entries(helpSections).map(([key, section]) => {
            const Icon = section.icon;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2",
                  activeTab === key
                    ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400"
                    : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300"
                )}
                type="button"
              >
                <Icon className="w-5 h-5" />
                {section.title}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-6">
            {activeSection.content.map((item, index) => (
              <div
                key={index}
                className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <MessageCircle className="w-4 h-4" />
            <span>Нужна дополнительная помощь? Обратитесь к администратору.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

