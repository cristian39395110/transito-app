require("dotenv").config();

const express = require("express");
const cors = require("cors");

const {
  sequelize,
} = require("./models");

const {
  inicializarSistema,
} = require(
  "./services/inicializacionService"
);

const authRoutes = require(
  "./routes/authRoutes"
);
const path = require("path");

const usuarioRoutes = require(
  "./routes/usuarioRoutes"
);

const reclamoRoutes = require(
  "./routes/reclamoRoutes"
);

const tipoReclamoRoutes = require(
  "./routes/tipoReclamoRoutes"
);

const asignacionRoutes = require(
  "./routes/asignacionRoutes"
);

const actuacionRoutes = require(
  "./routes/actuacionRoutes"
);

const emplazamientoRoutes = require(
  "./routes/emplazamientoRoutes"
);

const verificacionRoutes = require(
  "./routes/verificacionRoutes"
);

const remocionRoutes = require(
  "./routes/remocionRoutes"
);

const predioRoutes = require(
  "./routes/predioRoutes"
);

const fotoRoutes = require(
  "./routes/fotoRoutes"
);

const visitaRoutes =
  require(
    "./routes/visitaRoutes"
  );


  const seguimientoReclamoRoutes =
  require(
    "./routes/seguimientoReclamoRoutes"
  );



  const infraccionRoutes =
  require("./routes/infraccionRoutes");

const juzgadoRoutes =
  require("./routes/juzgadoRoutes");
  const notificacionRoutes =
  require(
    "./routes/notificacionRoutes"
  );

  const expedienteRoutes =
  require(
    "./routes/expedienteRoutes"
  );



/*
|--------------------------------------------------------------------------
| COMIENZO
|--------------------------------------------------------------------------
*/


const app = express();


/*
|--------------------------------------------------------------------------
| MIDDLEWARES
|--------------------------------------------------------------------------
*/

app.use(cors());

app.use(
  express.json({
    limit: "2mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  })
);
/*
|--------------------------------------------------------------------------
| ARCHIVOS PÚBLICOS
|--------------------------------------------------------------------------
*/

app.use(
  "/uploads",
  express.static(
    path.join(
      __dirname,
      "uploads"
    )
  )
);
/*
|--------------------------------------------------------------------------
| RUTAS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/usuarios",
  usuarioRoutes
);

app.use(
  "/api/reclamos",
  reclamoRoutes
);

app.use(
  "/api/tipos-reclamo",
  tipoReclamoRoutes
);
app.use(
  "/api/seguimiento-reclamo",
  seguimientoReclamoRoutes
);
app.use(
  "/api/asignaciones",
  asignacionRoutes
);

app.use(
  "/api/actuaciones",
  actuacionRoutes
);

app.use(
  "/api/emplazamientos",
  emplazamientoRoutes
);
app.use(
  "/api/visitas",
  visitaRoutes
);
app.use(
  "/api/verificaciones",
  verificacionRoutes
);

app.use(
  "/api/remociones",
  remocionRoutes
);

app.use(
  "/api/fotos",
  fotoRoutes
);

app.use(
  "/api/predios",
  predioRoutes
);

app.use(
  "/api/infracciones",
  infraccionRoutes
);

app.use(
  "/api/juzgado",
  juzgadoRoutes
);

app.use(
  "/api/notificaciones",
  notificacionRoutes
);
app.use(
  "/api/expedientes",
  expedienteRoutes
);

/*
|--------------------------------------------------------------------------
| HEALTH
|--------------------------------------------------------------------------
*/

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      ok: true,
      mensaje:
        "API Sistema de Tránsito funcionando",
    });
  }
);

/*
|--------------------------------------------------------------------------
| RUTA NO ENCONTRADA
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {
    return res.status(404).json({
      ok: false,
      mensaje:
        "Ruta no encontrada",
    });
  }
);

/*
|--------------------------------------------------------------------------
| INICIO
|--------------------------------------------------------------------------
*/

const PORT =
  process.env.PORT || 3001;

const iniciarServidor =
  async () => {
    try {
      await sequelize.authenticate();

      console.log(
        "MySQL conectado correctamente"
      );

   await sequelize.sync({ alter: false });
      console.log(
        "Modelos sincronizados"
      );

      await inicializarSistema();

      console.log(
        "Sistema inicializado"
      );

      app.listen(
        PORT,
        () => {
          console.log(
            `Servidor funcionando en http://localhost:${PORT}`
          );
        }
      );
    } catch (error) {
      console.error(
        "Error iniciando servidor:"
      );

      console.error(error);

      process.exit(1);
    }
  };

iniciarServidor();