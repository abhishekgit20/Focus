import { PageTransition } from "@/components/PageTransition";
import yogaImg from "@assets/generated_images/yoga_session_illustration.png";
import therapyImg from "@assets/generated_images/therapy_session_illustration.png";
import chatImg from "@assets/generated_images/friendly_ai_chatbot_avatar.png";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export default function Services() {
  const services = [
    {
      title: "1-on-1 Therapy",
      desc: "Private sessions with licensed professionals tailored to your needs.",
      img: therapyImg,
      link: "/therapists",
      color: "bg-secondary/30",
      btnText: "Find a Therapist"
    },
    {
      title: "Mindfulness & Yoga",
      desc: "Guided sessions to help you ground yourself and find physical balance.",
      img: yogaImg,
      link: "#", // Placeholder
      color: "bg-primary/30",
      btnText: "Explore Classes"
    },
    {
      title: "AI Support Guide",
      desc: "Immediate emotional support and coping strategies available 24/7.",
      img: chatImg,
      link: "/chatbot",
      color: "bg-purple-100",
      btnText: "Start Chatting"
    }
  ];

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-primary-foreground">Our Services</h1>
          <p className="text-lg text-muted-foreground">
            Holistic approaches to mental wellness, combining professional care with self-help tools.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="group rounded-3xl overflow-hidden bg-card border hover:shadow-xl transition-all duration-500 flex flex-col">
              <div className={`h-64 overflow-hidden ${service.color} relative`}>
                <img 
                  src={service.img} 
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <div className="p-8 flex flex-col flex-grow">
                <h3 className="text-2xl font-bold mb-3 font-serif">{service.title}</h3>
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
      </div>
    </PageTransition>
  );
}
