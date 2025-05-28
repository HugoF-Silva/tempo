import os

# Define risk colors explicitly
RISK_COLORS = ['b', 'g', 'y', 'o', 'r']

# Default time slot definitions
TIME_SLOTS = [
    ("05:00", "08:00"),
    ("08:00", "11:30"),
    ("11:30", "15:00"),
    ("15:00", "18:00"),
    ("18:00", "21:00")
]

# Rolling window for fine-grained estimation
ROLLING_WINDOW_MINUTES = 60  # +/- 30 mins

# Minutes for boundary blending
SLOT_BOUNDARY_SMOOTHING_WINDOW_MIN = 15  

# Number of samples required for fine-grained, slot, multi-day, etc.
FINE_GRAINED_MIN_SAMPLES = 8
SLOT_MIN_SAMPLES = 8
MULTI_DAY_LOOKBACK_DAYS = 3
MULTI_DAY_DECAY = 0.7  # Weight decay for each previous week/day

# Outlier thresholds (IQR method)
IQR_OUTLIER_FACTOR = 1.5

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

# Confidence thresholds
HIGH_CONFIDENCE_SAMPLES = 15
MEDIUM_CONFIDENCE_SAMPLES = 8


DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE", "wait_time_events")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
