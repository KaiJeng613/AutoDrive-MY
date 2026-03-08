'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Car, Zap, User, Bike, ShieldAlert, ChevronDown, Camera } from 'lucide-react';

type EntityType = 'CAR' | 'EV' | 'MOTORCYCLE' | 'PEDESTRIAN' | 'WALL';

interface Entity {
  id: number;
  type: EntityType;
  model: string;
  x: number; // 0 to 100
  y: number; // -20 to 120
  speed: number; // Absolute speed in km/h
  lane: number; // 0, 1, 2
}

const CAR_MODELS = [
  { model: 'Perodua Myvi', type: 'CAR' },
  { model: 'Proton X50', type: 'CAR' },
  { model: 'Honda City', type: 'CAR' },
  { model: 'Toyota Vios', type: 'CAR' },
];

const EV_MODELS = [
  { model: 'Tesla Model 3', type: 'EV' },
  { model: 'BYD Atto 3', type: 'EV' },
  { model: 'Hyundai Ioniq 5', type: 'EV' },
];

const MOTO_MODELS = [
  { model: 'Yamaha Y15ZR', type: 'MOTORCYCLE' },
  { model: 'Honda RS150R', type: 'MOTORCYCLE' },
];

export default function RadarView({ isNavigating, currentSpeed, dashcamConnected }: { isNavigating: boolean, currentSpeed: number, dashcamConnected: boolean }) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [proximityAlert, setProximityAlert] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle Dashcam Connection
  useEffect(() => {
    if (dashcamConnected) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Error accessing dashcam:", err);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [dashcamConnected]);

  // Simulate entities with Openpilot-style physics
  useEffect(() => {
    if (!isNavigating) return;

    const generateEntity = (): Entity => {
      const rand = Math.random();
      let type: EntityType = 'CAR';
      let model = '';
      let speed = 70 + Math.random() * 40; // 70 to 110 km/h
      let lane = Math.floor(Math.random() * 3);
      let x = lane * 30 + 20 + (Math.random() * 6 - 3);

      if (rand < 0.05) {
        type = 'PEDESTRIAN';
        model = 'Human (Heat)';
        speed = 5; // Walking speed
        x = Math.random() > 0.5 ? 10 : 90; // Edges
      } else if (rand < 0.15) {
        type = 'WALL';
        model = 'Barrier';
        speed = 0; // Static
        x = Math.random() > 0.5 ? 5 : 95; // Extreme edges
      } else if (rand < 0.35) {
        type = 'MOTORCYCLE';
        model = MOTO_MODELS[Math.floor(Math.random() * MOTO_MODELS.length)].model;
        speed = 90 + Math.random() * 40; // Faster, lane splitting
        x = lane * 30 + 20 + (Math.random() * 16 - 8);
      } else if (rand < 0.55) {
        type = 'EV';
        model = EV_MODELS[Math.floor(Math.random() * EV_MODELS.length)].model;
      } else {
        type = 'CAR';
        model = CAR_MODELS[Math.floor(Math.random() * CAR_MODELS.length)].model;
      }

      return {
        id: Math.random(),
        type,
        model,
        x,
        y: -20, // Always spawn at the top (ahead of us)
        speed,
        lane
      };
    };

    const interval = setInterval(() => {
      setEntities(prev => {
        let newEntities = [...prev];

        // 1. Update positions based on relative speed
        newEntities = newEntities.map(e => {
          // If we are faster, relativeSpeed is positive -> they move down (+y) towards us
          // If they are faster, relativeSpeed is negative -> they pull away (-y) up the screen
          const relativeSpeed = currentSpeed - e.speed;
          const dy = relativeSpeed * 0.06; // Scale factor for visual speed
          return { ...e, y: e.y + dy };
        });

        // 2. Prevent Stacking (Strict Collision Avoidance)
        for (let lane = 0; lane < 3; lane++) {
          // Sort by Y descending (closest to our car at y=85 first)
          const laneEntities = newEntities.filter(e => e.lane === lane).sort((a, b) => b.y - a.y);
          
          for (let i = 0; i < laneEntities.length - 1; i++) {
            const front = laneEntities[i]; // Car closer to us
            const back = laneEntities[i + 1]; // Car further ahead
            
            const safeDist = 22; // Strict safe distance
            
            // If the back car is too close to the front car
            if (front.y - back.y < safeDist && front.type !== 'WALL' && back.type !== 'WALL') {
              // Match speed and maintain distance to prevent stacking
              const backIndex = newEntities.findIndex(e => e.id === back.id);
              if (backIndex !== -1) {
                newEntities[backIndex].speed = front.speed;
                newEntities[backIndex].y = front.y - safeDist; // Force separation
              }
            }
          }
        }

        // 3. Filter out entities that have passed us or gone too far ahead
        newEntities = newEntities.filter(e => e.y < 150 && e.y > -100);

        // 4. Spawn new entities safely
        if (Math.random() > 0.85 && newEntities.length < 10) {
          const newE = generateEntity();
          // Only spawn if the space is completely clear at the top
          const conflict = newEntities.some(e => e.lane === newE.lane && e.y < 15);
          if (!conflict) {
            newEntities.push(newE);
          }
        }

        // 5. Check proximity to Ego car (Ego is at x: 50, y: 85)
        const egoX = 50;
        const egoY = 85;
        let alert = false;

        for (const e of newEntities) {
          const dx = e.x - egoX;
          const dy = e.y - egoY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 12 && e.y < egoY + 5 && e.y > egoY - 15) {
            alert = true;
            break;
          }
        }

        setProximityAlert(alert);
        return newEntities;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isNavigating, currentSpeed]);

  // Clear entities when navigation stops
  useEffect(() => {
    if (!isNavigating) {
      setEntities([]);
      setProximityAlert(false);
    }
  }, [isNavigating]);

  // Identify Lead Car (closest car in our lane, ahead of us)
  const leadCar = entities
    .filter(e => e.lane === 1 && e.y < 80 && (e.type === 'CAR' || e.type === 'EV' || e.type === 'MOTORCYCLE'))
    .sort((a, b) => b.y - a.y)[0];

  return (
    <div className="w-full h-full relative bg-[#111111] overflow-hidden">
      {/* Dashcam Video Feed */}
      {dashcamConnected && (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen z-0"
        />
      )}

      {/* Road Background (Tesla Style) */}
      <div className="absolute inset-0 flex justify-center">
        <div className="w-[80%] h-full bg-[#1c1c1c] relative">
          {/* Lane Lines */}
          <div className="absolute left-[33%] top-0 bottom-0 w-1 border-l-2 border-dashed border-neutral-500/30" />
          <div className="absolute left-[66%] top-0 bottom-0 w-1 border-l-2 border-dashed border-neutral-500/30" />
          {/* Road Edges */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-neutral-500/50" />
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-neutral-500/50" />
        </div>
      </div>

      {/* Openpilot / Tesla Simulated Path Prediction */}
      {isNavigating && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <polygon 
            points="46,85 54,85 52,20 48,20" 
            fill="rgba(59, 130, 246, 0.15)" 
            className="transition-all duration-300"
          />
          <polyline 
            points="50,85 50,20" 
            stroke="rgba(59, 130, 246, 0.8)" 
            strokeWidth="0.5" 
            fill="none" 
            strokeDasharray="2,2" 
          />
        </svg>
      )}

      {/* Proximity Alert Overlay */}
      {proximityAlert && (
        <div className="absolute inset-0 bg-red-500/10 border-4 border-red-500/50 z-40 flex items-center justify-center pointer-events-none animate-pulse">
          <div className="bg-red-950/90 border border-red-500 text-red-500 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
            <ShieldAlert className="w-6 h-6 animate-bounce" />
            <span className="font-mono font-bold text-lg tracking-wider">PROXIMITY WARNING</span>
          </div>
        </div>
      )}

      {/* Our Car (Ego Vehicle - Tesla Style) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
        <div className={`w-12 h-24 rounded-xl relative transition-colors duration-300 shadow-2xl ${proximityAlert ? 'bg-red-500/40 border-2 border-red-500' : 'bg-neutral-300 border border-white'}`}>
          {/* Car details */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-6 bg-neutral-800 rounded-t-lg opacity-80" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-neutral-800 rounded-b-sm opacity-80" />
          {/* Headlights */}
          <div className="absolute top-0 left-1 w-2 h-1 bg-white rounded-full shadow-[0_-5px_10px_rgba(255,255,255,0.8)]" />
          <div className="absolute top-0 right-1 w-2 h-1 bg-white rounded-full shadow-[0_-5px_10px_rgba(255,255,255,0.8)]" />
        </div>
      </div>

      {/* Lead Car Indicator (Openpilot Style) */}
      {leadCar && (
        <motion.div
          className="absolute z-20 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
          animate={{ 
            left: `${leadCar.x}%`, 
            top: `${leadCar.y + 12}%`, 
            x: '-50%' 
          }}
          transition={{ duration: 0.1 }}
        >
          <ChevronDown className="w-8 h-8" />
        </motion.div>
      )}

      {/* Detected Entities */}
      {entities.map(entity => (
        <motion.div
          key={entity.id}
          className="absolute z-10 flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: 1,
            x: '-50%',
            y: `${entity.y}%` 
          }}
          transition={{ duration: 0 }}
          style={{
            left: `${entity.x}%`,
          }}
        >
          {/* Render based on type */}
          {entity.type === 'CAR' || entity.type === 'EV' ? (
            <div className={`w-10 h-20 rounded-lg relative shadow-lg ${entity.type === 'EV' ? 'bg-blue-200/90 border border-blue-400' : 'bg-neutral-400/90 border border-neutral-300'}`}>
               <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-4 bg-neutral-800/50 rounded-sm" />
               <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-3 bg-neutral-800/50 rounded-sm" />
            </div>
          ) : entity.type === 'MOTORCYCLE' ? (
            <div className="w-4 h-12 bg-neutral-400/90 border border-neutral-300 rounded-sm relative shadow-lg">
               <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-800/50 rounded-full" />
            </div>
          ) : entity.type === 'PEDESTRIAN' ? (
            <div className="w-5 h-5 rounded-full bg-cyan-400/80 border border-cyan-300 relative shadow-[0_0_15px_rgba(34,211,238,0.6)]">
               <div className="absolute inset-1 bg-cyan-200 rounded-full" />
            </div>
          ) : entity.type === 'WALL' ? (
            <div className="w-2 h-32 bg-red-500/50 border-l border-r border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
          ) : null}
          
          {/* Label */}
          <div className="mt-1 flex flex-col items-center">
            <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap 
              ${entity.type === 'EV' ? 'bg-blue-900/80 text-blue-300' : 
                entity.type === 'MOTORCYCLE' ? 'bg-neutral-800/80 text-neutral-300' :
                entity.type === 'PEDESTRIAN' ? 'bg-cyan-900/80 text-cyan-300' :
                entity.type === 'WALL' ? 'bg-red-900/80 text-red-300' :
                'bg-neutral-800/80 text-neutral-300'}`}>
              
              {entity.type === 'EV' && <Zap className="w-2.5 h-2.5" />}
              {entity.type === 'MOTORCYCLE' && <Bike className="w-2.5 h-2.5" />}
              {entity.type === 'PEDESTRIAN' && <User className="w-2.5 h-2.5" />}
              {entity.model}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 z-30">
        <div className="text-xs font-mono text-neutral-500 mb-1">
          {dashcamConnected ? 'DDPAI VISION ACTIVE' : 'COMMA.AI / OPENPILOT VISION'}
        </div>
        <div className="flex gap-2">
          {dashcamConnected && (
            <div className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-cyan-400 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              DASHCAM
            </div>
          )}
          <div className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-emerald-400 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIDAR
          </div>
          <div className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-emerald-400 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            RADAR
          </div>
          <div className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-orange-400 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            THERMAL
          </div>
        </div>
      </div>
    </div>
  );
}
