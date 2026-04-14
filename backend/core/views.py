from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
import datetime

from .models import (
    Supplier, Category, Item, PurchaseRequisition, RequisitionItem,
    PurchaseOrder, PurchaseOrderItem, GoodsReceivedNote, GRNItem, Invoice
)
from .serializers import (
    SupplierSerializer, CategorySerializer, ItemSerializer,
    PurchaseRequisitionSerializer, PurchaseRequisitionCreateSerializer,
    PurchaseOrderSerializer, PurchaseOrderCreateSerializer,
    GoodsReceivedNoteSerializer, GoodsReceivedNoteCreateSerializer,
    InvoiceSerializer, UserSerializer
)
from rest_framework.views import APIView
from django.contrib.auth.models import User


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = datetime.date.today()
        month_start = today.replace(day=1)

        data = {
            'total_suppliers': Supplier.objects.count(),
            'active_suppliers': Supplier.objects.filter(status='active').count(),
            'total_items': Item.objects.filter(is_active=True).count(),
            'low_stock_items': Item.objects.filter(
                current_stock__lte=models_ref('reorder_level')
            ).count(),
            'pending_requisitions': PurchaseRequisition.objects.filter(status='pending').count(),
            'approved_requisitions': PurchaseRequisition.objects.filter(status='approved').count(),
            'open_purchase_orders': PurchaseOrder.objects.filter(
                status__in=['draft', 'sent', 'acknowledged', 'partial']
            ).count(),
            'pending_grns': GoodsReceivedNote.objects.filter(status='pending').count(),
            'pending_invoices': Invoice.objects.filter(status='pending').count(),
            'overdue_invoices': Invoice.objects.filter(
                status='overdue'
            ).count(),
            'total_po_value_month': PurchaseOrder.objects.filter(
                created_at__date__gte=month_start
            ).aggregate(total=Sum('total_amount'))['total'] or 0,
            'total_paid_month': Invoice.objects.filter(
                paid_date__gte=month_start,
                status='paid'
            ).aggregate(total=Sum('total_amount'))['total'] or 0,
        }
        # fix low stock using proper query
        data['low_stock_items'] = sum(
            1 for item in Item.objects.all() if item.current_stock <= item.reorder_level
        )
        return Response(data)


def models_ref(field):
    """Helper - not actually used in query above."""
    from django.db.models import F
    return F(field)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['name', 'code', 'email', 'contact_person']
    filterset_fields = ['status']
    ordering_fields = ['name', 'created_at']

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        supplier = self.get_object()
        new_status = request.data.get('status')
        if new_status not in ['active', 'inactive', 'blacklisted']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        supplier.status = new_status
        supplier.save()
        return Response(SupplierSerializer(supplier).data)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(parent=None)
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code']


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.select_related('category').all()
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['name', 'sku', 'description']
    filterset_fields = ['category', 'is_active', 'unit']
    ordering_fields = ['name', 'unit_price', 'current_stock']

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        items = [i for i in Item.objects.all() if i.current_stock <= i.reorder_level]
        return Response(ItemSerializer(items, many=True).data)


class PurchaseRequisitionViewSet(viewsets.ModelViewSet):
    queryset = PurchaseRequisition.objects.select_related('requested_by', 'approved_by').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['pr_number', 'title', 'department']
    filterset_fields = ['status', 'priority', 'department']
    ordering_fields = ['created_at', 'required_date', 'total_amount']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PurchaseRequisitionCreateSerializer
        return PurchaseRequisitionSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        pr = self.get_object()
        if pr.status != 'pending':
            return Response({'error': 'Only pending PRs can be approved'}, status=400)
        pr.status = 'approved'
        pr.approved_by = request.user
        pr.approved_at = timezone.now()
        pr.save()
        return Response(PurchaseRequisitionSerializer(pr).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        pr = self.get_object()
        if pr.status != 'pending':
            return Response({'error': 'Only pending PRs can be rejected'}, status=400)
        pr.status = 'rejected'
        pr.save()
        return Response(PurchaseRequisitionSerializer(pr).data)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        pr = self.get_object()
        if pr.status != 'draft':
            return Response({'error': 'Only draft PRs can be submitted'}, status=400)
        pr.status = 'pending'
        pr.save()
        return Response(PurchaseRequisitionSerializer(pr).data)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related('supplier', 'created_by').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['po_number', 'supplier__name']
    filterset_fields = ['status', 'supplier']
    ordering_fields = ['created_at', 'expected_delivery', 'total_amount']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PurchaseOrderCreateSerializer
        return PurchaseOrderSerializer

    @action(detail=True, methods=['post'])
    def send_to_supplier(self, request, pk=None):
        po = self.get_object()
        if po.status != 'draft':
            return Response({'error': 'Only draft POs can be sent'}, status=400)
        po.status = 'sent'
        po.save()
        return Response(PurchaseOrderSerializer(po).data)

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        po = self.get_object()
        po.status = 'acknowledged'
        po.save()
        return Response(PurchaseOrderSerializer(po).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        po = self.get_object()
        po.status = 'cancelled'
        po.save()
        return Response(PurchaseOrderSerializer(po).data)


class GoodsReceivedNoteViewSet(viewsets.ModelViewSet):
    queryset = GoodsReceivedNote.objects.select_related('purchase_order', 'received_by').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['grn_number', 'purchase_order__po_number']
    filterset_fields = ['status']
    ordering_fields = ['created_at', 'received_date']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return GoodsReceivedNoteCreateSerializer
        return GoodsReceivedNoteSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        grn = self.get_object()
        grn.status = 'approved'
        grn.save()
        # Update PO quantities
        for grn_item in grn.items.all():
            po_item = grn_item.po_item
            po_item.quantity_received += grn_item.quantity_accepted
            po_item.save()
        return Response(GoodsReceivedNoteSerializer(grn).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        grn = self.get_object()
        grn.status = 'rejected'
        grn.save()
        return Response(GoodsReceivedNoteSerializer(grn).data)


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('supplier', 'purchase_order').all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['invoice_number', 'supplier_invoice_number', 'supplier__name']
    filterset_fields = ['status', 'supplier']
    ordering_fields = ['invoice_date', 'due_date', 'total_amount']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'approved'
        invoice.save()
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.paid_date = datetime.date.today()
        invoice.save()
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=True, methods=['post'])
    def dispute(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'disputed'
        invoice.save()
        return Response(InvoiceSerializer(invoice).data)


class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = User.objects.filter(is_active=True)
        return Response(UserSerializer(users, many=True).data)