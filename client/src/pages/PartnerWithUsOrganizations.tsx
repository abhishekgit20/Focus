import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Building2,
  Heart,
  Users,
  GraduationCap,
  Briefcase,
  Shield,
  CheckCircle2,
  ArrowRight,
  Globe,
  TrendingUp,
  FileText,
  Handshake,
  Rocket,
  Award,
  MapPin,
  Target,
} from "lucide-react";

export default function PartnerWithUsOrganizations() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const contactFormRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    organizationName: "",
    contactPerson: "",
    email: "",
    phone: "",
    organizationType: "",
    partnershipInterests: [] as string[],
    message: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const organizationTypes = [
    "Corporate",
    "NGO",
    "Government Body",
    "Hospital",
    "Educational Institution",
    "Startup",
    "Other",
  ];

  const partnershipOptions = [
    "Corporate Wellness Programs",
    "NGO & Government Collaboration (NMHP aligned)",
    "Technology / Platform Partnerships",
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = "Organization name is required";
    }
    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = "Contact person name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }
    if (!formData.organizationType) {
      newErrors.organizationType = "Organization type is required";
    }
    if (formData.partnershipInterests.length === 0) {
      newErrors.partnershipInterests = "Please select at least one partnership interest";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API endpoint when backend is ready
      const response = await fetch("/api/partner-inquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit inquiry");
      }

      toast.success("Thank you for your interest! We'll contact you within 48 hours.");
      
      // Reset form
      setFormData({
        organizationName: "",
        contactPerson: "",
        email: "",
        phone: "",
        organizationType: "",
        partnershipInterests: [],
        message: "",
      });
      setErrors({});
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("There was an error submitting your inquiry. Please try again or contact us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckboxChange = (value: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      partnershipInterests: checked
        ? [...prev.partnershipInterests, value]
        : prev.partnershipInterests.filter((item) => item !== value),
    }));
    // Clear error when user selects an option
    if (checked && errors.partnershipInterests) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.partnershipInterests;
        return newErrors;
      });
    }
  };

  const scrollToForm = () => {
    contactFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const partnerTypes = [
    {
      icon: <Building2 className="w-8 h-8" />,
      title: "Corporates",
      description: "Employee wellness programs and mental health support",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "NGOs",
      description: "Community mental health initiatives",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Government Bodies",
      description: "National Mental Health Program alignment",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Hospitals",
      description: "Integrated mental health services",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: <GraduationCap className="w-8 h-8" />,
      title: "Educational Institutions",
      description: "Student and faculty wellness programs",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      icon: <Rocket className="w-8 h-8" />,
      title: "Startups",
      description: "Innovative mental health solutions",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  const partnershipModels = [
    {
      title: "Corporate Wellness Programs",
      description: "Comprehensive employee mental health support with 24/7 access to therapists, wellness workshops, and personalized care plans.",
      features: ["Employee Assistance Programs", "Wellness Workshops", "Mental Health Assessments", "Crisis Support"],
    },
    {
      title: "NGO & Government Collaboration (NMHP aligned)",
      description: "Partner with us to deliver evidence-based mental health services aligned with India's National Mental Health Program.",
      features: ["Community Outreach", "Training Programs", "Resource Sharing", "Impact Measurement"],
    },
    {
      title: "Technology / Platform Partnerships",
      description: "Integrate our platform into your existing systems or co-develop innovative mental health solutions.",
      features: ["API Integration", "White-label Solutions", "Custom Development", "Technical Support"],
    },
  ];

  const whyPartner = [
    {
      icon: <Award className="w-6 h-6" />,
      title: "Evidence-based Care",
      description: "Our platform is built on proven therapeutic approaches and continuously validated through research.",
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "India-focused Approach",
      description: "Designed specifically for Indian cultural contexts, languages, and mental health needs.",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Scalable & Secure Platform",
      description: "Enterprise-grade infrastructure that grows with your organization's needs.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Certified Professionals",
      description: "All therapists and gurus are verified, licensed, and continuously monitored for quality.",
    },
  ];

  const processSteps = [
    {
      step: "1",
      title: "Inquiry",
      description: "Submit your partnership inquiry through our form",
      icon: <FileText className="w-6 h-6" />,
    },
    {
      step: "2",
      title: "Discussion",
      description: "Our team will reach out to understand your needs",
      icon: <Handshake className="w-6 h-6" />,
    },
    {
      step: "3",
      title: "Proposal",
      description: "We'll create a customized partnership proposal",
      icon: <Target className="w-6 h-6" />,
    },
    {
      step: "4",
      title: "Launch",
      description: "Together, we launch your mental wellness program",
      icon: <Rocket className="w-6 h-6" />,
    },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative py-20 md:py-28 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 font-serif text-foreground">
                Partner With Us
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                Together, we can bring mental wellness to every corner of India. Join us in creating a healthier, happier nation through evidence-based care and compassionate support.
              </p>
              <Button
                size="lg"
                className="rounded-full px-8 py-6 text-lg"
                onClick={scrollToForm}
              >
                Request Partnership <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Who Can Partner With Us */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-serif">Who Can Partner With Us</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                We welcome organizations of all sizes committed to mental wellness
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partnerTypes.map((type, index) => (
                <Card key={index} className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-full ${type.bgColor} flex items-center justify-center mb-4 ${type.color}`}>
                      {type.icon}
                    </div>
                    <CardTitle className="text-xl">{type.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{type.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Partnership Models */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-serif">Partnership Models</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Flexible partnership options tailored to your organization's needs
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {partnershipModels.map((model, index) => (
                <Card key={index} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl mb-3">{model.title}</CardTitle>
                    <CardDescription className="text-base mb-4">{model.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-2">
                      {model.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why Partner With Us */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-serif">Why Partner With Us</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                What makes Focus the right partner for your mental wellness initiatives
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {whyPartner.map((item, index) => (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                      {item.icon}
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">{item.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Impact & Reach */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-serif">Impact & Reach</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Our growing impact across India
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
              <Card className="text-center">
                <CardHeader>
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-10 h-10 text-primary" />
                  </div>
                  <CardTitle className="text-4xl font-bold text-primary mb-2">50+</CardTitle>
                  <CardDescription className="text-lg">Cities</CardDescription>
                </CardHeader>
              </Card>
              <Card className="text-center">
                <CardHeader>
                  <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-4xl font-bold text-secondary-foreground mb-2">10k+</CardTitle>
                  <CardDescription className="text-lg">Lives Touched</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Partnership Process */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-serif">Partnership Process</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Simple steps to start your partnership journey
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {processSteps.map((step, index) => (
                <div key={index} className="relative">
                  <Card className="h-full text-center">
                    <CardHeader>
                      <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                        {step.step}
                      </div>
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                        {step.icon}
                      </div>
                      <CardTitle className="text-lg mb-2">{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">{step.description}</CardDescription>
                    </CardContent>
                  </Card>
                  {index < processSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                      <ArrowRight className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Partnership Inquiry Form */}
        <section ref={contactFormRef} className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <Card className="shadow-xl">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-bold mb-2 font-serif">Partnership Inquiry Form</CardTitle>
                  <CardDescription className="text-base">
                    Fill out the form below and our team will get back to you within 48 hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                    {/* Organization Name */}
                    <div className="space-y-2">
                      <Label htmlFor="organizationName">
                        Organization Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="organizationName"
                        placeholder="Enter your organization name"
                        value={formData.organizationName}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, organizationName: e.target.value }));
                          if (errors.organizationName) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.organizationName;
                              return newErrors;
                            });
                          }
                        }}
                        className={errors.organizationName ? "border-red-500" : ""}
                      />
                      {errors.organizationName && (
                        <p className="text-sm text-red-500">{errors.organizationName}</p>
                      )}
                    </div>

                    {/* Contact Person */}
                    <div className="space-y-2">
                      <Label htmlFor="contactPerson">
                        Contact Person <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="contactPerson"
                        placeholder="Full name of primary contact"
                        value={formData.contactPerson}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, contactPerson: e.target.value }));
                          if (errors.contactPerson) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.contactPerson;
                              return newErrors;
                            });
                          }
                        }}
                        className={errors.contactPerson ? "border-red-500" : ""}
                      />
                      {errors.contactPerson && (
                        <p className="text-sm text-red-500">{errors.contactPerson}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Official Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@organization.com"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, email: e.target.value }));
                          if (errors.email) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.email;
                              return newErrors;
                            });
                          }
                        }}
                        className={errors.email ? "border-red-500" : ""}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">{errors.email}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, phone: e.target.value }));
                          if (errors.phone) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.phone;
                              return newErrors;
                            });
                          }
                        }}
                        className={errors.phone ? "border-red-500" : ""}
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-500">{errors.phone}</p>
                      )}
                    </div>

                    {/* Organization Type */}
                    <div className="space-y-2">
                      <Label htmlFor="organizationType">
                        Organization Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.organizationType}
                        onValueChange={(value) => {
                          setFormData((prev) => ({ ...prev, organizationType: value }));
                          if (errors.organizationType) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.organizationType;
                              return newErrors;
                            });
                          }
                        }}
                      >
                        <SelectTrigger className={errors.organizationType ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select organization type" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizationTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.organizationType && (
                        <p className="text-sm text-red-500">{errors.organizationType}</p>
                      )}
                    </div>

                    {/* Partnership Interest */}
                    <div className="space-y-2">
                      <Label>
                        Partnership Interest <span className="text-red-500">*</span>
                      </Label>
                      <div className="space-y-3 border rounded-md p-4 bg-muted/30">
                        {partnershipOptions.map((option) => (
                          <div key={option} className="flex items-start space-x-3">
                            <Checkbox
                              id={option}
                              checked={formData.partnershipInterests.includes(option)}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange(option, checked as boolean)
                              }
                              className="mt-1"
                            />
                            <Label
                              htmlFor={option}
                              className="text-sm font-normal cursor-pointer leading-relaxed"
                            >
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {errors.partnershipInterests && (
                        <p className="text-sm text-red-500">{errors.partnershipInterests}</p>
                      )}
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us about your organization and partnership goals..."
                        className="min-h-[120px]"
                        value={formData.message}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, message: e.target.value }))
                        }
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full rounded-full py-6 text-lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Inquiry"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}



