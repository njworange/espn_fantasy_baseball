#!/bin/bash
# ESPN Fantasy Baseball Dashboard - 업데이트 스크립트
# Usage: ./update.sh

set -e

INSTALL_DIR="/opt/espn-dashboard"

echo "🔄 ESPN Fantasy Baseball Dashboard 업데이트"
echo ""

# 1. Git pull (Git 저장소인 경우)
if [ -d "$INSTALL_DIR/.git" ]; then
    echo "📥 Git 저장소에서 업데이트 중..."
    cd $INSTALL_DIR
    git pull
fi

# 2. Python 의존성 업데이트
echo "🐍 Python 의존성 업데이트..."
cd $INSTALL_DIR/fetcher
source venv/bin/activate
pip install --upgrade -r requirements.txt

# 3. Node.js 의존성 업데이트
echo "📦 Node.js 의존성 업데이트..."
cd $INSTALL_DIR/web
npm install

# 4. 웹 빌드
echo "🏗️ 웹 애플리케이션 빌드..."
npm run build

# 5. 서비스 재시작
echo "🔄 서비스 재시작..."
systemctl restart espn-web

# 6. 데이터 갱신
echo "📊 데이터 갱신..."
systemctl start espn-fetcher.service

echo ""
echo "✅ 업데이트 완료!"
echo ""
echo "상태 확인:"
echo "  systemctl status espn-web"
echo "  systemctl status espn-fetcher.timer"
