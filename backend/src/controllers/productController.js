const Product = require('../models/Product');

exports.createProduct = async (req,res) => {
  try {
    const { name, price } = req.body;
    const p = await Product.create({ name, price });
    res.status(201).json(p);
  } catch(err){ console.error(err); res.status(500).json({message:'Server error'}); }
};

exports.listProducts = async (req,res) => {
  const list = await Product.findAll({ order:[['createdAt','DESC']] });
  res.json(list);
};
