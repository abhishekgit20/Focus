import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Star, ExternalLink, FileText, Microscope, Heart, Sparkles } from "lucide-react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import { useMemo } from "react";

// This should match the Recommendation type from Recommendations.tsx
type Recommendation = {
  id: number;
  title: string;
  author: string;
  type: "book" | "website" | "article" | "research";
  description: string;
  tags: string[];
  image: string;
  rating: number;
  mindfulnessSummary?: string;
  whyHelpful?: string;
  externalLink?: string;
  buyLink?: string;
};

// Import the same mock database (in production, this would come from an API)
const mockDatabase: Recommendation[] = [
  {
    id: 1,
    title: "The Power of Now",
    author: "Eckhart Tolle",
    type: "book",
    description: "A guide to spiritual enlightenment that emphasizes the importance of living in the present moment.",
    tags: ["Mindfulness", "Spirituality", "Self-Help"],
    image: "https://m.media-amazon.com/images/I/71QlQ1qVQZL._AC_UF894,1000_QL80_.jpg",
    rating: 4.8,
    mindfulnessSummary: "This book offers a profound exploration of how living in the present moment can transform your relationship with anxiety, stress, and emotional pain. Tolle guides readers to recognize the voice in their head as separate from their true self, helping them find peace by observing thoughts rather than being consumed by them.",
    whyHelpful: "Many people find this book helpful for understanding how to step back from anxious thoughts and find calm in the present moment. It offers practical wisdom for those struggling with overthinking, worry, or feeling overwhelmed by life's challenges.",
    externalLink: "https://www.amazon.in/s?k=the+power+of+now+eckhart+tolle",
    buyLink: "https://www.amazon.in/s?k=the+power+of+now+eckhart+tolle"
  },
  {
    id: 2,
    title: "Atomic Habits",
    author: "James Clear",
    type: "book",
    description: "An easy and proven way to build good habits and break bad ones.",
    tags: ["Productivity", "Self-Improvement", "Psychology"],
    image: "https://m.media-amazon.com/images/I/91bYsX41DVL._AC_UF894,1000_QL80_.jpg",
    rating: 4.9,
    mindfulnessSummary: "This book provides a clear framework for understanding how small, consistent changes can lead to remarkable transformations. Clear explains the science behind habit formation and offers practical strategies for building positive routines that support mental wellbeing.",
    whyHelpful: "If you're looking to create healthier routines for self-care, manage stress through consistent practices, or build habits that support your mental health journey, this book offers gentle, evidence-based guidance.",
    externalLink: "https://www.amazon.in/s?k=atomic+habits+james+clear",
    buyLink: "https://www.amazon.in/s?k=atomic+habits+james+clear"
  },
  {
    id: 3,
    title: "Headspace",
    author: "Meditation & Sleep",
    type: "website",
    description: "Your guide to mindfulness for your everyday life. Learn to meditate and live mindfully.",
    tags: ["Meditation", "App", "Wellness"],
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=400&h=600",
    rating: 4.7,
    mindfulnessSummary: "Headspace offers guided meditation sessions designed to help you develop a regular mindfulness practice. The app provides structured courses for managing stress, improving sleep, and cultivating greater awareness in daily life.",
    whyHelpful: "Many people find guided meditation helpful when starting their mindfulness journey. This resource offers a supportive, non-intimidating way to explore meditation at your own pace, with sessions that can fit into even the busiest schedules.",
    externalLink: "https://www.headspace.com"
  },
  {
    id: 4,
    title: "Why We Sleep",
    author: "Matthew Walker",
    type: "book",
    description: "Unlocking the power of sleep and dreams for a healthier life.",
    tags: ["Health", "Science", "Sleep"],
    image: "https://m.media-amazon.com/images/I/81W5D3N0QkL._AC_UF894,1000_QL80_.jpg",
    rating: 4.8,
    mindfulnessSummary: "This book explores the critical role sleep plays in mental health, emotional regulation, and overall wellbeing. Walker presents scientific evidence in an accessible way, helping readers understand how quality sleep supports resilience and emotional balance.",
    whyHelpful: "Understanding the connection between sleep and mental health can be empowering. This resource helps you see how prioritizing rest is an act of self-care, not laziness—something many people find reassuring when struggling with sleep issues.",
    externalLink: "https://www.amazon.in/s?k=why+we+sleep+matthew+walker",
    buyLink: "https://www.amazon.in/s?k=why+we+sleep+matthew+walker"
  },
  {
    id: 5,
    title: "Calm.com",
    author: "Meditation Techniques",
    type: "website",
    description: "The #1 app for sleep and meditation. Join the millions experiencing lower stress and less anxiety.",
    tags: ["Relaxation", "Sleep", "Stress Relief"],
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=400&h=600",
    rating: 4.6,
    mindfulnessSummary: "Calm provides meditation sessions, sleep stories, and breathing exercises designed to help you find moments of peace throughout your day. The app offers resources for managing anxiety, improving sleep quality, and building resilience.",
    whyHelpful: "If you're looking for gentle, accessible ways to manage stress or improve sleep, this resource offers structured support. Many people find the sleep stories particularly helpful for quieting a busy mind at bedtime.",
    externalLink: "https://www.calm.com"
  },
  {
    id: 6,
    title: "Man's Search for Meaning",
    author: "Viktor E. Frankl",
    type: "book",
    description: "A psychiatrist's memoir that has riveted generations of readers with its descriptions of life in Nazi death camps and its lessons for spiritual survival.",
    tags: ["Philosophy", "Psychology", "Classic"],
    image: "https://m.media-amazon.com/images/I/81F5zU5K4KL._AC_UF894,1000_QL80_.jpg",
    rating: 4.9,
    mindfulnessSummary: "This profound work explores how finding meaning in difficult circumstances can provide strength and resilience. Frankl's insights into human psychology offer perspective on how we can choose our response to suffering and find purpose even in dark times.",
    whyHelpful: "For those navigating difficult periods or seeking deeper understanding of resilience, this book offers profound wisdom. Many people find comfort in its message that meaning can be found even in the most challenging circumstances.",
    externalLink: "https://www.amazon.in/s?k=man%27s+search+for+meaning",
    buyLink: "https://www.amazon.in/s?k=man%27s+search+for+meaning"
  },
  {
    id: 7,
    title: "The Bhagavad Gita",
    author: "Vyasa",
    type: "book",
    description: "The timeless spiritual classic on duty, action, and devotion. A dialogue between Prince Arjuna and Lord Krishna offering guidance on how to live a spiritual life.",
    tags: ["Spirituality", "Hinduism", "Wisdom", "Stress Relief"],
    image: "https://m.media-amazon.com/images/I/51f43sie9OL.jpg",
    rating: 5.0,
    mindfulnessSummary: "This ancient text offers timeless wisdom on managing inner conflict, finding purpose, and maintaining equanimity in the face of life's challenges. The dialogue between Arjuna and Krishna provides guidance on how to act with mindfulness and detachment from outcomes.",
    whyHelpful: "For those interested in exploring mindfulness through the lens of Indian spiritual tradition, the Gita offers profound insights. Many people find its teachings on detachment and duty helpful for managing anxiety and stress in modern life.",
    externalLink: "https://www.amazon.in/Shrimad-Bhagvad-Sachitra-Shlokarth-Hardcover/dp/B09B7DFC4V",
    buyLink: "https://www.amazon.in/Shrimad-Bhagvad-Sachitra-Shlokarth-Hardcover/dp/B09B7DFC4V"
  },
  {
    id: 8,
    title: "The Upanishads",
    author: "Various Sages",
    type: "book",
    description: "Ancient texts that explore the nature of reality, the self (Atman), and the universal spirit (Brahman). Essential for deep spiritual inquiry.",
    tags: ["Philosophy", "Ancient Wisdom", "Meditation"],
    image: "https://m.media-amazon.com/images/I/61-OUOKJtDL._SL1400_.jpg",
    rating: 4.9,
    mindfulnessSummary: "These ancient texts explore fundamental questions about consciousness, the nature of suffering, and the path to inner peace. They offer contemplative wisdom that can deepen one's understanding of mindfulness and self-awareness.",
    whyHelpful: "If you're drawn to exploring the philosophical foundations of mindfulness and meditation, these texts offer rich material for reflection. Many people find their insights into the nature of consciousness helpful for deepening their practice.",
    externalLink: "https://www.amazon.in/Upanishads-Eknath-Easwaran/dp/8184950918",
    buyLink: "https://www.amazon.in/Upanishads-Eknath-Easwaran/dp/8184950918"
  },
  {
    id: 9,
    title: "The Yoga Sutras of Patanjali",
    author: "Patanjali",
    type: "book",
    description: "The foundational text of Yoga philosophy, providing a practical guide to mastering the mind and achieving inner peace.",
    tags: ["Yoga", "Meditation", "Mindfulness"],
    image: "https://m.media-amazon.com/images/I/61wBStxDLiL._SL1500_.jpg",
    rating: 4.9,
    mindfulnessSummary: "This foundational text outlines the eight limbs of yoga, providing a comprehensive framework for spiritual practice. It offers practical guidance on meditation, ethical living, and techniques for calming the mind.",
    whyHelpful: "For those interested in understanding the traditional roots of mindfulness and meditation practices, this text offers essential wisdom. Many people find its systematic approach helpful for building a consistent practice.",
    externalLink: "https://www.amazon.in/Yoga-Sutras-Patanjali-Swami-Satchidananda/dp/1938477073",
    buyLink: "https://www.amazon.in/Yoga-Sutras-Patanjali-Swami-Satchidananda/dp/1938477073"
  },
  {
    id: 10,
    title: "Yoga for Anxiety and Depression",
    author: "Harvard Health Publishing",
    type: "article",
    description: "A comprehensive look at how yoga modulation of stress response systems can help reduce anxiety and depression.",
    tags: ["Health", "Science", "Yoga"],
    image: "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?auto=format&fit=crop&q=80&w=400&h=600",
    rating: 4.8,
    mindfulnessSummary: "This article explores the scientific evidence for how yoga practices can support mental health. It discusses how movement, breathwork, and meditation can help regulate the nervous system and reduce symptoms of anxiety and depression.",
    whyHelpful: "If you're curious about the science behind how yoga and mindfulness practices support mental health, this resource offers evidence-based insights. Many people find it helpful to understand the physiological benefits of these practices.",
    externalLink: "https://www.health.harvard.edu/mind-and-mood/yoga-for-anxiety-and-depression"
  },
  {
    id: 11,
    title: "Effectiveness of Gita-based Intervention",
    author: "PLOS ONE",
    type: "research",
    description: "Randomised controlled trial evaluating the effectiveness of a Bhagavad Gita intervention to reduce psychological distress in homeless people.",
    tags: ["Research", "Psychology", "Clinical Study", "Randomised Controlled Trial"],
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=400&h=600",
    rating: 4.7,
    mindfulnessSummary: "This research study examines how teachings from the Bhagavad Gita can be applied in therapeutic contexts to support stress management and reduce psychological distress. It provides evidence for the effectiveness of integrating traditional wisdom with modern mental health approaches through a rigorous randomised controlled trial.",
    whyHelpful: "For those interested in understanding how traditional spiritual texts can inform modern mental health practices, this research offers valuable insights. It demonstrates how ancient wisdom can be applied in practical, evidence-based ways, particularly for vulnerable populations experiencing psychological distress.",
    externalLink: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11537408/"
  },
  {
    id: 12,
    title: "Meditation and Mindfulness in Indian Philosophical Traditions",
    author: "Dr. Rishika Verma - ShodhSamajik",
    type: "article",
    description: "Exploring meditation and mindfulness as integral tools in Indian philosophical traditions for achieving self-awareness, spiritual growth, and liberation (moksha).",
    tags: ["Philosophy", "Mindfulness", "Meditation", "Vedas", "Upanishads", "Yoga"],
    image: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=400&h=600",
    rating: 4.6,
    mindfulnessSummary: "This scholarly article explores the historical, theoretical, and practical dimensions of meditation and mindfulness within key Indian philosophical schools, including Vedanta, Yoga, and Buddhism. Through examining ancient texts and contemporary interpretations, it highlights how these practices have evolved and influenced global thought on well-being and mental health.",
    whyHelpful: "If you're interested in understanding the deep philosophical roots of mindfulness practices in Indian traditions, this academic resource provides valuable insights into how these practices have evolved and influenced contemporary approaches to mental health. It offers a comprehensive exploration of meditation and mindfulness across millennia of Indian philosophical thought.",
    externalLink: "https://shodhsamajik.com/shodhsamajik/article/view/10"
  }
];

export default function ResourceDetail() {
  const [, params] = useRoute("/recommendations/:id");
  const resourceId = params?.id ? parseInt(params.id, 10) : null;

  const resource = useMemo(() => {
    if (!resourceId) return null;
    return mockDatabase.find(r => r.id === resourceId) || null;
  }, [resourceId]);

  const getTypeIcon = (type: Recommendation["type"]) => {
    switch (type) {
      case "book": return <BookOpen className="w-5 h-5" />;
      case "article": return <FileText className="w-5 h-5" />;
      case "research": return <Microscope className="w-5 h-5" />;
      default: return <ExternalLink className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: Recommendation["type"]) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (!resource) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto text-center p-12">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-bold mb-4">Resource Not Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find the resource you're looking for. It may have been moved or removed.
            </p>
            <Link href="/recommendations">
              <Button className="rounded-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Recommendations
              </Button>
            </Link>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Link href="/recommendations">
            <Button variant="ghost" className="mb-6 rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Recommendations
            </Button>
          </Link>

          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid md:grid-cols-2 gap-8 mb-12"
            >
              {/* Image */}
              <div className="relative">
                <div className="sticky top-8">
                  <div className="relative rounded-2xl overflow-hidden shadow-xl bg-muted">
                    <img 
                      src={resource.image} 
                      alt={resource.title}
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {resource.rating}
                    </div>
                    <Badge className="absolute top-4 left-4 bg-primary/90 hover:bg-primary flex items-center gap-1.5">
                      {getTypeIcon(resource.type)} {getTypeLabel(resource.type)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold font-serif mb-3 text-foreground">
                    {resource.title}
                  </h1>
                  <p className="text-xl text-muted-foreground font-medium mb-4">
                    {resource.author}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {resource.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="px-3 py-1">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-lg text-foreground leading-relaxed">
                    {resource.description}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Summary Section */}
            {resource.mindfulnessSummary && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-12"
              >
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-6 h-6 text-primary" />
                      <h2 className="text-2xl font-bold font-serif text-foreground">
                        Mindfulness Summary
                      </h2>
                    </div>
                    <p className="text-lg leading-relaxed text-foreground">
                      {resource.mindfulnessSummary}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Why Helpful Section */}
            {resource.whyHelpful && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mb-12"
              >
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <Heart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <h2 className="text-2xl font-bold font-serif text-foreground">
                        Why This Is Helpful for Mindfulness
                      </h2>
                    </div>
                    <p className="text-lg leading-relaxed text-foreground">
                      {resource.whyHelpful}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 mb-12"
            >
              {resource.type === "book" && resource.buyLink && (
                <Button
                  asChild
                  size="lg"
                  className="rounded-full flex-1 bg-primary hover:bg-primary/90"
                >
                  <a 
                    href={resource.buyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" />
                    If you'd like to explore further, you can find this book here
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
              
              {resource.externalLink && (
                <Button
                  asChild
                  size="lg"
                  variant={resource.type === "book" ? "outline" : "default"}
                  className={`rounded-full flex-1 ${resource.type === "book" ? "" : "bg-primary hover:bg-primary/90"}`}
                >
                  <a 
                    href={resource.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    {resource.type === "book" ? (
                      <>
                        <BookOpen className="w-5 h-5" />
                        Read Full Book
                        <ExternalLink className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-5 h-5" />
                        Access Resource
                        <ExternalLink className="w-4 h-4" />
                      </>
                    )}
                  </a>
                </Button>
              )}
            </motion.div>

            {/* Gentle Note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-center text-sm text-muted-foreground italic mb-8"
            >
              <p>
                Remember: Take what resonates with you, and leave what doesn't. Your journey is unique.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

