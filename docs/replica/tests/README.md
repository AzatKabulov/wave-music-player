# Local schema checks

These tests create a disposable in-memory PostgreSQL instance through PGlite. They do not use a cloud project, credentials, email, object storage, or native apps. Provider users and roles are minimal fixtures; managed-service deployment and real authentication still need separate verification.

From this directory, with Node.js/npm available:

```powershell
npm ci --ignore-scripts
npm test
```

The pinned test-only package and its integrity are recorded in package-lock.json. Dependency scripts are disabled. Tests run ../schema.sql and schema.test.sql, then write ../schema-validation.json with the executed schema/test hashes, PostgreSQL version, and passing check names.

Use only a disposable test database for schema.test.sql. It inserts provider-user fixtures and changes roles inside a rolled-back transaction; it is not an application migration or a production verification script.
