# Imágenes del portal

Se incorporaron los siete archivos entregados en `AssetsProyecto.zip`. Los originales se conservan sin recortar ni volver a comprimir. La presentación de cada imagen se adapta con CSS.

| Obra                         | Portada                                     | Galería adicional    |
| ---------------------------- | ------------------------------------------- | -------------------- |
| La casa de Bernarda Alba     | `public/assets/images/bernarda-alba.jpg`    | —                    |
| El avaro                     | `public/assets/images/el-avaro.jpg`         | —                    |
| La vida es sueño             | `public/assets/images/la-vida-es-sueno.jpg` | —                    |
| Sueño de una noche de verano | `public/assets/images/verano-portada.jpg`   | `verano-galeria.jpg` |
| Bodas de sangre              | `public/assets/images/bodas-portada.png`    | `bodas-galeria.png`  |

Las imágenes horizontales de portada y las verticales de afiche se muestran completas en las fichas. Las galerías se abren desde el archivo de obras.

Los fondos de las secciones reutilizan `portada-teatro.png`, con encuadres, luces y capas de color diferentes. Así se mantiene la relación visual con el escenario y el navegador descarga el recurso una sola vez. `src/styles/atmosphere.css` controla estos fondos.

`obra.imagen` guarda el nombre del archivo. `imagen_produccion` guarda las rutas y textos alternativos de las galerías. `db:setup` actualiza las rutas anteriores mediante una migración, sin borrar reservas ni repetir la actualización en cada ejecución.
