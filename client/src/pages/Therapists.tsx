import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Calendar, Filter } from "lucide-react";
import { useState } from "react";

// Mock Data
const therapists = [
  {
    id: 1,
    name: "Dr. Sarah Mitchell",
    specialty: "Anxiety & Depression",
    rating: 4.9,
    reviews: 124,
    location: "Online / New York",
    availability: "Available Today",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200",
    tags: ["CBT", "Mindfulness", "Trauma-Informed"]
  },
  {
    id: 2,
    name: "James Wilson, LMFT",
    specialty: "Relationship Counseling",
    rating: 4.8,
    reviews: 89,
    location: "Online",
    availability: "Next Available: Tomorrow",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200&h=200",
    tags: ["Couples", "Family Systems", "Communication"]
  },
  {
    id: 3,
    name: "Dr. Emily Chen",
    specialty: "Stress Management",
    rating: 5.0,
    reviews: 56,
    location: "San Francisco",
    availability: "Available Today",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200",
    tags: ["Burnout", "Work-Life Balance", "Meditation"]
  },
  {
    id: 4,
    name: "Michael Ross",
    specialty: "Grief & Loss",
    rating: 4.9,
    reviews: 42,
    location: "Online",
    availability: "Next Available: Fri",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200",
    tags: ["Grief Counseling", "Supportive", "Humanistic"]
  }
];

export default function Therapists() {
  const [filter, setFilter] = useState("All");

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-4 text-primary-foreground">Find a Therapist</h1>
            <p className="text-muted-foreground max-w-xl">
              Connect with licensed professionals who can help you navigate life's challenges.
              Filter by specialty or availability.
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> Filter Results
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {therapists.map((therapist) => (
            <div key={therapist.id} className="bg-card border rounded-2xl p-6 flex flex-col sm:flex-row gap-6 hover:shadow-lg transition-all duration-300">
              <div className="shrink-0">
                <img 
                  src={therapist.image} 
                  alt={therapist.name}
                  className="w-32 h-32 rounded-2xl object-cover shadow-sm"
                />
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold font-serif">{therapist.name}</h3>
                    <p className="text-primary font-medium text-sm">{therapist.specialty}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg text-yellow-700 text-xs font-bold">
                    <Star className="w-3 h-3 fill-current" /> {therapist.rating}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {therapist.location}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {therapist.availability}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {therapist.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-3 mt-auto">
                  <Button className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">Book Session</Button>
                  <Button variant="outline" className="rounded-full">View Profile</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
