from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardView, SupplierViewSet, CategoryViewSet, ItemViewSet,
    PurchaseRequisitionViewSet, PurchaseOrderViewSet,
    GoodsReceivedNoteViewSet, InvoiceViewSet, UserListView
)

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'items', ItemViewSet)
router.register(r'requisitions', PurchaseRequisitionViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'grns', GoodsReceivedNoteViewSet)
router.register(r'invoices', InvoiceViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('users/', UserListView.as_view(), name='users'),
]