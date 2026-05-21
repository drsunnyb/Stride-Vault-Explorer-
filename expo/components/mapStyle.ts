/**
 * Google Maps dark style — cinematic "Stride Quest night" palette.
 * Used on Android. iOS uses Apple Maps in dark mode via userInterfaceStyle.
 */
export const GMAPS_DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0A0E1A" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7A8299" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#06070D" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#9AA3B8" }] },
  { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#5A6378" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0F2A1E" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#1F5C40" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1A2236" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#243049" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2C3A5A" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1A2236" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0E3A4A" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#2E92AE" }] },
];
