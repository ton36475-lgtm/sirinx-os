# Android Mobile → Mac Mini M2 tmux Access

## ขั้นตอนการตั้งค่า

### 1. เปิด SSH Server บน Mac
```bash
# เช็คสถานะ
sudo systemsetup -getremotelogin
# ควรเป็น: Remote Login: On

# ถ้า Off ให้เปิด
sudo systemsetup -setremotelogin on
```

### 2. หา IP Address ของ Mac
```bash
# บน Mac
ipconfig getifaddr en0    # WiFi
ipconfig getifaddr en5    # Ethernet (หากมี)
```

### 3. ตั้ง SSH Key (แนะนำ)
```bash
# สร้าง key ถ้ายังไม่มี
ssh-keygen -t ed25519 -C "mobile-access"

# คัดลอก public key ไป ~/.ssh/authorized_keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 4. ถ้าอยากเข้าจากที่ไหนก็ได้ (Internet)
ใช้ **Tailscale** หรือ **Cloudflare Tunnel**:

```bash
# Tailscale (ง่ายที่สุด)
brew install tailscale
tailscale up

# จะได้ IP เช่น 100.x.y.z ที่เข้าได้จากทุกที่
```

### 5. Android Apps แนะนำ

**Terminal/SSH Apps:**
- Termius - SSH + Mosh + SFTP
- JuiceSSH - เร็ว, lightweight
- ConnectBot - Open source

**Connection settings:**
```
Host: your-mac-ip-or-tailscale-ip
Port: 22
Username: sirinx
Authentication: SSH key หรือ password
```

### 6. ใช้ tmux จาก Android

เมื่อเข้า SSH แล้ว:
```bash
# เช็ค sessions ที่ทำงานอยู่
tmux ls

# เข้า session ghostclaw
tmux attach -t ghostclaw

# ถ้าไม่มีให้สร้างใหม่
bash ~/sirinx-os/scripts/ghostclaw-tmux.sh

# คำสั่ง tmux สำคับ
Ctrl+B 1    # ไป window 1 (overview)
Ctrl+B 2    # ไป window 2 (skills-api)
Ctrl+B n    # ไป window ถัดไป
Ctrl+B d    # detach (ปล่อยทำงาน)

# ตรวจสอบ services จาก Android
curl http://localhost:3800/health
curl http://localhost:8711/health
```

### 7. ตั้งให้ tmux เริ่มอัตโนมั�ต์

```bash
# เพิ่่มใน ~/.zshrc
if ! tmux has-session -t ghostclaw 2>/dev/null; then
  ~/sirinx-os/scripts/ghostclaw-tmux.sh > /dev/null 2>&1
fi
```

### 8. Security Note
- **หากใช้ Tailscale/Cloudflare Tunnel**: ปลอดภัย (end-to-end encrypted)
- **หากใช้ port forwarding**: ควรเปลี่ยน SSH port จาก 22 → เลขอื่น (เช่น 2222)
- อย่าเปิด port 22 ให้เข้าจาก internet โดยตรงโดยไม่มี VPN

## ตัวอย่างการใช้จาก Android

```bash
# SSH เข้า
ssh sirinx@100.x.y.z

# เข้า tmux
tmux attach -t ghostclaw

# เลือก window 3 (dev-api) ดู logs
Ctrl+B 3

# รัน test จาก mobile
Ctrl+B 8 Enter  # เข้า test window
node --test src/*.test.mjs

# ออกจาก tmux (ปล่อยทำงาน)
Ctrl+B d

# ออกจาก SSH
exit
```

✅ พร้อมใช้จาก Android แล้ว!