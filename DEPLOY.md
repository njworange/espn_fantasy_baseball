# ESPN Fantasy Baseball Dashboard - Cloudflare 배포 가이드

## 🚀 빠른 시작 (Cloudflare 버전)

### 특징
- ✅ **Port 3002** 사용 (3000번은 Cloudflare용으로 예약)
- ✅ **nginx 없음** - Cloudflare에서 직접 처리
- ✅ **Cloudflare Tunnel** 지원 (CGNAT 환경에서도 작동)
- ✅ HTTPS 자동 제공

---

## 1단계: Proxmox LXC 생성

```bash
# CT ID는 사용 가능한 번호로
pct create 200 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname espn-dashboard \
  --cores 2 \
  --memory 2048 \
  --swap 512 \
  --storage local-lvm \
  --rootfs 8 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 1 \
  --features nesting=1

pct start 200
pct exec 200 -- bash
```

---

## 2단계: 프로젝트 설치

```bash
# 파일 복사 (Windows에서 LXC로)
# PowerShell: scp -r C:\opencode\espn_fantasy_baseball root@<LXC-IP>:/opt/

# 또는 Git 클론
git clone <your-repo> /opt/espn-dashboard
cd /opt/espn-dashboard

# 설치 스크립트 실행
chmod +x scripts/*.sh
./scripts/install.sh
```

---

## 3단계: ESPN 쿠키 설정

```bash
# .env 파일 생성
nano /opt/espn-dashboard/fetcher/.env
```

**입력 내용:**
```env
LEAGUE_ID=12345678
SEASON_YEAR=2026
ESPN_S2=your_actual_espn_s2_cookie
SWID={your_actual_swid}
OUTPUT_PATH=/opt/espn-dashboard/web/public/data/league-snapshot.json
```

---

## 4단계: 서비스 시작

```bash
# Systemd 서비스 설치 및 시작
sudo ./scripts/setup-services.sh
sudo systemctl start espn-web          # Port 3002
sudo systemctl start espn-fetcher.timer # 30분마다 데이터 갱신

# 첫 데이터 수동 갱신
sudo systemctl start espn-fetcher.service
```

---

## 5단계: Cloudflare 연결 (2가지 방법)

### 방법 A: DNS 프록시 (공인 IP 있는 경우)

1. **Cloudflare Dashboard** → DNS 설정
2. **A 레코드** 추가:
   - Name: `baseball` (또는 원하는 서브도메인)
   - IPv4 address: `<LXC의 공인 IP>`
   - Proxy status: **Proxied** (주황색 구름)
3. **포트 포워딩** (공유기에서):
   - 외부 80/443 → LXC 낶부 3002

### 방법 B: Cloudflare Tunnel (CGNAT/공인 IP 없는 경우) ⭐추천

```bash
# Tunnel 설정 스크립트 실행
sudo ./scripts/setup-cloudflare.sh

# 또는 수동 설정:

# 1. cloudflared 설치
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb

# 2. 인증
cloudflared tunnel login

# 3. 터널 생성
cloudflared tunnel create espn-dashboard

# 4. 설정 파일 생성
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /root/.cloudflared/<YOUR_TUNNEL_ID>.json
ingress:
  - hostname: baseball.your-domain.com
    service: http://localhost:3002
  - service: http_status:404
EOF

# 5. DNS 레코드 추가
cloudflared tunnel route dns <YOUR_TUNNEL_ID> baseball.your-domain.com

# 6. 서비스 설치 및 시작
cloudflared service install
systemctl start cloudflared
```

**Tunnel 장점:**
- 포트 포워딩 불필요
- CGNAT 환경에서도 작동
- HTTPS 자동 제공
- IP 노출 없음

---

## 접속 주소

| 방법 | 접속 URL |
|------|----------|
| 로컬 (LXC 낶부) | http://localhost:3002 |
| 로컬 네트워크 | http://<LXC-IP>:3002 |
| Cloudflare DNS | https://baseball.your-domain.com |
| Cloudflare Tunnel | https://baseball.your-domain.com |

---

## 관리 명령어

### 서비스 제어
```bash
# 시작/중지/재시작
sudo systemctl start espn-web
sudo systemctl stop espn-web
sudo systemctl restart espn-web

# 데이터 수집 즉시 실행
sudo systemctl start espn-fetcher.service

# 상태 확인
./scripts/status.sh
```

### 로그 확인
```bash
# 웹 서버 로그
journalctl -u espn-web -f
tail -f /var/log/espn-web.log

# 데이터 수집 로그
journalctl -u espn-fetcher -f
tail -f /var/log/espn-fetcher.log

# Cloudflare Tunnel 로그
journalctl -u cloudflared -f
```

### 업데이트
```bash
./scripts/update.sh
```

---

## 파일 구조

```
/opt/espn-dashboard/
├── fetcher/                 # Python 데이터 수집기
│   ├── build_snapshot.py
│   ├── requirements.txt
│   ├── .env                # ESPN 쿠키 (직접 생성)
│   └── venv/               # Python 가상환경
├── web/                     # Next.js 웹 (Port 3002)
│   ├── app/
│   ├── components/
│   ├── public/data/        # JSON 데이터
│   └── node_modules/
├── scripts/                 # 유틸리티 스크립트
│   ├── install.sh          # 초기 설치
│   ├── setup-services.sh   # Systemd 서비스
│   ├── setup-cloudflare.sh # Cloudflare Tunnel
│   ├── update.sh           # 업데이트
│   └── status.sh           # 상태 확인
└── README.md
```

---

## 문제 해결

### 3002번 포트 충돌
```bash
# 포트 사용 확인
sudo ss -tlnp | grep 3002
sudo lsof -i :3002

# 다른 포트로 변경하려면:
# scripts/install.sh 의 APP_PORT 변수 수정
# scripts/setup-services.sh 의 APP_PORT 변수 수정
# 서비스 재시작
```

### Cloudflare Tunnel 연결 안 됨
```bash
# Tunnel 상태 확인
cloudflared tunnel list
cloudflared tunnel info <TUNNEL_ID>

# 로그 확인
journalctl -u cloudflared -f

# 재시작
systemctl restart cloudflared
```

### 데이터 갱신 안 됨
```bash
# 수동 실행 테스트
cd /opt/espn-dashboard/fetcher
source venv/bin/activate
python build_snapshot.py

# 오류 확인
cat /var/log/espn-fetcher.error.log
```

---

## 보안 체크리스트

- [ ] ESPN 쿠키는 `/opt/espn-dashboard/fetcher/.env`에만 저장
- [ ] `.env` 파일 권한은 600으로 설정
- [ ] Cloudflare Tunnel 사용 시 IP 노출 없음
- [ ] HTTPS 강제 (Cloudflare에서 Always Use HTTPS 설정)

---

## 다음 단계

1. **도메인 설정 완료 후** SSL/TLS 모드를 "Full (strict)"로 설정 권장
2. **캐싱 규칙**: `/data/*` 경로는 5분 캐싱 권장
3. **접근 제한**: Cloudflare Access로 인증 추가 가능

**도움이 필요하시면 말씀해주세요!**
