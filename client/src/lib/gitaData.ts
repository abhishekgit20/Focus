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
    },
    {
      chapter: 16,
      verse: 21,
      text: "त्रिविधं नरकस्येदं द्वारं नाशनमात्मनः | कामः क्रोधस्तथा लोभस्तस्मादेतत्त्रयं त्यजेत् ||",
      translation: "There are three gates leading to this hell—lust, anger, and greed. Every sane man should give these up, for they lead to the degradation of the soul.",
      purport: "Anger is described as a gateway to self-destruction. Recognizing it as a trap helps us step away from it."
    }
  ],
  "confusion": [
    {
      chapter: 18,
      verse: 66,
      text: "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज | अहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुच: ||",
      translation: "Abandon all varieties of religion and just surrender unto Me. I shall deliver you from all sinful reaction. Do not fear.",
      purport: "When confused by too many choices or duties, surrender to your higher purpose and inner truth. Simplicity brings clarity."
    },
    {
      chapter: 2,
      verse: 7,
      text: "कार्पण्यदोषोपहतस्वभावः पृच्छामि त्वां धर्मसम्मूढचेताः | यच्छ्रेयः स्यान्निश्चितं ब्रूहि तन्मे शिष्यस्तेऽहं शाधि मां त्वां प्रपन्नम् ||",
      translation: "Now I am confused about my duty and have lost all composure because of miserly weakness. In this condition I am asking You to tell me for certain what is best for me. Now I am Your disciple, and a soul surrendered unto You. Please instruct me.",
      purport: "Admitting confusion is the first step to wisdom. Seek guidance from a mentor or your inner self when the path is unclear."
    }
  ],
  "grief": [
    {
      chapter: 2,
      verse: 22,
      text: "वासांसि जीर्णानि यथा विहाय नवानि गृह्णाति नरोऽपराणि | तथा शरीराणि विहाय जीर्णान्यन्यानि संयाति नवानि देही ||",
      translation: "As a person puts on new garments, giving up old ones, similarly, the soul accepts new material bodies, giving up the old and useless ones.",
      purport: "The soul is eternal. Grief is for the temporary body, but the essence of life never ceases to exist."
    },
    {
      chapter: 2,
      verse: 27,
      text: "जातस्य हि ध्रुवो मृत्युर्ध्रुवं जन्म मृतस्य च | तस्मादपरिहार्येऽर्थे न त्वं शोचितुमर्हसि ||",
      translation: "One who has taken his birth is sure to die, and after death one is sure to take birth again. Therefore, in the unavoidable discharge of your duty, you should not lament.",
      purport: "Change and loss are inevitable parts of the cycle of life. Accepting this truth helps us find peace amidst sorrow."
    }
  ],
  "focus": [
    {
      chapter: 6,
      verse: 6,
      text: "बन्धुरात्मात्मनस्तस्य येनात्मैवात्मना जित: | अनात्मनस्तु शत्रुत्वे वर्ते तात्मैव शत्रुवत् ||",
      translation: "For him who has conquered the mind, the mind is the best of friends; but for one who has failed to do so, his very mind will be the greatest enemy.",
      purport: "Master your mind through discipline, and it will serve you. Let it run wild, and it will destroy your peace."
    },
    {
      chapter: 6,
      verse: 35,
      text: "असंशयं महाबाहो मनो दुर्निग्रहं चलम् | अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते ||",
      translation: "O mighty-armed son of Kunti, it is undoubtedly very difficult to curb the restless mind, but it is possible by suitable practice and by detachment.",
      purport: "Focus is a muscle. It is built through consistent practice (Abhyasa) and letting go of distractions (Vairagya)."
    }
  ],
  "depression": [
    {
      chapter: 6,
      verse: 5,
      text: "उद्धरेदात्मनात्मानं नात्मानमवसादयेत् | आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ||",
      translation: "One must deliver himself with the help of his mind, and not degrade himself. The mind is the friend of the conditioned soul, and his enemy as well.",
      purport: "You have the power to lift yourself up. Do not let your mind be your enemy. Be your own best friend."
    },
    {
      chapter: 2,
      verse: 14,
      text: "मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः | आगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत ||",
      translation: "O son of Kunti, the nonpermanent appearance of happiness and distress, and their disappearance in due course, are like the appearance and disappearance of winter and summer seasons. They arise from sense perception, and one must learn to tolerate them without being disturbed.",
      purport: "This too shall pass. Emotions are like weather; they come and go. Endure them with patience, knowing the sun will shine again."
    }
  ],
  "fear": [
    {
      chapter: 4,
      verse: 10,
      text: "वीतरागभयक्रोधा मन्मया मामुपाश्रिताः | बहवो ज्ञानतपसा पूता मद्भावमागताः ||",
      translation: "Being freed from attachment, fear and anger, being fully absorbed in Me and taking refuge in Me, many, many persons in the past became purified by knowledge of Me—and thus they all attained transcendental love for Me.",
      purport: "Fear disappears when we trust in a higher power or the cosmic order. You are supported by the universe."
    }
  ],
  "failure": [
    {
      chapter: 2,
      verse: 48,
      text: "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय | सिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते ||",
      translation: "Perform your duty equipoised, O Arjuna, abandoning all attachment to success or failure. Such equanimity is called yoga.",
      purport: "True success is not winning, but maintaining your balance. Do not let failure define your worth. Keep acting."
    }
  ],
  "loneliness": [
    {
      chapter: 6,
      verse: 29,
      text: "सर्वभूतस्थमात्मानं सर्वभूतानि चात्मनि | ईक्षते योगयुक्तात्मा सर्वत्र समदर्शनः ||",
      translation: "A true yogi observes Me in all beings and also sees every being in Me. Indeed, the self-realized person sees Me, the same Supreme Lord, everywhere.",
      purport: "You are never truly alone. The divine spark that is within you is also within everyone else. We are all connected."
    }
  ],
  "envy": [
    {
      chapter: 12,
      verse: 13,
      text: "अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च | निर्ममो निरहङ्कारः समदुःखसुखः क्षमी ||",
      translation: "One who is not envious but is a kind friend to all living entities, who does not think himself a proprietor and is free from false ego, who is equal in both happiness and distress, who is tolerant... is very dear to Me.",
      purport: "Envy burns the holder. Celebrate the success of others, and you will find your own heart becoming lighter."
    }
  ]
};

export const FALLBACK_QUOTES = [
  "The mind is everything. What you think you become.",
  "Peace comes from within. Do not seek it without.",
  "Change is the law of the universe. You can be a millionaire, or a pauper in an instant.",
  "You are what you believe in. You become that which you believe you can become.",
  "There is nothing lost or wasted in this life.",
  "Calmness, gentleness, silence, self-restraint, and purity: these are the disciplines of the mind."
];

export const TOPIC_KEYWORDS: Record<string, string[]> = {
  "stress": ["stress", "anxi", "worry", "tense", "pressure", "overwhelm", "burden", "panic"],
  "anger": ["ang", "rage", "mad", "furious", "irritat", "temper", "hate"],
  "confusion": ["confus", "lost", "decid", "unsure", "doubt", "direction", "choice"],
  "grief": ["grief", "sad", "cry", "loss", "death", "mourn", "sorrow", "pain", "heartbreak"],
  "focus": ["focus", "mind", "distract", "concentrate", "study", "work", "attention"],
  "depression": ["depress", "low", "hopeless", "dark", "suicid", "give up", "tired", "empty"],
  "fear": ["fear", "scared", "afraid", "terrifi", "phobia", "nervous"],
  "failure": ["fail", "mistake", "lose", "defeat", "reject", "wrong"],
  "loneliness": ["lone", "alone", "isolat", "friendless", "abandon"],
  "envy": ["envy", "jealous", "covet", "resent", "compar"]
};

// Helper to find the best matching topic
export const findTopic = (text: string): string | null => {
  const lowerText = text.toLowerCase();
  
  // Check against all keyword lists
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(k => lowerText.includes(k))) {
      return topic;
    }
  }
  
  return null;
};

// Helper to get a random verse for a topic
export const getVerseForTopic = (topic: string): GitaVerse | null => {
  const verses = GITA_VERSES[topic];
  if (!verses || verses.length === 0) return null;
  return verses[Math.floor(Math.random() * verses.length)];
};

// Helper to generate a complete AI response object
export const generateAIResponse = (userText: string) => {
  const topic = findTopic(userText);
  
  if (topic) {
    const verse = getVerseForTopic(topic);
    if (verse) {
      return {
        text: verse.translation,
        sanskrit: verse.text,
        purport: verse.purport,
        source: `Bhagavad Gita ${verse.chapter}.${verse.verse}`,
        topic: topic
      };
    }
  }
  
  // Fallback
  const randomQuote = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  return {
    text: randomQuote,
    source: "Ancient Wisdom",
    purport: "Sometimes, general wisdom is what we need most to find our center again."
  };
};
