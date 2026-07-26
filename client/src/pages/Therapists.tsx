import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Calendar, Zap, Loader2, MessageSquare, Phone, Video } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterPanel } from "@/components/FilterPanel";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getAllProfessionals } from "@/lib/api";
import { BookingModal } from "@/components/BookingModal";

const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='%23e2e8f0'/><circle cx='100' cy='78' r='38' fill='%23a0aec0'/><ellipse cx='100' cy='190' rx='70' ry='55' fill='%23a0aec0'/></svg>";

export default function Therapists() {
  const [filter, setFilter] = useState("All");
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, string[]>>({});
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [bookingTarget, setBookingTarget] = useState<{ id: string; name: string; isOnline: boolean; type: "chat" | "audio" | "video" } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/professionals"],
    queryFn: getAllProfessionals,
  });

  const professionals = (data?.professionals || []).map((p) => ({
    id: p.user.id,
    name: p.user.fullName || "Professional",
    title: p.specialization,
    specialty: p.specialization,
    rating: Number(p.rating) || 0,
    reviews: p.totalReviews || 0,
    location: "Online",
    isOnline: !!p.isOnline,
    availability: p.isOnline ? "Available Now" : "Offline",
    image: p.user.profileImage || FALLBACK_AVATAR,
    tags: p.languages || [],
    minPrice: p.minPrice,
    experience: p.experience ?? 0,
    gender: p.user.gender,
  }));

  const handleBook = (profId: string, name: string, isOnline: boolean, type: "chat" | "audio" | "video") => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please sign in to book a session with our professionals.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }
    setBookingTarget({ id: profId, name, isOnline, type });
  };

  const filteredProfessionals = professionals.filter(prof => {
    // 1. Basic Filters (Buttons)
    if (filter === "Psychologists") {
      if (!["Clinical Psychologist", "Psychiatrist", "Therapist"].includes(prof.title)) return false;
    }
    if (filter === "Yoga Gurus") {
      if (!prof.title.includes("Yoga")) return false;
    }

    // 2. Advanced Filters (Panel)
    if (Object.keys(advancedFilters).length > 0) {
      // Professional Type
      if (advancedFilters.professionalType?.length > 0) {
        // Handle "Psychologist" specifically as requested
        const hasMatchingType = advancedFilters.professionalType.some(type => {
          if (type === "Psychologist" && prof.title.includes("Psychologist")) return true;
          if (type === "Psychiatrist" && prof.title.includes("Psychiatrist")) return true;
          if (type === "Therapist" && prof.title.includes("Therapist")) return true;
          if (type === "Yoga Guru" && prof.title.includes("Yoga")) return true;
          return prof.title === type;
        });
        if (!hasMatchingType) return false;
      }

      // Language
      if (advancedFilters.language?.length > 0) {
        const hasLanguage = advancedFilters.language.some(lang => prof.tags.includes(lang));
        if (!hasLanguage) return false;
      }

      // Specialty
      if (advancedFilters.specialty?.length > 0) {
        // Simple string match for specialty
        const hasSpecialty = advancedFilters.specialty.some(spec => prof.specialty.includes(spec));
        if (!hasSpecialty) return false;
      }

      // Price Range — these used to be shown as active filter chips with no
      // effect on the results at all, giving a false sense of narrowing.
      if (advancedFilters.price?.length > 0) {
        const price = prof.minPrice != null ? Number(prof.minPrice) : null;
        const matchesBucket = (bucket: string): boolean => {
          if (price == null) return false;
          if (bucket === "Below ₹300") return price < 300;
          if (bucket === "₹300–500") return price >= 300 && price <= 500;
          if (bucket === "₹500–800") return price > 500 && price <= 800;
          if (bucket === "₹800–1200") return price > 800 && price <= 1200;
          if (bucket === "₹1200+") return price > 1200;
          return false;
        };
        if (!advancedFilters.price.some(matchesBucket)) return false;
      }

      // Experience
      if (advancedFilters.experience?.length > 0) {
        const matchesBucket = (bucket: string): boolean => {
          const years = prof.experience;
          if (bucket === "0–3 years") return years >= 0 && years <= 3;
          if (bucket === "3–7 years") return years > 3 && years <= 7;
          if (bucket === "7–15 years") return years > 7 && years <= 15;
          if (bucket === "15+ years") return years > 15;
          return false;
        };
        if (!advancedFilters.experience.some(matchesBucket)) return false;
      }

      // Gender Preference
      if (advancedFilters.gender?.length > 0) {
        const hasGender = advancedFilters.gender.some(
          (g) => prof.gender?.toLowerCase() === g.toLowerCase()
        );
        if (!hasGender) return false;
      }
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
              onClick={() => { setFilter("All"); setAdvancedFilters({}); }}
              className="gap-2"
            >
              All
            </Button>
            <Button 
              variant={filter === "Psychologists" ? "default" : "outline"}
              onClick={() => { setFilter("Psychologists"); setAdvancedFilters({}); }}
              className="gap-2"
            >
              Psychologists
            </Button>
            <Button 
              variant={filter === "Yoga Gurus" ? "default" : "outline"}
              onClick={() => { setFilter("Yoga Gurus"); setAdvancedFilters({}); }}
              className="gap-2"
            >
              Yoga Gurus
            </Button>
            <FilterPanel onApplyFilters={(filters) => {
              setAdvancedFilters(filters);
              setFilter("All"); // Reset basic buttons when using advanced filter
            }} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p>Loading professionals...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-24 text-muted-foreground">
            <p>Couldn't load professionals right now. Please try again shortly.</p>
          </div>
        ) : filteredProfessionals.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <p>No professionals match these filters yet.</p>
          </div>
        ) : (
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
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">Session Starts From</div>
                    <div className="text-lg font-bold text-primary">₹{prof.minPrice ?? "—"}</div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-3">{prof.specialty}</p>

                <div className="flex items-center gap-3 text-xs mb-4 flex-wrap">
                  {prof.isOnline ? (
                    <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      Offline
                    </span>
                  )}
                  {prof.isOnline && (
                    <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-medium">
                      <Zap className="w-3 h-3" /> Instant Session Available
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" /> Scheduled Session
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {prof.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted font-normal text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2 mt-auto">
                  <Button
                    className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm gap-1.5"
                    onClick={() => handleBook(prof.id, prof.name, prof.isOnline, "chat")}
                    data-testid={`button-chat-${prof.id}`}
                  >
                    <MessageSquare className="w-4 h-4" /> Chat
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full text-sm gap-1.5"
                    onClick={() => handleBook(prof.id, prof.name, prof.isOnline, "audio")}
                    data-testid={`button-call-${prof.id}`}
                  >
                    <Phone className="w-4 h-4" /> Voice
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full text-sm gap-1.5"
                    onClick={() => handleBook(prof.id, prof.name, prof.isOnline, "video")}
                    data-testid={`button-video-${prof.id}`}
                  >
                    <Video className="w-4 h-4" /> Video
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {bookingTarget && (
        <BookingModal
          professionalId={bookingTarget.id}
          professionalName={bookingTarget.name}
          isOnline={bookingTarget.isOnline}
          consultationType={bookingTarget.type}
          open={!!bookingTarget}
          onOpenChange={(open) => !open && setBookingTarget(null)}
        />
      )}
    </PageTransition>
  );
}
