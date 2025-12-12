import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Music, Check, Play, Pause, Plus, Youtube, Mic, Loader2, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ReactPlayer from 'react-player';
import "regenerator-runtime/runtime";

const INITIAL_PLAYLIST = [
  {
    id: "flute",
    name: "Bamboo Flute",
    src: "https://archive.org/download/bamboo-flute-music-for-relaxing-meditation-and-healing/Shakuhachi.mp3",
    type: "audio"
  },
  {
    id: "om",
    name: "Om Chanting",
    src: "https://archive.org/download/OmChanting/OmChanting_vbr.mp3",
    type: "audio"
  },
  {
    id: "rain",
    name: "Gentle Rain",
    src: "https://archive.org/download/RainSound13/Gentle%20Rain%20and%20Thunder.mp3",
    type: "audio"
  },
  {
    id: "forest",
    name: "Forest Birds",
    src: "https://archive.org/download/various-bird-sounds/birds-in-forest-on-sunny-day-14444.mp3",
    type: "audio"
  }
];

// Mock database for "Voice Search"
const MOCK_SEARCH_RESULTS: Record<string, { name: string; url: string }> = {
  "meditation": { name: "Deep Meditation", url: "https://www.youtube.com/watch?v=inpok4MKVLM" },
  "yoga": { name: "Yoga Flow", url: "https://www.youtube.com/watch?v=sJ23Qv5Oq3I" },
  "piano": { name: "Calm Piano", url: "https://www.youtube.com/watch?v=cM5B8jR2Gfo" },
  "lofi": { name: "Lofi Beats", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
  "relax": { name: "Relaxing Vibes", url: "https://www.youtube.com/watch?v=lTRiuFIWV54" },
  "nature": { name: "Nature Sounds", url: "https://www.youtube.com/watch?v=eKFTSSKCzWA" },
  "study": { name: "Study Focus", url: "https://www.youtube.com/watch?v=5qap5aO4i9A" },
  "sleep": { name: "Sleep Music", url: "https://www.youtube.com/watch?v=1ZYbU82GVz4" }
};

export function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState("flute");
  const [volume, setVolume] = useState([0.5]);
  const [customUrl, setCustomUrl] = useState("");
  const [customTrackName, setCustomTrackName] = useState("");
  const [playlist, setPlaylist] = useState(INITIAL_PLAYLIST);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [searchStatus, setSearchStatus] = useState<"idle" | "listening" | "searching" | "found" | "not-found">("idle");
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<ReactPlayer | null>(null);

  const currentTrack = playlist.find(t => t.id === currentTrackId) || playlist[0];
  const isCustomTrack = currentTrack.type === "custom";

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (!isCustomTrack) {
      const audio = new Audio(currentTrack.src);
      audio.loop = true;
      audio.volume = volume[0];
      audio.crossOrigin = "anonymous";
      
      audioRef.current = audio;

      // Handle play promise to avoid interruption errors
      if (isPlaying) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            // Auto-play was prevented or interrupted
            // We can safely ignore AbortError as it happens during quick track switching
            if (e.name !== 'AbortError') {
              console.error("Audio playback error:", e);
              setIsPlaying(false);
            }
          });
        }
      }

      return () => {
        // Only pause if we have an audio element
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      };
    }
  }, [currentTrackId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0];
    }
  }, [volume]);

  useEffect(() => {
    if (!isCustomTrack && audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            if (e.name !== 'AbortError') {
              console.error("Audio playback error:", e);
            }
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isCustomTrack]);


  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const changeTrack = (trackId: string) => {
    if (trackId === currentTrackId) return;
    setCurrentTrackId(trackId);
    setIsPlaying(true);
  };

  const handleAddCustomTrack = () => {
    if (!customUrl) return;

    const newTrack = {
      id: `custom-${Date.now()}`,
      name: customTrackName || "Custom Track",
      src: customUrl,
      type: "custom"
    };

    setPlaylist([...playlist, newTrack]);
    setCurrentTrackId(newTrack.id);
    setIsPlaying(true);
    setIsDialogOpen(false);
    setCustomUrl("");
    setCustomTrackName("");
    setSearchStatus("idle");
  };

  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setSearchStatus("listening");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("Voice Search:", transcript);
      setSearchStatus("searching");
      
      // Mock Search Logic
      setTimeout(() => {
        let found = false;
        // Simple keyword matching
        for (const [key, result] of Object.entries(MOCK_SEARCH_RESULTS)) {
          if (transcript.includes(key)) {
            setCustomTrackName(result.name);
            setCustomUrl(result.url);
            setSearchStatus("found");
            found = true;
            break;
          }
        }

        if (!found) {
          // If no match, just fill the name with the transcript
          setCustomTrackName(transcript.charAt(0).toUpperCase() + transcript.slice(1) + " (Search)");
          setSearchStatus("not-found");
        }
        setIsListening(false);
      }, 1500);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      setSearchStatus("idle");
    };

    recognition.onend = () => {
      if (searchStatus === "listening") {
        setIsListening(false);
        setSearchStatus("idle");
      }
    };

    recognition.start();
  };

  return (
    <>
      {/* Hidden React Player for Custom Tracks */}
      {isCustomTrack && (
        <div style={{ position: 'fixed', bottom: 0, right: 0, width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
          <ReactPlayer
            ref={playerRef as any}
            url={currentTrack.src}
            playing={isPlaying}
            loop={true}
            volume={volume[0]}
            width="100%"
            height="100%"
            onError={(e: any) => console.error("ReactPlayer Error:", e)}
            onReady={() => console.log("ReactPlayer Ready")}
            onStart={() => console.log("ReactPlayer Started")}
            onPlay={() => console.log("ReactPlayer Playing")}
            playsinline={true}
            config={{
              youtube: {
                playerVars: { 
                  showinfo: 0, 
                  controls: 0, 
                  disablekb: 1,
                  origin: window.location.origin
                }
              },
              file: {
                forceAudio: true
              }
            }}
          />
        </div>
      )}

      <div className="fixed bottom-6 left-6 z-50 flex items-end gap-2">
        <TooltipProvider>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`rounded-full h-12 w-12 shadow-lg transition-all duration-500 border-2 ${
                      isPlaying 
                        ? "bg-primary/10 border-primary text-primary animate-pulse-slow" 
                        : "bg-background/80 border-muted-foreground/20 text-muted-foreground hover:bg-background hover:text-foreground"
                    }`}
                  >
                    <Music className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Change Soundscape</p>
              </TooltipContent>
            </Tooltip>
            
            <DropdownMenuContent side="top" align="start" className="w-64 p-2">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Now Playing
              </DropdownMenuLabel>
              <div className="px-2 py-1.5 text-sm font-medium flex items-center justify-between mb-2">
                <span className="truncate max-w-[150px]">{currentTrack.name}</span>
                {isPlaying ? <div className="h-2 w-2 rounded-full bg-primary animate-pulse" /> : null}
              </div>
              
              <DropdownMenuSeparator />
              
              <div className="px-2 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={volume}
                    max={1}
                    step={0.01}
                    onValueChange={setVolume}
                    className="w-full"
                  />
                </div>
              </div>

              <DropdownMenuSeparator />
              
              <DropdownMenuLabel>Soundscapes</DropdownMenuLabel>
              <div className="max-h-[200px] overflow-y-auto">
                {playlist.map((track) => (
                  <DropdownMenuItem
                    key={track.id}
                    onClick={() => changeTrack(track.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {track.type === 'custom' ? <Youtube className="h-3 w-3 text-red-500" /> : null}
                      <span className="truncate max-w-[140px]">{track.name}</span>
                    </div>
                    {currentTrackId === track.id && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </div>

              <DropdownMenuSeparator />
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8">
                    <Plus className="h-3 w-3 mr-2" />
                    Add Custom Music
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Custom Music</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    
                    {/* Voice Search Section */}
                    <div className="bg-muted/50 p-4 rounded-lg flex flex-col items-center justify-center gap-3 border border-dashed">
                       <div className="text-center">
                         <p className="text-sm font-medium mb-1">Voice Search</p>
                         <p className="text-xs text-muted-foreground">Try saying "Meditation", "Piano", or "Lofi"</p>
                       </div>
                       
                       <Button 
                        variant={isListening ? "destructive" : "secondary"} 
                        size="icon" 
                        className={`h-12 w-12 rounded-full transition-all ${isListening ? "animate-pulse" : ""}`}
                        onClick={startVoiceSearch}
                        disabled={searchStatus === "searching"}
                       >
                         {searchStatus === "searching" ? (
                           <Loader2 className="h-5 w-5 animate-spin" />
                         ) : (
                           <Mic className="h-5 w-5" />
                         )}
                       </Button>

                       {searchStatus === "found" && (
                         <div className="flex items-center gap-1 text-xs text-green-600 animate-in fade-in slide-in-from-bottom-1">
                           <Sparkles className="h-3 w-3" />
                           <span>Found match!</span>
                         </div>
                       )}
                       {searchStatus === "not-found" && (
                         <div className="text-xs text-amber-600 animate-in fade-in slide-in-from-bottom-1">
                           No direct match, but I filled the name.
                         </div>
                       )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or enter manually
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="name">Track Name</Label>
                      <Input
                        id="name"
                        placeholder="My Meditation Mix"
                        value={customTrackName}
                        onChange={(e) => setCustomTrackName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="url">YouTube / Audio URL</Label>
                      <Input
                        id="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAddCustomTrack} disabled={!customUrl}>
                      Add & Play
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className={`rounded-full h-12 w-12 shadow-lg transition-all duration-300 ${
                  isPlaying ? "bg-primary hover:bg-primary/90" : "bg-muted-foreground hover:bg-muted-foreground/90"
                }`}
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-primary-foreground" />
                ) : (
                  <Play className="h-5 w-5 text-primary-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isPlaying ? "Pause" : "Play"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Visual Equalizer Effect when playing */}
        {isPlaying && (
          <div className="absolute -top-2 left-14 flex gap-0.5 h-4 items-end pointer-events-none">
            <div className="w-1 bg-primary/60 rounded-full animate-[music-bar_1s_ease-in-out_infinite]" style={{ animationDelay: "0s" }} />
            <div className="w-1 bg-primary/60 rounded-full animate-[music-bar_1.2s_ease-in-out_infinite]" style={{ animationDelay: "0.2s" }} />
            <div className="w-1 bg-primary/60 rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ animationDelay: "0.4s" }} />
            <div className="w-1 bg-primary/60 rounded-full animate-[music-bar_1.5s_ease-in-out_infinite]" style={{ animationDelay: "0.1s" }} />
          </div>
        )}
      </div>
    </>
  );
}
