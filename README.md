# 🥤 Coca-Cola Kenya — Procurement Management System

A full-stack procurement management system built for **Coca-Cola Kenya** using **Django REST Framework** (backend) and **React + Vite** (frontend). The system covers the complete procurement lifecycle from purchase requisitions through to supplier invoice payment.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [API Endpoints](#api-endpoints)
- [Module Overview](#module-overview)
- [Default Credentials](#default-credentials)

---

## ✅ Features

| Module | Description |
|---|---|
| **Dashboard** | Real-time KPIs — suppliers, open POs, pending approvals, monthly spend |
| **Suppliers** | CRUD, status management (active / inactive / blacklisted), search & filter |
| **Categories** | Hierarchical item categories with parent/child relationships |
| **Items** | Full inventory catalogue with SKU, unit, pricing, reorder levels & low-stock alerts |
| **Purchase Requisitions** | Draft → Submit → Approve/Reject workflow with line items & priority levels |
| **Purchase Orders** | Create POs from scratch or from approved PRs; send to supplier, acknowledge, receive |
| **Goods Received Notes (GRN)** | Record deliveries against POs, capture accepted/rejected quantities, QC approval |
| **Invoices** | Supplier invoice management — pending → approve → mark paid; overdue tracking |
| **JWT Authentication** | Secure login/logout with access + refresh token rotation |

---

## 🛠 Tech Stack

### Backend
- **Django 4.2** — web framework
- **Django REST Framework** — API layer
- **SimpleJWT** — JSON Web Token authentication
- **django-cors-headers** — Cross-Origin Resource Sharing
- **django-filter** — Advanced query filtering
- **SQLite** (dev) — swap to PostgreSQL for production

### Frontend
- **React 18** — UI library
- **Vite** — fast dev server & bundler
- **Bootstrap Icons 1.11** — icon set
- **Plus Jakarta Sans / DM Serif Display** — Google Fonts
- Pure **CSS** with CSS Variables — no external UI framework

---

## 📁 Project Structure

```
coca_cola_procurement/
├── backend/
│   ├── core/
│   │   ├── __init__.py
│   │   ├── settings.py          # Django settings
│   │   ├── urls.py              # Root URL config (api/)
│   │   └── wsgi.py
│   ├── procurement/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models.py            # All data models
│   │   ├── serializers.py       # DRF serializers
│   │   ├── views.py             # ViewSets & API views
│   │   └── urls.py              # App-level URL router
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/
    ├── index.html               # Bootstrap Icons + Google Fonts + CSS vars
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx             # React entry point
        ├── App.jsx              # Router, Auth context, layout shell
        ├── index.css            # Global styles, cards, tables, modals
        ├── services/
        │   └── api.js           # All API calls (JWT-aware fetch wrapper)
        ├── components/
        │   ├── Sidebar.jsx      # Collapsible navigation sidebar
        │   ├── Sidebar.css
        │   ├── Navbar.jsx       # Top header with user menu
        │   └── Navbar.css
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Suppliers.jsx
            ├── Categories.jsx
            ├── Items.jsx
            ├── Requisitions.jsx
            ├── PurchaseOrders.jsx
            ├── GRNs.jsx
            └── Invoices.jsx
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- pip & npm

---

### Backend Setup

```bash
# 1. Navigate to backend directory
cd coca_cola_procurement/backend

# 2. Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate         # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run database migrations
python manage.py makemigrations
python manage.py migrate

# 5. Create a superuser (admin account)
python manage.py createsuperuser

# 6. (Optional) Load sample data
python manage.py loaddata fixtures/sample_data.json

# 7. Start the development server
python manage.py runserver
```

Backend will be available at: **http://localhost:8000**

Django Admin: **http://localhost:8000/admin/**

---

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd coca_cola_procurement/frontend

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

Frontend will be available at: **http://localhost:5173**

---

## 🔌 API Endpoints

All endpoints are prefixed with `/api/`

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/token/` | Login — returns access + refresh token |
| POST | `/api/auth/token/refresh/` | Refresh access token |

### Core Resources
| Endpoint | Methods | Description |
|---|---|---|
| `/api/dashboard/` | GET | Aggregated KPI metrics |
| `/api/suppliers/` | GET, POST | List / create suppliers |
| `/api/suppliers/{id}/` | GET, PUT, PATCH, DELETE | Supplier detail |
| `/api/suppliers/{id}/change_status/` | POST | Change supplier status |
| `/api/categories/` | GET, POST | Categories |
| `/api/items/` | GET, POST | Items |
| `/api/items/low_stock/` | GET | Items below reorder level |
| `/api/requisitions/` | GET, POST | Purchase Requisitions |
| `/api/requisitions/{id}/submit/` | POST | Submit PR for approval |
| `/api/requisitions/{id}/approve/` | POST | Approve PR |
| `/api/requisitions/{id}/reject/` | POST | Reject PR |
| `/api/purchase-orders/` | GET, POST | Purchase Orders |
| `/api/purchase-orders/{id}/send_to_supplier/` | POST | Send PO to supplier |
| `/api/purchase-orders/{id}/acknowledge/` | POST | Mark PO acknowledged |
| `/api/purchase-orders/{id}/cancel/` | POST | Cancel PO |
| `/api/grns/` | GET, POST | Goods Received Notes |
| `/api/grns/{id}/approve/` | POST | Approve GRN |
| `/api/grns/{id}/reject/` | POST | Reject GRN |
| `/api/invoices/` | GET, POST | Invoices |
| `/api/invoices/{id}/approve/` | POST | Approve invoice |
| `/api/invoices/{id}/mark_paid/` | POST | Mark invoice as paid |
| `/api/invoices/{id}/dispute/` | POST | Flag invoice as disputed |

### Query Parameters (all list endpoints)
- `?search=<term>` — full-text search
- `?status=<value>` — filter by status
- `?ordering=<field>` — sort results
- `?page=<n>` — pagination (20 per page)

---

## 📦 Module Overview

### Data Models

```
Supplier ──────────────────────────────┐
                                       │
Category → Item ──────────────────┐   │
                                  │   │
PurchaseRequisition               │   │
  └── RequisitionItem ────────────┘   │
        │                             │
        ▼                             │
PurchaseOrder ────────────────────────┘
  └── PurchaseOrderItem
        │
        ▼
GoodsReceivedNote
  └── GRNItem
        │
        ▼
Invoice
```

### Procurement Workflow

```
[Draft PR] → [Pending Approval] → [Approved] → [Purchase Order Created]
                                       │
                                       ▼
                              [PO: Draft] → [Sent to Supplier] → [Acknowledged]
                                                                       │
                                                                       ▼
                                                              [GRN: Pending QC]
                                                                       │
                                                                       ▼
                                                                  [GRN: Approved]
                                                                       │
                                                                       ▼
                                                              [Invoice: Pending]
                                                                       │
                                                               [Invoice: Approved]
                                                                       │
                                                                  [Invoice: Paid] ✅
```

---

## 🔐 Default Credentials

After running `createsuperuser`, use those credentials on the login page.

For the **Django Admin panel**, visit `/admin/` with the same superuser account.

---

## ⚙️ Production Considerations

1. **Change SECRET_KEY** in `settings.py` — use environment variables
2. **Set DEBUG=False** in production
3. **Use PostgreSQL** instead of SQLite — update `DATABASES` setting
4. **Configure ALLOWED_HOSTS** with your actual domain
5. **Set up CORS** properly — restrict `CORS_ALLOWED_ORIGINS`
6. **Serve static files** via WhiteNoise or a CDN
7. **Use gunicorn** or uWSGI as the WSGI server behind nginx

```bash
pip install gunicorn
gunicorn core.wsgi:application --bind 0.0.0.0:8000
```

---

## 📄 License

Internal use — Coca-Cola Beverages Africa, Kenya Division.

---

*Built with ❤️ for Coca-Cola Kenya Procurement Team*