// src/controllers/reportController.js

const Report = require('../models/Report');
const huggingFaceService = require('../services/huggingface');
const { startOfDay, endOfDay } = require('date-fns');

/**
 * ============================================
 * FORMAT ONLY (No Save) - FOR PREVIEW
 * ============================================
 * POST /api/reports/format
 * 
 * Purpose: User speaks → AI formats → Show preview
 * Does NOT save to database yet!
 */
exports.formatReportOnly = async (req, res) => {
  try {
    console.log('🎨 Formatting report (PREVIEW ONLY - NOT SAVING)...');
    
    const { rawInputs, llmModel } = req.body;

    // Validation
    if (!rawInputs || !rawInputs.accomplishments) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one input field',
      });
    }

    console.log('📋 Raw input:', rawInputs.accomplishments.substring(0, 50) + '...');

    // Build prompt for AI
    const prompt = `
You are an AI assistant formatting daily IT stand-up updates.

Sections required:
- In Progress: tasks currently being worked on
- Completed: tasks finished or from previous days  
- Support: help received, time saved (mention minutes/hours)

Output format:
## In Progress
- bullet points

## Completed
- bullet points

## Support
- bullet points

Raw input:
Accomplishments: ${rawInputs.accomplishments}
`.trim();

    console.log('🤖 Sending to AI for formatting...');

    // Call Hugging Face to format
    const formattedReport = await huggingFaceService.generateReport(
      prompt,
      llmModel || 'meta-llama/Llama-3.2-3B-Instruct'
    );

    // Extract sections
    const extractSection = (text, sectionName) => {
      const regex = new RegExp(`## ${sectionName}\\s*([\\s\\S]*?)(?=##|$)`, "i");
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };

    const parsedSections = {
      inProgress: extractSection(formattedReport, "In Progress"),
      completed: extractSection(formattedReport, "Completed"),
      support: extractSection(formattedReport, "Support"),
    };

    console.log('✅ Formatting complete (NOT SAVED TO DATABASE)');

    // Return formatted data WITHOUT saving to MongoDB
    res.status(200).json({
      success: true,
      message: 'Report formatted successfully (preview only)',
      formattedReport,
      parsedSections,
    });
    
  } catch (error) {
    console.error('❌ Error formatting report:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to format report',
    });
  }
};

/**
 * ============================================
 * CREATE AND SAVE TO DATABASE
 * ============================================
 * POST /api/reports
 * 
 * Purpose: After user approves preview, save to database
 * This ACTUALLY saves to MongoDB
 */
exports.createReport = async (req, res) => {
  try {
    console.log('💾 Creating and SAVING report to database...');
    
    // Get data from request body
    const { rawInputs, llmModel, title, parsedSections } = req.body;

    // Validation: Must have at least one input
    if (!rawInputs || !rawInputs.accomplishments) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one input field',
      });
    }

    console.log('📋 Raw inputs received:', {
      accomplishments: rawInputs.accomplishments ? '✓' : '✗'
    });

    // Build prompt for AI
    const prompt = `
You are an AI assistant formatting daily IT stand-up updates.

Sections required:
- In Progress: tasks currently being worked on
- Completed: tasks finished or from previous days
- Support: help received, time saved (mention minutes/hours)

Output format:
## In Progress
- bullet points

## Completed
- bullet points

## Support
- bullet points

Raw input:
Accomplishments: ${rawInputs.accomplishments}
`.trim();

    console.log('🤖 Sending to AI for formatting...');

    // Call Hugging Face to generate formatted report
    const formattedReport = await huggingFaceService.generateReport(
      prompt,
      llmModel || 'meta-llama/Llama-3.2-3B-Instruct'
    );

    // Parse formatted report into structured fields
    const extractSection = (text, sectionName) => {
      const regex = new RegExp(`## ${sectionName}\\s*([\\s\\S]*?)(?=##|$)`, "i");
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };

    const sections = parsedSections || {
      inProgress: extractSection(formattedReport, "In Progress"),
      completed: extractSection(formattedReport, "Completed"),
      support: extractSection(formattedReport, "Support"),
    };

    console.log('✅ AI formatting complete');

    // Save to MongoDB
    const report = new Report({
      rawInputs,
      formattedReport,
      inProgress: sections.inProgress,
      completed: sections.completed,
      support: sections.support,
      llmModel: llmModel || 'meta-llama/Llama-3.2-3B-Instruct',
      title: title || `Daily Report - ${new Date().toLocaleDateString()}`,
    });

    await report.save();

    console.log('💾 SAVED TO DATABASE:', report._id);

    // Send response to frontend
    res.status(201).json({
      success: true,
      message: 'Report created and saved successfully',
      formattedReport, 
      data: report,
    });
    
  } catch (error) {
    console.error('❌ Error creating report:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create report',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * ============================================
 * GET ALL REPORTS
 * ============================================
 * GET /api/reports
 */
exports.getAllReports = async (req, res) => {
  try {
    console.log('📚 Fetching all reports...');
    
    const reports = await Report.find()
      .sort({ createdAt: -1 })
      .limit(100);

    console.log(`✅ Found ${reports.length} reports`);

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
    
  } catch (error) {
    console.error('❌ Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
    });
  }
};

/**
 * ============================================
 * GET SINGLE REPORT BY ID
 * ============================================
 * GET /api/reports/:id
 */
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Fetching report: ${id}`);

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    console.log('✅ Report found');

    res.status(200).json({
      success: true,
      data: report,
    });
    
  } catch (error) {
    console.error('❌ Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report',
    });
  }
};

/**
 * ============================================
 * GET REPORTS BY DATE RANGE
 * ============================================
 * GET /api/reports/range?startDate=2024-01-01&endDate=2024-01-31
 */
exports.getReportsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both startDate and endDate query parameters',
        example: '/api/reports/range?startDate=2024-01-01&endDate=2024-01-31',
      });
    }

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    console.log(`📅 Fetching reports from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`);

    const reports = await Report.find({
      createdAt: {
        $gte: start,
        $lte: end,
      },
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${reports.length} reports in date range`);

    res.status(200).json({
      success: true,
      count: reports.length,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      data: reports,
    });
    
  } catch (error) {
    console.error('❌ Error fetching reports by date range:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
    });
  }
};

/**
 * ============================================
 * UPDATE REPORT
 * ============================================
 * PUT /api/reports/:id
 */
exports.updateReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log(`✏️  Updating report: ${id}`);

    const report = await Report.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    console.log('✅ Report updated successfully');

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      data: report,
    });
    
  } catch (error) {
    console.error('❌ Error updating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update report',
    });
  }
};

/**
 * ============================================
 * DELETE REPORT
 * ============================================
 * DELETE /api/reports/:id
 */
exports.deleteReportById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️  Deleting report: ${id}`);

    const report = await Report.findByIdAndDelete(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    console.log('✅ Report deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
      data: {
        deletedId: id,
        deletedTitle: report.title,
      },
    });
    
  } catch (error) {
    console.error('❌ Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete report',
    });
  }
};

/**
 * ============================================
 * GET AVAILABLE AI MODELS
 * ============================================
 * GET /api/reports/models
 */
exports.getAvailableModels = (req, res) => {
  try {
    const models = huggingFaceService.getAvailableModels();
    
    res.status(200).json({
      success: true,
      count: models.length,
      data: models,
    });
  } catch (error) {
    console.error('❌ Error getting models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get models',
    });
  }
};