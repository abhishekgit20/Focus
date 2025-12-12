import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Calendar, Filter, IndianRupee } from "lucide-react";
import { useState } from "react";
import { FilterPanel } from "@/components/FilterPanel";

// Mock Data - Indian Context
const professionals = [
  {
    id: 1,
    name: "Dr. Ananya Sharma",
    title: "Clinical Psychologist",
    specialty: "Anxiety & Stress",
    rating: 4.9,
    reviews: 124,
    location: "Mumbai, Maharashtra",
    availability: "Available Today",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200",
    tags: ["Hindi", "English", "CBT"],
    price: "₹800/session"
  },
  {
    id: 2,
    name: "Guru Rajesh Kumar",
    title: "Yoga & Meditation Instructor",
    specialty: "Mindfulness & Breathwork",
    rating: 5.0,
    reviews: 210,
    location: "Rishikesh (Online Available)",
    availability: "Next Class: 5 PM",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200&h=200",
    tags: ["Hatha Yoga", "Vedic Wisdom", "Stress Relief"],
    price: "₹500/session"
  },
  {
    id: 3,
    name: "Dr. Arjun Mehta",
    title: "Psychiatrist",
    specialty: "Depression & Mood Disorders",
    rating: 4.8,
    reviews: 89,
    location: "Bangalore, Karnataka",
    availability: "Tomorrow",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200&h=200",
    tags: ["Medication Management", "English", "Kannada"],
    price: "₹1200/consultation"
  },
  {
    id: 4,
    name: "Priya Patel",
    title: "Therapist",
    specialty: "Family & Relationship",
    rating: 4.9,
    reviews: 56,
    location: "Ahmedabad, Gujarat",
    availability: "Available Today",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200",
    tags: ["Gujarati", "Hindi", "Counseling"],
    price: "₹700/session"
  }
];

export default function Therapists() {
  const [filter, setFilter] = useState("All");

  const filteredProfessionals = professionals.filter(prof => {
    if (filter === "All") return true;
    if (filter === "Psychologists") {
      return ["Clinical Psychologist", "Psychiatrist", "Therapist"].includes(prof.title);
    }
    if (filter === "Yoga Gurus") {
      return prof.title.includes("Yoga");
    }
    return true;
  });

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-4 text-foreground font-serif">Our Professionals</h1>
            <p className="text-muted-foreground max-w-xl">
              Access verified Psychiatrists, Psychologists, Therapists, and Yoga Gurus.
              Filter by language, specialization, or price.
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={filter === "All" ? "default" : "outline"}
              onClick={() => setFilter("All")}
              className="gap-2"
            >
              All
            </Button>
            <Button 
              variant={filter === "Psychologists" ? "default" : "outline"}
              onClick={() => setFilter("Psychologists")}
              className="gap-2"
            >
              Psychologists
            </Button>
            <Button 
              variant={filter === "Yoga Gurus" ? "default" : "outline"}
              onClick={() => setFilter("Yoga Gurus")}
              className="gap-2"
            >
              Yoga Gurus
            </Button>
            <FilterPanel />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {filteredProfessionals.map((prof) => (
            <div key={prof.id} className="bg-card border rounded-2xl p-6 flex flex-col sm:flex-row gap-6 hover:shadow-lg transition-all duration-300 group">
              <div className="shrink-0 relative">
                <img 
                  src={prof.image} 
                  alt={prof.name}
                  className="w-32 h-32 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                />
                <div className="absolute -bottom-2 -right-2 bg-white px-2 py-1 rounded-lg shadow-sm border text-xs font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {prof.rating}
                </div>
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="text-xl font-bold font-serif">{prof.name}</h3>
                    <p className="text-primary font-medium text-sm">{prof.title}</p>
                  </div>
                  <div className="text-sm font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                    {prof.price}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">{prof.specialty}</p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {prof.location}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {prof.availability}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {prof.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted font-normal text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-3 mt-auto">
                  <Button className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm">Book Appointment</Button>
                  <Button variant="outline" className="rounded-full text-sm">View Profile</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
