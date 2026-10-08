    import {
      useEffect,
      useMemo,
      useState,
    } from "react";
    import {
      useNavigate,
      useParams,
    } from "react-router-dom";
    import api from "../api/api";
    import FotosReclamo from "../components/FotosReclamo";
    import {  
    MapContainer,
    Marker,
    Popup,
    TileLayer,} from "react-leaflet";
  import "leaflet/dist/leaflet.css";
  import L from "leaflet";
    import "./SegundaVisitaPage.css";
    const formatearFecha = (fecha) => {
      if (!fecha) {
        return "—";
      }
      return new Date(
        fecha

      ).toLocaleString(
        "es-AR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    };
  const nombreResultado = (
    resultado
  ) => {
    const nombres = {
      CUMPLIDO:
        "Ya está solucionado",
      PRORROGA:
        "Se otorgó más plazo",
      NO_CUMPLIDO:
        "No cumplió — Acta de Infracción",
      NO_SE_ENCUENTRA:
        "No se encontró la situación",
      NO_SE_PUDO_VERIFICAR:
        "No se pudo verificar",
      PARCIAL:
        "Cumplimiento parcial",
      OTRO:
        "Otro resultado",
    };
    return (
      nombres[resultado] ||
      resultado ||
      "Control realizado"
    );};
    const SegundaVisitaPage = () => {
      const { id } =
        useParams();
      const navigate =
        useNavigate();
      /*
      |--------------------------------------------------------------------------
      | DATOS

      |--------------------------------------------------------------------------
      */
      const [
        reclamo,
        setReclamo,
      ] = useState(null);
      const [
        seguimiento,
        setSeguimiento,
      ] = useState({
        visitas: [],
        verificaciones: [],
        actas: [],
        emplazamientos: [],
        infracciones: [],
      });
      const [
        cargando,
        setCargando,
      ] = useState(true);


  const [
    controlRegistrado,
    setControlRegistrado,
  ] = useState(null);

  const [
    datosSegundaVisita,
    setDatosSegundaVisita,
  ] = useState(null);

  const [
    controlesRegistrados,
    setControlesRegistrados,
  ] = useState([]);

  const [
    controlEditando,
    setControlEditando,
  ] = useState(null);

      const [
        puedeEditarControl,
        setPuedeEditarControl,
      ] = useState(false);
      const [
        minutosEdicion,
        setMinutosEdicion,
      ] = useState(0);
      const [
        editandoControl,
        setEditandoControl,
      ] = useState(false);
      const [
        guardando,
        setGuardando,
      ] = useState(false);
      const [
        error,
        setError,
      ] = useState("");
      /*
      |--------------------------------------------------------------------------
      | CONTROL

      |--------------------------------------------------------------------------
      */
      const [
        resultado,
        setResultado,
      ] = useState("");
      const [
        situacion,
        setSituacion,
      ] = useState("");
      const [
        observaciones,
        setObservaciones,
      ] = useState("");
      /*|--------------------------------------------------------------------------| EMPLAZAMIENTO QUE SE ESTÁ CONTROLANDO
  |--------------------------------------------------------------------------*/
  const [
    emplazamientoSeleccionadoId,
    setEmplazamientoSeleccionadoId,] = useState("");
      /*
      |--------------------------------------------------------------------------
      | PRÓRROGA

      |--------------------------------------------------------------------------
      */
      const [
        plazoCantidad,
        setPlazoCantidad,
      ] = useState(24);
      const [
        plazoUnidad,
        setPlazoUnidad,
      ] = useState("HORAS");
      const [
        motivoProrroga,
        setMotivoProrroga,
      ] = useState("");
      /*
      |--------------------------------------------------------------------------
      | INFRACCIÓN

      |--------------------------------------------------------------------------
      */
          const [
        cantidadFotosInfraccion,
        setCantidadFotosInfraccion,
      ] = useState(0);
      const [
        numeroActa,
        setNumeroActa,
      ] = useState("");
      const [
        motivoInfraccion,
        setMotivoInfraccion,
      ] = useState("");
      const [
        personaEncontrada,
        setPersonaEncontrada,
      ] = useState(false);
      const [
        apellido,
        setApellido,
      ] = useState("");
      const [
        nombre,
        setNombre,
      ] = useState("");
      const [
        dni,
        setDni,
      ] = useState("");
      const [
        domicilio,
        setDomicilio,
      ] = useState("");
      const [
        accionPosterior,
        setAccionPosterior,
      ] = useState("");
      const [
        detalleAccionPosterior,
        setDetalleAccionPosterior,
      ] = useState("");
      /*
      |--------------------------------------------------------------------------
      | CARGAR

      |--------------------------------------------------------------------------
      */
      useEffect(() => {
        const cargar =
          async () => {
            try {
              setCargando(true);
              setError("");
              const [
                respuestaReclamo,
                respuestaSeguimiento,
                respuestaControl,
              ] =
                await Promise.all([
                  api.get(
                    `/reclamos/${id}`
                  ),
                  api.get(
                    `/seguimiento-reclamo/${id}`
                  ),
                  api.get(
                    `/verificaciones/segunda-visita/${id}`
                  ),
                ]);
              const datosReclamo =
                respuestaReclamo.data

                  ?.reclamo ||
                respuestaReclamo.data;
              const datosSeguimiento =
                respuestaSeguimiento

                  .data || {};
              setReclamo(
                datosReclamo

              );
              setSeguimiento({
                visitas:
                  datosSeguimiento

                    .visitas ||
                  datosSeguimiento

                    .constataciones ||
                  [],
                verificaciones:
                  datosSeguimiento

                    .verificaciones ||
                  [],
                actas:
                  datosSeguimiento

                    .actas ||
                  [],
                emplazamientos:
                  datosSeguimiento

                    .emplazamientos ||
                  [],
                infracciones:
                  datosSeguimiento

                    .infracciones ||
                  [],
              });
           const datosControl =
    respuestaControl.data || {};

  // Guardamos SIEMPRE la respuesta.
  // Aunque todavía no haya un control realizado,
  // acá vienen los emplazamientos pendientes.
  setDatosSegundaVisita(
    datosControl
  );

  const controles =
    Array.isArray(
      datosControl.controles
    )
      ? datosControl.controles
      : datosControl.realizada
        ? [
            {
              verificacion:
                datosControl.verificacion,
              infraccion:
                datosControl.infraccion,
              nuevoEmplazamiento:
                datosControl.nuevoEmplazamiento,
              emplazamientoControlado:
                datosControl.emplazamientoControlado,
              vehiculoControlado:
                datosControl.vehiculoControlado,
              puedeEditar:
                datosControl.puedeEditar,
              minutosRestantes:
                datosControl.minutosRestantes,
            },
          ]
        : [];

  setControlesRegistrados(
    controles
  );

  if (datosControl.realizada) {
    setControlRegistrado(
      datosControl
    );

    setPuedeEditarControl(
      Boolean(
        datosControl.puedeEditar
      )
    );

    setMinutosEdicion(
      Number(
        datosControl
          .minutosRestantes || 0
      )
    );
  } else {
    setControlRegistrado(
      null
    );

    setPuedeEditarControl(
      false
    );

    setMinutosEdicion(0);
  }
            } catch (err) {
              console.error(
                "Error cargando control:",
                err

              );
              setError(
                err.response?.data

                  ?.mensaje ||
                "No se pudo cargar el control."
              );
            } finally {
              setCargando(false);
            }
          };
        cargar();
      }, [id]);
      /*
      |--------------------------------------------------------------------------
      | HELPERS DE ANTECEDENTES

      |--------------------------------------------------------------------------
      */
      const tipo =
        reclamo?.tipoReclamo ||
        reclamo?.TipoReclamo;
      const esVehiculo =
        useMemo(() => {
          const texto =
            (
              tipo?.nombre ||
              ""
            )
              .toLowerCase()
              .normalize("NFD")
              .replace(
                /[\u0300-\u036f]/g,
                ""
              );
          return (
            texto.includes(
              "vehiculo"
            ) ||
            texto.includes(
              "auto"
            ) ||
            texto.includes(
              "automotor"
            )
          );
        }, [tipo]);
      const visitasOrdenadas =
        useMemo(() => {
          return [
            ...seguimiento.visitas,
          ].sort(
            (a, b) =>
              Number(a.id) -
              Number(b.id)
          );
        }, [
          seguimiento.visitas,
        ]);
      const verificacionesOrdenadas =
        useMemo(() => {
          return [
            ...seguimiento

              .verificaciones,
          ].sort(
            (a, b) =>
              Number(a.id) -
              Number(b.id)
          );
        }, [
          seguimiento.verificaciones,
        ]);
      const emplazamientosOrdenados =
        useMemo(() => {
          return [
            ...seguimiento

              .emplazamientos,
          ].sort(
            (a, b) =>
              Number(a.id) -
              Number(b.id)
          );
        }, [
          seguimiento.emplazamientos,
        ]);


  const historialPlazosPorVehiculo =
    useMemo(() => {
      const grupos = [];

      emplazamientosOrdenados.forEach(
        (emplazamiento) => {
          /*
          * Intentamos obtener el vehículo directamente.
          */
          let vehiculo =
            emplazamiento.vehiculo ||
            emplazamiento.Vehiculo ||
            null;

          let vehiculoId =
            emplazamiento.vehiculoId ||
            vehiculo?.id ||
            null;

          /*
          * Si es una prórroga y no trae vehiculoId,
          * seguimos hacia atrás por la cadena
          * de emplazamientos.
          */
          if (
            !vehiculoId &&
            emplazamiento.emplazamientoAnteriorId
          ) {
            let actual = emplazamiento;

            const visitados =
              new Set();

            while (
              actual?.emplazamientoAnteriorId &&
              !visitados.has(actual.id)
            ) {
              visitados.add(
                actual.id
              );

              const anterior =
                emplazamientosOrdenados.find(
                  (item) =>
                    Number(item.id) ===
                    Number(
                      actual
                        .emplazamientoAnteriorId
                    )
                );

              if (!anterior) {
                break;
              }

              actual = anterior;

              if (
                anterior.vehiculoId ||
                anterior.vehiculo?.id ||
                anterior.Vehiculo?.id
              ) {
                vehiculo =
                  anterior.vehiculo ||
                  anterior.Vehiculo ||
                  null;

                vehiculoId =
                  anterior.vehiculoId ||
                  vehiculo?.id ||
                  null;

                break;
              }
            }
          }

          /*
          * También buscamos el vehículo dentro
          * de los pendientes, porque esos objetos
          * ya vienen completos desde el backend.
          */
          if (
            vehiculoId &&
            !vehiculo
          ) {
            const pendiente =
              datosSegundaVisita
                ?.emplazamientosPendientes
                ?.find(
                  (item) =>
                    Number(
                      item.vehiculoId ||
                      item.vehiculo?.id
                    ) ===
                    Number(vehiculoId)
                );

            vehiculo =
              pendiente?.vehiculo ||
              null;
          }

          const clave =
            vehiculoId
              ? `vehiculo-${vehiculoId}`
              : `emplazamiento-${emplazamiento.id}`;

          let grupo =
            grupos.find(
              (item) =>
                item.clave === clave
            );

          if (!grupo) {
            grupo = {
              clave,
              vehiculoId,
              vehiculo,
              emplazamientos: [],
            };

            grupos.push(grupo);
          }

          grupo.emplazamientos.push(
            emplazamiento
          );
        }
      );

      return grupos;
    }, [
      emplazamientosOrdenados,
      datosSegundaVisita,
    ]);


      const primeraVisita =
        visitasOrdenadas[0] ||
        null;
      const ultimaVerificacion =
        verificacionesOrdenadas

          .length

          ? verificacionesOrdenadas[
              verificacionesOrdenadas

                .length - 1

            ]
          : null;
      const ultimoEmplazamiento =
        emplazamientosOrdenados

          .length

          ? emplazamientosOrdenados[
              emplazamientosOrdenados

                .length - 1

            ]
          : null;
      const actaViaPublica =
        useMemo(() => {
          const actas =
            seguimiento.actas

              .filter(
                (acta) =>
                  acta.tipo ===
                  "VIA_PUBLICA"
              )
              .sort(
                (a, b) =>
                  Number(b.id) -
                  Number(a.id)
              );
          return (
            actas[0] ||
            null

          );
        }, [
          seguimiento.actas,
        ]);
        /*|--------------------------------------------------------------------------|
  EMPLAZAMIENTOS DISPONIBLES PARA ESTE CONTROL
  |--------------------------------------------------------------------------*/


  const emplazamientosControl =
    useMemo(() => {
      /*
      |--------------------------------------------------------------------------
      | EDICIÓN DE UN CONTROL YA REALIZADO
      |--------------------------------------------------------------------------
      */

      if (editandoControl) {
        if (
          controlEditando
            ?.emplazamientoControlado
        ) {
          return [
            controlEditando
              .emplazamientoControlado,
          ];
        }

        return [];
      }

      /*
      |--------------------------------------------------------------------------
      | EMPLAZAMIENTOS QUE REALMENTE CORRESPONDE CONTROLAR
      |--------------------------------------------------------------------------
      |
      | Esta lista viene filtrada desde el backend.
      |
      | No aparecen:
      | - cumplidos;
      | - cancelados;
      | - vehículos removidos;
      | - vehículos pendientes de predio;
      | - vehículos en predio;
      | - vehículos egresados;
      | - emplazamientos viejos que ya tuvieron prórroga;
      | - plazos que todavía no vencieron.
      |
      */

      if (
        Array.isArray(
          datosSegundaVisita
            ?.emplazamientosPendientes
        )
      ) {
        return [
          ...datosSegundaVisita
            .emplazamientosPendientes,
        ].sort(
          (a, b) =>
            Number(a.id) -
            Number(b.id)
        );
      }

      return [];
    }, [
      datosSegundaVisita,
      controlEditando,
      editandoControl,
    ]);
  const tareaFinalizada =
    controlRegistrado
      ?.tareaFinalizada ??
    Boolean(
      controlRegistrado
        ?.realizada &&
      !controlRegistrado
        ?.puedeContinuarControlando
    );/*|--------------------------------------------------------------------------| EMPLAZAMIENTO SELECCIONADO
  |--------------------------------------------------------------------------*/
  const emplazamientoSeleccionado = useMemo(() => {
    if (editandoControl && controlEditando?.emplazamientoControlado) {
      return controlEditando.emplazamientoControlado;
    }

    return (
      emplazamientosControl.find(
        (item) =>
          Number(item.id) ===
          Number(emplazamientoSeleccionadoId)
      ) || null
    );
  }, [
    editandoControl,
    controlEditando,
    emplazamientosControl,
    emplazamientoSeleccionadoId,
  ]);

  const vehiculoSeleccionado = useMemo(() => {
    if (editandoControl && controlEditando?.vehiculoControlado) {
      return controlEditando.vehiculoControlado;
    }

    return emplazamientoSeleccionado?.vehiculo || null;
  }, [
    editandoControl,
    controlEditando,
    emplazamientoSeleccionado,
  ]);/*|--------------------------------------------------------------------------| ACTA DE VÍA PÚBLICA DEL EMPLAZAMIENTO
  |--------------------------------------------------------------------------*/
  const actaSeleccionada =
    useMemo(() => {
      if (
        !emplazamientoSeleccionado

      ) {
        return null;
      }
      return (
        seguimiento.actas.find(
          (acta) =>
            Number(acta.id) ===
            Number(
              emplazamientoSeleccionado

                .actaId

            )
        ) || null

      );
    }, [
      emplazamientoSeleccionado,
      seguimiento.actas,
    ]);



  const emplazamientoFotoActa =
    useMemo(() => {
      if (!emplazamientoSeleccionado) {
        return null;
      }

      let actual =
        emplazamientoSeleccionado;

      const visitados =
        new Set();

      while (
        actual?.emplazamientoAnteriorId &&
        !visitados.has(actual.id)
      ) {
        visitados.add(actual.id);

        const anterior =
          emplazamientosOrdenados.find(
            (item) =>
              Number(item.id) ===
              Number(
                actual.emplazamientoAnteriorId
              )
          );

        if (!anterior) {
          break;
        }

        actual = anterior;
      }

      return actual;
    }, [
      emplazamientoSeleccionado,
      emplazamientosOrdenados,
    ]);


        const latitudReclamo =
    Number(
      reclamo?.latitudDenunciada

    );
  const longitudReclamo =
    Number(
      reclamo?.longitudDenunciada

    );
  const tieneUbicacionReclamo =
    Number.isFinite(
      latitudReclamo

    ) &&
    Number.isFinite(
      longitudReclamo

    ) &&
    latitudReclamo !== 0 &&
    longitudReclamo !== 0;
      const descripcionOriginal =
        reclamo?.observaciones ||
        reclamo?.descripcion ||
        reclamo

          ?.ubicacionDescripcion ||
        primeraVisita?.situacion ||
        "Sin descripción adicional";
      const situacionAnterior =
        ultimaVerificacion

          ?.situacion ||
        primeraVisita

          ?.situacion ||
        actaViaPublica

          ?.situacion ||
        "No hay una descripción anterior registrada.";
            /*
      |--------------------------------------------------------------------------
      | EDITAR CONTROL REGISTRADO

      |--------------------------------------------------------------------------
      */
   const comenzarEdicion = (
    control = null
  ) => {
    const seleccionado =
      control ||
      controlRegistrado;

    if (
      !seleccionado
        ?.verificacion
    ) {
      return;
    }

    const puedeEditar =
      control
        ? Boolean(
            control.puedeEditar
          )
        : puedeEditarControl;

    if (!puedeEditar) {
      return;
    }

    setControlEditando(
      seleccionado
    );

    const verificacion =
      seleccionado.verificacion;

    const infraccion =
      seleccionado.infraccion;

    const emplazamientoOriginal =
      seleccionado
        .emplazamientoControlado;

    if (
      emplazamientoOriginal?.id
    ) {
      setEmplazamientoSeleccionadoId(
        String(
          emplazamientoOriginal.id
        )
      );
    }

    setResultado(
      verificacion.resultado || ""
    );

    setSituacion(
      verificacion.situacion || ""
    );

    setObservaciones(
      verificacion.observaciones ||
        ""
    );

    if (infraccion) {
      setNumeroActa(
        infraccion.numeroActa || ""
      );

      setMotivoInfraccion(
        infraccion.motivo || ""
      );

      setPersonaEncontrada(
        Boolean(
          infraccion
            .personaEncontrada
        )
      );

      setApellido(
        infraccion
          .apellidoInfractor || ""
      );

      setNombre(
        infraccion
          .nombreInfractor || ""
      );

      setDni(
        infraccion
          .dniInfractor || ""
      );

      setDomicilio(
        infraccion
          .domicilioInfractor || ""
      );

      setAccionPosterior(
        infraccion
          .accionPosterior || ""
      );

      setDetalleAccionPosterior(
        infraccion
          .detalleAccionPosterior ||
          ""
      );
    }

    setPuedeEditarControl(
      Boolean(
        seleccionado.puedeEditar ??
          puedeEditarControl
      )
    );

    setMinutosEdicion(
      Number(
        seleccionado
          .minutosRestantes ??
          minutosEdicion
      )
    );

    setEditandoControl(true);
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
      const guardarEdicion =
        async () => {
          if (
            !situacion.trim()
          ) {
            setError(
              "Describí qué encontraste."
            );
            return;
          }
          try {
            setGuardando(true);
            setError("");
          const payload = {
    verificacionId:
      controlEditando
        ?.verificacion
        ?.id ||
      controlRegistrado
        ?.verificacion
        ?.id,

    situacion:
      situacion.trim(),
              observaciones:
                observaciones

                  .trim() ||
                null,
            };
          if (
    controlEditando
      ?.infraccion
  ) {
              payload.motivoInfraccion =
                motivoInfraccion

                  .trim();
            payload.observacionesInfraccion =
    controlEditando
      ?.infraccion
      ?.observaciones ||
    null;
              payload.personaEncontrada =
                personaEncontrada;
              payload.apellidoInfractor =
                personaEncontrada

                  ? apellido.trim() ||
                    null

                  : null;
              payload.nombreInfractor =
                personaEncontrada

                  ? nombre.trim() ||
                    null

                  : null;
              payload.dniInfractor =
                personaEncontrada

                  ? dni.trim() ||
                    null

                  : null;
              payload.domicilioInfractor =
                personaEncontrada

                  ? domicilio.trim() ||
                    null

                  : null;
            }
            await api.put(
              `/verificaciones/segunda-visita/${id}`,
              payload

            );
            const respuesta =
              await api.get(
                `/verificaciones/segunda-visita/${id}`
              );
            const datos =
    respuesta.data || {};

  setControlRegistrado(
    datos.realizada
      ? datos
      : null
  );

  setControlesRegistrados(
    Array.isArray(datos.controles)
      ? datos.controles
      : datos.realizada &&
          datos.verificacion
        ? [
            {
              verificacion:
                datos.verificacion,
              infraccion:
                datos.infraccion,
              nuevoEmplazamiento:
                datos.nuevoEmplazamiento,
              emplazamientoControlado:
                datos.emplazamientoControlado,
              vehiculoControlado:
                datos.vehiculoControlado,
              puedeEditar:
                datos.puedeEditar,
              minutosRestantes:
                datos.minutosRestantes,
            },
          ]
        : []
  );

  setControlEditando(null);
  setPuedeEditarControl(false);
  setMinutosEdicion(0);
            setEditandoControl(false);
            alert(
              "Control corregido correctamente."
            );
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          } catch (err) {
            console.error(
              "Error editando control:",
              err

            );
            setError(
              err.response?.data

                ?.mensaje ||
                "No se pudo corregir el control."
            );
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          } finally {
            setGuardando(false);
          }
        };
      /*
      |--------------------------------------------------------------------------
      | RESULTADO

      |--------------------------------------------------------------------------
      */
      const elegir = (
        valor

      ) => {
        setResultado(valor);
        setError("");
        if (
          valor !==
          "PRORROGA"
        ) {
          setMotivoProrroga(
            ""
          );
        }
        if (
          valor !==
          "NO_CUMPLIDO"
        ) {
          setNumeroActa("");
          setMotivoInfraccion("");
          setAccionPosterior("");
          setDetalleAccionPosterior(
            ""
          );
        }
      };
      /*
      |--------------------------------------------------------------------------
      | VALIDACIÓN

      |--------------------------------------------------------------------------
      */
      const validar = () => {
        if (
    !editandoControl &&
    !emplazamientoSeleccionadoId
  ) {
    return (
      "Seleccioná qué emplazamiento estás controlando."
    );}
        if (!resultado) {
          return (
            "Indicá qué pasó en este control."
          );
        }
        if (
          !situacion.trim()
        ) {
          return (
            "Describí qué encontraste."
          );
        }
        if (
          resultado ===
          "PRORROGA"
        ) {
          if (
            !Number(
              plazoCantidad

            ) ||
            Number(
              plazoCantidad

            ) <= 0

          ) {
            return (
              "Ingresá el nuevo plazo."
            );
          }
          if (
            !motivoProrroga

              .trim()
          ) {
            return (
              "Indicá por qué se otorga más plazo."
            );
          }
        }
        if (
          resultado ===
          "NO_CUMPLIDO"
        ) {
          if (
            !numeroActa.trim()
          ) {
            return (
              "Ingresá el número del Acta de Infracción."
            );
          }
          if (
            !motivoInfraccion

              .trim()
          ) {
            return (
              "Indicá el motivo de la infracción."
            );
          }
          if (
    cantidadFotosInfraccion < 1
  ) {
    return (
      "Sacá una foto del Acta de Infracción."
    );}
   if (
    esVehiculo &&
    ![
      "RETIRO_INMEDIATO",
      "BUSQUEDA_REMOCION",
    ].includes(
      accionPosterior

    )) {
    return (
      "Indicá si el vehículo pudo retirarse."
    );}
  if (
    esVehiculo &&
    accionPosterior ===
      "BUSQUEDA_REMOCION" &&
    !detalleAccionPosterior.trim()) {
    return (
      "Contá brevemente qué ocurrió y por qué no se pudo retirar el vehículo."
    );}
        }
        return "";
      };
      /*
      |--------------------------------------------------------------------------
      | FINALIZAR

      |--------------------------------------------------------------------------
      */
      const finalizar =
        async () => {
          const mensaje =
            validar();
          if (mensaje) {
            setError(mensaje);
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
            return;
          }
          try {
            setGuardando(true);
            setError("");
        const payload = {
    emplazamientoId:
      Number(
        emplazamientoSeleccionadoId

      ),
    resultado,
    situacion:
      situacion.trim(),
    observaciones:
      observaciones

        .trim() ||
      null,};
            if (
              resultado ===
              "PRORROGA"
            ) {
              payload.plazoCantidad =
                Number(
                  plazoCantidad

                );
              payload.plazoUnidad =
                plazoUnidad;
              payload.motivoProrroga =
                motivoProrroga

                  .trim();
            }
            if (
              resultado ===
              "NO_CUMPLIDO"
            ) {
              payload.numeroActa =
                numeroActa

                  .trim();
              payload.motivoInfraccion =
                motivoInfraccion

                  .trim();
              payload.personaEncontrada =
                personaEncontrada;
              payload.apellidoInfractor =
                personaEncontrada

                  ? apellido.trim() ||
                    null

                  : null;
              payload.nombreInfractor =
                personaEncontrada

                  ? nombre.trim() ||
                    null

                  : null;
              payload.dniInfractor =
                personaEncontrada

                  ? dni.trim() ||
                    null

                  : null;
              payload.domicilioInfractor =
                personaEncontrada

                  ? domicilio.trim() ||
                    null

                  : null;
           payload.accionPosterior =
    esVehiculo

      ? accionPosterior

      : null;
  payload.detalleAccionPosterior =
    esVehiculo

      ? (
          detalleAccionPosterior

            .trim() ||
          null

        )
      : null;
            }
            const respuesta =
              await api.post(
                `/verificaciones/segunda-visita/${id}`,
                payload

              );
            /*
            |--------------------------------------------------------------------------
            | RETIRO INMEDIATO

            |--------------------------------------------------------------------------
            |
            | NO volvemos a Mis Trabajos.
            | El mismo inspector sigue con:
            |
            | inventario

            | +
            | remoción

            |
            */
            if (
              accionPosterior ===
                "RETIRO_INMEDIATO" ||
              respuesta.data

                ?.continuarRemocion

            ) {
              const infraccionId =
                respuesta.data

                  ?.infraccion

                  ?.id;
              if (!infraccionId) {
                setError(
                  "La infracción se registró, pero el sistema no devolvió su ID para continuar con la remoción."
                );
                return;
              }
              navigate(
                `/remocion/${id}?infraccionId=${infraccionId}`
              );
              return;
            }
         if (
    respuesta.data
      ?.puedeContinuarControlando
  ) {
    const respuestaActualizada =
      await api.get(
        `/verificaciones/segunda-visita/${id}`
      );

  const datos =
    respuestaActualizada.data ||
    {};

  setDatosSegundaVisita(
    datos
  );

  setControlRegistrado(
    datos.realizada
      ? datos
      : null
  );


    setControlesRegistrados(
      Array.isArray(
        datos.controles
      )
        ? datos.controles
        : []
    );

  setControlEditando(null);

  /*
  * Después de guardar el control,
  * seleccionamos automáticamente
  * el próximo emplazamiento pendiente.
  */
  const proximosPendientes =
    Array.isArray(
      datos.emplazamientosPendientes
    )
      ? [...datos.emplazamientosPendientes].sort(
          (a, b) =>
            Number(a.id) -
            Number(b.id)
        )
      : [];

  const proximoEmplazamiento =
    proximosPendientes[0] ||
    null;

  setEmplazamientoSeleccionadoId(
    proximoEmplazamiento
      ? String(
          proximoEmplazamiento.id
        )
      : ""
  );

    setResultado("");
    setSituacion("");
    setObservaciones("");

    setPlazoCantidad(24);
    setPlazoUnidad("HORAS");
    setMotivoProrroga("");

    setNumeroActa("");
    setMotivoInfraccion("");

    setPersonaEncontrada(
      false
    );

    setApellido("");
    setNombre("");
    setDni("");
    setDomicilio("");

    setAccionPosterior("");
    setDetalleAccionPosterior(
      ""
    );

    setCantidadFotosInfraccion(
      0
    );

    setError("");

  const proximoVehiculo =
    proximoEmplazamiento?.vehiculo ||
    null;

  const nombreProximo =
    proximoVehiculo
      ? (
          proximoVehiculo.dominio ||
          proximoVehiculo.patente ||
          `Vehículo #${proximoVehiculo.id}`
        )
      : proximoEmplazamiento
        ? `Emplazamiento #${proximoEmplazamiento.id}`
        : "el siguiente emplazamiento";

  alert(
    `Control registrado correctamente.\n\nAhora seguís con: ${nombreProximo}`
  );
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    return;
  }

  alert(
    respuesta.data
      ?.mensaje ||
    "Control registrado correctamente."
  );

  navigate(
    "/mis-trabajos"
  );
          } catch (err) {
            console.error(
              "Error guardando control:",
              err

            );
            setError(
              err.response?.data

                ?.mensaje ||
              "No se pudo guardar el control."
            );
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          } finally {
            setGuardando(false);
          }
        };
      /*
      |--------------------------------------------------------------------------
      | CARGANDO

      |--------------------------------------------------------------------------
      */
      if (cargando) {
        return (
          <div className="segunda-visita-page">
            Cargando control...
          </div>
        );
      }
      if (!reclamo) {
        return (
          <div className="segunda-visita-page">
            <div className="segunda-error">
              {error ||
                "Reclamo no encontrado"}
            </div>
          </div>
        );
      }
      /*
      |--------------------------------------------------------------------------
      | RENDER

      |--------------------------------------------------------------------------
      */
      return (
        <div className="segunda-visita-page">
          <header className="segunda-header">
            <button

              type="button"
              className="segunda-volver"
              onClick={() =>
                navigate(
                  "/mis-trabajos"
                )
              }
            >
              ← Volver

            </button>
            <div>
              <span className="segunda-etiqueta">
                CONTROL DEL INSPECTOR

              </span><h1>
    {controlRegistrado

      ? editandoControl

        ? "Corregir control"
        : "Control realizado"
      : "Nuevo control"}</h1>
             <p>
    {controlRegistrado

      ? editandoControl

        ? "Podés corregir los datos registrados. El resultado del control no puede modificarse."
        : "Este control ya fue realizado. Abajo podés consultar lo que registró el inspector."
      : "Primero revisá por qué se originó el reclamo y qué actuaciones se hicieron."}</p>
            </div>
          </header>
          {error && (
            <div className="segunda-error">
              {error}
            </div>
          )}
          {/* ==========================================================
              POR QUÉ ESTÁS ACÁ

          ========================================================== */}
          <section className="control-contexto">
            <div className="control-contexto-titulo">
              <span>
                ANTES DE EMPEZAR

              </span>
              <h2>
                ¿Por qué estás acá?
              </h2>
              <p>
                Estos son los antecedentes

                que tenés que conocer antes

                de realizar el control.
              </p>
            </div>
            <div className="control-dato-principal">
              <span>
                MOTIVO DEL RECLAMO

              </span>
              <strong>
                {tipo?.nombre ||
                  "Sin tipo"}
              </strong>
              <p>
                {descripcionOriginal}
              </p>
            </div>
            <div className="control-datos-grid">
              <div>
                <span>
                  Reclamo

                </span>
                <strong>
                  #
                  {reclamo.numeroReclamo ||
                    reclamo.id}
                </strong>
              </div>
              <div>
                <span>
                  Dirección

                </span>
                <strong>
                  {reclamo.direccion ||
                    "Sin dirección"}
                </strong>
                {reclamo.barrio && (
                  <small>
                    {reclamo.barrio}
                  </small>
                )}
              </div>
              <div>
             <span>
    Acta seleccionada
  </span><strong>
    {actaSeleccionada

      ?.numeroActa ||
      "Seleccioná un emplazamiento"}</strong>
              </div>
              <div>
             <span>
    Vencimiento seleccionado
  </span><strong>
    {emplazamientoSeleccionado

      ? formatearFecha(
          emplazamientoSeleccionado

            .fechaVencimiento

        )
      : "—"}</strong>
              </div>
            </div>
            <div className="control-situacion-anterior">
              <span>
                QUÉ SE ENCONTRÓ ANTERIORMENTE

              </span>
              <p>
                {situacionAnterior}
              </p>
            </div><div className="control-ubicacion-reclamo">
    <div className="control-ubicacion-cabecera">
      <span>
        📍 LUGAR DEL RECLAMO

      </span>
      <strong>
        {reclamo.direccion ||
          "Sin dirección registrada"}
      </strong>
      {reclamo.barrio && (
        <small>
          Barrio: {reclamo.barrio}
        </small>
      )}
      {reclamo.referencia && (
        <small>
          Referencia:{" "}
          {reclamo.referencia}
        </small>
      )}
    </div>
    {tieneUbicacionReclamo ? (
      <div className="control-mapa-reclamo">
        <MapContainer

          center={[
            latitudReclamo,
            longitudReclamo,
          ]}
          zoom={17}
          scrollWheelZoom={false}
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <TileLayer

            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker

            position={[
              latitudReclamo,
              longitudReclamo,
            ]}
          >
            <Popup>
              <strong>
                {reclamo.direccion ||
                  "Lugar del reclamo"}
              </strong>
              {reclamo.referencia && (
                <>
                  <br />
                  {reclamo.referencia}
                </>
              )}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    ) : (
      <div className="control-mapa-sin-ubicacion">
        No hay una ubicación GPS

        registrada para este reclamo.
      </div>
    )}</div>
   {/* HISTORIAL DE PLAZOS */}

  {historialPlazosPorVehiculo.length > 0 && (
    <div className="control-historial">

      <h3>
        Historial de plazos
      </h3>

      <div className="historial-plazos-vehiculos">

        {historialPlazosPorVehiculo.map(
          (grupo, grupoIndex) => {

            const vehiculo =
              grupo.vehiculo;

            const dominio =
              vehiculo?.dominio ||
              vehiculo?.patente ||
              null;

            const descripcionVehiculo =
              [
                vehiculo?.marca,
                vehiculo?.modelo,
                vehiculo?.color,
              ]
                .filter(Boolean)
                .join(" · ");

            return (
              <div
                key={grupo.clave}
                className="historial-plazo-vehiculo"
              >

                <div className="historial-plazo-vehiculo-cabecera">

                  <span>
                    {vehiculo
                      ? "🚗"
                      : "📋"}
                  </span>

                  <div>
                    <small>
                      {vehiculo
                        ? `VEHÍCULO ${grupoIndex + 1}`
                        : "EMPLAZAMIENTO"}
                    </small>

                    <strong>
                      {dominio ||
                        `Emplazamiento #${grupo.emplazamientos[0]?.id}`}
                    </strong>

                    {descripcionVehiculo && (
                      <p>
                        {descripcionVehiculo}
                      </p>
                    )}
                  </div>

                </div>

                <div className="historial-plazo-lista">

                  {grupo.emplazamientos.map(
                    (
                      emplazamiento,
                      index
                    ) => {

                      const acta =
                        seguimiento.actas.find(
                          (item) =>
                            Number(item.id) ===
                            Number(
                              emplazamiento.actaId
                            )
                        ) || null;

                      return (
                        <div
                          className="control-historial-fila"
                          key={emplazamiento.id}
                        >

                          <div className="control-historial-numero">
                            {index + 1}
                          </div>

                          <div>

                            <strong>
                              {emplazamiento.esProrroga
                                ? "Prórroga"
                                : "Emplazamiento"}
                            </strong>

                            {acta?.numeroActa && (
                              <small className="historial-plazo-acta">
                                Acta N.º{" "}
                                {acta.numeroActa}
                              </small>
                            )}

                            <p>
                              {emplazamiento.plazoCantidad
                                ? `${emplazamiento.plazoCantidad} ${
                                    emplazamiento.plazoUnidad ===
                                    "DIAS"
                                      ? "días"
                                      : "horas"
                                  }`
                                : emplazamiento.plazoHoras
                                  ? `${emplazamiento.plazoHoras} horas`
                                  : "Plazo registrado"}
                            </p>

                            <small>
                              Vencimiento:{" "}
                              {formatearFecha(
                                emplazamiento
                                  .fechaVencimiento
                              )}
                            </small>

                            {emplazamiento.observaciones && (
                              <p className="control-historial-observacion">
                                {
                                  emplazamiento
                                    .observaciones
                                }
                              </p>
                            )}

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>
            );
          }
        )}

      </div>

    </div>
  )}
          </section>
  {controlesRegistrados.length > 0 && !editandoControl && (
    <section className="control-finalizado">
      <div className="control-finalizado-cabecera">
        <span className="control-finalizado-etiqueta">
          ✓ CONTROLES REGISTRADOS
        </span>

        <h2>
          {controlesRegistrados.length === 1
            ? "1 control realizado"
            : `${controlesRegistrados.length} controles realizados`}
        </h2>

        <p>
          {controlRegistrado?.puedeContinuarControlando
            ? "Este reclamo todavía tiene otro emplazamiento pendiente de controlar."
            : tareaFinalizada
              ? "Los controles de esta visita ya fueron registrados."
              : "Estos son los controles registrados hasta el momento."}
        </p>
      </div>

      {controlesRegistrados.map((control, index) => {
        const verificacion = control?.verificacion || null;
        const emplazamiento =
          control?.emplazamientoControlado || null;
        const vehiculo =
          control?.vehiculoControlado ||
          emplazamiento?.vehiculo ||
          null;
        const infraccion =
          control?.infraccion || null;
        const nuevoEmplazamiento =
          control?.nuevoEmplazamiento || null;

        const actaControlada =
          seguimiento.actas.find(
            (item) =>
              Number(item.id) ===
              Number(emplazamiento?.actaId)
          ) || null;

        return (
          <div
            key={
              verificacion?.id ||
              `control-${index}`
            }
            className="control-finalizado-bloque"
          >
            <span className="control-finalizado-label">
              CONTROL {index + 1}
            </span>

            <h3>
              {vehiculo
                ? `🚗 ${
                    vehiculo.dominio ||
                    vehiculo.patente ||
                    `Vehículo #${vehiculo.id}`
                  }`
                : `📋 Emplazamiento #${
                    emplazamiento?.id || "—"
                  }`}
            </h3>

            {vehiculo && (
              <p>
                {[
                  vehiculo.marca,
                  vehiculo.modelo,
                  vehiculo.color,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

            <div className="control-finalizado-resumen">
              <div>
                <span>ACTA DE VÍA PÚBLICA</span>
                <strong>
                  {actaControlada?.numeroActa ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>RESULTADO</span>
                <strong>
                  {nombreResultado(
                    verificacion?.resultado
                  )}
                </strong>
              </div>

              <div>
                <span>VENCIMIENTO CONTROLADO</span>
                <strong>
                  {formatearFecha(
                    emplazamiento?.fechaVencimiento
                  )}
                </strong>
              </div>

              <div>
                <span>REGISTRADO</span>
                <strong>
                  {formatearFecha(
                    verificacion?.createdAt
                  )}
                </strong>
              </div>
            </div>

            {verificacion?.situacion && (
              <div className="control-finalizado-bloque">
                <span className="control-finalizado-label">
                  QUÉ ENCONTRÓ
                </span>

                <p>
                  {verificacion.situacion}
                </p>
              </div>
            )}

            {verificacion?.observaciones && (
              <div className="control-finalizado-bloque">
                <span className="control-finalizado-label">
                  OBSERVACIONES
                </span>

                <p>
                  {verificacion.observaciones}
                </p>
              </div>
            )}

            {verificacion?.resultado ===
              "PRORROGA" &&
              nuevoEmplazamiento && (
                <div className="control-finalizado-bloque">
                  <span className="control-finalizado-label">
                    ⏱ NUEVO PLAZO
                  </span>

                  <p>
                    Se otorgó una prórroga sobre
                    este mismo emplazamiento.
                  </p>

                  <p>
                    Nuevo vencimiento:{" "}
                    <strong>
                      {formatearFecha(
                        nuevoEmplazamiento
                          .fechaVencimiento
                      )}
                    </strong>
                  </p>
                </div>
              )}

            {infraccion && (
              <div className="control-finalizado-infraccion">
                <span className="control-finalizado-label control-finalizado-label-rojo">
                  ACTA DE INFRACCIÓN
                </span>

                <h3>
                  N.º{" "}
                  {infraccion.numeroActa ||
                    "—"}
                </h3>

                {infraccion.motivo && (
                  <p>
                    {infraccion.motivo}
                  </p>
                )}

                {infraccion.accionPosterior && (
                  <p>
                    <strong>
                      Acción posterior:{" "}
                    </strong>
                    {infraccion.accionPosterior ===
                    "RETIRO_INMEDIATO"
                      ? "Retiro inmediato"
                      : infraccion.accionPosterior ===
                          "BUSQUEDA_REMOCION"
                        ? "Pendiente de remoción"
                        : infraccion.accionPosterior}
                  </p>
                )}

                <div className="control-finalizado-foto-acta">
                  <span className="control-finalizado-label">
                    📷 FOTO DEL ACTA DE INFRACCIÓN
                  </span>

                  <FotosReclamo
                    reclamoId={reclamo.id}
                    tipoReferencia="INFRACCION"
                    referenciaId={infraccion.id}
                    permitirSubir={false}
                  />
                </div>
              </div>
            )}

            {control?.puedeEditar ? (
              <div className="control-finalizado-edicion">
                <div>
                  <strong>
                    ✏️ Todavía podés corregir este control
                  </strong>

                  <p>
                    Tenés aproximadamente{" "}
                    <strong>
                      {Number(
                        control.minutosRestantes ||
                          0
                      )}{" "}
                      min
                    </strong>{" "}
                    para corregir los datos.
                  </p>
                </div>

                <button
                  type="button"
                  className="control-finalizado-editar"
                  onClick={() =>
                    comenzarEdicion(control)
                  }
                >
                  ✏️ Corregir datos
                </button>
              </div>
            ) : (
              <div className="control-finalizado-cerrado">
                <strong>
                  🔒 Edición cerrada
                </strong>

                <p>
                  Ya pasó el plazo para
                  corregir este control.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </section>
  )}

  {/* ==========================================================  
    PASO 1 - VEHÍCULO / EMPLAZAMIENTO A CONTROLAR
  ========================================================== */}



  {(editandoControl ||
    emplazamientosControl.length > 0) && (
    <section className="segunda-seccion selector-control-paso"> 
    <span className="segunda-etiqueta">     
    {editandoControl ? "CONTROL REGISTRADO" : "PASO 1 DE 2"}   
    </span>    
    <h2>      {editandoControl
          ? "Vehículo controlado"        : esVehiculo
            ? "¿Qué vehículo estás controlando?"          : "¿Qué emplazamiento estás controlando?"}    </h2>    <p className="selector-control-ayuda">      {editandoControl
          ? "Este control ya quedó vinculado y no puede cambiarse de vehículo ni de emplazamiento."        : esVehiculo
            ? "Tocá el vehículo que estás mirando en este momento."          : "Tocá el emplazamiento que estás verificando en este momento."}    </p>    {editandoControl ? (      emplazamientoSeleccionado ? (        <div className="vehiculo-control-confirmado bloqueado">          <div className="vehiculo-control-confirmado-titulo">            <span>🔒 CONTROL VINCULADO</span>            <strong>              {vehiculoSeleccionado
                  ? `🚗 ${vehiculoSeleccionado.dominio || vehiculoSeleccionado.patente || `Vehículo #${vehiculoSeleccionado.id}`}`                : `📋 Emplazamiento #${emplazamientoSeleccionado.id}`}            </strong>          </div>          {vehiculoSeleccionado && (            <p>              {[vehiculoSeleccionado.marca, vehiculoSeleccionado.modelo, vehiculoSeleccionado.color]                .filter(Boolean)                .join(" · ")}            </p>          )}          <div className="vehiculo-control-datos">            <div><span>Acta de Vía Pública</span><strong>{actaSeleccionada?.numeroActa || "—"}</strong></div>            <div><span>Vencimiento</span><strong>{formatearFecha(emplazamientoSeleccionado.fechaVencimiento)}</strong></div>          </div>          <small>Este dato está bloqueado para evitar que una corrección quede asociada a otro vehículo.</small>        </div>      ) : (        <div className="segunda-error">No se pudo identificar el vehículo o emplazamiento original de este control.</div>      )    ) : emplazamientoSeleccionado ? (      <div className="vehiculo-control-confirmado">            <div className="vehiculo-control-confirmado-titulo">         
                  <span>
  VEHÍCULO SELECCIONADO — FALTA COMPLETAR EL CONTROL
</span>        <strong>            {vehiculoSeleccionado
                ? `🚗 ${vehiculoSeleccionado.dominio || vehiculoSeleccionado.patente || `Vehículo #${vehiculoSeleccionado.id}`}`              : `📋 Emplazamiento #${emplazamientoSeleccionado.id}`}          </strong>        </div>        {vehiculoSeleccionado && (          <p>            {[vehiculoSeleccionado.marca, vehiculoSeleccionado.modelo, vehiculoSeleccionado.color]              .filter(Boolean)              .join(" · ")}          </p>        )}        <div className="vehiculo-control-datos">          <div><span>Acta de Vía Pública</span><strong>{actaSeleccionada?.numeroActa || "—"}</strong></div>          <div><span>Vencimiento</span><strong>{formatearFecha(emplazamientoSeleccionado.fechaVencimiento)}</strong></div>        </div>        
                <button
  type="button"
  onClick={() => {
   document
  .getElementById("antecedentes-segunda-visita")
  ?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
  }}
  style={{
    display: "block",
    width: "100%",
    padding: "18px",
    marginTop: "18px",
    marginBottom: "12px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  }}
>
  👇 CONTINUAR — COMPLETAR EL CONTROL
</button>
                <button
            type="button"          className="cambiar-vehiculo-control"          onClick={() => {            setEmplazamientoSeleccionadoId("");            setResultado("");            setError("");          }}        >          ← Elegir otro {esVehiculo ? "vehículo" : "emplazamiento"}        </button>      </div>    ) : (      <div className="selector-vehiculos-simple">        {emplazamientosControl.length === 0 ? (          <div className="segunda-error">No hay emplazamientos disponibles para controlar.</div>        ) : (          emplazamientosControl.map((emplazamiento) => {            const vehiculo = emplazamiento.vehiculo || null;            const acta = seguimiento.actas.find((item) => Number(item.id) === Number(emplazamiento.actaId)) || null;            const cerrado = ["CUMPLIDO", "CANCELADO"].includes(emplazamiento.estado);            return (              <button
                  key={emplazamiento.id}                type="button"                disabled={cerrado}                className="vehiculo-control-opcion"                onClick={() => {                  setEmplazamientoSeleccionadoId(String(emplazamiento.id));                  setResultado("");                  setError("");                }}              >                <div className="vehiculo-control-principal">                  <strong>                    {vehiculo
                        ? `🚗 ${vehiculo.dominio || vehiculo.patente || `Vehículo #${vehiculo.id}`}`                      : `📋 Emplazamiento #${emplazamiento.id}`}                  </strong>                  {vehiculo && (                    <span>{[vehiculo.marca, vehiculo.modelo, vehiculo.color].filter(Boolean).join(" · ")}</span>                  )}                </div>                <div className="vehiculo-control-meta">                  <span>Acta N.º {acta?.numeroActa || "—"}</span>                  <span>Vence: {formatearFecha(emplazamiento.fechaVencimiento)}</span>                  {emplazamiento.esProrroga && <span>⏱ Prórroga vigente</span>}                  {cerrado && <span>🔒 Ya cerrado</span>}                </div>                {!cerrado && <span className="vehiculo-control-accion">CONTROLAR ESTE</span>}              </button>            );          })        )}      </div>    )}  </section>)}
        





  {/* ==========================================================
      ANTECEDENTES DE LA RAMA SELECCIONADA
  ========================================================== */}

  {!editandoControl &&
    emplazamientoSeleccionado && (
     <section
  id="antecedentes-segunda-visita"
  className="segunda-seccion"
  style={{ scrollMarginTop: "20px" }}
>
  <span className="segunda-etiqueta">
    ANTECEDENTES DE ESTE VEHÍCULO
  </span>

        <h2>
          📋 Lo que tenés que revisar
        </h2>

        <p>
          Estos son los antecedentes del vehículo
          que estás controlando.
        </p>

        {vehiculoSeleccionado && (
          <div className="control-finalizado-bloque">
            <span className="control-finalizado-label">
              🚗 VEHÍCULO
            </span>

            <h3>
              {vehiculoSeleccionado.dominio ||
                vehiculoSeleccionado.patente ||
                `Vehículo #${vehiculoSeleccionado.id}`}
            </h3>

            <p>
              {[
                vehiculoSeleccionado.marca,
                vehiculoSeleccionado.modelo,
                vehiculoSeleccionado.color,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>

            <FotosReclamo
              reclamoId={reclamo.id}
              tipoReferencia="VEHICULO"
              referenciaId={vehiculoSeleccionado.id}
              permitirSubir={false}
            />
          </div>
        )}

        <div className="control-finalizado-bloque">
          <span className="control-finalizado-label">
            📄 ACTA DE VÍA PÚBLICA
          </span>

          <h3>
            N.º{" "}
            {actaSeleccionada?.numeroActa ||
              "—"}
          </h3>

          <p>
            Emplazamiento realizado:{" "}
            <strong>
              {formatearFecha(
                emplazamientoSeleccionado.fechaHora
              )}
            </strong>
          </p>

          <p>
            Vencimiento:{" "}
            <strong>
              {formatearFecha(
                emplazamientoSeleccionado.fechaVencimiento
              )}
            </strong>
          </p>

      {emplazamientoFotoActa && (
    <FotosReclamo
      reclamoId={reclamo.id}
      tipoReferencia="EMPLAZAMIENTO"
      referenciaId={
        emplazamientoFotoActa.id
      }
      permitirSubir={false}
    />
  )}
        </div>

        {emplazamientoSeleccionado.esProrroga && (
          <div className="control-finalizado-bloque">
            <span className="control-finalizado-label">
              ⏱ PRÓRROGA OTORGADA
            </span>

            <p>
              Este vehículo ya recibió una
              prórroga.
            </p>

            <p>
              Nuevo plazo:{" "}
              <strong>
                {emplazamientoSeleccionado.plazoCantidad
                  ? `${emplazamientoSeleccionado.plazoCantidad} ${
                      emplazamientoSeleccionado.plazoUnidad ===
                      "DIAS"
                        ? "días"
                        : "horas"
                    }`
                  : `${emplazamientoSeleccionado.plazoHoras || "—"} horas`}
              </strong>
            </p>

            <p>
              Venció:{" "}
              <strong>
                {formatearFecha(
                  emplazamientoSeleccionado.fechaVencimiento
                )}
              </strong>
            </p>

            {emplazamientoSeleccionado.observaciones && (
              <p>
                <strong>Motivo:</strong>{" "}
                {
                  emplazamientoSeleccionado
                    .observaciones
                }
              </p>
            )}
          </div>
        )}
      </section>
    )}
      {/* ==========================================================
              PREGUNTA PRINCIPAL

          ========================================================== */}
        {(editandoControl ||
    emplazamientoSeleccionado) && (
    <>
      {!editandoControl &&
    emplazamientoSeleccionadoId && (
  <section
  id="formulario-segunda-visita"
  className="segunda-pregunta"
  style={{ scrollMarginTop: "20px" }}
>
            <span className="segunda-etiqueta">
              PASO 2 DE 2

            </span>
            <h2>
              ¿Qué pasó con ESTE vehículo?
            </h2>
            <p>
              Marcá exactamente lo que

              encontraste en esta visita.
            </p>
            <div className="control-opciones">
              <button

                type="button"
                className={
                  resultado ===
                  "CUMPLIDO"
                    ? "control-opcion seleccionado"
                    : "control-opcion"
                }
                onClick={() =>
                  elegir(
                    "CUMPLIDO"
                  )
                }
              >
                <strong>
                  ✅ Ya está solucionado

                </strong>
                <span>
                  Cumplió con lo solicitado.
                </span>
              </button>
              <button

                type="button"
                className={
                  resultado ===
                  "PRORROGA"
                    ? "control-opcion seleccionado"
                    : "control-opcion"
                }
                onClick={() =>
                  elegir(
                    "PRORROGA"
                  )
                }
              >
                <strong>
                  ⏱ Dar más plazo

                </strong>
                <span>
                  Se puede otorgar otra

                  prórroga y volver a

                  controlar más adelante.
                </span>
              </button>
              <button

                type="button"
             className={
    resultado === "NO_CUMPLIDO"
      ? "control-opcion control-opcion-infraccion seleccionado"
      : "control-opcion control-opcion-infraccion"}
                onClick={() =>
                  elegir(
                    "NO_CUMPLIDO"
                  )
                }
              >
                <strong>
                  📝 Hacer Acta de Infracción

                </strong>
                <span>
                  No cumplió con lo solicitado.
                </span>
              </button>
              <button

                type="button"
                className={
                  resultado ===
                  "NO_SE_ENCUENTRA"
                    ? "control-opcion seleccionado"
                    : "control-opcion"
                }
                onClick={() =>
                  elegir(
                    "NO_SE_ENCUENTRA"
                  )
                }
              >
                <strong>
                  🔍 No encontré la situación

                </strong>
                <span>
                  No se encontró lo denunciado.
                </span>
              </button>
            </div>
          </section>
          )}
                  {editandoControl && (
            <section className="segunda-pregunta">
              <span className="segunda-etiqueta">
                CORRECCIÓN DEL CONTROL

              </span>
              <h2>
                {nombreResultado(
                  resultado

                )}
              </h2>
              <p>
                El resultado original no

                puede modificarse. Solo

                podés corregir los datos

                registrados.
              </p>
            </section>
          )}
          {resultado && (
            <>
              <section className="segunda-seccion">
                <h2>
                  ¿Qué encontraste?
                </h2>
                <textarea

                  value={situacion}
                  onChange={(e) =>
                    setSituacion(
                      e.target.value

                    )
                  }
                  rows={4}
                  placeholder="Describí exactamente cómo estaba la situación cuando llegaste."
                />
              </section>
            </>
          )}
          {/* ==========================================================
              PRÓRROGA

          ========================================================== */}
          {resultado ===
            "PRORROGA" &&
            !editandoControl && (
            <section className="segunda-prorroga">
              <span className="bloque-etiqueta">
                NUEVO PLAZO

              </span>
              <h2>
                ¿Cuánto tiempo más?
              </h2>
              <p>
                Podés otorgar otra prórroga.
                El plazo anterior queda

                guardado en el expediente.
              </p>
              <div className="plazos-rapidos">
                {[
                  12,
                  24,
                  48,
                  72,
                ].map(
                  (horas) => (
                    <button

                      key={horas}
                      type="button"
                      onClick={() => {
                        setPlazoCantidad(
                          horas

                        );
                        setPlazoUnidad(
                          "HORAS"
                        );
                      }}
                    >
                      {horas} hs

                    </button>
                  )
                )}
              </div>
              <div className="plazo-personalizado">
                <div>
                  <label>
                    Cantidad

                  </label>
                  <input

                    type="number"
                    min="1"
                    value={
                      plazoCantidad

                    }
                    onChange={(e) =>
                      setPlazoCantidad(
                        e.target.value

                      )
                    }
                  />
                </div>
                <div>
                  <label>
                    Unidad

                  </label>
                  <select

                    value={
                      plazoUnidad

                    }
                    onChange={(e) =>
                      setPlazoUnidad(
                        e.target.value

                      )
                    }
                  >
                    <option value="HORAS">
                      Horas

                    </option>
                    <option value="DIAS">
                      Días

                    </option>
                  </select>
                </div>
              </div>
              <label>
                ¿Por qué se le da más plazo? *
              </label>
              <textarea

                value={
                  motivoProrroga

                }
                onChange={(e) =>
                  setMotivoProrroga(
                    e.target.value

                  )
                }
                rows={4}
                placeholder="Ej.: el propietario manifestó que necesita 48 horas más para retirar el vehículo."
              />
            </section>
          )}
          {/* ==========================================================
              INFRACCIÓN

          ========================================================== */}
          {resultado ===
            "NO_CUMPLIDO" && (
            <section className="segunda-infraccion">
              <span className="bloque-etiqueta">
                ACTA DE INFRACCIÓN

              </span>
              <h2>
                Cargar el acta realizada

              </h2>
              <label>
                Número del Acta *
              </label>
              <input

                value={
                  numeroActa

                }
                onChange={(e) =>
                  setNumeroActa(
                    e.target.value

                  )
                }
                disabled={editandoControl}
                placeholder="Ej.: A 00020123"
              />
              <label>
                Motivo de la infracción *
              </label>
              <textarea

                value={
                  motivoInfraccion

                }
                onChange={(e) =>
                  setMotivoInfraccion(
                    e.target.value

                  )
                }
                rows={4}
                placeholder="Ej.: No dio cumplimiento al emplazamiento realizado."
              />
             <div

    style={{
      marginTop: "20px",
      marginBottom: "20px",
    }}>
    <h3>
      Foto del Acta de Infracción

    </h3>
    <p>
      Sacá una foto clara del acta

      realizada.
    </p>
  <FotosReclamo
    reclamoId={reclamo.id}
    tipoReferencia="INFRACCION"
    referenciaTemporal={
      emplazamientoSeleccionadoId
        ? `EMPLAZAMIENTO_${emplazamientoSeleccionadoId}`
        : null
    }
    descripcion="Foto del Acta de Infracción"
    permitirSubir={
      !editandoControl &&
      Boolean(
        emplazamientoSeleccionadoId
      )
    }
    onCantidadFotosChange={
      setCantidadFotosInfraccion
    }
    maxFotos={1}
  />
  </div>
              <div className="persona-pregunta">
                <strong>
                  ¿Había una persona para identificar?
                </strong>
                <div className="persona-botones">
                  <button

                    type="button"
                    className={
                      personaEncontrada

                        ? "seleccionado"
                        : ""
                    }
                    onClick={() =>
                      setPersonaEncontrada(
                        true

                      )
                    }
                  >
                    Sí

                  </button>
                  <button

                    type="button"
                    className={
                      !personaEncontrada

                        ? "seleccionado"
                        : ""
                    }
                    onClick={() => {
                      setPersonaEncontrada(
                        false

                      );
                      setApellido("");
                      setNombre("");
                      setDni("");
                      setDomicilio("");
                    }}
                  >
                    No

                  </button>
                </div>
              </div>
              {personaEncontrada && (
                <div className="datos-persona">
                  <div>
                    <label>
                      Apellido

                    </label>
                    <input

                      value={
                        apellido

                      }
                      onChange={(e) =>
                        setApellido(
                          e.target.value

                        )
                      }
                    />
                  </div>
                  <div>
                    <label>
                      Nombre

                    </label>
                    <input

                      value={
                        nombre

                      }
                      onChange={(e) =>
                        setNombre(
                          e.target.value

                        )
                      }
                    />
                  </div>
                  <div>
                    <label>
                      DNI

                    </label>
                    <input

                      value={
                        dni

                      }
                      onChange={(e) =>
                        setDni(
                          e.target.value

                        )
                      }
                    />
                  </div>
                  <div>
                    <label>
                      Domicilio

                    </label>
                    <input

                      value={
                        domicilio

                      }
                      onChange={(e) =>
                        setDomicilio(
                          e.target.value

                        )
                      }
                    />
                  </div>
                </div>
              )}{esVehiculo &&
    !editandoControl && (
    
<div className="accion-posterior">
  <h3>¿Se puede retirar el vehículo ahora?</h3>

  <p>
    Elegí cómo continúa el procedimiento después
    de realizar el Acta de Infracción.
  </p>

  <button
    type="button"
    className={`opcion-remocion ${
      accionPosterior === "RETIRO_INMEDIATO"
        ? "opcion-remocion-activa"
        : ""
    }`}
    aria-pressed={accionPosterior === "RETIRO_INMEDIATO"}
    onClick={() => {
      setAccionPosterior("RETIRO_INMEDIATO");
      setDetalleAccionPosterior("");
    }}
  >
    <strong>
      🚛 SÍ — Remoción inmediata
      {accionPosterior === "RETIRO_INMEDIATO" && " ✓"}
    </strong>
    <span>
      El vehículo puede retirarse ahora.
      Al guardar el control, continuarás con
      el inventario y la remoción.
    </span>
  </button>

  <button
    type="button"
    className={`opcion-remocion ${
      accionPosterior === "BUSQUEDA_REMOCION"
        ? "opcion-remocion-activa"
        : ""
    }`}
    aria-pressed={accionPosterior === "BUSQUEDA_REMOCION"}
    onClick={() => {
      setAccionPosterior("BUSQUEDA_REMOCION");
    }}
  >
    <strong>
      ⚖️ NO — Esperar orden del juez
      {accionPosterior === "BUSQUEDA_REMOCION" && " ✓"}
    </strong>
    <span>
      El vehículo queda en el lugar.
      Secretaría enviará el Acta de Infracción
      al Juzgado y solicitará al juez
      la orden judicial de remoción.
    </span>
  </button>

  {accionPosterior === "BUSQUEDA_REMOCION" && (
    <>
      <label>
        ¿Por qué no se puede retirar ahora? *
      </label>

      <textarea
        value={detalleAccionPosterior}
        onChange={(e) =>
          setDetalleAccionPosterior(e.target.value)
        }
        rows={4}
        placeholder="Ej.: El propietario se opuso al retiro del vehículo."
      />

      <div className="segunda-aviso">
        <strong>
          ⏳ Pendiente de orden judicial
        </strong>
        <p>
          El vehículo no se retira ahora.
          Al guardar este control, termina
          esta actuación del inspector.
          Secretaría continuará el trámite
          para solicitar la orden de remoción
          al juez.
        </p>
      </div>
    </>
  )}
</div>

  
)}

{!esVehiculo && (
    <div className="segunda-aviso">
      <strong>
        Después de registrar el acta

      </strong>
      <p>
        Tu trabajo termina acá.
        Secretaría continuará el trámite

        de la infracción con el Juzgado.
        El reclamo seguirá abierto hasta

        que se confirme que el problema

        fue solucionado.
      </p>
    </div>)}
            </section>
          )}
          {resultado && (
            <section className="segunda-seccion">
              <label>
                Observaciones generales

              </label>
              <textarea

                value={
                  observaciones

                }
                onChange={(e) =>
                  setObservaciones(
                    e.target.value

                  )
                }
                rows={3}
              />
            </section>
          )}
          {resultado && (
            <div className="segunda-final">
              <button

                type="button"
                className="boton-finalizar"
                disabled={
                  guardando

                }
             onClick={
    editandoControl

      ? guardarEdicion

      : finalizar
  }
              >
         {guardando

    ? "Guardando..."
    : editandoControl

      ? "Guardar corrección"
      : accionPosterior ===
          "RETIRO_INMEDIATO"
        ? "Registrar infracción y continuar al retiro →"
        : resultado ===
            "PRORROGA"
          ? "Finalizar y otorgar nuevo plazo"
          : resultado ===
              "NO_CUMPLIDO"
            ? "Registrar Acta de Infracción"
            : "Finalizar control"}
              </button>
            </div>
          )}
            </>
          )}
        </div>
      );
    };
    export default SegundaVisitaPage;