import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Star, ExternalLink, Heart, Sparkles } from "lucide-react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import { useMemo } from "react";

// Book data - source of truth (exact structure as provided)
const books = [
  {
    id: "power-of-now",
    title: "The Power of Now",
    author: "Eckhart Tolle",
    imageUrl: "https://m.media-amazon.com/images/I/51d7LooDKlL._SL1000_.jpg",
    summaryRoute: "/reads/power-of-now",
    buyLink: "https://www.amazon.in/dp/0340733500",
    // Additional fields for UI
    mindfulnessSummary: "This book offers a profound exploration of how living in the present moment can transform your relationship with anxiety, stress, and emotional pain. Tolle guides readers to recognize the voice in their head as separate from their true self, helping them find peace by observing thoughts rather than being consumed by them.",
    whyHelpful: "Many people find this book helpful for understanding how to step back from anxious thoughts and find calm in the present moment. It offers practical wisdom for those struggling with overthinking, worry, or feeling overwhelmed by life's challenges.",
    tags: ["Mindfulness", "Spirituality", "Self-Help"],
    rating: 4.8
  },
  {
    id: "atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    imageUrl: "https://m.media-amazon.com/images/I/817HaeblezL._SL1500_.jpg",
    summaryRoute: "/reads/atomic-habits",
    buyLink: "https://www.amazon.in/dp/1847941834",
    mindfulnessSummary: "This book provides a clear framework for understanding how small, consistent changes can lead to remarkable transformations. Clear explains the science behind habit formation and offers practical strategies for building positive routines that support mental wellbeing.",
    whyHelpful: "If you're looking to create healthier routines for self-care, manage stress through consistent practices, or build habits that support your mental health journey, this book offers gentle, evidence-based guidance.",
    tags: ["Productivity", "Self-Improvement", "Psychology"],
    rating: 4.9
  },
  {
    id: "why-we-sleep",
    title: "Why We Sleep",
    author: "Matthew Walker",
    imageUrl: "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1556604137l/34466963.jpg",
    summaryRoute: "/reads/why-we-sleep",
    buyLink: "https://www.amazon.in/dp/0141983760",
    mindfulnessSummary: "This book explores the critical role sleep plays in mental health, emotional regulation, and overall wellbeing. Walker presents scientific evidence in an accessible way, helping readers understand how quality sleep supports resilience and emotional balance.",
    whyHelpful: "Understanding the connection between sleep and mental health can be empowering. This resource helps you see how prioritizing rest is an act of self-care, not laziness—something many people find reassuring when struggling with sleep issues.",
    tags: ["Health", "Science", "Sleep"],
    rating: 4.8
  },
  {
    id: "mans-search-for-meaning",
    title: "Man's Search for Meaning",
    author: "Viktor E. Frankl",
    imageUrl: "https://m.media-amazon.com/images/I/71dhcyg+THL._SL1500_.jpg",
    summaryRoute: "/reads/mans-search-for-meaning",
    buyLink: "https://www.amazon.in/dp/1844132390",
    mindfulnessSummary: "This profound work explores how finding meaning in difficult circumstances can provide strength and resilience. Frankl's insights into human psychology offer perspective on how we can choose our response to suffering and find purpose even in dark times.",
    whyHelpful: "For those navigating difficult periods or seeking deeper understanding of resilience, this book offers profound wisdom. Many people find comfort in its message that meaning can be found even in the most challenging circumstances.",
    tags: ["Philosophy", "Psychology", "Classic"],
    rating: 4.9
  },
  {
    id: "bhagavad-gita",
    title: "The Bhagavad Gita",
    author: "Vyasa",
    imageUrl: "https://m.media-amazon.com/images/I/51f43sie9OL.jpg",
    summaryRoute: "/reads/bhagavad-gita",
    buyLink: "https://www.amazon.in/Shrimad-Bhagvad-Sachitra-Shlokarth-Hardcover/dp/B09B7DFC4V",
    mindfulnessSummary: "This ancient text offers timeless wisdom on managing inner conflict, finding purpose, and maintaining equanimity in the face of life's challenges. The dialogue between Arjuna and Krishna provides guidance on how to act with mindfulness and detachment from outcomes.",
    whyHelpful: "For those interested in exploring mindfulness through the lens of Indian spiritual tradition, the Gita offers profound insights. Many people find its teachings on detachment and duty helpful for managing anxiety and stress in modern life.",
    tags: ["Spirituality", "Hinduism", "Wisdom", "Stress Relief"],
    rating: 5.0
  },
  {
    id: "upanishads",
    title: "The Upanishads",
    author: "Various Sages",
    imageUrl: "https://m.media-amazon.com/images/I/61-OUOKJtDL._SL1400_.jpg",
    summaryRoute: "/reads/upanishads",
    buyLink: "https://www.amazon.in/Upanishads-Eknath-Easwaran/dp/8184950918",
    mindfulnessSummary: "These ancient texts explore fundamental questions about consciousness, the nature of suffering, and the path to inner peace. They offer contemplative wisdom that can deepen one's understanding of mindfulness and self-awareness.",
    whyHelpful: "If you're drawn to exploring the philosophical foundations of mindfulness and meditation, these texts offer rich material for reflection. Many people find their insights into the nature of consciousness helpful for deepening their practice.",
    tags: ["Philosophy", "Ancient Wisdom", "Meditation"],
    rating: 4.9
  },
  {
    id: "yoga-sutras",
    title: "The Yoga Sutras of Patanjali",
    author: "Patanjali",
    imageUrl: "https://m.media-amazon.com/images/I/61wBStxDLiL._SL1500_.jpg",
    summaryRoute: "/reads/yoga-sutras",
    buyLink: "https://www.amazon.in/Yoga-Sutras-Patanjali-Swami-Satchidananda/dp/1938477073",
    mindfulnessSummary: "This foundational text outlines the eight limbs of yoga, providing a comprehensive framework for spiritual practice. It offers practical guidance on meditation, ethical living, and techniques for calming the mind.",
    whyHelpful: "For those interested in understanding the traditional roots of mindfulness and meditation practices, this text offers essential wisdom. Many people find its systematic approach helpful for building a consistent practice.",
    tags: ["Yoga", "Meditation", "Mindfulness"],
    rating: 4.9
  }
];

export default function ReadsDetail() {
  const [, params] = useRoute("/reads/:id");
  const bookId = params?.id;

  const book = useMemo(() => {
    if (!bookId) return null;
    return books.find(b => b.id === bookId) || null;
  }, [bookId]);

  if (!book) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto text-center p-12">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-bold mb-4">Book Not Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find the book you're looking for. It may have been moved or removed.
            </p>
            <Link href="/recommendations">
              <Button className="rounded-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reads
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
              Back to Reads
            </Button>
          </Link>

          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid md:grid-cols-2 gap-8 mb-12"
            >
              {/* Book Cover */}
              <div className="relative">
                <div className="sticky top-8">
                  <div className="relative rounded-2xl overflow-hidden shadow-xl bg-muted flex items-center justify-center min-h-[400px]">
                    <img 
                      src={book.imageUrl} 
                      alt={`${book.title} by ${book.author}`}
                      className="w-full h-auto max-h-[600px] object-contain"
                      onError={(e) => {
                        // Fallback if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.src = "https://via.placeholder.com/400x600?text=Book+Cover";
                        target.className = "w-full h-auto max-h-[600px] object-contain";
                      }}
                      onLoad={(e) => {
                        // Ensure image displays properly
                        const target = e.target as HTMLImageElement;
                        target.style.display = "block";
                      }}
                      loading="eager"
                    />
                    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {book.rating}
                    </div>
                    <Badge className="absolute top-4 left-4 bg-primary/90 hover:bg-primary flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" /> Book
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold font-serif mb-3 text-foreground">
                    {book.title}
                  </h1>
                  <p className="text-xl text-muted-foreground font-medium mb-4">
                    {book.author}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {book.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="px-3 py-1">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Mindfulness Summary Section */}
            {book.mindfulnessSummary && (
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
                      {book.mindfulnessSummary}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Why Helpful Section */}
            {book.whyHelpful && (
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
                        Why This Book Helps Mental Wellbeing
                      </h2>
                    </div>
                    <p className="text-lg leading-relaxed text-foreground">
                      {book.whyHelpful}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Action Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-12"
            >
              <Button
                asChild
                size="lg"
                className="rounded-full w-full sm:w-auto bg-primary hover:bg-primary/90"
              >
                <a 
                  href={book.buyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  If you'd like to explore further, you can find this book here
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
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

