#!/bin/bash
# Cloudflare Tunnel 설정 스크립트
# Usage: sudo ./setup-cloudflare.sh

set -e

echo "☁️  Cloudflare Tunnel 설정"
echo "=========================="
echo ""

# cloudflared 설치
echo "📥 cloudflared 설치 중..."
if ! command -v cloudflared &> /dev/null; then
    curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i /tmp/cloudflared.deb
    rm /tmp/cloudflared.deb
    echo "✅ cloudflared 설치 완료"
else
    echo "✅ cloudflared가 이미 설치되어 있습니다"
fi

echo ""
echo "📝 Cloudflare Tunnel 인증 및 생성"
echo "------------------------------------"
echo ""
echo "아래 단계를 따라주세요:"
echo ""
echo "1. 다음 명령어를 실행하여 인증하세요:"
echo "   cloudflared tunnel login"
echo ""
echo "2. 브라우저에서 인증 후, 터널을 생성하세요:"
echo "   cloudflared tunnel create espn-dashboard"
echo ""
echo "3. 생성된 터널 ID를 확인하세요:"
echo "   cloudflared tunnel list"
echo ""
echo "4. 설정 파일을 생성하세요:"
echo "   nano ~/.cloudflared/config.yml"
echo ""
echo "   다음 내용을 추가하세요:"
echo "   ----------------------------------------"
echo "   tunnel: <YOUR_TUNNEL_ID>"
echo "   credentials-file: /root/.cloudflared/<YOUR_TUNNEL_ID>.json"
echo "   ingress:"
echo "     - hostname: baseball.your-domain.com"
echo "       service: http://localhost:3002"
echo "     - service: http_status:404"
echo "   ----------------------------------------"
echo ""
echo "5. DNS 레코드 추가:"
echo "   cloudflared tunnel route dns <YOUR_TUNNEL_ID> baseball.your-domain.com"
echo ""
echo "6. Systemd 서비스 설치:"
echo "   cloudflared service install"
echo "   systemctl start cloudflared"
echo ""
echo "✅ 완료! 이제 https://baseball.your-domain.com 으로 접속 가능합니다"
