import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Music, ChevronUp, Check, Play, Pause, Plus, Link as LinkIcon, Youtube } from "lucide-react";
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

export function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState("flute");
  const [volume, setVolume] = useState([0.5]);
  const [customUrl, setCustomUrl] = useState("");
  const [customTrackName, setCustomTrackName] = useState("");
  const [playlist, setPlaylist] = useState(INITIAL_PLAYLIST);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Ref for the audio element (for Archive.org links)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Ref for ReactPlayer (for YouTube/custom links)
  const playerRef = useRef<ReactPlayer | null>(null);

  const currentTrack = playlist.find(t => t.id === currentTrackId) || playlist[0];
  const isCustomTrack = currentTrack.type === "custom";

  useEffect(() => {
    // Stop any existing audio when switching tracks
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (isCustomTrack) {
      // ReactPlayer handles playback via props
      // We rely on the `playing` prop passed to ReactPlayer
    } else {
      // Native Audio for Archive.org files
      const audio = new Audio(currentTrack.src);
      audio.loop = true;
      audio.volume = volume[0];
      audio.crossOrigin = "anonymous";
      
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
    }
  }, [currentTrackId]);

  // Handle volume change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0];
    }
    // ReactPlayer volume is handled via props
  }, [volume]);

  // Sync play state
  useEffect(() => {
    if (!isCustomTrack && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
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
    setIsPlaying(true); // Auto-play when switching tracks
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
  };

  return (
    <>
      {/* Hidden React Player for Custom Tracks */}
      {isCustomTrack && (
        <div className="hidden">
          <ReactPlayer
            ref={playerRef}
            url={currentTrack.src}
            playing={isPlaying}
            loop={true}
            volume={volume[0]}
            width="0"
            height="0"
            onError={(e) => console.error("ReactPlayer Error:", e)}
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
