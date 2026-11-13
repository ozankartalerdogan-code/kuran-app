export function parseEnvFile(text) {
  const result = {};

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    if (!key) continue;

    let value = line.slice(separator + 1).trim();
    if (value.length >= 2) {
      const first = value[0];
      const last = value[value.length - 1];
      if ((first === '"' || first === "'") && first === last) {
        value = value.slice(1, -1);
      }
    }

    result[key] = value;
  }

  return result;
}

export function normalizePlaceList(json) {
  if (!json || !Array.isArray(json.data)) {
    const message = json && json.message ? json.message : "data dizisi bulunamadı";
    throw new Error(`Diyanet yanıtı geçersiz: ${message}`);
  }

  const places = [];

  for (const item of json.data) {
    if (!item || typeof item !== "object") continue;

    const id = Number(item.id);
    if (!Number.isInteger(id)) continue;

    places.push({
      id,
      code: String(item.code ?? ""),
      name: String(item.name ?? ""),
    });
  }

  return places;
}

export function flattenPlaces(countries, statesByCountry, citiesByState) {
  const cities = [];
  const seenCityIds = new Set();

  for (const country of countries || []) {
    const states = statesByCountry ? statesByCountry[country.id] : undefined;
    if (!Array.isArray(states)) continue;

    for (const state of states) {
      const stateCities = citiesByState ? citiesByState[state.id] : undefined;
      if (!Array.isArray(stateCities)) continue;

      for (const city of stateCities) {
        if (seenCityIds.has(city.id)) continue;
        seenCityIds.add(city.id);

        cities.push({
          cityId: city.id,
          cityName: city.name,
          cityCode: city.code,
          stateId: state.id,
          stateName: state.name,
          countryId: country.id,
          countryName: country.name,
          countryCode: country.code,
        });
      }
    }
  }

  return cities;
}
