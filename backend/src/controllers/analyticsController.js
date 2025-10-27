const { Sequelize, Op } = require('sequelize');
const Metric = require('../models/Metric');
const User = require('../models/User');

exports.getTimeSeries = async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const days = parseInt(String(period).replace('d','')) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = await Metric.findAll({
      attributes: [
        'date',
        [Sequelize.fn('SUM', Sequelize.col('totalUsers')), 'totalUsers'],
        [Sequelize.fn('SUM', Sequelize.col('totalSales')), 'totalSales'],
        [Sequelize.fn('SUM', Sequelize.col('totalConversions')), 'totalConversions']
      ],
      where: { date: { [Op.gte]: since } },
      group: ['date'],
      order: [['date', 'ASC']],
      raw: true
    });

    // Prepare series for chart
    const series = { users: [], sales: [], conversions: [] };
    results.forEach(r => {
      series.users.push({ date: r.date, value: Number(r.totalUsers) });
      series.sales.push({ date: r.date, value: Number(r.totalSales) });
      series.conversions.push({ date: r.date, value: Number(r.totalConversions) });
    });

    res.json({ status: 'success', data: series });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getKPIs = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);

    const totalMetrics = await Metric.findAll({
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('totalUsers')), 'totalUsers'],
        [Sequelize.fn('SUM', Sequelize.col('totalSales')), 'sales'],
        [Sequelize.fn('SUM', Sequelize.col('totalConversions')), 'conversions']
      ],
      raw: true
    });

    const todayMetrics = await Metric.findAll({
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('totalUsers')), 'totalUsers'],
        [Sequelize.fn('SUM', Sequelize.col('totalSales')), 'sales'],
        [Sequelize.fn('SUM', Sequelize.col('totalConversions')), 'conversions']
      ],
      where: { date: { [Op.gte]: todayStart } },
      raw: true
    });

    // Users counts directly from User table
    const totalUsersCount = await User.count();
    const newUsersToday = await User.count({ where: { createdAt: { [Op.gte]: todayStart } } });

    const total = totalMetrics[0] || {};
    total.totalUsers = totalUsersCount;

    const today = todayMetrics[0] || {};
    today.newUsers = newUsersToday;

    res.json({ status: 'success', data: { total, today } });
  } catch(err){
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
