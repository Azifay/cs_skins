# CS2 Skin Store API

REST API площадки покупки/открытия кейсов со скинами CS2 на **Express + MongoDB + Mongoose**.

> Статус: рабочая версия. Регистрация, авторизация, телефон, кошелёк (баланс,
> пополнение и история), открытие кейсов со случайным скином и продажа скинов
> реализованы и покрыты e2e-проверками. Есть SPA-страницы: витрина, кейсы
> с анимацией открытия, личный кабинет и админ-замена картинок. Данные
> сидируются скриптом `scripts/seed.js`.

## Стек

- Node.js (CommonJS), Express 5
- MongoDB + Mongoose 9
- `bcryptjs` — хеширование паролей
- `jsonwebtoken` — JWT-авторизация
- `mongodb-memory-server` (dev) — smoke-тесты без установки MongoDB

## Структура проекта

```
src/
  config/db.js              — подключение к MongoDB
  config/cloudinary.js      — конфиг Cloudinary из CLOUDINARY_URL
  models/                   — модели данных
    users.model.js
    skins.model.js
    cases.model.js
    inventory.model.js
    transactions.model.js
  controllers/              — бизнес-логика маршрутов
  routes/                   — маршруты Express
  middlewares/
    auth.middleware.js      — проверка JWT, кладёт пользователя в req.user
    admin.middleware.js     — пропускает только role === 'admin'
    upload.middleware.js    — multer: приём изображений (5 МБ, только картинки)
  server.js                 — точка входа
scripts/smoke-test.js       — самопроверка API на in-memory MongoDB
postman/                    — коллекция Postman-запросов
```

## Запуск проекта

1. **Требования:** Node.js 18+, MongoDB (локально или Atlas-кластер).

2. **Установка зависимостей:**

   ```bash
   npm install
   ```

3. **Настройка окружения:** скопируйте образец и заполните своими значениями.

   ```bash
   cp .env.example .env
   ```

   | Переменная     | Описание                                  |
   |----------------|-------------------------------------------|
   | `PORT`         | Порт сервера (по умолчанию 4040)          |
   | `MONGODB_URI`  | Строка подключения к MongoDB              |
   | `JWT_SECRET`   | Секретная строка для подписи JWT-токенов|   | `CLOUDINARY_URL` | доступы Cloudinary для загрузки изображений (`cloudinary://API_KEY:API_SECRET@CLOUD_NAME`); используются в `/api/uploads` |

   Файл `.env` входит в `.gitignore` и **не попадает в репозиторий**. В репозитории
   лежит только `.env.example` без реальных секретов.

4. **Запуск:**

   ```bash
   npm run dev       # разработка (nodemon, нужен доступ к MONGODB_URI)
   npm run dev:local # разработка на in-memory MongoDB (без установленной Mongo и без Atlas)
   npm start         # production
   ```

   Сервер: `http://localhost:4040`.

5. **(Опционально) Самопроверка без MongoDB** — запускает весь API на встроенной
   in-memory MongoDB и прогоняет 33 проверки маршрутов и моделей:

   ```bash
   npm run smoke
   ```

## Модели и связи

```
User 1 ──* Inventory * ──1 Skin
              │
              └──* Case            (sourceCase: из какого кейса выпал)

User 1 ──* Transaction             (deposit | case_open | skin_sale)

Case 1 ──* CaseItem { skin: → Skin, probability: 0..100, сумма = 100 }
```

- **User** — `username`, `email` (уникальные), `password` (хеш bcrypt, `select: false`),
  `role` (`user`/`admin`), `balance` (для кошелька).
- **Skin** — характеристики скина: название, оружие, редкость, цена, состояние, float.
- **Case** — кейс с ценой и списком `items`: скин + вероятность выпадения в процентах.
  Схема проверяет, что **сумма вероятностей всех элементов равна 100**.
- **Inventory** — **отдельный документ на каждый полученный экземпляр скина**:
  `user` → User, `skin` → Skin, `sourceCase` → Case, `status` (`owned`/`sold`),
  `at`.
- **Transaction** — запись каждой операции с деньгами: `type`
  (`deposit`/`case_open`/`skin_sale`), `amount`, `balanceBefore`, `balanceAfter`.
  Схема проверяет согласованность: `balanceAfter = balanceBefore ± amount`
  в зависимости от типа операции.

### Почему у Inventory отдельный документ на каждый экземпляр, а не массив названий скинов у пользователя?

1. **Одинаковые скины.** Из одного кейса может выпасть один и тот же скин несколько
   раз. В массиве названий эти случаи слить бы в один, а в коллекции Inventory это
   два независимых документа.
2. **Индивидуальный статус.** У каждого экземпляра свой `status`: можно продать одну
   Asiimov, оставив вторую. В массиве названий статус был бы у всего «названия» сразу.
3. **История и аудит.** `obtainedAt` и `sourceCase` отвечают на вопросы «когда получено»
   и «из какого кейса выпало» — это основа для статистики и разбора спорных ситуаций.
4. **Продажа конкретного экземпляра.** У продажи должен быть свой объект
   (`POST /api/inventory/:id/sell`). У строки в массиве названий нет `_id`,
   поэтому продать «именно эту» выпавшую вещь невозможно.
5. **Масштабирование.** Массив названий раздувал бы документ пользователя и превращал
   каждый просмотр инвентаря в чтение всего профиля; отдельная коллекция с индексом
   по `user` отдаёт инвентарь одним запросом.

## Реализованные маршруты

| Метод  | Путь                       | Доступ | Описание                          |
|--------|----------------------------|--------|-----------------------------------|
| POST   | `/api/users/register`      | публичный | Регистрация, возвращает JWT     |
| POST   | `/api/users/login`         | публичный | Логин, возвращает JWT           |
| GET    | `/api/users`               | админ  | Список пользователей             |
| GET    | `/api/users/:id`           | свой/админ | Пользователь по id            |
| PUT    | `/api/users/:id`           | свой/админ | Обновление (role/balance — админ) |
| DELETE | `/api/users/:id`           | админ  | Удаление пользователя            |
| GET    | `/api/skins`               | публичный | Список скинов                   |
| GET    | `/api/skins/search?q=`     | публичный | Поиск по имени/оружию          |
| GET    | `/api/skins/filter?...`    | публичный | Фильтр по редкости/состоянию/цене |
| GET    | `/api/skins/:id`           | публичный | Скин по id                      |
| POST   | `/api/skins`               | публичный | Создание скина                  |
| PUT    | `/api/skins/:id`           | публичный | Обновление скина                |
| DELETE | `/api/skins/:id`           | публичный | Удаление скина                  |
| GET    | `/api/cases`               | публичный | Список кейсов (скины внутри)    |
| GET    | `/api/cases/:id`           | публичный | Кейс по id                       |
| POST   | `/api/cases`               | админ  | Создание кейса                   |
| PUT    | `/api/cases/:id`           | админ  | Обновление кейса                 |
| DELETE | `/api/cases/:id`           | админ  | Удаление кейса                   |
| GET    | `/api/inventory`           | авторизация | Инвентарь текущего пользователя |
| GET    | `/api/wallet`              | авторизация | Баланс текущего пользователя   |
| GET    | `/api/uploads` (DELETE)    | админ  | Загрузка/удаление картинки в Cloudinary |
| PUT    | `/api/uploads/*publicId`   | админ  | Замена картинки **на том же public_id** (без нового файла) |
| POST   | `/api/cases/:id/open`      | авторизация | Открытие кейса: списание цены, случайный скин по вероятностям, Inventory + Transaction |
| POST   | `/api/inventory/:id/sell`  | авторизация | Продажа своего скина за `skinPrice` (зачисление на баланс) |
| POST   | `/api/wallet/recharge`     | авторизация | Пополнение кошелька (`{ amount }`) |
| GET    | `/api/wallet/history`      | авторизация | История операций (recharge-history): deposit/case_open/skin_sale |

Формат JWT-авторизации: заголовок `Authorization: Bearer <token>`.

## Загрузка изображений (Cloudinary)

Скины и кейсы хранят в поле `image` URL картинки. Чтобы получить URL:

1. Требуется переменная окружения `CLOUDINARY_URL` (достуты из панели Cloudinary).
2. `POST /api/uploads` (только админ) — запрос `multipart/form-data` с полем
   `image` (файл-картинка, до 5 МБ; jpeg/png/webp/gif/bmp).
3. Ответ `201`:

```json
{
  "message": "Image uploaded successfully",
  "url": "https://res.cloudinary.com/<cloud>/image/upload/v123/cs2-skin-store/ab12.png",
  "publicId": "cs2-skin-store/ab12.png"
}
```

4. URL подставляется в `image` при создании/обновлении скина или кейса.
5. `DELETE /api/uploads/<publicId>` (админ) — удаляет картинку из облака
   (`publicId` передаётся URL-encoded, например `cs2-skin-store%2Fab12.png`).

## Часть 9. API следующего этапа (описание маршрутов)

Ниже — контракты маршрутов. Два последних уже «подвешены» и возвращают
`501 Not Implemented`; остальные реализованы как простое чтение без бизнес-логики.

### GET /api/cases — список кейсов

- **Авторизация:** не требуется.
- **Запрос:** без тела и параметров.
- **Ответ `200`:** массив кейсов, внутри `items` уже подставлены объекты скинов:

```json
[
  {
    "_id": "652f1c...",
    "name": "Weapon Case",
    "price": 100,
    "items": [
      {
        "skin": { "_id": "652f0a...", "skinName": "Asiimov", "weapon": "AK-47", "skinPrice": 250, "...": "..." },
        "probability": 100
      }
    ],
    "isActive": true,
    "createdAt": "2026-10-17T12:00:00.000Z"
  }
]
```

### GET /api/cases/:id — информация о кейсе

- **Авторизация:** не требуется.
- **Параметры:** `id` — ObjectId кейса.
- **Ответ `200`:** объект кейса (как выше). `404` — кейс не найден.

### POST /api/cases/:id/open — открытие кейса *(будущий, сейчас 501)*

- **Авторизация:** обязательна (Bearer-токен).
- **Параметры:** `id` — ObjectId кейса.
- **Запрос:** тело не требуется (кейс и его цена известны серверу).
- **Логика (следующий этап):** проверить баланс ≥ цены кейса → списать `price`
  (баланс уменьшается) → выбрать скин по вероятностям из `items` → создать документ
  `Inventory` (`status: 'owned'`, `sourceCase: этот кейс`) → создать
  `Transaction` (`type: 'case_open'`, `balanceBefore`, `balanceAfter`).
- **Ответ `200` (план):**

```json
{
  "message": "Case opened successfully",
  "item": {
    "_id": "6530ab...",
    "skin": { "skinName": "Asiimov", "weapon": "AK-47", "...": "..." },
    "sourceCase": "652f1c...",
    "status": "owned",
    "obtainedAt": "2026-10-17T12:05:00.000Z"
  },
  "balanceAfter": 900
}
```

  Ошибки: `400` — недостаточно средств; `404` — кейс не найден; `501` — пока не реализовано.

### GET /api/inventory — инвентарь текущего пользователя

- **Авторизация:** обязательна.
- **Параметры query (опционально):** `status=owned` или `status=sold`.
- **Ответ `200`:**

```json
{
  "count": 2,
  "items": [
    {
      "_id": "6530ab...",
      "user": "652f01...",
      "skin": { "...": "объект скина, populate" },
      "sourceCase": { "_id": "652f1c...", "name": "Weapon Case", "price": 100 },
      "status": "owned",
      "obtainedAt": "2026-10-17T12:05:00.000Z"
    }
  ]
}
```

### POST /api/inventory/:id/sell — продажа скина *(будущий, сейчас 501)*

- **Авторизация:** обязательна.
- **Параметры:** `id` — ObjectId экземпляра из инвентаря.
- **Запрос:** тело не требуется (цена берётся из `skin.skinPrice`).
- **Логика (следующий этап):** проверить, что экземпляр принадлежит текущему
  пользователю и имеет `status: 'owned'` → зачислить `skinPrice` на баланс →
  поставить `status: 'sold'` → создать `Transaction` (`type: 'skin_sale'`,
  `balanceBefore`, `balanceAfter`).
- **Ответ `200` (план):**

```json
{
  "message": "Skin sold successfully",
  "soldFor": 250,
  "balanceAfter": 1150
}
```

  Ошибки: `403` — чужой экземпляр; `409` — уже продан; `404` — не найден; `501` — пока не реализовано.

### GET /api/wallet — баланс пользователя

- **Авторизация:** обязательна.
- **Ответ `200`:**

```json
{
  "userId": "652f01...",
  "username": "alice",
  "balance": 1000
}
```

## Deploy to Render.com

Blueprint: **`render.yaml`** (runtime `node`, plan `free`, build `npm ci --omit=dev`,
start `npm start`, health check `/healthz`).

1. **Push to GitHub** — remote allaqachon bor: `git push origin <branch>`.
2. **Render Dashboard → New → Blueprint** → repo'ni tanlang — Render `render.yaml`ni
   o'zi o'qiydi.
3. So'ralgan 3 ta sirli o'zgaruvchini kiriting:

   | O'zgaruvchi     | Qanday qiymat                                      |
   |-----------------|----------------------------------------------------|
   | `MONGODB_URI`   | Atlas SRV URI (oxirida `/cs2_skin_store` bilan)     |
   | `JWT_SECRET`    | tasodifiy uzun satr (lokal `.env`dagi bilan bir xil bo'lishi shart emas) |
   | `CLOUDINARY_URL`| `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`        |

   `NODE_VERSION=20` oldindan belgilangan.
4. **Regionni** yaratingda tanlang (mas. `frankfurt`) — yaratgandan keyin
   o'zgartirib bo'lmaydi.
5. **Deploy** — tekshiruv: `GET /healthz` → `200`, sayt `https://<xizmat-nomi>.onrender.com`.

**Muhim eslatmalar:**

- `PORT` ni kiritmang — Render o'zi inject qiladi, `src/server.js`
  `process.env.PORT` ni o'qiydi (lokal `.env` bilan mos ishlaydi).
- `.env` gitignore'da; Render'da dashboard env-lari ishlatiladi (dotenv u yerda no-op).
- Ma'lumotlar: umumiy Atlas DB allaqachon `node scripts/seed.js` bilan
  seed qilingan (idempotent). Yangi bo'sh DB uchun shu buyruqni bir marta ishga tushiring.
- Free plan: dam olishda service uxladi — bo'sh qolgan keyin birinchi so'rov
  ~30–60 soniya kechikadi (cold start).
- Har bir push avtomatik redeploy qiladi (`autoDeployTrigger: commit`).

## Postman

Коллекция: [`postman/steam-api.postman_collection.json`](postman/steam-api.postman_collection.json).

Переменные коллекции:

- `baseUrl` — `http://localhost:4040`
- `token` — заполняется автоматически после `POST /api/users/register` и
  `POST /api/users/login` (ответ сохраняется в `{{token}}`).

Чтобы проверить админ-маршруты, сделайте пользователя админом в базе:

```js
db.users.updateOne({ email: 'your@email' }, { $set: { role: 'admin' } })
```

## Безопасность

- Пароли хранятся только в виде bcrypt-хеша (`select: false` — по умолчанию пароль
  не попадает в ответы).
- JWT подписывается секретом из `JWT_SECRET`; срок жизни — 1 день.
- `.env` не коммитится; для примера в репозитории лежит `.env.example`.
