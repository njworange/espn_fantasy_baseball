#!/bin/bash
# ESPN Fantasy Baseball Dashboard - Proxmox LXC 설치 스크립트 (Cloudflare 버전)
# nginx 없이 Cloudflare Tunnel/DNS 사용
# Usage: ./install.sh (LXC 낶部에서 실행)

set -e

echo "🏗️  ESPN Fantasy Baseball Dashboard 설치 시작..."
echo "   (Cloudflare + Port 3001 버전)"

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 작업 디렉토리
INSTALL_DIR="/opt/espn-dashboard"
APP_PORT="3002"

# 1. 시스템 업데이트
echo -e "${YELLOW}[1/7] 시스템 패키지 업데이트 중...${NC}"
apt update && apt upgrade -y

# 2. 필수 패키지 설치 (nginx 제외)
echo -e "${YELLOW}[2/7] 필수 패키지 설치 중...${NC}"
apt install -y \
    git \
    curl \
    wget \
    python3 \
    python3-pip \
    python3-venv \
    vim \
    htop

# 3. Node.js 20.x 설치
echo -e "${YELLOW}[3/7] Node.js 설치 중...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

echo -e "${GREEN}✓ Node.js 버전: $(node --version)${NC}"
echo -e "${GREEN}✓ NPM 버전: $(npm --version)${NC}"

# 4. 작업 디렉토리 생성
echo -e "${YELLOW}[4/7] 작업 디렉토리 설정 중...${NC}"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# 5. 프로젝트 파일 복사 (현재 디렉토리에서)
echo -e "${YELLOW}[5/7] 프로젝트 파일 복사 중...${NC}"
if [ -d "web" ] && [ -d "fetcher" ]; then
    echo -e "${GREEN}✓ 프로젝트 파일이 이미 존재합니다${NC}"
else
    echo -e "${RED}✗ web/ 또는 fetcher/ 디렉토리가 없습니다${NC}"
    echo "프로젝트 파일을 $INSTALL_DIR 에 복사한 후 다시 실행하세요"
    exit 1
fi

# 6. Next.js 3002 포트로 설정
echo -e "${YELLOW}[6/7] Next.js 포트 설정 (3002)...${NC}"
cd $INSTALL_DIR/web

# package.json에서 포트 3002로 변경
if grep -q '"dev": "next dev"' package.json; then
    sed -i 's/"dev": "next dev"/"dev": "next dev -p 3002"/g' package.json
    sed -i 's/"start": "next start"/"start": "next start -p 3002"/g' package.json
    echo -e "${GREEN}✓ package.json 포트 설정 완료 (3002)${NC}"
fi

# 7. 의존성 설치
echo -e "${YELLOW}[7/7] 의존성 설치 중...${NC}"

# Python fetcher
cd $INSTALL_DIR/fetcher
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✓ Python 의존성 설치 완료${NC}"

# Next.js
cd $INSTALL_DIR/web
npm install
echo -e "${GREEN}✓ Node.js 의존성 설치 완료${NC}"

# 8. 환경변수 파일 생성
echo -e "${YELLOW}환경변수 파일 생성 중...${NC}"

# 프론트엔드 환경변수 (로컬 JSON 사용)
cat > $INSTALL_DIR/web/.env.local << 'EOF'
NEXT_PUBLIC_DATA_URL=/data/league-snapshot.json
EOF

# Fetcher 환경변수 템플릿
cat > $INSTALL_DIR/fetcher/.env.example << 'EOF'
LEAGUE_ID=12345678
SEASON_YEAR=2026
ESPN_S2=your_espn_s2_cookie_here
SWID={YOUR-SWID-HERE}
OUTPUT_PATH=/opt/espn-dashboard/web/public/data/league-snapshot.json
EOF

echo -e "${GREEN}✓ 환경변수 파일 생성 완료${NC}"
echo -e "${YELLOW}⚠️  fetcher/.env 파일을 생성하고 실제 ESPN 쿠키를 입력하세요${NC}"

# 9. 권한 설정
echo -e "${YELLOW}권한 설정 중...${NC}"
chmod -R 755 $INSTALL_DIR

# 완료 메시지
echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}✅ 설치가 완료되었습니다!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo "📋 다음 단계:"
echo ""
echo "1. ESPN 쿠키 설정:"
echo "   nano $INSTALL_DIR/fetcher/.env"
echo ""
echo "2. 첫 번째 데이터 가져오기:"
echo "   cd $INSTALL_DIR/fetcher"
echo "   source venv/bin/activate"
echo "   python build_snapshot.py"
echo ""
echo "3. 웹 서버 빌드:"
echo "   cd $INSTALL_DIR/web"
echo "   npm run build"
echo ""
echo "4. 서비스 시작:"
echo "   systemctl start espn-web"
echo "   systemctl start espn-fetcher.timer"
echo ""
echo "5. Cloudflare Tunnel 설정 (선택):"
echo "   ./scripts/setup-cloudflare.sh"
echo ""
echo "6. 접속 테스트:"
echo "   http://$(hostname -I | awk '{print $1}'):3002"
echo ""
echo -e "${YELLOW}💡 systemd 서비스 파일은 ./setup-services.sh 로 설치하세요${NC}"
echo ""
echo -e "${YELLOW}☁️  Cloudflare를 사용하려면:${NC}"
echo "   - DNS 프록시: 도메인 A 레코드를 LXC IP로 설정"
echo "   - Cloudflare Tunnel: ./scripts/setup-cloudflare.sh 실행"
