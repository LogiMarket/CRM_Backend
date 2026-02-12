# Verify WhatsApp Media (Backend)

This script sends a media message via the backend (`/api/whatsapp/send-media`) and then downloads it back via the proxy (`/api/whatsapp/media/:mediaId`).

## Prereqs
- Backend running (local or Railway)
- `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` configured in that environment
- A valid JWT (login at `POST /api/auth/login`)

## PowerShell (Windows)
```powershell
# Example
$base = "http://localhost:3001"

# Get token
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType "application/json" -Body (@{ email="agent@example.com"; password="password123" } | ConvertTo-Json)
$jwt = $login.access_token

# Send + download
.\scripts\verify-whatsapp-media.ps1 -BaseUrl $base -Jwt $jwt -PhoneNumber "+5215548780484" -Type image -FilePath "C:\temp\test.jpg" -Caption "hola" \
  -OutFile "C:\temp\downloaded-test.jpg"
```

Notes:
- `-Type` supports: `image`, `document`, `audio`, `video`, `sticker`
- `-OutFile` is optional; if omitted it saves to the current directory.
