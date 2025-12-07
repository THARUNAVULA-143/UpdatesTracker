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

  async generateReport(prompt, model = 'Qwen/Qwen2.5-7B-Instruct') {
    try {
      console.log(`🤖 Calling Hugging Face model: ${model}`);
      console.log('📝 Prompt length:', prompt.length, 'characters');

      const response = await axios.post(
        `${this.baseURL}/${model}`,
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: 800,      // ✅ Increased for better responses
            temperature: 0.5,          // ✅ Lower for more consistency
            top_p: 0.85,               // ✅ Adjusted
            return_full_text: false,
            do_sample: true,
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

      // ✅ Extract text from response
      let text = '';
      
      if (Array.isArray(response.data)) {
        text = response.data[0]?.generated_text || '';
      } else if (response.data.generated_text) {
        text = response.data.generated_text;
      } else if (typeof response.data === 'string') {
        text = response.data;
      }

      // ✅ Basic validation
      if (!text || text.trim().length < 20) {
        console.warn('⚠️ AI returned very short or empty response');
        console.log('Falling back to manual parsing...');
        return this.manualParse(prompt);
      }

      // ✅ LESS STRICT CHECK - Just look for any section headers
      const hasAnySection = /##\s*(Completed|In Progress|Support)/i.test(text);
      
      if (!hasAnySection) {
        console.warn('⚠️ AI response missing expected sections');
        console.log('Falling back to manual parsing...');
        return this.manualParse(prompt);
      }

      console.log('✅ Report generated successfully');
      console.log('📄 Generated text:', text);
      
      return text;
      
    } catch (error) {
      console.error('❌ Hugging Face Error:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      console.log('Using manual parsing as fallback...');
      return this.manualParse(prompt);
    }
  }

  /**
   * ✅ IMPROVED MANUAL PARSING FALLBACK
   */
  manualParse(prompt) {
    console.log('🔧 Using improved manual parsing...');
    
    // Extract the raw input from the prompt - more flexible matching
    const inputMatch = prompt.match(/(?:\*\*Input:\*\*|Input:)\s*([\s\S]*?)(?:\n\n\*\*|$)/i);
    const rawInput = inputMatch ? inputMatch[1].trim() : '';
    
    console.log('📝 Extracted raw input:', rawInput);
    
    if (!rawInput) {
      return `## Completed
None

## In Progress
None

## Support
None`;
    }

    const lowerInput = rawInput.toLowerCase();
    
    let completed = [];
    let inProgress = [];
    let support = [];
    
    // ✅ Split by common delimiters (comma, semicolon, "and", period with space)
    const parts = rawInput.split(/[,;]|and(?!\s+task)|\.\s+/i).filter(s => s.trim().length > 0);
    
    console.log('🔍 Split into parts:', parts);
    
    parts.forEach(part => {
      const trimmed = part.trim();
      const lower = trimmed.toLowerCase();
      
      // Extract task numbers (Task 101, Task #101, task101, etc.)
      const taskMatch = trimmed.match(/task[s]?\s*#?(\d+)/i);
      const taskNum = taskMatch ? `Task ${taskMatch[1]}` : null;
      
      // Check for completed keywords
      if (/complet|finish|done|resolved|closed|yesterday|last/i.test(lower)) {
        if (taskNum) {
          completed.push(`- Completed ${taskNum}`);
        } else {
          // Clean up the text
          const cleanText = trimmed.replace(/^(i\s+have\s+|i\s+)/i, '').trim();
          completed.push(`- ${cleanText.charAt(0).toUpperCase() + cleanText.slice(1)}`);
        }
      }
      // Check for in-progress keywords
      else if (/testing|working|developing|investigating|currently|in progress|implementing|writing/i.test(lower)) {
        if (taskNum) {
          // Extract the action verb
          let action = 'Working on';
          if (/testing/i.test(lower)) action = 'Testing';
          else if (/developing/i.test(lower)) action = 'Developing';
          else if (/investigating/i.test(lower)) action = 'Investigating';
          else if (/implementing/i.test(lower)) action = 'Implementing';
          else if (/writing/i.test(lower)) action = 'Writing';
          
          inProgress.push(`- Currently ${action.toLowerCase()} ${taskNum}`);
        } else {
          const cleanText = trimmed.replace(/^(i\s+am\s+|i'm\s+|i\s+)/i, '').trim();
          inProgress.push(`- Currently ${cleanText.toLowerCase()}`);
        }
      }
      // Check for support/time
      else if (/support|help|assist|guidance|minutes|hours|mins|hrs/i.test(lower)) {
        // Extract time duration - be very precise
        const timeMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(min|minutes|hour|hours|hrs?)/i);
        if (timeMatch) {
          const num = timeMatch[1];
          const unit = timeMatch[2].toLowerCase();
          
          // Normalize unit
          let normalizedUnit = 'minutes';
          if (unit.startsWith('h')) {
            normalizedUnit = 'hours';
          } else if (unit === 'min' || unit === 'mins') {
            normalizedUnit = 'minutes';
          }
          
          support.push(`- ${num} ${normalizedUnit}`);
        } else if (/support|help|assist/i.test(lower)) {
          // Just mention support was received
          support.push(`- Received assistance`);
        }
      }
      // Default: if has task number, assume in progress
      else if (taskNum) {
        inProgress.push(`- Working on ${taskNum}`);
      }
      // Otherwise, try to categorize by context
      else if (trimmed.length > 3) {
        // If it mentions a future action, it's probably in progress
        if (/will|going to|next|plan/i.test(lower)) {
          inProgress.push(`- ${trimmed.charAt(0).toUpperCase() + trimmed.slice(1)}`);
        }
      }
    });
    
    // Build formatted output
    const result = `## Completed
${completed.length > 0 ? completed.join('\n') : 'None'}

## In Progress
${inProgress.length > 0 ? inProgress.join('\n') : 'None'}

## Support
${support.length > 0 ? support.join('\n') : 'None'}`;
    
    console.log('✅ Manual parsing complete:', result);
    return result;
  }
}

module.exports = new HuggingFaceService();