const Skin = require('../models/skins.model');

// GET ALL
const getAllSkins = async (req, res) => {
  try {
    const skins = await Skin.find();
    res.status(200).json(skins);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET ONE BY ID
const getSkinById = async (req, res) => {
  try {
    const skin = await Skin.findById(req.params.id);
    if (!skin) {
      return res.status(404).json({ message: 'Skin not found' });
    }
    res.status(200).json(skin);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// CREATE
const createSkin = async (req, res) => {
  try {
    const skin = await Skin.create(req.body);
    res.status(201).json(skin);
  } catch (error) {
    res.status(400).json({ message: 'Error creating skin', error: error.message });
  }
};

// UPDATE
const updateSkin = async (req, res) => {
  try {
    const skin = await Skin.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!skin) {
      return res.status(404).json({ message: 'Skin not found' });
    }
    res.status(200).json(skin);
  } catch (error) {
    res.status(400).json({ message: 'Error updating skin', error: error.message });
  }
};

// DELETE
const deleteSkin = async (req, res) => {
  try {
    const skin = await Skin.findByIdAndDelete(req.params.id);
    if (!skin) {
      return res.status(404).json({ message: 'Skin not found' });
    }
    res.status(200).json({ message: 'Skin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// SEARCH: GET /api/skins/search?q=AK-47
const searchSkins = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Search query "q" is required' });
    }
    const skins = await Skin.find({
      $or: [
        { skinName: { $regex: q, $options: 'i' } },
        { weapon: { $regex: q, $options: 'i' } },
      ],
    });
    res.status(200).json(skins);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// FILTER: GET /api/skins/filter?rarity=Covert&condition=Factory%20New&minPrice=10&maxPrice=100
const filterSkins = async (req, res) => {
  try {
    const { rarity, condition, minPrice, maxPrice } = req.query;

    const query = {};

    if (rarity) query.skinRarity = rarity;
    if (condition) query.condition = condition;

    if (minPrice || maxPrice) {
      query.skinPrice = {};
      if (minPrice) query.skinPrice.$gte = Number(minPrice);
      if (maxPrice) query.skinPrice.$lte = Number(maxPrice);
    }

    const skins = await Skin.find(query);
    res.status(200).json(skins);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllSkins,
  getSkinById,
  createSkin,
  updateSkin,
  deleteSkin,
  searchSkins,
  filterSkins,
};
