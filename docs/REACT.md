# Organización en React

La interfaz está separada en páginas y componentes. El catálogo, la cuenta y las reservas se comparten desde `TheaterContext`. Cada pantalla conserva sus propios filtros y formularios.

## Piezas principales

| Archivo                             | Responsabilidad                                  |
| ----------------------------------- | ------------------------------------------------ |
| `src/main.jsx`                      | Iniciar React y el router                        |
| `src/App.jsx`                       | Definir las rutas y cargar páginas bajo demanda  |
| `src/TheaterContext.jsx`            | Compartir cuenta, catálogo y acciones de reserva |
| `src/components/CatalogSection.jsx` | Buscar obras y filtrar por género                |
| `src/components/BookingSection.jsx` | Elegir función y butacas                         |
| `src/pages/AccountPage.jsx`         | Registro, ingreso y cierre de sesión             |
| `src/pages/AdminPage.jsx`           | Habilitar butacas y programar horarios           |
| `src/pages/ReportsPage.jsx`         | Consultar y exportar el informe                  |
| `src/services/reporting.js`         | Formatear cifras, generar CSV y evaluar alertas  |
| `src/hooks/`                        | Reutilizar selección, carga y navegación         |

## Estado y eventos

`useState` controla los campos, filtros y ventanas. `useReducer` organiza la selección de butacas sin modificar el estado anterior. `useContext` permite que la cuenta y las reservas estén disponibles en distintas páginas. Los efectos de carga cancelan las peticiones que ya no se necesitan con `AbortController`.

Los formularios usan valores controlados, validación y `preventDefault()`. `useRef` se utiliza para el foco y para evitar envíos repetidos. `lazy` y `Suspense` cargan las páginas secundarias cuando se abren. `HashRouter` permite navegar también desde GitHub Pages.

## Recorrido de una reserva

1. El visitante elige una obra, una función futura y sus butacas.
2. Si aún no ingresó, se solicita su cuenta y se conserva la selección durante la navegación.
3. El formulario envía los datos a la API.
4. Node comprueba la sesión, la fecha y la disponibilidad en PostgreSQL.
5. Una transacción guarda la reserva y sus butacas. La restricción única impide que dos usuarios reserven el mismo lugar.
6. La respuesta actualiza la cuenta y abre **Mis reservas**.

La cancelación conserva el historial y libera las butacas antes del inicio de la función. El catálogo consulta la disponibilidad periódicamente y cuando vuelve a tener el foco; el servidor siempre vuelve a comprobarla al confirmar.

## Administración e informes

Las páginas de administración verifican el rol de la cuenta y la API vuelve a comprobarlo en cada petición. Ocultar un botón por sí solo no concede ni protege permisos.

Los reportes se calculan en PostgreSQL a partir de las reservas existentes. El frontend muestra indicadores, tablas y alertas, pero no modifica las cifras recibidas para aparentar actividad. Los filtros se aplican por fecha de función y obra.

El catálogo estático de Pages permite consultar las obras. Para registrar cuentas, reservar o administrar se ejecuta la versión conectada, descrita en `POSTGRESQL.md`.

## Referencias

- Material de clase: https://github.com/WebDesignOneU/web14
- React: https://react.dev/learn
- React Router: https://reactrouter.com/
- Vite: https://vite.dev/
