"""
Management command to seed the database with ~1 year of realistic procurement data
for a Coca-Cola Kenya procurement system.

Usage:
    python manage.py seed_data
    python manage.py seed_data --clear   # clears existing data first
"""

import random
from datetime import date, timedelta, datetime
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import (
    Supplier, Category, Item,
    PurchaseRequisition, RequisitionItem,
    PurchaseOrder, PurchaseOrderItem,
    GoodsReceivedNote, GRNItem,
    Invoice,
)


# ──────────────────────────────────────────────
# Seed constants
# ──────────────────────────────────────────────
SEED_START = date(2024, 4, 1)
SEED_END   = date(2025, 3, 31)   # full financial year

DEPARTMENTS = [
    "Production", "Packaging", "Logistics", "Quality Control",
    "Maintenance", "Sales & Distribution", "Administration", "IT",
]

SUPPLIER_DATA = [
    {"name": "Crown Beverages Ltd",          "code": "SUP001", "email": "orders@crownbev.co.ke",       "phone": "+254722100001", "contact_person": "James Mwangi",    "tax_id": "P051234567A", "status": "active"},
    {"name": "Nairobi Packaging Solutions",  "code": "SUP002", "email": "sales@nairobipkg.co.ke",      "phone": "+254733200002", "contact_person": "Grace Wanjiku",   "tax_id": "P051234568B", "status": "active"},
    {"name": "East Africa Chemicals Ltd",    "code": "SUP003", "email": "procurement@eachem.co.ke",    "phone": "+254700300003", "contact_person": "Peter Otieno",    "tax_id": "P051234569C", "status": "active"},
    {"name": "Kenya Sugar Board Supplies",   "code": "SUP004", "email": "supply@kenyasugar.co.ke",     "phone": "+254711400004", "contact_person": "Alice Njeri",     "tax_id": "P051234570D", "status": "active"},
    {"name": "Orbit Plastics Kenya",         "code": "SUP005", "email": "orders@orbitplastics.co.ke",  "phone": "+254722500005", "contact_person": "Samuel Kipchoge", "tax_id": "P051234571E", "status": "active"},
    {"name": "Techno Spares Africa",         "code": "SUP006", "email": "sales@technospares.co.ke",    "phone": "+254733600006", "contact_person": "Mary Achieng",    "tax_id": "P051234572F", "status": "active"},
    {"name": "Global Office Supplies",       "code": "SUP007", "email": "info@globalofficeke.com",     "phone": "+254700700007", "contact_person": "David Kamau",     "tax_id": "P051234573G", "status": "active"},
    {"name": "Summit Industrial Gases",      "code": "SUP008", "email": "orders@summitgases.co.ke",    "phone": "+254711800008", "contact_person": "Fatuma Hassan",   "tax_id": "P051234574H", "status": "active"},
    {"name": "Greenfield Agro Supplies",     "code": "SUP009", "email": "supply@greenfieldagro.co.ke", "phone": "+254722900009", "contact_person": "John Mutua",      "tax_id": "P051234575I", "status": "active"},
    {"name": "Allied Maintenance Services",  "code": "SUP010", "email": "info@alliedmaint.co.ke",      "phone": "+254733000010", "contact_person": "Rose Wambui",     "tax_id": "P051234576J", "status": "inactive"},
    {"name": "FastTrack Logistics Kenya",    "code": "SUP011", "email": "ops@fasttrackke.com",         "phone": "+254700100011", "contact_person": "Kevin Ochieng",   "tax_id": "P051234577K", "status": "active"},
    {"name": "ProChem Industries",           "code": "SUP012", "email": "sales@prochemke.co.ke",       "phone": "+254711200012", "contact_person": "Lydia Muthoni",   "tax_id": "P051234578L", "status": "blacklisted"},
]

CATEGORY_DATA = [
    {"name": "Raw Materials",       "code": "RM",  "parent": None},
    {"name": "Sweeteners",          "code": "RM01","parent": "RM"},
    {"name": "CO2 & Gases",         "code": "RM02","parent": "RM"},
    {"name": "Concentrate",         "code": "RM03","parent": "RM"},
    {"name": "Packaging",           "code": "PKG", "parent": None},
    {"name": "PET Bottles",         "code": "PKG1","parent": "PKG"},
    {"name": "Crowns & Caps",       "code": "PKG2","parent": "PKG"},
    {"name": "Labels & Sleeves",    "code": "PKG3","parent": "PKG"},
    {"name": "Cartons & Cases",     "code": "PKG4","parent": "PKG"},
    {"name": "Spare Parts",         "code": "SPR", "parent": None},
    {"name": "Electrical Parts",    "code": "SPR1","parent": "SPR"},
    {"name": "Mechanical Parts",    "code": "SPR2","parent": "SPR"},
    {"name": "Consumables",         "code": "CON", "parent": None},
    {"name": "Cleaning Chemicals",  "code": "CON1","parent": "CON"},
    {"name": "Office Supplies",     "code": "CON2","parent": "CON"},
    {"name": "Safety Equipment",    "code": "CON3","parent": "CON"},
]

ITEM_DATA = [
    # Sweeteners
    {"name": "Refined White Sugar",          "sku": "RM01-001", "cat": "RM01", "unit": "kg",  "price": "85.00",  "reorder": 5000, "stock": 15000},
    {"name": "High Fructose Corn Syrup",     "sku": "RM01-002", "cat": "RM01", "unit": "kg",  "price": "110.00", "reorder": 2000, "stock": 6000},
    # Gases
    {"name": "Food Grade CO2",               "sku": "RM02-001", "cat": "RM02", "unit": "kg",  "price": "45.00",  "reorder": 500,  "stock": 1200},
    {"name": "Nitrogen Gas",                 "sku": "RM02-002", "cat": "RM02", "unit": "kg",  "price": "55.00",  "reorder": 200,  "stock": 600},
    # Concentrate
    {"name": "Coca-Cola Concentrate 5X",     "sku": "RM03-001", "cat": "RM03", "unit": "ltr", "price": "4500.00","reorder": 100,  "stock": 350},
    {"name": "Sprite Concentrate 5X",        "sku": "RM03-002", "cat": "RM03", "unit": "ltr", "price": "4200.00","reorder": 80,   "stock": 280},
    {"name": "Fanta Orange Concentrate 5X",  "sku": "RM03-003", "cat": "RM03", "unit": "ltr", "price": "4100.00","reorder": 80,   "stock": 300},
    # PET Bottles
    {"name": "PET Preform 500ml",            "sku": "PKG1-001", "cat": "PKG1", "unit": "pcs", "price": "12.50",  "reorder": 20000,"stock": 60000},
    {"name": "PET Preform 1.5L",             "sku": "PKG1-002", "cat": "PKG1", "unit": "pcs", "price": "18.00",  "reorder": 15000,"stock": 40000},
    {"name": "PET Preform 2L",               "sku": "PKG1-003", "cat": "PKG1", "unit": "pcs", "price": "22.00",  "reorder": 10000,"stock": 28000},
    # Crowns & Caps
    {"name": "Crown Caps 26mm",              "sku": "PKG2-001", "cat": "PKG2", "unit": "box", "price": "850.00", "reorder": 200,  "stock": 650},
    {"name": "PET Screw Caps 28mm",          "sku": "PKG2-002", "cat": "PKG2", "unit": "box", "price": "780.00", "reorder": 150,  "stock": 500},
    # Labels
    {"name": "Coca-Cola Label 500ml",        "sku": "PKG3-001", "cat": "PKG3", "unit": "box", "price": "1200.00","reorder": 100,  "stock": 350},
    {"name": "Sprite Label 500ml",           "sku": "PKG3-002", "cat": "PKG3", "unit": "box", "price": "1150.00","reorder": 100,  "stock": 320},
    # Cartons
    {"name": "Display Carton 24x500ml",      "sku": "PKG4-001", "cat": "PKG4", "unit": "pcs", "price": "55.00",  "reorder": 5000, "stock": 15000},
    {"name": "Shrink Wrap Film",             "sku": "PKG4-002", "cat": "PKG4", "unit": "kg",  "price": "320.00", "reorder": 500,  "stock": 1500},
    # Electrical parts
    {"name": "Variable Frequency Drive 15kW","sku": "SPR1-001", "cat": "SPR1", "unit": "pcs", "price": "45000.00","reorder": 2,   "stock": 5},
    {"name": "Contactor 25A",                "sku": "SPR1-002", "cat": "SPR1", "unit": "pcs", "price": "3500.00", "reorder": 10,  "stock": 25},
    {"name": "Circuit Breaker 63A",          "sku": "SPR1-003", "cat": "SPR1", "unit": "pcs", "price": "4200.00", "reorder": 5,   "stock": 12},
    # Mechanical parts
    {"name": "Bearing SKF 6205",             "sku": "SPR2-001", "cat": "SPR2", "unit": "pcs", "price": "1800.00", "reorder": 20,  "stock": 55},
    {"name": "V-Belt A48",                   "sku": "SPR2-002", "cat": "SPR2", "unit": "pcs", "price": "650.00",  "reorder": 30,  "stock": 80},
    {"name": "Stainless Steel Pump Seal",    "sku": "SPR2-003", "cat": "SPR2", "unit": "pcs", "price": "8500.00", "reorder": 5,   "stock": 15},
    # Cleaning chemicals
    {"name": "CIP Caustic Soda 50kg",        "sku": "CON1-001", "cat": "CON1", "unit": "kg",  "price": "180.00",  "reorder": 500, "stock": 1500},
    {"name": "Peracetic Acid 5L",            "sku": "CON1-002", "cat": "CON1", "unit": "ltr", "price": "2800.00", "reorder": 50,  "stock": 150},
    {"name": "Floor Cleaning Detergent 20L", "sku": "CON1-003", "cat": "CON1", "unit": "ltr", "price": "1500.00", "reorder": 20,  "stock": 60},
    # Office supplies
    {"name": "A4 Copy Paper (500 sheets)",   "sku": "CON2-001", "cat": "CON2", "unit": "box", "price": "550.00",  "reorder": 50,  "stock": 150},
    {"name": "Printer Toner HP 85A",         "sku": "CON2-002", "cat": "CON2", "unit": "pcs", "price": "3200.00", "reorder": 5,   "stock": 15},
    {"name": "Ballpoint Pens Box",           "sku": "CON2-003", "cat": "CON2", "unit": "box", "price": "350.00",  "reorder": 20,  "stock": 60},
    # Safety equipment
    {"name": "Safety Helmet (EN397)",        "sku": "CON3-001", "cat": "CON3", "unit": "pcs", "price": "1200.00", "reorder": 20,  "stock": 50},
    {"name": "Chemical Resistant Gloves",    "sku": "CON3-002", "cat": "CON3", "unit": "pcs", "price": "450.00",  "reorder": 50,  "stock": 150},
    {"name": "Safety Boots (Size 42)",       "sku": "CON3-003", "cat": "CON3", "unit": "pcs", "price": "3500.00", "reorder": 10,  "stock": 30},
]

# Maps category code -> acceptable supplier codes
CATEGORY_SUPPLIERS = {
    "RM01": ["SUP004", "SUP009"],
    "RM02": ["SUP008"],
    "RM03": ["SUP001"],
    "PKG1": ["SUP005", "SUP002"],
    "PKG2": ["SUP002", "SUP005"],
    "PKG3": ["SUP002"],
    "PKG4": ["SUP002", "SUP005"],
    "SPR1": ["SUP006"],
    "SPR2": ["SUP006", "SUP010"],
    "CON1": ["SUP003"],
    "CON2": ["SUP007"],
    "CON3": ["SUP007", "SUP003"],
}


def rand_date(start: date, end: date) -> date:
    return start + timedelta(days=random.randint(0, (end - start).days))


def date_to_dt(d: date):
    return timezone.make_aware(datetime.combine(d, datetime.min.time()))


class Command(BaseCommand):
    help = "Seed one year of realistic procurement data (Apr 2024 – Mar 2025)"

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Delete existing data before seeding")

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing existing procurement data…"))
            Invoice.objects.all().delete()
            GRNItem.objects.all().delete()
            GoodsReceivedNote.objects.all().delete()
            PurchaseOrderItem.objects.all().delete()
            PurchaseOrder.objects.all().delete()
            RequisitionItem.objects.all().delete()
            PurchaseRequisition.objects.all().delete()
            Item.objects.all().delete()
            Category.objects.all().delete()
            Supplier.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Data cleared.\n"))

        random.seed(42)

        # ── Users ────────────────────────────────────────────────────────────
        self.stdout.write("Creating users…")
        users = self._create_users()

        # ── Suppliers ────────────────────────────────────────────────────────
        self.stdout.write("Creating suppliers…")
        suppliers = self._create_suppliers()

        # ── Categories ───────────────────────────────────────────────────────
        self.stdout.write("Creating categories…")
        categories = self._create_categories()

        # ── Items ────────────────────────────────────────────────────────────
        self.stdout.write("Creating items…")
        items = self._create_items(categories)

        # ── Transactions (PRs → POs → GRNs → Invoices) ───────────────────────
        self.stdout.write("Creating procurement transactions…")
        self._create_transactions(users, suppliers, items, categories)

        self.stdout.write(self.style.SUCCESS("\n✔ Seed complete!"))
        self._print_summary()

    # ─────────────────────────────────────────────────────────────────────────
    # Builders
    # ─────────────────────────────────────────────────────────────────────────

    def _create_users(self):
        user_specs = [
            ("admin",       "Admin",       "User",       True,  True),
            ("john.mutua",  "John",        "Mutua",      False, False),
            ("grace.w",     "Grace",       "Wanjiku",    False, False),
            ("peter.o",     "Peter",       "Otieno",     False, False),
            ("alice.n",     "Alice",       "Njeri",      False, False),
            ("samuel.k",    "Samuel",      "Kipchoge",   False, False),
            ("mary.a",      "Mary",        "Achieng",    False, False),
            ("david.k",     "David",       "Kamau",      False, False),
            ("manager1",    "Production",  "Manager",    False, True),
            ("manager2",    "Procurement", "Manager",    False, True),
        ]
        users = []
        for uname, first, last, is_super, is_staff in user_specs:
            u, _ = User.objects.get_or_create(
                username=uname,
                defaults=dict(
                    first_name=first,
                    last_name=last,
                    email=f"{uname}@coca-cola.co.ke",
                    is_superuser=is_super,
                    is_staff=is_staff,
                ),
            )
            u.set_password("password123")
            u.save()
            users.append(u)
        return users

    def _create_suppliers(self):
        suppliers = {}
        for d in SUPPLIER_DATA:
            s, _ = Supplier.objects.get_or_create(
                code=d["code"],
                defaults={
                    "name": d["name"],
                    "email": d["email"],
                    "phone": d["phone"],
                    "address": f"P.O. Box {random.randint(1000,9999)}, Nairobi, Kenya",
                    "contact_person": d["contact_person"],
                    "status": d["status"],
                    "tax_id": d["tax_id"],
                    "payment_terms": random.choice([14, 30, 45, 60]),
                },
            )
            suppliers[d["code"]] = s
        return suppliers

    def _create_categories(self):
        cats = {}
        # First pass: top-level
        for d in CATEGORY_DATA:
            if d["parent"] is None:
                c, _ = Category.objects.get_or_create(
                    code=d["code"],
                    defaults={"name": d["name"], "description": f"{d['name']} category"},
                )
                cats[d["code"]] = c
        # Second pass: children
        for d in CATEGORY_DATA:
            if d["parent"] is not None:
                c, _ = Category.objects.get_or_create(
                    code=d["code"],
                    defaults={
                        "name": d["name"],
                        "description": f"{d['name']} sub-category",
                        "parent": cats[d["parent"]],
                    },
                )
                cats[d["code"]] = c
        return cats

    def _create_items(self, categories):
        items = {}
        for d in ITEM_DATA:
            it, _ = Item.objects.get_or_create(
                sku=d["sku"],
                defaults={
                    "name": d["name"],
                    "category": categories[d["cat"]],
                    "unit": d["unit"],
                    "unit_price": Decimal(d["price"]),
                    "reorder_level": d["reorder"],
                    "current_stock": d["stock"],
                    "is_active": True,
                },
            )
            items[d["sku"]] = it
        return items

    def _create_transactions(self, users, suppliers, items, categories):
        """
        Generate ~120 PR → PO → GRN → Invoice chains spread across the year.
        Some PRs stay as draft/rejected, some POs are partially received, etc.
        """
        requestors = [u for u in users if not u.is_superuser]
        approvers  = [u for u in users if u.is_staff]
        creators   = requestors

        item_list = list(items.values())

        pr_counter  = 1
        po_counter  = 1
        grn_counter = 1
        inv_counter = 1

        # Spread ~10 PRs per month across 12 months
        for month_offset in range(12):
            month_start = SEED_START + timedelta(days=month_offset * 30)
            month_end   = month_start + timedelta(days=29)
            if month_end > SEED_END:
                month_end = SEED_END

            num_prs = random.randint(8, 14)
            for _ in range(num_prs):
                pr_date    = rand_date(month_start, month_end)
                req_user   = random.choice(requestors)
                dept       = random.choice(DEPARTMENTS)
                priority   = random.choices(
                    ["low", "medium", "high", "urgent"],
                    weights=[10, 50, 30, 10]
                )[0]

                # Determine status with realistic distribution
                if pr_date > SEED_END - timedelta(days=7):
                    pr_status = "draft"
                else:
                    pr_status = random.choices(
                        ["draft", "pending", "approved", "rejected", "cancelled"],
                        weights=[5, 10, 70, 10, 5]
                    )[0]

                pr_number = f"PR-2024-{pr_counter:04d}"
                pr_counter += 1

                # Pick 1-4 items for this PR
                selected_items = random.sample(item_list, k=random.randint(1, 4))
                total = Decimal("0")
                ri_data = []
                for it in selected_items:
                    qty  = Decimal(str(random.randint(10, 500)))
                    price = it.unit_price * Decimal(str(random.uniform(0.9, 1.1))).quantize(Decimal("0.01"))
                    ri_data.append((it, qty, price))
                    total += qty * price

                pr = PurchaseRequisition.objects.create(
                    pr_number=pr_number,
                    title=f"{dept} - {selected_items[0].name} Requisition",
                    requested_by=req_user,
                    department=dept,
                    status=pr_status,
                    priority=priority,
                    required_date=pr_date + timedelta(days=random.randint(7, 30)),
                    notes=f"Monthly procurement for {dept} department.",
                    total_amount=total,
                    created_at=date_to_dt(pr_date),
                    approved_by=random.choice(approvers) if pr_status == "approved" else None,
                    approved_at=date_to_dt(pr_date + timedelta(days=random.randint(1, 3))) if pr_status == "approved" else None,
                )

                for it, qty, price in ri_data:
                    RequisitionItem.objects.create(
                        requisition=pr,
                        item=it,
                        quantity=qty,
                        estimated_unit_price=price,
                        total_price=qty * price,
                    )

                # Only approved PRs proceed to PO
                if pr_status != "approved":
                    continue

                # ── Purchase Order ────────────────────────────────────────
                po_date      = pr_date + timedelta(days=random.randint(1, 5))
                po_status    = random.choices(
                    ["draft", "sent", "acknowledged", "partial", "received", "cancelled"],
                    weights=[3, 10, 10, 15, 57, 5]
                )[0]
                po_number    = f"PO-2024-{po_counter:04d}"
                po_counter  += 1

                # Pick supplier based on first item's category
                first_item_cat = selected_items[0].category.code
                sup_codes = CATEGORY_SUPPLIERS.get(first_item_cat, list(suppliers.keys()))
                # Filter to active suppliers only
                active_sup_codes = [c for c in sup_codes if suppliers.get(c) and suppliers[c].status == "active"]
                if not active_sup_codes:
                    active_sup_codes = [k for k, v in suppliers.items() if v.status == "active"]
                sup = suppliers[random.choice(active_sup_codes)]

                tax_rate  = Decimal("16.00")
                subtotal  = total
                tax_amt   = (subtotal * tax_rate / 100).quantize(Decimal("0.01"))
                total_amt = subtotal + tax_amt

                po = PurchaseOrder.objects.create(
                    po_number=po_number,
                    requisition=pr,
                    supplier=sup,
                    status=po_status,
                    expected_delivery=po_date + timedelta(days=random.randint(7, 21)),
                    payment_terms=sup.payment_terms,
                    subtotal=subtotal,
                    tax_rate=tax_rate,
                    tax_amount=tax_amt,
                    total_amount=total_amt,
                    notes=f"PO raised from {pr_number}.",
                    created_by=random.choice(creators),
                )
                # Manually set order_date (auto_now_add won't allow this normally)
                PurchaseOrder.objects.filter(pk=po.pk).update(
                    order_date=po_date,
                    created_at=date_to_dt(po_date),
                )

                po_items = []
                for it, qty, price in ri_data:
                    poi = PurchaseOrderItem.objects.create(
                        purchase_order=po,
                        item=it,
                        quantity=qty,
                        unit_price=price,
                        total_price=qty * price,
                        quantity_received=Decimal("0"),
                    )
                    po_items.append(poi)

                # ── GRN ──────────────────────────────────────────────────
                if po_status not in ("received", "partial", "acknowledged"):
                    continue

                num_grns = 1 if po_status == "received" else random.randint(1, 2)
                remaining = {poi.pk: poi.quantity for poi in po_items}

                for g in range(num_grns):
                    grn_date   = po_date + timedelta(days=random.randint(7, 25))
                    grn_status = random.choices(
                        ["pending", "approved", "rejected", "partial"],
                        weights=[10, 75, 5, 10]
                    )[0]
                    grn_number = f"GRN-2024-{grn_counter:04d}"
                    grn_counter += 1

                    grn = GoodsReceivedNote.objects.create(
                        grn_number=grn_number,
                        purchase_order=po,
                        received_by=random.choice(requestors),
                        received_date=grn_date,
                        status=grn_status,
                        delivery_note_number=f"DN{random.randint(10000,99999)}",
                        notes="Delivery received at warehouse.",
                    )
                    GoodsReceivedNote.objects.filter(pk=grn.pk).update(
                        created_at=date_to_dt(grn_date)
                    )

                    for poi in po_items:
                        recv_qty = remaining.get(poi.pk, Decimal("0"))
                        if recv_qty <= 0:
                            continue
                        if po_status == "partial" and g == 0:
                            recv_qty = (recv_qty * Decimal(str(random.uniform(0.4, 0.7)))).quantize(Decimal("0.01"))
                        rejected = Decimal("0")
                        if random.random() < 0.05:                      # 5% rejection chance
                            rejected = (recv_qty * Decimal("0.05")).quantize(Decimal("0.01"))
                        accepted = recv_qty - rejected

                        GRNItem.objects.create(
                            grn=grn,
                            po_item=poi,
                            quantity_received=recv_qty,
                            quantity_accepted=accepted,
                            quantity_rejected=rejected,
                            rejection_reason="Quality failure" if rejected > 0 else "",
                        )
                        PurchaseOrderItem.objects.filter(pk=poi.pk).update(
                            quantity_received=accepted
                        )
                        remaining[poi.pk] = remaining.get(poi.pk, Decimal("0")) - recv_qty

                    # ── Invoice ──────────────────────────────────────────
                    if grn_status != "approved":
                        continue

                    inv_date = grn_date + timedelta(days=random.randint(1, 5))
                    due_date = inv_date + timedelta(days=sup.payment_terms)

                    inv_status = random.choices(
                        ["pending", "approved", "paid", "overdue", "disputed"],
                        weights=[10, 15, 60, 10, 5]
                    )[0]
                    paid_date = None
                    if inv_status == "paid":
                        paid_date = inv_date + timedelta(days=random.randint(5, sup.payment_terms))

                    Invoice.objects.create(
                        invoice_number=f"INV-2024-{inv_counter:04d}",
                        supplier_invoice_number=f"SINV{random.randint(100000,999999)}",
                        purchase_order=po,
                        supplier=sup,
                        invoice_date=inv_date,
                        due_date=due_date,
                        subtotal=subtotal,
                        tax_amount=tax_amt,
                        total_amount=total_amt,
                        status=inv_status,
                        paid_date=paid_date,
                        notes="Invoice processed by accounts payable.",
                    )
                    inv_counter += 1

        self.stdout.write(
            f"  PRs={PurchaseRequisition.objects.count()}  "
            f"POs={PurchaseOrder.objects.count()}  "
            f"GRNs={GoodsReceivedNote.objects.count()}  "
            f"Invoices={Invoice.objects.count()}"
        )

    def _print_summary(self):
        self.stdout.write("\n── Summary ─────────────────────────────────────")
        self.stdout.write(f"  Users      : {User.objects.count()}")
        self.stdout.write(f"  Suppliers  : {Supplier.objects.count()}")
        self.stdout.write(f"  Categories : {Category.objects.count()}")
        self.stdout.write(f"  Items      : {Item.objects.count()}")
        self.stdout.write(f"  PRs        : {PurchaseRequisition.objects.count()}")
        self.stdout.write(f"  POs        : {PurchaseOrder.objects.count()}")
        self.stdout.write(f"  GRNs       : {GoodsReceivedNote.objects.count()}")
        self.stdout.write(f"  Invoices   : {Invoice.objects.count()}")
        self.stdout.write("────────────────────────────────────────────────")