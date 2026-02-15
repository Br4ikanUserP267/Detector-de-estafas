(() => {
  const cityListEl = document.getElementById('cityList');
  const refreshButton = document.getElementById('refreshButton');
  const resetButton = document.getElementById('resetButton');
  const addServiceButton = document.getElementById('addService');
  const deleteButton = document.getElementById('deleteButton');
  const formTitle = document.getElementById('formTitle');
  const messageEl = document.getElementById('message');
  const cityForm = document.getElementById('cityForm');
  const serviceListEl = document.getElementById('serviceList');
  const paisInput = document.getElementById('pais');
  const metricCitiesEl = document.getElementById('metricCities');
  const metricAvgServicesEl = document.getElementById('metricAvgServices');
  const metricServicesEl = document.getElementById('metricServices');
  const metricTopCityEl = document.getElementById('metricTopCity');
  const metricLastSyncEl = document.getElementById('metricLastSync');
  const metricLatestUpdateEl = document.getElementById('metricLatestUpdate');
  const activityFeedEl = document.getElementById('activityFeed');
  const activityTimestampEl = document.getElementById('activityTimestamp');
  const statusChipEl = document.getElementById('statusChip');
  const statusPulseEl = document.getElementById('statusPulse');

  let cities = [];
  let activeCityId = null;

  const safeValue = (value) => {
    if (value === undefined || value === null) {
      return '';
    }
    return String(value).replace(/"/g, '&quot;');
  };

  const splitList = (input) => {
    if (!input) {
      return [];
    }
    return input
      .split(/[\n,]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  };

  const parseNumber = (value) => {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      throw new Error(`Valor numerico invalido: ${value}`);
    }
    return num;
  };

  const formatTime = (date) =>
    date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

  const formatMonthLabel = (value) => {
    if (!value || typeof value !== 'string') {
      return 'Sin datos';
    }
    const [year, month] = value.split('-').map(Number);
    if (!year || !month) {
      return value;
    }
    const date = new Date(Date.UTC(year, month - 1, 1));
    return new Intl.DateTimeFormat('es-CO', {
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const normalizeUpdateValue = (value) => {
    if (!value || typeof value !== 'string') {
      return null;
    }
    const [year, month] = value.split('-').map(Number);
    if (!year || !month) {
      return null;
    }
    return new Date(Date.UTC(year, month - 1, 1));
  };

  const setApiStatus = (status, label) => {
    if (!statusChipEl) {
      return;
    }
    statusChipEl.classList.remove('status-online', 'status-warning', 'status-down');
    statusChipEl.classList.add(`status-${status}`);
    statusChipEl.textContent = label;
    if (statusPulseEl) {
      statusPulseEl.textContent = formatTime(new Date());
    }
  };

  const setMessage = (text, type = 'info') => {
    if (!text) {
      messageEl.hidden = true;
      messageEl.textContent = '';
      messageEl.classList.remove('error');
      return;
    }
    messageEl.textContent = text;
    messageEl.hidden = false;
    messageEl.classList.toggle('error', type === 'error');
  };

  const getCityStatus = (city) => {
    const serviceCount = city.servicios_informales?.length || 0;
    if (!serviceCount) {
      return { label: 'Sin datos', tone: 'warning' };
    }
    if (city.nota_importante) {
      return { label: 'Alerta', tone: 'danger' };
    }
    return { label: 'Operativa', tone: 'ok' };
  };

  const updateDashboard = () => {
    if (!metricCitiesEl || !metricServicesEl || !metricLastSyncEl || !metricLatestUpdateEl) {
      return;
    }

    const totalCities = cities.length;
    const totalServices = cities.reduce(
      (acc, city) => acc + (city.servicios_informales?.length || 0),
      0
    );

    const average = totalCities ? (totalServices / totalCities).toFixed(1) : '0.0';
    const topCity = cities
      .slice()
      .sort((a, b) => (b.servicios_informales?.length || 0) - (a.servicios_informales?.length || 0))[0];

    const latestUpdate = cities
      .map((city) => normalizeUpdateValue(city.ultima_actualizacion_aproximada))
      .filter(Boolean)
      .sort((a, b) => b - a)[0];

    metricCitiesEl.textContent = totalCities;
    if (metricAvgServicesEl) {
      metricAvgServicesEl.textContent = `Promedio de servicios ${average}`;
    }
    metricServicesEl.textContent = totalServices;
    if (metricTopCityEl) {
      if (topCity && topCity.servicios_informales?.length) {
        const topLabel = topCity.pais ? `${topCity.ciudad}, ${topCity.pais}` : topCity.ciudad;
        metricTopCityEl.textContent = `${topLabel} lidera con ${topCity.servicios_informales.length}`;
      } else {
        metricTopCityEl.textContent = 'Sin ciudad destacada';
      }
    }

    metricLastSyncEl.textContent = formatTime(new Date());
    metricLatestUpdateEl.textContent = latestUpdate
      ? `Última actualización global ${new Intl.DateTimeFormat('es-CO', {
          month: 'short',
          year: 'numeric'
        }).format(latestUpdate)}`
      : 'Última actualización global sin datos';

    if (activityFeedEl && activityTimestampEl) {
      activityTimestampEl.textContent = `Actualizado ${formatTime(new Date())}`;
      const items = cities
        .slice()
        .sort((a, b) => {
          const aDate = normalizeUpdateValue(a.ultima_actualizacion_aproximada) || 0;
          const bDate = normalizeUpdateValue(b.ultima_actualizacion_aproximada) || 0;
          return bDate - aDate;
        })
        .slice(0, 6)
        .map((city) => {
          const serviceCount = city.servicios_informales?.length || 0;
          const updateLabel = formatMonthLabel(city.ultima_actualizacion_aproximada);
          const locationLabel = city.pais ? `${city.ciudad}, ${city.pais}` : city.ciudad;
          return `
            <li class="activity-item">
              <div>
                <strong>${locationLabel}</strong>
                <span>${serviceCount} servicios</span>
              </div>
              <span>${updateLabel}</span>
            </li>
          `;
        })
        .join('');
      activityFeedEl.innerHTML = items || '<li class="activity-item"><strong>Sin registros</strong><span>Cuando se creen ciudades aparecerán aquí</span></li>';
    }
  };

  const createServiceItem = (service = {}) => {
    const baja = service.temporada_baja || {};
    const alta = service.temporada_alta || {};

    const wrapper = document.createElement('div');
    wrapper.className = 'service-item';
    wrapper.innerHTML = `
      <div class="service-grid">
        <div class="field">
          <label>Categoria</label>
          <input name="categoria" type="text" value="${safeValue(service.categoria || '')}" required>
        </div>
        <div class="field">
          <label>Servicio</label>
          <input name="servicio" type="text" value="${safeValue(service.servicio || '')}" required>
        </div>
        <div class="field">
          <label>Precio minimo - temporada baja</label>
          <input name="bajaMin" type="number" min="0" value="${safeValue(baja.precio_min ?? '')}" required>
        </div>
        <div class="field">
          <label>Precio maximo - temporada baja</label>
          <input name="bajaMax" type="number" min="0" value="${safeValue(baja.precio_max ?? '')}" required>
        </div>
        <div class="field">
          <label>Precio minimo - temporada alta</label>
          <input name="altaMin" type="number" min="0" value="${safeValue(alta.precio_min ?? '')}" required>
        </div>
        <div class="field">
          <label>Precio maximo - temporada alta</label>
          <input name="altaMax" type="number" min="0" value="${safeValue(alta.precio_max ?? '')}" required>
        </div>
        <div class="field">
          <label>Unidad</label>
          <input name="unidad" type="text" value="${safeValue(service.unidad || '')}" required>
        </div>
        <div class="field">
          <label>Nota (opcional)</label>
          <input name="nota" type="text" value="${safeValue(service.nota || '')}">
        </div>
        <div class="field">
          <label>Negociable</label>
          <select name="negociable">
            <option value="true" ${service.negociable ? 'selected' : ''}>Si</option>
            <option value="false" ${service.negociable === false ? 'selected' : ''}>No</option>
          </select>
        </div>
      </div>
      <div class="service-actions">
        <button type="button" class="secondary remove-service">Quitar</button>
      </div>
    `;

    wrapper.querySelector('.remove-service').addEventListener('click', () => {
      wrapper.remove();
    });

    return wrapper;
  };

  const collectServices = () => {
    const items = Array.from(serviceListEl.querySelectorAll('.service-item'));
    if (items.length === 0) {
      throw new Error('Agrega al menos un servicio');
    }

    return items.map((item) => {
      const categoria = item.querySelector('input[name="categoria"]').value.trim();
      const servicio = item.querySelector('input[name="servicio"]').value.trim();
      const unidad = item.querySelector('input[name="unidad"]').value.trim();
      const nota = item.querySelector('input[name="nota"]').value.trim();

      if (!categoria || !servicio || !unidad) {
        throw new Error('Completa categoria, servicio y unidad');
      }

      const bajaMin = parseNumber(item.querySelector('input[name="bajaMin"]').value.trim());
      const bajaMax = parseNumber(item.querySelector('input[name="bajaMax"]').value.trim());
      const altaMin = parseNumber(item.querySelector('input[name="altaMin"]').value.trim());
      const altaMax = parseNumber(item.querySelector('input[name="altaMax"]').value.trim());

      if (bajaMin === null || bajaMax === null || altaMin === null || altaMax === null) {
        throw new Error('Completa todos los precios');
      }

      const negociableValue = item.querySelector('select[name="negociable"]').value;
      const negociable = negociableValue === 'true';

      const result = {
        categoria,
        servicio,
        temporada_baja: {
          precio_min: bajaMin,
          precio_max: bajaMax
        },
        temporada_alta: {
          precio_min: altaMin,
          precio_max: altaMax
        },
        unidad,
        negociable
      };

      if (nota) {
        result.nota = nota;
      }

      return result;
    });
  };

  const fillForm = (city) => {
    document.getElementById('cityId').value = city.id;
    document.getElementById('ciudad').value = city.ciudad || '';
    if (paisInput) {
      paisInput.value = city.pais || '';
    }
    document.getElementById('moneda').value = city.moneda || '';

    const alta = city.temporadas?.alta || {};
    const baja = city.temporadas?.baja || {};

    document.getElementById('altaMeses').value = (alta.meses_aproximados || []).join('\n');
    document.getElementById('altaFactor').value = alta.factor_incremento_promedio || '';
    document.getElementById('bajaMeses').value = (baja.meses_aproximados || []).join('\n');
    document.getElementById('bajaFactor').value = baja.factor_incremento_promedio || '';
    document.getElementById('ultimaActualizacion').value = city.ultima_actualizacion_aproximada || '';
    document.getElementById('notaImportante').value = city.nota_importante || '';

    serviceListEl.innerHTML = '';
    (city.servicios_informales || []).forEach((service) => {
      serviceListEl.appendChild(createServiceItem(service));
    });

    if (serviceListEl.children.length === 0) {
      serviceListEl.appendChild(createServiceItem());
    }

    formTitle.textContent = `Editando ${city.ciudad}`;
    deleteButton.disabled = false;
    activeCityId = city.id;
  };

  const resetForm = () => {
    cityForm.reset();
    document.getElementById('cityId').value = '';
    if (paisInput) {
      paisInput.value = '';
    }
    serviceListEl.innerHTML = '';
    serviceListEl.appendChild(createServiceItem());
    formTitle.textContent = 'Nueva ciudad';
    deleteButton.disabled = true;
    activeCityId = null;
    cityListEl.querySelectorAll('.city-card').forEach((card) => {
      card.classList.remove('active');
    });
  };

  const renderCities = () => {
    cityListEl.innerHTML = '';

    if (!cities.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Aun no hay ciudades cargadas.';
      cityListEl.appendChild(empty);
      return;
    }

    cities.forEach((city) => {
      const card = document.createElement('article');
      card.className = 'city-card';
      if (activeCityId && activeCityId === city.id) {
        card.classList.add('active');
      }

      const serviceCount = city.servicios_informales?.length || 0;
      const updated = city.ultima_actualizacion_aproximada || 'N/D';
      const status = getCityStatus(city);
      const updateLabel = formatMonthLabel(updated);
      const statusTagClass =
        status.tone === 'danger' ? 'tag danger' : status.tone === 'warning' ? 'tag warning' : 'tag';
      const locationLabel = city.pais ? `${city.ciudad}, ${city.pais}` : city.ciudad;

      card.innerHTML = `
        <div class="city-card__header">
          <h3>${locationLabel}</h3>
          <span class="${statusTagClass}">${status.label}</span>
        </div>
        <div class="city-card__meta">
          <span>${city.moneda}</span>
          <span>${serviceCount} servicios</span>
          <span>Actualizado ${updateLabel}</span>
        </div>
        <div class="badge">${city.id}</div>
      `;

      card.addEventListener('click', () => {
        cityListEl.querySelectorAll('.city-card').forEach((item) => item.classList.remove('active'));
        card.classList.add('active');
        fillForm(city);
      });

      cityListEl.appendChild(card);
    });
  };

  const fetchCities = async () => {
    try {
      setMessage('Cargando ciudades...');
      const response = await fetch('/api/cities');
      if (!response.ok) {
        throw new Error('No fue posible cargar las ciudades');
      }
      cities = await response.json();
      renderCities();
      setMessage(`Se cargaron ${cities.length} ciudades`);
      updateDashboard();
      setApiStatus('online', 'API Online');
    } catch (error) {
      setMessage(error.message, 'error');
      cities = [];
      renderCities();
      updateDashboard();
      setApiStatus('down', 'API fuera de servicio');
    }
  };

  const upsertCity = async (event) => {
    event.preventDefault();
    try {
      const servicios = collectServices();

      const payload = {
        ciudad: document.getElementById('ciudad').value.trim(),
        pais: paisInput ? paisInput.value.trim() : '',
        moneda: document.getElementById('moneda').value.trim(),
        temporadas: {
          alta: {
            meses_aproximados: splitList(document.getElementById('altaMeses').value),
            factor_incremento_promedio: document.getElementById('altaFactor').value.trim()
          },
          baja: {
            meses_aproximados: splitList(document.getElementById('bajaMeses').value),
            factor_incremento_promedio: document.getElementById('bajaFactor').value.trim()
          }
        },
        servicios_informales: servicios,
        nota_importante: document.getElementById('notaImportante').value.trim()
      };

      const ultima = document.getElementById('ultimaActualizacion').value;
      if (ultima) {
        payload.ultima_actualizacion_aproximada = ultima;
      }

      const hasAltaFactor = payload.temporadas.alta.factor_incremento_promedio;
      if (!hasAltaFactor) {
        delete payload.temporadas.alta.factor_incremento_promedio;
      }

      const hasBajaFactor = payload.temporadas.baja.factor_incremento_promedio;
      if (!hasBajaFactor) {
        delete payload.temporadas.baja.factor_incremento_promedio;
      }

      if (!payload.pais) {
        delete payload.pais;
      }

      const method = activeCityId ? 'PUT' : 'POST';
      const url = activeCityId ? `/api/cities/${activeCityId}` : '/api/cities';

      setMessage('Enviando datos...');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Error al guardar la ciudad');
      }

      const result = await response.json();
      setMessage(`Ciudad ${result.ciudad} guardada correctamente`);
      await fetchCities();
      fillForm(result);
    } catch (error) {
      setMessage(error.message, 'error');
    }
  };

  const deleteCity = async () => {
    if (!activeCityId) {
      return;
    }
    const confirmDelete = window.confirm('Confirma que deseas eliminar esta ciudad?');
    if (!confirmDelete) {
      return;
    }
    try {
      setMessage('Eliminando ciudad...');
      const response = await fetch(`/api/cities/${activeCityId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('No fue posible eliminar la ciudad');
      }
      setMessage('Ciudad eliminada');
      await fetchCities();
      resetForm();
    } catch (error) {
      setMessage(error.message, 'error');
    }
  };

  refreshButton.addEventListener('click', fetchCities);
  resetButton.addEventListener('click', () => {
    setMessage('Formulario limpio');
    resetForm();
  });
  addServiceButton.addEventListener('click', () => {
    serviceListEl.appendChild(createServiceItem());
  });
  deleteButton.addEventListener('click', deleteCity);
  cityForm.addEventListener('submit', upsertCity);

  resetForm();
  fetchCities();
})();
