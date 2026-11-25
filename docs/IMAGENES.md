# Imágenes y videos

La portada actual es una ilustración digital. Los afiches incluidos también son ilustrativos y no pertenecen a montajes oficiales del Teatro UCB. Para una presentación oficial, reemplázalos por material del teatro que tengas autorización para usar.

| Lugar                    | Imagen sugerida                                 | Ubicación                                 | Tamaño orientativo |
| ------------------------ | ----------------------------------------------- | ----------------------------------------- | ------------------ |
| Portada                  | Fotografía horizontal de la sala o el escenario | `public/assets/images/portada-teatro.png` | 1600 × 1000 px     |
| La casa de Bernarda Alba | Afiche o fotografía vertical del montaje        | `public/assets/images/bernarda.svg`       | 600 × 750 px       |
| El avaro                 | Afiche o fotografía vertical del montaje        | `public/assets/images/avaro.svg`          | 600 × 750 px       |
| La vida es sueño         | Afiche o fotografía vertical del montaje        | `public/assets/images/sueno.svg`          | 600 × 750 px       |
| Archivo                  | Fotografías horizontales de escenas o ensayos   | `public/assets/images/archivo-*.svg`      | 1000 × 625 px      |

No renombres una fotografía `.jpg` como `.svg`: guarda cada imagen con su formato real, por ejemplo `.webp` o `.jpg`.

## Cambiar la portada

Guarda la nueva imagen en `public/assets/images/` y cambia la ruta del elemento `<img>` en `src/components/Hero.jsx`. Ajusta también el texto `alt` para describirla.

## Cambiar afiches y datos de obras

En modo PostgreSQL, las fichas se cargan de la tabla `obra`. Guarda el nuevo archivo en `public/assets/images/` y actualiza el nombre en pgAdmin. Por ejemplo:

```sql
UPDATE obra SET imagen = 'bernarda.webp' WHERE id_obra = 1;
```

En el modo visual sin base, cambia el campo `imagen` dentro de `public/data/teatro.json`. En ese campo se escribe solo el nombre del archivo, sin la carpeta `public/`. `db:setup` conserva registros existentes y no sobrescribe sus datos.

## Videos

Las fichas usan enlaces de referencia a producciones de otras compañías, definidos en `src/services/references.js`. En [REFERENCIAS.md](REFERENCIAS.md) están las fuentes. Al tener avances oficiales de la UCB, reemplaza esos enlaces y corrige el texto que identifica las producciones externas. El reproductor de YouTube se carga al pulsar el botón; su disponibilidad depende del propietario del video.

Mantén las imágenes con buena calidad y tamaño moderado, nombres sin espacios y textos alternativos descriptivos.
