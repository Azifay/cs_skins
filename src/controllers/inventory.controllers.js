const Inventory = require('../models/inventory.model');
const User = require('../models/users.model');
const Transaction = require('../models/transactions.model');

// GET /api/inventory — инвентарь текущего пользователя.
// Параметр ?status=owned|sold фильтрует по статусу (по умолчанию — все).
const getMyInventory = async (req, res) => {
  try {
    const query = { user: req.user._id };
    if (req.query.status) {
      query.status = req.query.status;
    }

    const items = await Inventory.find(query)
      .populate('skin')
      .populate('sourceCase', 'name price');

    res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/inventory/:id/sell — продажа своего скина:
// 1) проверяем владельца и статус 'owned';
// 2) помечаем item как 'sold' (атомарно, только если ещё не продан);
// 3) зачисляем цену скина на баланс и пишем Transaction (skin_sale);
// при сбое записи истории — откатываем статус и баланс.
const sellInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id).populate('skin');
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    if (String(item.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied: not your skin' });
    }
    if (item.status !== 'owned') {
      return res.status(400).json({ message: 'Skin is not owned anymore' });
    }
    if (!item.skin) {
      return res.status(400).json({ message: 'Skin data no longer exists' });
    }

    const price = item.skin.skinPrice;

    // атомарная смена статуса — защита от двойной продажи
    const sold = await Inventory.findOneAndUpdate(
      { _id: item._id, user: req.user._id, status: 'owned' },
      { status: 'sold' },
      { new: true }
    );
    if (!sold) {
      return res.status(400).json({ message: 'Skin is already sold' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $inc: { balance: price } },
      { new: true }
    );

    try {
      await Transaction.create({
        user: user._id,
        type: 'skin_sale',
        amount: price,
        balanceBefore: user.balance - price,
        balanceAfter: user.balance,
      });
    } catch (error) {
      // компенсация: возвращаем статус и снимаем зачисленные деньги
      await Inventory.updateOne(
        { _id: sold._id },
        { status: 'owned' }
      );
      await User.updateOne({ _id: user._id }, { $inc: { balance: -price } });
      return res
        .status(500)
        .json({ message: 'Error selling skin', error: error.message });
    }

    res.status(200).json({
      message: 'Skin sold successfully',
      earned: price,
      balance: user.balance,
      item: sold,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getMyInventory,
  sellInventoryItem,
};
