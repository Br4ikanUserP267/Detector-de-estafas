const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const cityStore = require('./storage/cityStore');

const app = express();
const PORT = process.env.PORT || 3000;

const corsConfig = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length'],
  optionsSuccessStatus: 204
};

const swaggerDefinition = {
  openapi: '3.0.1',
  info: {
    title: 'API monitoreo de precios',
    version: '1.0.0',
    description: 'Documentación para consultar y administrar precios informales por ciudad.'
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Entorno local'
    }
  ],
  tags: [
    { name: 'Health', description: 'Estado del servicio' },
    { name: 'Cities', description: 'Gestión de ciudades y sus servicios informales' }
  ],
  components: {
    schemas: {
      PriceWindow: {
        type: 'object',
        properties: {
          precio_min: { type: 'number', example: 50000 },
          precio_max: { type: 'number', example: 120000 }
        }
      },
      Season: {
        type: 'object',
        properties: {
          meses_aproximados: {
            type: 'array',
            items: { type: 'string', example: 'diciembre' }
          },
          factor_incremento_promedio: {
            type: 'string',
            example: '20% sobre temporada baja'
          }
        }
      },
      Service: {
        type: 'object',
        required: ['categoria', 'servicio', 'unidad', 'temporada_baja', 'temporada_alta'],
        properties: {
          categoria: { type: 'string', example: 'Transporte' },
          servicio: { type: 'string', example: 'Taxi aeropuerto' },
          unidad: { type: 'string', example: 'Trayecto' },
          negociable: { type: 'boolean', default: true },
          nota: { type: 'string', example: 'Recargos nocturnos aplican' },
          temporada_baja: { $ref: '#/components/schemas/PriceWindow' },
          temporada_alta: { $ref: '#/components/schemas/PriceWindow' }
        }
      },
      City: {
        type: 'object',
        required: ['ciudad', 'moneda', 'servicios_informales'],
        properties: {
          id: { type: 'string', example: 'cartagena' },
          ciudad: { type: 'string', example: 'Cartagena' },
          pais: { type: 'string', example: 'Colombia' },
          moneda: { type: 'string', example: 'COP' },
          ultima_actualizacion_aproximada: { type: 'string', example: '2024-12' },
          nota_importante: { type: 'string', example: 'Incremento inusual por temporada alta.' },
          temporadas: {
            type: 'object',
            properties: {
              alta: { $ref: '#/components/schemas/Season' },
              baja: { $ref: '#/components/schemas/Season' }
            }
          },
          servicios_informales: {
            type: 'array',
            items: { $ref: '#/components/schemas/Service' }
          }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Verifica la disponibilidad de la API',
        responses: {
          200: {
            description: 'Servicio saludable',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/cities': {
      get: {
        tags: ['Cities'],
        summary: 'Lista todas las ciudades registradas',
        responses: {
          200: {
            description: 'Listado de ciudades',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/City' }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Cities'],
        summary: 'Crea una ciudad con sus servicios',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/City' }
            }
          }
        },
        responses: {
          201: {
            description: 'Ciudad creada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/City' }
              }
            }
          },
          400: {
            description: 'Datos inválidos'
          }
        }
      }
    },
    '/api/cities/{id}': {
      get: {
        tags: ['Cities'],
        summary: 'Obtiene una ciudad por identificador',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Ciudad encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/City' }
              }
            }
          },
          404: { description: 'Ciudad no encontrada' }
        }
      },
      put: {
        tags: ['Cities'],
        summary: 'Actualiza una ciudad existente',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/City' }
            }
          }
        },
        responses: {
          200: {
            description: 'Ciudad actualizada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/City' }
              }
            }
          },
          404: { description: 'Ciudad no encontrada' }
        }
      },
      delete: {
        tags: ['Cities'],
        summary: 'Elimina una ciudad',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          204: { description: 'Ciudad eliminada' },
          404: { description: 'Ciudad no encontrada' }
        }
      }
    }
  }
};

const swaggerSpec = swaggerJsdoc({ definition: swaggerDefinition, apis: [] });

app.use(cors(corsConfig));
app.options('*', cors(corsConfig));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/api/docs.json', (req, res) => {
  res.json(swaggerSpec);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/cities', async (req, res, next) => {
  try {
    const cities = await cityStore.getCities();
    res.json(cities);
  } catch (error) {
    next(error);
  }
});

app.get('/api/cities/:id', async (req, res, next) => {
  try {
    const city = await cityStore.getCity(req.params.id);

    if (!city) {
      res.status(404).json({ message: 'Ciudad no encontrada' });
      return;
    }

    res.json(city);
  } catch (error) {
    next(error);
  }
});

app.post('/api/cities', async (req, res, next) => {
  try {
    const created = await cityStore.createCity(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.put('/api/cities/:id', async (req, res, next) => {
  try {
    const updated = await cityStore.updateCity(req.params.id, req.body);

    if (!updated) {
      res.status(404).json({ message: 'Ciudad no encontrada' });
      return;
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/cities/:id', async (req, res, next) => {
  try {
    const removed = await cityStore.deleteCity(req.params.id);

    if (!removed) {
      res.status(404).json({ message: 'Ciudad no encontrada' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
