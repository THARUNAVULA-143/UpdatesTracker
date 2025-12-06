
// =====================
// IMPORT DEPENDENCIES
// =====================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDatabase = require('./config/database');
const reportRoutes = require('./routes/reportRoutes');


// INITIALIZE EXPRESS APP
const app = express();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';



app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});



app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'UpdatesTracker API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      reports: '/api/reports',
      health: '/health',
    },
  });
});


app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString(),
  });
});


app.use('/api/reports', reportRoutes);


app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    availableRoutes: {
      health: 'GET /',
      reports: 'GET /api/reports',
      createReport: 'POST /api/reports',
      getReport: 'GET /api/reports/:id',
    },
  });
});

/**
 * Global Error Handler
 * 
 * Catches any errors that occur during request processing
 */
app.use((error, req, res, next) => {
  console.error('💥 Global Error Handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    error: NODE_ENV === 'development' ? error.stack : undefined,
  });
});



const startServer = async () => {
  try {
    console.log('\n Starting UpdatesTracker Backend...\n');
    
    // Step 1: Connect to MongoDB
    console.log('Connecting to database...');
    await connectDatabase();
    
    // Step 2: Start Express server
    app.listen(PORT, () => {
      console.log('\nSERVER STARTED SUCCESSFULLY!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌐 Server running at: http://localhost:${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log(` API Endpoint: http://localhost:${PORT}/api/reports`);
      console.log(` Health Check: http://localhost:${PORT}/health`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(' Available Routes:');
      console.log('   POST   /api/reports           - Create report');
      console.log('   GET    /api/reports           - Get all reports');
      console.log('   GET    /api/reports/:id       - Get report by ID');
      console.log('   GET    /api/reports/range     - Get reports by date');
      console.log('   GET    /api/reports/models    - Get AI models');
      console.log('   PUT    /api/reports/:id       - Update report');
      console.log('   DELETE /api/reports/:id       - Delete report');
      console.log('\n Press Ctrl+C to stop server\n');
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server!
startServer();