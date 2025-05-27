import pandas as pd
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict
from config import RISK_COLORS, MAX_WAIT_MINUTES, MIN_WAIT_MINUTES, TIME_SLOTS, DYNAMODB_TABLE, AWS_REGION
from utils import assign_time_slot, compute_iqr
import boto3
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal

class DataStore:
    def __init__(self):
        # Each row: pseudonym, unit, cinza_time, rc_time, risk_color, delta_t, slot, day
        # self.df = pd.DataFrame(columns=[
        #     "pseudonym", "unit", "cinza_time", "rc_time", "risk_color", "delta_t", "slot", "day"
        # ])
        self.dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
        self.units_table = self.dynamodb.Table("units")
        self.table = self.dynamodb.Table(DYNAMODB_TABLE)
        self.user_route_table = self.dynamodb.Table("user_route_times")
        # Temporary buffer for cinza events
        self.cinza_buffer = {}  # pseudonym -> {unit, cinza_time}

    def ingest_event(self, pseudonym: str, unit: str, event_type: str,
                     risk_color: Optional[str], timestamp: datetime):
        timestamp_str = timestamp.isoformat()
        if event_type == "cinza":
            # Store cinza in-memory (could also persist if needed)
            self.cinza_buffer[pseudonym] = {"unit": unit, "cinza_time": timestamp}
            # Also write to DynamoDB for durability if desired (optional)
            return None
        elif event_type == "rc":
            # Match with buffered cinza
            if pseudonym not in self.cinza_buffer:
                return None  # No matching cinza yet
            cinza_entry = self.cinza_buffer.pop(pseudonym)
            if not cinza_entry:
                # Try to retrieve from DynamoDB (not implemented for MVP, but possible)
                return None
            
            cinza_time = cinza_entry["cinza_time"]
            delta_t = (timestamp - cinza_time).total_seconds() / 60.0
            if not (MIN_WAIT_MINUTES <= delta_t <= MAX_WAIT_MINUTES):
                return None  # Outlier or invalid data

            slot = assign_time_slot(timestamp, TIME_SLOTS)
            item  = {
                "pseudonym": pseudonym,
                "unit": unit,
                "cinza_time": cinza_entry["cinza_time"],
                "rc_time": timestamp_str,
                "risk_color": risk_color,
                "delta_t": delta_t,
                "slot": slot,
                "day": timestamp.date().isoformat(),
                "event_type": "rc"
            }
            self.table.put_item(Item=item)
            # self.df = pd.concat([self.df, pd.DataFrame([item])], ignore_index=True)
            return delta_t
        else:
            return None

    def fetch_events(self, unit: str, risk_color: str,
                    time_from: datetime, time_to: datetime,
                    days: Optional[List[str]] = None) -> pd.Series:
        # For MVP, scan whole table (ok for small city, low load, improve with GSI if scale)
        response = self.table.scan(
            FilterExpression=Attr('unit').eq(unit) & 
                             Attr('risk_color').eq(risk_color) & 
                             Attr('event_type').eq('rc')
        )
        items = response.get('Items', [])
        data = []
        for item in items:
            rc_time = datetime.fromisoformat(item['rc_time'])
            if time_from <= rc_time <= time_to:
                if days is None or item['day'] in days:
                    data.append(float(item['delta_t']))
        return pd.Series(data)
    
    def fetch_slot_events(self, unit: str, risk_color: str, slot: str,
                         day: Optional[str] = None) -> pd.Series:
        response = self.table.scan(
            FilterExpression=Attr('unit').eq(unit) &
                             Attr('risk_color').eq(risk_color) &
                             Attr('slot').eq(slot) &
                             Attr('event_type').eq('rc')
        )
        items = response.get('Items', [])
        data = []
        for item in items:
            if (day is None) or (item['day'] == day):
                data.append(float(item['delta_t']))
        return pd.Series(data)

    def fetch_multi_day_events(self, unit: str, risk_color: str, slot: str,
                             current_day: str, lookback: int) -> Dict[str, pd.Series]:
        results = {}
        cur_date = datetime.fromisoformat(current_day)
        for offset in range(lookback + 1):
            day = (cur_date - timedelta(days=offset)).date().isoformat()
            s = self.fetch_slot_events(unit, risk_color, slot, day)
            if not s.empty:
                results[day] = s
        return results

    # def get_all_data(self):
    #     return self.df.copy()

    def list_units(self):
        # This is an MVP approach - scan table and extract unique units.
        response = self.table.scan(
            ProjectionExpression="#u",
            ExpressionAttributeNames={"#u": "unit"}
        )
        items = response.get('Items', [])
        units = set(item['unit'] for item in items)
        return list(units)
    

    def register_unit(self, unit, address=None, postal_code=None, latitude=None, longitude=None):
        item = {"unit": unit}
        if latitude is not None and longitude is not None:
            # Convert float to Decimal!
            item["lat"] = Decimal(str(latitude))
            item["lng"] = Decimal(str(longitude))
        if address:
            item["address"] = address
        if postal_code:
            item["postal_code"] = postal_code
        self.units_table.put_item(Item=item)
        return item


    def get_all_units_with_locations(self):
        response = self.units_table.scan()
        return response.get("Items", [])
    
    def store_user_route_times(self, user_phone, latitude, longitude, results):
        # results: list of dicts [{unit, travel_time_min}]
        with self.user_route_table.batch_writer() as batch:
            for r in results:
                batch.put_item(Item={
                    "user_phone": user_phone,
                    "unit": r["unit"],
                    "travel_time_min": r["travel_time_min"],
                    "latitude": Decimal(str(latitude)),
                    "longitude": Decimal(str(longitude)),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

    def get_user_route_times(self, user_phone):
        response = self.user_route_table.query(
            KeyConditionExpression=Key("user_phone").eq(user_phone)
        )
        return response.get("Items", [])