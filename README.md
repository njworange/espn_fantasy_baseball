# ESPN Fantasy Baseball Dashboard

ESPN Fantasy Baseball 리그의 순위, 경기 결과, 주간 트렌드를 한눈에 볼 수 있는 대시보드입니다.

## 🎯 이 프로젝트는 어떻게 사용하나요?

1. **GitHub에서 이 저장소를 Fork 또는 Clone**합니다.
2. **자신의 서버(Ubuntu/Synology)에 다운로드**합니다.
3. **config.json을 설정**하여 자신의 리그 정보를 입력합니다.
4. **ESPN에서 데이터를 가져와** 대시보드를 실행합니다.
5. **웹 브라우저에서 접속**하여 리그 현황을 확인합니다.

---

## 📋 목차

1. [주요 기능](#주요-기능)
2. [시작하기 전에 체크리스트](#시작하기-전에-체크리스트)
   - [준비사항 체크리스트](#-준비사항-체크리스트)
   - [내 서버 종류 확인하기](#-내-서버-종류-확인하기)
   - [필요한 정보 미리 준비하기](#-필요한-정보-미리-준비하기)
3. [Ubuntu에서 설치/실행](#ubuntu에서-설치실행)
4. [Synology NAS에서 설치/실행](#synology-nas에서-설치실행)
5. [config.json 설정](#configjson-설정)
   - [팀 이름 확인하는 방법](#팀-이름-확인하는-방법)
6. [ESPN 데이터 가져오기](#espn-데이터-가져오기)
7. [자동 업데이트 설정](#자동-업데이트-설정)
8. [문제 해결](#문제-해결)

---

## ✨ 주요 기능

- **순위표 (Standings)**: 전체 시즌 순위 및 최근 3주/5주 필터
- **주간 트렌드 (Weekly Trend)**: 주차별 순위 변화 그래프 (애니메이션 지원)
- **카테고리 분석 (Category Analysis)**: 각 팀의 카테고리별 성과
- **팀 프로필 (Team Profile)**: 특정 팀의 상세 정보, H2H 전적, 최근 경기
- **플레이오프 (Playoffs)**: 브라켓 표시 및 최종 순위
- **전체 순위 (Overall Standings)**: 종합 순위표

---

## 🚀 시작하기 전에 체크리스트

설치를 시작하기 전에 다음 항목을 확인해주세요. 하나라도 준비되지 않았다면 아래의 **상세 설치 가이드**를 먼저 확인하세요.

### ✅ 준비사항 체크리스트

- [ ] **서버가 준비되었나요?**
  - 개인 PC (Windows/Mac/Ubuntu)
  - 클라우드 서버 (AWS, GCP, Azure 등)
  - NAS (Synology, QNAP 등)
  - **→ [내 서버 종류 확인하기](#내-서버-종류-확인하기)**

- [ ] **Python이 설치되었나요?** (버전 3.8 이상)
  - 터미널/명령 프롬프트에서 `python --version` 또는 `python3 --version` 실행필요
  - **→ [Python 설치 방법](#python-설치-확인)**

- [ ] **Git이 설치되었나요?**
  - 터미널에서 `git --version` 실행 필요
  - **→ [Git 설치 방법](#git-설치-확인)**

- [ ] **ESPN Fantasy 리그에 가입되어 있나요?**
  - 리그 ID를 알고 있어야 합니다
  - **→ [LEAGUE_ID 찾는 방법](#league_id-찾는 방법)**

- [ ] **서버 IP 주소를 알고 있나요?**
  - 브라우저에서 접속할 주소가 필요합니다
  - **→ [IP 주소 확인 방법](#ip-주소-확인-방법)**

---

### 🤔 내 서버 종류 확인하기

**나는 어떤 가이드를 따라야 하나요?**

| 당신의 환경 | 따라야 할 가이드 |
|------------|----------------|
| **VirtualBox, VMware, Proxmox에 설치한 Ubuntu** | → [Ubuntu 가이드](#ubuntu에서-설치실행) |
| **AWS EC2, Google Cloud, Azure VM (Ubuntu)** | → [Ubuntu 가이드](#ubuntu에서-설치실행) |
| **라즈베리파이, ODROID 등 (Linux)** | → [Ubuntu 가이드](#ubuntu에서-설치실행) |
| **Synology NAS (DSM)** | → [Synology 가이드](#synology-nas에서-설치실행) |
| **Windows PC에서 테스트** | → [Ubuntu 가이드](#ubuntu에서-설치실행)를 참고하되 WSL2 사용 |
| **Mac에서 테스트** | → [Ubuntu 가이드](#ubuntu에서-설치실행)를 참고하되 터미널 사용 |

**잘 모르겠다면?**
- 흰색 상자 형태의 기기 = Synology 가이드
- 검은색 상자 또는 클라우드 = Ubuntu 가이드

---

### 📝 필요한 정보 미리 준비하기

설치 전에 다음 정보를 미리 준비하면 더 빠르게 진행할 수 있습니다:

#### LEAGUE_ID 찾는 방법

1. ESPN Fantasy Baseball 리그 페이지에 접속합니다
2. 브라우저 주소창의 URL을 확인합니다:
   ```
   https://fantasy.espn.com/baseball/league?leagueId=12345678
                                                      ↑^^^^^^^
                                                   이 숫자가 LEAGUE_ID
   ```
3. `12345678` 부분을 메모장에 저장합니다

#### IP 주소 확인 방법

**Ubuntu 서버:**
```bash
# 서버에 SSH로 접속한 후
ip addr show | grep "inet " | head -1
# 또는
hostname -I
```

**Synology NAS:**
1. DSM에 로그인
2. `제어판` → `정보 센터` → `네트워크`
3. IP 주소 확인 (예: 192.168.1.100)

**클우드 서버 (AWS/GCP/Azure):**
- 콘솔에서 인스턴스의 Public IP 확인
- 또는 할당된 도메인 사용

### 🔧 Python 설치 확인

**설치 확인:**
```bash
python3 --version
# 또는
python --version
```

**출력 예시:**
```
Python 3.10.12
```

**설치되어 있지 않다면:**

**Ubuntu:**
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

**Synology:**
1. Package Center에서 "Python 3" 검색
2. 설치 클릭

**Windows (WSL2):**
```bash
# WSL2 터미널에서
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

**Mac:**
```bash
# Homebrew가 설치되어 있다면
brew install python3
```

### 🔧 Git 설치 확인

**설치 확인:**
```bash
git --version
```

**출력 예시:**
```
git version 2.34.1
```

**설치되어 있지 않다면:**

**Ubuntu:**
```bash
sudo apt install git
```

**Synology:**
1. Package Center에서 "Git Server" 검색
2. 설치 클릭

**Windows:**
- https://git-scm.com/download/win 에서 다운로드

**Mac:**
```bash
brew install git
```

---

### ⚡ 5분 완료 Quick Start (모든 준비가 끝난 분들용)

모든 준비가 끝났고, 이미 서버에 접속한 상태라면:

```bash
# 1. 코드 다운로드
git clone https://github.com/njworange/espn_fantasy_baseball_dashboard.git
cd espn_fantasy_baseball_dashboard

# 2. 설정 파일 생성
cp config.json.example config.json
# → config.json을 편집하여 팀 정보 입력

# 3. 데이터 수집
cd fetcher
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# → .env 파일에 ESPN 쿠키 입력
python build_snapshot.py
cd ..

# 4. 실행
python3 -m http.server 8080
```

브라우저에서 `http://서버IP:8080` 접속

**⚠️ 위 명령어가 이핼되지 않는다면 아래의 상세 가이드를 따라주세요!**

---

## 🐧 Ubuntu에서 설치/실행

### 시스템 요구사항
- Ubuntu 20.04 LTS 이상
- Python 3.8 이상
- Git

### 설치 과정

#### 1. 시스템 업데이트 및 필수 패키지 설치

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y git python3 python3-pip python3-venv
```

#### 2. 프로젝트 다운로드

```bash
# 홈 디렉토리로 이동
cd ~

# GitHub에서 클론
git clone https://github.com/njworange/espn_fantasy_baseball_dashboard.git

# 프로젝트 폴로로 이동
cd espn_fantasy_baseball_dashboard
```

#### 3. config.json 설정

```bash
# 예시 파일을 복사
cp config.json.example config.json

# nano 또는 vim으로 편집
nano config.json
```

**config.json 수정 예시:**
```json
{
  "league": {
    "name": "Copper Coast Baseball",
    "regularSeasonWeeks": 22,
    "tiebreaker": {
      "enabled": true,
      "applyAtWeek": 22
    }
  },
  "owners": {
    "Seoul Sluggers": "김범주",
    "Busan Breakers": "남정훈",
    "Incheon Heat": "이용균",
    "Daegu Drift": "문경훈"
  }
}
```

#### 4. Python 가상환경 설정 및 데이터 수집기 설치

```bash
# fetcher 디렉토리로 이동
cd fetcher

# 가상환경 생성
python3 -m venv venv

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

#### 5. ESPN 쿠키 설정 (.env 파일)

```bash
# .env 파일 생성
nano .env
```

**.env 파일 내용:**
```env
LEAGUE_ID=12345678
SEASON_YEAR=2025
ESPN_S2=your_espn_s2_cookie_here
SWID={your_swid_here}
OUTPUT_PATH=../data/league-snapshot-2025.json
```

**ESPN 쿠키 가져오는 방법 (Chrome 기준):**

1. **ESPN Fantasy Baseball 리그 페이지에 로그인**
   - https://fantasy.espn.com/baseball/... 주소 확인

2. **개발자 도구 열기**
   - **Windows**: `F12` 키 누르기
   - **Mac**: `Cmd + Option + I` 누르기
   - 또는 브라우저 메뉴 → `도구 더보기` → `개발자 도구`

3. **Application 탭 찾기**
   - 개발자 도구 상단에 여러 탭이 있음 (Elements, Console, Network...)
   - `Application` 탭 클릭
   - **찾을 수 없다면?** `>>` 버튼을 눌러 더 많은 탭 보기

4. **Cookies 메뉴 찾기**
   - 왼쪽 사이드바에서 `Application` 아래를 펼침
   - `Storage` → `Cookies` 클릭
   - `https://fantasy.espn.com` 클릭

5. **쿠키 값 복사**
   - 오른쪽 목록에서 `espn_s2` 찾기
     - `Value` 컬럼의 긴 문자열 더블클릭
     - `Ctrl+C` (또는 `Cmd+C`)로 복사
   - `SWID` 찾기
     - `{` 로 시작하는 값 (예: `{12345678-1234-...}`)
     - 중괄호 `{}` 포함해서 복사

6. **.env 파일에 붙여넣기**
   ```env
   ESPN_S2=복사한_espn_s2_값_여기에
   SWID={복사한_SWID_값_여기에}
   ```

**⚠️ 주의사항:**
- 쿠키 값은 **매우 긴 문자열**입니다 (100자 이상)
- 복사할 때 끝까지 다 복사되었는지 확인하세요
- 로그아웃하거나 브라우저 쿠키를 지우면 값이 바뀔 수 있습니다

#### 6. 데이터 수집 실행

```bash
# 데이터 수집
python build_snapshot.py

# 성공 메시지 확인
# "Successfully saved snapshot to ../data/league-snapshot-2025.json"
```

#### 7. 웹 서버 실행 (개발용)

```bash
# 프로젝트 루트로 이동
cd ..

# Python 웹 서버 실행 (포트 8080)
python3 -m http.server 8080

# 백그라운드에서 실행하려면
nohup python3 -m http.server 8080 > server.log 2>&1 &
```

#### 8. 브라우저에서 접속

```
http://우분투서버IP:8080
```

### Ubuntu - Systemd 서비스로 등록 (권장)

부팅 시 자동 시작 및 백그라운드 실행을 위해 systemd 서비스로 등록:

#### 1. 서비스 파일 생성

```bash
sudo nano /etc/systemd/system/espn-dashboard.service
```

**서비스 파일 내용:**
```ini
[Unit]
Description=ESPN Fantasy Baseball Dashboard
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/espn_fantasy_baseball_dashboard
ExecStart=/usr/bin/python3 -m http.server 8080
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 2. 서비스 활성화 및 시작

```bash
# 서비스 파일 재로드
sudo systemctl daemon-reload

# 서비스 활성화 (부팅 시 자동 시작)
sudo systemctl enable espn-dashboard

# 서비스 시작
sudo systemctl start espn-dashboard

# 상태 확인
sudo systemctl status espn-dashboard
```

#### 3. 방화벽 설정 (필요한 경우)

```bash
# UFW 방화벽이 활성화된 경우
sudo ufw allow 8080/tcp

# 또는 특정 IP만 허용
sudo ufw allow from 192.168.1.0/24 to any port 8080
```

---

## 🖥️ Synology NAS에서 설치/실행

### 시스템 요구사항
- Synology DSM 7.0 이상
- Docker 패키지 (선택사항)
- Web Station 패키지 (선택사항)

### 방법 1: SSH로 직접 설치 (권장)

#### 1. SSH 활성화

1. Synology DSM에 로그인
2. `제어판` → `터미널 및 SNMP` → `SSH 서비스 활성화` 체크
3. `적용` 클릭

#### 2. SSH로 접속

```bash
# Windows: PowerShell 또는 Git Bash 사용
ssh your-synology-username@your-synology-ip

# 예시
ssh admin@192.168.1.100
```

#### 3. Git 설치 (없는 경우)

```bash
# Synology Package Center에서 Git Server 설치 후
# 또는 ipkg/opkg 사용

# Git 설치 확인
git --version
```

#### 4. 프로젝트 다운로드

```bash
# 원하는 디렉토리로 이동 (예: /volume1/web)
cd /volume1/web

# GitHub에서 클론
git clone https://github.com/njworange/espn_fantasy_baseball_dashboard.git

# 프로젝트 폴로로 이동
cd espn_fantasy_baseball_dashboard
```

#### 5. Python 및 pip 설치

```bash
# Synology Package Center에서 Python3 설치
# 설치 후 Python3 경로 확인
which python3
# 출력 예시: /usr/bin/python3 또는 /usr/local/bin/python3

# pip 설치 (없는 경우)
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python3 get-pip.py
```

#### 6. config.json 설정

```bash
cp config.json.example config.json

# vi 또는 nano로 편집
vi config.json
```

#### 7. 데이터 수집기 설정

```bash
cd fetcher

# 가상환경 생성
python3 -m venv venv
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# .env 파일 생성 및 ESPN 쿠키 설정
vi .env

# 데이터 수집
python build_snapshot.py
```

#### 8. Web Station으로 웹 서버 설정 (권장)

**방법 A: Web Station 사용**

1. Synology `Package Center`에서 `Web Station` 설치
2. `Web Station` → `웹 서비스` → `만들기`
3. 다음 설정 입력:
   - **가상 호스트**: 선택 (또는 포트 사용)
   - **문서 루트**: `/volume1/web/espn_fantasy_baseball_dashboard`
   - **HTTP**: 포트 8080 (또는 원하는 포트)
   - **PHP**: 사용 안함 (정적 파일만)
4. `저장` 클릭

**방법 B: Python 웹 서버 사용**

```bash
# 프로젝트 루트로 이동
cd /volume1/web/espn_fantasy_baseball_dashboard

# 백그라운드에서 웹 서버 실행
nohup python3 -m http.server 8080 > server.log 2>&1 &

# 프로세스 확인
ps aux | grep http.server
```

#### 9. Task Scheduler로 자동 업데이트 설정

1. Synology DSM에서 `제어판` → `작업 스케줄러` 클릭
2. `만들기` → `예약된 작업` → `사용자 정의 스크립트`
3. **일반** 탭:
   - 작업 이름: `ESPN 데이터 업데이트`
   - 사용자: `root`
4. **일정** 탭:
   - 실행 빈도: `매일`
   - 첫 실행 시간: `오전 9:00`
   - 마지막 실행 시간: `오후 11:00`
   - 몇 분마다: `30` (30분마다)
5. **작업 설정** 탭:
   - 사용자 정의 스크립트:

```bash
cd /volume1/web/espn_fantasy_baseball_dashboard/fetcher
source venv/bin/activate
python build_snapshot.py
```

6. `확인` 클릭

### 방법 2: Docker 사용 (고급)

Docker를 사용하면 환경 설정이 간단합니다.

#### 1. Dockerfile 생성

프로젝트 루트에 `Dockerfile` 생성:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 필수 패키지 설치
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# 프로젝트 파일 복사
COPY . /app/

# Python 의존성 설치
RUN pip install --no-cache-dir -r fetcher/requirements.txt

# 데이터 디렉토리 생성
RUN mkdir -p /app/data

# 웹 서버 포트
EXPOSE 8080

# 웹 서버 실행
CMD ["python", "-m", "http.server", "8080"]
```

#### 2. Docker Compose 파일 생성

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  espn-dashboard:
    build: .
    container_name: espn-dashboard
    ports:
      - "8080:8080"
    volumes:
      - ./config.json:/app/config.json:ro
      - ./data:/app/data
      - ./fetcher/.env:/app/fetcher/.env:ro
    restart: unless-stopped
```

#### 3. Docker 이미지 빌드 및 실행

```bash
# Synology Container Manager 또는 SSH에서 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

---

## ⚙️ config.json 설정

### 기본 구조

```json
{
  "league": {
    "name": "리그 이름",
    "regularSeasonWeeks": 22,
    "tiebreaker": {
      "enabled": true,
      "applyAtWeek": 22
    }
  },
  "owners": {
    "팀명1": "오너이름1",
    "팀명2": "오너이름2"
  }
}
```

### 필드 설명

| 필드 | 설명 | 예시 |
|------|------|------|
| `league.name` | 리그 이름 (화면 상단에 표시) | `"Copper Coast Baseball"` |
| `league.regularSeasonWeeks` | 정규시즌 총 주차 수 | `22` (대부분의 리그는 22주) |
| `league.tiebreaker.enabled` | H2H 타이브레이커 사용 여부 | `true` 또는 `false` |
| `league.tiebreaker.applyAtWeek` | 타이브레이커 적용 주차 | `22` (정규시즌 마지막 주차) |
| `owners` | 팀명과 오너 이름 매핑 | 객체 형태로 팀명: 오너이름 |

### owners 설정 예시

```json
"owners": {
  "Seoul Sluggers": "김범주",
  "Busan Breakers": "남정훈",
  "Incheon Heat": "이용균",
  "Daegu Drift": "문경훈",
  "T🥇W🥇": "김태우"
}
```

**중요:**
- ESPN에 등록된 팀 이름과 **정확히 일치**해야 합니다 (대소문자, 공백, 특수문자 포함)
- 입력하지 않은 팀은 ESPN 기본 owner 이름으로 표시됩니다

### 팀 이름 확인하는 방법

**방법 1: ESPN 리그 페이지에서 확인**
1. ESPN Fantasy Baseball 리그 페이지 접속
2. 상단 메뉴에서 `My Team` 또는 `Teams` 클릭
3. 팀 목록에서 정확한 팀 이름 확인

**방법 2: 데이터 수집 후 JSON 파일에서 확인**
```bash
# 데이터 수집 후
cat data/league-snapshot-2025.json | grep -o '"name": "[^"]*"' | head -20
```

**방법 3: 브라우저 개발자 도구로 확인**
1. ESPN 리그 페이지에서 F12 누르기
2. Console 탭 클릭
3. 다음 코드 입력:
   ```javascript
   // 팀 이름 목록 출력
   document.querySelectorAll('.teamName').forEach(el => console.log(el.textContent.trim()))
   ```

**⚠️ 자주 발생하는 문제:**
- **대소문자**: `"Seoul Sluggers"` ≠ `"seoul sluggers"`
- **공백**: `"Team A"` ≠ `"Team A "` (끝에 공백 있음)
- **특수문자**: `"T🥇W🥇"`는 이모지 포함해서 정확히 입력
- **작은따옴표**: `"chang seob's Team"`은 작은따옴표 포함

**확인 팁:**
- 모르겠으면 일단 빈 config.json으로 실행필요
- 대시보드에서 표시되는 팀 이름을 그대로 복사해서 사용

---

## 📊 ESPN 데이터 가져오기

### 1. ESPN 쿠키 확인

1. ESPN Fantasy Baseball 리그 페이지에 로그인
2. F12 → Application → Cookies → fantasy.espn.com
3. `espn_s2`와 `SWID` 값 복사

### 2. .env 파일 설정

```bash
cd fetcher
vi .env
```

```env
LEAGUE_ID=12345678
SEASON_YEAR=2025
ESPN_S2=AEA1j3... (긴 문자열)
SWID={12345678-1234-1234-1234-123456789012}
OUTPUT_PATH=../data/league-snapshot-2025.json
```

### 3. 데이터 수집 실행

```bash
# 가상환경 활성화 (Ubuntu)
source venv/bin/activate

# 데이터 수집
python build_snapshot.py
```

### 4. 출력 확인

```
Successfully saved snapshot to ../data/league-snapshot-2025.json
Teams: 12
Current Week: 15
```

---

## 🔄 자동 업데이트 설정

### Ubuntu - Cron 사용

```bash
# 크론탭 편집
crontab -e

# 30분마다 데이터 업데이트
*/30 * * * * cd /home/username/espn_fantasy_baseball_dashboard/fetcher && /home/username/espn_fantasy_baseball_dashboard/fetcher/venv/bin/python build_snapshot.py >> /home/username/espn-dashboard-cron.log 2>&1
```

### Synology - Task Scheduler 사용

1. `제어판` → `작업 스케줄러`
2. `만들기` → `예약된 작업` → `사용자 정의 스크립트`
3. 일정: 매일 30분마다
4. 스크립트:

```bash
cd /volume1/web/espn_fantasy_baseball_dashboard/fetcher
source venv/bin/activate
python build_snapshot.py
```

---

## ❗ 문제 해결

### "config.json 파일을 불러올 수 없습니다" 에러

**원인**: config.json이 없거나 위치가 잘못됨

**해결**:
```bash
# config.json.example을 config.json으로 복사
cp config.json.example config.json

# config.json이 index.html과 같은 디렉토리에 있는지 확인
ls -la config.json
```

### "Failed to load season" 에러

**원인**: 데이터 파일이 없음

**해결**:
```bash
# fetcher에서 데이터 수집
cd fetcher
source venv/bin/activate
python build_snapshot.py

# data 디렉토리에 파일이 생성되었는지 확인
ls -la ../data/
```

### "No module named 'espn_api'" 에러

**원인**: Python 가상환경이 활성화되지 않았거나 의존성이 설치되지 않음

**해결**:
```bash
cd fetcher
source venv/bin/activate  # Ubuntu
# 또는
source venv/bin/activate  # Synology

pip install -r requirements.txt
```

### Permission denied 에러

**원인**: 파일 권한 문제

**해결**:
```bash
# Ubuntu
sudo chown -R $USER:$USER /path/to/espn_fantasy_baseball_dashboard

# Synology
sudo chown -R admin:users /volume1/web/espn_fantasy_baseball_dashboard
```

### Synology에서 Web Station 작동 안함

**확인사항**:
1. Web Station이 실행 중인지 확인
2. 문서 루트 경로가 정확한지 확인
3. PHP는 필요 없음 (정적 HTML 파일)
4. 방화벽에서 해당 포트가 열린있는지 확인

---

## 📁 파일 구조

```
espn_fantasy_baseball_dashboard/
├── config.json              ← 개인 설정 (Git에 커밋하지 마세요!)
├── config.json.example      ← 설정 예시
├── index.html              ← 메인 페이지
├── css/                    ← 스타일시트
│   ├── reset.css
│   ├── variables.css
│   ├── components.css
│   └── app.css
├── js/                     ← JavaScript
│   ├── app.js
│   ├── data.js
│   ├── router.js
│   ├── standings.js
│   ├── weekly-trend.js
│   ├── category-analysis.js
│   ├── team-profile.js
│   ├── playoffs.js
│   └── overall-standings.js
├── data/                   ← 리그 데이터
│   └── league-snapshot-2025.json
└── fetcher/                ← ESPN 데이터 수집
    ├── build_snapshot.py
    ├── requirements.txt
    ├── .env               ← ESPN 쿠키 (Git에 커밋하지 마세요!)
    └── venv/              ← Python 가상환경
```

---

## 🔒 보안 및 개인정보 보호

### Git에 커밋하지 말아야 할 파일

- `config.json` - 오너 이름 등 개인정보
- `data/league-snapshot-*.json` - 리그 데이터
- `fetcher/.env` - ESPN 로그인 쿠키

이 파일들은 `.gitignore`에 이미 포함되어 있습니다.

### 팀원과 공유 시 주의사항

- `config.json`에는 실제 이름이 포함되어 있을 수 있습니다
- 민감한 정보가 포함된 경우 접근 권한을 제한하세요
- 외부 공개용 서버라면 `config.json`의 owners를 닉네임으로 설정하세요

---

## 📝 업데이트 방법

### 소스 코드 업데이트

```bash
# 프로젝트 디렉토리로 이동
cd espn_fantasy_baseball_dashboard

# 최신 코드 가져오기
git pull origin main

# config.json과 data는 유지됩니다 (gitignore에 의해 보호됨)
```

### 주의사항

- 업데이트 후 `fetcher/requirements.txt`가 변경되었을 수 있습니다
- 필요한 경우 의존성을 다시 설치하세요:
  ```bash
  cd fetcher
  source venv/bin/activate
  pip install -r requirements.txt --upgrade
  ```

---

## 💬 지원 및 기여

### 버그 신고 또는 기능 요청

GitHub Issues를 통해 신고해주세요.

### 기여 방법

1. Fork 생성
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 생성

---

## 📜 라이선스

MIT License

자유롭게 사용, 수정, 배포 가능합니다.

---

**Happy Baseball! ⚾**

Enjoy your fantasy baseball season!
