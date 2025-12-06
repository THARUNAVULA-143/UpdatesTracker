// src/config/database.js

const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI not found in .env file!');
    }

    console.log('Connecting to MongoDB Atlas...');

    const connection = await mongoose.connect(mongoURI);

    console.log('✅ MongoDB Atlas Connected!');
    console.log(`📊 Database: ${connection.connection.db.databaseName}`);
    console.log(`🌐 Host: ${connection.connection.host}`);

  } catch (error) {
    console.error('❌ MongoDB Connection Failed:');
    console.error(error.message);
    process.exit(1);
  }
};

mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('Mongoose error:', error);
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

module.exports = connectDatabase;