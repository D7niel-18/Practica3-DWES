
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pool from './db.mjs';

import {
    obtenerEquipos,
    obtenerCategorias,
    obtenerEquipoPorId,
    obtenerHistorialEquipo
} from './equipos.repo.mjs';

// Creamos la aplicacion de Express
const app = express();

// Obtenemos la ruta de la carpeta actual
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuramos EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// Permitimos recibir datos JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Mostramos el listado de equipos
app.get('/equipos', async (req, res) => {
    try {
        // Leemos y normalizamos los filtros
        const busqueda = typeof req.query.busqueda === 'string'
            ? req.query.busqueda.trim()
            : '';

        const categoria = typeof req.query.categoria === 'string'
            ? req.query.categoria
            : '';

        let disponible = typeof req.query.disponible === 'string'
            ? req.query.disponible
            : '';

        if (!['', 'true', 'false'].includes(disponible)) {
            disponible = '';
        }

        let orden = typeof req.query.orden === 'string'
            ? req.query.orden
            : 'codigo';

        if (!['codigo', 'nombre'].includes(orden)) {
            orden = 'codigo';
        }

        // La pagina debe ser un numero entero mayor o igual que 1
        let pagina = 1;

        if (
            typeof req.query.page === 'string' &&
            /^\d+$/.test(req.query.page) &&
            Number(req.query.page) >= 1
        ) {
            pagina = Number(req.query.page);
        }

        const limite = 5;
        const offset = (pagina - 1) * limite;

        // Consultamos los equipos y las categorias
        const filtros = {
            busqueda,
            categoria,
            disponible,
            orden,
            limite,
            offset
        };

        const resultado = await obtenerEquipos(filtros);
        const categorias = await obtenerCategorias();

        const totalPaginas = Math.ceil(resultado.total / limite);

        // Conservamos los filtros en los enlaces de paginacion
        const parametros = new URLSearchParams();

        if (busqueda) parametros.set('busqueda', busqueda);
        if (categoria) parametros.set('categoria', categoria);
        if (disponible) parametros.set('disponible', disponible);

        parametros.set('orden', orden);

        res.render('equipos', {
            equipos: resultado.equipos,
            categorias,
            busqueda,
            categoria,
            disponible,
            orden,
            pagina,
            totalPaginas,
            filtrosQuery: parametros.toString()
        });

    } catch (error) {
        console.error('Error al obtener los equipos:', error.message);
        res.status(500).send('Error al consultar los equipos');
    }
});

// Mostramos el detalle de un equipo
app.get('/equipos/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // Comprobamos que el id sea un numero entero positivo
        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).send('El identificador no es valido');
        }

        // Buscamos el equipo
        const equipo = await obtenerEquipoPorId(id);

        // Comprobamos que exista
        if (!equipo) {
            return res.status(404).send('El equipo no existe');
        }

        // Consultamos su historial de prestamos
        const historial = await obtenerHistorialEquipo(id);

        res.render('equipo', {
            equipo,
            historial
        });

    } catch (error) {
        console.error('Error al obtener el equipo:', error.message);
        res.status(500).send('Error al consultar el equipo');
    }
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;

// Comprobamos la conexion con PostgreSQL antes de iniciar
try {
    await pool.query('SELECT 1');

    console.log('Conexion con PostgreSQL correcta');

    app.listen(PORT, () => {
        console.log(`Servidor iniciado en http://localhost:${PORT}`);
    });

} catch (error) {
    console.error('Error al conectar con PostgreSQL:', error.message);
    process.exit(1);
}
