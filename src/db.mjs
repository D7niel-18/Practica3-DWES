
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

// Creamos el pool de conexiones con PostgreSQL
const pool = new Pool({
    host: 'localhost',
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
});

// Mostramos un error si falla una conexion del pool
pool.on('error', (error) => {
    console.error('Error en el pool de PostgreSQL:', error.message);
});

export default pool;
