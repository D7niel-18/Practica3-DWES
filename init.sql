
-- Creamos el esquema de la practica
CREATE SCHEMA practica_prestamos;

-- Creamos la tabla de equipos
CREATE TABLE practica_prestamos.equipos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,

    -- Los equipos empiezan disponibles por defecto
    disponible BOOLEAN NOT NULL DEFAULT TRUE,

    -- El codigo debe tener entre 1 y 20 caracteres
    CONSTRAINT chk_codigo
        CHECK (LENGTH(TRIM(codigo)) BETWEEN 1 AND 20),

    -- El nombre y la categoria no pueden estar vacios
    CONSTRAINT chk_nombre
        CHECK (LENGTH(TRIM(nombre)) > 0),

    CONSTRAINT chk_categoria
        CHECK (LENGTH(TRIM(categoria)) > 0)
);

-- Creamos la tabla de usuarios
CREATE TABLE practica_prestamos.usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,

    -- El nombre no puede estar vacio
    CONSTRAINT chk_nombre_usuario
        CHECK (LENGTH(TRIM(nombre)) > 0)
);

-- Creamos la tabla de prestamos
CREATE TABLE practica_prestamos.prestamos (
    id SERIAL PRIMARY KEY,
    equipo_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,

    -- Fecha automatica de realizacion del prestamo
    fecha_prestamo TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- NULL indica que el equipo sigue prestado
    fecha_devolucion TIMESTAMP DEFAULT NULL,

    -- Relacionamos el prestamo con un equipo existente
    CONSTRAINT fk_equipo
        FOREIGN KEY (equipo_id)
        REFERENCES practica_prestamos.equipos(id),

    -- Relacionamos el prestamo con un usuario existente
    CONSTRAINT fk_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES practica_prestamos.usuarios(id),

    -- La fecha de devolucion no puede ser anterior al prestamo
    CONSTRAINT chk_fechas
        CHECK (
            fecha_devolucion IS NULL
            OR fecha_devolucion >= fecha_prestamo
        )
);

-- Impedimos que un equipo tenga mas de un prestamo activo
CREATE UNIQUE INDEX idx_prestamo_activo
ON practica_prestamos.prestamos(equipo_id)
WHERE fecha_devolucion IS NULL;

-- Insertamos tres usuarios de prueba
INSERT INTO practica_prestamos.usuarios (nombre)
VALUES
    ('Daniel Jimenez'),
    ('Maria Garcia'),
    ('Carlos Lopez');

-- Insertamos diez equipos de diferentes categorias
INSERT INTO practica_prestamos.equipos
    (codigo, nombre, categoria)
VALUES
    ('PORT-001', 'Portatil HP ProBook', 'Portatil'),
    ('PORT-002', 'Portatil Lenovo ThinkPad', 'Portatil'),
    ('PORT-003', 'Portatil Dell Latitude', 'Portatil'),
    ('TAB-001', 'Tablet Samsung Galaxy Tab', 'Tablet'),
    ('TAB-002', 'Tablet Apple iPad', 'Tablet'),
    ('PROY-001', 'Proyector Epson', 'Proyector'),
    ('PROY-002', 'Proyector BenQ', 'Proyector'),
    ('MON-001', 'Monitor LG 24 pulgadas', 'Monitor'),
    ('RAT-001', 'Raton Logitech', 'Periferico'),
    ('TEC-001', 'Teclado mecanico Logitech', 'Periferico');
