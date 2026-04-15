# PACU Recovery Monitoring - Backend

This is the Node.js/TypeScript backend for the PACU (Post-Anesthesia Care Unit) Recovery Monitoring system. It uses Express, PostgreSQL, Prisma, and Socket.IO for real-time monitoring.

## 🚀 Quick Start (New System Deployment)

Follow these steps to set up the backend on a new laptop.

### 1. Prerequisites
- **Node.js**: v18 or higher (Download from [nodejs.org](https://nodejs.org/))
- **PostgreSQL**: v14 or higher (Download from [postgresql.org](https://www.postgresql.org/))
- **pgAdmin 4**: (Usually installed with PostgreSQL)

---

### 2. Database Setup via pgAdmin
1.  Open **pgAdmin 4**.
2.  Create a new Database named `pacu_db`.
3.  Right-click `pacu_db` and select **Query Tool**.
4.  Open the `database_schema.sql` file located in this folder.
5.  Copy the entire content of `database_schema.sql` and paste it into the Query Tool.
6.  Click **Execute (F5)**. 
    > [!NOTE]
    > This will create all necessary tables and add the default **Nurse** and **Doctor** accounts.

---

### 3. Environment Configuration
1.  In the `backend` folder, copy `.env.example` to a new file named `.env`.
2.  Open `.env` and configure your database connection:
    ```env
    PORT=5000
    DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/pacu_db"
    JWT_SECRET="any_long_random_string_here"
    CORS_ORIGIN="*"
    ADMIN_SECRET="setupSecret"
    ```
    Replace `YOUR_PASSWORD` with the password you set during PostgreSQL installation.

---

### 4. Installation & Startup
Open your terminal in the `backend` folder and run:

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Start the server (Development mode)
npm run dev
```

The server should now be running at `http://localhost:5000`.

---

### 5. Default Credentials
Once the database is imported, you can log in with:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Nurse** | `nurse1@nurse.com` | `Password@123` |
| **Doctor** | `doctor1@doctor.com` | `Password@123` |

---

## 🛠 Features & API
- **Real-time Vitals**: Updates via Socket.IO (`/realtime` namespace).
- **Patient Management**: Create episodes and record vitals.
- **Inter-disciplinary Chat**: Nursing and Medical staff communication.
- **Audit Logging**: All critical actions are tracked.

## 📁 Project Structure
- `src/controllers`: Request handlers.
- `src/realtime`: Socket.IO logic.
- `src/prisma`: Database schema and seeds.
- `src/middleware`: Auth and validation.
- `database_schema.sql`: Full database dump for manual import.
