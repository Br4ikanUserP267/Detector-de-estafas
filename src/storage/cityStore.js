const fs = require('fs/promises');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'cities.json');

const loadStore = async () => {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw);
};

const saveStore = async (payload) => {
  const raw = JSON.stringify(payload, null, 2);
  await fs.writeFile(DATA_FILE, raw, 'utf8');
};

const makeError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const slugify = (value) => {
  if (!value) {
    return '';
  }

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const normalizeId = (input) => slugify(input);

const validateCityPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw makeError(400, 'Payload invalido');
  }

  if (!payload.ciudad) {
    throw makeError(400, 'El campo "ciudad" es obligatorio');
  }

  if (!payload.moneda) {
    throw makeError(400, 'El campo "moneda" es obligatorio');
  }

  if (!Array.isArray(payload.servicios_informales)) {
    throw makeError(400, 'El campo "servicios_informales" debe ser una lista');
  }
};

const getCities = async () => {
  const store = await loadStore();
  return store.cities;
};

const getCity = async (idOrName) => {
  const targetId = normalizeId(idOrName);
  const store = await loadStore();

  return store.cities.find((city) => {
    const directMatch = city.id === targetId;
    const nameMatch = normalizeId(city.ciudad) === targetId;
    return directMatch || nameMatch;
  });
};

const createCity = async (payload) => {
  validateCityPayload(payload);

  const store = await loadStore();
  const cityId = slugify(payload.ciudad);

  const exists = store.cities.some((city) => city.id === cityId);
  if (exists) {
    throw makeError(409, 'La ciudad ya existe');
  }

  const now = new Date().toISOString().slice(0, 7);
  const newCity = {
    id: cityId,
    ultima_actualizacion_aproximada: payload.ultima_actualizacion_aproximada || now,
    ...payload
  };

  store.cities.push(newCity);
  await saveStore(store);

  return newCity;
};

const updateCity = async (idOrName, payload) => {
  if (!payload || typeof payload !== 'object') {
    throw makeError(400, 'Payload invalido');
  }

  const store = await loadStore();
  const targetId = normalizeId(idOrName);
  const index = store.cities.findIndex((city) => city.id === targetId || normalizeId(city.ciudad) === targetId);

  if (index === -1) {
    return null;
  }

  const current = store.cities[index];
  const merged = { ...current, ...payload };

  if (payload.ciudad) {
    const newId = slugify(payload.ciudad);
    if (newId && newId !== current.id) {
      const conflict = store.cities.some((city, i) => i !== index && city.id === newId);
      if (conflict) {
        throw makeError(409, 'Ya existe otra ciudad con ese nombre');
      }
      merged.id = newId;
    }
  }

  if (payload.servicios_informales) {
    if (!Array.isArray(payload.servicios_informales)) {
      throw makeError(400, 'El campo "servicios_informales" debe ser una lista');
    }
  }

  merged.ultima_actualizacion_aproximada = payload.ultima_actualizacion_aproximada || new Date().toISOString().slice(0, 7);

  store.cities[index] = merged;
  await saveStore(store);

  return merged;
};

const deleteCity = async (idOrName) => {
  const store = await loadStore();
  const targetId = normalizeId(idOrName);
  const nextCities = store.cities.filter((city) => city.id !== targetId && normalizeId(city.ciudad) !== targetId);

  if (nextCities.length === store.cities.length) {
    return false;
  }

  await saveStore({ cities: nextCities });
  return true;
};

module.exports = {
  getCities,
  getCity,
  createCity,
  updateCity,
  deleteCity
};
