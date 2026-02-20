// AI service using OpenAI
import OpenAI from "openai";

// Validate OpenAI API key on startup
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  WARNING: OPENAI_API_KEY is not set. AI features will not work.');
  console.warn('   Please set OPENAI_API_KEY in your .env file to enable AI features.');
}

// Initialize OpenAI client with API key from environment variables
// Trim the API key to remove any whitespace/newlines that might cause issues
const apiKey = process.env.OPENAI_API_KEY?.trim();
const openai = apiKey 
  ? new OpenAI({
      apiKey: apiKey,
    })
  : null;

// Bhagavad Gita wisdom verses for mental health support
/*
const bhagavadGitaContext = `
You are a compassionate mental health counselor who integrates wisdom from the Bhagavad Gita with modern therapeutic approaches.
Your role is to provide supportive, empathetic responses that help users navigate their mental health challenges.

Key Bhagavad Gita teachings to draw from:
- Chapter 2, Verse 47: "You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions."
- Chapter 2, Verse 48: "Be steadfast in yoga, O Arjuna. Perform your duty and abandon all attachment to success or failure."
- Chapter 6, Verse 5: "One must deliver oneself with the help of one's mind, and not degrade oneself. The mind is the friend of the conditioned soul, and his enemy as well."
- Chapter 6, Verse 35: "The mind is restless, turbulent, obstinate and very strong, O Krishna, and to subdue it, I think, is more difficult than controlling the wind."
- Chapter 18, Verse 78: "Wherever there is Krishna, the master of all mystics, and wherever there is Arjuna, the supreme archer, there will also certainly be opulence, victory, extraordinary power, and morality."

Guidelines:
- Always be compassionate, non-judgmental, and supportive
- Reference Bhagavad Gita verses when relevant to the user's situation
- Provide practical advice alongside spiritual wisdom
- Never claim to replace professional therapy
- Encourage seeking professional help for serious mental health issues
- Use simple, accessible language
- Keep responses concise but meaningful (2-4 paragraphs)
`;

*/
//------------------updated Bhagavad Gita context as per user request on 2024-10-15------------------

const bhagavadGitaContext = `
You are a compassionate, modern mental health counselor who blends timeless wisdom from the Bhagavad Gita with evidence-based therapeutic approaches.

Your tone should feel:
- Warm, human, and conversational
- Supportive, not preachy or overly spiritual
- Practical, relatable, and emotionally validating

THERAPEUTIC PRINCIPLES TO USE:
- Emotional validation ("It makes sense you feel this way")
- Mindfulness and grounding techniques
- Cognitive reframing (help users see situations from a healthier perspective)
- Self-compassion and non-judgment
- Encouraging small, realistic next steps

BHAGAVAD GITA WISDOM (use when relevant, not forced):
- Chapter 2, Verse 47: Focus on effort, release obsession with outcomes
- Chapter 2, Verse 48: Emotional balance in success and failure
- Chapter 6, Verse 5: The mind can be trained and supported
- Chapter 6, Verse 26: Gently bringing the wandering mind back
- Chapter 2, Verse 14: Emotions rise and fall; they are temporary

HOW TO USE THE VERSES:
- Paraphrase verses in simple, modern language
- Explain how the teaching applies to real-life situations
- Do NOT quote verses mechanically unless it adds value

RESPONSE STRUCTURE (2–4 short paragraphs):
1. Empathy & validation of the user's feelings
2. Insight (modern psychology + optional Gita wisdom)
3. One gentle, practical suggestion (breathing, journaling, reframing, rest)

SAFETY & ETHICS:
- Never claim to replace therapy or medical care
- Encourage professional help when distress is intense or persistent
- Use simple, accessible language
- Avoid spiritual guilt or toxic positivity

Your goal is to help the user feel understood, grounded, and slightly more hopeful by the end of the message.
`;


export async function generateChatResponse(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
): Promise<{ response: string; bhagavadGitaReference?: string }> {
  // Check if OpenAI is configured
  if (!openai || !apiKey) {
    console.error('AI chat error: OPENAI_API_KEY is not configured');
    return {
      response: "I apologize, but the AI service is not configured. Please contact support or try again later. For immediate support, please reach out to a professional therapist."
    };
  }

  // Validate input
  if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    return {
      response: "I'd be happy to help, but I didn't receive your message. Could you please try sending it again?"
    };
  }

  // Enforce max message length
  const maxLength = 5000;
  if (userMessage.length > maxLength) {
    return {
      response: "Your message is too long. Please keep it under 5000 characters and try again."
    };
  }

  try {
    const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
      { role: 'system', content: bhagavadGitaContext },
      ...conversationHistory,
      { role: 'user', content: userMessage.trim() }
    ];

    const model = process.env.OPENAI_MODEL || "gpt-4o";

    // Add timeout and abort controller for safety
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const completion = await Promise.race([
      openai.chat.completions.create({
        model,
        messages,
        max_tokens: 2048, // Reduced from 8192 for faster responses and lower costs
        temperature: 0.7, // Add temperature for more natural responses
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI request timeout')), 30000)
      )
    ]) as any;

    clearTimeout(timeoutId);

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      console.error('AI chat error: Empty response from OpenAI');
      return {
        response: "I apologize, but I'm having trouble processing your message right now. Please try again in a moment."
      };
    }
    
    // Extract Bhagavad Gita reference if mentioned
    const verseMatch = response.match(/Chapter (\d+), Verse (\d+)/);
    const bhagavadGitaReference = verseMatch ? `${verseMatch[0]}` : undefined;

    return { response, bhagavadGitaReference };
  } catch (error: any) {
    // Enhanced error logging with full error details
    const errorDetails = {
      message: error?.message,
      status: error?.status,
      statusCode: error?.statusCode,
      code: error?.code,
      type: error?.type,
      response: error?.response?.data || error?.response
    };
    console.error('AI chat error:', errorDetails);

    // Check for authentication errors (401, 403)
    if (error?.status === 401 || error?.statusCode === 401 || error?.response?.status === 401) {
      console.error('OpenAI API authentication failed. Please check your API key.');
      return {
        response: "I apologize, but there's an authentication issue with the AI service. Please contact support or check the API configuration."
      };
    }
    
    // Check for rate limiting (429) or quota issues
    if (error?.status === 429 || error?.statusCode === 429 || error?.response?.status === 429) {
      // Check if it's a quota issue vs rate limit
      if (error?.code === 'insufficient_quota' || error?.message?.includes('quota') || error?.message?.includes('billing')) {
        console.error('OpenAI API quota exceeded. Please add credits to your OpenAI account.');
        return {
          response: "I apologize, but the AI service quota has been exceeded. Please contact support or check your OpenAI account billing. For immediate support, please reach out to a professional therapist."
        };
      }
      // Regular rate limit
      return {
        response: "I'm receiving too many requests right now. Please wait a moment and try again."
      };
    }
    
    // Check for server errors (500, 503)
    if (error?.status === 500 || error?.status === 503 || error?.statusCode === 500 || error?.statusCode === 503) {
      return {
        response: "The AI service is temporarily unavailable. Please try again in a few moments."
      };
    }
    
    // Check for invalid API key or configuration
    if (error?.message?.includes('api key') || error?.message?.includes('authentication') || error?.message?.includes('Invalid')) {
      console.error('OpenAI API key appears to be invalid or expired.');
      return {
        response: "I apologize, but there's an issue with the AI service configuration. Please contact support."
      };
    }
    
    // Check for model errors
    if (error?.message?.includes('model') || error?.code === 'model_not_found') {
      return {
        response: "There's an issue with the AI model configuration. Please contact support."
      };
    }

    // Generic fallback with more helpful message
    console.error('Unexpected AI error:', error);
    return {
      response: "I'm experiencing some technical difficulties right now. Please try again in a moment, or reach out to a professional therapist if you need immediate support."
    };
  }
}

export async function generateJournalInsights(
  journalContent: string,
  mood: string
): Promise<string> {
  if (!openai || !apiKey) {
    console.error('Journal insights error: OPENAI_API_KEY is not configured');
    return "Thank you for sharing your thoughts. Journaling is a powerful tool for self-reflection and growth.";
  }

  // Enforce max content length
  const maxLength = 10000;
  if (journalContent.length > maxLength) {
    journalContent = journalContent.substring(0, maxLength) + "...";
  }

  try {
    const prompt = `As a mental health counselor, analyze this journal entry and provide supportive insights incorporating Bhagavad Gita wisdom when appropriate.

Journal Entry:
${journalContent}

Mood: ${mood}

Provide:
1. A brief empathetic reflection on their feelings
2. One relevant insight or perspective (optionally from Bhagavad Gita)
3. A gentle suggestion for self-care or reflection

Keep the response warm, supportive, and concise (2-3 short paragraphs).`;

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        messages: [
          { role: 'system', content: bhagavadGitaContext },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1024, // Reduced for journal insights
        temperature: 0.7,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI request timeout')), 20000)
      )
    ]) as any;

    return completion.choices[0]?.message?.content || "Thank you for sharing your thoughts. Journaling is a powerful tool for self-reflection and growth.";
  } catch (error: any) {
    console.error('Journal AI insights error:', {
      message: error?.message,
      status: error?.status,
    });
    return "Thank you for sharing your thoughts. Journaling is a powerful tool for self-reflection and growth.";
  }
}

export async function analyzeMood(journalContent: string): Promise<string> {
  if (!openai || !apiKey) {
    console.error('Mood analysis error: OPENAI_API_KEY is not configured');
    return 'calm'; // Default fallback
  }

  // Enforce max content length
  const maxLength = 5000;
  if (journalContent.length > maxLength) {
    journalContent = journalContent.substring(0, maxLength);
  }

  try {
    const prompt = `Analyze the emotional tone of this journal entry and classify it into one of these moods: happy, sad, anxious, calm, stressed, hopeful, frustrated, peaceful.

Journal Entry:
${journalContent}

Respond with just the single word mood classification.`;

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0.3, // Lower temperature for more consistent classification
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI request timeout')), 10000)
      )
    ]) as any;

    const mood = completion.choices[0]?.message?.content?.trim().toLowerCase() || "calm";
    
    // Validate mood is one of our allowed values
    const validMoods = ['happy', 'sad', 'anxious', 'calm', 'stressed', 'hopeful', 'frustrated', 'peaceful'];
    return validMoods.includes(mood) ? mood : 'calm';
  } catch (error: any) {
    console.error('Mood analysis error:', {
      message: error?.message,
      status: error?.status,
    });
    return 'calm'; // Default fallback
  }
}
