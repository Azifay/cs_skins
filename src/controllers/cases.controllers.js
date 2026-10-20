const Case = require('../models/cases.model');
const User = require('../models/users.model');
const Inventory = require('../models/inventory.model');
const Transaction = require('../models/transactions.model');

// GET /api/cases — список кейсов (публично)
const getAllCases = async (req, res) => {
  try {
    const cases = await Case.find().populate('items.skin');
    res.status(200).json(cases);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/cases/:id — информация о кейсе (публично)
const getCaseById = async (req, res) => {
  try {
    const singleCase = await Case.findById(req.params.id).populate('items.skin');
    if (!singleCase) {
      return res.status(404).json({ message: 'Case not found' });
    }
    res.status(200).json(singleCase);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/cases — создать кейс (админ)
const createCase = async (req, res) => {
  try {
    const singleCase = await Case.create(req.body);
    res.status(201).json(singleCase);
  } catch (error) {
    res.status(400).json({ message: 'Error creating case', error: error.message });
  }
};

// PUT /api/cases/:id — обновить кейс (админ)
const updateCase = async (req, res) => {
  try {
    const singleCase = await Case.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!singleCase) {
      return res.status(404).json({ message: 'Case not found' });
    }
    res.status(200).json(singleCase);
  } catch (error) {
    res.status(400).json({ message: 'Error updating case', error: error.message });
  }
};

// DELETE /api/cases/:id — удалить кейс (админ)
const deleteCase = async (req, res) => {
  try {
    const singleCase = await Case.findByIdAndDelete(req.params.id);
    if (!singleCase) {
      return res.status(404).json({ message: 'Case not found' });
    }
    res.status(200).json({ message: 'Case deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/cases/:id/open (нужен вход) — открытие кейса:
// 1) атомарно списываем цену кейса (если баланса не хватает — 400);
// 2) выбираем скин по вероятностям items[].probability (сумма = 100);
// 3) создаём запись Inventory (status: 'owned') и Transaction (case_open);
// при сбое на шаге 3/4 — компенсируем возвратом денег/откатом записи.
const openCase = async (req, res) => {
  try {
    const singleCase = await Case.findById(req.params.id);
    if (!singleCase) {
      return res.status(404).json({ message: 'Case not found' });
    }
    if (!singleCase.isActive) {
      return res.status(400).json({ message: 'Case is not active' });
    }
    if (!singleCase.items || singleCase.items.length === 0) {
      return res.status(400).json({ message: 'Case has no skins' });
    }

    const price = singleCase.price;

    // 1) атомарное списание: баланс обновляется только если хватает денег
    const user = await User.findOneAndUpdate(
      { _id: req.user._id, balance: { $gte: price } },
      { $inc: { balance: -price } },
      { new: true }
    );
    if (!user) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // 2) взвешенный случайный выбор по вероятностям
    const roll = Math.random() * 100;
    let acc = 0;
    let winnerId = singleCase.items[singleCase.items.length - 1].skin;
    for (const item of singleCase.items) {
      acc += item.probability;
      if (roll < acc) {
        winnerId = item.skin;
        break;
      }
    }

    // 3) запись в инвентарь (главный результат); при сбое — возврат денег
    let inventoryItem;
    try {
      inventoryItem = await Inventory.create({
        user: user._id,
        skin: winnerId,
        sourceCase: singleCase._id,
        status: 'owned',
      });
    } catch (error) {
      await User.updateOne({ _id: user._id }, { $inc: { balance: price } });
      return res
        .status(500)
        .json({ message: 'Error opening case', error: error.message });
    }

    // 4) история операции (deposit/case_open/skin_sale)
    try {
      await Transaction.create({
        user: user._id,
        type: 'case_open',
        amount: price,
        balanceBefore: user.balance + price,
        balanceAfter: user.balance,
      });
    } catch (error) {
      // компенсация: откатываем списание и инвентарь, чтобы не было
      // ни «денег без скина», ни «скина без записи в истории»
      await inventoryItem.deleteOne();
      await User.updateOne({ _id: user._id }, { $inc: { balance: price } });
      return res
        .status(500)
        .json({ message: 'Error opening case', error: error.message });
    }

    await inventoryItem.populate('skin');

    res.status(200).json({
      message: 'Case opened successfully',
      skin: inventoryItem.skin,
      inventoryItemId: inventoryItem._id,
      balance: user.balance,
      casePrice: price,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
  openCase,
};
