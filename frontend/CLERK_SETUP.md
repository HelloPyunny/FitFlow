# Clerk Authentication Setup Guide

## 1. Install Clerk

Clerk 패키지는 이미 package.json에 추가되었습니다. 다음 명령어로 설치하세요:

```bash
cd frontend
npm install
```

## 2. Clerk 계정 생성 및 키 발급

1. https://dashboard.clerk.com 에서 계정 생성
2. 새 애플리케이션 생성
3. API Keys 페이지에서 Publishable Key 복사

## 3. 환경 변수 설정

`frontend/.env.local` 파일을 생성하고 다음 내용을 추가하세요 (`.env` 파일도 사용 가능):

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_API_URL=http://localhost:8000
```

**중요**: 
- `.env.local` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.
- `.env.local`이 `.env`보다 우선순위가 높습니다.
- 실제 키는 절대 코드 파일에 포함하지 마세요.

## 4. Clerk Dashboard 설정

Clerk Dashboard에서 다음을 설정하세요:

- **Sign-in/Sign-up URLs**: 
  - Allowed redirect URLs: `http://localhost:5173/*`
  - Sign-in URL: `http://localhost:5173/sign-in`
  - Sign-up URL: `http://localhost:5173/sign-up`
  - After sign-in redirect: `http://localhost:5173/`
  - After sign-up redirect: `http://localhost:5173/`

## 5. 실행

```bash
npm run dev
```

## 구현된 기능

- ✅ 로그인/회원가입 페이지 (`/sign-in`, `/sign-up`)
- ✅ 보호된 라우트 (인증 필요)
- ✅ 네비게이션에 UserButton 표시
- ✅ WelcomeOverlay가 로그인 후 사용자 이름과 함께 표시
- ✅ 사용자별 데이터 분리 (userId 기반)
- ✅ Profile 페이지 Clerk 연동

## 보호된 라우트

다음 페이지들은 로그인이 필요합니다:
- `/` (Today)
- `/workout-log`
- `/dashboard`
- `/profile`

인증되지 않은 사용자는 자동으로 `/sign-in`으로 리다이렉트됩니다.
