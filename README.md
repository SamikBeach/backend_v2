# 고전산책 백엔드 API

NestJS로 개발된 고전산책 애플리케이션의 백엔드 API입니다.

## 기능

- 사용자 인증 (이메일/비밀번호 로그인)
- 소셜 로그인 (Google, Apple)
- 이메일 인증
- 비밀번호 재설정

## 기술 스택

- NestJS
- TypeORM
- MySQL
- JWT 기반 인증
- Passport.js

## 설치 및 실행

### 요구사항

- Node.js 16.x 이상
- Yarn 패키지 매니저
- MySQL 데이터베이스

### 설치

```bash
# 의존성 설치
yarn install
```

### 환경 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 필요한 설정값을 입력하세요.

```bash
cp .env.example .env
```

### 개발 서버 실행

```bash
yarn dev
```

### 빌드 및 프로덕션 실행

```bash
# 빌드
yarn build

# 실행
yarn start:prod
```

## API 엔드포인트

### 인증 API

- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/social-login` - 소셜 로그인
- `POST /api/auth/verify-email` - 이메일 인증
- `POST /api/auth/request-password-reset` - 비밀번호 재설정 요청
- `POST /api/auth/reset-password` - 비밀번호 재설정

### 사용자 API

- `GET /api/users` - 모든 사용자 조회 (인증 필요)
- `GET /api/users/:id` - 특정 사용자 조회 (인증 필요)
- `POST /api/users/verify` - 사용자 이메일 인증
