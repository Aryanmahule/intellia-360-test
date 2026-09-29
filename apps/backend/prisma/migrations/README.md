# Legacy migrations — not used

The single folder here (`20260807000000_student_teacher_progress_models`)
contains **PostgreSQL** DDL: `CREATE TYPE … AS ENUM`, `TIMESTAMP(3)`,
`ADD CONSTRAINT … FOREIGN KEY`. It predates the move to MongoDB and is kept
only as a record of the original relational shape.

The live datasource is MongoDB (`provider = "mongodb"` in `schema.prisma`), and
the MongoDB connector does not use migrations at all. Schema and index changes
are applied with:

```bash
npx prisma db push        # or: npm run db:indexes
```

**Do not run `prisma migrate` on this project.** It is not supported by the
MongoDB connector, and the SQL in this folder does not describe the current
schema.
