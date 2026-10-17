"""
Serializers for Expenses and Assets.
"""
from rest_framework import serializers
from .models import ExpenseClaim, ExpenseItem, Asset, AssetAssignment


class ExpenseClaimSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseClaim
        fields = "__all__"
        read_only_fields = ["employee"]


class ExpenseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseItem
        fields = "__all__"


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = "__all__"


class AssetAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetAssignment
        fields = "__all__"

