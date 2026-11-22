# Backend

The backend is the API and data-processing layer for the Inventory Management System. It provides authenticated endpoints for products, branches, categories, stock, sales and other transactions, reports, announcements, and operating expenses.

It uses Express and Prisma with PostgreSQL, Socket.IO for real-time updates, and Redis/BullMQ for scheduled reporting and maintenance jobs. The health endpoint is `GET /health`.

For environment variables, local setup, migrations, demo seeding, Docker, and deployment, see the [setup guide](../docs/README.md#local-development). For the product overview and screenshots, see the [main README](../README.md).