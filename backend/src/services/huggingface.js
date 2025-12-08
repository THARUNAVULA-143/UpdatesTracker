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
            max_new_tokens: 1000,      // ✅ Even more tokens
            temperature: 0.4,           // ✅ Lower for precision
            top_p: 0.9,
            return_full_text: false,
            do_sample: true,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      console.log('🔎 Hugging Face raw response:', JSON.stringify(response.data, null, 2));

      let text = '';
      
      if (Array.isArray(response.data)) {
        text = response.data[0]?.generated_text || '';
      } else if (response.data.generated_text) {
        text = response.data.generated_text;
      } else if (typeof response.data === 'string') {
        text = response.data;
      }

      if (!text || text.trim().length < 20) {
        console.warn('⚠️ AI returned very short or empty response');
        console.log('Falling back to manual parsing...');
        return this.manualParse(prompt);
      }

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
   * ✅ IMPROVED MANUAL PARSER - UNDERSTANDS IT PROFESSIONAL LANGUAGE
   */
  manualParse(prompt) {
    console.log('🔧 Using improved manual parsing...');
    
    const inputMatch = prompt.match(/(?:\*\*Input from IT professional:\*\*|Input:)\s*([\s\S]*?)(?:\n\n\*\*Your task|\*\*NOW FORMAT|$)/i);
    const rawInput = inputMatch ? inputMatch[1].trim() : '';
    
    console.log('📝 Extracted raw input:', rawInput);
    
    if (!rawInput) {
      return `## Completed\nNone\n\n## In Progress\nNone\n\n## Support\nNone`;
    }

    const lowerInput = rawInput.toLowerCase();
    
    let completed = [];
    let inProgress = [];
    let support = [];
    
    // ✅ Extract ALL ticket/task numbers (Task 117, LAA-107, JIRA-123, etc.)
    const ticketPattern = /(?:task|ticket)?\s*#?([A-Z]+-\d+|\d+)(?=\s|,|\.|\band\b|$)/gi;
    const allTickets = [];
    let match;
    while ((match = ticketPattern.exec(rawInput)) !== null) {
      allTickets.push(match[1]);
    }
    
    console.log('🎫 Found ALL tickets/tasks:', allTickets);
    
    // ✅ Check for "no support" variations
    const noSupportMatch = /no support|no help|no assistance|without support/i.test(lowerInput);
    
    // ✅ Extract time with EXACT phrases preserved
    let supportTime = null;
    const timePatterns = [
      /(?:more than|over|about|around|approximately)\s+(\d+(?:\.\d+)?)\s*(min|minutes|hour|hours|hrs?)/i,
      /(\d+(?:\.\d+)?)\s*(min|minutes|hour|hours|hrs?)/i
    ];
    
    for (const pattern of timePatterns) {
      const timeMatch = rawInput.match(pattern);
      if (timeMatch && !noSupportMatch) {
        const prefix = timeMatch[0].toLowerCase().includes('more than') ? 'More than ' :
                      timeMatch[0].toLowerCase().includes('over') ? 'Over ' :
                      timeMatch[0].toLowerCase().includes('about') ? 'About ' :
                      timeMatch[0].toLowerCase().includes('around') ? 'Around ' : '';
        const num = timeMatch[1];
        const unit = timeMatch[2].toLowerCase().startsWith('h') ? 'hours' : 'minutes';
        supportTime = `${prefix}${num} ${unit}`;
        break;
      }
    }
    
    // ✅ Split by sentence delimiters
    const sentences = rawInput
      .split(/[.!?;]|and(?=\s+[a-z]+\s+(?:task|ticket|LAA|JIRA))/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log('📝 Split into sentences:', sentences);
    
    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase();
      
      // Skip support-only sentences
      if (/^support|^got help|^received help/i.test(sentence) && supportTime) {
        return;
      }
      
      // Fix common spelling errors
      let cleanSentence = sentence
        .replace(/createing/gi, 'creating')
        .replace(/scenareos/gi, 'scenarios')
        .replace(/zypher/gi, 'Zephyr')
        .replace(/jira\b/gi, 'Jira')
        .replace(/toady/gi, 'today')
        .replace(/\bi\s+have\s+/gi, '')
        .replace(/\bi\s+/gi, '')
        .trim();
      
      // Extract tickets from this sentence
      const sentenceTickets = [];
      const ticketRegex = /(?:task|ticket)?\s*#?([A-Z]+-\d+|\d+)(?=\s|,|\.|\band\b|$)/gi;
      let ticketMatch;
      while ((ticketMatch = ticketRegex.exec(sentence)) !== null) {
        sentenceTickets.push(ticketMatch[1]);
      }
      
      // ✅ FUTURE TENSE = IN PROGRESS
      if (/will|would like to|going to|plan to|want to|need to|should/i.test(lower)) {
        // This is a planned task (In Progress)
        if (sentenceTickets.length > 0) {
          const taskList = sentenceTickets.map(t => 
            /^[A-Z]+-\d+$/.test(t) ? t : `Task ${t}`
          ).join(', ');
          
          if (/test/i.test(lower)) {
            inProgress.push(`- Will test ${taskList} today`);
          } else {
            inProgress.push(`- Planning to work on ${taskList}`);
          }
        } else if (cleanSentence.length > 3) {
          inProgress.push(`- ${cleanSentence.charAt(0).toUpperCase() + cleanSentence.slice(1)}`);
        }
      }
      // ✅ COMPLETED ACTIONS
      else if (/done|completed|finished|updated|uploaded|submitted|closed|deployed|resolved/i.test(lower)) {
        if (sentenceTickets.length > 0) {
          const taskList = sentenceTickets.map(t => 
            /^[A-Z]+-\d+$/.test(t) ? t : `Task ${t}`
          ).join(' and ');
          
          if (/updated|uploaded/i.test(lower)) {
            // Keep the action in the sentence
            const action = cleanSentence.replace(/(?:task|ticket)?\s*#?[A-Z]+-?\d+/gi, '').trim();
            completed.push(`- ${action.charAt(0).toUpperCase() + action.slice(1)} for ${taskList}`);
          } else {
            completed.push(`- Completed ${taskList}`);
          }
        } else {
          cleanSentence = cleanSentence.charAt(0).toUpperCase() + cleanSentence.slice(1);
          if (!cleanSentence.match(/^(completed|done|finished)/i)) {
            cleanSentence = 'Completed ' + cleanSentence.toLowerCase();
          }
          completed.push(`- ${cleanSentence}`);
        }
      }
      // ✅ IN PROGRESS (CURRENT ACTIONS)
      else if (/working|testing|developing|investigating|currently|in progress|implementing|writing|coding|reviewing/i.test(lower)) {
        if (sentenceTickets.length > 0) {
          const taskList = sentenceTickets.map(t => 
            /^[A-Z]+-\d+$/.test(t) ? t : `Task ${t}`
          ).join(', ');
          
          let action = 'Working on';
          if (/testing/i.test(lower)) action = 'Testing';
          else if (/developing/i.test(lower)) action = 'Developing';
          else if (/investigating/i.test(lower)) action = 'Investigating';
          else if (/reviewing/i.test(lower)) action = 'Reviewing';
          
          inProgress.push(`- Currently ${action.toLowerCase()} ${taskList}`);
        } else {
          cleanSentence = cleanSentence.charAt(0).toUpperCase() + cleanSentence.slice(1);
          if (!/^currently/i.test(cleanSentence)) {
            cleanSentence = 'Currently ' + cleanSentence.toLowerCase();
          }
          inProgress.push(`- ${cleanSentence}`);
        }
      }
      // ✅ DEFAULT: If mentions tickets, categorize by context
      else if (sentenceTickets.length > 0) {
        const taskList = sentenceTickets.map(t => 
          /^[A-Z]+-\d+$/.test(t) ? t : `Task ${t}`
        ).join(' and ');
        
        // Look for clues in the sentence
        if (/test|testing/i.test(lower)) {
          inProgress.push(`- Testing ${taskList}`);
        } else {
          // Default to completed if past context
          completed.push(`- Worked on ${taskList}`);
        }
      }
    });
    
    // ✅ Add support if found
    if (supportTime) {
      support.push(`- ${supportTime}`);
    }
    
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