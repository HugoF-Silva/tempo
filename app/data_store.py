import pandas as pd
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict
from config import RISK_COLORS, MAX_WAIT_MINUTES, MIN_WAIT_MINUTES, TIME_SLOTS, DYNAMODB_TABLE, AWS_REGION, DEFAULT_WAIT_BY_COLOR
from utils import assign_time_slot, compute_iqr, to_date
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
from decimal import Decimal
import hashlib
import os
from dateutil import parser
import pytz
import json
import logging
from zoneinfo import ZoneInfo
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_secret():

    secret_name = "pseodonym/salt"
    region_name = "us-east-1"

    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
    except ClientError as e:
        # For a list of exceptions thrown, see
        # https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
        raise e

    secret = get_secret_value_response['SecretString']

    return secret

def hash_pseudonym(pseudonym: str, salt: str) -> str:
    # Combine pseudonym and salt, encode, hash
    to_hash = f"{salt}{pseudonym}".encode("utf-8")
    return hashlib.sha256(to_hash).hexdigest()

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
        self.secret = get_secret()

    def ingest_event(self, pseudonym: str, unit: str, event_type: str,
                    risk_color: Optional[str], timestamp: datetime):
        # Always treat timestamp as UTC unless proven otherwise
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        timestamp_str = timestamp.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
        hashed_pseudonym = hash_pseudonym(pseudonym, self.secret)

        response = self.table.query(
            KeyConditionExpression=Key("pseudonym").eq(hashed_pseudonym) & Key("event_id").begins_with(f"{unit}#")
        )

        items = response.get("Items", [])
        if event_type == "cinza":
            if items:
                for item in items:
                    self.table.delete_item(
                        Key={
                            "pseudonym": hashed_pseudonym,
                            "event_id": item["event_id"]
                        }
                    )

            # Persist cinza event
            item = {
                "pseudonym": hashed_pseudonym,
                "event_id": f"{unit}#{event_type}",
                "unit": unit,
                "cinza_time": timestamp_str,
                "event_time": timestamp_str,
                "event_type": "cinza"
            }
            self.table.put_item(Item=item)
            return None
        
        elif event_type == "rc":
            # Retrieve last cinza event for this pseudonym/unit
            if not items:
                return None  # No matching cinza
            
            for item in items:
                if item["event_type"] == "rc":
                    self.table.delete_item(
                        Key={
                            "pseudonym": hashed_pseudonym,
                            "event_id": item["event_id"],
                        }
                    )
                if item["event_type"] == "cinza":
                    cinza_entry = item
                    cinza_time = datetime.fromisoformat(cinza_entry["cinza_time"])
                
            if not cinza_time:
                return None
            
            delta_t = (timestamp - cinza_time).total_seconds() / 60.0
            local_ts = timestamp.astimezone(ZoneInfo("America/Sao_Paulo"))
            day_str = local_ts.date().isoformat()
            # if not (MIN_WAIT_MINUTES <= delta_t <= MAX_WAIT_MINUTES):
                # return None  # Outlier or invalid data

            slot = assign_time_slot(cinza_time, TIME_SLOTS)  # Can be "off-hours"
            item = {
                "pseudonym": hashed_pseudonym,
                "event_id": f"{unit}#{event_type}",
                "unit": unit,
                "event_time": timestamp_str,
                "cinza_time": cinza_entry["cinza_time"],
                "rc_time": timestamp_str,
                "risk_color": risk_color,
                "delta_t": Decimal(str(delta_t)),
                "slot": slot,
                "day": day_str,
                "event_type": "rc"
            }
            self.table.put_item(Item=item)
            return delta_t
        else:
            return None
    
    def list_units(self):
        # This is an MVP approach - scan table and extract unique units.
        response = self.table.scan(
            ProjectionExpression="#u",
            ExpressionAttributeNames={"#u": "unit"}
        )
        items = response.get('Items', [])
        units = set(item['unit'] for item in items)
        return list(units)

    def store_user_route_times(self, user_phone, latitude, longitude, results):
        # results: list of dicts [{unit, travel_time_min}]
        print("USER_PHONE:", repr(user_phone))
        print("Latitude:", latitude, "Longitude:", longitude)
        print("Will write these units:")
        print(json.dumps([r["unit"] for r in results], ensure_ascii=False, indent=2))
        with self.user_route_table.batch_writer() as batch:
            for r in results:
                batch.put_item(Item={
                    "user_phone": user_phone,
                    "unit": r["unit"],
                    "travel_time_min": Decimal(str(r["travel_time_min"])) if r["travel_time_min"] is not None else None,
                    "latitude": Decimal(str(latitude)),
                    "longitude": Decimal(str(longitude)),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

    # Unit registration
    def register_unit(self, unit: str, address: Optional[str] = None,
                      postal_code: Optional[str] = None,
                      latitude: Optional[float] = None,
                      longitude: Optional[float] = None) -> Dict:
        item = {"unit": unit}
        if latitude is not None and longitude is not None:
            item.update({"lat": latitude, "lng": longitude})
        if address:
            item["address"] = address
        if postal_code:
            item["postal_code"] = postal_code
        self.units_table.put_item(Item=item)
        return item

    # List registered units
    def get_all_units_with_locations(self) -> List[Dict]:
        resp = self.units_table.scan()
        return resp.get("Items", [])

    # Retrieve stored route times for a user
    def get_user_route_times(self, user_phone: str) -> List[Dict]:
        resp = self.user_route_table.query(
            KeyConditionExpression=Key("user_phone").eq(user_phone)
        )
        return resp.get("Items", [])

    # Fetch samples for a specific unit, day, slot, and color
    def fetch_samples_unit_day_slot_color_df(self, unit: str, color: str,
                                             slot: str, day_str: str) -> pd.DataFrame:
        resp = self.table.scan(
            FilterExpression=Attr('unit').eq(unit)
                            & Attr('risk_color').eq(color)
                            & Attr('slot').eq(slot)
                            & Attr('day').eq(day_str)
                            & Attr('event_type').eq('rc')
        )
        items = resp.get('Items', [])
        if not items:
            return pd.DataFrame(columns=['delta_t', 'day'])
        df = pd.DataFrame(items)
        df['delta_t'] = df['delta_t'].astype(float)
        return df[['delta_t', 'day']]

    # Fetch samples for same unit, slot, color across all days
    def fetch_samples_unit_slot_color_all_days_df(self, unit: str, color: str,
                                                  slot: str) -> pd.DataFrame:
        resp = self.table.scan(
            FilterExpression=Attr('unit').eq(unit)
                            & Attr('risk_color').eq(color)
                            & Attr('slot').eq(slot)
                            & Attr('event_type').eq('rc')
        )
        items = resp.get('Items', [])
        if not items:
            return pd.DataFrame(columns=['delta_t', 'day'])
        df = pd.DataFrame(items)
        df['delta_t'] = df['delta_t'].astype(float)
        return df[['delta_t', 'day']]

    # Fetch samples for same unit, slot, color, and weekday
    def fetch_samples_unit_color_slot_weekday_df(self, unit: str, color: str,
                                                 slot: str, weekday: int) -> pd.DataFrame:
        resp = self.table.scan(
            FilterExpression=Attr('unit').eq(unit)
                            & Attr('risk_color').eq(color)
                            & Attr('slot').eq(slot)
                            & Attr('event_type').eq('rc')
        )
        items = resp.get('Items', [])
        if not items:
            return pd.DataFrame(columns=['delta_t', 'day'])
        df = pd.DataFrame(items)
        df['rc_time'] = pd.to_datetime(
            df['rc_time'],
            format='ISO8601'
        )

        # filter on the weekday
        df = df[df['rc_time'].dt.weekday == weekday]

        df['delta_t'] = df['delta_t'].astype(float)
        return df[['delta_t', 'day']]

    # Fetch samples across all units for a given slot and color
    def fetch_samples_color_slot_all_units_df(self, color: str, slot: str) -> pd.DataFrame:
        resp = self.table.scan(
            FilterExpression=Attr('risk_color').eq(color)
                            & Attr('slot').eq(slot)
                            & Attr('event_type').eq('rc')
        )
        items = resp.get('Items', [])
        if not items:
            return pd.DataFrame(columns=['delta_t'])
        df = pd.DataFrame(items)
        df['delta_t'] = df['delta_t'].astype(float)
        return df[['delta_t']]