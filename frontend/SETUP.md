# Frontend Setup Guide

## 요구사항
- Node.js 20.x 권장 (LTS)
- npm, make

## 환경 변수
백엔드 주소를 바꿔야 하면 루트에 `.env`를 생성하세요.
```
VITE_API_URL=http://localhost:8000
```
- 설정이 없으면 기본값 `http://localhost:8000`을 사용합니다.

## 의존성 설치
```bash
cd frontend
npm install          # 또는 make install
```

## 로컬 개발 서버
```bash
npm run dev          # 또는 make start
# 기본 포트: http://localhost:5173
```
- 백엔드가 `8000` 포트에서 실행 중인지 확인하세요.

## 빌드/미리보기
```bash
npm run build
npm run preview
```

## 기타 유용한 명령어
- `npm run lint` : ESLint 검사
- `make clean`   : `node_modules`, `dist` 등 정리
