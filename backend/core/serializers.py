from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Supplier, Category, Item, PurchaseRequisition, RequisitionItem,
    PurchaseOrder, PurchaseOrderItem, GoodsReceivedNote, GRNItem, Invoice
)


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

    def validate_code(self, value):
        return value.upper()


class CategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = '__all__'

    def get_parent_name(self, obj):
        return obj.parent.name if obj.parent else None

    def get_children(self, obj):
        return CategorySerializer(obj.children.all(), many=True).data


class ItemSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    unit_display = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = '__all__'

    def get_category_name(self, obj):
        return obj.category.name

    def get_unit_display(self, obj):
        return obj.get_unit_display()

    def get_is_low_stock(self, obj):
        return obj.current_stock <= obj.reorder_level


class RequisitionItemSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField()
    item_sku = serializers.SerializerMethodField()
    item_unit = serializers.SerializerMethodField()

    class Meta:
        model = RequisitionItem
        fields = '__all__'

    def get_item_name(self, obj):
        return obj.item.name

    def get_item_sku(self, obj):
        return obj.item.sku

    def get_item_unit(self, obj):
        return obj.item.unit


class PurchaseRequisitionSerializer(serializers.ModelSerializer):
    items = RequisitionItemSerializer(many=True, read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    priority_display = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseRequisition
        fields = '__all__'
        read_only_fields = ['pr_number', 'approved_by', 'approved_at', 'total_amount']

    def get_requested_by_name(self, obj):
        u = obj.requested_by
        return f"{u.first_name} {u.last_name}".strip() or u.username

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            u = obj.approved_by
            return f"{u.first_name} {u.last_name}".strip() or u.username
        return None

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_priority_display(self, obj):
        return obj.get_priority_display()


class PurchaseRequisitionCreateSerializer(serializers.ModelSerializer):
    items = RequisitionItemSerializer(many=True)

    class Meta:
        model = PurchaseRequisition
        fields = '__all__'
        read_only_fields = ['pr_number', 'approved_by', 'approved_at', 'total_amount', 'requested_by']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        validated_data['requested_by'] = self.context['request'].user
        # Auto-generate PR number
        import datetime
        count = PurchaseRequisition.objects.count() + 1
        validated_data['pr_number'] = f"PR-{datetime.date.today().strftime('%Y%m')}-{count:04d}"
        pr = PurchaseRequisition.objects.create(**validated_data)
        total = 0
        for item_data in items_data:
            ri = RequisitionItem.objects.create(requisition=pr, **item_data)
            total += ri.total_price
        pr.total_amount = total
        pr.save()
        return pr


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField()
    item_sku = serializers.SerializerMethodField()
    item_unit = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'

    def get_item_name(self, obj):
        return obj.item.name

    def get_item_sku(self, obj):
        return obj.item.sku

    def get_item_unit(self, obj):
        return obj.item.unit


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = '__all__'

    def get_supplier_name(self, obj):
        return obj.supplier.name

    def get_created_by_name(self, obj):
        u = obj.created_by
        return f"{u.first_name} {u.last_name}".strip() or u.username

    def get_status_display(self, obj):
        return obj.get_status_display()


class PurchaseOrderCreateSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ['po_number', 'order_date', 'created_by', 'subtotal', 'tax_amount', 'total_amount']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        validated_data['created_by'] = self.context['request'].user
        import datetime
        count = PurchaseOrder.objects.count() + 1
        validated_data['po_number'] = f"PO-{datetime.date.today().strftime('%Y%m')}-{count:04d}"
        po = PurchaseOrder.objects.create(**validated_data)
        subtotal = 0
        for item_data in items_data:
            poi = PurchaseOrderItem.objects.create(purchase_order=po, **item_data)
            subtotal += poi.total_price
        po.subtotal = subtotal
        po.tax_amount = subtotal * (po.tax_rate / 100)
        po.total_amount = po.subtotal + po.tax_amount
        po.save()
        return po


class GRNItemSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField()

    class Meta:
        model = GRNItem
        fields = '__all__'

    def get_item_name(self, obj):
        return obj.po_item.item.name


class GoodsReceivedNoteSerializer(serializers.ModelSerializer):
    items = GRNItemSerializer(many=True, read_only=True)
    received_by_name = serializers.SerializerMethodField()
    po_number = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = GoodsReceivedNote
        fields = '__all__'

    def get_received_by_name(self, obj):
        u = obj.received_by
        return f"{u.first_name} {u.last_name}".strip() or u.username

    def get_po_number(self, obj):
        return obj.purchase_order.po_number

    def get_status_display(self, obj):
        return obj.get_status_display()


class GoodsReceivedNoteCreateSerializer(serializers.ModelSerializer):
    items = GRNItemSerializer(many=True)

    class Meta:
        model = GoodsReceivedNote
        fields = '__all__'
        read_only_fields = ['grn_number', 'received_by']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        validated_data['received_by'] = self.context['request'].user
        import datetime
        count = GoodsReceivedNote.objects.count() + 1
        validated_data['grn_number'] = f"GRN-{datetime.date.today().strftime('%Y%m')}-{count:04d}"
        grn = GoodsReceivedNote.objects.create(**validated_data)
        for item_data in items_data:
            GRNItem.objects.create(grn=grn, **item_data)
        return grn


class InvoiceSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()
    po_number = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = '__all__'

    def get_supplier_name(self, obj):
        return obj.supplier.name

    def get_po_number(self, obj):
        return obj.purchase_order.po_number

    def get_status_display(self, obj):
        return obj.get_status_display()


class DashboardSerializer(serializers.Serializer):
    total_suppliers = serializers.IntegerField()
    active_suppliers = serializers.IntegerField()
    total_items = serializers.IntegerField()
    low_stock_items = serializers.IntegerField()
    pending_requisitions = serializers.IntegerField()
    approved_requisitions = serializers.IntegerField()
    open_purchase_orders = serializers.IntegerField()
    pending_grns = serializers.IntegerField()
    pending_invoices = serializers.IntegerField()
    overdue_invoices = serializers.IntegerField()
    total_po_value_month = serializers.DecimalField(max_digits=16, decimal_places=2)
    total_paid_month = serializers.DecimalField(max_digits=16, decimal_places=2)