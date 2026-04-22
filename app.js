let schoolData = null;

const buildingSelect = document.getElementById("buildingSelect");
const staircaseSelect = document.getElementById("staircaseSelect");
const floorSelect = document.getElementById("floorSelect");

const infoBuilding = document.getElementById("infoBuilding");
const infoStaircase = document.getElementById("infoStaircase");
const infoFloor = document.getElementById("infoFloor");
const infoQr = document.getElementById("infoQr");

const infoCampus = document.getElementById("infoCampus");
const qrTitle = document.getElementById("qrTitle");
const qrSubtitle = document.getElementById("qrSubtitle");
const qrContainer = document.getElementById("qrcode");

let preparedBuildings = [];

function getAllBuildings() {
  if (!schoolData?.campuses) return [];

  return schoolData.campuses.flatMap(campus =>
    (campus.buildings || []).map(building => ({
      ...building,
      campus
    }))
  );
}

function buildFloorMap(building) {
  const map = new Map();
  (building.floors || []).forEach(floor => {
    map.set(floor.id, floor);
  });
  return map;
}

function extractStaircaseIdentifier(segment, floorMap) {
  const fromFloor = floorMap.get(segment.from_floor_id);
  const toFloor = floorMap.get(segment.to_floor_id);

  if (!fromFloor || !toFloor) {
    return segment.segmentIdentifier || segment.displayName || "UNBEKANNT";
  }

  const suffix = `_${fromFloor.floorIdentifier}_${toFloor.floorIdentifier}`;

  if (segment.segmentIdentifier && segment.segmentIdentifier.endsWith(suffix)) {
    return segment.segmentIdentifier.slice(0, -suffix.length);
  }

  return segment.segmentIdentifier || segment.displayName || "UNBEKANNT";
}

function extractStaircaseDisplayName(segment) {
  if (!segment.displayName) return segment.segmentIdentifier || "Unbekannt";

  const match = segment.displayName.match(/^(.*)\s+(UG\d+|EG|OG\d+)\s*->\s*(UG\d+|EG|OG\d+)$/);
  if (match) {
    return match[1].trim();
  }

  return segment.displayName;
}

function getPreparedStaircases(building) {
  const floorMap = buildFloorMap(building);
  const staircaseMap = new Map();

  (building.stair_segments || []).forEach(segment => {
    const staircaseIdentifier = extractStaircaseIdentifier(segment, floorMap);
    const staircaseDisplayName = extractStaircaseDisplayName(segment);

    if (!staircaseMap.has(staircaseIdentifier)) {
      staircaseMap.set(staircaseIdentifier, {
        identifier: staircaseIdentifier,
        name: staircaseDisplayName,
        floorsMap: new Map()
      });
    }

    const staircase = staircaseMap.get(staircaseIdentifier);

    const fromFloor = floorMap.get(segment.from_floor_id);
    const toFloor = floorMap.get(segment.to_floor_id);

    if (fromFloor) staircase.floorsMap.set(fromFloor.id, fromFloor);
    if (toFloor) staircase.floorsMap.set(toFloor.id, toFloor);
  });

  return Array.from(staircaseMap.values())
    .map(staircase => ({
      identifier: staircase.identifier,
      name: staircase.name,
      floors: Array.from(staircase.floorsMap.values()).sort(
        (a, b) => a.floor_number - b.floor_number
      )
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

function prepareBuildings() {
  preparedBuildings = getAllBuildings()
    .map(building => ({
      ...building,
      staircases: getPreparedStaircases(building)
    }))
    .filter(building => building.staircases.length > 0)
    .sort((a, b) => {
      const campusCompare = a.campus.displayName.localeCompare(b.campus.displayName, "de");
      if (campusCompare !== 0) return campusCompare;
      return a.displayName.localeCompare(b.displayName, "de");
    });
}

function formatFloor(floor) {
  return floor?.displayName ?? "-";
}

function getSelectedBuilding() {
  return preparedBuildings.find(
    building => building.id === buildingSelect.value
  );
}

function getSelectedStaircase() {
  const building = getSelectedBuilding();
  if (!building) return null;

  return building.staircases.find(
    staircase => staircase.identifier === staircaseSelect.value
  );
}

function getSelectedFloor() {
  const staircase = getSelectedStaircase();
  if (!staircase) return null;

  return staircase.floors.find(
    floor => floor.id === floorSelect.value
  );
}

function populateBuildings() {
  buildingSelect.innerHTML = "";

  preparedBuildings.forEach(building => {
    const option = document.createElement("option");
    option.value = building.id;
    option.textContent = `${building.campus.displayName} · ${building.displayName}`;
    buildingSelect.appendChild(option);
  });
}

function populateStaircases() {
  const building = getSelectedBuilding();
  staircaseSelect.innerHTML = "";

  if (!building) return;

  building.staircases.forEach(staircase => {
    const option = document.createElement("option");
    option.value = staircase.identifier;
    option.textContent = staircase.name;
    staircaseSelect.appendChild(option);
  });
}

function populateFloors() {
  const staircase = getSelectedStaircase();
  floorSelect.innerHTML = "";

  if (!staircase) return;

  staircase.floors.forEach(floor => {
    const option = document.createElement("option");
    option.value = floor.id;
    option.textContent = formatFloor(floor);
    floorSelect.appendChild(option);
  });
}

function renderQrCode() {
  const building = getSelectedBuilding();
  const staircase = getSelectedStaircase();
  const floor = getSelectedFloor();

  if (!building || !staircase || !floor) return;

  const campus = building.campus;
  const qrText = `${campus.campusIdentifier}_${building.buildingIdentifier}_${staircase.identifier}_${floor.floorIdentifier}`;

  infoCampus.textContent = campus.displayName;
  infoBuilding.textContent = building.displayName;
  infoStaircase.textContent = staircase.name;
  infoFloor.textContent = formatFloor(floor);
  infoQr.textContent = qrText;

  qrTitle.textContent = `${campus.displayName} · ${building.displayName}`;
  qrSubtitle.textContent = `${staircase.name} · Stockwerk ${formatFloor(floor)}`;

  qrContainer.innerHTML = "";

  const tempQr = document.createElement("div");
  tempQr.style.display = "none";
  document.body.appendChild(tempQr);

  new QRCode(tempQr, {
    text: qrText,
    width: 320,
    height: 320,
    correctLevel: QRCode.CorrectLevel.H
  });

  const logo = new Image();
  logo.src = "./liftignore.png";

  logo.onload = () => {
    const qrCanvas = tempQr.querySelector("canvas");
    if (!qrCanvas) {
      tempQr.remove();
      return;
    }

    const finalCanvas = document.createElement("canvas");
    const size = 320;
    finalCanvas.width = size;
    finalCanvas.height = size;

    const ctx = finalCanvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(qrCanvas, 0, 0, size, size);

    const logoSize = 110;
    const x = (size - logoSize) / 2;
    const y = (size - logoSize) / 2;

    ctx.drawImage(logo, x, y, logoSize, logoSize);

    const pngUrl = finalCanvas.toDataURL("image/png");

    const resultImg = document.createElement("img");
    resultImg.src = pngUrl;
    resultImg.alt = "QR-Code mit Logo";
    resultImg.className = "qr-result-image";
    resultImg.draggable = true;

    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `${qrText}.png`;
    downloadLink.appendChild(resultImg);

    qrContainer.innerHTML = "";
    qrContainer.appendChild(downloadLink);

    tempQr.remove();
  };

  logo.onerror = () => {
    qrContainer.innerHTML = "<p>Logo konnte nicht geladen werden.</p>";
    tempQr.remove();
  };
}

buildingSelect.addEventListener("change", () => {
  populateStaircases();
  populateFloors();
  renderQrCode();
});

floorSelect.addEventListener("change", renderQrCode);

fetch("buildings_5.json")
  .then(response => {
    if (!response.ok) throw new Error("JSON-Datei konnte nicht geladen werden.");
    return response.json();
  })
  .then(data => {
    schoolData = data;
    prepareBuildings();
    populateBuildings();
    populateStaircases();
    populateFloors();
    renderQrCode();
  })
  .catch(error => {
    document.body.innerHTML = `<main class="container"><section class="panel"><h1>Fehler</h1><p>${error.message}</p></section></main>`;
  });