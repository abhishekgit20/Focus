import { PageTransition } from "@/components/PageTransition";
import yogaImg from "@assets/generated_images/yoga_session_illustration.png";
import therapyImg from "@assets/generated_images/therapy_session_illustration.png";
import chatImg from "@assets/generated_images/wisdom_chatbot_avatar.png";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Globe } from "lucide-react";

export default function Services() {
  const services = [
    {
      title: "Clinical Therapy",
      desc: "Connect with verified psychiatrists and psychologists for professional mental health support.",
      img: therapyImg,
      link: "/therapists",
      color: "bg-secondary/30",
      btnText: "Find Therapists",
      tags: ["Video", "Chat", "In-Person"]
    },
    {
      title: "Yoga & Mindfulness",
      desc: "Sessions with experienced Yoga Gurus to harmonize your body and mind through ancient practices.",
      img: yogaImg,
      link: "/therapists", // Could filter for gurus
      color: "bg-primary/30",
      btnText: "Meet Gurus",
      tags: ["Hatha", "Vinyasa", "Meditation"]
    },
    {
      title: "Gita Wisdom Bot",
      desc: "24/7 guidance rooted in the Bhagavad Gita and mindfulness texts for instant clarity and peace.",
      img: chatImg,
      link: "/chatbot",
      color: "bg-purple-100",
      btnText: "Start Chatting",
      tags: ["AI-Powered", "24/7", "Multilingual"]
    }
  ];

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary font-bold tracking-wider text-sm uppercase mb-2 block">Our Offerings</span>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground font-serif">Holistic Services</h1>
          <p className="text-lg text-muted-foreground">
            From clinical expertise to spiritual wellness, we provide a complete ecosystem for your mental health.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {services.map((service, index) => (
            <div key={index} className="group rounded-3xl overflow-hidden bg-card border hover:shadow-xl transition-all duration-500 flex flex-col">
              <div className={`h-64 overflow-hidden ${service.color} relative`}>
                <img 
                  src={service.img} 
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <div className="p-8 flex flex-col flex-grow">
                <h3 className="text-2xl font-bold mb-3 font-serif">{service.title}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {service.tags.map(tag => (
                    <span key={tag} className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground border">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-muted-foreground mb-8 flex-grow leading-relaxed">
                  {service.desc}
                </p>
                <Link href={service.link}>
                  <Button className="w-full rounded-full py-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {service.btnText} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Corporate & Government Section */}
        <div className="bg-muted/30 rounded-3xl p-8 md:p-12 border">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4 font-serif">For Organizations</h3>
              <p className="text-muted-foreground mb-6">
                We partner with corporates, NGOs, and government bodies to bring mental wellness to every corner of India.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <span>Corporate Wellness Programs</span>
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <span>National Mental Health Program (NMHP) Alignment</span>
                </li>
              </ul>
              <Button variant="outline" className="rounded-full">Partner With Us</Button>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h4 className="font-bold mb-2">Our Reach</h4>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-primary/10 rounded-xl">
                  <div className="text-2xl font-bold text-primary">50+</div>
                  <div className="text-xs text-muted-foreground">Cities</div>
                </div>
                <div className="p-4 bg-secondary/10 rounded-xl">
                  <div className="text-2xl font-bold text-secondary-foreground">10k+</div>
                  <div className="text-xs text-muted-foreground">Lives Touched</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
