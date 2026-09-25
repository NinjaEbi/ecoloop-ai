import { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, Circle, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import {
  House,
  BarChart3,
  Clock3,
  BookOpen,
  Info,
  Search,
  LayoutGrid,
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Tv,
  Refrigerator,
  WashingMachine,
  Wind,
  Printer,
  Keyboard,
  Mouse,
  Router,
  Speaker,
  Cpu,
  Recycle,
  Leaf,
  Cloud,
  HelpCircle,
  Bot,
  Sparkles,
  X,
  Check,
  Scale,
  Sprout,
  Phone,
  LocateFixed,
  ArrowRight,
  ArrowLeft,
  Network,
  Activity,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import './styles.css';
import 'leaflet/dist/leaflet.css';
import { historyService, type StoredReport } from './services/historyService';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

const formatLabel = (value: string | null | undefined) =>
  String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const scoreTone = (score: number) => {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

/* =========================================================
   Professional Vector Device Icon Component
   ========================================================= */

function DeviceIcon({
  deviceId,
  size = 18,
  className,
  strokeWidth = 2,
}: {
  deviceId: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  switch (deviceId) {
    case 'smartphone':
      return <Smartphone size={size} strokeWidth={strokeWidth} className={className} />;
    case 'laptop':
      return <Laptop size={size} strokeWidth={strokeWidth} className={className} />;
    case 'desktop':
      return <Monitor size={size} strokeWidth={strokeWidth} className={className} />;
    case 'tablet':
      return <Tablet size={size} strokeWidth={strokeWidth} className={className} />;
    case 'television':
      return <Tv size={size} strokeWidth={strokeWidth} className={className} />;
    case 'monitor':
      return <Monitor size={size} strokeWidth={strokeWidth} className={className} />;
    case 'refrigerator':
      return <Refrigerator size={size} strokeWidth={strokeWidth} className={className} />;
    case 'washing_machine':
      return <WashingMachine size={size} strokeWidth={strokeWidth} className={className} />;
    case 'air_conditioner':
      return <Wind size={size} strokeWidth={strokeWidth} className={className} />;
    case 'printer':
      return <Printer size={size} strokeWidth={strokeWidth} className={className} />;
    case 'keyboard':
      return <Keyboard size={size} strokeWidth={strokeWidth} className={className} />;
    case 'mouse':
      return <Mouse size={size} strokeWidth={strokeWidth} className={className} />;
    case 'router':
      return <Router size={size} strokeWidth={strokeWidth} className={className} />;
    case 'speaker':
      return <Speaker size={size} strokeWidth={strokeWidth} className={className} />;
    case 'other':
    default:
      return <Cpu size={size} strokeWidth={strokeWidth} className={className} />;
  }
}

/* =========================================================
   Centralized Device Definitions (15 Supported Categories)
   ========================================================= */

interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

interface AssessmentQuestion {
  key: string;
  label: string;
  factor: string;
  options: QuestionOption[];
}

interface DeviceMetadata {
  id: string;
  name: string;
  category: string;
  glyph: string;
  description: string;
  mass_kg: number;
  embodied_co2_kg: number;
  recoverable_materials: string[];
  specific_questions: AssessmentQuestion[];
}

const COMMON_QUESTIONS: AssessmentQuestion[] = [
  {
    key: 'age_years',
    label: 'Approximately how old is this device?',
    factor: 'device_age',
    options: [
      { value: '0', label: 'Less than 1 year', description: 'Recent / modern model' },
      { value: '1-2', label: '1 – 2 years', description: 'Contemporary hardware' },
      { value: '3-4', label: '3 – 4 years', description: 'Mid-lifecycle device' },
      { value: '5-7', label: '5 – 7 years', description: 'Mature / older generation' },
      { value: '8+', label: '8+ years', description: 'Vintage / legacy tech' },
    ],
  },
  {
    key: 'working_status',
    label: 'What is the overall working status?',
    factor: 'working_condition',
    options: [
      { value: 'fully_working', label: 'Fully working', description: 'All core features operate smoothly' },
      { value: 'partially_working', label: 'Partially working', description: 'Minor glitch or feature defect, but still runs' },
      { value: 'major_issues', label: 'Major issues', description: 'Unstable, crashes frequently, or boots poorly' },
      { value: 'not_working', label: 'Not working', description: 'Will not power on or perform main function' },
    ],
  },
  {
    key: 'visible_damage',
    label: 'How would you describe the physical condition?',
    factor: 'physical_condition',
    options: [
      { value: 'none', label: 'Pristine / Excellent', description: 'No noticeable scratches or cosmetic defects' },
      { value: 'minor', label: 'Good', description: 'Light surface scuffs or minor scratches only' },
      { value: 'moderate', label: 'Fair', description: 'Noticeable dents, deep scratches, or casing wear' },
      { value: 'major', label: 'Poor', description: 'Cracked screen/glass, broken body, or severe impact' },
    ],
  },
  {
    key: 'repairability',
    label: 'How repairable or modular is this device?',
    factor: 'repairability',
    options: [
      { value: 'easy', label: 'High repairability', description: 'Modular design, standard screws, accessible spare parts' },
      { value: 'moderate', label: 'Moderate repairability', description: 'Standard tools needed, common components available' },
      { value: 'difficult', label: 'Difficult / Glued', description: 'Proprietary parts, glued enclosure, or obsolete parts' },
    ],
  },
];

const DEVICES: DeviceMetadata[] = [
  {
    id: 'smartphone',
    name: 'Smartphone',
    category: 'Mobile',
    glyph: 'smartphone',
    description: 'iPhones, Android phones, mobile devices',
    mass_kg: 0.19,
    embodied_co2_kg: 58.0,
    recoverable_materials: ['Gold', 'Copper', 'Cobalt', 'Lithium', 'Aluminum', 'Polycarbonate'],
    specific_questions: [
      {
        key: 'battery_condition',
        label: 'Battery health & battery runtime',
        factor: 'functional_health',
        options: [
          { value: 'healthy', label: 'Holds full-day charge', description: '80%+ health capacity' },
          { value: 'degraded', label: 'Drains quickly', description: 'Needs multiple charges per day' },
          { value: 'dead_or_swollen', label: 'Dead / swollen battery', description: 'Only turns on plugged in or bulging' },
        ],
      },
      {
        key: 'touch_display',
        label: 'Touchscreen & display panel',
        factor: 'functional_health',
        options: [
          { value: 'flawless', label: 'Flawless touch & bright screen', description: 'Zero dead zones or display lines' },
          { value: 'minor_touch_glitch', label: 'Minor touch lag or light scratches', description: 'Usable with minor cosmetic defect' },
          { value: 'broken_or_black', label: 'Cracked / unresponsive touch', description: 'Black screen or shattered digitizer' },
        ],
      },
      {
        key: 'charging_ports',
        label: 'Charging port & connectivity',
        factor: 'functional_health',
        options: [
          { value: 'working', label: 'Charges reliably', description: 'Port is firm and data transfers work' },
          { value: 'loose', label: 'Port is loose or finicky', description: 'Requires wiggling cable to connect' },
          { value: 'not_working', label: 'Port broken', description: 'Cannot charge or transfer data via cable' },
        ],
      },
    ],
  },
  {
    id: 'laptop',
    name: 'Laptop',
    category: 'Computers',
    glyph: 'laptop',
    description: 'MacBooks, Windows laptops, Ultrabooks',
    mass_kg: 2.2,
    embodied_co2_kg: 290.0,
    recoverable_materials: ['Aluminum', 'Copper', 'Gold', 'Silver', 'Lithium', 'Engineering Plastics'],
    specific_questions: [
      {
        key: 'battery_condition',
        label: 'Battery health & unplugged runtime',
        factor: 'functional_health',
        options: [
          { value: 'healthy', label: 'Holds charge 3+ hours', description: 'Good mobile battery life' },
          { value: 'short_life', label: 'Under 1 hour runtime', description: 'Heavily degraded battery' },
          { value: 'dead_or_swollen', label: 'Dead battery', description: 'Works only on charger' },
        ],
      },
      {
        key: 'display_panel',
        label: 'Display screen & hinges',
        factor: 'functional_health',
        options: [
          { value: 'perfect', label: 'Clean display & firm hinges', description: 'No dead pixels, smooth hinge movement' },
          { value: 'minor_lines_loose_hinge', label: 'Minor lines or loose hinge', description: 'Screen works but has minor defect' },
          { value: 'cracked_or_no_display', label: 'Cracked screen or broken hinge', description: 'Severe screen or hinge failure' },
        ],
      },
      {
        key: 'keyboard_trackpad',
        label: 'Keyboard and trackpad input',
        factor: 'functional_health',
        options: [
          { value: 'all_working', label: 'All keys & trackpad work', description: 'Zero missed keystrokes or gestures' },
          { value: 'some_keys_faulty', label: 'Some keys stick or faulty click', description: 'External keyboard needed' },
          { value: 'unresponsive', label: 'Completely dead inputs', description: 'Internal input ribbon/controller dead' },
        ],
      },
    ],
  },
  {
    id: 'desktop',
    name: 'Desktop Computer',
    category: 'Computers',
    glyph: 'desktop',
    description: 'PCs, workstations, all-in-ones',
    mass_kg: 9.5,
    embodied_co2_kg: 420.0,
    recoverable_materials: ['Steel', 'Copper', 'Aluminum', 'Gold', 'Silver', 'Circuit Boards'],
    specific_questions: [
      {
        key: 'power_boot',
        label: 'Power supply & motherboard boot',
        factor: 'functional_health',
        options: [
          { value: 'reliable', label: 'Boots reliably and quickly', description: 'Stable power supply and motherboard POST' },
          { value: 'intermittent', label: 'Intermittent restarts or hangs', description: 'Occasional boot freeze or power loop' },
          { value: 'no_power', label: 'No power or fails to boot', description: 'Dead PSU or motherboard short' },
        ],
      },
      {
        key: 'display_output',
        label: 'Graphics card & display output',
        factor: 'functional_health',
        options: [
          { value: 'clear_signal', label: 'Clear video output on all ports', description: 'GPU and integrated ports work cleanly' },
          { value: 'artifacts', label: 'Video artifacts or glitchy output', description: 'Flickering or bad port' },
          { value: 'no_signal', label: 'No video output detected', description: 'Black screen across all video ports' },
        ],
      },
    ],
  },
  {
    id: 'tablet',
    name: 'Tablet',
    category: 'Mobile',
    glyph: 'tablet',
    description: 'iPads, Android tablets, e-readers',
    mass_kg: 0.48,
    embodied_co2_kg: 110.0,
    recoverable_materials: ['Aluminum', 'Lithium', 'Cobalt', 'Gold', 'Copper', 'Display Glass'],
    specific_questions: [
      {
        key: 'touch_display',
        label: 'Touchscreen digitizer & display',
        factor: 'functional_health',
        options: [
          { value: 'flawless', label: 'Crisp picture & multi-touch works', description: 'Smooth gestures and bright display' },
          { value: 'minor_touch_glitch', label: 'Minor touch dead spots', description: 'Occasional unresponsiveness' },
          { value: 'cracked_unresponsive', label: 'Cracked screen or unresponsive', description: 'Glass shattered or touch dead' },
        ],
      },
      {
        key: 'battery_condition',
        label: 'Battery runtime',
        factor: 'functional_health',
        options: [
          { value: 'healthy', label: 'Holds charge for days of standby', description: 'Normal healthy battery life' },
          { value: 'degraded', label: 'Drains within 1-2 hours', description: 'Short battery life' },
          { value: 'dead', label: 'Dead battery', description: 'Powers on only while plugged in' },
        ],
      },
    ],
  },
  {
    id: 'television',
    name: 'Television',
    category: 'Audio & Video',
    glyph: 'television',
    description: 'LED, OLED, LCD TVs, smart TVs',
    mass_kg: 14.0,
    embodied_co2_kg: 310.0,
    recoverable_materials: ['Optical Glass', 'Copper', 'Aluminum', 'Indium', 'Circuit Boards', 'Flame-Retardant Plastics'],
    specific_questions: [
      {
        key: 'display_panel',
        label: 'Picture quality & backlighting',
        factor: 'functional_health',
        options: [
          { value: 'sharp', label: 'Sharp image, uniform backlight', description: 'No dead zones, burn-in, or lines' },
          { value: 'dim_or_lines', label: 'Dim patches or colored lines', description: 'Backlight LED failing or minor line' },
          { value: 'cracked_or_black', label: 'Cracked panel or black screen', description: 'Panel broken or completely black' },
        ],
      },
      {
        key: 'audio_speakers',
        label: 'Built-in audio & speakers',
        factor: 'functional_health',
        options: [
          { value: 'clear', label: 'Clear, balanced sound', description: 'Speakers play without distortion' },
          { value: 'rattling_distorted', label: 'Distorted or rattling audio', description: 'Vibrating or muffled speakers' },
          { value: 'no_sound', label: 'No audio output', description: 'Internal amplifier or speakers failed' },
        ],
      },
    ],
  },
  {
    id: 'monitor',
    name: 'Monitor',
    category: 'Computers',
    glyph: 'monitor',
    description: 'Computer monitors, gaming monitors',
    mass_kg: 4.8,
    embodied_co2_kg: 180.0,
    recoverable_materials: ['Glass', 'Aluminum', 'Copper', 'ABS Plastics', 'Printed Circuit Boards'],
    specific_questions: [
      {
        key: 'panel_clarity',
        label: 'Panel pixels & backlight clarity',
        factor: 'functional_health',
        options: [
          { value: 'clear_no_dead_pixels', label: 'Flawless panel, zero dead pixels', description: 'Uniform illumination' },
          { value: 'minor_flicker_pixels', label: '1-2 stuck pixels or slight flicker', description: 'Minor cosmetic flaw' },
          { value: 'cracked_or_dead', label: 'Cracked panel or dead display', description: 'Screen damaged or unreadable' },
        ],
      },
      {
        key: 'ports_power',
        label: 'Video inputs (HDMI, DP, USB-C) & power',
        factor: 'functional_health',
        options: [
          { value: 'all_working', label: 'All ports detect video signal', description: 'Powers on instantly' },
          { value: 'loose_connection', label: 'Loose port or slow power-up', description: 'Requires wiggling cable' },
          { value: 'no_signal_or_power', label: 'No signal or fails to power on', description: 'Power supply or board dead' },
        ],
      },
    ],
  },
  {
    id: 'refrigerator',
    name: 'Refrigerator',
    category: 'Home Appliances',
    glyph: 'refrigerator',
    description: 'Single-door, double-door, mini-fridges',
    mass_kg: 68.0,
    embodied_co2_kg: 520.0,
    recoverable_materials: ['Steel', 'Copper Tubing', 'Aluminum Coils', 'Polyurethane Foam', 'ABS Liners'],
    specific_questions: [
      {
        key: 'cooling_efficiency',
        label: 'Cooling & freezing performance',
        factor: 'functional_health',
        options: [
          { value: 'maintains_temps', label: 'Maintains cold and freeze temps', description: 'Refrigerates and freezes properly' },
          { value: 'inconsistent_cooling', label: 'Weak cooling or ice buildup', description: 'Inconsistent temperature regulation' },
          { value: 'not_cooling', label: 'Fails to cool completely', description: 'Compressor runs or clicks with zero cooling' },
        ],
      },
      {
        key: 'compressor_operation',
        label: 'Compressor noise & running cycles',
        factor: 'functional_health',
        options: [
          { value: 'quiet_cycles', label: 'Cycles smoothly and quietly', description: 'Normal background hum' },
          { value: 'runs_continuously', label: 'Loud hum / runs continuously', description: 'Struggling compressor' },
          { value: 'clicking_not_starting', label: 'Clicking sound, won’t start', description: 'Relay or compressor motor locked' },
        ],
      },
    ],
  },
  {
    id: 'washing_machine',
    name: 'Washing Machine',
    category: 'Home Appliances',
    glyph: 'washing_machine',
    description: 'Front-load, top-load, washer-dryers',
    mass_kg: 62.0,
    embodied_co2_kg: 380.0,
    recoverable_materials: ['Stainless Steel', 'Cast Iron', 'Copper Motor Windings', 'Polypropylene Plastics'],
    specific_questions: [
      {
        key: 'motor_drum_spin',
        label: 'Drum spin cycle & motor',
        factor: 'functional_health',
        options: [
          { value: 'smooth_spin', label: 'Spins smoothly through all cycles', description: 'Quiet rotation and agitation' },
          { value: 'loud_bearing_wobble', label: 'Loud bearing roar or wobble', description: 'Worn drum bearings or shock absorbers' },
          { value: 'drum_stuck', label: 'Drum stuck or won’t spin', description: 'Drive belt or motor failure' },
        ],
      },
      {
        key: 'water_drainage',
        label: 'Water intake & drainage pump',
        factor: 'functional_health',
        options: [
          { value: 'pumps_normally', label: 'Fills and drains on schedule', description: 'Zero leaks or drainage delays' },
          { value: 'slow_drain_or_leak', label: 'Slow drainage or minor drip', description: 'Pump filter partly blocked' },
          { value: 'pump_jammed_water_trapped', label: 'Water stays trapped in drum', description: 'Drain pump dead or jammed' },
        ],
      },
    ],
  },
  {
    id: 'air_conditioner',
    name: 'Air Conditioner',
    category: 'Home Appliances',
    glyph: 'air_conditioner',
    description: 'Split ACs, window ACs, portable ACs',
    mass_kg: 38.0,
    embodied_co2_kg: 440.0,
    recoverable_materials: ['Copper Coils', 'Aluminum Fins', 'Galvanized Steel', 'Compressor Motors', 'ABS Plastics'],
    specific_questions: [
      {
        key: 'cooling_airflow',
        label: 'Cooling performance & airflow',
        factor: 'functional_health',
        options: [
          { value: 'blows_cold', label: 'Chills room rapidly and cleanly', description: 'Cold, strong airflow' },
          { value: 'weak_cooling', label: 'Weak cooling, slow to chill', description: 'Low refrigerant or dirty coils' },
          { value: 'fan_only_warm', label: 'Blows warm room air only', description: 'Cooling compressor not functioning' },
        ],
      },
      {
        key: 'compressor_sound',
        label: 'Outdoor unit & compressor operation',
        factor: 'functional_health',
        options: [
          { value: 'normal_cycles', label: 'Quiet and normal hum', description: 'Smooth outdoor unit operation' },
          { value: 'loud_rattling', label: 'Loud rattling or vibration', description: 'Fan blade or compressor strain' },
          { value: 'compressor_dead', label: 'Compressor dead / trips breaker', description: 'Electrical short or seized unit' },
        ],
      },
    ],
  },
  {
    id: 'printer',
    name: 'Printer',
    category: 'Peripherals',
    glyph: 'printer',
    description: 'Inkjet, laser, all-in-one',
    mass_kg: 5.5,
    embodied_co2_kg: 85.0,
    recoverable_materials: ['ABS Plastics', 'Steel Rods', 'Copper Stepper Motors', 'Optical Glass', 'Circuitry'],
    specific_questions: [
      {
        key: 'print_quality',
        label: 'Print output & paper feeding',
        factor: 'functional_health',
        options: [
          { value: 'crisp_text_feeds_well', label: 'Clean prints, smooth feeding', description: 'No jams or faded lines' },
          { value: 'streaks_or_minor_jams', label: 'Occasional jam or faint streaks', description: 'Pickup rollers worn or printhead clogged' },
          { value: 'constant_jam_or_smudged', label: 'Frequent jams or unreadable print', description: 'Mechanical feed or head failure' },
        ],
      },
    ],
  },
  {
    id: 'keyboard',
    name: 'Keyboard',
    category: 'Peripherals',
    glyph: 'keyboard',
    description: 'Mechanical, membrane, wireless',
    mass_kg: 0.75,
    embodied_co2_kg: 18.0,
    recoverable_materials: ['PBT/ABS Plastics', 'Copper Cabling', 'Metal Backplates', 'PCB Switches'],
    specific_questions: [
      {
        key: 'key_actuation',
        label: 'Key responsiveness',
        factor: 'functional_health',
        options: [
          { value: 'all_keys_working', label: 'All keys register cleanly', description: 'Zero missed keystrokes' },
          { value: 'few_keys_sticky', label: '1 or 2 keys stick or require hard press', description: 'Minor key switch wear' },
          { value: 'dead_row_or_spamming', label: 'Multiple dead keys or ghosting', description: 'Membrane or PCB trace damaged' },
        ],
      },
    ],
  },
  {
    id: 'mouse',
    name: 'Mouse',
    category: 'Peripherals',
    glyph: 'mouse',
    description: 'Optical, laser, wireless, gaming mice',
    mass_kg: 0.12,
    embodied_co2_kg: 6.0,
    recoverable_materials: ['ABS Plastics', 'Copper Wire', 'Microswitches', 'Optical Sensors'],
    specific_questions: [
      {
        key: 'sensor_tracking',
        label: 'Optical sensor & cursor movement',
        factor: 'functional_health',
        options: [
          { value: 'smooth_accurate', label: 'Accurate cursor tracking', description: 'Smooth movement on mousepads and desks' },
          { value: 'occasional_jitter', label: 'Occasional jitter or jump', description: 'Sensor lens or cable minor wear' },
          { value: 'sensor_dead', label: 'Cursor does not move', description: 'Optical sensor or laser dead' },
        ],
      },
      {
        key: 'clicks_scroll',
        label: 'Click switches & scroll wheel',
        factor: 'functional_health',
        options: [
          { value: 'tactile_clicks', label: 'Crisp clicks & smooth scroll', description: 'Normal switch actuation' },
          { value: 'double_clicking_or_jump', label: 'Occasional double-click or scroll jump', description: 'Microswitch contact bounce' },
          { value: 'broken_switches', label: 'Click switches or scroll broken', description: 'Unresponsive left/right click' },
        ],
      },
    ],
  },
  {
    id: 'router',
    name: 'Router',
    category: 'Networking',
    glyph: 'router',
    description: 'Wi-Fi routers, modems, switches',
    mass_kg: 0.45,
    embodied_co2_kg: 32.0,
    recoverable_materials: ['Aluminum Heat Sinks', 'Copper Antennas', 'FR-4 PCB', 'Polycarbonate Casing'],
    specific_questions: [
      {
        key: 'wifi_signal',
        label: 'Wi-Fi signal strength & data stability',
        factor: 'functional_health',
        options: [
          { value: 'strong_stable', label: 'Fast, solid Wi-Fi across range', description: 'Reliable wireless performance' },
          { value: 'occasional_drops', label: 'Needs rebooting once a week', description: 'Intermittent signal drops' },
          { value: 'no_wifi_broadcast', label: 'No Wi-Fi broadcast / dead radio', description: 'Wireless hardware failed' },
        ],
      },
    ],
  },
  {
    id: 'speaker',
    name: 'Speaker / Audio Device',
    category: 'Audio & Video',
    glyph: 'speaker',
    description: 'Bluetooth speakers, soundbars, amplifiers',
    mass_kg: 1.8,
    embodied_co2_kg: 45.0,
    recoverable_materials: ['Ferrite Magnets', 'Copper Voice Coils', 'Aluminum Casing', 'Amplifier Boards'],
    specific_questions: [
      {
        key: 'audio_clarity',
        label: 'Audio clarity & cone integrity',
        factor: 'functional_health',
        options: [
          { value: 'rich_clear_sound', label: 'Clear sound, zero distortion', description: 'Punchy bass, clean treble' },
          { value: 'minor_distortion_high_vol', label: 'Distortion only at high volume', description: 'Minor speaker surround fatigue' },
          { value: 'heavily_distorted_or_mute', label: 'Heavily muffled or silent', description: 'Blown cone or dead amplifier' },
        ],
      },
    ],
  },
  {
    id: 'other',
    name: 'Other Electronics',
    category: 'General',
    glyph: 'other',
    description: 'Power tools, smart home devices, etc.',
    mass_kg: 1.5,
    embodied_co2_kg: 40.0,
    recoverable_materials: ['Recyclable Plastics', 'Copper Cabling', 'Steel Fasteners', 'Circuit Boards'],
    specific_questions: [
      {
        key: 'power_status',
        label: 'Power on & electrical stability',
        factor: 'functional_health',
        options: [
          { value: 'turns_on_reliably', label: 'Powers on reliably and safely', description: 'Standard power operation' },
          { value: 'intermittent_power', label: 'Runs warm or intermittent power', description: 'Loose internal wire or heat issue' },
          { value: 'no_power_or_fault', label: 'Completely dead or trips breaker', description: 'Electrical short or dead transformer' },
        ],
      },
    ],
  },
];

/* Helper to get metadata for any device */
function getDeviceMeta(deviceId: string): DeviceMetadata {
  return DEVICES.find((d) => d.id === deviceId) || DEVICES[DEVICES.length - 1];
}

/* Marker color mapping for OSM map */
const deviceMarkerColor: Record<string, string> = {
  smartphone: '#1688e8',
  laptop: '#6f3fc1',
  desktop: '#2b7de9',
  tablet: '#0fa0b8',
  television: '#e6374a',
  monitor: '#f28a16',
  refrigerator: '#0d9488',
  washing_machine: '#0284c7',
  air_conditioner: '#06b6d4',
  printer: '#76523a',
  keyboard: '#5b6b7a',
  mouse: '#4b6578',
  router: '#8b5cf6',
  speaker: '#ec4899',
  other: '#159b78',
};

const deviceMarkerLabel: Record<string, string> = {
  smartphone: 'Phone',
  laptop: 'Laptop',
  desktop: 'Desktop',
  tablet: 'Tablet',
  television: 'TV',
  monitor: 'Monitor',
  refrigerator: 'Fridge',
  washing_machine: 'Washer',
  air_conditioner: 'AC',
  printer: 'Printer',
  keyboard: 'Keyboard',
  mouse: 'Mouse',
  router: 'Router',
  speaker: 'Audio',
  other: 'Device',
};

const categoryGuidance: Record<string, { icon: string; focus: string; detail: string }> = {
  smartphone: { icon: 'smartphone', focus: 'Mobile & phone specialists', detail: 'We prioritize authorized mobile repair and electronics resale options matching your action.' },
  laptop: { icon: 'laptop', focus: 'Computer & laptop specialists', detail: 'We prioritize computer repair shops, refurbishers, and e-waste collection points.' },
  desktop: { icon: 'desktop', focus: 'PC & computing technicians', detail: 'We search for local computer hardware services and modular upgrade centers.' },
  tablet: { icon: 'tablet', focus: 'Mobile & tablet specialists', detail: 'We look for screen repair, battery replacement, and certified donation hubs.' },
  television: { icon: 'television', focus: 'TV & electronics repairers', detail: 'We prioritize television technicians and designated bulky e-waste drop-offs.' },
  monitor: { icon: 'monitor', focus: 'Computer & display specialists', detail: 'We search for electronics repair shops and monitor recycling points.' },
  refrigerator: { icon: 'refrigerator', focus: 'Appliance repair & circular hubs', detail: 'We search for certified domestic appliance technicians and licensed white-goods recyclers.' },
  washing_machine: { icon: 'washing_machine', focus: 'Major appliance repairers', detail: 'We search for washing machine repair services and appliance recycling centers.' },
  air_conditioner: { icon: 'air_conditioner', focus: 'HVAC & appliance technicians', detail: 'We search for cooling appliance services and authorized refrigerant-safe recyclers.' },
  printer: { icon: 'printer', focus: 'Printer & office equipment hubs', detail: 'We find printer repairers and authorized cartridge/small appliance recyclers.' },
  keyboard: { icon: 'keyboard', focus: 'Computer peripheral options', detail: 'We find computer shops and small electronics recycling bins.' },
  mouse: { icon: 'mouse', focus: 'Computer accessory options', detail: 'We find computer shops and certified small electronics collection points.' },
  router: { icon: 'router', focus: 'Networking & telecom options', detail: 'We prioritize electronics recyclers and local IT refurbishment collectives.' },
  speaker: { icon: 'speaker', focus: 'Audio & Hi-Fi specialists', detail: 'We find audio electronics repair shops and circular reuse marketplaces.' },
  other: { icon: 'other', focus: 'Electronics & e-waste options', detail: 'We use your recommended action to find the best local circular economy matches.' },
};

function deviceSvg(deviceType: string): string {
  const stroke = '#ffffff';
  switch (deviceType) {
    case 'smartphone':
    case 'tablet':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="${stroke}" stroke-width="2"/><circle cx="12" cy="18" r="1" fill="${stroke}"/></svg>`;
    case 'laptop':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="11" rx="1.5" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M3 19h18l-2-3H5l-2 3Z" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/></svg>`;
    case 'desktop':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="12" height="11" rx="1.5" fill="none" stroke="${stroke}" stroke-width="1.8"/><path d="M6 18h6M9 14v4" fill="none" stroke="${stroke}" stroke-width="1.8"/><rect x="17" y="5" width="4" height="14" rx="1" fill="none" stroke="${stroke}" stroke-width="1.8"/><circle cx="19" cy="8" r="0.7" fill="${stroke}"/></svg>`;
    case 'television':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="13" rx="2" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M9 21h6M12 18v3" fill="none" stroke="${stroke}" stroke-width="2"/></svg>`;
    case 'monitor':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M9 21h6M12 17v4" fill="none" stroke="${stroke}" stroke-width="2"/></svg>`;
    case 'refrigerator':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M5 10h14M8 6v2M8 13v3" fill="none" stroke="${stroke}" stroke-width="1.8"/></svg>`;
    case 'washing_machine':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="${stroke}" stroke-width="2"/><circle cx="12" cy="13" r="5" fill="none" stroke="${stroke}" stroke-width="2"/><circle cx="8" cy="6" r="1" fill="${stroke}"/><circle cx="11" cy="6" r="1" fill="${stroke}"/></svg>`;
    case 'air_conditioner':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="9" rx="1.5" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M6 11h12M7 17c1.5 1.5 2.5 1.5 4 0M13 17c1.5 1.5 2.5 1.5 4 0" fill="none" stroke="${stroke}" stroke-width="1.8"/></svg>`;
    case 'printer':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V4h10v5" fill="none" stroke="${stroke}" stroke-width="2"/><rect x="4" y="9" width="16" height="9" rx="2" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M7 15h10v5H7z" fill="none" stroke="${stroke}" stroke-width="2"/></svg>`;
    case 'keyboard':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2" fill="none" stroke="${stroke}" stroke-width="1.8"/><path d="M6 10h1M9 10h1M12 10h1M15 10h1M18 10h1M6 13h1M9 13h6M17 13h1" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    case 'mouse':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="5" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M12 3v6" stroke="${stroke}" stroke-width="2"/><circle cx="12" cy="7" r="1" fill="${stroke}"/></svg>`;
    case 'router':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="12" width="18" height="8" rx="2" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M6 12V4M18 12V4" stroke="${stroke}" stroke-width="2"/><circle cx="7" cy="16" r="1" fill="${stroke}"/><circle cx="10" cy="16" r="1" fill="${stroke}"/><circle cx="13" cy="16" r="1" fill="${stroke}"/></svg>`;
    case 'speaker':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="${stroke}" stroke-width="2"/><circle cx="12" cy="7" r="2" fill="none" stroke="${stroke}" stroke-width="1.8"/><circle cx="12" cy="15" r="4" fill="none" stroke="${stroke}" stroke-width="2"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 12l-8 9-8-9 8-9Z" fill="none" stroke="${stroke}" stroke-width="2"/></svg>`;
  }
}

function shopSvg(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v10H4z" fill="none" stroke="#0f6f59" stroke-width="1.8"/><path d="M3 10l2-5h14l2 5" fill="none" stroke="#0f6f59" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 10v2.5M12 10v2.5M17 10v2.5M8 20v-5h8v5" fill="none" stroke="#0f6f59" stroke-width="1.6"/></svg>`;
}

function generalSvg(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z" fill="none" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/></svg>`;
}

function createMapIcon(
  kind: 'user' | 'place',
  deviceType: string,
  _action: string,
  searchTier: 'targeted' | 'compatible' | 'general' = 'targeted',
  selected = false,
) {
  if (kind === 'user') {
    return L.divIcon({
      className: 'ecoloop-map-icon-wrapper',
      html: '<div class="ecoloop-map-user-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg></div>',
      iconSize: [42, 50],
      iconAnchor: [21, 45],
      popupAnchor: [0, -42],
    });
  }

  const color = deviceMarkerColor[deviceType] ?? deviceMarkerColor.other;
  const isGeneral = searchTier === 'general';
  const mainIcon = isGeneral ? generalSvg() : deviceSvg(deviceType);
  const title = isGeneral ? 'General local lead' : `${deviceMarkerLabel[deviceType] ?? 'Device'} option`;

  return L.divIcon({
    className: 'ecoloop-map-icon-wrapper',
    html: `
      <div class="ecoloop-map-place-icon-v13 ${isGeneral ? 'is-general' : ''} ${selected ? 'is-selected' : ''}" style="--marker-color:${color}" title="${title}">
        <span class="place-device-main-v13">${mainIcon}</span>
        <span class="place-shop-badge-v13">${shopSvg()}</span>
      </div>`,
    iconSize: [54, 58],
    iconAnchor: [27, 51],
    popupAnchor: [0, -48],
  });
}

function buildGoogleMapsSearchUrl(deviceType: string, action: string) {
  const deviceLabels: Record<string, string> = {
    smartphone: 'smartphone',
    laptop: 'laptop',
    desktop: 'desktop computer',
    tablet: 'tablet',
    television: 'TV',
    monitor: 'monitor',
    refrigerator: 'refrigerator',
    washing_machine: 'washing machine',
    air_conditioner: 'air conditioner',
    printer: 'printer',
    keyboard: 'computer keyboard',
    mouse: 'computer mouse',
    router: 'Wi-Fi router',
    speaker: 'audio speaker',
    other: 'electronics device',
  };
  const deviceLabel = deviceLabels[deviceType] ?? 'electronics device';
  const actionQueries: Record<string, string> = {
    repair: `${deviceLabel} repair near me`,
    refurbish: `${deviceLabel} refurbishment near me`,
    sell: `sell used ${deviceLabel} near me`,
    donate: `donate ${deviceLabel} near me`,
    recycle: `${deviceLabel} recycling near me`,
  };
  const query = actionQueries[action.toLowerCase()] ?? `${deviceLabel} electronics service near me`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/* =========================================================
   Types
   ========================================================= */

type Result = {
  id: number;
  device_type: string;
  condition: string;
  condition_score: number;
  assessment_confidence: number;
  ecoscore: number;
  ecoscore_band: string;
  ecoscore_breakdown: Record<string, number>;
  recommendation_scores: Record<string, number>;
  recommended_action: string;
  stakeholder_category: string;
  explanation: string;
  limitations: string[];
  recommendation_reasons?: string[];
  environmental_impact?: {
    waste_avoided_kg?: number;
    co2_benefit_kg?: number;
    device_mass_kg?: number;
    recoverable_materials?: string[];
    reuse_potential_rating?: string;
    estimate_disclaimer?: string;
  };
  breakdown_details?: Record<
    string,
    {
      label: string;
      score: number;
      max: number;
      normalized: number;
      summary: string;
    }
  >;
};

/* =========================================================
   Navigation Component
   ========================================================= */

function Nav({
  currentPage,
  navigate,
}: {
  currentPage: 'home' | 'analyze' | 'history' | 'learn' | 'about';
  navigate: (p: 'home' | 'analyze' | 'history' | 'learn' | 'about') => void;
}) {
  return (
    <nav>
      <div className="nav-container">
        <button className="brand-wrapper" onClick={() => navigate('home')} type="button">
          <svg className="brand-logo-icon" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="#e8f6ed" />
            <path d="M28 11C28 11 20 12 15 17C10 22 11 29 11 29C11 29 18 28 23 23C28 18 28 11 28 11Z" fill="#168166" />
            <path d="M15 27L23 15" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <div className="brand-text-col">
            <span className="brand-name">EcoLoop AI</span>
            <span className="brand-tagline">Assess · Reuse · Recycle · Sustain</span>
          </div>
        </button>

        <div className="nav-center-pills">
          <button
            type="button"
            className={`nav-pill-btn ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => navigate('home')}
          >
            <House size={16} strokeWidth={2} />
            <span>Home</span>
          </button>
          <button
            type="button"
            className={`nav-pill-btn ${currentPage === 'analyze' ? 'active' : ''}`}
            onClick={() => navigate('analyze')}
          >
            <BarChart3 size={16} strokeWidth={2} />
            <span>Analyze</span>
          </button>
          <button
            type="button"
            className={`nav-pill-btn ${currentPage === 'history' ? 'active' : ''}`}
            onClick={() => navigate('history')}
          >
            <Clock3 size={16} strokeWidth={2} />
            <span>History</span>
          </button>
          <button
            type="button"
            className={`nav-pill-btn ${currentPage === 'learn' ? 'active' : ''}`}
            onClick={() => navigate('learn')}
          >
            <BookOpen size={16} strokeWidth={2} />
            <span>Learn</span>
          </button>
          <button
            type="button"
            className={`nav-pill-btn ${currentPage === 'about' ? 'active' : ''}`}
            onClick={() => navigate('about')}
          >
            <Info size={16} strokeWidth={2} />
            <span>About</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

/* =========================================================
   Stakeholders Section (Map & Live OSM)
   ========================================================= */

function Stakeholders({ action, deviceType }: { action: string; deviceType: string }) {
  type Place = {
    id: string;
    name: string;
    type: string;
    action: string;
    lat: number;
    lng: number;
    distance_km: number;
    address?: string;
    phone?: string;
    website?: string;
    source: string;
    match_score: number;
    match_level: string;
    match_reasons: string[];
    services?: string[];
    search_tier?: 'targeted' | 'compatible' | 'general';
  };

  type Radius = 10 | 25 | 50;

  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'denied' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState<Radius>(10);
  const [lastRadiusWithResults, setLastRadiusWithResults] = useState<Radius | null>(null);
  const [autoExpand, setAutoExpand] = useState(true);
  const [searchTier, setSearchTier] = useState<'targeted' | 'compatible' | 'general'>('targeted');
  const [searchMessage, setSearchMessage] = useState('');
  const [exhausted50km, setExhausted50km] = useState(false);
  const [externalSearchUrl, setExternalSearchUrl] = useState('');
  const [osmServiceUnavailable, setOsmServiceUnavailable] = useState(false);

  const actionLabel = action ? formatLabel(action) : 'Nearby options';
  const deviceLabel = formatLabel(deviceType || 'device');
  const guidance = categoryGuidance[deviceType] ?? categoryGuidance.other;
  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? null;

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationMessage('Location services are not supported by this browser.');
      return;
    }

    setLocationStatus('loading');
    setLocationMessage('Finding the most accurate location available...');
    setPlacesError('');
    setSearchMessage('');
    setExhausted50km(false);
    setExternalSearchUrl('');
    setOsmServiceUnavailable(false);
    setSearchTier('targeted');
    setSelectedPlaceId(null);
    setAutoExpand(true);
    setSearchRadius(10);

    let bestPosition: GeolocationPosition | null = null;
    let settled = false;
    let watchId: number | null = null;
    const startedAt = Date.now();

    const finishLocation = (position: GeolocationPosition | null) => {
      if (settled) return;
      settled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);

      if (!position) {
        setLocationStatus('error');
        setLocationMessage('Unable to get a reliable location. Please try again.');
        return;
      }

      const accuracy = position.coords.accuracy;
      setLocation({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy });
      setLocationStatus('success');
      setLocationMessage(
        accuracy <= 30
          ? 'Excellent location accuracy.'
          : accuracy <= 75
            ? 'Good location accuracy.'
            : accuracy <= 150
              ? 'Location found. Results are reasonably approximate.'
              : 'Location found (approximate positioning).'
      );
    };

    const acceptPosition = (position: GeolocationPosition) => {
      if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) bestPosition = position;
      const elapsed = Date.now() - startedAt;
      if (position.coords.accuracy <= 30 || (position.coords.accuracy <= 75 && elapsed >= 6000)) {
        finishLocation(position);
      }
    };

    navigator.geolocation.getCurrentPosition(acceptPosition, () => undefined, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });

    watchId = navigator.geolocation.watchPosition(
      acceptPosition,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
          setLocationMessage('Location permission was denied. Allow location access and try again.');
        } else if (bestPosition) {
          finishLocation(bestPosition);
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );

    window.setTimeout(() => finishLocation(bestPosition), 20000);
  };

  useEffect(() => {
    if (!location) return;

    const loadNearbyPlaces = async () => {
      setPlacesLoading(true);
      setPlacesError('');
      setSelectedPlaceId(null);

      try {
        const params = new URLSearchParams({
          lat: String(location.lat),
          lng: String(location.lng),
          action: action || '',
          device_type: deviceType || 'other',
          radius_km: String(searchRadius),
        });
        const response = await fetch(`${API}/stakeholders/nearby?${params.toString()}`);
        if (!response.ok) throw new Error(`Nearby places request failed with status ${response.status}`);

        const data = await response.json();
        const results: Place[] = data.results || [];
        setPlaces(results);
        setSearchTier(data.search_tier || 'targeted');
        setSearchMessage(data.search_message || '');
        setExhausted50km(Boolean(data.exhausted_50km));
        setExternalSearchUrl(data.external_search_url || '');

        if (results.length > 0) {
          setLastRadiusWithResults(searchRadius);
          setSelectedPlaceId(results[0].id);
          setPlacesError('');
          setAutoExpand(false);
        } else if (autoExpand && searchRadius < 50) {
          const nextRadius: Radius = searchRadius === 10 ? 25 : 50;
          setLastRadiusWithResults(null);
          setPlacesError(`No options found within ${searchRadius} km. Expanding search to ${nextRadius} km...`);
          window.setTimeout(() => setSearchRadius(nextRadius), 700);
        } else {
          setLastRadiusWithResults(null);
          setPlacesError(data.search_message || `No ${actionLabel.toLowerCase()} found within ${searchRadius} km.`);
        }
      } catch (error) {
        console.error('Nearby places error:', error);
        setPlaces([]);
        setLastRadiusWithResults(null);
        setExternalSearchUrl(buildGoogleMapsSearchUrl(deviceType, action));
        setOsmServiceUnavailable(true);
        setExhausted50km(true);
        setSearchMessage('The nearby map service could not be reached. Use the live Google Maps search below to view verified local options.');
        setPlacesError('Nearby map service temporarily unavailable.');
      } finally {
        setPlacesLoading(false);
      }
    };

    void loadNearbyPlaces();
  }, [location, action, searchRadius, deviceType]);

  const getDirections = (destLat: number, destLng: number) => {
    if (!location) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lng}&destination=${destLat},${destLng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openWebsite = (website: string) => {
    const normalized = website.startsWith('http') ? website : `https://${website}`;
    window.open(normalized, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="stakeholders stakeholders-v9">
      <div className="stakeholder-heading-v9">
        <div className="stakeholder-context-v9">
          <div className="device-context-card-v9">
            <span style={{ display: 'inline-flex', alignItems: 'center' }}><DeviceIcon deviceId={deviceType} size={28} /></span>
            <div>
              <span>ASSESSMENT CONTEXT</span>
              <strong>{deviceLabel}</strong>
              <small>{actionLabel} is the recommended next step</small>
            </div>
          </div>
          <div>
            <span className="step-kicker">04 · REAL-WORLD OPTIONS</span>
            <h2>Find verified {actionLabel.toLowerCase()} options for your {deviceLabel.toLowerCase()}</h2>
            <p>We use your location and OpenStreetMap data to locate verified nearby services.</p>
          </div>
        </div>
        <div className="stakeholder-heading-actions-v9">
          {location && <span className="radius-pill">Within {searchRadius} km</span>}
          <button type="button" className="primary-button location-button-v8" onClick={getUserLocation} disabled={locationStatus === 'loading'}>
            <LocateFixed size={14} aria-hidden="true" />
            {locationStatus === 'loading' ? 'Locating...' : location ? 'Refresh location' : 'Use my location'}
          </button>
        </div>
      </div>

      <div className="category-guidance-v10">
        <div className="category-guidance-icon-v10"><DeviceIcon deviceId={deviceType} size={22} /></div>
        <div className="category-guidance-copy-v10">
          <span className="step-kicker">DEVICE-AWARE SEARCH</span>
          <strong>{guidance.focus}</strong>
          <p>{guidance.detail}</p>
        </div>
        <div className="category-action-chip-v10">
          <span>Recommended</span>
          <strong>{actionLabel}</strong>
        </div>
      </div>

      {locationStatus !== 'idle' && (
        <div className={`location-banner-v8 ${locationStatus}`}>
          <div className="location-banner-icon" aria-hidden="true">
            {locationStatus === 'success' ? <Check size={16} strokeWidth={2.5} /> : locationStatus === 'loading' ? <LocateFixed size={16} /> : <Info size={16} />}
          </div>
          <div>
            <strong>
              {locationStatus === 'success'
                ? `Location ready (±${Math.round(location?.accuracy || 0)} m)`
                : locationStatus === 'loading'
                  ? 'Determining position'
                  : locationStatus === 'denied'
                    ? 'Location permission needed'
                    : 'Location unavailable'}
            </strong>
            <span>{locationMessage}</span>
          </div>
        </div>
      )}

      {location && (
        <div className="split map-split-v8">
          <div className="map-column-v8">
            <div className="map-frame-v9">
              <MapContainer
                center={[location.lat, location.lng]}
                zoom={searchRadius === 10 ? 13 : searchRadius === 25 ? 11 : 9}
                style={{ height: '420px', width: '100%', borderRadius: '18px' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[location.lat, location.lng]} icon={createMapIcon('user', deviceType, action)}>
                  <Popup>
                    <strong>Your Location</strong>
                    <br />
                    Search radius: {searchRadius} km
                  </Popup>
                </Marker>
                <Circle
                  center={[location.lat, location.lng]}
                  radius={searchRadius * 1000}
                  pathOptions={{ color: '#168166', fillColor: '#168166', fillOpacity: 0.08 }}
                />
                {places.map((place) => (
                  <Marker
                    key={place.id}
                    position={[place.lat, place.lng]}
                    icon={createMapIcon('place', deviceType, action, place.search_tier, place.id === selectedPlaceId)}
                    eventHandlers={{ click: () => setSelectedPlaceId(place.id) }}
                  >
                    <Popup>
                      <strong>{place.name}</strong>
                      <br />
                      {place.type} · {place.distance_km.toFixed(1)} km away
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              <div className="map-legend-v13">
                <span><i className="legend-user-v13" /> You</span>
                <span><i className="legend-shop-v13" /> Nearby shop</span>
                <span><i className="legend-device-v13" style={{ background: deviceMarkerColor[deviceType] ?? deviceMarkerColor.other }} /> {deviceMarkerLabel[deviceType] ?? 'Device'}</span>
                {searchTier === 'general' && <span><i className="legend-general-v13"><Sparkles size={10} /></i> General lead</span>}
                <span>±{Math.round(location.accuracy)} m</span>
              </div>
            </div>
          </div>

          <div className="nearby-list-column-v8">
            <div className="nearby-list-heading-v9">
              <div>
                <span className="step-kicker">REAL OPTIONS</span>
                <h3>{places.length ? `${places.length} places nearby` : `Options within ${searchRadius} km`}</h3>
              </div>
              {lastRadiusWithResults && (
                <span className="result-range-badge-v9">Found within {lastRadiusWithResults} km</span>
              )}
            </div>

            {placesLoading && (
              <div className="nearby-loading-v8">
                <span className="loading-orb-v8" />
                <strong>Searching OpenStreetMap...</strong>
                <p>Matching device category and action with verified OpenStreetMap tags.</p>
              </div>
            )}

            {!placesLoading && placesError && (
              <div className={`nearby-empty-v9 ${exhausted50km ? 'nearby-exhausted-v12' : ''}`}>
                <div className="empty-icon-v9"><DeviceIcon deviceId={deviceType} size={32} /></div>
                <strong>{osmServiceUnavailable ? 'Live map service unavailable' : exhausted50km ? 'No verified option in range' : `No options within ${searchRadius} km`}</strong>
                <p>{searchMessage || placesError}</p>
                <div className="empty-actions-v9">
                  {!exhausted50km && searchRadius < 50 && (
                    <button type="button" className="primary-button" onClick={() => setSearchRadius(searchRadius === 10 ? 25 : 50)}>
                      Expand to {searchRadius === 10 ? 25 : 50} km
                    </button>
                  )}
                  {externalSearchUrl && (
                    <button type="button" className="primary-button" onClick={() => window.open(externalSearchUrl, '_blank', 'noopener,noreferrer')}>
                      Open live Google Maps search ↗
                    </button>
                  )}
                  <button type="button" className="secondary-button" onClick={() => setSearchRadius(10)}>
                    Search 10 km again
                  </button>
                </div>
              </div>
            )}

            {!placesLoading && places.length > 0 && (
              <div className="nearby-results-v9">
                {places.map((place, index) => (
                  <article
                    key={place.id}
                    className={`place-card-v9 ${selectedPlaceId === place.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPlaceId(place.id)}
                  >
                    <div className="place-index-v9">{String(index + 1).padStart(2, '0')}</div>
                    <div className="place-main-v9">
                      <strong>{place.name}</strong>
                      <span>{place.type} · {place.distance_km.toFixed(1)} km away</span>
                      <small className={`place-match-v11 ${place.search_tier === 'general' ? 'is-general-lead-v12' : ''}`}>
                        <b>{place.match_level} match</b>
                        {place.match_reasons?.[0] ? ` · ${place.match_reasons[0]}` : ''}
                      </small>
                      {place.address ? <small>{place.address}</small> : <small className="place-data-note-v10">Address from OpenStreetMap</small>}
                    </div>
                    <div className="place-actions-v9">
                      <button
                        type="button"
                        className="directions-button-v9"
                        onClick={(e) => {
                          e.stopPropagation();
                          getDirections(place.lat, place.lng);
                        }}
                      >
                        Directions ↗
                      </button>
                      {place.phone && (
                        <a href={`tel:${place.phone}`} onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} /> Call
                        </a>
                      )}
                      {place.website && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); openWebsite(place.website!); }}>
                          ↗ Web
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedPlace && (
        <div className="selected-place-v9">
          <div>
            <span className="step-kicker">SELECTED OPTION</span>
            <h3>{selectedPlace.name}</h3>
            <p>{selectedPlace.type} · {selectedPlace.distance_km.toFixed(1)} km away</p>
          </div>
          <button type="button" className="primary-button" onClick={() => getDirections(selectedPlace.lat, selectedPlace.lng)}>
            Open route in Google Maps ↗
          </button>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   EcoLoop AI Grounded Chatbot Guidance Component
   ========================================================= */

function EcoLoopChatbot({
  result,
  answers,
}: {
  result: Result;
  answers?: Record<string, unknown>;
}) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: `Hello! I'm your **EcoLoop AI Guidance Assistant**.\n\nI can explain why your **${formatLabel(result.device_type)}** received an EcoScore of **${Math.round(result.ecoscore)}/100**, the reasons behind the **${formatLabel(result.recommended_action)}** recommendation, safe data wiping steps, or carbon diversion estimates.\n\nHow can I help you today?`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    `Why did my ${formatLabel(result.device_type).toLowerCase()} get ${Math.round(result.ecoscore)}?`,
    'What lowered my score?',
    `Why is ${formatLabel(result.recommended_action)} recommended?`,
    'What can I do to improve the sustainability of this device?',
  ]);

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    setInputMessage('');
    const userMsg = { role: 'user' as const, content: query };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setLoading(true);

    try {
      const devMeta = getDeviceMeta(result.device_type);
      const assessmentContext = {
        mode: 'result',
        device: {
          id: result.device_type,
          name: formatLabel(result.device_type),
          category: result.stakeholder_category || devMeta.category,
        },
        device_type: result.device_type,
        answers: answers || {},
        result: {
          ecoScore: result.ecoscore,
          recommendation: result.recommended_action,
          scoringFactors: result.ecoscore_breakdown || {},
          carbonImpact: result.environmental_impact || {},
          ecoscore_band: result.ecoscore_band,
          recommendation_reasons: result.recommendation_reasons || [],
        },
        ecoscore: result.ecoscore,
        ecoscore_band: result.ecoscore_band,
        recommended_action: result.recommended_action,
        recommendation_reasons: result.recommendation_reasons || [],
        ecoscore_breakdown: result.ecoscore_breakdown || {},
        environmental_impact: result.environmental_impact || {},
      };

      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: updatedHistory,
          assessment_context: assessmentContext,
          page_context: 'analyze',
        }),
      });

      if (!response.ok) throw new Error('Chat service unavailable');
      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.suggested_questions && data.suggested_questions.length > 0) {
        setSuggestedQuestions(data.suggested_questions);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm unable to process that right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="chatbot-wrapper">
      <div className="chatbot-header">
        <div className="chatbot-header-info">
          <div className="chatbot-avatar"><Bot size={18} strokeWidth={2} /></div>
          <div className="chatbot-header-text">
            <h3>EcoLoop AI Guidance Assistant</h3>
            <span>Context-aware circular economy guidance & score explanations</span>
          </div>
        </div>
        <span className="chatbot-live-status">Interactive</span>
      </div>

      <div className="chatbot-body" ref={bodyRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.content.split('\n\n').map((para, pi) => (
              <p key={pi} dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\•\s/g, '• ') }} />
            ))}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble assistant">
            <p>EcoLoop AI is thinking…</p>
          </div>
        )}
      </div>

      {suggestedQuestions.length > 0 && (
        <div className="chatbot-suggestions">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              className="suggestion-pill"
              onClick={() => void sendMessage(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        className="chatbot-input-bar"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
      >
        <input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask a question about your EcoScore, recommendation, or e-waste..."
          aria-label="Ask EcoLoop AI"
          disabled={loading}
        />
        <button type="submit" className="chatbot-send-btn" disabled={!inputMessage.trim() || loading}>
          <span>Send</span>
          <span>→</span>
        </button>
      </form>
    </section>
  );
}

/* =========================================================
   Result Panel Component
   ========================================================= */

function ResultPanel({
  result,
  onReset,
  answers,
}: {
  result: Result;
  onReset: () => void;
  answers?: Record<string, unknown>;
}) {
  const [showScoreExplainer, setShowScoreExplainer] = useState(false);
  const ecoScore = Math.max(0, Math.min(100, result.ecoscore));
  const recommendationEntries = Object.entries(result.recommendation_scores || {}).sort(([, a], [, b]) => b - a);
  const breakdownEntries = Object.entries(result.ecoscore_breakdown || {});

  // Pre-configured max points for transparent 6-factor display
  const factorMaxPoints: Record<string, number> = {
    working_condition: 25,
    physical_condition: 20,
    repairability: 20,
    device_age: 15,
    functional_health: 10,
    reuse_potential: 10,
  };

  const env = result.environmental_impact || {};
  const reasons = result.recommendation_reasons || [result.explanation];

  return (
    <section className="result-shell">
      {/* RESULT HERO */}
      <section className="result-hero">
        <div className="result-hero-copy">
          <span className="eyebrow">ASSESSMENT COMPLETE · #{result.id}</span>
          <div className="result-title-row">
            <div>
              <span className="result-overline">ASSESSED DEVICE</span>
              <h1>{formatLabel(result.device_type)}</h1>
            </div>
            <span className="result-status-pill"><Check size={14} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} /> Decision Ready</span>
          </div>
          <p>
            EcoLoop evaluated your {formatLabel(result.device_type).toLowerCase()} using a deterministic, 6-factor
            circular scoring model to determine its optimal lifecycle path.
          </p>
        </div>

        <div className={`eco-score-hero ${scoreTone(ecoScore)}`}>
          <div className="eco-score-ring-wrap">
            <div
              className="eco-score-ring"
              style={{
                background: `conic-gradient(currentColor ${ecoScore}%, rgba(255,255,255,.09) ${ecoScore}% 100%)`,
              }}
            >
              <div className="eco-score-ring-inner">
                <span>ECOSCORE</span>
                <strong>{Math.round(ecoScore)}</strong>
                <small>/ 100</small>
              </div>
            </div>
          </div>
          <b>{result.ecoscore_band} Circular Potential</b>
          <span>Transparent Rule-Based Scoring</span>
        </div>
      </section>

      {/* SUMMARY GRID */}
      <section className="result-summary-grid">
        <article className="result-summary-card">
          <span className="summary-icon"><Activity size={16} strokeWidth={2.5} /></span>
          <small>CONDITION</small>
          <strong>{formatLabel(result.condition)}</strong>
          <span>{Math.round(result.condition_score)}/100 condition score</span>
        </article>
        <article className="result-summary-card">
          <span className="summary-icon"><Check size={16} strokeWidth={2.5} /></span>
          <small>ASSESSMENT CONFIDENCE</small>
          <strong>{Math.round(result.assessment_confidence)}%</strong>
          <span>Based on completed functional check</span>
        </article>
        <article className="result-summary-card result-summary-highlight">
          <span className="summary-icon"><ArrowUpRight size={16} strokeWidth={2.5} /></span>
          <small>RECOMMENDED ACTION</small>
          <strong>{formatLabel(result.recommended_action)}</strong>
          <span>{formatLabel(result.stakeholder_category)}</span>
        </article>
      </section>

      {/* RECOMMENDATION HERO CARD */}
      <section className="recommendation-hero-card">
        <div className="recommendation-main">
          <span className="step-kicker">RECOMMENDED NEXT LIFE</span>
          <h2>{formatLabel(result.recommended_action)}</h2>
          <p>{result.explanation}</p>
          <div className="recommendation-target">
            <span>Primary Circular Stakeholder</span>
            <strong>{formatLabel(result.stakeholder_category)}</strong>
          </div>
        </div>
        <div className="recommendation-mark" aria-hidden="true">
          <span>→</span>
        </div>
      </section>

      {/* WHY THIS RECOMMENDATION */}
      <section className="why-recommendation-section">
        <div className="why-recommendation-header">
          <span style={{ display: 'inline-flex', alignItems: 'center', color: '#168166' }}><Sparkles size={20} strokeWidth={2} /></span>
          <h3>Why was {formatLabel(result.recommended_action)} recommended?</h3>
        </div>
        <div className="why-reasons-list">
          {reasons.map((reason, idx) => (
            <div key={idx} className="why-reason-item">
              <span className="bullet-icon"><Check size={12} strokeWidth={2.5} /></span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SCORE BREAKDOWN & COMPARISON */}
      <section className="result-detail-grid">
        <article className="result-card">
          <div className="result-card-heading">
            <div>
              <span className="step-kicker">01 · ECOSCORE BREAKDOWN</span>
              <h2>How was the score determined?</h2>
            </div>
            <span className="result-card-count">{breakdownEntries.length} factors</span>
          </div>

          <div className="score-factor-list">
            {breakdownEntries.map(([key, value]) => {
              const maxPts = factorMaxPoints[key] || 20;
              const pts = Math.min(maxPts, Number(value) || 0);
              const pct = Math.min(100, (pts / maxPts) * 100);

              return (
                <div className="score-factor" key={key}>
                  <div className="score-factor-label">
                    <span>{formatLabel(key)}</span>
                    <strong>
                      {pts.toFixed(1)} <em>/ {maxPts} pts</em>
                    </strong>
                  </div>
                  <div className="score-factor-track">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="score-explainer-toggle"
            onClick={() => setShowScoreExplainer(!showScoreExplainer)}
          >
            <span>{showScoreExplainer ? '▲ Hide' : '▼ How was my score calculated?'}</span>
          </button>

          {showScoreExplainer && (
            <div className="score-explainer-panel">
              <h4>Transparent Scoring Model (0–100)</h4>
              <p>
                EcoLoop AI calculates your score using fixed, rule-based weights rather than random estimates or black-box predictions:
              </p>
              <ul>
                <li><strong>Working Condition (25%)</strong>: Evaluates operational readiness and power status.</li>
                <li><strong>Physical Condition (20%)</strong>: Assesses casing, screen, and visible structural wear.</li>
                <li><strong>Repairability (20%)</strong>: Measures modularity, spare parts availability, and screw access.</li>
                <li><strong>Device Age (15%)</strong>: Accounts for remaining technological lifecycle and standards.</li>
                <li><strong>Functional Health (10%)</strong>: Tests key components (battery, screen, ports, compressor, motor).</li>
                <li><strong>Reuse Potential (10%)</strong>: Gauges secondary circular demand and market viability.</li>
              </ul>
            </div>
          )}
        </article>

        <article className="result-card">
          <div className="result-card-heading">
            <div>
              <span className="step-kicker">02 · DECISION COMPARISON</span>
              <h2>Option suitability ranking</h2>
            </div>
            <span className="result-card-count">{recommendationEntries.length} paths</span>
          </div>
          <div className="recommendation-score-list">
            {recommendationEntries.map(([key, value]) => {
              const score = Math.max(0, Math.min(100, Number(value)));
              const recommended = key.toLowerCase() === result.recommended_action.toLowerCase();
              return (
                <div className={`recommendation-score-row ${recommended ? 'recommended' : ''}`} key={key}>
                  <div className="recommendation-score-label">
                    <span>{formatLabel(key)}</span>
                    <strong>{Math.round(score)} / 100</strong>
                  </div>
                  <div className="recommendation-score-track">
                    <span style={{ width: `${score}%` }} />
                  </div>
                  {recommended && <small>Recommended Path</small>}
                </div>
              );
            })}
          </div>
        </article>
      </section>

      {/* ESTIMATED ENVIRONMENTAL IMPACT */}
      <section className="environmental-impact-card">
        <div className="env-impact-header">
          <span className="step-kicker">03 · ESTIMATED ENVIRONMENTAL BENEFIT</span>
          <h2>Resource Retention & Climate Impact</h2>
          <p>Extending product lifecycle avoids raw material extraction and greenhouse gas emissions.</p>
        </div>

        <div className="env-metrics-grid">
          <div className="env-metric-item">
            <span className="metric-icon"><Scale size={20} strokeWidth={2} /></span>
            <small>Landfill Waste Avoided</small>
            <strong>~{env.waste_avoided_kg ?? (getDeviceMeta(result.device_type).mass_kg * 0.9).toFixed(1)} kg</strong>
            <span>E-waste diverted from landfill</span>
          </div>

          <div className="env-metric-item">
            <span className="metric-icon"><Sprout size={20} strokeWidth={2} /></span>
            <small>Estimated CO₂ Benefit</small>
            <strong>~{env.co2_benefit_kg ?? Math.round(getDeviceMeta(result.device_type).embodied_co2_kg * 0.85)} kg</strong>
            <span>CO₂e avoided vs new production</span>
          </div>

          <div className="env-metric-item">
            <span className="metric-icon"><Recycle size={20} strokeWidth={2} /></span>
            <small>Circular Potential</small>
            <strong>{env.reuse_potential_rating ?? 'High'}</strong>
            <span>Secondary utility rating</span>
          </div>
        </div>

        <div className="env-materials-box">
          <strong>Recoverable Materials in this {formatLabel(result.device_type)}:</strong>
          <div className="material-chip-list">
            {(env.recoverable_materials || getDeviceMeta(result.device_type).recoverable_materials).map((mat) => (
              <span key={mat} className="material-chip">
                {mat}
              </span>
            ))}
          </div>
        </div>

        <p className="env-disclaimer">
          * {env.estimate_disclaimer || 'Values are transparent estimates based on average device category mass and embodied manufacturing lifecycle data.'}
        </p>
      </section>

      {/* NEARBY STAKEHOLDERS (OSM) */}
      <Stakeholders action={result.recommended_action} deviceType={result.device_type} />

      {/* CHATBOT & DECISION GUIDANCE */}
      <EcoLoopChatbot result={result} answers={answers} />

      {/* LIMITATIONS */}
      <section className="notice result-limitations">
        <div>
          <span className="notice-icon">i</span>
          <div>
            <b>Assessment limitations</b>
            {(result.limitations || []).map((limitation) => (
              <p key={limitation}>{limitation}</p>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <div className="result-footer-actions">
        <button className="secondary-button" onClick={onReset}>
          ← Assess another device
        </button>
        <button className="primary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Back to top ↑
        </button>
      </div>
    </section>
  );
}

/* =========================================================
   Device Graphic SVGs (15 Supported Categories)
   ========================================================= */

function DeviceGraphic({ deviceId }: { deviceId: string }) {
  switch (deviceId) {
    case 'smartphone':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="18" y="6" width="28" height="52" rx="6" fill="#182c25" stroke="#168166" strokeWidth="1.5" />
          <rect x="20" y="10" width="24" height="44" rx="3" fill="url(#phG)" />
          <circle cx="32" cy="8" r="1" fill="#4d6961" />
          <rect x="28" y="51" width="8" height="1.5" rx="0.75" fill="#4d6961" />
          <defs>
            <linearGradient id="phG" x1="20" y1="10" x2="44" y2="54" gradientUnits="userSpaceOnUse">
              <stop stopColor="#144b3e" />
              <stop offset="1" stopColor="#25a37f" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'laptop':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="15" width="40" height="26" rx="3" fill="#102520" stroke="#168166" strokeWidth="1.5" />
          <rect x="14" y="17" width="36" height="22" rx="1.5" fill="url(#lapG)" />
          <path d="M6 43h52a2 2 0 0 1 2 2v2H4v-2a2 2 0 0 1 2-2z" fill="#d2e2d8" stroke="#168166" strokeWidth="1.5" />
          <rect x="26" y="44" width="12" height="2" rx="1" fill="#9db6aa" />
          <defs>
            <linearGradient id="lapG" x1="14" y1="17" x2="50" y2="39" gradientUnits="userSpaceOnUse">
              <stop stopColor="#13473b" />
              <stop offset="1" stopColor="#279f7d" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'desktop':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="14" width="16" height="36" rx="2" fill="#1b2a26" stroke="#168166" strokeWidth="1.5" />
          <circle cx="14" cy="20" r="1.5" fill="#2fd6a5" />
          <rect x="10" y="26" width="8" height="2" rx="1" fill="#466258" />
          <rect x="10" y="31" width="8" height="2" rx="1" fill="#466258" />
          <rect x="26" y="16" width="32" height="23" rx="2" fill="#102520" stroke="#168166" strokeWidth="1.5" />
          <rect x="28" y="18" width="28" height="19" rx="1" fill="#1a5245" />
          <rect x="40" y="39" width="4" height="7" fill="#a4bdad" />
          <path d="M33 46h18a1 1 0 0 1 1 1v1H32v-1a1 1 0 0 1 1-1z" fill="#7d9d8b" />
        </svg>
      );
    case 'tablet':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="14" y="8" width="36" height="48" rx="5" fill="#1c2d27" stroke="#168166" strokeWidth="1.5" />
          <rect x="17" y="12" width="30" height="40" rx="3" fill="url(#tabG)" />
          <circle cx="32" cy="10" r="0.8" fill="#4b675f" />
          <defs>
            <linearGradient id="tabG" x1="17" y1="12" x2="47" y2="52" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1a5446" />
              <stop offset="1" stopColor="#3ab895" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'television':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="15" width="52" height="32" rx="2" fill="#102520" stroke="#168166" strokeWidth="1.5" />
          <rect x="8" y="17" width="48" height="28" rx="1" fill="url(#tvG)" />
          <path d="M14 47l-4 6M50 47l4 6" stroke="#7d9d8b" strokeWidth="2.5" strokeLinecap="round" />
          <defs>
            <linearGradient id="tvG" x1="8" y1="17" x2="56" y2="45" gradientUnits="userSpaceOnUse">
              <stop stopColor="#113d33" />
              <stop offset="1" stopColor="#258f70" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'monitor':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="12" width="48" height="32" rx="3" fill="#102520" stroke="#168166" strokeWidth="1.5" />
          <rect x="11" y="15" width="42" height="26" rx="1.5" fill="url(#monG)" />
          <rect x="29" y="44" width="6" height="8" fill="#9db6aa" />
          <path d="M22 52h20a1 1 0 0 1 1 1v1H21v-1a1 1 0 0 1 1-1z" fill="#719481" />
          <defs>
            <linearGradient id="monG" x1="11" y1="15" x2="53" y2="41" gradientUnits="userSpaceOnUse">
              <stop stopColor="#144b3f" />
              <stop offset="1" stopColor="#2ca884" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'refrigerator':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="16" y="8" width="32" height="48" rx="3" fill="#dbe6e0" stroke="#168166" strokeWidth="1.5" />
          <line x1="16" y1="24" x2="48" y2="24" stroke="#8daea0" strokeWidth="1.5" />
          <rect x="42" y="14" width="2" height="6" rx="1" fill="#4d6f62" />
          <rect x="42" y="28" width="2" height="12" rx="1" fill="#4d6f62" />
          <circle cx="32" cy="16" r="3" fill="#b9d6c8" />
        </svg>
      );
    case 'washing_machine':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="14" y="8" width="36" height="48" rx="4" fill="#edf4f0" stroke="#168166" strokeWidth="1.5" />
          <rect x="18" y="13" width="12" height="4" rx="1" fill="#b0cebf" />
          <circle cx="42" cy="15" r="3" fill="#168166" />
          <circle cx="32" cy="36" r="14" fill="#cbdad2" stroke="#168166" strokeWidth="1.5" />
          <circle cx="32" cy="36" r="9" fill="#2a5a4d" />
        </svg>
      );
    case 'air_conditioner':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="20" width="48" height="24" rx="4" fill="#eef5f1" stroke="#168166" strokeWidth="1.5" />
          <line x1="12" y1="36" x2="52" y2="36" stroke="#9bbcaa" strokeWidth="1.5" />
          <line x1="12" y1="39" x2="52" y2="39" stroke="#9bbcaa" strokeWidth="1.5" />
          <circle cx="48" cy="27" r="1.5" fill="#2cd4a3" />
        </svg>
      );
    case 'printer':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="24" width="40" height="24" rx="3" fill="#182c26" stroke="#168166" strokeWidth="1.5" />
          <path d="M20 24V12h24v12H20z" fill="#e4eee7" stroke="#168166" strokeWidth="1.5" />
          <path d="M18 48h28v6H18v-6z" fill="#f7fbf8" stroke="#168166" strokeWidth="1.5" />
          <circle cx="46" cy="32" r="1.5" fill="#25d39e" />
        </svg>
      );
    case 'keyboard':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="20" width="48" height="24" rx="3" fill="#152822" stroke="#168166" strokeWidth="1.5" />
          <rect x="12" y="24" width="40" height="16" rx="2" fill="#243d35" />
          <line x1="18" y1="36" x2="38" y2="36" stroke="#5b8274" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'mouse':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="22" y="14" width="20" height="36" rx="10" fill="#1d342c" stroke="#168166" strokeWidth="1.5" />
          <line x1="32" y1="14" x2="32" y2="28" stroke="#5d8577" strokeWidth="1" />
          <rect x="30.5" y="20" width="3" height="6" rx="1.5" fill="#26c292" />
        </svg>
      );
    case 'router':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="16" y1="32" x2="16" y2="12" stroke="#168166" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="48" y1="32" x2="48" y2="12" stroke="#168166" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="10" y="32" width="44" height="18" rx="3" fill="#182c26" stroke="#168166" strokeWidth="1.5" />
          <circle cx="20" cy="41" r="1.5" fill="#2dd4a3" />
          <circle cx="26" cy="41" r="1.5" fill="#2dd4a3" />
          <circle cx="32" cy="41" r="1.5" fill="#2dd4a3" />
        </svg>
      );
    case 'speaker':
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="10" width="24" height="44" rx="8" fill="#1c3028" stroke="#168166" strokeWidth="1.5" />
          <circle cx="32" cy="18" r="4" fill="#2dd4a3" opacity="0.4" />
          <circle cx="32" cy="36" r="8" fill="#11221c" stroke="#25a37f" strokeWidth="1" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="14" y="14" width="36" height="36" rx="6" fill="#1a2e26" stroke="#168166" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="8" fill="#27463b" />
          <circle cx="32" cy="32" r="3" fill="#2dd4a3" />
          <rect x="20" y="44" width="8" height="2" rx="1" fill="#5c8375" />
        </svg>
      );
  }
}

/* =========================================================
   Concept Hero Banner (Analyze View)
   ========================================================= */

function ConceptHeroBanner() {
  return (
    <section className="concept-hero-banner">
      <div className="concept-hero-left">
        <h1>Let&apos;s give your device a longer, greener life</h1>
        <p>
          Choose the device you want to assess. This helps us ask the right questions and give
          accurate results.
        </p>
      </div>

      <div className="concept-hero-right">
        <div className="concept-hero-illustration" aria-hidden="true">
          <svg className="hero-earth-svg" viewBox="0 0 140 120" fill="none">
            <circle cx="70" cy="60" r="48" fill="#d1fae5" opacity="0.6" />
            <circle cx="70" cy="60" r="40" fill="#a7f3d0" />
            <path
              d="M52 44C58 40 68 42 74 46C80 50 82 56 86 58C90 60 97 58 101 50C104 43 108 42 110 44"
              stroke="#047857"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M56 68C62 62 68 64 74 68C80 72 87 70 91 64"
              stroke="#047857"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M62 32C66 28 74 29 80 34C85 39 92 38 97 34"
              stroke="#047857"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M36 48C36 48 30 38 40 36C45 35 46 44 46 44" fill="#10b981" />
            <path d="M104 76C104 76 112 84 104 88C98 90 98 82 98 82" fill="#10b981" />
          </svg>
        </div>

        <div className="concept-hero-badges">
          <div className="hero-benefit-badge">
            <div className="badge-icon-box"><Recycle size={18} strokeWidth={2} /></div>
            <span>Reduce e-waste</span>
          </div>
          <div className="hero-benefit-badge">
            <div className="badge-icon-box"><Leaf size={18} strokeWidth={2} /></div>
            <span>Save resources</span>
          </div>
          <div className="hero-benefit-badge">
            <div className="badge-icon-box"><Cloud size={18} strokeWidth={2} /></div>
            <span>Lower carbon impact</span>
          </div>
        </div>
      </div>
    </section>
  );
}



/* =========================================================
   Global Floating Chatbot (Bottom-Left Assistant)
   ========================================================= */

function GlobalFloatingChatbot({
  currentPage,
  latestResult,
  currentDevice,
  currentQuestion,
  answers,
  questionNumber,
  totalQuestions,
}: {
  currentPage: 'home' | 'analyze' | 'history' | 'learn' | 'about';
  latestResult: Result | null;
  currentDevice: string;
  currentQuestion?: AssessmentQuestion;
  answers?: Record<string, unknown>;
  questionNumber?: number;
  totalQuestions?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Dynamic context greetings & suggestions based on currentPage & latestResult
  useEffect(() => {
    let initialGreeting = '';
    let initialSuggestions: string[] = [];

    if (currentPage === 'home') {
      initialGreeting = `Hello! I'm **EcoLoop AI Assistant**.\n\nAsk me about our circular electronics methodology, how the 6-factor EcoScore works, or general e-waste reduction tips!`;
      initialSuggestions = [
        'What is EcoLoop AI?',
        'Why is e-waste a problem?',
        'How does the assessment work?',
      ];
    } else if (currentPage === 'analyze') {
      if (latestResult) {
        initialGreeting = `I see you just completed an assessment for your **${formatLabel(latestResult.device_type)}** (EcoScore: **${Math.round(latestResult.ecoscore)}/100**).\n\nAsk me why **${formatLabel(latestResult.recommended_action)}** was recommended, what lowered your score, or how to improve sustainability.`;
        initialSuggestions = [
          `Why did my ${formatLabel(latestResult.device_type).toLowerCase()} get ${Math.round(latestResult.ecoscore)}?`,
          'What lowered my score?',
          `Why is ${formatLabel(latestResult.recommended_action)} recommended?`,
          'What can I do to improve sustainability?',
        ];
      } else if (currentQuestion) {
        const devMeta = getDeviceMeta(currentDevice);
        initialGreeting = `Assessing your **${devMeta.name}**? I can explain what this question means, why factors like age and repairability matter, or guide you through answer options.`;
        initialSuggestions = [
          'What am I assessing?',
          'What does this question mean?',
          'Why are you asking about device age?',
          'What does repairability mean?',
        ];
      } else {
        const devMeta = getDeviceMeta(currentDevice);
        initialGreeting = `Assessing your **${devMeta.name}**? I can help you choose the best answer, explain what repairability means, or clarify any condition check.`;
        initialSuggestions = [
          `How is ${devMeta.name} EcoScore calculated?`,
          'What if my screen is cracked?',
          'Which category fits my device?',
        ];
      }
    } else if (currentPage === 'history') {
      initialGreeting = `Reviewing your saved assessments? Your reports are stored locally in your browser using localStorage. I can explain how scores are tracked or how browser storage works.`;
      initialSuggestions = [
        'Where is my history stored?',
        'Can I see my history on another laptop?',
        'What do the action tags mean?',
      ];
    } else if (currentPage === 'learn') {
      initialGreeting = `Welcome to the Learning Center! Ask me about Right to Repair, hazardous materials in electronics, or circular economy principles.`;
      initialSuggestions = [
        'What is right to repair?',
        'What toxic materials are in electronics?',
        'How do I safely recycle lithium batteries?',
      ];
    } else {
      // about
      initialGreeting = `Welcome to EcoLoop AI! I'm here to answer questions about our mission, open methodology, and circular partner matching.`;
      initialSuggestions = [
        'How does the 6-factor model work?',
        'Is my assessment data private?',
        'Who built EcoLoop AI?',
      ];
    }

    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: initialGreeting }]);
      setSuggestions(initialSuggestions);
    }
  }, [currentPage, latestResult, currentQuestion]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendQuery = async (queryText?: string) => {
    const text = (queryText || inputMessage).trim();
    if (!text || loading) return;

    setInputMessage('');
    const userMsg = { role: 'user' as const, content: text };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setLoading(true);

    try {
      const devMeta = getDeviceMeta(latestResult ? latestResult.device_type : currentDevice);
      let assessmentContext: Record<string, unknown>;

      if (latestResult) {
        assessmentContext = {
          mode: 'result',
          device: {
            id: latestResult.device_type,
            name: formatLabel(latestResult.device_type),
            category: latestResult.stakeholder_category || devMeta.category,
          },
          device_type: latestResult.device_type,
          answers: answers || {},
          result: {
            ecoScore: latestResult.ecoscore,
            recommendation: latestResult.recommended_action,
            scoringFactors: latestResult.ecoscore_breakdown || {},
            carbonImpact: latestResult.environmental_impact || {},
            ecoscore_band: latestResult.ecoscore_band,
            recommendation_reasons: latestResult.recommendation_reasons || [],
          },
          ecoscore: latestResult.ecoscore,
          ecoscore_band: latestResult.ecoscore_band,
          recommended_action: latestResult.recommended_action,
          recommendation_reasons: latestResult.recommendation_reasons || [],
          ecoscore_breakdown: latestResult.ecoscore_breakdown || {},
          environmental_impact: latestResult.environmental_impact || {},
        };
      } else if (currentPage === 'analyze' && currentQuestion) {
        assessmentContext = {
          mode: 'assessment',
          device: {
            id: currentDevice,
            name: devMeta.name,
            category: devMeta.category,
          },
          device_type: currentDevice,
          currentQuestion: {
            key: currentQuestion.key,
            label: currentQuestion.label,
            factor: currentQuestion.factor,
            options: currentQuestion.options,
          },
          questionNumber: questionNumber || 1,
          totalQuestions: totalQuestions || 1,
          answers: answers || {},
        };
      } else {
        assessmentContext = {
          mode: 'global',
          device: {
            id: currentDevice,
            name: devMeta.name,
            category: devMeta.category,
          },
          device_type: currentDevice,
        };
      }

      const resp = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          page_context: currentPage,
          assessment_context: assessmentContext,
          history: updatedHistory,
        }),
      });

      if (!resp.ok) throw new Error('Chat API returned error');
      const data = await resp.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.suggested_questions && data.suggested_questions.length > 0) {
        setSuggestions(data.suggested_questions);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm unable to process that right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="global-chatbot-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle EcoLoop AI Assistant"
        title="EcoLoop AI Assistant"
      >
        <Bot size={26} strokeWidth={2} />
        <Sparkles size={14} className="global-chatbot-fab-sparkle" />
      </button>

      {isOpen && (
        <div className="global-chat-panel" role="dialog" aria-label="EcoLoop AI Assistant">
          <div className="global-chat-header">
            <div className="global-chat-header-info">
              <div className="global-chat-avatar"><Bot size={18} strokeWidth={2} /></div>
              <div className="global-chat-title">
                <strong>EcoLoop AI Assistant</strong>
                <span>● Online · Circular Guide</span>
              </div>
            </div>
            <button
              type="button"
              className="global-chat-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close Assistant"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="global-chat-body" ref={chatBodyRef}>
            {messages.map((m, idx) => (
              <div key={idx} className={`global-chat-bubble ${m.role}`}>
                {m.content.split('\n\n').map((p, pi) => (
                  <p
                    key={pi}
                    dangerouslySetInnerHTML={{
                      __html: p
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\•\s/g, '• '),
                    }}
                  />
                ))}
              </div>
            ))}
            {loading && (
              <div className="global-chat-bubble assistant">
                <p>EcoLoop AI is thinking…</p>
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="global-chat-suggestions">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="global-chat-suggestion-chip"
                  onClick={() => void sendQuery(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="global-chat-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              void sendQuery();
            }}
          >
            <input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about e-waste, repair, or scores..."
              aria-label="Ask EcoLoop AI"
              disabled={loading}
            />
            <button
              type="submit"
              className="global-chat-send-btn"
              disabled={!inputMessage.trim() || loading}
            >
              Send →
            </button>
          </form>
        </div>
      )}
    </>
  );
}

/* =========================================================
   Device Selection Workspace (3-Column Layout from Concept)
   ========================================================= */

const CATEGORY_ITEMS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All Devices', icon: <LayoutGrid size={16} strokeWidth={2} /> },
  { id: 'mobile', label: 'Mobile Devices', icon: <Smartphone size={16} strokeWidth={2} /> },
  { id: 'computers', label: 'Computers', icon: <Laptop size={16} strokeWidth={2} /> },
  { id: 'appliances', label: 'Home Appliances', icon: <Refrigerator size={16} strokeWidth={2} /> },
  { id: 'audio_video', label: 'Audio & Video', icon: <Tv size={16} strokeWidth={2} /> },
  { id: 'networking', label: 'Networking', icon: <Network size={16} strokeWidth={2} /> },
  { id: 'peripherals', label: 'Peripherals', icon: <Keyboard size={16} strokeWidth={2} /> },
  { id: 'other', label: 'Other Electronics', icon: <Cpu size={16} strokeWidth={2} /> },
];

function DeviceSelectionWorkspace({
  selectedDeviceId,
  onSelectDevice,
}: {
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const matchCategory = (device: DeviceMetadata, catId: string): boolean => {
    if (catId === 'all') return true;
    if (catId === 'mobile') return ['smartphone', 'tablet'].includes(device.id);
    if (catId === 'computers') return ['laptop', 'desktop', 'monitor'].includes(device.id);
    if (catId === 'appliances')
      return ['refrigerator', 'washing_machine', 'air_conditioner'].includes(device.id);
    if (catId === 'audio_video') return ['television', 'speaker'].includes(device.id);
    if (catId === 'networking') return device.id === 'router';
    if (catId === 'peripherals') return ['printer', 'keyboard', 'mouse'].includes(device.id);
    if (catId === 'other') return device.id === 'other';
    return true;
  };

  const filteredDevices = DEVICES.filter((d) => matchCategory(d, activeCategory)).filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="concept-workspace-layout">
      {/* LEFT COLUMN: Categories */}
      <div className="category-filter-card">
        <h3>Device Category</h3>
        <div className="category-search-box">
          <span className="category-search-icon"><Search size={14} strokeWidth={2} /></span>
          <input
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search devices"
          />
        </div>

        <div className="category-items-list">
          {CATEGORY_ITEMS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-menu-item ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <div className="category-item-content">
                <span className="category-item-icon">{cat.icon}</span>
                <span>{cat.label}</span>
              </div>
              <span className="category-chevron">›</span>
            </button>
          ))}
        </div>
      </div>

      {/* CENTER COLUMN: 15 Device Cards in responsive grid */}
      <div className="device-select-main-panel">
        <div className="device-select-header">
          <h2>Select Your Device</h2>
          <p>
            Choose the device you want to assess. This helps us ask the right questions and give
            accurate results.
          </p>
        </div>

        <div className="concept-device-grid">
          {filteredDevices.map((d) => {
            const isSelected = selectedDeviceId === d.id;
            return (
              <div
                key={d.id}
                className={`concept-device-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectDevice(d.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectDevice(d.id);
                }}
              >
                <div className="device-card-img-wrap">
                  <DeviceGraphic deviceId={d.id} />
                </div>
                <h4>{d.name}</h4>
                <p>{d.description}</p>
                <div className="card-cta-btn">
                  <span>Start assessment</span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom notice banner */}
        <div className="not-sure-banner">
          <div className="not-sure-icon"><HelpCircle size={22} strokeWidth={2} /></div>
          <div className="not-sure-text">
            <h5>Not sure which category?</h5>
            <p>
              You can still get started with the closest matching device type. This helps us provide
              the most relevant questions and recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Assessment Questions Workspace (Step 2)
   ========================================================= */

function AssessmentQuestionsWorkspace({
  device,
  selectedMeta,
  currentQuestions,
  safeQuestionIndex,
  currentQuestion,
  currentAnswerValue,
  hasCurrentAnswer,
  loading,
  updateAnswer,
  nextQuestion,
  prevQuestion,
  submitAssessment,
  onChangeDevice,
}: {
  device: string;
  selectedMeta: DeviceMetadata;
  currentQuestions: AssessmentQuestion[];
  safeQuestionIndex: number;
  currentQuestion: AssessmentQuestion;
  currentAnswerValue: string;
  hasCurrentAnswer: boolean;
  loading: boolean;
  updateAnswer: (v: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitAssessment: () => void;
  onChangeDevice: () => void;
}) {
  return (
    <div className="fullscreen-assessment-container">
      <div className="fullscreen-assessment-card">
        {/* TOP OF ASSESSMENT HEADER */}
        <div className="fullscreen-assessment-header">
          <div className="assessment-header-left">
            <div className="assessment-badge-group">
              <span className="question-counter-pill">
                Question {safeQuestionIndex + 1} of {currentQuestions.length}
              </span>
              <span className="question-factor-text">
                {formatLabel(currentQuestion.factor)}
              </span>
            </div>
            <h1 className="assessment-device-heading">
              Tell us about your {selectedMeta.name}.
            </h1>
            <p className="assessment-device-subheading">
              Answers evaluate the operational health and circular potential of your {selectedMeta.name}.
            </p>
          </div>

          {/* SELECTED DEVICE PANEL (Top Right) */}
          <div className="fullscreen-selected-device-panel">
            <div className="selected-device-graphic-wrap">
              <DeviceGraphic deviceId={selectedMeta.id} />
            </div>
            <div className="selected-device-meta">
              <span className="selected-device-kicker">Selected Device</span>
              <strong className="selected-device-title">{selectedMeta.name}</strong>
            </div>
            <button
              type="button"
              className="selected-device-change-btn"
              onClick={onChangeDevice}
              aria-label="Change device"
            >
              ← Change device
            </button>
          </div>
        </div>

        {/* QUESTION CARD (Wide rounded card) */}
        <div className="fullscreen-question-card">
          <div className="fullscreen-question-num-col">
            <span className="fullscreen-question-num">
              {String(safeQuestionIndex + 1).padStart(2, '0')}
            </span>
          </div>

          <div className="fullscreen-question-body-col">
            <div className="question-tag-pills">
              <span className="question-tag-factor">
                {formatLabel(currentQuestion.factor).toUpperCase()}
              </span>
              <span className="question-tag-required">REQUIRED</span>
            </div>

            <h2 className="fullscreen-question-title">{currentQuestion.label}</h2>

            <div className="fullscreen-options-grid">
              {currentQuestion.options.map((opt) => {
                const isSelected = currentAnswerValue === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`fullscreen-option-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => updateAnswer(opt.value)}
                  >
                    <div className="fullscreen-radio-circle">
                      {isSelected && <div className="fullscreen-radio-dot" />}
                    </div>
                    <div className="fullscreen-option-text">
                      <span className="fullscreen-option-label">{opt.label}</span>
                      {opt.description && (
                        <span className="fullscreen-option-desc">{opt.description}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {!hasCurrentAnswer && (
              <div className="fullscreen-validation-banner">
                <div className="validation-warn-circle">!</div>
                <span>Please select an answer to continue.</span>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS (Back & Next controls) */}
        <div className="fullscreen-assessment-footer">
          <button
            type="button"
            className="fullscreen-back-btn"
            onClick={prevQuestion}
            disabled={safeQuestionIndex === 0}
          >
            ← Back
          </button>

          {safeQuestionIndex < currentQuestions.length - 1 ? (
            <button
              type="button"
              className="fullscreen-next-btn"
              onClick={nextQuestion}
              disabled={!hasCurrentAnswer}
            >
              Next question →
            </button>
          ) : (
            <button
              type="button"
              className="fullscreen-next-btn"
              disabled={loading || !hasCurrentAnswer}
              onClick={submitAssessment}
            >
              {loading ? 'Calculating EcoScore…' : 'Calculate EcoScore →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Learn & About Modals
   ========================================================= */

function LearnModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} strokeWidth={2} />
        </button>
        <h2>The Circular Electronics Hierarchy</h2>
        <p>
          Electronic waste is the world&apos;s fastest growing solid waste stream, expanding by over 2.5
          million metric tons per year. EcoLoop AI enforces a strict circular economy priority order
          to prevent premature disposal:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '20px 0' }}>
          <div style={{ background: '#f0f9f4', padding: '14px 18px', borderRadius: '12px' }}>
            <strong style={{ color: '#168166', display: 'block', marginBottom: '4px' }}>
              1. Reuse & Resale (Highest Value)
            </strong>
            <span style={{ fontSize: '13px', color: '#335048' }}>
              Keeping functional devices with secondary market utility in circulation avoids up to
              80% of total product lifecycle carbon emissions.
            </span>
          </div>

          <div style={{ background: '#f0f9f4', padding: '14px 18px', borderRadius: '12px' }}>
            <strong style={{ color: '#168166', display: 'block', marginBottom: '4px' }}>
              2. Repair & Modular Restoration
            </strong>
            <span style={{ fontSize: '13px', color: '#335048' }}>
              Replacing worn subcomponents (batteries, display panels, charging ports) extends device
              usefulness by 2 to 4 years at a fraction of replacement cost.
            </span>
          </div>

          <div style={{ background: '#f0f9f4', padding: '14px 18px', borderRadius: '12px' }}>
            <strong style={{ color: '#168166', display: 'block', marginBottom: '4px' }}>
              3. Refurbishment & Re-imaging
            </strong>
            <span style={{ fontSize: '13px', color: '#335048' }}>
              Professional diagnostic testing, ultrasonic cleaning, and storage sanitization prepare
              mature hardware for reliable secondary lifecycles.
            </span>
          </div>

          <div style={{ background: '#f0f9f4', padding: '14px 18px', borderRadius: '12px' }}>
            <strong style={{ color: '#168166', display: 'block', marginBottom: '4px' }}>
              4. Certified Material Recycling (Urban Mining)
            </strong>
            <span style={{ fontSize: '13px', color: '#335048' }}>
              1 ton of recycled electronics contains up to 100x more gold and copper than 1 ton of
              virgin ore. Certified recyclers safely extract precious elements while sequestering
              heavy metal toxins.
            </span>
          </div>
        </div>

        <button type="button" className="primary" onClick={onClose} style={{ marginTop: '8px' }}>
          Got it, back to assessment →
        </button>
      </div>
    </div>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} strokeWidth={2} />
        </button>
        <h2>About EcoLoop AI</h2>
        <p>
          EcoLoop AI is an open, deterministic decision-support platform designed to transition
          consumer electronics management from wasteful linear obsolescence into a high-efficiency
          circular economy.
        </p>

        <h3 style={{ margin: '18px 0 8px', fontSize: '16px' }}>Core System Principles:</h3>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.6', color: '#44635b' }}>
          <li>
            <strong>100% Deterministic Scoring:</strong> Every assessment is calculated from fixed
            mathematical weights across 6 transparent dimensions. No hidden heuristics or black-box
            guesses.
          </li>
          <li>
            <strong>Grounded Chatbot Guidance:</strong> The EcoLoop assistant references the user&apos;s
            exact answers and score breakdown, delivering reliable facts without hallucination.
          </li>
          <li>
            <strong>Live Local Stewardship:</strong> Directly connects users to verified local
            repair centers, refurbishment hubs, and certified e-waste drop-offs via OpenStreetMap and
            Google Maps.
          </li>
        </ul>

        <div
          style={{
            background: '#eaf4ee',
            padding: '14px',
            borderRadius: '12px',
            marginTop: '18px',
            fontSize: '13px',
            color: '#1d3e35',
          }}
        >
          Phase 1 Prototype · Supported across 15 consumer electronics and home appliance categories.
        </div>

        <button type="button" className="primary" onClick={onClose} style={{ marginTop: '20px' }}>
          Close
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   Main App Component
   ========================================================= */

function getOrCreateSessionId(): string {
  let sid = localStorage.getItem('ecoloop_session_id');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    localStorage.setItem('ecoloop_session_id', sid);
  }
  return sid;
}

function App() {
  const [page, navigate] = useState<'home' | 'analyze' | 'history' | 'learn' | 'about'>('analyze');
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<StoredReport[]>([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');

  // Primary workflow state
  const [device, setDevice] = useState<string>('smartphone');
  const [analysisStage, setAnalysisStage] = useState<'select_device' | 'assessment'>('select_device');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  const refreshHistory = () => {
    setHistory(historyService.getReports());
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  const resetAssessment = () => {
    setResult(null);
    setAnswers({});
    setQuestionIndex(0);
    setAnalysisStage('select_device');
  };

  const handleDeviceSelected = (deviceId: string) => {
    setDevice(deviceId);
    setAnswers({});
    setQuestionIndex(0);
    setAnalysisStage('assessment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Dynamic questions tailored to the selected device */
  const selectedMeta = getDeviceMeta(device);
  const currentQuestions: AssessmentQuestion[] = [
    COMMON_QUESTIONS[0], // Age
    COMMON_QUESTIONS[1], // Working status
    COMMON_QUESTIONS[2], // Physical condition
    ...selectedMeta.specific_questions, // 2-3 device-specific checks
    COMMON_QUESTIONS[3], // Repairability
  ];

  const safeQuestionIndex = Math.min(questionIndex, Math.max(currentQuestions.length - 1, 0));
  const currentQuestion = currentQuestions[safeQuestionIndex];

  const currentAnswerValue =
    currentQuestion && answers[currentQuestion.key] !== undefined
      ? String(answers[currentQuestion.key])
      : '';

  const hasCurrentAnswer = Boolean(
    currentQuestion &&
      answers[currentQuestion.key] !== undefined &&
      answers[currentQuestion.key] !== null &&
      String(answers[currentQuestion.key]).trim() !== ''
  );

  const updateAnswer = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.key]: currentQuestion.key === 'age_years' && value !== '8+' && !isNaN(Number(value)) ? Number(value) : value,
    }));
  };

  const nextQuestion = () => {
    if (!currentQuestion || !hasCurrentAnswer) return;
    if (safeQuestionIndex < currentQuestions.length - 1) {
      setQuestionIndex((idx) => idx + 1);
    }
  };

  const prevQuestion = () => {
    if (safeQuestionIndex > 0) {
      setQuestionIndex((idx) => idx - 1);
    }
  };

  /* Submit assessment to backend deterministic engine */
  const submitAssessment = async () => {
    setLoading(true);
    try {
      const payload = {
        session_id: getOrCreateSessionId(),
        device_type: device,
        device_category: selectedMeta.category,
        recognition_status: 'manual',
        recognition_confidence: 1.0,
        manual_assessment: true,
        answers,
        findings: ['User assessment answers collected'],
      };

      const response = await fetch(`${API}/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Assessment failed with status ${response.status}`);
      }

      const data: Result = await response.json();
      setResult(data);
      historyService.saveReport(
        data,
        answers,
        selectedMeta.name,
        selectedMeta.category
      );
      refreshHistory();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Unable to complete the assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     HOME PAGE
     ========================================================= */
  if (page === 'home') {
    return (
      <>
        <Nav currentPage={page} navigate={navigate} />

        <main className="home-shell">
          <section className="home-hero">
            <div className="home-copy">
              <div className="home-badge">
                <span className="home-badge-dot" />
                CIRCULAR ELECTRONICS ASSISTANT
                <span className="home-badge-live">PHASE 1</span>
              </div>

              <h1 className="home-title">
                Give your electronics
                <span>a smarter second life.</span>
              </h1>

              <p className="home-description">
                Select your device and get explainable guidance for repair, refurbishment,
                resale, donation, or responsible recycling — powered by transparent decision scoring
                and local circular network matching.
              </p>

              <div className="home-actions">
                <button
                  className="home-primary"
                  onClick={() => {
                    resetAssessment();
                    navigate('analyze');
                  }}
                >
                  <span>Start device assessment</span>
                  <span className="home-arrow">→</span>
                </button>

                <button className="home-secondary" onClick={() => navigate('history')}>
                  View assessment history
                  <span>↗</span>
                </button>
              </div>

              <div className="home-trust-row">
                <div>
                  <strong>15</strong>
                  <span>Device categories</span>
                </div>
                <div>
                  <strong>0–100</strong>
                  <span>EcoScore methodology</span>
                </div>
                <div>
                  <strong>OSM</strong>
                  <span>Nearby stakeholder matching</span>
                </div>
              </div>
            </div>

            <div className="home-visual" aria-label="EcoLoop AI product preview">
              <div className="home-orbit home-orbit-one" />
              <div className="home-orbit home-orbit-two" />
              <div className="home-glow" />

              <div className="home-ai-card">
                <div className="home-card-top">
                  <div className="home-ai-icon"><Sparkles size={16} strokeWidth={2} /></div>
                  <div>
                    <strong>EcoLoop AI</strong>
                    <span>Decision engine</span>
                  </div>
                  <span className="home-live-dot">READY</span>
                </div>

                <div className="home-device-preview">
                  <div className="home-device-screen">
                    <div className="home-device-camera" />
                    <div className="home-device-shine" />
                    <div className="home-device-text">
                      <span>DEVICE</span>
                      <b>SMARTPHONE</b>
                    </div>
                  </div>

                  <div className="home-recognition">
                    <span>Deterministic Analysis</span>
                    <strong>100%</strong>
                    <div className="home-progress">
                      <span style={{ width: '100%' }} />
                    </div>
                    <small>Transparent weighted model</small>
                  </div>
                </div>

                <div className="home-score-row">
                  <div className="home-score-ring">
                    <div>
                      <strong>84.7</strong>
                      <span>/100</span>
                    </div>
                  </div>

                  <div className="home-score-copy">
                    <span>ECOSCORE</span>
                    <strong>High circular potential</strong>
                    <p>6 weighted factors guide the next responsible action.</p>
                  </div>
                </div>

                <div className="home-recommendation">
                  <div className="home-recommendation-icon"><Recycle size={16} strokeWidth={2} /></div>
                  <div>
                    <span>RECOMMENDED NEXT STEP</span>
                    <strong>Repair</strong>
                  </div>
                  <span className="home-recommendation-arrow">→</span>
                </div>
              </div>

              <div className="home-float home-float-ai">
                <span>●</span>
                15 Categories
                <strong>Ready</strong>
              </div>

              <div className="home-float home-float-eco">
                <span style={{ display: 'inline-flex', alignItems: 'center' }}><Recycle size={12} strokeWidth={2} /></span>
                Circular decision
                <strong>Explainable</strong>
              </div>
            </div>
          </section>

          <section className="home-feature-strip">
            <div className="home-feature-intro">
              <span className="eyebrow">ONE SIMPLE FLOW</span>
              <h2>From device to responsible action.</h2>
            </div>

            <div className="home-feature">
              <span className="home-feature-number">01</span>
              <div>
                <strong>Select</strong>
                <p>Choose from 15 supported electronics and appliance types.</p>
              </div>
            </div>

            <div className="home-feature">
              <span className="home-feature-number">02</span>
              <div>
                <strong>Assess</strong>
                <p>Device-specific questions capture condition, age, and faults.</p>
              </div>
            </div>

            <div className="home-feature">
              <span className="home-feature-number">03</span>
              <div>
                <strong>Score & Act</strong>
                <p>Get transparent EcoScore breakdown, recommendation, and local options.</p>
              </div>
            </div>
          </section>

          <section className="home-note">
            <div className="home-note-icon">i</div>
            <div>
              <strong>Built for responsible decisions</strong>
              <p>
                EcoScore is a Phase-1 decision-support methodology. Environmental values are transparent
                estimates based on device category mass and embodied manufacturing lifecycle data.
              </p>
            </div>
          </section>
        </main>
        <GlobalFloatingChatbot
          currentPage={page}
          latestResult={result}
          currentDevice={device}
          currentQuestion={analysisStage === 'assessment' && !result ? currentQuestion : undefined}
          answers={answers}
          questionNumber={analysisStage === 'assessment' && !result ? safeQuestionIndex + 1 : undefined}
          totalQuestions={analysisStage === 'assessment' && !result ? currentQuestions.length : undefined}
        />
      </>
    );
  }

  /* =========================================================
     HISTORY PAGE
     ========================================================= */
  if (page === 'history') {
    const handleViewReport = (report: StoredReport) => {
      setResult(report as Result);
      setDevice(report.device_type);
      if (report.answers) {
        setAnswers(report.answers);
      }
      setAnalysisStage('assessment');
      navigate('analyze');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleClearHistory = () => {
      const confirmed = window.confirm(
        'Are you sure you want to clear your saved assessment history? This will permanently remove your stored reports from this browser.'
      );
      if (confirmed) {
        historyService.clearReports();
        refreshHistory();
      }
    };

    const normalizedSearch = historySearch.trim().toLowerCase();
    const filteredHistory = history.filter((row) => {
      const matchesFilter =
        historyFilter === 'all' ||
        String(row.recommended_action || '').toLowerCase() === historyFilter;

      const searchable = [
        row.id,
        row.device_type,
        row.condition,
        row.recommended_action,
        row.stakeholder_category,
      ]
        .filter((val) => val !== undefined && val !== null)
        .join(' ')
        .toLowerCase();

      return matchesFilter && searchable.includes(normalizedSearch);
    });

    return (
      <>
        <Nav currentPage={page} navigate={navigate} />

        <main className="history-shell">
          <section className="history-workspace">
            <div className="history-toolbar">
              <div>
                <span className="eyebrow">SAVED ASSESSMENTS</span>
                <h2>
                  {filteredHistory.length} {filteredHistory.length === 1 ? 'record' : 'records'}
                </h2>
              </div>
              <div className="history-controls">
                {history.length > 0 && (
                  <button
                    type="button"
                    className="history-clear-btn"
                    onClick={handleClearHistory}
                    title="Clear all saved assessments from this browser"
                  >
                    Clear History
                  </button>
                )}
                <div className="history-search">
                  <span><Search size={14} strokeWidth={2} /></span>
                  <input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search device or action"
                    aria-label="Search assessment history"
                  />
                </div>
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  aria-label="Filter assessment history"
                >
                  <option value="all">All decisions</option>
                  <option value="repair">Repair</option>
                  <option value="refurbish">Refurbish</option>
                  <option value="sell">Sell</option>
                  <option value="donate">Donate</option>
                  <option value="recycle">Recycle</option>
                </select>
              </div>
            </div>

            {filteredHistory.length ? (
              <div className="history-list">
                {filteredHistory.map((row) => {
                  const score = Number(row.ecoscore);
                  const action = String(row.recommended_action || '—');
                  return (
                    <article className="history-row" key={row.id}>
                      <div className="history-device-icon">
                        <DeviceIcon deviceId={row.device_type} size={22} strokeWidth={2} />
                      </div>
                      <div className="history-row-main">
                        <div className="history-row-title">
                          <strong>{formatLabel(row.device_type || row.deviceName)}</strong>
                          <span>#{row.id}</span>
                        </div>
                        <p>
                          {row.condition ? formatLabel(row.condition) : 'Condition assessed'}
                          <span>•</span>
                          {row.stakeholder_category || 'Circular option'}
                          {row.assessmentDate && (
                            <>
                              <span>•</span>
                              <span>
                                {new Date(row.assessmentDate).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="history-row-score">
                        <small>ECOSCORE</small>
                        <strong>
                          {Number.isFinite(score) ? score : '—'}
                          <em>/100</em>
                        </strong>
                      </div>
                      <div className="history-row-action">
                        <span className={`history-action-tag ${action.toLowerCase()}`}>
                          {action}
                        </span>
                        <button
                          type="button"
                          className="history-view-btn"
                          onClick={() => handleViewReport(row)}
                        >
                          View report →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="history-empty">
                <div className="history-empty-icon"><Search size={32} strokeWidth={1.5} /></div>
                <h3>{history.length ? 'No matching assessments' : 'No completed assessments yet.'}</h3>
                <p>
                  {history.length
                    ? 'Try another search term or choose a different decision filter.'
                    : 'Complete an EcoLoop AI assessment to see your reports here.'}
                </p>
                {!history.length && (
                  <button
                    className="primary"
                    onClick={() => {
                      resetAssessment();
                      navigate('analyze');
                    }}
                  >
                    Assess my first device →
                  </button>
                )}
              </div>
            )}
          </section>
        </main>
        <GlobalFloatingChatbot
          currentPage={page}
          latestResult={result}
          currentDevice={device}
          currentQuestion={analysisStage === 'assessment' && !result ? currentQuestion : undefined}
          answers={answers}
          questionNumber={analysisStage === 'assessment' && !result ? safeQuestionIndex + 1 : undefined}
          totalQuestions={analysisStage === 'assessment' && !result ? currentQuestions.length : undefined}
        />
      </>
    );
  }

  /* =========================================================
     ANALYZE PAGE (Primary Mentor-Requested Workflow)
     ========================================================= */

  return (
    <>
      <Nav currentPage={page} navigate={navigate} />

      <main className="analyze-shell">
        {analysisStage === 'select_device' && <ConceptHeroBanner />}

        {result ? (
          <ResultPanel result={result} onReset={resetAssessment} answers={answers} />
        ) : (
          <>
            {/* Step 1: Device Selection (2-Column Workspace) */}
            {analysisStage === 'select_device' && (
              <DeviceSelectionWorkspace
                selectedDeviceId={device}
                onSelectDevice={handleDeviceSelected}
              />
            )}

            {/* Step 2: Device-Specific Questions Workspace */}
            {analysisStage === 'assessment' && (
              <AssessmentQuestionsWorkspace
                device={device}
                selectedMeta={selectedMeta}
                currentQuestions={currentQuestions}
                safeQuestionIndex={safeQuestionIndex}
                currentQuestion={currentQuestion}
                currentAnswerValue={currentAnswerValue}
                hasCurrentAnswer={hasCurrentAnswer}
                loading={loading}
                updateAnswer={updateAnswer}
                nextQuestion={nextQuestion}
                prevQuestion={prevQuestion}
                submitAssessment={submitAssessment}
                onChangeDevice={() => setAnalysisStage('select_device')}
              />
            )}
          </>
        )}
      </main>

      {page === 'learn' && <LearnModal onClose={() => navigate('analyze')} />}
      {page === 'about' && <AboutModal onClose={() => navigate('analyze')} />}

      <GlobalFloatingChatbot
        currentPage={page}
        latestResult={result}
        currentDevice={device}
        currentQuestion={analysisStage === 'assessment' && !result ? currentQuestion : undefined}
        answers={answers}
        questionNumber={analysisStage === 'assessment' && !result ? safeQuestionIndex + 1 : undefined}
        totalQuestions={analysisStage === 'assessment' && !result ? currentQuestions.length : undefined}
      />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);