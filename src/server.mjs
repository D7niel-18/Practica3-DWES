import pool from './db.mjs';
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Creamos la aplicacion de Express
const app = express();

// Obtenemos la ruta de la carpeta actual
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuramos EJS como motor de vistas
app.set('view engine', 'ejs');

// Indicamos donde se encuentran las vistas
app.set('views', path.join(__dirname, '../views'));

// Permitimos recibir datos en formato JSON
app.use(express.json());

// Permitimos recibir datos de formularios
app.use(express.urlencoded({ extended: false }));

// Iniciamos el servidor
const PORT = process.env.PORT || 3000;

// Comprobamos la conexion con PostgreSQL
try {
    await pool.query('SELECT 1');

    console.log('Conexion con PostgreSQL correcta');

    // Iniciamos el servidor
    app.listen(PORT, () => {
        console.log(`Servidor iniciado en http://localhost:${PORT}`);
    });

} catch (error) {
    console.error('Error al conectar con PostgreSQL:', error.message);
    process.exit(1);
}
