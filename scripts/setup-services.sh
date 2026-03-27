#!/bin/bash
# ESPN Fantasy Baseball Dashboard - Systemd 서비스 설치 스크립트 (Cloudflare 버전)
# nginx 없이 직접 3001번 포트 사용
# Usage: sudo ./setup-services.sh

set -e

INSTALL_DIR="/opt/espn-dashboard"
APP_PORT="3002"

echo "🔧 Systemd 서비스 설정 중..."
echo "   (Port 3002, no nginx)"

# 1. Python Fetcher 서비스 생성
cat > /etc/systemd/system/espn-fetcher.service << EOF
[Unit]
Description=ESPN Fantasy Baseball Data Fetcher
After=network.target

[Service]
Type=oneshot
User=root
WorkingDirectory=$INSTALL_DIR/fetcher
Environment="PATH=$INSTALL_DIR/fetcher/venv/bin"
EnvironmentFile=$INSTALL_DIR/fetcher/.env
ExecStart=$INSTALL_DIR/fetcher/venv/bin/python build_snapshot.py
StandardOutput=append:/var/log/espn-fetcher.log
StandardError=append:/var/log/espn-fetcher.error.log

[Install]
WantedBy=multi-user.target
EOF

# 2. Fetcher 타이머 생성 (30분마다)
cat > /etc/systemd/system/espn-fetcher.timer << EOF
[Unit]
Description=Run ESPN Fetcher every 30 minutes
Requires=espn-fetcher.service

[Timer]
OnCalendar=*:0/30
Persistent=true

[Install]
WantedBy=timers.target
EOF

# 3. Next.js 웹 서비스 생성 (3001번 포트)
cat > /etc/systemd/system/espn-web.service << EOF
[Unit]
Description=ESPN Fantasy Baseball Web Dashboard
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/web
Environment="PATH=/usr/bin"
Environment="NODE_ENV=production"
Environment="PORT=$APP_PORT"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=append:/var/log/espn-web.log
StandardError=append:/var/log/espn-web.error.log

[Install]
WantedBy=multi-user.target
EOF

# 4. 로그 파일 생성
touch /var/log/espn-fetcher.log
touch /var/log/espn-fetcher.error.log
touch /var/log/espn-web.log
touch /var/log/espn-web.error.log

# 5. Systemd 리로드
systemctl daemon-reload

# 6. 서비스 활성화 (자동 시작)
systemctl enable espn-fetcher.timer
systemctl enable espn-web.service

echo "✅ 서비스 설정 완료!"
echo ""
echo "📋 사용 가능한 명령어:"
echo ""
echo "서비스 시작:"
echo "  systemctl start espn-web          # 웹 서버 (port 3002)"
echo "  systemctl start espn-fetcher.timer # 데이터 수집 타이머"
echo ""
echo "서비스 상태 확인:"
echo "  systemctl status espn-web"
echo "  systemctl status espn-fetcher.timer"
echo ""
echo "로그 확인:"
echo "  journalctl -u espn-web -f"
echo "  tail -f /var/log/espn-fetcher.log"
echo ""
echo "수동으로 데이터 갱신:"
echo "  systemctl start espn-fetcher.service"
echo ""
echo "☁️  Cloudflare 연결 방법:"
echo "  1. DNS 프록시: A 레코드를 이 LXC IP로 설정"
echo "  2. Tunnel: ./scripts/setup-cloudflare.sh 실행"
