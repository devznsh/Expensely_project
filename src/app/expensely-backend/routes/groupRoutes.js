const express = require('express');
const router = express.Router();
const Group = require('../models/Group');

router.post('/', async (req, res) => {
  const { name, members, userId } = req.body;

  try {
    const newGroup = new Group({
      name,
      members,
      createdBy: userId,
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (err) {
    res.status(500).json({ message: 'Error creating group', error: err.message });
  }
});

router.get('/', async (req, res) => {
  const userId = req.query.userId;
  try {
    const groups = await Group.find({ members: userId });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching groups' });
  }
});

module.exports = router;
