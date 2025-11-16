// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function
import luck from "./_luck.ts";

// Create basic UI elements

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
//const CACHE_SPAWN_PROBABILITY = 0.1;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(CLASSROOM_LATLNG);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Player score
let heldToken: number | null = null;
statusPanelDiv.innerHTML = "Holding: none";

function getTokenValue(nx: number, ny: number): number | null {
  const seed = `${nx},${ny}`;
  const h = luck(seed);

  if (h < 0.5) return null;

  if (h < 0.8) return 1; // weight 30%
  if (h < 0.95) return 2; // weight 15%
  return 3; // weight 5%
}

function drawCell(nx: number, ny: number) {
  const lat = CLASSROOM_LATLNG.lat + ny * TILE_DEGREES;
  const lng = CLASSROOM_LATLNG.lng + nx * TILE_DEGREES;

  const bounds = leaflet.latLngBounds(
    leaflet.latLng(lat, lng),
    leaflet.latLng(lat + TILE_DEGREES, lng + TILE_DEGREES),
  );

  const val = getTokenValue(nx, ny);
  let color = "rgba(0,0,0,0)";

  if (val === 1) color = "rgba(255,0,0,0.4)";
  if (val === 2) color = "rgba(0,0,255,0.4)";
  if (val === 3) color = "rgba(0,255,0,0.4)";

  leaflet.rectangle(bounds, {
    color: color,
    fillColor: color,
    fillOpacity: 0.6,
    weight: 0,
  }).addTo(map);

  const rect = leaflet.rectangle(bounds, {
    color,
    fillColor: color,
    fillOpacity: 0.6,
    weight: 0,
  }).addTo(map);

  rect.on("click", () => {
    const val = getTokenValue(nx, ny);
    if (val !== null) {
      if (val === null) return;

      if (heldToken !== null) {
        statusPanelDiv.innerHTML = `Holding: ${heldToken}`;
        return;
      }

      heldToken = val;
      statusPanelDiv.innerHTML = `Holding: ${heldToken}`;
    }
  });
}

for (let nx = 0; nx < NEIGHBORHOOD_SIZE; nx++) {
  for (let ny = 0; ny < NEIGHBORHOOD_SIZE; ny++) {
    drawCell(nx, ny);
  }
}
