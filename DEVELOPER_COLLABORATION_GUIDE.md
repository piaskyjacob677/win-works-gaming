# Developer Collaboration Guide / Посібник для Співпраці з Розробником

---

## English Version

### Overview

This document outlines how we will divide responsibilities between **frontend development** (handled by Jacob with Claude AI assistance) and **backend development** (handled by Hanyc and his team). The goal is to **accelerate development** by working in parallel while maintaining a clean, consistent interface between our work.

---

### Project Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WINWORKS AUTOMATION                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────┐      ┌─────────────────────────────┐   │
│  │    FRONTEND (Jacob)     │      │   BACKEND (Hanyc & Team)    │   │
│  │    ─────────────────    │      │    ──────────────────────   │   │
│  │                         │      │                             │   │
│  │  • Next.js Dashboard    │ API  │  • Betting Services         │   │
│  │  • React Components     │◄────►│  • Odds Scraping            │   │
│  │  • User Interface       │      │  • Bet Placement Logic      │   │
│  │  • Payment Pages        │      │  • Account Management       │   │
│  │  • Authentication UI    │      │  • Data Processing          │   │
│  │                         │      │                             │   │
│  └─────────────────────────┘      └─────────────────────────────┘   │
│              │                                  │                   │
│              │         ┌────────────┐           │                   │
│              └────────►│  JSON API  │◄──────────┘                   │
│                        │  Contract  │                               │
│                        └────────────┘                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Division of Responsibilities

#### Jacob's Responsibilities (Frontend + Client Experience)

| Area | Description |
|------|-------------|
| **Dashboard UI** | All visual design, layout, user flows |
| **React Components** | Building and styling all UI components |
| **User Authentication** | Login/register pages, session handling UI |
| **Payment Integration** | Crypto payment pages, transaction displays |
| **Client Communication** | Understanding what clients need and translating to features |
| **Smart Bet Finder UI** | The search interface, filters, bet placement forms |
| **Mobile Responsiveness** | Ensuring everything works on all devices |

#### Hanyc & Team's Responsibilities (Backend + Data)

| Area | Description |
|------|-------------|
| **Betting Services** | All scraping logic for each sportsbook (ABCWager, Action, Fesster, etc.) |
| **Odds Processing** | Normalizing odds data, calculating best prices |
| **Bet Placement** | API logic for placing bets across multiple books |
| **Account Management** | Backend logic for managing betting accounts |
| **API Endpoints** | Creating and maintaining all `/api/` routes |
| **Data Storage** | Managing JSON files, caching, data persistence |
| **Error Handling** | Ensuring robust error handling and logging |
| **Server Health** | Keeping 8088/8089 servers running and healthy |

---

### API Contract - CRITICAL FOR CONSISTENCY

**The API is our contract.** As long as both sides respect the API structure, we can work independently.

#### Current API Endpoints (Backend Must Maintain)

```
GET  /api/general/skins          → Returns list of betting services
GET  /api/general/teams?search=  → Search for teams/events
POST /api/general/bet            → Place bets
POST /api/general/prebet         → Parse bet signal
POST /api/general/confirmbet     → Confirm and place bet
GET  /api/general/history        → Get betting history
POST /api/general/account/create → Create new account
POST /api/general/account/update → Update account
PUT  /api/general/account/delete → Delete account
GET  /api/general/account        → List all accounts
```

#### Expected Response Formats

**GET /api/general/teams?search={query}**
```json
[
  {
    "service": "abcwager",
    "serviceName": "ABC Wager",
    "title": "Patriots ML",
    "sport": "NFL",
    "desc": "Full Game",
    "points": 0,
    "odds": -110,
    "order": 1
  }
]
```

**POST /api/general/bet**
```json
// Request
{
  "betSlip": { "title": "Patriots ML" },
  "amount": 100,
  "pointTolerance": 0.5,
  "oddsTolerance": 10,
  "confirmMode": false,
  "filterEventsList": [...]
}

// Response (array of results)
[
  {
    "serviceName": "ABC Wager",
    "stake": 50,
    "msg": "Bet placed successfully"
  },
  {
    "serviceName": "Action",
    "stake": 50,
    "msg": "Bet placed successfully"
  }
]
```

---

### How To Maintain Consistency

#### Rule 1: Never Change API Response Structure Without Communication
- If you need to add a field, ADD it (don't remove existing ones)
- If you need to change a field name, tell Jacob first
- Document any changes in this file

#### Rule 2: Use TypeScript Interfaces
Both frontend and backend should use matching interfaces:

```typescript
// Shared interface - both sides must match
interface BetEvent {
  service: string;
  serviceName?: string;
  title: string;
  sport: string;
  desc: string;
  points: number;
  odds: number;
  order?: number;
}

interface BetResult {
  serviceName?: string;
  service?: string;
  stake?: number;
  message?: string;  
}
```

#### Rule 3: Error Responses Must Be Consistent
```json
{
  "error": true,
  "message": "Description of what went wrong"
}
```

#### Rule 4: Status Codes
- `200` - Success
- `400` - Bad request (client error)
- `401` - Unauthorized
- `404` - Not found
- `500` - Server error

---

### Communication Protocol

1. **Daily Updates**: Brief message about what you're working on
2. **API Changes**: Must be communicated 24 hours before implementation
3. **Bugs**: Report immediately with steps to reproduce
4. **Questions**: Don't guess - ask!

---

### Why This Division Works

- **Jacob** understands the clients and can build exactly what they need
- **Hanyc & Team** have the technical expertise for scraping and bet logic
- **Working in parallel** = **2x faster development**
- **Clear API contract** = No stepping on each other's work

---

### Priority Tasks

#### Backend (Hanyc & Team) - Immediate Priorities:
1. Add proxy integration for all 50 US States.
2. Player Props must be normalized in an easy way to read from the API. See Player_Props_Guide
3. Not sure if already integrated but API must return the account username of account bet and amount not just the service, pretty sure it alraedy does this.
4. Working with me to discuss best ways to improve user bet experience with live progress in the middle of each bet, and best prices listed at top and whether this will require API changes.
5. Fix any API endpoints returning inconsistent formats
6. Add proper error messages to all endpoints


#### Frontend (Jacob) - Immediate Priorities:
1. Complete Smart Bet Finder interface
2. Complete Prop Interface separate from Bet Finder (This will require Player Props to be categorized before response from API)
3. Improve payment flow UX
4. Build better account management displays
5. Mobile and Telegram optimization

---

## Українська Версія

### Огляд

Цей документ описує, як ми розділимо відповідальність між **фронтенд розробкою** (виконує Джейкоб за допомогою Claude AI) та **бекенд розробкою** (виконує Hanyc та його команда). Мета — **прискорити розробку**, працюючи паралельно, зберігаючи при цьому чистий, послідовний інтерфейс між нашою роботою.

---

### Архітектура Проекту

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WINWORKS AUTOMATION                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────┐      ┌─────────────────────────────┐  │
│  │   ФРОНТЕНД (Джейкоб)    │      │    БЕКЕНД (Hanyc & Team)    │  │
│  │    ─────────────────    │      │    ──────────────────────   │  │
│  │                         │      │                             │  │
│  │  • Next.js Дашборд      │ API  │  • Сервіси ставок           │  │
│  │  • React Компоненти     │◄────►│  • Скрапінг коефіцієнтів    │  │
│  │  • Інтерфейс            │      │  • Логіка розміщення ставок │  │
│  │  • Сторінки оплати      │      │  • Управління акаунтами     │  │
│  │  • UI автентифікації    │      │  • Обробка даних            │  │
│  │                         │      │                             │  │
│  └─────────────────────────┘      └─────────────────────────────┘  │
│              │                                  │                   │
│              │         ┌────────────┐           │                   │
│              └────────►│  JSON API  │◄──────────┘                   │
│                        │  Контракт  │                               │
│                        └────────────┘                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Розподіл Відповідальності

#### Відповідальність Джейкоба (Фронтенд + Клієнтський досвід)

| Область | Опис |
|---------|------|
| **UI Дашборду** | Весь візуальний дизайн, макет, користувацькі потоки |
| **React Компоненти** | Створення та стилізація всіх UI компонентів |
| **Автентифікація** | Сторінки входу/реєстрації, UI обробки сесій |
| **Інтеграція платежів** | Сторінки крипто-платежів, відображення транзакцій |
| **Комунікація з клієнтами** | Розуміння потреб клієнтів та перетворення їх у функції |
| **UI Smart Bet Finder** | Інтерфейс пошуку, фільтри, форми розміщення ставок |
| **Мобільна адаптивність** | Забезпечення роботи на всіх пристроях |

#### Відповідальність Hanyc та Команди (Бекенд + Дані)

| Область | Опис |
|---------|------|
| **Сервіси ставок** | Вся логіка скрапінгу для кожної букмекерської контори |
| **Обробка коефіцієнтів** | Нормалізація даних коефіцієнтів, розрахунок найкращих цін |
| **Розміщення ставок** | API логіка для розміщення ставок на різних майданчиках |
| **Управління акаунтами** | Бекенд логіка управління акаунтами для ставок |
| **API Endpoints** | Створення та підтримка всіх `/api/` маршрутів |
| **Зберігання даних** | Управління JSON файлами, кешування, збереження даних |
| **Обробка помилок** | Забезпечення надійної обробки помилок та логування |
| **Здоров'я серверів** | Підтримка роботи серверів 8088/8089 |

---

### API Контракт - КРИТИЧНО ДЛЯ КОНСИСТЕНТНОСТІ

**API — це наш контракт.** Поки обидві сторони поважають структуру API, ми можемо працювати незалежно.

#### Поточні API Endpoints (Бекенд повинен підтримувати)

```
GET  /api/general/skins          → Повертає список сервісів ставок
GET  /api/general/teams?search=  → Пошук команд/подій
POST /api/general/bet            → Розміщення ставок
POST /api/general/prebet         → Парсинг сигналу ставки
POST /api/general/confirmbet     → Підтвердження та розміщення ставки
GET  /api/general/history        → Отримання історії ставок
POST /api/general/account/create → Створення нового акаунту
POST /api/general/account/update → Оновлення акаунту
PUT  /api/general/account/delete → Видалення акаунту
GET  /api/general/account        → Список всіх акаунтів
```

#### Очікувані формати відповідей

**GET /api/general/teams?search={query}**
```json
[
  {
    "service": "abcwager",
    "serviceName": "ABC Wager",
    "title": "Patriots ML",
    "sport": "NFL",
    "desc": "Full Game",
    "points": 0,
    "odds": -110,
    "order": 1
  }
]
```

**POST /api/general/bet**
```json
// Запит
{
  "betSlip": { "title": "Patriots ML" },
  "amount": 100,
  "pointTolerance": 0.5,
  "oddsTolerance": 10,
  "confirmMode": false,
  "filterEventsList": [...]
}

// Відповідь (масив результатів)
[
  {
    "serviceName": "ABC Wager",
    "stake": 50,
    "msg": "Ставку розміщено успішно"
  },
  {
    "serviceName": "Action",
    "stake": 50,
    "msg": "Ставку розміщено успішно"
  }
]
```

---

### Як Підтримувати Консистентність

#### Правило 1: Ніколи не змінюйте структуру відповіді API без комунікації
- Якщо потрібно додати поле, ДОДАЙТЕ його (не видаляйте існуючі)
- Якщо потрібно змінити назву поля, спочатку повідомте Джейкоба
- Документуйте будь-які зміни в цьому файлі

#### Правило 2: Використовуйте TypeScript Інтерфейси
І фронтенд, і бекенд повинні використовувати однакові інтерфейси:

```typescript
// Спільний інтерфейс - обидві сторони повинні відповідати
interface BetEvent {
  service: string;
  serviceName?: string;
  title: string;
  sport: string;
  desc: string;
  points: number;
  odds: number;
  order?: number;
}

interface BetResult {
  serviceName?: string;
  service?: string;
  stake?: number;
  msg?: string;
  message?: string;
}
```

#### Правило 3: Відповіді про помилки повинні бути консистентними
```json
{
  "error": true,
  "message": "Опис того, що пішло не так"
}
```

#### Правило 4: Статус коди
- `200` - Успіх
- `400` - Поганий запит (помилка клієнта)
- `401` - Не авторизовано
- `404` - Не знайдено
- `500` - Помилка сервера

---

### Протокол Комунікації

1. **Щоденні оновлення**: Коротке повідомлення про те, над чим працюєте
2. **Зміни API**: Повинні бути повідомлені за 24 години до впровадження
3. **Баги**: Повідомляйте негайно з кроками для відтворення
4. **Питання**: Не здогадуйтесь - питайте!

---

### Чому Цей Розподіл Працює

- **Джейкоб** розуміє клієнтів і може побудувати саме те, що їм потрібно
- **Hanyc та команда** мають технічну експертизу для скрапінгу та логіки ставок
- **Паралельна робота** = **2x швидша розробка**
- **Чіткий API контракт** = Не заважаємо роботі один одного

---

### Пріоритетні Завдання

#### Бекенд (Hanyc та Команда) - Негайні пріоритети:
1. Переконатися, що всі сервіси скрапінгу здорові та повертають консистентні дані
2. Виправити будь-які API endpoints, що повертають неконсистентні формати
3. Додати правильні повідомлення про помилки до всіх endpoints
4. Задокументувати будь-які специфічні особливості сервісів

#### Фронтенд (Джейкоб) - Негайні пріоритети:
1. Завершити інтерфейс Smart Bet Finder
2. Покращити UX потоку оплати
3. Побудувати кращі дисплеї управління акаунтами
4. Мобільна оптимізація

---

## Quick Reference / Швидкий Довідник

| English | Українська |
|---------|------------|
| Frontend | Фронтенд |
| Backend | Бекенд |
| API Endpoint | API Endpoint (маршрут) |
| Request | Запит |
| Response | Відповідь |
| Scraping | Скрапінг |
| Odds | Коефіцієнти |
| Bet placement | Розміщення ставок |
| Account management | Управління акаунтами |
| Error handling | Обробка помилок |
| Data storage | Зберігання даних |

---

## Data Normalization System / Система Нормалізації Даних

### How Scraping Stays Consistent (English)

The system uses three key files to normalize data from different sportsbooks into a consistent format:

#### 1. Period Normalization (`constants/periods.json`)

All period variations are mapped to standardized keys:

| Key | Variations Accepted |
|-----|---------------------|
| `ft` | "full time", "game lines", "ft" |
| `1h` | "1st half", "1hal", "1h", "first half" |
| `2h` | "2nd half", "2hal", "2h", "second half" |
| `1q` | "1st quarter", "1qtr", "1q" |
| `2q` | "2nd quarter", "2qtr", "2q" |
| `3q` | "3rd quarter", "3qtr", "3q" |
| `4q` | "4th quarter", "4qtr", "4q" |

#### 2. Team Name Normalization (`constants/aliases.json`)

Each team has multiple aliases mapped to one canonical name:
```
"New England Patriots" ← ["Patriots", "NE", "New England", "Pats", "NEP"]
```

#### 3. League Normalization (`utils/utils.js`)

Sports are normalized to standard codes:
- `NFL` ← "national football league"
- `CFB` ← "college football", "ncaa football", "ncaaf"
- `NBA` ← "national basketball association"
- `CBB` ← "college basketball", "ncaab"
- `MLB` ← "major league baseball"
- `NHL` ← "national hockey league"

#### Standard Output Format

All scraped data MUST output in this format:

```
{period} {market} {points}

Examples:
- "FT O 45.5"      → Full Time Over 45.5
- "FT U 45.5"      → Full Time Under 45.5
- "FT spread -3.5" → Full Time Spread -3.5
- "FT ML"          → Full Time Moneyline
- "1H O 21.5"      → 1st Half Over 21.5
- "1H U 21.5"      → 1st Half Under 21.5
- "1H spread -1.5" → 1st Half Spread -1.5
- "1Q O 10.5"      → 1st Quarter Over 10.5
```

#### Rules for Backend Team:

1. **Always use `getPeriod()` function** to normalize period names
2. **Always use `teamNameCleaner()` function** before storing team names
3. **Always use `getFullName()` function** to get canonical team names
4. **When adding new sportsbooks**, add any new period variations to `periods.json`
5. **When teams have new nicknames**, add them to `aliases.json`

---

### Як Скрапінг Залишається Консистентним (Українська)

Система використовує три ключові файли для нормалізації даних з різних букмекерів у консистентний формат:

#### 1. Нормалізація Періодів (`constants/periods.json`)

Всі варіації періодів мапляться на стандартизовані ключі:

| Ключ | Прийняті Варіації |
|------|-------------------|
| `ft` | "full time", "game lines", "ft" |
| `1h` | "1st half", "1hal", "1h", "first half" |
| `2h` | "2nd half", "2hal", "2h", "second half" |
| `1q` | "1st quarter", "1qtr", "1q" |

#### 2. Нормалізація Назв Команд (`constants/aliases.json`)

Кожна команда має множинні псевдоніми, які мапляться на одну канонічну назву.

#### 3. Стандартний Формат Виходу

Всі зіскрейплені дані ПОВИННІ виводитись у цьому форматі:

```
{період} {ринок} {очки}

Приклади:
- "FT O 45.5"      → Повний Час Овер 45.5
- "FT U 45.5"      → Повний Час Андер 45.5
- "FT spread -3.5" → Повний Час Спред -3.5
- "1H O 21.5"      → 1-а Половина Овер 21.5
```

#### Правила для Бекенд Команди:

1. **Завжди використовуйте функцію `getPeriod()`** для нормалізації назв періодів
2. **Завжди використовуйте функцію `teamNameCleaner()`** перед збереженням назв команд
3. **Завжди використовуйте функцію `getFullName()`** для отримання канонічних назв команд
4. **При додаванні нових букмекерів**, додавайте нові варіації періодів до `periods.json`
5. **При появі нових псевдонімів команд**, додавайте їх до `aliases.json`

---

## Player Props Detection / Виявлення Пропсів Гравців

### Current Issue / Поточна Проблема

**Current method** only checks for "player props" in description:
```javascript
let is_props = new RegExp("player props", "i").test(desc);
```

**Problem:** Misses props if sportsbook labels them differently.

---

### Recommended Improvement / Рекомендоване Покращення

Detect props by checking for **prop-specific keywords** and **standalone abbreviations**:

#### Keywords (Only Found in Props, Never Game Lines)

| Sport | Full Keywords |
|-------|---------------|
| NFL | passing yards, rushing yards, receiving yards, receptions, touchdowns, completions |
| NBA | points, rebounds, assists, steals, blocks, 3-pointers, turnovers |
| MLB | hits, home runs, RBI, strikeouts, innings pitched, total bases |
| NHL | goals, shots on goal, saves, assists (player), blocked shots |

#### Standalone Abbreviations (Use Word Boundaries `\b`)

| Sport | Abbreviations |
|-------|---------------|
| NFL | `\bYDS\b`, `\bTDS\b`, `\bREC\b`, `\bATTS\b`, `\bCMPS\b`, `\bINT\b`, `\bRSH\b` |
| NBA | `\bPTS\b`, `\bREB\b`, `\bAST\b`, `\bSTL\b`, `\bBLK\b`, `\bPRA\b`, `\b3PM\b`, `\bFGM\b` |
| MLB | `\bHR\b`, `\bRBI\b`, `\bTB\b`, `\bSO\b`, `\bBB\b`, `\bSB\b`, `\bIP\b`, `\bER\b` |
| NHL | `\bSOG\b`, `\bPPP\b`, `\bTOI\b`, `\bFOW\b`, `\bSV\b`, `\bGA\b` |

**Why word boundaries are critical:**
```javascript
/\bPTS\b/i.test("LeBron PTS")  // true  - IS a prop
/\bPTS\b/i.test("Patriots")    // false - NOT a prop (PTS inside word)
/PTS/i.test("Patriots")        // true  - FALSE POSITIVE!
```

#### Implementation for `utils/utils.js`

```javascript
const PROP_ABBREVIATIONS = {
  NFL: ['YDS', 'TDS', 'REC', 'ATTS', 'CMPS', 'INT', 'RSH', 'RECV'],
  NBA: ['PTS', 'REB', 'AST', 'ASSTS', 'STL', 'BLK', 'PRA', '3PM', 'FGM', 'FTM'],
  MLB: ['HR', 'RBI', 'TB', 'SO', 'BB', 'SB', 'IP', 'ER', 'QS'],
  NHL: ['SOG', 'PPP', 'TOI', 'FOW', 'SV', 'GA']
};

exports.isPlayerProp = (sport, content) => {
  content = content.toLowerCase();

  // Check full keywords from props.json
  const props = require("./constants/props.json")[sport] || [];
  const keywords = props.flat().map(k => k.toLowerCase());
  if (keywords.some(kw => content.includes(kw))) return true;

  // Check standalone abbreviations with word boundaries
  const abbrevs = PROP_ABBREVIATIONS[sport] || [];
  const abbrevPattern = new RegExp(`\\b(${abbrevs.join('|')})\\b`, 'i');
  return abbrevPattern.test(content);
};
```

#### Usage in Services

```javascript
// Replace this:
let is_props = new RegExp("player props", "i").test(desc);

// With this:
let is_props = isPlayerProp(sport, team1 + " " + team2) ||
               /player props/i.test(desc);
```

---

**Document Version**: 1.1
**Last Updated**: December 19, 2024
**Authors**: Jacob
**Project Owner**: Jacob
**Funder**: Tony
**Backend Team**: Hanyc & Ukrainian Development Team
