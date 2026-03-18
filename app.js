let schoolData = null;

const buildingSelect = document.getElementById("buildingSelect");
const staircaseSelect = document.getElementById("staircaseSelect");
const floorSelect = document.getElementById("floorSelect");

const infoBuilding = document.getElementById("infoBuilding");
const infoStaircase = document.getElementById("infoStaircase");
const infoFloor = document.getElementById("infoFloor");
const infoQr = document.getElementById("infoQr");

const qrTitle = document.getElementById("qrTitle");
const qrSubtitle = document.getElementById("qrSubtitle");
const qrContainer = document.getElementById("qrcode");

function formatFloor(floor) {
  return String(floor);
}

function getSelectedBuilding() {
  return schoolData.buildings.find(b => b.name === buildingSelect.value);
}

function getSelectedStaircase() {
  const building = getSelectedBuilding();
  return building.staircases.find(s => s.name === staircaseSelect.value);
}

function getSelectedFloorEntry() {
  const staircase = getSelectedStaircase();
  return staircase.floors.find(f => String(f.floor) === floorSelect.value);
}

function populateBuildings() {
  buildingSelect.innerHTML = "";
  schoolData.buildings.forEach(building => {
    const option = document.createElement("option");
    option.value = building.name;
    option.textContent = building.name;
    buildingSelect.appendChild(option);
  });
}

function populateStaircases() {
  const building = getSelectedBuilding();
  staircaseSelect.innerHTML = "";
  building.staircases.forEach(staircase => {
    const option = document.createElement("option");
    option.value = staircase.name;
    option.textContent = staircase.name;
    staircaseSelect.appendChild(option);
  });
}

function populateFloors() {
  const staircase = getSelectedStaircase();
  floorSelect.innerHTML = "";
  staircase.floors.forEach(entry => {
    const option = document.createElement("option");
    option.value = String(entry.floor);
    option.textContent = formatFloor(entry.floor);
    floorSelect.appendChild(option);
  });
}

function renderQrCode() {
  const building = getSelectedBuilding();
  const staircase = getSelectedStaircase();
  const floorEntry = getSelectedFloorEntry();

  infoBuilding.textContent = building.name;
  infoStaircase.textContent = staircase.name;
  infoFloor.textContent = formatFloor(floorEntry.floor);
  infoQr.textContent = floorEntry.qrCode;

  qrTitle.textContent = building.name;
  qrSubtitle.textContent = `${staircase.name} · Stockwerk ${formatFloor(floorEntry.floor)}`;

  qrContainer.innerHTML = "";
  new QRCode(qrContainer, {
    text: floorEntry.qrCode,
    width: 260,
    height: 260
  });
}

buildingSelect.addEventListener("change", () => {
  populateStaircases();
  populateFloors();
  renderQrCode();
});

staircaseSelect.addEventListener("change", () => {
  populateFloors();
  renderQrCode();
});

floorSelect.addEventListener("change", renderQrCode);

fetch("treppenhaeuser_mit_qr.json")
  .then(response => {
    if (!response.ok) throw new Error("JSON-Datei konnte nicht geladen werden.");
    return response.json();
  })
  .then(data => {
    schoolData = data;
    populateBuildings();
    populateStaircases();
    populateFloors();
    renderQrCode();
  })
  .catch(error => {
    document.body.innerHTML = `<main class="container"><section class="panel"><h1>Fehler</h1><p>${error.message}</p></section></main>`;
  });
