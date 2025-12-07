// src/services/huggingface.js

const axios = require('axios');

class HuggingFaceService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.baseURL = 'https://api-inference.huggingface.co/models';
    
    if (!this.apiKey) {
      console.error('❌ HUGGINGFACE_API_KEY not found in .env!');
    }
  }

  async generateReport(prompt, model = 'deepseek-ai/DeepSeek-V3.2') {
    try {
      console.log(`🤖 Calling Hugging Face model: ${model}`);
      console.log('📝 Prompt length:', prompt.length, 'characters');

      const response = await axios.post(
        `${this.baseURL}/${model}`,
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,  // ✅ Increased from 300
            temperature: 0.7,
            top_p: 0.9,
            return_full_text: false,
            do_sample: true,       // ✅ Added for better generation
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 seconds
        }
      );

      console.log('🔎 Hugging Face raw response:', JSON.stringify(response.data, null, 2));

      // ✅ Better text extraction
      let text = '';
      
      if (Array.isArray(response.data)) {
        // Response is array: [{ generated_text: "..." }]
        text = response.data[0]?.generated_text || '';
      } else if (response.data.generated_text) {
        // Response is object: { generated_text: "..." }
        text = response.data.generated_text;
      } else if (typeof response.data === 'string') {
        // Response is string
        text = response.data;
      }

      // ✅ Check if we got actual content (not fallback)
      if (!text || text.trim().length < 20) {
        console.warn('⚠️ AI returned very short or empty response');
        console.log('Falling back to manual parsing...');
        return this.manualParse(prompt);
      }

      // ✅ Check if response contains the section headers we expect
      if (!text.includes('## Completed') && !text.includes('## In Progress')) {
        console.warn('⚠️ AI response missing expected sections');
        console.log('Falling back to manual parsing...');
        return this.manualParse(prompt);
      }

      console.log('✅ Report generated successfully');
      console.log('📄 Generated text preview:', text.substring(0, 200));
      
      return text;
      
    } catch (error) {
      console.error('❌ Hugging Face Error:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // ✅ Fallback to manual parsing on error
      console.log('Using manual parsing as fallback...');
      return this.manualParse(prompt);
    }
  }

  /**
   * ✅ NEW: Manual parsing fallback
   * When AI fails, do basic keyword-based parsing
   */
  manualParse(prompt) {
    console.log('🔧 Using manual parsing...');
    
    // Extract the raw input from the prompt
    const inputMatch = prompt.match(/\*\*Raw Input:\*\*\s*([\s\S]*?)(?:\*\*Output Format|\*\*$|$)/i);
    const rawInput = inputMatch ? inputMatch[1].trim() : '';
    
    console.log('📝 Extracted raw input:', rawInput);
    
    if (!rawInput) {
      return `## Completed
- No completed tasks mentioned

## In Progress
- No tasks in progress mentioned

## Support
- No support mentioned`;
    }

    const lowerInput = rawInput.toLowerCase();
    
    // Keywords for categorization
    const completedKeywords = ['completed', 'finished', 'done', 'yesterday', 'last', 'resolved', 'closed'];
    const inProgressKeywords = ['working on', 'in progress', 'currently', 'developing', 'writing', 'implementing'];
    const supportKeywords = ['support', 'help', 'assistance', 'helped', 'minutes', 'hours', 'min', 'hr'];
    
    let completed = [];
    let inProgress = [];
    let support = [];
    
    // Split input into sentences
    const sentences = rawInput.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      
      // Check for completed
      if (completedKeywords.some(keyword => lowerSentence.includes(keyword))) {
        // Extract task numbers
        const taskMatch = sentence.match(/task[s]?\s*(\d+)/i);
        if (taskMatch) {
          completed.push(`- Completed Task ${taskMatch[1]}`);
        } else {
          completed.push(`- ${sentence.trim()}`);
        }
      }
      
      // Check for in progress
      else if (inProgressKeywords.some(keyword => lowerSentence.includes(keyword))) {
        const taskMatch = sentence.match(/task[s]?\s*(\d+)/i);
        if (taskMatch) {
          inProgress.push(`- Working on Task ${taskMatch[1]}`);
        } else {
          inProgress.push(`- ${sentence.trim()}`);
        }
      }
      
      // Check for support
      else if (supportKeywords.some(keyword => lowerSentence.includes(keyword))) {
        // Extract duration
        const timeMatch = sentence.match(/(\d+)\s*(min|minutes|hour|hours|hr)/i);
        if (timeMatch) {
          support.push(`- Received assistance - ${timeMatch[1]} ${timeMatch[2]}`);
        } else {
          support.push(`- ${sentence.trim()}`);
        }
      }
      
      // If no keywords matched, assume in progress
      else {
        inProgress.push(`- ${sentence.trim()}`);
      }
    });
    
    // Build formatted output
    const result = `## Completed
${completed.length > 0 ? completed.join('\n') : '- No completed tasks mentioned'}

## In Progress
${inProgress.length > 0 ? inProgress.join('\n') : '- No tasks in progress mentioned'}

## Support
${support.length > 0 ? support.join('\n') : '- No support mentioned'}`;
    
    console.log('✅ Manual parsing complete');
    return result;
  }

  
}

module.exports = new HuggingFaceService();