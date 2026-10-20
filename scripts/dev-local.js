// Локальный запуск без установленной MongoDB: поднимает in-memory MongoDB
// (mongodb-memory-server) и стартует приложение на ней.
// Запуск: npm run dev:local
// Данные живут до перезапуска процесса.
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('steam');
  process.env.PORT = process.env.PORT || '4040';
  console.log(`In-memory MongoDB: ${mongod.getUri()}`);
  require(path.join(__dirname, '..', 'src', 'server.js'));
})().catch((err) => {
  console.error('Failed to start in-memory MongoDB:', err);
  process.exit(1);
});
