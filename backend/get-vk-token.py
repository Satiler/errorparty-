#!/usr/bin/env python3
"""
Скрипт для получения VK Audio токена через vkaudiotoken
Использование: python get-vk-token.py <login> <password>
"""

import sys
import json

try:
    from vkaudiotoken import get_kate_token
except ImportError:
    print(json.dumps({
        "error": "vkaudiotoken not installed",
        "message": "Run: pip install vkaudiotoken"
    }))
    sys.exit(1)

def get_token(login, password):
    """Получить Kate Mobile токен для VK Audio API"""
    try:
        token_data = get_kate_token(login, password)
        # token_data возвращает кортеж (token, user_agent)
        return {
            "success": True,
            "token": token_data[0],
            "user_agent": token_data[1]
        }
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Invalid arguments",
            "usage": "python get-vk-token.py <login> <password>"
        }))
        sys.exit(1)
    
    login = sys.argv[1]
    password = sys.argv[2]
    
    result = get_token(login, password)
    print(json.dumps(result, ensure_ascii=False, indent=2))
