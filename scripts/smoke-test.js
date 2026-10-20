// Smoke-тест всего API на in-memory MongoDB (mongodb-memory-server).
// Запуск: npm run smoke
// Проверяет реализованные маршруты и заглушки будущих (501).
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

const BASE = `http://127.0.0.1:${process.env.PORT || 4141}`;
let failed = 0;

const check = (name, cond, extra = '') => {
  if (cond) {
    console.log(`PASS: ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL: ${name} ${extra}`);
  }
};

const req = async (method, urlPath, { body, token } = {}) => {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
};

const main = async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('steam');
  process.env.JWT_SECRET = 'smoke_test_secret';
  process.env.PORT = process.env.PORT || '4141';

  require(path.join(__dirname, '..', 'src', 'server.js'));

  // Ждём, пока сервер начнёт отвечать
  let ready = false;
  for (let i = 0; i < 60 && !ready; i += 1) {
    try {
      await fetch(`${BASE}/api/cases`);
      ready = true;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (!ready) throw new Error('Server did not start');

  const User = require(path.join(__dirname, '..', 'src', 'models', 'users.model'));
  const Skin = require(path.join(__dirname, '..', 'src', 'models', 'skins.model'));
  const Case = require(path.join(__dirname, '..', 'src', 'models', 'cases.model'));
  const Inventory = require(path.join(__dirname, '..', 'src', 'models', 'inventory.model'));
  const Transaction = require(path.join(__dirname, '..', 'src', 'models', 'transactions.model'));

  // --- Cases: чтение
  let r = await req('GET', '/api/cases');
  check('GET /api/cases пустой список', r.status === 200 && Array.isArray(r.data));

  // --- Users: регистрация
  r = await req('POST', '/api/users/register', {
    body: { username: 'alice', email: 'alice@test.dev', password: 'secret123' },
  });
  check(
    'POST /api/users/register создаёт пользователя и токен',
    r.status === 201 && r.data.token && r.data.user && r.data.user.username === 'alice'
  );
  let token = r.data.token;
  check('register не возвращает пароль', !JSON.stringify(r.data).includes('secret123') && !JSON.stringify(r.data).includes('password'));

  r = await req('POST', '/api/users/register', {
    body: { username: 'alice', email: 'alice@test.dev', password: 'secret123' },
  });
  check('дубликат регистрации → 409', r.status === 409);

  // --- Users: логин
  r = await req('POST', '/api/users/login', { body: { email: 'alice@test.dev', password: 'wrong' } });
  check('login с неверным паролем → 401', r.status === 401);

  r = await req('POST', '/api/users/login', { body: { email: 'alice@test.dev', password: 'secret123' } });
  check('login с верным паролем → 200 + токен', r.status === 200 && r.data.token);
  token = r.data.token;

  const dbUser = await User.findOne({ email: 'alice@test.dev' }).select('+password');
  check('в базе пароль хранится хешем (не как открытый текст)', dbUser.password !== 'secret123' && dbUser.password.length > 20);

  // --- Wallet / inventory без токена
  r = await req('GET', '/api/wallet');
  check('GET /api/wallet без токена → 401', r.status === 401);
  r = await req('GET', '/api/inventory');
  check('GET /api/inventory без токена → 401', r.status === 401);

  // --- Wallet / inventory с токеном
  r = await req('GET', '/api/wallet', { token });
  check('GET /api/wallet с токеном → баланс 0', r.status === 200 && r.data.balance === 0);

  r = await req('GET', '/api/inventory', { token });
  check('GET /api/inventory пустой', r.status === 200 && r.data.count === 0);

  // --- Users: права
  r = await req('GET', '/api/users', { token });
  check('GET /api/users без прав админа → 403', r.status === 403);

  // Награждаем alice правами админа и логинимся заново
  await User.updateOne({ email: 'alice@test.dev' }, { $set: { role: 'admin' } });
  r = await req('POST', '/api/users/login', { body: { email: 'alice@test.dev', password: 'secret123' } });
  const adminToken = r.data.token;
  check('login возвращает роль admin', r.data.user.role === 'admin');

  r = await req('GET', '/api/users', { token: adminToken });
  check('GET /api/users админом → список', r.status === 200 && Array.isArray(r.data));

  r = await req('GET', `/api/users/${dbUser._id}`, { token: adminToken });
  check('GET /api/users/:id админом', r.status === 200 && r.data.email === 'alice@test.dev');

  r = await req('PUT', `/api/users/${dbUser._id}`, { token: adminToken, body: { balance: 1000, username: 'alice2' } });
  check('PUT /api/users/:id админом (role+balance)', r.status === 200 && r.data.balance === 1000 && r.data.username === 'alice2');

  // Обычный пользователь не может менять баланс
  r = await req('POST', '/api/users/register', {
    body: { username: 'bob', email: 'bob@test.dev', password: 'secret123' },
  });
  const bobToken = r.data.token;
  const bob = await User.findOne({ email: 'bob@test.dev' });
  r = await req('PUT', `/api/users/${bob._id}`, { token: bobToken, body: { balance: 999999, role: 'admin' } });
  const bobAfter = await User.findById(bob._id);
  check('обычный пользователь не меняет balance/role', bobAfter.balance === 0 && bobAfter.role === 'user');

  r = await req('DELETE', `/api/users/${bob._id}`, { token: bobToken });
  check('DELETE /api/users/:id обычным юзером → 403', r.status === 403);

  // --- Uploads (Cloudinary): проверка доступа (без реальной загрузки)
  r = await req('POST', '/api/uploads');
  check('POST /api/uploads без токена → 401', r.status === 401);
  r = await req('POST', '/api/uploads', { token: bobToken });
  check('POST /api/uploads без прав админа → 403', r.status === 403);
  r = await req('DELETE', '/api/uploads/cs2-skin-store%2Ftest', { token: bobToken });
  check('DELETE /api/uploads без прав админа → 403', r.status === 403);
  r = await req('DELETE', `/api/users/${bob._id}`, { token: adminToken });
  check('DELETE /api/users/:id админом', r.status === 200);

  // --- Skin + Case
  r = await req('POST', '/api/skins', {
    body: {
      skinName: 'Asiimov',
      weapon: 'AK-47',
      skinRarity: 'Covert',
      skinPrice: 250,
      condition: 'Field-Tested',
      floatValue: 0.3,
    },
  });
  check('POST /api/skins', r.status === 201);
  const skinId = r.data._id;

  // Невалидная сумма вероятностей
  r = await req('POST', '/api/cases', {
    token: adminToken,
    body: {
      name: 'Broken Case',
      price: 100,
      items: [{ skin: skinId, probability: 90 }],
    },
  });
  check('сумма вероятностей != 100 → 400', r.status === 400);

  r = await req('POST', '/api/cases', {
    token: adminToken,
    body: {
      name: 'Weapon Case',
      price: 100,
      items: [{ skin: skinId, probability: 100 }],
    },
  });
  check('POST /api/cases (админ)', r.status === 201);
  const caseId = r.data._id;

  r = await req('GET', '/api/cases');
  check('GET /api/cases возвращает кейс со скином', r.status === 200 && r.data.length === 1 && r.data[0].items[0].skin.skinName === 'Asiimov');

  r = await req('GET', `/api/cases/${caseId}`);
  check('GET /api/cases/:id', r.status === 200 && r.data.name === 'Weapon Case');

  // --- Будущие маршруты: заглушки 501
  r = await req('POST', `/api/cases/${caseId}/open`, { token });
  check('POST /api/cases/:id/open → 501 (не реализовано)', r.status === 501);

  r = await req('POST', '/api/inventory/64b000000000000000000000/sell', { token });
  check('POST /api/inventory/:id/sell → 501 (не реализовано)', r.status === 501);

  // --- Inventory и Transaction как модели
  const inv = await Inventory.create({
    user: dbUser._id,
    skin: skinId,
    sourceCase: caseId,
    status: 'owned',
  });
  r = await req('GET', '/api/inventory', { token });
  check('GET /api/inventory после получения скина', r.status === 200 && r.data.count === 1 && r.data.items[0].skin.skinName === 'Asiimov');

  r = await req('GET', '/api/inventory?status=owned', { token });
  check('фильтр ?status=owned', r.status === 200 && r.data.count === 1);
  r = await req('GET', '/api/inventory?status=sold', { token });
  check('фильтр ?status=sold', r.status === 200 && r.data.count === 0);

  // Согласованность баланса в Transaction
  let txOk = true;
  try {
    await Transaction.create({
      user: dbUser._id,
      type: 'case_open',
      amount: 100,
      balanceBefore: 1000,
      balanceAfter: 950, // неверно: 1000 - 100 = 900
    });
    txOk = false;
  } catch (e) {
    txOk = true;
  }
  check('Transaction с несогласованным balanceAfter → ошибка валидации', txOk);

  const tx = await Transaction.create({
    user: dbUser._id,
    type: 'case_open',
    amount: 100,
    balanceBefore: 1000,
    balanceAfter: 900,
  });
  check('Transaction с корректными данными создаётся', !!tx._id);

  // enum типа операции
  let enumOk = true;
  try {
    await Transaction.create({
      user: dbUser._id,
      type: 'hack',
      amount: 100,
      balanceBefore: 0,
      balanceAfter: 100,
    });
    enumOk = false;
  } catch (e) {
    enumOk = true;
  }
  check('Transaction с невалидным типом → ошибка валидации', enumOk);

  // Статус inventory: sold
  inv.status = 'sold';
  await inv.save();
  r = await req('GET', '/api/inventory?status=sold', { token });
  check('статус inventory переключается на sold', r.status === 200 && r.data.count === 1);

  console.log(failed === 0 ? '\nALL CHECKS PASSED' : `\n${failed} CHECKS FAILED`);
  process.exit(failed === 0 ? 0 : 1);
};

main().catch((err) => {
  console.error('SMOKE TEST ERROR:', err);
  process.exit(1);
});
