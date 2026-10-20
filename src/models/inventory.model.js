const mongoose = require('mongoose');

// Каждый документ = отдельный экземпляр скина у конкретного пользователя:
// один и тот же Skin может выпасть пользователю несколько раз (из разных
// кейсов, в разное время), и каждый экземпляр продаётся/владеется отдельно.
const inventorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    skin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skin',
      required: true,
    },
    sourceCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
    },
    status: {
      type: String,
      enum: ['owned', 'sold'],
      default: 'owned',
    },
    obtainedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

module.exports = mongoose.model('Inventory', inventorySchema);
