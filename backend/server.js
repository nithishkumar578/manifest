require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const sequelize = require('./src/config/db');

// import models (register)
require('./src/models/User');
require('./src/models/Product');
require('./src/models/Sale');
require('./src/models/PendingUsers');
require('./src/scripts/collectMetrics'); 

const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const salesRoutes = require('./src/routes/sales');
const analyticsRoutes = require('./src/routes/analytics');
const staffRoutes = require('./src/routes/staff');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/staff', staffRoutes);

app.get('/', (req,res) => res.json({ status:'ok', version:'1.0' }));

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL connected');
    await sequelize.sync({ alter: true }); // for dev, use migrations in production
    console.log('DB synced');
    const port = process.env.PORT || 4000;
    app.listen(port, () => console.log(`Server started on ${port}`));
  } catch(err) {
    console.error('DB connect error:', err);
    process.exit(1);
  }
};

start();
