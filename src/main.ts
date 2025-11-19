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

const craftBtn = document.createElement("button");
craftBtn.textContent = "Craft Special Item (Cost: 10)";
craftBtn.id = "craftButton";
controlPanelDiv.append(craftBtn);

const movePanel = document.createElement("div");
movePanel.id = "movementPanel";

const btnN = document.createElement("button");
btnN.textContent = "North";
const btnS = document.createElement("button");
btnS.textContent = "South";
const btnE = document.createElement("button");
btnE.textContent = "East";
const btnW = document.createElement("button");
btnW.textContent = "West";

movePanel.append(btnN, btnS, btnE, btnW);
controlPanelDiv.append(movePanel);

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
let playerLatLng = CLASSROOM_LATLNG;
const playerMarker = leaflet.marker(playerLatLng);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

const dropoffLatLng = leaflet.latLng(
  CLASSROOM_LATLNG.lat + 0.0008,
  CLASSROOM_LATLNG.lng,
);

const dropoffMarker = leaflet.marker(dropoffLatLng);
dropoffMarker.bindTooltip("Drop-off Point");
dropoffMarker.addTo(map);

dropoffMarker.on("click", () => {
  if (heldToken === null) {
    statusPanelDiv.innerHTML = "Holding: none (nothing to drop)";
    return;
  }

  playerPoints += heldToken;
  heldToken = null;

  statusPanelDiv.innerHTML = `Holding: none — Total Points: ${playerPoints}`;
});

// Player score
let playerPoints = 0;
let heldToken: number | null = null;
let gameWon = false;

craftBtn.addEventListener("click", tryCrafting);

function disableTileClicks() {
  map.off();
}

function tryCrafting() {
  if (gameWon) return;

  if (playerPoints < 10) {
    statusPanelDiv.innerHTML =
      `Not enough points to craft. Need 10, you have ${playerPoints}.`;
    return;
  }

  playerPoints -= 10;

  gameWon = true;
  statusPanelDiv.innerHTML =
    `🎉 You crafted the Special Item and WIN! Final Score: ${playerPoints}`;

  craftBtn.disabled = true;
  disableTileClicks();
}
statusPanelDiv.innerHTML = "Holding: none";

type TileKey = string;
const activeTiles = new Map<TileKey, leaflet.Rectangle>();

function tileKey(nx: number, ny: number) {
  return `${nx},${ny}`;
}

function getVisibleTileRange(): [number, number, number, number] {
  const centerX = Math.round(
    (playerLatLng.lng - CLASSROOM_LATLNG.lng) / TILE_DEGREES,
  );
  const centerY = Math.round(
    (playerLatLng.lat - CLASSROOM_LATLNG.lat) / TILE_DEGREES,
  );
  const half = Math.floor(NEIGHBORHOOD_SIZE / 2);
  return [centerX - half, centerX + half, centerY - half, centerY + half];
}

function updateVisibleTiles() {
  const [minX, maxX, minY, maxY] = getVisibleTileRange();
  const newTiles = new Set<TileKey>();

  for (let nx = minX; nx <= maxX; nx++) {
    for (let ny = minY; ny <= maxY; ny++) {
      const key = tileKey(nx, ny);
      newTiles.add(key);

      if (!activeTiles.has(key)) {
        const rect = drawCell(nx, ny);
        activeTiles.set(key, rect);
      }
    }
  }

  for (const [key, rect] of activeTiles) {
    if (!newTiles.has(key)) {
      rect.remove();
      activeTiles.delete(key);
    }
  }
}

function getTokenValue(nx: number, ny: number): number | null {
  const seed = `${nx},${ny}`;
  const h = luck(seed);

  if (h < 0.5) return null;
  if (h < 0.8) return 1;
  if (h < 0.95) return 2;
  return 3;
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

  const rect = leaflet.rectangle(bounds, {
    color,
    fillColor: color,
    fillOpacity: 0.6,
    weight: 0,
  }).addTo(map);

  rect.on("click", () => {
    if (gameWon) return;

    const val = getTokenValue(nx, ny);
    if (val === null) return;

    if (heldToken !== null) {
      statusPanelDiv.innerHTML = `Holding: ${heldToken}`;
      return;
    }

    const playerX = Math.round(
      (playerLatLng.lng - CLASSROOM_LATLNG.lng) / TILE_DEGREES,
    );
    const playerY = Math.round(
      (playerLatLng.lat - CLASSROOM_LATLNG.lat) / TILE_DEGREES,
    );
    const dist = Math.max(Math.abs(playerX - nx), Math.abs(playerY - ny));
    if (dist > 1) {
      statusPanelDiv.innerHTML = `Tile too far to interact`;
      return;
    }

    heldToken = val;
    statusPanelDiv.innerHTML = `Holding: ${heldToken}`;
  });

  return rect;
}

updateVisibleTiles();

let movePlayer = (dx: number, dy: number) => {
  const newLat = playerLatLng.lat + dy * TILE_DEGREES;
  const newLng = playerLatLng.lng + dx * TILE_DEGREES;

  playerLatLng = leaflet.latLng(newLat, newLng);
  playerMarker.setLatLng(playerLatLng);
  map.panTo(playerLatLng);
};

const originalMovePlayer = movePlayer;
movePlayer = (dx: number, dy: number) => {
  originalMovePlayer(dx, dy);
  updateVisibleTiles();
};

btnN.onclick = () => movePlayer(0, -1);
btnS.onclick = () => movePlayer(0, 1);
btnE.onclick = () => movePlayer(1, 0);
btnW.onclick = () => movePlayer(-1, 0);
