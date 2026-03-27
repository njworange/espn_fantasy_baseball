#!/bin/bash
# ESPN Fantasy Baseball Dashboard - 상태 확인 스크립트
# Usage: ./status.sh

INSTALL_DIR="/opt/espn-dashboard"
APP_PORT="3001"

echo "📊 ESPN Fantasy Baseball Dashboard 상태 확인"
echo "=============================================="
echo ""

# 1. 서비스 상태
echo "🔍 서비스 상태:"
echo "----------------"
systemctl is-active --quiet espn-web && echo "✅ espn-web: 실행 중" || echo "❌ espn-web: 중지됨"
systemctl is-active --quiet espn-fetcher.timer && echo "✅ espn-fetcher.timer: 활성화됨" || echo "❌ espn-fetcher.timer: 비활성화"
systemctl is-active --quiet nginx && echo "✅ nginx: 실행 중" || echo "❌ nginx: 중지됨"
echo ""

# 2. 포트 확인
echo "🔌 포트 상태:"
echo "-------------"
if ss -tlnp | grep -q ":$APP_PORT"; then
    echo "✅ 포트 $APP_PORT: 열림"
    ss -tlnp | grep ":$APP_PORT"
else
    echo "❌ 포트 $APP_PORT: 닫힘"
fi
echo ""

# 3. 디스크 사용량
echo "💾 디스크 사용량:"
echo "-----------------"
df -h $INSTALL_DIR | tail -1
echo ""

# 4. 메모리 사용량
echo "🧠 메모리 사용량:"
echo "-----------------"
free -h | grep "Mem:"
echo ""

# 5. 마지막 데이터 업데이트
echo "📅 마지막 데이터 업데이트:"
echo "---------------------------"
if [ -f "$INSTALL_DIR/web/public/data/league-snapshot.json" ]; then
    ls -lh $INSTALL_DIR/web/public/data/league-snapshot.json
    echo "파일 크기: $(du -h $INSTALL_DIR/web/public/data/league-snapshot.json | cut -f1)"
else
    echo "❌ 데이터 파일이 없습니다"
fi
echo ""

# 6. 최근 로그
echo "📋 최근 로그 (마지막 10줄):"
echo "----------------------------"
if [ -f "/var/log/espn-fetcher.log" ]; then
    echo "Fetcher 로그:"
    tail -5 /var/log/espn-fetcher.log
    echo ""
fi

if [ -f "/var/log/espn-web.log" ]; then
    echo "Web 로그:"
    tail -5 /var/log/espn-web.log
fi
echo ""

# 7. 타이머 다음 실행 시간
echo "⏰ 다음 데이터 수집 예정:"
echo "--------------------------"
systemctl list-timers espn-fetcher.timer --no-pager
