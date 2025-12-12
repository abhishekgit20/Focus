import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import heroImg from "@assets/generated_images/cozy_reading_recommendation_hero.png";
import { Search, BookOpen, Star, Sparkles, ExternalLink, Loader2, FileText, Microscope } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

type Recommendation = {
  id: number;
  title: string;
  author: string;
  type: "book" | "website" | "article" | "research";
  description: string;
  tags: string[];
  image: string;
  rating: number;
};

const mockDatabase: Recommendation[] = [
  {
    id: 1,
    title: "The Power of Now",
    author: "Eckhart Tolle",
    type: "book",
    description: "A guide to spiritual enlightenment that emphasizes the importance of living in the present moment.",
    tags: ["Mindfulness", "Spirituality", "Self-Help"],
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=200&h=300",
    rating: 4.8
  },
  {
    id: 2,
    title: "Atomic Habits",
    author: "James Clear",
    type: "book",
    description: "An easy and proven way to build good habits and break bad ones.",
    tags: ["Productivity", "Self-Improvement", "Psychology"],
    image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=200&h=300",
    rating: 4.9
  },
  {
    id: 3,
    title: "Headspace",
    author: "Meditation & Sleep",
    type: "website",
    description: "Your guide to mindfulness for your everyday life. Learn to meditate and live mindfully.",
    tags: ["Meditation", "App", "Wellness"],
    image: "https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?auto=format&fit=crop&q=80&w=200&h=300",
    rating: 4.7
  },
  {
    id: 4,
    title: "Why We Sleep",
    author: "Matthew Walker",
    type: "book",
    description: "Unlocking the power of sleep and dreams for a healthier life.",
    tags: ["Health", "Science", "Sleep"],
    image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=200&h=300",
    rating: 4.8
  },
  {
    id: 5,
    title: "Calm.com",
    author: "Meditation Techniques",
    type: "website",
    description: "The #1 app for sleep and meditation. Join the millions experiencing lower stress and less anxiety.",
    tags: ["Relaxation", "Sleep", "Stress Relief"],
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=200&h=300",
    rating: 4.6
  },
  {
    id: 6,
    title: "Man's Search for Meaning",
    author: "Viktor E. Frankl",
    type: "book",
    description: "A psychiatrist's memoir that has riveted generations of readers with its descriptions of life in Nazi death camps and its lessons for spiritual survival.",
    tags: ["Philosophy", "Psychology", "Classic"],
    image: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=200&h=300",
    rating: 4.9
  },
  {
    id: 7,
    title: "The Bhagavad Gita",
    author: "Vyasa",
    type: "book",
    description: "The timeless spiritual classic on duty, action, and devotion. A dialogue between Prince Arjuna and Lord Krishna offering guidance on how to live a spiritual life.",
    tags: ["Spirituality", "Hinduism", "Wisdom", "Stress Relief"],
    image: "https://images.unsplash.com/photo-1602133185181-4b9535d7c329?auto=format&fit=crop&q=80&w=200&h=300",
    rating: 5.0
  },
  {
    id: 8,
    title: "The Upanishads",
    author: "Various Sages",
    type: "book",
    description: "Ancient texts that explore the nature of reality, the self (Atman), and the universal spirit (Brahman). Essential for deep spiritual inquiry.",
    tags: ["Philosophy", "Ancient Wisdom", "Meditation"],
    image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=200&h=300",
    rating: 4.9
  },
  {
    id: 9,
    title: "The Yoga Sutras of Patanjali",
    author: "Patanjali",
    type: "book",
    description: "The foundational text of Yoga philosophy, providing a practical guide to mastering the mind and achieving inner peace.",
    tags: ["Yoga", "Meditation", "Mindfulness"],
    image: "https://images.unsplash.com/photo-1599447421405-0c1a1571550c?auto=format&fit=crop&q=80&w=200&h=300",
    rating: 4.9
  },
  {
    id: 10,
    title: "Yoga for Anxiety and Depression",
    author: "Harvard Health Publishing",
    type: "article",
    description: "A comprehensive look at how yoga modulation of stress response systems can help reduce anxiety and depression.",
    tags: ["Health", "Science", "Yoga"],
    image: "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?auto=format&fit=crop&q=80&w=200&h=300",
    rating: 4.8
  },
  {
    id: 11,
    title: "Effectiveness of Gita-based Intervention",
    author: "Journal of Religion & Health",
    type: "research",
    description: "Clinical study on the impact of Bhagavad Gita teachings on stress levels in medical students.",
    tags: ["Research", "Psychology", "Clinical Study"],
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=200&h=300",
    rating: 4.7
  },
  {
    id: 12,
    title: "Mindfulness in Indian Scripture",
    author: "Psychology Today",
    type: "article",
    description: "Exploring the roots of modern mindfulness practices in ancient Hindu and Buddhist texts.",
    tags: ["History", "Mindfulness", "Culture"],
    image: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=200&h=300",
    rating: 4.6
  }
];

export default function Recommendations() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Recommendation[]>(mockDatabase);

  const handleSearch = () => {
    setIsSearching(true);
    // Simulate AI search delay
    setTimeout(() => {
      if (!query.trim()) {
        setResults(mockDatabase);
      } else {
        // Improved search logic: Split query into keywords and check for matches
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2); // Ignore very short words
        
        if (searchTerms.length === 0) {
           // If only short words were typed, fall back to exact substring match of original query
           const filtered = mockDatabase.filter(item => 
             item.title.toLowerCase().includes(query.toLowerCase()) ||
             item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())) ||
             item.description.toLowerCase().includes(query.toLowerCase())
           );
           setResults(filtered);
        } else {
           // Filter items that match ANY of the significant search terms
           const filtered = mockDatabase.filter(item => {
             const itemText = `${item.title} ${item.description} ${item.tags.join(' ')}`.toLowerCase();
             return searchTerms.some(term => itemText.includes(term));
           });
           setResults(filtered);
        }
      }
      setIsSearching(false);
    }, 1500);
  };

  const getTypeIcon = (type: Recommendation["type"]) => {
    switch (type) {
      case "book": return <BookOpen className="w-4 h-4" />;
      case "article": return <FileText className="w-4 h-4" />;
      case "research": return <Microscope className="w-4 h-4" />;
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: Recommendation["type"]) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <PageTransition>
      <div className="relative overflow-hidden">
        
        {/* Hero Section */}
        <section className="relative h-[400px] flex items-center justify-center">
          <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/90 z-10" />
            <img 
              src={heroImg} 
              alt="Reading Corner" 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="container mx-auto px-4 relative z-20 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-serif text-foreground">
              Mindful Recommendations
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Discover books, articles, and research curated to bring peace, clarity, and growth to your life.
            </p>
            
            <div className="max-w-xl mx-auto flex gap-2 relative">
              <Input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search topics (e.g., Yoga, Gita, Stress)..."
                className="h-14 pl-6 rounded-full shadow-lg text-lg bg-background/80 backdrop-blur-sm border-primary/20 focus-visible:ring-primary"
              />
              <Button 
                onClick={handleSearch}
                size="icon" 
                className="absolute right-2 top-2 h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
              >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="py-16 container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold font-serif">Curated For You</h2>
            <Badge variant="outline" className="px-3 py-1">
              {results.length} Resources Found
            </Badge>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>No specific matches found. Try "Mindfulness" or "Stress".</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {results.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full"
                >
                  <div className="relative h-48 overflow-hidden bg-muted">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {item.rating}
                    </div>
                    <Badge className="absolute top-4 left-4 bg-primary/90 hover:bg-primary flex items-center gap-1">
                      {getTypeIcon(item.type)} {getTypeLabel(item.type)}
                    </Badge>
                  </div>
                  
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold font-serif mb-1 group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="text-sm font-medium text-muted-foreground mb-3">{item.author}</p>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-grow">
                      {item.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      {item.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary-foreground font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <Button variant="outline" className="w-full rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      Read {item.type === 'book' ? 'Summary' : 'Now'} <ExternalLink className="ml-2 w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
