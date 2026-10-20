const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['deposit', 'case_open', 'skin_sale'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    validateBeforeSave: true,
  }
);

// Ограничение согласованности: balanceAfter должен совпадать с
// balanceBefore с учётом типа операции (с небольшим допуском на погрешность
// арифметии с плавающей точкой).
transactionSchema.path('balanceAfter').validate(function (value) {
  const eps = 0.001;
  if (this.type === 'case_open') {
    return Math.abs(value - (this.balanceBefore - this.amount)) < eps;
  }
  // deposit и skin_sale пополняют баланс
  return Math.abs(value - (this.balanceBefore + this.amount)) < eps;
}, 'balanceAfter must be consistent with balanceBefore, amount and type');

module.exports = mongoose.model('Transaction', transactionSchema);
