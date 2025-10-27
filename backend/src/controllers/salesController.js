const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Metric = require('../models/Metric');

exports.createSale = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const staffId = req.user.id;
    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const totalPrice = product.price * (quantity||1);
    const sale = await Sale.create({ productId, staffId, quantity, totalPrice });
    // update metrics: sales amount + products count + conversions maybe
    await Metric.create({ name: 'sales', value: totalPrice, timestamp: new Date() });
    await Metric.create({ name: 'conversions', value: 1, timestamp: new Date() });
    res.status(201).json(sale);
  } catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
};
