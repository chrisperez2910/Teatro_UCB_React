# Cómo está organizado el proyecto en React

La idea fue conservar lo que ya funcionaba en el avance y cambiar la forma de organizar la interfaz. React se encarga de mostrar los componentes a partir del estado; ya no se crean tarjetas ni formularios concatenando HTML.

## Conceptos usados

| Concepto                | Dónde verlo                       | Para qué se usa                                       |
| ----------------------- | --------------------------------- | ----------------------------------------------------- |
| Componentes y JSX       | `src/components/` y `src/pages/`  | Separar las secciones y las páginas                   |
| Props                   | `BookingSection` y `ContactForm`  | Recibir datos y acciones desde el componente padre    |
| `children`              | `Dialog` y `TheaterProvider`      | Reutilizar una estructura con contenido diferente     |
| `useState`              | Cartelera, talleres y formularios | Guardar filtros, campos y ventanas abiertas           |
| `useReducer`            | `useSeatSelection` y `useCatalog` | Manejar acciones de selección y estados de carga      |
| `useEffect`             | Catálogo, navegación y guardado   | Sincronizar con fetch, el navegador y localStorage    |
| `useRef`                | Formulario y diálogo              | Controlar el foco y evitar envíos repetidos           |
| `useContext`            | `TheaterContext.jsx`              | Compartir reservas e inscripciones entre páginas      |
| Hooks propios           | `src/hooks/`                      | Reutilizar comportamiento sin mezclarlo con el diseño |
| Formularios controlados | `ContactForm.jsx`                 | Mantener los valores y los errores en el estado       |
| React Router            | `main.jsx` y `App.jsx`            | Navegar sin recargar toda la aplicación               |
| `lazy` y `Suspense`     | `App.jsx`                         | Cargar la ficha y el historial cuando se necesitan    |

Se mantuvo JavaScript con JSX para continuar con el lenguaje del primer avance. El material de clase también muestra TypeScript y otras herramientas; no es necesario incorporarlas todas para esta etapa. Context resuelve el estado compartido actual sin agregar otra biblioteca de estado.

## Recorrido de una reserva

1. `HomePage` obtiene la función desde la URL y la entrega a `BookingSection`.
2. `useSeatSelection` agrega o quita butacas mediante un reducer. El reducer no guarda datos, no genera códigos ni modifica el estado anterior.
3. `ContactForm` controla nombre y correo, intercepta el envío y muestra errores junto a los campos.
4. El formulario llama a la acción `reserve` del contexto.
5. En modo conectado, el contexto envía la reserva a la API. El servidor comprueba la sesión y la disponibilidad, y guarda la reserva y sus butacas en una transacción.
6. La respuesta actualiza el contexto y el router abre el historial de la cuenta. En modo visual local, `buildReservation` y `usePersistentState` guardan la reserva en el navegador.

Cancelar cambia el estado de la reserva a `CANCELADA`. El registro queda en el historial, pero sus butacas dejan de contarse como ocupadas.

## Carga de datos y efectos

`useCatalog` consulta `public/data/teatro.json` o la API PostgreSQL, según la configuración, con fetch y muestra estados de carga, éxito y error. Comprueba `response.ok`, permite reintentar y usa `AbortController` para cancelar cuando se desmonta el componente o cuando la petición tarda demasiado. El JSON corresponde al modo local. El modo PostgreSQL utiliza `/api/catalog` y guarda las operaciones por API.

Los efectos que agregan eventos también los eliminan al desmontarse. `StrictMode` ayuda a detectar problemas de montaje y limpieza durante el desarrollo. El guardado local valida lo que recupera y escucha cambios de otras pestañas, aunque esto no reemplaza las garantías de una base de datos.

## Relación con la BD propuesta

El catálogo mantiene separados obra, dramaturgo, producción, función, sala, butaca, imágenes, reseñas y talleres. Las relaciones utilizan los identificadores del esquema presentado.

Para el modo local, una reserva guarda sus butacas en un arreglo. En PostgreSQL, el servidor crea filas de `reserva_butaca`, vinculadas a `RESERVA` y a la combinación función–butaca. La API comprueba sala, disponibilidad, estado y cupos dentro de transacciones. La prevención de duplicados queda en el servidor y las restricciones de la BD.

El servidor todavía deberá aplicar el cierre de inscripciones por fecha, definir la política de vencimiento de reservas y controlar quién puede administrar la programación. Esas funciones quedan para la siguiente etapa; no se simulan como si ya estuvieran implementadas.

## Para presentar el avance

Puedes empezar por la cartelera, buscar “garcia” sin tilde, abrir una ficha y elegir una función. Luego selecciona butacas, guarda la reserva, entra al historial y cancélala. Termina con la galería y la inscripción a un taller.

Si te preguntan por el código, muestra `main.jsx`, una tarjeta de `CatalogSection`, `ContactForm`, el reducer de selección y el contexto. Con eso puedes explicar el flujo completo desde una acción del usuario hasta el cambio de pantalla.

## Material consultado

- Material de clase: https://github.com/WebDesignOneU/web14
- Presentación compartida: `React_Architecture_Blueprint.pdf`.
- React: https://react.dev/learn
- Reducers: https://react.dev/reference/react/useReducer
- Efectos: https://react.dev/reference/react/useEffect
- HashRouter: https://reactrouter.com/api/declarative-routers/HashRouter
- Compilación y publicación: https://vite.dev/guide/static-deploy.html

El enlace de Moodle requiere acceso institucional y no pudo revisarse. La adaptación toma como referencia el repositorio y la presentación compartida.
