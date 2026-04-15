const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
    try {
        console.log("Checking unique indexes in the database...");
        const indexes = await prisma.$queryRaw`
            SELECT
                i.relname as index_name,
                a.attname as column_name,
                ix.indisunique as is_unique
            FROM
                pg_class t,
                pg_class i,
                pg_index ix,
                pg_attribute a
            WHERE
                t.oid = ix.indisrelid
                AND i.oid = ix.indexrelid
                AND a.attrelid = t.oid
                AND a.attnum = ANY(ix.indkey)
                AND t.relkind = 'r'
                AND t.relname = 'User'
            ORDER BY
                t.relname,
                i.relname;
        `;
        console.log("Indexes on User table:", JSON.stringify(indexes, null, 2));

    } catch (e) {
        console.error("Error querying schema:", e);
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
