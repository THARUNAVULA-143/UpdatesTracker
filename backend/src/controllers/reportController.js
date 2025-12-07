// src/controllers/reportController.js

const Report = require('../models/Report');
const huggingFaceService = require('../services/huggingface');
const { startOfDay, endOfDay } = require('date-fns');

/**
 * FORMAT ONLY (No Save) - FOR PREVIEW
 */
exports.formatReportOnly = async (req, res) => {
  try {
    console.log('🎨 Formatting report (PREVIEW ONLY - NOT SAVING)...');
    
    const { rawInputs, llmModel } = req.body;

    if (!rawInputs || !rawInputs.accomplishments) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one input field',
      });
    }

    console.log('📋 Raw input:', rawInputs.accomplishments);

    // ✅ IMPROVED PROMPT FOR BETTER CATEGORIZATION
    const prompt = `You are an assistant that formats daily IT standup updates for a manager.

Your job is to take raw input from me (which may contain grammar mistakes or shorthand notes) and rewrite it into clear, professional sentences.

Always organize the update into three sections:

## Completed
- List tasks that were finished
- Use past tense and concise sentences
- Extract task numbers if mentioned (e.g., Task 173, Task 22)

## In Progress  
- List tasks currently being worked on
- Use present continuous tense (e.g., "working on...", "investigating...", "developing...")
- Extract task numbers if mentioned

## Support
- If help, guidance, or collaboration was received, place it here
- ONLY include the time spent (in minutes or hours)
- Format: "Received support - [X] minutes" or "Received support - [X] hours"
- Do not add extra details beyond the time

**Rules:**
1. Correct grammar and spelling errors
2. Ensure sentences are meaningful and professional
3. Do not invent tasks; only use what I provide
4. If a section has no items, write "None"
5. Keep sentences concise and clear

**Raw Input:**
${rawInputs.accomplishments}

**Output Format:**
## Completed
- [task in past tense]

## In Progress
- [task in present continuous tense]

## Support
- [only time duration if mentioned, otherwise "None"]`.trim();

    console.log('🤖 Sending to AI for formatting...');
    
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

    console.log('✅ Formatting complete:', parsedSections);

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
 * CREATE AND SAVE TO DATABASE
 */
exports.createReport = async (req, res) => {
  try {
    console.log('💾 Creating and SAVING report to database...');
    
    const { rawInputs, llmModel, title, parsedSections } = req.body;

    if (!rawInputs || !rawInputs.accomplishments) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one input field',
      });
    }

    console.log('📋 Raw inputs received');

    // ✅ SAME IMPROVED PROMPT
    const prompt = `You are an AI assistant that formats daily IT stand-up updates into structured sections.

**INSTRUCTIONS:**
Analyze the raw input and categorize information into these sections:

**## Completed**
- Tasks that are FINISHED, COMPLETED, or were done YESTERDAY/PAST
- Use past tense (completed, finished, resolved, implemented)
- Rephrase as professional bullet points
- Include task numbers if mentioned

**## In Progress**
- Tasks currently WORKING ON, IN PROGRESS, or ONGOING
- Use present continuous tense (working on, developing, implementing)
- Rephrase as professional bullet points
- Include task numbers if mentioned

**## Support**
- Any HELP RECEIVED, ASSISTANCE, or TIME SAVED from others
- Mention the exact duration (minutes/hours) if provided
- Format as: "Received [type of help] - [duration]"

**RULES:**
1. Extract task numbers (e.g., Task 173, Task 22)
2. Rephrase in professional language
3. Use bullet points (-)
4. Keep it concise and clear
5. If support time is mentioned, include it exactly

**Raw Input:**
${rawInputs.accomplishments}

**Output Format:**
## Completed
- [bullet points]

## In Progress
- [bullet points]

## Support
- [bullet points or "None" if no support mentioned]`.trim();

    console.log('🤖 Sending to AI for formatting...');

    const formattedReport = await huggingFaceService.generateReport(
      prompt,
      llmModel || 'meta-llama/Llama-3.2-3B-Instruct'
    );

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

// ... (keep all other functions unchanged: getAllReports, getReportById, etc.)

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

exports.getReportsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both startDate and endDate',
      });
    }
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    const reports = await Report.find({
      createdAt: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } 
  catch (error) {
    console.error('❌ Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
    });
  }
};


exports.updateReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const report = await Report.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }
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

exports.deleteReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findByIdAndDelete(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete report',
    });
  }
};


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
