const TURKISH_CHARS = {
  "İ": "I",
  "ı": "I",
  "i": "I",
  "Ş": "S",
  "ş": "S",
  "Ğ": "G",
  "ğ": "G",
  "Ü": "U",
  "ü": "U",
  "Ö": "O",
  "ö": "O",
  "Ç": "C",
  "ç": "C",
  "Â": "A",
  "â": "A",
  "Î": "I",
  "î": "I",
  "Û": "U",
  "û": "U",
};

const TURKISH_CHAR_PATTERN = /[İıiŞşĞğÜüÖöÇçÂâÎîÛû]/g;

export function normalizePlaceName(value) {
  const mapped = String(value ?? "").replace(
    TURKISH_CHAR_PATTERN,
    (char) => TURKISH_CHARS[char],
  );
  const decomposed = mapped
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return decomposed
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function parentheticalParts(raw) {
  const open = raw.indexOf("(");
  if (open === -1) return null;
  const close = raw.indexOf(")", open + 1);
  return {
    before: raw.slice(0, open),
    inside: close === -1 ? raw.slice(open + 1) : raw.slice(open + 1, close),
  };
}

export function nameVariants(cityName) {
  const raw = String(cityName ?? "");
  const result = [];

  const add = (value) => {
    const normalized = normalizePlaceName(value);
    if (normalized && !result.includes(normalized)) result.push(normalized);
  };

  const parts = parentheticalParts(raw);
  if (parts) {
    add(parts.before);
    add(`${parts.before} ${parts.inside}`);
    add(parts.inside);
  } else {
    add(raw);
  }

  for (let variantIndex = 0; variantIndex < result.length; variantIndex += 1) {
    const tokens = result[variantIndex].split(" ");
    tokens.forEach((token, index) => {
      const replacements =
        token === "SANKT"
          ? ["ST"]
          : token === "SAINT"
            ? ["ST"]
            : token === "ST"
              ? ["SANKT", "SAINT"]
              : [];
      for (const replacement of replacements) {
        const copy = tokens.slice();
        copy[index] = replacement;
        add(copy.join(" "));
      }
    });
  }

  return result;
}

function rowNames(row) {
  const names = new Set();
  const add = (value) => {
    const normalized = normalizePlaceName(value);
    if (normalized) names.add(normalized);
  };
  add(row.name);
  add(row.ascii);
  for (const alt of row.alts || []) add(alt);
  return names;
}

export function buildGeoIndex(rows) {
  const index = new Map();

  for (const row of rows || []) {
    if (!row) continue;
    const iso = String(row.iso ?? "");
    if (!iso) continue;

    let byName = index.get(iso);
    if (!byName) {
      byName = new Map();
      index.set(iso, byName);
    }

    for (const name of rowNames(row)) {
      let list = byName.get(name);
      if (!list) {
        list = [];
        byName.set(name, list);
      }
      list.push(row);
    }
  }

  return index;
}

export function buildNameIndex(rows) {
  const index = new Map();

  for (const row of rows || []) {
    if (!row) continue;
    for (const name of rowNames(row)) {
      let list = index.get(name);
      if (!list) {
        list = [];
        index.set(name, list);
      }
      list.push(row);
    }
  }

  return index;
}

function findCandidatesByVariants(variants, byName) {
  if (!byName) return { rows: [] };
  for (const variant of variants) {
    const list = byName.get(variant);
    if (!list || list.length === 0) continue;
    const seen = new Set();
    const rows = [];
    for (const row of list) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
    return { rows };
  }
  return { rows: [] };
}

function highestPop(rows) {
  let best = rows[0];
  for (const row of rows) {
    if (Number(row.pop) > Number(best.pop)) best = row;
  }
  return best;
}

function toMatch(row, method) {
  return {
    lat: row.lat,
    lon: row.lon,
    tz: row.tz,
    geonameId: row.id,
    matchedName: row.name,
    method,
  };
}

function admin1MatchesState(row, stateNameNorm, admin1NameByKey) {
  if (!stateNameNorm || !admin1NameByKey) return false;
  const admin1Name = admin1NameByKey.get(`${row.iso}.${row.admin1}`);
  if (!admin1Name) return false;
  const normalized = normalizePlaceName(admin1Name);
  return (
    normalized === stateNameNorm ||
    normalized.includes(stateNameNorm) ||
    stateNameNorm.includes(normalized)
  );
}

export function matchTurkeyCityDetailed(city, ctx) {
  if (!city || !ctx) return { match: null, ambiguousCount: 0 };

  const stateNameNorm = normalizePlaceName(city.stateName);
  const code = ctx.stateCodeByNorm?.get(stateNameNorm);
  if (!code) return { match: null, ambiguousCount: 0 };

  const rawName = city.cityName ?? city.name ?? "";
  const cityNameNorm = normalizePlaceName(rawName);
  const variants = nameVariants(rawName);

  if (cityNameNorm === stateNameNorm) {
    const capitals = ctx.capitalRowsByAdmin1?.get(code);
    if (!capitals || capitals.length === 0) {
      return { match: null, ambiguousCount: 0 };
    }
    const ppla = capitals.filter((row) => row.fcode === "PPLA");
    const pplc = capitals.filter((row) => row.fcode === "PPLC");
    const pool = ppla.length > 0 ? ppla : pplc;
    if (pool.length === 0) return { match: null, ambiguousCount: 0 };
    return {
      match: toMatch(highestPop(pool), "tr-il-merkezi"),
      ambiguousCount: 0,
    };
  }

  const adm2Index = ctx.adm2NameIndexByAdmin1?.get(code);
  if (adm2Index) {
    const { rows } = findCandidatesByVariants(variants, adm2Index);
    if (rows.length > 1) return { match: null, ambiguousCount: rows.length };
    if (rows.length === 1) {
      return { match: toMatch(rows[0], "tr-adm2"), ambiguousCount: 0 };
    }
  }

  const pplIndex = ctx.pplNameIndexByAdmin1?.get(code);
  if (pplIndex) {
    const { rows } = findCandidatesByVariants(variants, pplIndex);
    if (rows.length > 1) return { match: null, ambiguousCount: rows.length };
    if (rows.length === 1) {
      return { match: toMatch(rows[0], "tr-ppl"), ambiguousCount: 0 };
    }
  }

  return { match: null, ambiguousCount: 0 };
}

export function matchTurkeyCity(city, ctx) {
  return matchTurkeyCityDetailed(city, ctx).match;
}

function median(values) {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

export function matchOtherCountryCities(cities, iso, ctx) {
  const matches = new Map();
  const ambiguousList = [];
  const byName = ctx?.index?.get(iso);

  if (!byName) {
    for (const city of cities || []) matches.set(city.cityId, null);
    return { matches, ambiguousList };
  }

  const infos = (cities || []).map((city) => {
    const variants = nameVariants(city.cityName ?? city.name ?? "");
    return { city, rows: findCandidatesByVariants(variants, byName).rows };
  });

  const anchorsByState = new Map();
  for (const { city, rows } of infos) {
    const stateNameNorm = normalizePlaceName(city.stateName);
    let anchor = null;
    if (rows.length === 1) {
      anchor = rows[0];
    } else if (rows.length > 1) {
      const matched = rows.filter((row) =>
        admin1MatchesState(row, stateNameNorm, ctx.admin1NameByKey),
      );
      if (matched.length > 0) anchor = highestPop(matched);
    }
    if (!anchor) continue;
    let group = anchorsByState.get(city.stateId);
    if (!group) {
      group = [];
      anchorsByState.set(city.stateId, group);
    }
    group.push({ lat: anchor.lat, lon: anchor.lon });
  }

  const medianByState = new Map();
  for (const [stateId, group] of anchorsByState) {
    if (group.length < 2) continue;
    const lat = median(group.map((item) => item.lat));
    const lon = median(group.map((item) => item.lon));
    if (lat === null || lon === null) continue;
    medianByState.set(stateId, { lat, lon });
  }

  const stateIds = new Set((cities || []).map((city) => city.stateId));
  const multiState = stateIds.size > 1;

  for (const { city, rows } of infos) {
    if (rows.length === 0) {
      matches.set(city.cityId, null);
      continue;
    }

    if (multiState && medianByState.has(city.stateId)) {
      const center = medianByState.get(city.stateId);
      let best = null;
      let bestDistance = Infinity;
      for (const row of rows) {
        const distance = haversineKm(row.lat, row.lon, center.lat, center.lon);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = row;
        }
      }
      if (!best || bestDistance > 400) {
        matches.set(city.cityId, null);
        continue;
      }
      matches.set(city.cityId, toMatch(best, "state-nearest"));
      continue;
    }

    if (rows.length === 1) {
      matches.set(city.cityId, toMatch(rows[0], "unique"));
      continue;
    }

    const sorted = rows.slice().sort((a, b) => Number(b.pop) - Number(a.pop));
    const top = Number(sorted[0].pop);
    const second = Number(sorted[1].pop);
    if (top > 0 && top >= 5 * second) {
      matches.set(city.cityId, toMatch(sorted[0], "dominant-pop"));
      continue;
    }

    matches.set(city.cityId, null);
    ambiguousList.push({
      cityId: city.cityId,
      cityName: city.cityName,
      stateName: city.stateName,
      countryCode: city.countryCode,
      candidateCount: rows.length,
    });
  }

  return { matches, ambiguousList };
}

function appendToMap(map, key, value) {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  list.push(value);
}

export function buildTurkeyContext(admin1NameByKey, citiesRows, trRows) {
  const stateCodeByNorm = new Map();
  for (const [key, name] of admin1NameByKey) {
    if (!key.startsWith("TR.")) continue;
    const norm = normalizePlaceName(name).replace(/ PROVINCE$/, "");
    if (norm) stateCodeByNorm.set(norm, key.slice(3));
  }

  const trCities = citiesRows.filter((row) => row.iso === "TR");

  const capitalRowsByAdmin1 = new Map();
  const pplRowsByAdmin1 = new Map();
  for (const row of trCities) {
    appendToMap(pplRowsByAdmin1, row.admin1, row);
    if (row.fcode === "PPLA" || row.fcode === "PPLC") {
      appendToMap(capitalRowsByAdmin1, row.admin1, row);
    }
  }

  const adm2RowsByAdmin1 = new Map();
  for (const row of trRows) {
    if (row.fclass !== "A" || row.fcode !== "ADM2") continue;
    const normalized = normalizePlaceName(row.name);
    const tokens = normalized.split(" ");
    const shortName =
      tokens.length > 1 && tokens[tokens.length - 1] === "ILCESI"
        ? tokens.slice(0, -1).join(" ")
        : null;
    appendToMap(
      adm2RowsByAdmin1,
      row.admin1,
      shortName ? { ...row, alts: [...row.alts, shortName] } : row,
    );
  }

  const toNameIndexes = (map) => {
    const result = new Map();
    for (const [key, rows] of map) result.set(key, buildNameIndex(rows));
    return result;
  };

  return {
    stateCodeByNorm,
    capitalRowsByAdmin1,
    adm2NameIndexByAdmin1: toNameIndexes(adm2RowsByAdmin1),
    pplNameIndexByAdmin1: toNameIndexes(pplRowsByAdmin1),
  };
}

export function findSuspiciousCities(cities, stateCountByCountry) {
  const byState = new Map();
  for (const city of cities) {
    if (city.matchMethod === null) continue;
    const key = `${city.countryCode}.${city.stateId}`;
    let group = byState.get(key);
    if (!group) {
      group = [];
      byState.set(key, group);
    }
    group.push(city);
  }

  const suspicious = [];
  for (const city of cities) {
    if (city.matchMethod === null) continue;
    const stateCount = stateCountByCountry.get(city.countryCode) || 0;
    if (stateCount <= 1) continue;

    const key = `${city.countryCode}.${city.stateId}`;
    const group = byState.get(key) || [];
    const others = group.filter((item) => item !== city);
    if (others.length === 0) continue;

    const medianLat = median(others.map((item) => item.lat));
    const medianLon = median(others.map((item) => item.lon));
    if (medianLat === null || medianLon === null) continue;

    const threshold = city.countryCode === "TÜRKİYE" ? 150 : 300;
    const distance = haversineKm(city.lat, city.lon, medianLat, medianLon);
    if (distance > threshold) {
      suspicious.push({
        cityId: city.cityId,
        cityName: city.cityName,
        stateName: city.stateName,
        countryCode: city.countryCode,
        distanceKmFromStateMedian: Math.round(distance * 10) / 10,
      });
    }
  }

  return suspicious;
}

export function pickBest(candidates, options = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const { stateNameNorm, admin1NameByKey, isStateCapital } = options;
  let pool = candidates;

  if (stateNameNorm && admin1NameByKey) {
    const filtered = pool.filter((candidate) => {
      const admin1Name = admin1NameByKey.get(
        `${candidate.iso}.${candidate.admin1}`,
      );
      if (!admin1Name) return false;
      const normalized = normalizePlaceName(admin1Name);
      return (
        normalized === stateNameNorm ||
        normalized.includes(stateNameNorm) ||
        stateNameNorm.includes(normalized)
      );
    });
    if (filtered.length > 0) pool = filtered;
  }

  if (isStateCapital) {
    const capitals = pool.filter(
      (candidate) => candidate.fcode === "PPLA" || candidate.fcode === "PPLC",
    );
    if (capitals.length > 0) pool = capitals;
  }

  let best = pool[0];
  for (const candidate of pool) {
    if (Number(candidate.pop) > Number(best.pop)) best = candidate;
  }
  return best || null;
}

export function matchCity(city, iso, index, admin1NameByKey) {
  if (!city || !iso || !index) return null;
  const byName = index.get(iso);
  if (!byName) return null;

  const cityName = city.cityName ?? city.name ?? "";
  const stateName = city.stateName ?? "";
  const stateNameNorm = normalizePlaceName(stateName);
  const isStateCapital =
    stateNameNorm !== "" && normalizePlaceName(cityName) === stateNameNorm;
  const variants = nameVariants(cityName);

  for (let i = 0; i < variants.length; i += 1) {
    const candidates = byName.get(variants[i]);
    if (!candidates || candidates.length === 0) continue;

    const best = pickBest(candidates, {
      stateNameNorm,
      admin1NameByKey,
      isStateCapital,
    });
    if (!best) continue;

    return {
      lat: best.lat,
      lon: best.lon,
      tz: best.tz,
      geonameId: best.id,
      matchedName: best.name,
      method: i === 0 ? "exact" : "variant",
    };
  }

  return null;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
