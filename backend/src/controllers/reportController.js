// src/controllers/reportController.js

const Report = require('../models/Report');
const huggingFaceService = require('../services/huggingface');
const { startOfDay, endOfDay } = require('date-fns');

/**
 * ✅ INTENT-BASED AI PROMPT — Forces clean JSON output
 */
function buildTaskStatusPrompt(rawInput) {
  return `You are an expert IT task analyst. Your job is to extract structured task data from the user's daily update.

🎯 GOAL: Return ONLY a valid JSON object — no extra text, no markdown, no explanations.

✅ RULES:
1. Fix obvious typos (e.g., "testimg" → "testing", "scenareos" → "scenarios").
2. Normalize task IDs: "LAA157", "#157", "ticket 157" → "LAA-157".
3. If no ID, use "General".
4. For status:
   - ✅ "completed": task is fully done (finished, done, completed, wrapped up, got over the line, cleared, deployed).
   - 🟡 "inProgress": task is ongoing (started, working, testing, will, going, tackling, stuck, connected with X for Y).
5. Extract support time: e.g., "30 min", "2 hours", "None".time spent on support
6. Keep notes short (< 80 chars), action-oriented.
7. NEVER invent tasks — only extract from input.

📤 OUTPUT FORMAT — STRICTLY:

{
  "completed": [
    { "task": "LAA-87", "note": "Done writing test scenarios" }
  ],
  "inProgress": [
    { "task": "LAA-157", "note": "Testing ticket today", "eta": "EOW" }
  ],
  "support": "30 minutes"
}

Now analyze this update: "${rawInput}"`;
}

/**
 * ✅ FORMAT REPORT — With robust JSON parsing
 */
exports.formatReport = async (req, res) => {
  try {
    console.log('🎨 Analyzing task status...');
    
    const { rawInputs, llmModel } = req.body;

    if (!rawInputs || !rawInputs.accomplishments) {
      return res.status(400).json({
        success: false,
        message: 'Please provide accomplishments in rawInputs',
      });
    }

    const input = rawInputs.accomplishments.trim();
    console.log('📋 Input:', input);

    let parsedSections;
    let formattedReport = '';
    let parsingMethod = 'AI';

    try {
      // ✅ Send to AI
      console.log('🤖 Sending to AI...');
      const prompt = buildTaskStatusPrompt(input);
      
      const aiResponse = await huggingFaceService.generateReport(
        prompt,
        llmModel || 'Qwen/Qwen2.5-72B-Instruct'
      );

      console.log('🤖 AI Response:', aiResponse);

      // ✅ Extract JSON from response (handles ```json ... ```)
      let jsonText = aiResponse.trim();
      const codeBlockMatch = jsonText.match(/```(?:json)?\s*({[\s\S]*?})\s*```/i);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      }

      // ✅ Try to parse JSON
      let parsedJson;
      try {
        parsedJson = JSON.parse(jsonText);
      } catch (e) {
        throw new Error(`AI did not return valid JSON: ${e.message}. Raw response: ${aiResponse}`);
      }

      // ✅ Validate structure
      if (!parsedJson || !Array.isArray(parsedJson.completed) || !Array.isArray(parsedJson.inProgress)) {
        throw new Error('Invalid JSON structure');
      }

      // ✅ Convert to bullet-point strings for frontend
      const completedStr = parsedJson.completed.length
        ? parsedJson.completed.map(t => `• ${t.task}: ${t.note}`).join('\n')
        : 'None';

      const inProgressStr = parsedJson.inProgress.length
        ? parsedJson.inProgress.map(t => {
            let note = `• ${t.task}: ${t.note}`;
            if (t.eta) note += ` (ETA: ${t.eta})`;
            return note;
          }).join('\n')
        : 'None';

      const supportStr = parsedJson.support || 'None';

      parsedSections = {
        completed: completedStr,
        inProgress: inProgressStr,
        support: supportStr
      };

      formattedReport = `Completed:\n${completedStr}\n\nIn Progress:\n${inProgressStr}\n\nSupport: ${supportStr}`;
      parsingMethod = 'AI (JSON)';
    } catch (error) {
      console.error('⚠️ AI failed:', error.message);
      console.log('🔧 Using fallback parser...');

      // ✅ Fallback: Simple regex-based parser (for when AI fails)
      parsedSections = fallbackTaskParser(input);
      parsingMethod = 'Fallback';
    }

    console.log('✅ Final sections:', parsedSections);
    console.log('📊 Method:', parsingMethod);

    res.status(200).json({
      success: true,
      message: 'Task status analyzed successfully',
      formattedReport,
      parsedSections,
      meta: { 
        parsingMethod,
        inputLength: input.length,
        date: new Date().toLocaleDateString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to analyze tasks',
    });
  }
};

/**
 * ✅ FALLBACK PARSER — Simple, reliable, for when AI fails
 */
function fallbackTaskParser(input) {
  console.log('🔧 Fallback Parser Activated — Input:', input);

  let completed = [];
  let inProgress = [];
  let support = "None";

  // ✅ Extract support time
  const supportRegex = /(?:connected|took|spent|had|used)\s+support\s+(?:for\s+)?(\d+)\s*(min|minute|minutes|hour|hours)/i;
  const match = input.match(supportRegex);
  if (match) {
    const num = match[1];
    const unit = match[2].toLowerCase().startsWith('h') ? 'hours' : 'minutes';
    support = `${num} ${unit}`;
  }

  // ✅ Split by sentence
  const sentences = input
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 5);

  for (let sentence of sentences) {
    sentence = sentence.replace(/^I\s+/i, '').trim();
    const lower = sentence.toLowerCase();

    // Detect task ID
    let taskId = null;
    let note = sentence;

    const laaMatch = sentence.match(/(?:LAA[-\s]*|laa[-\s]*|ticket[-\s]*|#\s*)(\d+)/i);
    if (laaMatch) {
      taskId = `LAA-${laaMatch[1]}`;
      note = sentence.replace(laaMatch[0], '').trim();
    }

    // Clean note
    note = note
      .replace(/^(have\s+|am\s+|will\s+|was\s+|worked\s+on\s+|started\s+on\s+)?/i, '')
      .replace(/^(and\s+|also\s+)/i, '')
      .replace(/[.,]?\s*thank you.*$/i, '')
      .replace(/\.$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (note.length > 150) note = note.substring(0, 147) + '...';

    // Status logic
    const completedVerbs = ['completed', 'finished', 'done', 'deployed', 'closed', 'resolved', 'fixed', 'merged', 'pushed', 'tested', 'verified', 'updated', 'written', 'delivered', 'wrapped', 'cleared', 'got over the line'];
    const inProgressVerbs = ['testing', 'working', 'doing', 'will', 'going', 'started', 'plan', 'tomorrow', '%', 'discuss', 'connect', 'debug', 'fix', 'update', 'check', 'in progress', 'stuck', 'tackled'];

    const hasCompleted = completedVerbs.some(verb => new RegExp(`\\b${verb}\\b`, 'i').test(lower));
    const hasInProgress = inProgressVerbs.some(verb => new RegExp(`\\b${verb}\\b`, 'i').test(lower));

    const bullet = taskId ? `• ${taskId}: ${note}` : `• ${note}`;

    if (hasCompleted && !hasInProgress) {
      completed.push(bullet);
    } else if (hasInProgress || /by\s+end\s+of\s+this\s+week/i.test(sentence)) {
      inProgress.push(bullet);
    } else {
      inProgress.push(bullet);
    }
  }

  return {
    completed: completed.join('\n') || 'None',
    inProgress: inProgress.join('\n') || 'None',
    support: support
  };
}

/**
 * ✅ CREATE REPORT — Store one record
 */
exports.createReport = async (req, res) => {
  try {
    const { rawInputs, llmModel, title, parsedSections } = req.body;

    if (!parsedSections) {
      return res.status(400).json({
        success: false,
        message: 'Please provide parsedSections',
      });
    }

    let formattedReport = req.body.formattedReport || `Completed: ${parsedSections.completed}
In Progress: ${parsedSections.inProgress}
Support: ${parsedSections.support}`;

    const report = new Report({
      rawInputs: { accomplishments: rawInputs?.accomplishments || '' },
      formattedReport,
      completed: parsedSections.completed,
      inProgress: parsedSections.inProgress,
      support: parsedSections.support,
      llmModel: llmModel || 'Intent-Based Analyzer',
      title: title || `Daily Report - ${new Date().toLocaleDateString()}`,
    });

    await report.save();
    console.log('💾 Saved:', report._id);

    res.status(201).json({
      success: true,
      message: 'Report saved successfully',
      data: report,  // ✅ FIXED: Changed from 'report' to 'data'
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create report',
    });
  }
};

/**
 * ✅ GET ALL REPORTS — FIXED: Returns 'data' not 'reports'
 */
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ 
      success: true, 
      count: reports.length, 
      data: reports  // ✅ FIXED: Changed from 'reports' to 'data'
    });
  } catch (error) {
    console.error('❌ Error fetching reports:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch reports' 
    });
  }
};

exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ 
      success: true, 
      data: report  // ✅ FIXED: Changed from 'report' to 'data'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
};

exports.getReportsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Provide both dates' });
    }
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    const reports = await Report.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 });
    res.status(200).json({ 
      success: true, 
      count: reports.length, 
      data: reports  // ✅ FIXED: Changed from 'reports' to 'data'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

exports.updateReport = async (req, res) => {
  try {
    const { completed, inProgress, support } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { completed, inProgress, support },
      { new: true, runValidators: true }
    );
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.status(200).json({ 
      success: true, 
      message: 'Report updated', 
      data: report  // ✅ FIXED: Changed from 'report' to 'data'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update report' });
  }
};

exports.deleteReport = async (req, res) => {
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
    const models = [
      'Qwen/Qwen2.5-72B-Instruct',
      'Qwen/Qwen2.5-7B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'microsoft/Phi-3-mini-4k-instruct'
    ];
    res.status(200).json({ 
      success: true, 
      count: models.length, 
      data: models  // ✅ FIXED: Changed from 'models' to 'data'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get models' });
  }
};