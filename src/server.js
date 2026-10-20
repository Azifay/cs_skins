require('dotenv').config();
const path = require('path');
const express = require('express');
const connectDB = require('./config/db');
const skinsRoutes = require('./routes/skins.routes');
const usersRoutes = require('./routes/users.routes');
const casesRoutes = require('./routes/cases.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const walletRoutes = require('./routes/wallet.routes');
const uploadsRoutes = require('./routes/uploads.routes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/skins', skinsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/uploads', uploadsRoutes);

const PORT = process.env.PORT || 4040;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
