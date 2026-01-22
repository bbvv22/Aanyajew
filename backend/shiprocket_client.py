import os
import requests
import json
from datetime import datetime, timedelta

class ShiprocketClient:
    BASE_URL = "https://apiv2.shiprocket.in/v1/external"

    def __init__(self):
        self.email = os.getenv("SHIPROCKET_EMAIL")
        self.password = os.getenv("SHIPROCKET_PASSWORD")
        self.token = None
        self.token_expiry = None

    def _get_headers(self):
        if not self.token or datetime.now() >= self.token_expiry:
            self._login()
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }

    def _login(self):
        if not self.email or not self.password:
            raise ValueError("SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD env vars are required")
        
        url = f"{self.BASE_URL}/auth/login"
        payload = {"email": self.email, "password": self.password}
        
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            self.token = data.get("token")
            # Token is usually valid for 10 days, but let's refresh every 24h to be safe
            self.token_expiry = datetime.now() + timedelta(hours=24) 
        except Exception as e:
            print(f"❌ Shiprocket Login Failed: {e}")
            raise e

    def check_serviceability(self, pickup_postcode, delivery_postcode, weight, cod=0):
        url = f"{self.BASE_URL}/courier/serviceability/"
        params = {
            "pickup_postcode": pickup_postcode,
            "delivery_postcode": delivery_postcode,
            "weight": weight,
            "cod": cod
        }
        
        response = requests.get(url, headers=self._get_headers(), params=params)
        return response.json()

    def create_order(self, order_data):
        url = f"{self.BASE_URL}/orders/create/ad-hoc"
        
        # Transform our internal order data to Shiprocket format if necessary
        # Assuming order_data passed here is already formatted or we format it:
        payload = {
            "order_id": order_data.get("order_id"),
            "order_date": order_data.get("order_date"),
            "pickup_location": "Primary", # Created in Shiprocket panel
            "billing_customer_name": order_data.get("customer_name"),
            "billing_last_name": "",
            "billing_address": order_data.get("address"),
            "billing_city": order_data.get("city"),
            "billing_pincode": order_data.get("pincode"),
            "billing_state": order_data.get("state"),
            "billing_country": "India",
            "billing_email": order_data.get("email"),
            "billing_phone": order_data.get("phone"),
            "shipping_is_billing": True,
            "order_items": order_data.get("items"),
            "payment_method": "Prepaid" if order_data.get("payment_method") != "COD" else "COD",
            "sub_total": order_data.get("sub_total"),
            "length": 10,
            "breadth": 10,
            "height": 10,
            "weight": 0.5 # Default 500g
        }
        
        response = requests.post(url, headers=self._get_headers(), json=payload)
        return response.json()

# Singleton instance
shiprocket = ShiprocketClient()
