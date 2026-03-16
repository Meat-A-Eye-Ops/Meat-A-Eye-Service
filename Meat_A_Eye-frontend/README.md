# 🎨 Meat-A-Eye Frontend

> Next.js 16 기반 AI 축산물 인식 서비스 대시보드 — 이미지 분석, 냉장고 관리, 시세 시각화, LLM 레시피 추천

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [핵심 기능](#핵심-기능)
- [기술 스택](#기술-스택)
- [페이지 구조](#페이지-구조)
- [주요 컴포넌트](#주요-컴포넌트)
- [API 통신 계층](#api-통신-계층)
- [이미지 처리](#이미지-처리)
- [인증 및 게스트 시스템](#인증-및-게스트-시스템)
- [프로젝트 구조](#프로젝트-구조)
- [실행 방법](#실행-방법)

---

## 프로젝트 개요

Meat-A-Eye 프론트엔드는 사용자가 **고기 사진을 촬영하거나 업로드**하면 AI가 부위를 판별하고, 영양 정보·시세·이력 추적 데이터를 한눈에 보여주는 **원스톱 축산물 관리 대시보드**입니다.

### 디자인 시스템

| 요소 | 값 |
|------|-----|
| **Primary Color** | Burgundy (#800000) |
| **Background** | Ivory (#FAF9F6) |
| **UI Framework** | shadcn/ui (New York 스타일) |
| **Dark Mode** | CSS 커스텀 프로퍼티 기반 |
| **Animation** | Framer Motion |
| **Font** | Geist + Geist Mono |

---

## 핵심 기능

### 1. AI 고기 부위 분석

```
사용자 이미지 입력 (파일 업로드 / 카메라 촬영)
    ↓
이미지 전처리 (Canvas 리사이즈, 압축, min 260px)
    ↓
AI 서버 분석 (소고기 9부위 / 돼지고기 7부위 / OCR)
    ↓
결과 표시: 부위명 + 신뢰도 + Grad-CAM 히트맵
    ↓
통합 정보: 영양 데이터 + 시세 + 보관법 + 이력추적
    ↓
냉장고 자동 등록 + 유통기한 알림 설정
```

- **3가지 분석 모드:** 소 버전 (9부위), 돼지 버전 (7부위), 이력번호 OCR
- **카메라 지원:** Desktop getUserMedia + Mobile native camera (Android 특화 처리)
- **Drag & Drop:** 파일 드래그 업로드 지원
- **이력추적:** 국내산(MTRACE) / 수입산(meatwatch) 자동 라우팅, 묶음번호 목록 조회

### 2. 냉장고 관리

- CRUD: 아이템 추가·편집·삭제·소비 처리
- **D-day 계산:** 유통기한/소비 희망일 기준 남은 일수 표시
- 부위별 영양 정보 자동 로드 (등급별 구분)
- 이력 정보 기반 자동 등록
- LLM 레시피 연동: 냉장고 재료 기반 추천

### 3. 시세 대시보드

- **실시간 가격:** KAMIS API 기반 소/돼지/수입 축산물 시세
- **29개 지역:** 서울, 부산, 대구 등 전국 지역별 조회
- **등급별 가격:** 1++, 1+, 1, 2, 3등급 비교
- **주간 추이 차트:** Recharts LineChart로 가격 변동 시각화
- **인기 부위:** 최근 7일 AI 인식 기준 TOP N + 전주 대비 트렌드

### 4. LLM 레시피 추천

- **4가지 생성 모드:**
  - `ai_random` — 전체 부위 랜덤 레시피
  - `fridge_random` — 냉장고 랜덤 재료 레시피
  - `fridge_multi` — 냉장고 복수 재료 레시피
  - `part_specific` — 특정 부위 지정 레시피
- **Markdown 렌더링:** ReactMarkdown으로 레시피 표시
- **저장·북마크:** 생성된 레시피 저장 및 즐겨찾기
- **재추천:** "다른 레시피 추천받기" 버튼

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Framework** | Next.js 16.0.10 (App Router) |
| **UI Library** | React 19.2.0 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4.1.9 |
| **Component** | shadcn/ui (Radix UI 기반) |
| **Animation** | Framer Motion 11.15.0 |
| **Charts** | Recharts 2.15.4 |
| **Forms** | react-hook-form + Zod validation |
| **Markdown** | react-markdown 10.1.0 |
| **Date** | date-fns |
| **Analytics** | @vercel/analytics |

---

## 페이지 구조

### 라우팅

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/` | `page.tsx` | 자동 리다이렉트 → `/dashboard` |
| `/dashboard` | SPA Hub | 메인 대시보드 (쿼리 파라미터 기반 뷰 전환) |
| `/dashboard?menu=analysis` | AnalysisView | AI 분석 화면 |
| `/dashboard?menu=fridge` | FridgeView | 냉장고 관리 |
| `/dashboard?menu=recipe` | RecipeView | 레시피 탐색 |
| `/login` | LoginPage | 로그인 |
| `/signup` | SignupPage | 회원가입 |
| `/forgot-password` | ForgotPasswordPage | 비밀번호 찾기 |
| `/change-password` | ChangePasswordPage | 비밀번호 변경 |

### 대시보드 SPA 구조

```
/dashboard
├── AppSidebar (Desktop 좌측)
│   ├── 네비게이션 메뉴 (4항목)
│   ├── 최근 분석 결과 (최근 3건)
│   └── 오늘의 고기 상식 위젯
│
├── AppHeader (상단)
│   ├── 페이지 타이틀
│   └── 사용자 드롭다운 (프로필/로그아웃)
│
├── MobileNav (모바일 하단 탭)
│   └── 홈 | 분석 | 냉장고 | 레시피
│
└── Main Content (뷰 전환, AnimatePresence)
    ├── DashboardView  ─ 시세 + 냉장고 요약
    ├── AnalysisView   ─ AI 분석 + 이력추적
    ├── FridgeView     ─ 냉장고 CRUD
    └── RecipeView     ─ 레시피 탐색/생성
```

---

## 주요 컴포넌트

### 뷰 컴포넌트

| 컴포넌트 | 규모 | 핵심 기능 |
|----------|------|-----------|
| `DashboardView` | ~1700줄 | KAMIS 실시간 시세, 주간 추이 차트 (Recharts), 냉장고 분포 Pie chart, D-day 카드 |
| `AnalysisView` | ~2260줄 | 3모드 분석, 카메라/파일 입력, Grad-CAM 히트맵, 이력추적, 영양·시세 통합 표시 |
| `FridgeView` | ~1470줄 | CRUD, D-day 뱃지, 등급별 영양, 부위 편집, 레시피 연동 |
| `RecipeView` | ~560줄 | 레시피 그리드, 필터링(카테고리/검색/북마크), LLM 생성 |

### 공통 컴포넌트

| 컴포넌트 | 기능 |
|----------|------|
| `GuestModeModal` | 첫 방문 시 3가지 진입 경로 (게스트/로그인/가입) |
| `LLMRecipeModal` | AI 레시피 전체 화면 모달 (Markdown 렌더링, 저장/삭제) |
| `AppSidebar` | 데스크톱 사이드바 (최근 분석, 고기 상식 위젯) |
| `MobileNav` | 모바일 하단 탭바 (Framer Motion 애니메이션) |
| `AppHeader` | 상단 헤더 (모바일 햄버거 메뉴, 사용자 드롭다운) |

### UI 컴포넌트 (shadcn/ui)

Button, Card, Dialog, Dropdown, Input, Label, Select, Sheet, Tabs, Toast, Tooltip, AlertDialog, Avatar, Carousel, Separator, Skeleton 등 Radix UI 기반 전체 프리미티브 사용

---

## API 통신 계층

### `apiCall<T>()` — 중앙 집중 API 클라이언트

```typescript
async function apiCall<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown | FormData;
    token?: string;
  }
): Promise<T>
```

- **JWT 자동 삽입:** localStorage에서 토큰 자동 로드
- **401 자동 처리:** 토큰 만료 시 자동 클리어 + 적절한 fallback
- **모바일 감지:** localhost 접속이 아닌 경우 동적 백엔드 URL 전환
- **Mock 데이터:** `NEXT_PUBLIC_USE_MOCK_DATA=true`로 개발용 목 데이터 활성화

### API 함수 분류

| 카테고리 | 함수 | 수 |
|----------|------|---|
| **인증** | signup, login, logout, createGuestSession, passwordReset, changePassword | 6 |
| **AI 분석** | analyzeImage | 1 |
| **냉장고** | getFridgeItems, addFridgeItem, addFridgeItemFromTraceability, updateFridgeItemStatus, deleteFridgeItem, updateFridgeItem | 6 |
| **축산물 정보** | getMeatInfoList, getNutritionInfo, getMeatInfoByPartName | 3 |
| **이력추적** | getTraceabilityByNumber, getTraceabilityBundleList | 2 |
| **레시피** | generateRecipeWithLLM, generateRecipeForPart, generateRandomRecipe×2, saveRecipe, getSavedRecipes, deleteRecipe, bookmark×3 | 9 |
| **대시보드** | getPopularCuts, getDashboardPrices, getDashboardPriceHistory | 3 |
| **게스트** | createGuestSession, getGuestNickname, setGuestNickname | 3 |

---

## 이미지 처리

### 전처리 파이프라인 (`imagePreprocessing.ts`)

```
File Input (사진/카메라)
    ↓
validateImageFile()
  • MIME 타입 체크 (jpeg, png, webp)
  • 크기 제한 (≤ 10MB)
    ↓
preprocessImage()
  • Canvas 리사이즈 (max 3840px, min 260px)
  • JPEG 압축 (quality 0.95 시작)
  • 초과 시 반복 압축 (quality 감소)
  • 최대 10MB 이내 보장
    ↓
createImagePreview()
  • FileReader → Base64 Data URL
  • UI 미리보기 표시
    ↓
analyzeImage(file, mode)
  • FormData로 백엔드 전송
```

### 카메라 캡처 (`captureFromVideo`)

```
getUserMedia (constraints: video)
    ↓
<video> 실시간 미리보기
    ↓
Canvas.drawImage(video)
    ↓
canvas.toBlob() → File 객체
    ↓
동일 전처리 파이프라인
```

---

## 인증 및 게스트 시스템

### AuthContext (React Context)

```typescript
interface AuthContextType {
  isAuthenticated: boolean    // 로그인 여부
  nickname: string | null     // 사용자 닉네임
  mustResetPassword: boolean  // 임시 비밀번호 변경 필요 여부
  isLoading: boolean          // 초기 로딩 상태
  login(token, nickname, mustReset?): void
  clearMustResetPassword(): void
  logout(): void
}
```

### 게스트 → 회원 전환 흐름

```
첫 방문 → GuestModeModal
    ├── "게스트 입장" → UUID 생성 → 백엔드 게스트 계정 생성
    │                  → 분석·냉장고(제한적) 사용 가능
    │
    ├── "로그인" → /login
    │
    └── "회원가입" → /signup
                     → 기존 게스트 데이터 자동 마이그레이션
```

### localStorage 저장 항목

| Key | 값 | 용도 |
|-----|-----|------|
| `token` | JWT 문자열 | API 인증 |
| `nickname` | 사용자 닉네임 | UI 표시 |
| `must_reset_password` | boolean | 임시 비밀번호 변경 강제 |
| `guest_id` | UUID | 게스트 식별 |
| `guestNickname` | 닉네임 | 게스트 닉네임 |

---

## 프로젝트 구조

```
Meat_A_Eye-frontend/
├── README.md                          # 본 문서
├── package.json                       # 의존성 및 스크립트
├── next.config.mjs                    # Next.js 설정
├── tailwind.config.ts                 # Tailwind 커스텀 테마 (ivory/burgundy)
├── tsconfig.json                      # TypeScript 설정
├── components.json                    # shadcn/ui 설정
├── postcss.config.mjs                 # PostCSS 설정
│
├── app/                               # Next.js App Router
│   ├── layout.tsx                     # 루트 레이아웃 (AuthProvider, Toaster)
│   ├── page.tsx                       # 홈 (→ /dashboard 리다이렉트)
│   ├── globals.css                    # CSS 변수 + Tailwind 테마
│   ├── dashboard/
│   │   └── page.tsx                   # 메인 SPA 대시보드
│   ├── login/
│   │   └── page.tsx                   # 로그인 (Zod + react-hook-form)
│   ├── signup/
│   │   └── page.tsx                   # 회원가입
│   ├── change-password/
│   │   └── page.tsx                   # 비밀번호 변경
│   └── forgot-password/
│       └── page.tsx                   # 비밀번호 찾기
│
├── components/
│   ├── app-header.tsx                 # 상단 헤더
│   ├── app-sidebar.tsx                # 데스크톱 사이드바
│   ├── mobile-nav.tsx                 # 모바일 하단 탭바
│   ├── guest-mode-modal.tsx           # 게스트 진입 모달
│   ├── llm-recipe-modal.tsx           # AI 레시피 전체 화면 모달
│   │
│   ├── views/                         # 대시보드 뷰 컴포넌트
│   │   ├── dashboard-view.tsx         # 메인 대시보드 (시세 + 냉장고)
│   │   ├── analysis-view.tsx          # AI 분석 화면
│   │   ├── fridge-view.tsx            # 냉장고 관리
│   │   └── recipe-view.tsx            # 레시피 탐색
│   │
│   ├── shared/
│   │   └── BackButton.tsx             # 뒤로가기 버튼
│   │
│   ├── icons/
│   │   └── pork-icon.tsx              # 커스텀 돼지고기 SVG 아이콘
│   │
│   └── ui/                            # shadcn/ui 컴포넌트
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ...                        # (20+ Radix UI 기반 프리미티브)
│
├── contexts/
│   └── auth-context.tsx               # 인증 React Context
│
├── hooks/
│   ├── use-mobile.ts                  # 모바일 감지 훅
│   └── use-toast.ts                   # 토스트 알림 훅
│
├── lib/
│   ├── api.ts                         # 중앙 집중 API 클라이언트 (~880줄)
│   ├── api-meat.ts                    # 축산물 정보 API
│   ├── imagePreprocessing.ts          # 이미지 전처리 (리사이즈/압축/검증)
│   └── utils.ts                       # cn() 유틸리티
│
├── src/
│   ├── types/
│   │   └── api.ts                     # TypeScript 인터페이스 (25+)
│   └── lib/
│       └── icon-matcher.ts            # 음식 아이콘 매칭
│
├── constants/
│   └── mockData.ts                    # 목 데이터 타입 + 유틸리티
│
└── public/
    └── icons/                         # 음식 아이콘 에셋
```

---

## 실행 방법

### 환경 설정

```bash
# 의존성 설치
npm install

# 환경 변수 (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_AI_SERVER_URL=http://localhost:8001
NEXT_PUBLIC_USE_MOCK_DATA=false
```

### 개발 서버

```bash
npm run dev
# → http://localhost:3000 에서 시작
```

### 프로덕션 빌드

```bash
npm run build
npm start
```

---

## 부위명 매핑 (19종)

프론트엔드에서 AI 모델 출력을 한국어로 변환하는 매핑:

| 영문 (AI/백엔드) | 한국어 (UI 표시) | 카테고리 |
|-----------------|-----------------|----------|
| `beef_ribeye` | 등심 | 소고기 |
| `beef_sirloin` | 채끝 | 소고기 |
| `beef_tenderloin` | 안심 | 소고기 |
| `beef_chuck` | 목심 | 소고기 |
| `beef_brisket` | 양지 | 소고기 |
| `beef_round` | 우둔 | 소고기 |
| `beef_rib` | 갈비 | 소고기 |
| `beef_shank` | 사태 | 소고기 |
| `beef_shoulder` | 앞다리 | 소고기 |
| `pork_belly` | 삼겹살 | 돼지고기 |
| `pork_loin` | 등심 | 돼지고기 |
| `pork_tenderloin` | 안심 | 돼지고기 |
| `pork_ribs` | 갈비 | 돼지고기 |
| `pork_neck` | 목살 | 돼지고기 |
| `pork_picnic_shoulder` | 앞다리 | 돼지고기 |
| `pork_ham` | 뒷다리 | 돼지고기 |
| `imported_beef_*` | 수입 소고기 부위 | 수입 |
| `imported_pork_*` | 수입 돼지고기 부위 | 수입 |
