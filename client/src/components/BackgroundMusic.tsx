import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Music, ChevronUp, Check, Play, Pause } from "lucide-react";
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

const PLAYLIST = [
  {
    id: "flute",
    name: "Bamboo Flute",
    src: "https://archive.org/download/bamboo-flute-music-for-relaxing-meditation-and-healing/Shakuhachi.mp3",
    fallback: "https://archive.org/download/bamboo-flute-music-peace-calm-soft/Bamboo%20Flute%20-%20Relaxing%20Music.mp3"
  },
  {
    id: "om",
    name: "Om Chanting",
    src: "https://archive.org/download/OmChanting/OmChanting_vbr.mp3",
    fallback: null
  },
  {
    id: "rain",
    name: "Gentle Rain",
    src: "https://archive.org/download/RainSound13/Gentle%20Rain%20and%20Thunder.mp3",
    fallback: null
  },
  {
    id: "forest",
    name: "Forest Birds",
    src: "https://archive.org/download/various-bird-sounds/birds-in-forest-on-sunny-day-14444.mp3",
    fallback: null
  }
];

export function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState("flute");
  const [volume, setVolume] = useState([0.5]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = PLAYLIST.find(t => t.id === currentTrackId) || PLAYLIST[0];

  useEffect(() => {
    // Initialize audio
    const audio = new Audio(currentTrack.src);
    audio.loop = true;
    audio.volume = volume[0];
    audio.crossOrigin = "anonymous";
    
    // Add event listeners for debugging
    audio.addEventListener('error', (e) => {
      console.error("Audio error:", e);
      // Fallback logic
      if (currentTrack.fallback && audio.src === currentTrack.src) {
        console.log("Switching to fallback audio source...");
        audio.src = currentTrack.fallback;
        if (isPlaying) audio.play().catch(console.error);
      }
    });

    audioRef.current = audio;

    if (isPlaying) {
      audio.play().catch(e => {
        console.error("Autoplay failed:", e);
        setIsPlaying(false);
      });
    }

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [currentTrackId]); // Re-create audio when track changes

  // Handle volume change separately
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0];
    }
  }, [volume]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const changeTrack = (trackId: string) => {
    if (trackId === currentTrackId) return;
    setCurrentTrackId(trackId);
    // isPlaying state is preserved, effect will handle playback
  };

  return (
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
          
          <DropdownMenuContent side="top" align="start" className="w-56 p-2">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Now Playing
            </DropdownMenuLabel>
            <div className="px-2 py-1.5 text-sm font-medium flex items-center justify-between mb-2">
              <span className="truncate">{currentTrack.name}</span>
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
            {PLAYLIST.map((track) => (
              <DropdownMenuItem
                key={track.id}
                onClick={() => changeTrack(track.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>{track.name}</span>
                {currentTrackId === track.id && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
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
  );
}
