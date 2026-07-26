import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, X, RotateCcw } from "lucide-react";

export function FilterPanel({ onApplyFilters }: { onApplyFilters?: (filters: Record<string, string[]>) => void }) {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [isOpen, setIsOpen] = useState(false);

  // ... (rest of the file)

  const handleApply = () => {
    if (onApplyFilters) {
      onApplyFilters(selectedFilters);
    }
    setIsOpen(false);
  };

  // Update SheetFooter Apply Button to call handleApply


  const filterCategories = [
    {
      id: "specialty",
      label: "Specialty",
      options: [
        "Anxiety", "Depression", "Relationship Issues", "Stress", "PTSD", "OCD", 
        "Child Therapy", "Yoga Therapy", "Mindfulness", "Trauma", "Addiction"
      ]
    },
    {
      id: "language",
      label: "Language",
      options: [
        "Hindi", "English", "Tamil", "Telugu", "Malayalam", 
        "Marathi", "Bengali", "Punjabi", "Gujarati", "Kannada"
      ]
    },
    {
      id: "professionalType",
      label: "Professional Type",
      options: [
        "Psychologist", "Psychiatrist", "Therapist", "Counsellor", "Yoga Guru", "Mindfulness Coach"
      ]
    },
    {
      id: "experience",
      label: "Experience",
      options: [
        "0–3 years", "3–7 years", "7–15 years", "15+ years"
      ]
    },
    {
      id: "price",
      label: "Price Range",
      options: [
        "Below ₹300", "₹300–500", "₹500–800", "₹800–1200", "₹1200+"
      ]
    },
    {
      id: "gender",
      label: "Gender Preference",
      options: [
        "Male", "Female"
      ]
    }
    // "Availability" (Today/Morning/etc.) and "Mode of Session" (Video/Audio/
    // Chat/In-person) categories were removed here — they had no backing data
    // in getAllProfessionals() (working-hours/offering-type aren't part of
    // that response), so every combination silently matched nothing users
    // could see was ignored. Re-add once that data is actually returned.
  ];

  const handleFilterChange = (categoryId: string, option: string) => {
    setSelectedFilters(prev => {
      const current = prev[categoryId] || [];
      const updated = current.includes(option)
        ? current.filter(item => item !== option)
        : [...current, option];
      
      return { ...prev, [categoryId]: updated };
    });
  };

  const clearFilters = () => {
    setSelectedFilters({});
  };

  const totalFilters = Object.values(selectedFilters).flat().length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative rounded-full border-2 border-[#90CAF9] bg-[#FAFAF5] hover:bg-[#E3F2FD] text-[#1565C0] transition-all duration-300"
          aria-label={totalFilters > 0 ? `Filters, ${totalFilters} active` : "Filters"}
        >
          <Filter className="w-5 h-5" />
          {totalFilters > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF9933] text-[10px] font-bold text-white shadow-sm animate-in zoom-in">
              {totalFilters}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[400px] p-0 border-l border-[#90CAF9]/30 bg-[#FAFAF5]">
        <SheetHeader className="px-6 py-4 border-b border-[#90CAF9]/20 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-serif font-bold text-[#1a365d] flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#90CAF9]" />
              Filters
            </SheetTitle>
            {totalFilters > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1 h-8 px-2"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2 min-h-[24px]">
             {Object.entries(selectedFilters).map(([catId, options]) => 
               options.map(opt => (
                 <Badge 
                   key={`${catId}-${opt}`} 
                   variant="secondary"
                   className="bg-[#E3F2FD] text-[#1565C0] hover:bg-[#BBDEFB] border border-[#90CAF9]/30 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-all"
                 >
                   {opt}
                   <X 
                     className="w-3 h-3 cursor-pointer" 
                     onClick={() => handleFilterChange(catId, opt)}
                   />
                 </Badge>
               ))
             )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] px-6 py-4">
          <Accordion type="multiple" defaultValue={["specialty", "price", "professionalType"]} className="space-y-4">
            {filterCategories.map((category) => (
              <AccordionItem 
                key={category.id} 
                value={category.id}
                className="border rounded-xl bg-white shadow-sm border-[#90CAF9]/20 overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:bg-[#F1F8E9] hover:no-underline transition-colors text-sm font-medium text-slate-700">
                  {category.label}
                  {selectedFilters[category.id]?.length > 0 && (
                    <span className="ml-auto mr-2 text-xs font-normal text-[#A5D6A7] bg-[#E8F5E9] px-2 py-0.5 rounded-full">
                      {selectedFilters[category.id].length}
                    </span>
                  )}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-1 bg-white">
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    {category.options.map((option) => (
                      <div key={option} className="flex items-center space-x-3 group">
                        <Checkbox 
                          id={`${category.id}-${option}`} 
                          checked={selectedFilters[category.id]?.includes(option)}
                          onCheckedChange={() => handleFilterChange(category.id, option)}
                          className="border-[#90CAF9] data-[state=checked]:bg-[#90CAF9] data-[state=checked]:border-[#90CAF9] rounded-md w-5 h-5 transition-all"
                        />
                        <Label 
                          htmlFor={`${category.id}-${option}`}
                          className="text-sm font-normal text-slate-600 cursor-pointer group-hover:text-[#1565C0] transition-colors w-full py-1"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>

        <SheetFooter className="absolute bottom-0 left-0 w-full p-4 border-t border-[#90CAF9]/20 bg-white/80 backdrop-blur-md flex flex-row gap-3">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1 rounded-full border-[#90CAF9] text-[#1565C0] hover:bg-[#E3F2FD]">
              Cancel
            </Button>
          </SheetClose>
          <Button 
            onClick={() => {
              if (onApplyFilters) onApplyFilters(selectedFilters);
              setIsOpen(false);
            }}
            className="flex-1 rounded-full bg-[#FF9933] hover:bg-[#F57C00] text-white border-none shadow-md hover:shadow-lg transition-all"
          >
            Apply Filters {totalFilters > 0 ? `(${totalFilters})` : ''}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
