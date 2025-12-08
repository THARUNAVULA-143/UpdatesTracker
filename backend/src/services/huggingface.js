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
            max_new_tokens: 1200,  // ✅ Increased for longer outputs
            temperature: 0.3,       // ✅ Low for precision
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
   * ✅ UNIVERSAL MANUAL PARSER - WORKS FOR ANY INPUT
   */
  manualParse(prompt) {
    console.log('🔧 Using universal manual parsing...');
    
    // Extract raw input
    const inputMatch = prompt.match(/(?:\*\*INPUT:\*\*|INPUT:)\s*([\s\S]*?)(?:\n\n\*\*|NOW FORMAT|$)/i);
    const rawInput = inputMatch ? inputMatch[1].trim() : '';
    
    console.log('📝 Extracted raw input:', rawInput);
    
    if (!rawInput) {
      return `## Completed\nNone\n\n## In Progress\nNone\n\n## Support\nNone`;
    }

    const lowerInput = rawInput.toLowerCase();
    
    let completed = [];
    let inProgress = [];
    let support = [];
    
    // ============================================
    // STEP 1: EXTRACT SUPPORT TIME
    // ============================================
    const noSupportMatch = /no support|no help|no assistance/i.test(lowerInput);
    let supportTime = null;
    
    if (!noSupportMatch) {
      const timePatterns = [
        /(?:more than|over|about|around|approximately)\s+(\d+(?:\.\d+)?)\s*(min|minutes|hour|hours|hrs?)/i,
        /(\d+(?:\.\d+)?)\s*(min|minutes|hour|hours|hrs?)/i
      ];
      
      for (const pattern of timePatterns) {
        const timeMatch = rawInput.match(pattern);
        if (timeMatch) {
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
    }
    
    // ============================================
    // STEP 2: IDENTIFY ALL ACTION VERBS
    // ============================================
    const completedVerbs = /\b(finished|completed|done|resolved|closed|deployed|fixed|updated|created|uploaded|submitted)\b/gi;
    const inProgressVerbs = /\b(started|starting|working|testing|developing|investigating|reviewing|implementing|coding|will|plan|going|need)\b/gi;
    
    const actions = [];
    
    // Find completed actions
    let match;
    const completedRegex = new RegExp(completedVerbs.source, 'gi');
    while ((match = completedRegex.exec(rawInput)) !== null) {
      actions.push({
        verb: match[0],
        index: match.index,
        type: 'completed'
      });
    }
    
    // Find in-progress actions
    const inProgressRegex = new RegExp(inProgressVerbs.source, 'gi');
    while ((match = inProgressRegex.exec(rawInput)) !== null) {
      // Avoid duplicates
      if (!actions.some(a => Math.abs(a.index - match.index) < 5)) {
        actions.push({
          verb: match[0],
          index: match.index,
          type: 'inProgress'
        });
      }
    }
    
    // Sort by position in text
    actions.sort((a, b) => a.index - b.index);
    
    console.log('🎯 Found actions:', actions);
    
    // ============================================
    // STEP 3: EXTRACT CONTEXT FOR EACH ACTION
    // ============================================
    if (actions.length > 0) {
      for (let i = 0; i < actions.length; i++) {
        const currentAction = actions[i];
        const nextAction = actions[i + 1];
        
        // Extract text from current action to next action (or end)
        const startIdx = currentAction.index;
        const endIdx = nextAction ? nextAction.index : rawInput.length;
        let phrase = rawInput.substring(startIdx, endIdx).trim();
        
        // Clean up
        phrase = phrase
          .replace(/^(and\s+|,\s*)/i, '')
          .replace(/\s+(and\s+)?$/, '')
          .replace(/^(I\s+have\s+|I\s+|I'm\s+)/i, '')
          .trim();
        
        if (phrase.length < 5) continue; // Skip very short fragments
        
        // Extract task/ticket numbers
        const taskNumbers = [];
        const taskMatches = phrase.matchAll(/(?:task|ticket|the)?\s*#?(\d+|[A-Z]+-\d+)/gi);
        for (const tm of taskMatches) {
          if (tm[1] && tm[1] !== 'the') {
            taskNumbers.push(tm[1]);
          }
        }
        
        // Handle number words
        const numberWords = {
          'three': '3', 'third': '3', '3rd': '3',
          'four': '4', 'fourth': '4', '4th': '4',
          'five': '5', 'fifth': '5', '5th': '5',
          'six': '6', 'sixth': '6', '6th': '6',
          'seven': '7', 'seventh': '7', '7th': '7',
          'eight': '8', 'eighth': '8', '8th': '8',
          'nine': '9', 'ninth': '9', '9th': '9',
          'ten': '10', 'tenth': '10', '10th': '10'
        };
        
        // Check for "finished X tasks"
        const taskCountMatch = phrase.match(/\b(three|four|five|six|seven|eight|nine|ten|\d+)\s+tasks?\b/i);
        
        // Format the phrase
        let formattedPhrase = phrase.charAt(0).toUpperCase() + phrase.slice(1);
        
        // Categorize
        if (currentAction.type === 'completed') {
          if (taskCountMatch) {
            const count = numberWords[taskCountMatch[1].toLowerCase()] || taskCountMatch[1];
            completed.push(`- Finished ${count} tasks`);
          } else if (taskNumbers.length > 0) {
            const tasks = taskNumbers.map(t => /^[A-Z]+-\d+$/.test(t) ? t : `Task ${t}`).join(' and ');
            completed.push(`- Completed ${tasks}`);
          } else {
            // Clean up the phrase
            formattedPhrase = formattedPhrase
              .replace(/^(finished|completed|done|updated|created)\s+/i, '')
              .trim();
            formattedPhrase = formattedPhrase.charAt(0).toUpperCase() + formattedPhrase.slice(1);
            completed.push(`- ${formattedPhrase}`);
          }
        } else {
          // IN PROGRESS
          if (taskNumbers.length > 0) {
            const tasks = taskNumbers.map(t => {
              // Handle ordinal numbers
              const ordinalMatch = phrase.match(new RegExp(`(third|fourth|fifth|sixth|3rd|4th|5th|6th)\\s+(?:one|task)?`, 'i'));
              if (ordinalMatch) {
                const ordinal = ordinalMatch[1].toLowerCase();
                return numberWords[ordinal] ? `Task ${numberWords[ordinal]}` : `Task ${t}`;
              }
              return /^[A-Z]+-\d+$/.test(t) ? t : `Task ${t}`;
            }).join(', ');
            
            if (/started|starting/i.test(phrase)) {
              inProgress.push(`- Started working on ${tasks}`);
            } else if (/will\s+be|by\s+the\s+end|by\s+end|by\s+friday/i.test(phrase)) {
              if (/by\s+the\s+end\s+of\s+(this\s+)?week/i.test(phrase)) {
                inProgress.push(`- Will complete ${tasks} by end of this week`);
              } else {
                inProgress.push(`- Planning to finish ${tasks}`);
              }
            } else if (/testing|developing|working/i.test(phrase)) {
              const action = /testing/i.test(phrase) ? 'Testing' : 
                           /developing/i.test(phrase) ? 'Developing' : 'Working on';
              inProgress.push(`- ${action} ${tasks}`);
            } else {
              inProgress.push(`- Working on ${tasks}`);
            }
          } else {
            // Generic in-progress action
            formattedPhrase = formattedPhrase
              .replace(/^(started|starting|working|testing)\s+/i, '')
              .trim();
            
            if (/will\s+be|by\s+end/i.test(formattedPhrase)) {
              inProgress.push(`- ${formattedPhrase.charAt(0).toUpperCase() + formattedPhrase.slice(1)}`);
            } else {
              formattedPhrase = formattedPhrase.charAt(0).toUpperCase() + formattedPhrase.slice(1);
              inProgress.push(`- Currently ${formattedPhrase.toLowerCase()}`);
            }
          }
        }
      }
    } else {
      // ============================================
      // FALLBACK: NO CLEAR ACTIONS FOUND
      // ============================================
      // Try basic categorization
      const sentences = rawInput.split(/[.!?;]+/).filter(s => s.trim().length > 0);
      
      sentences.forEach(sentence => {
        const lower = sentence.toLowerCase();
        
        if (/finished|completed|done|updated|created/i.test(lower)) {
          let clean = sentence.trim();
          clean = clean.replace(/^(I\s+have\s+|I\s+)/i, '');
          clean = clean.charAt(0).toUpperCase() + clean.slice(1);
          completed.push(`- ${clean}`);
        } else if (/started|working|testing|will|plan/i.test(lower)) {
          let clean = sentence.trim();
          clean = clean.replace(/^(I\s+have\s+|I\s+|I'm\s+)/i, '');
          clean = clean.charAt(0).toUpperCase() + clean.slice(1);
          inProgress.push(`- ${clean}`);
        }
      });
    }
    
    // ============================================
    // STEP 4: ADD SUPPORT
    // ============================================
    if (supportTime) {
      support.push(`- ${supportTime}`);
    }
    
    // ============================================
    // STEP 5: BUILD FINAL OUTPUT
    // ============================================
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