import boto3

session = boto3.Session()
table = session.resource("dynamodb").Table("wait_time_events")
data = data = [
  {
    "pseudonym": "AlJo",
    "unit": "UPA Buriti Sereno",
    "risk_color": "g",
    "cinza_time": "2024-05-18T08:05:00",
    "rc_time": "2024-05-18T08:22:00",
    "delta_t": 17,
    "slot": "08:00-11:00",
    "day": "2024-05-18",
    "event_type": "rc"
  },
  {
    "pseudonym": "JoDo",
    "unit": "UPA Buriti Sereno",
    "risk_color": "y",
    "cinza_time": "2024-05-18T08:10:00",
    "rc_time": "2024-05-18T08:30:00",
    "delta_t": 20,
    "slot": "08:00-11:00",
    "day": "2024-05-18",
    "event_type": "rc"
  },
  {
    "pseudonym": "MaFe",
    "unit": "UPA Geraldo Magela (Parque Flamboyant)",
    "risk_color": "b",
    "cinza_time": "2024-05-18T11:45:00",
    "rc_time": "2024-05-18T12:10:00",
    "delta_t": 25,
    "slot": "11:30-14:30",
    "day": "2024-05-18",
    "event_type": "rc"
  },
  {
    "pseudonym": "CaLi",
    "unit": "UPA Geraldo Magela (Parque Flamboyant)",
    "risk_color": "o",
    "cinza_time": "2024-05-18T15:05:00",
    "rc_time": "2024-05-18T15:20:00",
    "delta_t": 15,
    "slot": "15:00-18:00",
    "day": "2024-05-18",
    "event_type": "rc"
  },
  {
    "pseudonym": "PeRo",
    "unit": "UPA Colina Azul",
    "risk_color": "g",
    "cinza_time": "2024-05-18T18:35:00",
    "rc_time": "2024-05-18T19:05:00",
    "delta_t": 30,
    "slot": "18:00-21:00",
    "day": "2024-05-18",
    "event_type": "rc"
  },
  {
    "pseudonym": "SoMo",
    "unit": "UPA Colina Azul",
    "risk_color": "r",
    "cinza_time": "2024-05-18T18:40:00",
    "rc_time": "2024-05-18T18:48:00",
    "delta_t": 8,
    "slot": "18:00-21:00",
    "day": "2024-05-18",
    "event_type": "rc"
  },
  {
    "pseudonym": "LuPi",
    "unit": "UPA Buriti Sereno",
    "risk_color": "b",
    "cinza_time": "2024-05-19T05:10:00",
    "rc_time": "2024-05-19T05:40:00",
    "delta_t": 30,
    "slot": "05:00-08:00",
    "day": "2024-05-19",
    "event_type": "rc"
  },
  {
    "pseudonym": "ViTe",
    "unit": "UPA Geraldo Magela (Parque Flamboyant)",
    "risk_color": "g",
    "cinza_time": "2024-05-19T11:50:00",
    "rc_time": "2024-05-19T12:05:00",
    "delta_t": 15,
    "slot": "11:30-14:30",
    "day": "2024-05-19",
    "event_type": "rc"
  }
]

 # your events array
for item in data:
    table.put_item(Item=item)