export interface GitaVerse {
  chapter: number;
  verse: number;
  text: string;
  translation: string;
  purport: string;
}

export const GITA_VERSES: Record<string, GitaVerse[]> = {
  "stress": [
    {
      chapter: 2,
      verse: 47,
      text: "कर्मణ్యేవాధికారస్తే मा फलेषु कदाचन | मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ||",
      translation: "You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions. Never consider yourself to be the cause of the results of your activities, nor be attached to inaction.",
      purport: "Stress often comes from worrying about outcomes we cannot control. Focus on the effort, not the result."
    },
    {
      chapter: 6,
      verse: 26,
      text: "यतो यतो निश्चरति मनश्चञ्चलमस्थिरम् | ततस्ततो नियम्यैतदात्मन्येव वशं नयेत् ||",
      translation: "From whatever and wherever the mind wanders due to its flickering and unsteady nature, one must certainly withdraw it and bring it back under the control of the Self.",
      purport: "Anxiety is the mind wandering into the future. Bring it back to the present moment through mindfulness."
    }
  ],
  "anger": [
    {
      chapter: 2,
      verse: 63,
      text: "क्रोधाद्भवति सम्मोह: सम्मोहात्स्मृतिविभ्रम: | स्मृतिभ्रंशाद्बुद्धिनाशो बुद्धिनाशात्प्रणश्यति ||",
      translation: "From anger, delusion arises, and from delusion, bewilderment of memory. When memory is bewildered, intelligence is lost, and when intelligence is lost, one falls down again into the material pool.",
      purport: "Anger clouds judgment. When you feel angry, pause and breathe. Do not act from a place of delusion."
    }
  ],
  "confusion": [
    {
      chapter: 18,
      verse: 66,
      text: "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज | अहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुच: ||",
      translation: "Abandon all varieties of religion and just surrender unto Me. I shall deliver you from all sinful reaction. Do not fear.",
      purport: "When confused by too many choices or duties, surrender to your higher purpose and inner truth. Simplicity brings clarity."
    }
  ],
  "grief": [
    {
      chapter: 2,
      verse: 22,
      text: "वासांसि जीर्णानि यथा विहाय नवानि गृह्णाति नरोऽपराणि | तथा शरीराणि विहाय जीर्णान्यन्यानि संयाति नवानि देही ||",
      translation: "As a person puts on new garments, giving up old ones, similarly, the soul accepts new material bodies, giving up the old and useless ones.",
      purport: "The soul is eternal. Grief is for the temporary body, but the essence of life never ceases to exist."
    }
  ],
  "focus": [
    {
      chapter: 6,
      verse: 6,
      text: "बन्धुरात्मात्मनस्तस्य येनात्मैवात्मना जित: | अनात्मनस्तु शत्रुत्वे वर्ते तात्मैव शत्रुवत् ||",
      translation: "For him who has conquered the mind, the mind is the best of friends; but for one who has failed to do so, his very mind will be the greatest enemy.",
      purport: "Master your mind through discipline, and it will serve you. Let it run wild, and it will destroy your peace."
    }
  ]
};

export const FALLBACK_QUOTES = [
  "The mind is everything. What you think you become.",
  "Peace comes from within. Do not seek it without.",
  "Change is the law of the universe. You can be a millionaire, or a pauper in an instant.",
  "You are what you believe in. You become that which you believe you can become."
];
