// src/controllers/reportController.js

const Report = require('../models/Report');
const huggingFaceService = require('../services/huggingface');
const { startOfDay, endOfDay } = require('date-fns');

/**
 * FORMAT ONLY (No Save) - FOR PREVIEW
 */
exports.formatReportOnly = async (req, res) => {
  try {
    console.log('🎨 Formatting report (PREVIEW ONLY)...');
    
    const { rawInputs, llmModel } = req.body;

    if (!rawInputs || !rawInputs.accomplishments) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one input field',
      });
    }

    console.log('📋 Raw input:', rawInputs.accomplishments);

    // ✅ YOUR CUSTOM PROMPT FOR IT STANDUP
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
      llmModel || 'deepseek-ai/DeepSeek-V3.2'
    );

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
    console.log('💾 Creating and SAVING report...');
    
    const { rawInputs, llmModel, title, parsedSections } = req.body;

    if (!rawInputs || !rawInputs.accomplishments) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one input field',
      });
    }

    // ✅ SAME PROMPT AS ABOVE
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

    const formattedReport = await huggingFaceService.generateReport(
      prompt,
      llmModel || 'deepseek-ai/DeepSeek-V3.2'
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

    const report = new Report({
      rawInputs,
      formattedReport,
      inProgress: sections.inProgress,
      completed: sections.completed,
      support: sections.support,
      llmModel: llmModel || 'deepseek-ai/DeepSeek-V3.2',
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
    });
  }
};

// Keep all other functions the same...
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
};

exports.getReportsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'Provide both dates' });
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    const reports = await Report.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

exports.updateReportById = async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, message: 'Report updated', data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update report' });
  }
};

exports.deleteReportById = async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ success: true, message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete report' });
  }
};

exports.getAvailableModels = (req, res) => {
  try {
    const models = huggingFaceService.getAvailableModels();
    res.status(200).json({ success: true, count: models.length, data: models });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get models' });
  }
};
