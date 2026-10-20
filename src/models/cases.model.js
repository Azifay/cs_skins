const mongoose = require('mongoose');

// Отдельный поддокумент: скин и его шанс выпадения в кейсе (в процентах)
const caseItemSchema = new mongoose.Schema(
  {
    skin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skin',
      required: true,
    },
    probability: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const caseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    rarity: {
      type: String,
      required: true,
      enum: [
        'Consumer',
        'Industrial',
        'Mil-Spec',
        'Restricted',
        'Classified',
        'Covert',
        'Contraband',
      ],
    },
    image: {
      type: String,
    },
    description: {
      type: String,
    },
    items: {
      type: [caseItemSchema],
      required: true,
      validate: {
        validator: (items) => {
          if (!items || items.length === 0) return false;
          const sum = items.reduce((acc, item) => acc + item.probability, 0);
          return Math.abs(sum - 100) < 0.001;
        },
        message: 'Probabilities of all case items must sum to 100',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

module.exports = mongoose.model('Case', caseSchema);
