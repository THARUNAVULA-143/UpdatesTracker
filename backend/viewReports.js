#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

/**
 * View all reports in a formatted table
 * Run: npm run view-reports OR node viewReports.js
 */

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const collection = db.collection('Daily_Status');
    const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();
    
    if (docs.length === 0) {
      console.log('📭 No reports found in database');
      await mongoose.connection.close();
      return;
    }
    
    // Summary
    console.log(`📊 Total Reports: ${docs.length}\n`);
    
    // Create table header
    console.log('┌─────────────────────────────────────┬──────────────────────┬────────────────┬─────────────────────────────────────────────────┐');
    console.log('│ ID                                  │ Title                │ Status         │ Created Date                                    │');
    console.log('├─────────────────────────────────────┼──────────────────────┼────────────────┼─────────────────────────────────────────────────┤');
    
    docs.forEach(doc => {
      const id = doc._id.toString().substring(0, 35).padEnd(35);
      const title = (doc.title || '').substring(0, 20).padEnd(20);
      const status = (doc.status || '').padEnd(14);
      const date = new Date(doc.createdAt).toLocaleString().substring(0, 47).padEnd(47);
      console.log(`│ ${id} │ ${title} │ ${status} │ ${date} │`);
    });
    
    console.log('└─────────────────────────────────────┴──────────────────────┴────────────────┴─────────────────────────────────────────────────┘\n');
    
    // Detailed view
    console.log('📄 DETAILED VIEW\n');
    docs.forEach((doc, idx) => {
      console.log(`\n Report #${idx + 1}`);
      console.log('─'.repeat(70));
      console.log(`📌 ID:            ${doc._id}`);
      console.log(`📝 Title:         ${doc.title}`);
      console.log(`✅ Status:        ${doc.status}`);
      console.log(`🕐 Created:       ${new Date(doc.createdAt).toLocaleString()}`);
      console.log(`🔄 Updated:       ${new Date(doc.updatedAt).toLocaleString()}`);
     
      
      console.log(`\n📥 Raw Inputs:`);
      console.log(`   • Accomplishments: ${doc.rawInputs.accomplishments}`);
      console.log(`   • In Progress:     ${doc.rawInputs.inProgress}`);
      console.log(`   • Blockers:        ${doc.rawInputs.blockers}`);
      console.log(`   • Notes:           ${doc.rawInputs.notes}`);
      
      console.log(`\n📄 Formatted Report:`);
      console.log(doc.formattedReport);
      console.log('\n' + '─'.repeat(70));
    });
    
    await mongoose.connection.close();
    console.log('\n✅ Connection closed\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
