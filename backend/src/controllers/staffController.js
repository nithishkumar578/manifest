// backend/src/controllers/staffController.js
const User = require('../models/User');
const { Op } = require('sequelize');

// Get all staff members
exports.getAllStaff = async (req, res) => {
  try {
    const staff = await User.findAll({
      where: { role: 'staff' },
      attributes: ['id', 'name', 'email', 'phone', 'totalSales', 'totalEarnings']
    });
    res.json({ status: 'success', data: staff });
  } catch (err) {
    console.error('Error fetching staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a single staff by ID
exports.getStaffById = async (req, res) => {
  try {
    const staff = await User.findByPk(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.json(staff);
  } catch (err) {
    console.error('Error fetching staff by ID:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update staff details (admin use)
exports.updateStaff = async (req, res) => {
  try {
    const { name, email, phone, totalSales, totalEarnings } = req.body;
    const staff = await User.findByPk(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    staff.name = name || staff.name;
    staff.email = email || staff.email;
    staff.phone = phone || staff.phone;
    staff.totalSales = totalSales || staff.totalSales;
    staff.totalEarnings = totalEarnings || staff.totalEarnings;

    await staff.save();
    res.json({ message: 'Staff updated successfully', staff });
  } catch (err) {
    console.error('Error updating staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete staff
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await User.findByPk(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    await staff.destroy();
    res.json({ message: 'Staff deleted successfully' });
  } catch (err) {
    console.error('Error deleting staff:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
