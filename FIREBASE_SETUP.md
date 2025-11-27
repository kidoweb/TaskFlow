# Настройка Firebase для TaskFlow

## Шаг 1: Создание проекта Firebase

1. Перейдите на [Firebase Console](https://console.firebase.google.com/)
2. Создайте новый проект или используйте существующий
3. Включите **Authentication** (Email/Password)
4. Создайте базу данных **Firestore** в режиме Production

## Шаг 2: Настройка Firestore Security Rules

1. Перейдите в Firestore → Rules
2. Скопируйте содержимое файла `firestore.rules` в редактор правил
3. Опубликуйте правила

Или используйте Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

## Шаг 3: Создание индексов Firestore

Firestore требует составные индексы для запросов с несколькими условиями.

### Вариант 1: Автоматическое создание через Firebase CLI (Рекомендуется)

1. Установите Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Войдите в Firebase:
   ```bash
   firebase login
   ```

3. Инициализируйте проект (если еще не сделано):
   ```bash
   firebase init firestore
   ```

4. Задеплойте индексы:
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Вариант 2: Создание вручную через Firebase Console

1. Перейдите в Firebase Console → Firestore → Indexes
2. Нажмите "Create Index"
3. Создайте следующие индексы:

#### Индекс для уведомлений:
- **Collection ID:** `notifications`
- **Fields:**
  - `userId` (Ascending)
  - `createdAt` (Descending)

#### Индекс для активности (по доске):
- **Collection ID:** `activities`
- **Fields:**
  - `boardId` (Ascending)
  - `createdAt` (Descending)

#### Индекс для активности (по карточке):
- **Collection ID:** `activities`
- **Fields:**
  - `boardId` (Ascending)
  - `cardId` (Ascending)
  - `createdAt` (Descending)

### Вариант 3: Создание по ссылке из ошибки

Если вы видите ошибку в консоли браузера с ссылкой на создание индекса:
1. Скопируйте ссылку из ошибки
2. Откройте её в браузере
3. Нажмите "Create Index" в Firebase Console

## Шаг 4: Проверка конфигурации

Убедитесь, что файл `firebase.ts` содержит правильные credentials из Firebase Console:
- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

## Важные замечания

- Индексы создаются асинхронно и могут занять несколько минут
- После создания индексов запросы будут работать без ошибок
- Файл `firestore.indexes.json` содержит конфигурацию всех необходимых индексов
- Файл `firestore.rules` содержит правила безопасности для Firestore

## Устранение проблем

Если вы видите ошибку "The query requires an index":
1. Проверьте, что индексы созданы в Firebase Console
2. Дождитесь завершения создания индексов (статус должен быть "Enabled")
3. Обновите страницу в браузере

