# 🥩 Meat-A-Eye

**"사진 한 장으로 끝내는 AI 기반 축산물 부위 인식 및 원스톱 정보 제공 플랫폼"**

단순한 기술 연구(Research)를 넘어, **AWS 인프라와 Docker 기반의 마이크로서비스**로 구축되어 실제 사용자가 즉시 이용 가능한 **완결성 있는 웹 서비스**입니다.

---

## 서비스 핵심 기능
- **AI 부위 인식**: EfficientNet-B2 기반 모델을 통해 소/돼지 부위를 실시간 분석 (정확도 최대 94.2%).
- **스마트 이력 조회**: 하이브리드 OCR(EasyOCR + PaddleOCR)로 이력번호를 인식하여 사육·도축 정보 제공.
- **원스톱 데이터 통합**: 5종의 공공 API 연동을 통해 실시간 시세, 영양 정보, 유통 이력을 한곳에서 확인.
- **AI 맞춤형 레시피**: Gemini 2.5 Flash API를 활용하여 인식된 부위에 최적화된 요리법 추천.
- **스마트 냉장고**: D-day 기반 유통기한 관리 및 비회원-회원 간 데이터 마이그레이션(UUID) 지원.

---

## 🛠 Tech Stack

### **Frontend / Backend**
| Category | Tech Stack |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), Tailwind CSS, Radix UI, shadcn/ui |
| **Backend** | FastAPI (Python), MySQL, aio-mysql, JWT |
| **AI Server** | FastAPI, PyTorch, EasyOCR, PaddleOCR, Gemini 2.5 Flash API |

### **Infrastructure & DevOps**
- **Cloud**: AWS EC2 (Ubuntu 24.04 LTS), AWS EBS (Volume Expansion)
- **Container**: Docker, Docker Compose (Multi-container Orchestration)
- **Web Server**: Nginx (Static Hosting & SPA Routing)
- **VCS/CI**: GitHub

---

## 폴더 개요
> 자세한 내용은 각 폴더의 readme에 구성되어 있습니다.

1. Meat-A-Eye AI 서버는 촬영된 고기 이미지를 입력받아 소고기 9개 부위 또는 돼지고기 7개 부위를 실시간으로 분류하고, Grad-CAM 히트맵을 통해 모델이 어떤 시각적 특징(질감, 결, 마블링 등)에 주목했는지 시각화합니다. 현실 환경(그림자, 조명 변화, 배경)에서의 강건한 인식을 목표로, 유튜브·현장 이미지를 활용한 데이터 수집과 4차에 걸친 점진적 파인튜닝으로 최종 소고기 90.0%, 돼지고기 94.2% 정확도를 달성했습니다.

2. Meat-A-Eye 백엔드는 프론트엔드와 AI 서버 사이의 중앙 허브 역할을 합니다. AI 모델의 고기 부위 분류 결과를 수신하여 영양 정보, 시세 정보, 이력 추적 데이터를 통합 제공하고, 사용자의 냉장고 관리와 LLM 기반 레시피 추천까지 포괄하는 풀스택 API 서버입니다.

3. Meat-A-Eye 프론트엔드는 사용자가 고기 사진을 촬영하거나 업로드하면 AI가 부위를 판별하고, 영양 정보·시세·이력 추적 데이터를 한눈에 보여주는 원스톱 축산물 관리 대시보드입니다.
---

## System Architecture
- **서버 분리 설계**: 메인 백엔드와 AI 추론 서버(Port 8001)를 분리하여 시스템 안정성 및 확장성 확보.
- **비동기 처리**: FastAPI와 비동기 DB 라이브러리를 통해 다중 사용자 요청 및 외부 API 호출 병목 최소화.

---

## 📁 Project Structure
```text
meathub/
├── Meat_A_Eye-frontend/     # Next.js 프론트엔드 (Nginx 서빙)
├── Meat_A_Eye-backend/      # FastAPI 메인 백엔드 (Business Logic)
├── Meat_A_Eye-aimodels/     # FastAPI AI 모델 서버 (Inference)
│   └── ai-server/models/    # AI 가중치 (.pth) 및 모델 체크포인트
├── docker-compose.yml       # 전체 서비스 오케스트레이션
└── .env                     # 환경 변수 관리 (API Keys, DB Config)
```

## AI Performance
- Meat Classification: 소고기 90.0%, 돼지고기 94.2% (EfficientNet-B2 Fine-tuning)
- OCR Recognition: 이력번호 인식 정확도 88.9% (EasyOCR + PaddleOCR Hybrid)

## Project Links
- Blog: [프로젝트 회고](https://pak1010pak.tistory.com/142), [기술 블로그-OCR](https://pak1010pak.tistory.com/123), [기술 블로그-비전AI](https://pak1010pak.tistory.com/122)
- GitHub: [Project Repository](https://github.com/Meat-A-Eye-Ops/Meat-A-Eye-Service)
