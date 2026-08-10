/**
 * Centralized BAN_TYPES configuration
 * Used by AddBanTab and BansTab components for consistency
 */
export const BAN_TYPES = [
  { 
    value: "Gelb-Rote Karte", 
    label: "Gelb-Rote Karte", 
    duration: 1, 
    fixedDuration: true, 
    icon: "🟨🟥" 
  },
  { 
    value: "Rote Karte", 
    label: "Rote Karte", 
    duration: 2, 
    fixedDuration: false, 
    icon: "🟥", 
    minDuration: 1, 
    maxDuration: 6 
  },
  { 
    value: "Verletzung", 
    label: "Verletzung", 
    duration: 3, 
    fixedDuration: false, 
    icon: "🏥", 
    minDuration: 1, 
    maxDuration: 6 
  }
];
