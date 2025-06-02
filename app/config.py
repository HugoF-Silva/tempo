import os

RISK_COLORS = ['b', 'g', 'y', 'o', 'r']

# Default time slot definitions
TIME_SLOTS = [
    ("05:00", "08:00"),
    ("08:00", "11:30"),
    ("11:30", "15:00"),
    ("15:00", "18:00"),
    ("18:00", "21:00")
]

CONCEPT1_MIN_SAMPLES = 1
CONCEPT3_MIN_SAMPLES = 5

DEFAULT_WAIT_BY_SLOT_COLOR = {
    "05:00-08:00": {'b': 80, 'g': 65, 'y': 50, 'o': 35, 'r': 5},
    "08:00-11:30": {'b':100, 'g': 85, 'y': 70, 'o': 55, 'r': 5},
    "11:30-15:00": {'b': 90, 'g': 75, 'y': 60, 'o': 45, 'r': 5},
    "15:00-18:00": {'b': 95, 'g': 80, 'y': 65, 'o': 50, 'r': 3},
    "18:00-21:00": {'b': 85, 'g': 70, 'y': 55, 'o': 40, 'r': 2}
}

# Minutes for boundary blending
SLOT_BOUNDARY_SMOOTHING_WINDOW_MIN = 15  

# Outlier thresholds (IQR method)
IQR_OUTLIER_FACTOR = 2.0

# Default wait times by color (minutes)
DEFAULT_WAIT_BY_COLOR = {
    'b': 60,  # blue
    'g': 40,  # green
    'y': 30,  # yellow
    'o': 15,  # orange
    'r': 5    # red
}

# Maximum valid delta_t (minutes)
MAX_WAIT_MINUTES = 360
MIN_WAIT_MINUTES = 2

DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE", "wait_time_events")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
TEMPORAL_DECAY_RATE = 0.8