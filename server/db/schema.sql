-- Ejecutar sobre una base PostgreSQL vacía. No borra registros existentes.
CREATE TABLE IF NOT EXISTS dramaturgo(id_dramaturgo integer PRIMARY KEY,nombre_completo text NOT NULL,biografia text);
CREATE TABLE IF NOT EXISTS obra(id_obra integer PRIMARY KEY,titulo text NOT NULL,genero text NOT NULL,sinopsis text NOT NULL,duracion_minutos integer NOT NULL CHECK(duracion_minutos>0),imagen text NOT NULL,video_avance_url text);
CREATE TABLE IF NOT EXISTS obra_dramaturgo(id_obra integer NOT NULL REFERENCES obra,id_dramaturgo integer NOT NULL REFERENCES dramaturgo,PRIMARY KEY(id_obra,id_dramaturgo));
CREATE TABLE IF NOT EXISTS sala(id_sala integer PRIMARY KEY,nombre text NOT NULL,descripcion text,activa boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS butaca(id_butaca integer PRIMARY KEY,id_sala integer NOT NULL REFERENCES sala,fila text NOT NULL,numero integer NOT NULL,posicion_x integer NOT NULL,posicion_y integer NOT NULL,activa boolean NOT NULL DEFAULT true,UNIQUE(id_sala,fila,numero));
CREATE TABLE IF NOT EXISTS produccion(id_produccion integer PRIMARY KEY,id_obra integer NOT NULL REFERENCES obra,nombre_montaje text NOT NULL,temporada text,fecha_estreno date,estado text NOT NULL CHECK(estado IN ('CARTELERA','ARCHIVO')));
CREATE TABLE IF NOT EXISTS funcion(id_funcion integer PRIMARY KEY,id_produccion integer NOT NULL REFERENCES produccion,id_sala integer NOT NULL REFERENCES sala,fecha_hora_inicio timestamptz NOT NULL,fecha_hora_fin timestamptz NOT NULL,estado text NOT NULL CHECK(estado IN ('PROGRAMADA','CANCELADA')),CHECK(fecha_hora_fin>fecha_hora_inicio));
CREATE TABLE IF NOT EXISTS funcion_butaca(id_funcion integer NOT NULL REFERENCES funcion,id_butaca integer NOT NULL REFERENCES butaca,habilitada boolean NOT NULL DEFAULT true,PRIMARY KEY(id_funcion,id_butaca));
CREATE TABLE IF NOT EXISTS imagen_produccion(id_imagen integer PRIMARY KEY,id_produccion integer NOT NULL REFERENCES produccion,url_original text NOT NULL,url_pequena text NOT NULL,texto_alternativo text NOT NULL,orden integer NOT NULL);
CREATE TABLE IF NOT EXISTS resena(id_resena integer PRIMARY KEY,id_produccion integer NOT NULL REFERENCES produccion,nombre_autor text NOT NULL,contenido text NOT NULL,fecha_publicacion date);
CREATE TABLE IF NOT EXISTS taller(id_taller integer PRIMARY KEY,titulo text NOT NULL,descripcion text NOT NULL,convocatoria_texto text NOT NULL,horario text NOT NULL,fecha_inicio date NOT NULL,fecha_fin date NOT NULL,fecha_limite_inscripcion date NOT NULL,cupo_maximo integer NOT NULL CHECK(cupo_maximo>0),estado text NOT NULL CHECK(estado IN ('ABIERTO','CERRADO')));
-- Se conserva visitor_key para leer las reservas de versiones anteriores.
CREATE TABLE IF NOT EXISTS reserva(id_reserva uuid PRIMARY KEY,id_funcion integer NOT NULL REFERENCES funcion,nombre_contacto varchar(80) NOT NULL,correo_contacto varchar(120) NOT NULL,codigo_reserva varchar(30) UNIQUE NOT NULL,estado text NOT NULL CHECK(estado IN ('CONFIRMADA','CANCELADA')),creada_en timestamptz NOT NULL DEFAULT now(),visitor_key uuid NOT NULL);
CREATE TABLE IF NOT EXISTS reserva_butaca(id_reserva uuid NOT NULL REFERENCES reserva,id_funcion integer NOT NULL,id_butaca integer NOT NULL,activa boolean NOT NULL DEFAULT true,PRIMARY KEY(id_reserva,id_butaca),FOREIGN KEY(id_funcion,id_butaca) REFERENCES funcion_butaca);
CREATE UNIQUE INDEX IF NOT EXISTS uq_butaca_activa ON reserva_butaca(id_funcion,id_butaca) WHERE activa;
CREATE INDEX IF NOT EXISTS ix_reserva_visitante ON reserva(visitor_key,creada_en DESC);
CREATE INDEX IF NOT EXISTS ix_funcion_inicio ON funcion(fecha_hora_inicio);
CREATE TABLE IF NOT EXISTS inscripcion_taller(id_inscripcion uuid PRIMARY KEY,id_taller integer NOT NULL REFERENCES taller,nombre_participante varchar(80) NOT NULL,correo_participante varchar(120) NOT NULL,visitor_key uuid NOT NULL,fecha_inscripcion timestamptz NOT NULL DEFAULT now(),estado text NOT NULL CHECK(estado IN ('INSCRITA','CANCELADA')));
CREATE UNIQUE INDEX IF NOT EXISTS uq_taller_correo_activo ON inscripcion_taller(id_taller,lower(correo_participante)) WHERE estado='INSCRITA';
CREATE INDEX IF NOT EXISTS ix_inscripcion_visitante ON inscripcion_taller(visitor_key,fecha_inscripcion DESC);
CREATE TABLE IF NOT EXISTS ocupacion_ejemplo(id_funcion integer NOT NULL,id_butaca integer NOT NULL,vigente boolean NOT NULL DEFAULT true,PRIMARY KEY(id_funcion,id_butaca),FOREIGN KEY(id_funcion,id_butaca) REFERENCES funcion_butaca);

-- Las reservas anteriores se conservan con id_usuario NULL.
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario uuid PRIMARY KEY,
  nombre varchar(80) NOT NULL,
  correo varchar(120) NOT NULL,
  clave_hash text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_correo ON usuario (lower(correo));
CREATE TABLE IF NOT EXISTS sesion_usuario (
  token_hash text PRIMARY KEY,
  id_usuario uuid NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  expira_en timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_sesion_usuario ON sesion_usuario(id_usuario);
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS id_usuario uuid REFERENCES usuario(id_usuario);
ALTER TABLE inscripcion_taller ADD COLUMN IF NOT EXISTS id_usuario uuid REFERENCES usuario(id_usuario);
CREATE INDEX IF NOT EXISTS ix_reserva_usuario ON reserva(id_usuario,creada_en DESC);
CREATE INDEX IF NOT EXISTS ix_inscripcion_usuario ON inscripcion_taller(id_usuario);

-- Permisos de administración. Las cuentas nuevas siempre son espectadores.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS rol text NOT NULL DEFAULT 'USUARIO' CHECK (rol IN ('USUARIO','ADMIN'));
CREATE TABLE IF NOT EXISTS cambio_butaca (
  id_cambio bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario uuid NOT NULL REFERENCES usuario,
  id_funcion integer NOT NULL,
  id_butaca integer NOT NULL,
  habilitada boolean NOT NULL,
  cambiado_en timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (id_funcion,id_butaca) REFERENCES funcion_butaca
);

CREATE INDEX IF NOT EXISTS ix_reserva_funcion_estado ON reserva(id_funcion,estado);
CREATE INDEX IF NOT EXISTS ix_reserva_creada ON reserva(creada_en DESC);
CREATE TABLE IF NOT EXISTS migracion_aplicada(nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS cambio_funcion (
  id_cambio bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario uuid NOT NULL REFERENCES usuario,
  id_funcion integer NOT NULL REFERENCES funcion,
  inicio_anterior timestamptz NOT NULL,
  inicio_nuevo timestamptz NOT NULL,
  cambiado_en timestamptz NOT NULL DEFAULT now()
);
