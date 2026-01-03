// AI service using OpenAI
import OpenAI from "openai";

// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Bhagavad Gita wisdom verses for mental health support
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

export async function generateChatResponse(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
): Promise<{ response: string; bhagavadGitaReference?: string }> {
  try {
    const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
      { role: 'system', content: bhagavadGitaContext },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o", // Use OPENAI_MODEL env var or default to gpt-4o
      messages,
      max_tokens: 8192,
    });

    const response = completion.choices[0]?.message?.content || "I apologize, but I'm having trouble processing your message right now. Please try again.";
    
    // Extract Bhagavad Gita reference if mentioned
    const verseMatch = response.match(/Chapter (\d+), Verse (\d+)/);
    const bhagavadGitaReference = verseMatch ? `${verseMatch[0]}` : undefined;

    return { response, bhagavadGitaReference };
  } catch (error) {
    console.error('AI chat error:', error);
    return {
      response: "I'm having some technical difficulties right now. Please try again in a moment, or reach out to a professional therapist if you need immediate support."
    };
  }
}

export async function generateJournalInsights(
  journalContent: string,
  mood: string
): Promise<string> {
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

    const completion = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        { role: 'system', content: bhagavadGitaContext },
        { role: 'user', content: prompt }
      ],
      max_tokens: 8192,
    });

    return completion.choices[0]?.message?.content || "Thank you for sharing your thoughts. Journaling is a powerful tool for self-reflection and growth.";
  } catch (error) {
    console.error('Journal AI insights error:', error);
    return "Thank you for sharing your thoughts. Journaling is a powerful tool for self-reflection and growth.";
  }
}

export async function analyzeMood(journalContent: string): Promise<string> {
  try {
    const prompt = `Analyze the emotional tone of this journal entry and classify it into one of these moods: happy, sad, anxious, calm, stressed, hopeful, frustrated, peaceful.

Journal Entry:
${journalContent}

Respond with just the single word mood classification.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 10,
    });

    const mood = completion.choices[0]?.message?.content?.trim().toLowerCase() || "calm";
    
    // Validate mood is one of our allowed values
    const validMoods = ['happy', 'sad', 'anxious', 'calm', 'stressed', 'hopeful', 'frustrated', 'peaceful'];
    return validMoods.includes(mood) ? mood : 'calm';
  } catch (error) {
    console.error('Mood analysis error:', error);
    return 'calm';
  }
}
