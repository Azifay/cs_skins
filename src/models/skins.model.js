const mongoose = require('mongoose');

const skinSchema = new mongoose.Schema(
  {
    skinName: {
      type: String,
      required: true,
      trim: true,
    },
    weapon: {
      type: String,
      required: true,
      trim: true,
    },
    skinRarity: {
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
    skinPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    condition: {
      type: String,
      required: true,
      enum: [
        'Factory New',
        'Minimal Wear',
        'Field-Tested',
        'Well-Worn',
        'Battle-Scarred',
      ],
    },
    floatValue: {
      type: Number,
      min: 0,
      max: 1,
    },
    image: {
      type: String,
    },
    description: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

module.exports = mongoose.model('Skin', skinSchema);
