const User = require('../models/users.model');
const Transaction = require('../models/transactions.model');

// GET /api/wallet — баланс текущего пользователя
const getWallet = async (req, res) => {
  try {
    res.status(200).json({
      userId: req.user._id,
      username: req.user.username,
      balance: req.user.balance,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/wallet/recharge { amount } — пополнение кошелька.
// Атомарно инкрементируем баланс и пишем Transaction (deposit);
// при сбое записи истории — откатываем пополнение (500).
const recharge = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ message: 'amount must be a positive number' });
    }
    if (amount > 1_000_000) {
      return res
        .status(400)
        .json({ message: 'amount must not exceed 1000000' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $inc: { balance: amount } },
      { new: true }
    );

    let transaction;
    try {
      transaction = await Transaction.create({
        user: user._id,
        type: 'deposit',
        amount,
        balanceBefore: user.balance - amount,
        balanceAfter: user.balance,
      });
    } catch (error) {
      await User.updateOne({ _id: user._id }, { $inc: { balance: -amount } });
      return res
        .status(500)
        .json({ message: 'Error recharging wallet', error: error.message });
    }

    res.status(200).json({
      message: 'Wallet recharged successfully',
      balance: user.balance,
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/wallet/history — recharge-history текущего пользователя:
// все операции (deposit / case_open / skin_sale), новые сверху
const getHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getWallet,
  recharge,
  getHistory,
};
