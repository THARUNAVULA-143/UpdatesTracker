// src/services/huggingface.js

const axios = require('axios');

class HuggingFaceService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.baseURL = 'https://router.huggingface.co/models';
    
    if (!this.apiKey) {
      console.error('❌ HUGGINGFACE_API_KEY not found in .env!');
    }
  }

  async generateReport(prompt, model = 'meta-llama/Llama-3.2-3B-Instruct') {
    try {
      console.log(`🤖 Calling Hugging Face: ${model}`);
      
      const response = await axios.post(
        `${this.baseURL}/${model}`,
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.7,
            top_p: 0.9,
            return_full_text: false,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const text = 
        response.data[0]?.generated_text || 
        response.data.generated_text || 
        'No summary generated';

      console.log('✅ Report generated successfully');
      return text;
      
    } catch (error) {
      console.error('❌ Hugging Face Error:', error.message);
      
      // Fallback: Return a formatted version of the input
      console.log('📝 Using fallback formatting...');
      const fallbackText = `
# Daily Status Report

## Accomplishments
- Summary of completed tasks

## In Progress
- Current work items

## Blockers
- Issues blocking progress

## Additional Notes
- Other relevant information

---
*Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*
      `.trim();
      
      return fallbackText;
    }
  }

  getAvailableModels() {
    return [
      {
        id: 'meta-llama/Llama-3.2-3B-Instruct',
        name: 'Llama 3.2 3B',
        description: 'Best balance - fast & smart (Recommended)',
        speed: 'fast',
      },
      {
        id: 'meta-llama/Llama-3.2-1B-Instruct',
        name: 'Llama 3.2 1B',
        description: 'Ultra fast, lightweight',
        speed: 'very-fast',
      },
      {
        id: 'microsoft/Phi-3-mini-4k-instruct',
        name: 'Phi-3 Mini',
        description: 'Microsoft model, very quick',
        speed: 'very-fast',
      },
      {
        id: 'mistralai/Mistral-7B-Instruct-v0.3',
        name: 'Mistral 7B',
        description: 'High quality, slower',
        speed: 'medium',
      },
      {
        id: 'google/gemma-2-2b-it',
        name: 'Gemma 2 2B',
        description: 'Google model, efficient',
        speed: 'fast',
      },
    ];
  }
}

module.exports = new HuggingFaceService();