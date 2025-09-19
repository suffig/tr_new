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

/**
 * Get ban type color for UI display
 */
export const getBanTypeColor = (type) => {
  switch (type) {
    case 'Gelb-Rote Karte':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Rote Karte':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Verletzung':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Get ban type icon
 */
export const getBanIcon = (type) => {
  switch (type) {
    case 'Gelb-Rote Karte':
      return '🟨🟥';
    case 'Rote Karte':
      return '🟥';
    case 'Verletzung':
      return '🏥';
    default:
      return '⚠️';
  }
};