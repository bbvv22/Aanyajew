import os
from dotenv import load_dotenv

# Load env explicitly like server.py
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

print("--- Environment Keys ---")
keys = ["MAILER_URL", "INTERNAL_KEY", "SMTP_SERVER", "SMTP_PORT", "SMTP_EMAIL", "SMTP_PASSWORD", "SMTP_USER"]
for k in keys:
    val = os.environ.get(k)
    print(f"{k}: {'Set' if val else 'MISSING'} {f'({val})' if val and 'pass' not in k.lower() and 'key' not in k.lower() else ''}")
