"""
core/admin.py  –  Coca-Cola Kenya Procurement Management System
Customised Django Admin with rich list displays, filters, inlines,
actions, and branded site headers.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.db.models import Sum, Count, Q
from django.urls import reverse
from django.utils import timezone
from decimal import Decimal

from .models import (
    Supplier, Category, Item,
    PurchaseRequisition, RequisitionItem,
    PurchaseOrder, PurchaseOrderItem,
    GoodsReceivedNote, GRNItem,
    Invoice,
)

# ─────────────────────────────────────────────────────────────────
# Admin site branding
# ─────────────────────────────────────────────────────────────────
admin.site.site_header  = mark_safe(
    '<span style="color:#F40009;font-weight:900;font-size:1.3rem;'
    'letter-spacing:-0.5px;">🥤 Coca-Cola Kenya</span>'
    '<span style="color:#555;font-size:1rem;margin-left:10px;">Procurement Management System</span>'
)
admin.site.site_title   = "CocaCola Kenya PMS"
admin.site.index_title  = "Procurement Operations Dashboard"


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────
STATUS_COLORS = {
    # Supplier
    "active":        ("#1a7f37", "#d4edda"),
    "inactive":      ("#6c757d", "#e2e3e5"),
    "blacklisted":   ("#842029", "#f8d7da"),
    # PR / PO / Invoice
    "draft":         ("#495057", "#e9ecef"),
    "pending":       ("#664d03", "#fff3cd"),
    "approved":      ("#1a7f37", "#d4edda"),
    "rejected":      ("#842029", "#f8d7da"),
    "cancelled":     ("#6c757d", "#e2e3e5"),
    "sent":          ("#084298", "#cfe2ff"),
    "acknowledged":  ("#0f5132", "#d1e7dd"),
    "partial":       ("#664d03", "#fff3cd"),
    "received":      ("#1a7f37", "#d4edda"),
    "paid":          ("#1a7f37", "#d4edda"),
    "overdue":       ("#842029", "#f8d7da"),
    "disputed":      ("#842029", "#f8d7da"),
    # GRN
    "pending qc":    ("#664d03", "#fff3cd"),
}

PRIORITY_COLORS = {
    "low":    ("#6c757d", "#e9ecef"),
    "medium": ("#084298", "#cfe2ff"),
    "high":   ("#664d03", "#fff3cd"),
    "urgent": ("#842029", "#f8d7da"),
}


def status_badge(value, color_map=None):
    """Return an HTML badge for a status string."""
    cm = color_map or STATUS_COLORS
    fg, bg = cm.get(value.lower(), ("#333", "#eee"))
    label = value.upper().replace("_", " ")
    return format_html(
        '<span style="background:{};color:{};padding:2px 10px;border-radius:20px;'
        'font-size:0.72rem;font-weight:700;letter-spacing:0.5px;white-space:nowrap;">'
        '{}</span>',
        bg, fg, label,
    )


def ksh(value):
    """Format a decimal as KSh currency."""
    if value is None:
        return "—"
    return format_html(
        '<span style="font-family:monospace;font-weight:600;">KSh {:,.2f}</span>',
        value,
    )


# ─────────────────────────────────────────────────────────────────
# Supplier
# ─────────────────────────────────────────────────────────────────
@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display  = (
        "code", "name", "contact_person", "phone", "email",
        "status_badge_col", "payment_terms_col",
        "total_pos", "total_spend",
    )
    list_filter   = ("status",)
    search_fields = ("name", "code", "email", "contact_person", "tax_id")
    ordering      = ("name",)
    readonly_fields = ("created_at", "updated_at", "total_pos", "total_spend")
    fieldsets = (
        ("🏢 Company Details", {
            "fields": ("name", "code", "status", "tax_id"),
        }),
        ("📞 Contact", {
            "fields": ("contact_person", "phone", "email", "address"),
        }),
        ("💰 Financial", {
            "fields": ("payment_terms",),
        }),
        ("📅 Audit", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Status")
    def status_badge_col(self, obj):
        return status_badge(obj.status)

    @admin.display(description="Payment Terms")
    def payment_terms_col(self, obj):
        return format_html("<span>Net {} days</span>", obj.payment_terms)

    @admin.display(description="# POs")
    def total_pos(self, obj):
        count = obj.purchase_orders.count()
        if count:
            url = f"{reverse('admin:core_purchaseorder_changelist')}?supplier__id__exact={obj.pk}"
            return format_html('<a href="{}">{}</a>', url, count)
        return "0"

    @admin.display(description="Total Spend")
    def total_spend(self, obj):
        agg = obj.purchase_orders.exclude(status="cancelled").aggregate(
            total=Sum("total_amount")
        )
        return ksh(agg["total"])

    # Bulk actions
    @admin.action(description="✅ Mark selected suppliers as Active")
    def make_active(self, request, queryset):
        queryset.update(status="active")

    @admin.action(description="⛔ Blacklist selected suppliers")
    def blacklist(self, request, queryset):
        queryset.update(status="blacklisted")

    actions = ["make_active", "blacklist"]


# ─────────────────────────────────────────────────────────────────
# Category
# ─────────────────────────────────────────────────────────────────
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display  = ("code", "name", "parent", "item_count")
    search_fields = ("name", "code")
    ordering      = ("code",)

    @admin.display(description="# Items")
    def item_count(self, obj):
        return obj.items.count()


# ─────────────────────────────────────────────────────────────────
# Item
# ─────────────────────────────────────────────────────────────────
@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display  = (
        "sku", "name", "category", "unit",
        "unit_price_col", "current_stock", "reorder_level",
        "stock_status", "is_active",
    )
    list_filter   = ("category", "unit", "is_active")
    search_fields = ("name", "sku")
    ordering      = ("name",)
    readonly_fields = ("created_at",)
    list_editable  = ("is_active",)
    fieldsets = (
        ("📦 Item Details", {
            "fields": ("name", "sku", "category", "description", "unit", "is_active"),
        }),
        ("💲 Pricing & Stock", {
            "fields": ("unit_price", "current_stock", "reorder_level"),
        }),
        ("📅 Audit", {
            "fields": ("created_at",),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Unit Price")
    def unit_price_col(self, obj):
        return ksh(obj.unit_price)

    @admin.display(description="Stock Status")
    def stock_status(self, obj):
        if obj.current_stock <= 0:
            return status_badge("rejected")   # red = Out of Stock
        elif obj.current_stock <= obj.reorder_level:
            return format_html(
                '<span style="background:#fff3cd;color:#664d03;padding:2px 10px;'
                'border-radius:20px;font-size:0.72rem;font-weight:700;">⚠ REORDER</span>'
            )
        return format_html(
            '<span style="background:#d4edda;color:#1a7f37;padding:2px 10px;'
            'border-radius:20px;font-size:0.72rem;font-weight:700;">✔ OK</span>'
        )


# ─────────────────────────────────────────────────────────────────
# Purchase Requisition
# ─────────────────────────────────────────────────────────────────
class RequisitionItemInline(admin.TabularInline):
    model   = RequisitionItem
    extra   = 1
    fields  = ("item", "quantity", "estimated_unit_price", "total_price", "notes")
    readonly_fields = ("total_price",)


@admin.register(PurchaseRequisition)
class PurchaseRequisitionAdmin(admin.ModelAdmin):
    list_display  = (
        "pr_number", "title", "requested_by", "department",
        "priority_badge", "status_badge_col",
        "required_date", "total_amount_col",
        "created_at_date",
    )
    list_filter   = ("status", "priority", "department", "created_at")
    search_fields = ("pr_number", "title", "requested_by__username", "department")
    ordering      = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("created_at", "updated_at", "approved_at", "total_amount")
    inlines       = [RequisitionItemInline]
    fieldsets = (
        ("📋 Requisition Details", {
            "fields": ("pr_number", "title", "department", "priority", "status", "required_date", "notes"),
        }),
        ("👤 Requestor & Approval", {
            "fields": ("requested_by", "approved_by", "approved_at"),
        }),
        ("💰 Financials", {
            "fields": ("total_amount",),
        }),
        ("📅 Audit", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Status")
    def status_badge_col(self, obj):
        return status_badge(obj.status)

    @admin.display(description="Priority")
    def priority_badge(self, obj):
        return status_badge(obj.priority, PRIORITY_COLORS)

    @admin.display(description="Total Amount")
    def total_amount_col(self, obj):
        return ksh(obj.total_amount)

    @admin.display(description="Raised On")
    def created_at_date(self, obj):
        return obj.created_at.strftime("%d %b %Y")

    # Actions
    @admin.action(description="✅ Approve selected PRs")
    def approve_prs(self, request, queryset):
        queryset.filter(status__in=["pending", "draft"]).update(
            status="approved",
            approved_by=request.user,
            approved_at=timezone.now(),
        )

    @admin.action(description="❌ Reject selected PRs")
    def reject_prs(self, request, queryset):
        queryset.filter(status__in=["pending", "draft"]).update(status="rejected")

    @admin.action(description="📤 Submit selected draft PRs for approval")
    def submit_prs(self, request, queryset):
        queryset.filter(status="draft").update(status="pending")

    actions = ["submit_prs", "approve_prs", "reject_prs"]


# ─────────────────────────────────────────────────────────────────
# Purchase Order
# ─────────────────────────────────────────────────────────────────
class PurchaseOrderItemInline(admin.TabularInline):
    model   = PurchaseOrderItem
    extra   = 1
    fields  = ("item", "quantity", "unit_price", "total_price", "quantity_received")
    readonly_fields = ("total_price",)


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display  = (
        "po_number", "supplier_link", "requisition_link",
        "status_badge_col", "order_date", "expected_delivery",
        "subtotal_col", "tax_amount_col", "total_amount_col",
        "created_by",
    )
    list_filter   = ("status", "supplier", "order_date")
    search_fields = ("po_number", "supplier__name", "requisition__pr_number")
    ordering      = ("-created_at",)
    date_hierarchy = "order_date"
    readonly_fields = ("order_date", "subtotal", "tax_amount", "total_amount", "created_at", "updated_at")
    inlines       = [PurchaseOrderItemInline]
    fieldsets = (
        ("📄 PO Details", {
            "fields": (
                "po_number", "requisition", "supplier", "status",
                "order_date", "expected_delivery", "delivery_address",
                "payment_terms", "notes",
            ),
        }),
        ("💰 Financials", {
            "fields": ("subtotal", "tax_rate", "tax_amount", "total_amount"),
        }),
        ("👤 Created By", {
            "fields": ("created_by",),
        }),
        ("📅 Audit", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Status")
    def status_badge_col(self, obj):
        return status_badge(obj.status)

    @admin.display(description="Supplier")
    def supplier_link(self, obj):
        url = reverse("admin:core_supplier_change", args=[obj.supplier.pk])
        return format_html('<a href="{}">{}</a>', url, obj.supplier.name)

    @admin.display(description="PR")
    def requisition_link(self, obj):
        if obj.requisition:
            url = reverse("admin:core_purchaserequisition_change", args=[obj.requisition.pk])
            return format_html('<a href="{}">{}</a>', url, obj.requisition.pr_number)
        return "—"

    @admin.display(description="Subtotal")
    def subtotal_col(self, obj):
        return ksh(obj.subtotal)

    @admin.display(description="VAT")
    def tax_amount_col(self, obj):
        return ksh(obj.tax_amount)

    @admin.display(description="Total")
    def total_amount_col(self, obj):
        return ksh(obj.total_amount)

    # Actions
    @admin.action(description="📧 Mark selected POs as Sent to Supplier")
    def mark_sent(self, request, queryset):
        queryset.filter(status="draft").update(status="sent")

    @admin.action(description="✅ Mark selected POs as Acknowledged")
    def mark_acknowledged(self, request, queryset):
        queryset.filter(status="sent").update(status="acknowledged")

    @admin.action(description="🚫 Cancel selected POs")
    def cancel_pos(self, request, queryset):
        queryset.filter(status__in=["draft", "sent"]).update(status="cancelled")

    actions = ["mark_sent", "mark_acknowledged", "cancel_pos"]


# ─────────────────────────────────────────────────────────────────
# Goods Received Note
# ─────────────────────────────────────────────────────────────────
class GRNItemInline(admin.TabularInline):
    model   = GRNItem
    extra   = 1
    fields  = (
        "po_item", "quantity_received",
        "quantity_accepted", "quantity_rejected", "rejection_reason",
    )


@admin.register(GoodsReceivedNote)
class GoodsReceivedNoteAdmin(admin.ModelAdmin):
    list_display  = (
        "grn_number", "po_link", "supplier_name",
        "received_by", "received_date",
        "status_badge_col", "delivery_note_number",
        "acceptance_rate",
    )
    list_filter   = ("status", "received_date")
    search_fields = (
        "grn_number", "purchase_order__po_number",
        "purchase_order__supplier__name", "delivery_note_number",
    )
    ordering      = ("-created_at",)
    date_hierarchy = "received_date"
    readonly_fields = ("created_at", "acceptance_rate")
    inlines       = [GRNItemInline]
    fieldsets = (
        ("📦 GRN Details", {
            "fields": (
                "grn_number", "purchase_order", "received_by",
                "received_date", "status", "delivery_note_number", "notes",
            ),
        }),
        ("📊 Quality Summary", {
            "fields": ("acceptance_rate",),
        }),
        ("📅 Audit", {
            "fields": ("created_at",),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Status")
    def status_badge_col(self, obj):
        return status_badge(obj.status)

    @admin.display(description="PO")
    def po_link(self, obj):
        url = reverse("admin:core_purchaseorder_change", args=[obj.purchase_order.pk])
        return format_html('<a href="{}">{}</a>', url, obj.purchase_order.po_number)

    @admin.display(description="Supplier")
    def supplier_name(self, obj):
        return obj.purchase_order.supplier.name

    @admin.display(description="Acceptance Rate")
    def acceptance_rate(self, obj):
        items = obj.items.all()
        total_recv = sum(i.quantity_received for i in items) or Decimal("0")
        total_acc  = sum(i.quantity_accepted  for i in items) or Decimal("0")
        if total_recv == 0:
            return "—"
        rate = (total_acc / total_recv * 100).quantize(Decimal("0.1"))
        color = "#1a7f37" if rate >= 95 else ("#664d03" if rate >= 80 else "#842029")
        return format_html(
            '<span style="color:{};font-weight:700;">{}%</span>', color, rate
        )

    # Actions
    @admin.action(description="✅ Approve selected GRNs")
    def approve_grns(self, request, queryset):
        queryset.filter(status="pending").update(status="approved")

    @admin.action(description="❌ Reject selected GRNs")
    def reject_grns(self, request, queryset):
        queryset.filter(status="pending").update(status="rejected")

    actions = ["approve_grns", "reject_grns"]


# ─────────────────────────────────────────────────────────────────
# Invoice
# ─────────────────────────────────────────────────────────────────
@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display  = (
        "invoice_number", "supplier_link", "po_link",
        "invoice_date", "due_date",
        "subtotal_col", "tax_col", "total_col",
        "status_badge_col", "days_overdue",
    )
    list_filter   = ("status", "supplier", "invoice_date")
    search_fields = (
        "invoice_number", "supplier_invoice_number",
        "supplier__name", "purchase_order__po_number",
    )
    ordering      = ("-created_at",)
    date_hierarchy = "invoice_date"
    readonly_fields = ("created_at", "days_overdue")
    fieldsets = (
        ("🧾 Invoice Details", {
            "fields": (
                "invoice_number", "supplier_invoice_number",
                "purchase_order", "supplier",
                "invoice_date", "due_date", "status", "paid_date", "notes",
            ),
        }),
        ("💰 Financials", {
            "fields": ("subtotal", "tax_amount", "total_amount"),
        }),
        ("📅 Audit", {
            "fields": ("created_at",),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Status")
    def status_badge_col(self, obj):
        return status_badge(obj.status)

    @admin.display(description="Supplier")
    def supplier_link(self, obj):
        url = reverse("admin:core_supplier_change", args=[obj.supplier.pk])
        return format_html('<a href="{}">{}</a>', url, obj.supplier.name)

    @admin.display(description="PO")
    def po_link(self, obj):
        url = reverse("admin:core_purchaseorder_change", args=[obj.purchase_order.pk])
        return format_html('<a href="{}">{}</a>', url, obj.purchase_order.po_number)

    @admin.display(description="Subtotal")
    def subtotal_col(self, obj):
        return ksh(obj.subtotal)

    @admin.display(description="VAT")
    def tax_col(self, obj):
        return ksh(obj.tax_amount)

    @admin.display(description="Total")
    def total_col(self, obj):
        return ksh(obj.total_amount)

    @admin.display(description="Days Overdue")
    def days_overdue(self, obj):
        if obj.status in ("paid", "cancelled"):
            return "—"
        delta = (timezone.now().date() - obj.due_date).days
        if delta <= 0:
            return format_html('<span style="color:#1a7f37;font-weight:600;">On time</span>')
        return format_html(
            '<span style="color:#842029;font-weight:700;">+{} days</span>', delta
        )

    # Actions
    @admin.action(description="✅ Approve selected invoices")
    def approve_invoices(self, request, queryset):
        queryset.filter(status="pending").update(status="approved")

    @admin.action(description="💳 Mark selected invoices as Paid")
    def mark_paid(self, request, queryset):
        queryset.filter(status__in=["approved", "overdue"]).update(
            status="paid", paid_date=timezone.now().date()
        )

    @admin.action(description="⚠ Mark selected invoices as Disputed")
    def mark_disputed(self, request, queryset):
        queryset.exclude(status__in=["paid", "cancelled"]).update(status="disputed")

    @admin.action(description="🔔 Flag overdue invoices")
    def flag_overdue(self, request, queryset):
        today = timezone.now().date()
        queryset.filter(
            status__in=["pending", "approved"],
            due_date__lt=today,
        ).update(status="overdue")

    actions = ["approve_invoices", "mark_paid", "mark_disputed", "flag_overdue"]