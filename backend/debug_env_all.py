import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

print("--- All Environment Keys ---")
for k in sorted(os.environ.keys()):
    if "SMTP" in k or "MAIL" in k or "HOST" in k:
        print(f"{k}: {os.environ[k]}")
