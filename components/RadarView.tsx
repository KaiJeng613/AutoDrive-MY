'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Car, Zap, User, Bike, ShieldAlert, ChevronDown } from 'lucide-react';

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

export default function RadarView({ isNavigating, currentSpeed }: { isNavigating: boolean, currentSpeed: number }) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [proximityAlert, setProximityAlert] = useState(false);

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

        // 2. Prevent Stacking (Simulated Adaptive Cruise Control / Collision Avoidance)
        for (let lane = 0; lane < 3; lane++) {
          // Sort by Y descending (closest to our car at y=85 first)
          const laneEntities = newEntities.filter(e => e.lane === lane).sort((a, b) => b.y - a.y);
          
          for (let i = 0; i < laneEntities.length - 1; i++) {
            const front = laneEntities[i]; // Car closer to us
            const back = laneEntities[i + 1]; // Car further ahead
            
            // If the back car is too close to the front car
            if (front.y - back.y < 15 && front.type !== 'WALL' && back.type !== 'WALL') {
              // Match speed and maintain distance to prevent stacking
              const backIndex = newEntities.findIndex(e => e.id === back.id);
              if (backIndex !== -1) {
                newEntities[backIndex].speed = front.speed;
                newEntities[backIndex].y = front.y - 15;
              }
            }
          }
        }

        // 3. Filter out entities that have passed us or gone too far ahead
        newEntities = newEntities.filter(e => e.y < 150 && e.y > -100);

        // 4. Spawn new entities safely
        if (Math.random() > 0.85 && newEntities.length < 10) {
          const newE = generateEntity();
          // Only spawn if the space is clear
          const conflict = newEntities.some(e => e.lane === newE.lane && Math.abs(e.y - newE.y) < 20);
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
    <div className="w-full h-full relative bg-neutral-950 overflow-hidden">
      {/* Radar Grid Background */}
      <div className="absolute inset-0 opacity-20" 
           style={{
             backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
             backgroundSize: '40px 40px',
             transform: 'perspective(500px) rotateX(60deg) translateY(-100px) scale(2)',
             transformOrigin: 'top center'
           }} 
      />

      {/* Openpilot Simulated Path Prediction */}
      {isNavigating && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <polygon 
            points="46,85 54,85 52,20 48,20" 
            fill="rgba(34, 197, 94, 0.15)" 
            className="transition-all duration-300"
          />
        </svg>
      )}

      {/* Center Line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-emerald-500/30 -translate-x-1/2" />
      {/* Lane Lines */}
      <div className="absolute left-[20%] top-0 bottom-0 w-px border-l-2 border-dashed border-neutral-700/50" />
      <div className="absolute left-[80%] top-0 bottom-0 w-px border-l-2 border-dashed border-neutral-700/50" />

      {/* Proximity Alert Overlay */}
      {proximityAlert && (
        <div className="absolute inset-0 bg-red-500/10 border-4 border-red-500/50 z-40 flex items-center justify-center pointer-events-none animate-pulse">
          <div className="bg-red-950/90 border border-red-500 text-red-500 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
            <ShieldAlert className="w-6 h-6 animate-bounce" />
            <span className="font-mono font-bold text-lg tracking-wider">PROXIMITY WARNING</span>
          </div>
        </div>
      )}

      {/* Our Car (Ego Vehicle) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
        <div className={`w-12 h-24 rounded-lg relative transition-colors duration-300 ${proximityAlert ? 'bg-red-500/20 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]' : 'bg-emerald-500/20 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'}`}>
          <div className={`absolute top-2 left-1/2 -translate-x-1/2 w-8 h-4 rounded-sm ${proximityAlert ? 'bg-red-400/50' : 'bg-emerald-400/50'}`} />
          <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-4 rounded-sm ${proximityAlert ? 'bg-red-400/50' : 'bg-emerald-400/50'}`} />
        </div>
        <div className={`mt-2 text-xs font-mono px-2 py-1 rounded border ${proximityAlert ? 'text-red-400 bg-red-900/80 border-red-500/30' : 'text-emerald-400 bg-neutral-900/80 border-emerald-500/30'}`}>
          {proximityAlert ? 'EVASIVE MANEUVER' : 'OPENPILOT ACTIVE'}
        </div>
      </div>

      {/* Lead Car Indicator (Openpilot Style) */}
      {leadCar && (
        <motion.div
          className="absolute z-20 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
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
            <div className={`w-10 h-20 border-2 rounded-md relative ${entity.type === 'EV' ? 'border-blue-400 bg-blue-400/10' : 'border-neutral-500 bg-neutral-500/10'}`}>
               <div className="absolute inset-0 flex items-center justify-center opacity-50">
                 <div className="w-1 h-1 bg-white rounded-full" />
               </div>
            </div>
          ) : entity.type === 'MOTORCYCLE' ? (
            <div className="w-4 h-12 border-2 border-yellow-500 bg-yellow-500/10 rounded-sm relative">
               <div className="absolute inset-0 flex items-center justify-center opacity-50">
                 <div className="w-1 h-1 bg-yellow-200 rounded-full" />
               </div>
            </div>
          ) : entity.type === 'PEDESTRIAN' ? (
            <div className="w-6 h-6 rounded-full bg-orange-500/40 border border-orange-500 relative shadow-[0_0_15px_rgba(249,115,22,0.8)]">
               {/* Heat signature core */}
               <div className="absolute inset-1 bg-red-500 rounded-full blur-[2px]" />
               <div className="absolute inset-2 bg-yellow-300 rounded-full" />
            </div>
          ) : entity.type === 'WALL' ? (
            <div className="w-2 h-32 bg-neutral-700/50 border-l border-r border-neutral-500 shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
          ) : null}
          
          {/* Label */}
          <div className="mt-1 flex flex-col items-center">
            <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap 
              ${entity.type === 'EV' ? 'bg-blue-900/80 text-blue-300 border border-blue-500/30' : 
                entity.type === 'MOTORCYCLE' ? 'bg-yellow-900/80 text-yellow-300 border border-yellow-500/30' :
                entity.type === 'PEDESTRIAN' ? 'bg-orange-900/80 text-orange-300 border border-orange-500/30' :
                entity.type === 'WALL' ? 'bg-neutral-800/80 text-neutral-400 border border-neutral-600/30' :
                'bg-neutral-800/80 text-neutral-300 border border-neutral-600/30'}`}>
              
              {entity.type === 'EV' && <Zap className="w-3 h-3" />}
              {entity.type === 'MOTORCYCLE' && <Bike className="w-3 h-3" />}
              {entity.type === 'PEDESTRIAN' && <User className="w-3 h-3" />}
              {entity.model}
            </div>
            {entity.type !== 'WALL' && entity.type !== 'PEDESTRIAN' && (
              <div className="text-[9px] font-mono text-neutral-500 mt-0.5">
                {Math.round(entity.speed)} km/h
              </div>
            )}
          </div>
        </motion.div>
      ))}

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 z-30">
        <div className="text-xs font-mono text-neutral-500 mb-1">COMMA.AI / OPENPILOT VISION</div>
        <div className="flex gap-2">
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
      
      {!isNavigating && (
        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-neutral-500 font-mono text-sm flex items-center gap-2">
            <Car className="w-5 h-5" />
            SYSTEM STANDBY
          </div>
        </div>
      )}
    </div>
  );
}
