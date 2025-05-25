#!/bin/bash

# 프로덕션 배포 스크립트
set -e  # 에러 발생 시 스크립트 중단

echo "🚀 프로덕션 배포 시작..."

# 1. 환경변수 확인
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production 파일이 없습니다."
    exit 1
fi

# 2. 데이터베이스 백업
echo "📦 데이터베이스 백업 중..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
source .env.production
mysqldump -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME > $BACKUP_FILE
echo "✅ 백업 완료: $BACKUP_FILE"

# 3. 마이그레이션 상태 확인
echo "🔍 현재 마이그레이션 상태 확인..."
yarn migration:show:prod

# 4. 빌드
echo "🔨 프로젝트 빌드 중..."
yarn build

# 5. 마이그레이션 실행
echo "🗄️ 마이그레이션 실행 중..."
yarn migration:run:prod

# 6. 서버 재시작
echo "🔄 서버 재시작 중..."
pm2 restart backend_v2 || pm2 start dist/main.js --name backend_v2

echo "✅ 프로덕션 배포 완료!"
echo "📋 백업 파일: $BACKUP_FILE"
echo "🔍 서버 상태 확인: pm2 status" 