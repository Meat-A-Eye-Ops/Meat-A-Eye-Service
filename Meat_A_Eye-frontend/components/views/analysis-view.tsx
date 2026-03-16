"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  X,
  Loader2,
  Eye,
  FileText,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  ChefHat,
  CheckCircle2,
  Info,
  Keyboard,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  analyzeImage,
  type AIAnalysisMode,
  getTraceabilityByNumber,
  getTraceabilityBundleList,
  isBundleNumber,
  addFridgeItemFromTraceability,
  getAuthToken,
  getIsGuest,
} from "@/lib/api";
import { getMeatInfoByPartName } from "@/lib/api-meat";
import {
  preprocessImage,
  captureFromVideo,
  validateImageFile,
  createImagePreview,
} from "@/lib/imagePreprocessing";
import { toast } from "@/components/ui/use-toast";
import { BackButton } from "@/components/shared/BackButton";
import { LLMRecipeModal } from "@/components/llm-recipe-modal";
import type { MeatAnalysisResult } from "@/constants/mockData";
import type {
  AIAnalyzeResponse,
  MeatInfoByPartNameResponse,
  TraceabilityInfo,
} from "@/src/types/api";

// 17부위 영문 클래스명 → UI 한글 표시 (백엔드 displayName 로드 전 폴백)
const PART_DISPLAY_NAMES: Record<string, string> = {
  Beef_Tenderloin: "소/안심",
  Beef_Ribeye: "소/등심",
  Beef_Sirloin: "소/채끝",
  Beef_Chuck: "소/목심",
  Beef_Round: "소/우둔",
  Beef_Brisket: "소/양지",
  Beef_Shank: "소/사태",
  Beef_Rib: "소/갈비",
  Beef_Shoulder: "소/앞다리",
  Pork_Tenderloin: "돼지/안심",
  Pork_Loin: "돼지/등심",
  Pork_Neck: "돼지/목심",
  Pork_PicnicShoulder: "돼지/앞다리",
  Pork_Ham: "돼지/뒷다리",
  Pork_Belly: "돼지/삼겹살",
  Pork_Ribs: "돼지/갈비",
};

function getPartDisplayName(
  partName: string | undefined | null,
  fromMeatInfo?: string | null,
): string {
  if (fromMeatInfo) return fromMeatInfo;
  if (partName && PART_DISPLAY_NAMES[partName])
    return PART_DISPLAY_NAMES[partName];
  return partName || "알 수 없음";
}

interface AnalysisViewProps {
  onSaveToFridge: () => void;
  onBack?: () => void;
}

/** 실제 사이트와 동일 4개 섹션: 기본정보, 원산지정보, 수입이력정보, 냉동전환정보 */
function TraceabilityDetailSections({
  info,
  onSaveToFridge,
  saving,
}: {
  info: TraceabilityInfo | null;
  onSaveToFridge?: (() => void) | null;
  saving?: boolean;
}) {
  if (!info) return null;
  const formatRange = (
    from: string | null | undefined,
    to: string | null | undefined,
  ) => {
    if (from && to) return `${from} ~ ${to}`;
    return from || to || "";
  };
  const hasBasic = info.historyNo || info.blNo || info.partName;
  const hasOrigin = info.origin;
  const hasHistory =
    info.exporter ||
    info.slaughterDateFrom ||
    info.slaughterDateTo ||
    info.processingDateFrom ||
    info.processingDateTo ||
    info.importer ||
    info.importDate ||
    info.partCode ||
    info.companyName;
  const hasRefrig =
    info.refrigCnvrsAt ||
    info.refrigDistbPdBeginDe ||
    info.refrigDistbPdEndDe ||
    info.recommendedExpiry ||
    info.limitFromDt ||
    info.limitToDt;

  return (
    <div className="space-y-4">
      {/* 1. 기본정보 */}
      {hasBasic && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            기본정보
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            품목명은 수입신고시점의 품목정보입니다.
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {info.historyNo && (
              <>
                <span className="text-muted-foreground">이력번호</span>
                <span className="font-mono text-xs">{info.historyNo}</span>
              </>
            )}
            {info.blNo && (
              <>
                <span className="text-muted-foreground">선하증권번호</span>
                <span className="font-mono text-xs">{info.blNo}</span>
              </>
            )}
            {info.partName && (
              <>
                <span className="text-muted-foreground">수입축산물 품목</span>
                <span className="col-span-2">{info.partName}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2. 원산지정보 */}
      {hasOrigin && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            원산지정보
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="text-muted-foreground">원산지(국가)</span>
            <span>{info.origin}</span>
          </div>
        </div>
      )}

      {/* 3. 수입이력정보 */}
      {hasHistory && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            수입이력정보
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {info.exporter && (
              <>
                <span className="text-muted-foreground">수출국 도축장</span>
                <span>{info.exporter}</span>
              </>
            )}
            {(info.slaughterDateFrom || info.slaughterDateTo) && (
              <>
                <span className="text-muted-foreground">수출국 도축일자</span>
                <span>
                  {formatRange(info.slaughterDateFrom, info.slaughterDateTo) ||
                    info.slaughterDate}
                </span>
              </>
            )}
            {info.companyName && (
              <>
                <span className="text-muted-foreground">수출국 가공장</span>
                <span>{info.companyName}</span>
              </>
            )}
            {(info.processingDateFrom || info.processingDateTo) && (
              <>
                <span className="text-muted-foreground">수출국 가공일자</span>
                <span>
                  {formatRange(info.processingDateFrom, info.processingDateTo)}
                </span>
              </>
            )}
            {info.exporter && (
              <>
                <span className="text-muted-foreground">수출업체</span>
                <span>{info.exporter}</span>
              </>
            )}
            {info.importer && (
              <>
                <span className="text-muted-foreground">수입업체</span>
                <span>{info.importer}</span>
              </>
            )}
            {info.importDate && (
              <>
                <span className="text-muted-foreground">수입연월일</span>
                <span>{info.importDate}</span>
              </>
            )}
            {info.partCode && (
              <>
                <span className="text-muted-foreground">부위(코드)</span>
                <span className="col-span-2">{info.partCode}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. 유통기한·냉동전환정보 */}
      {hasRefrig && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            유통기한·냉동전환정보
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            냉동전환 정보는 식약처 식품안전정보포털 연계 자료입니다.
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {(info.recommendedExpiry || info.limitFromDt || info.limitToDt) && (
              <>
                <span className="text-muted-foreground">유통기한(권장)</span>
                <span>
                  {info.recommendedExpiry ||
                    formatRange(info.limitFromDt, info.limitToDt)}
                </span>
              </>
            )}
            {info.refrigCnvrsAt && (
              <>
                <span className="text-muted-foreground">냉동전환 여부</span>
                <span>{info.refrigCnvrsAt === "Y" ? "예" : "아니오"}</span>
              </>
            )}
            {(info.refrigDistbPdBeginDe || info.refrigDistbPdEndDe) && (
              <>
                <span className="text-muted-foreground">냉장소비기한</span>
                <span>
                  {formatRange(
                    info.refrigDistbPdBeginDe,
                    info.refrigDistbPdEndDe,
                  )}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {onSaveToFridge && !getIsGuest() && getAuthToken() && (
        <Button
          onClick={onSaveToFridge}
          disabled={saving}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              저장 중...
            </>
          ) : (
            "냉장고에 저장"
          )}
        </Button>
      )}
      {onSaveToFridge && (getIsGuest() || !getAuthToken()) && (
        <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
          <p className="text-sm text-muted-foreground">
            냉장고 저장 기능은 로그인 후 이용할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}

// AI 분석 모드: 소 버전 | 돼지 버전 | OCR 버전
const AI_MODE_OPTIONS: {
  value: AIAnalysisMode;
  label: string;
  icon: React.ReactNode;
  desc: string;
}[] = [
  {
    value: "beef",
    label: "소 버전",
    icon: <Sparkles className="w-4 h-4" />,
    desc: "소고기 9부위 부위 판별",
  },
  {
    value: "pork",
    label: "돼지 버전",
    icon: <Eye className="w-4 h-4" />,
    desc: "돼지고기 7부위 부위 판별",
  },
  {
    value: "ocr",
    label: "이력번호 조회",
    icon: <FileText className="w-4 h-4" />,
    desc: "축산물 이력번호·묶음번호 OCR 인식",
  },
];

export function AnalysisView({ onSaveToFridge, onBack }: AnalysisViewProps) {
  const [mode, setMode] = useState<AIAnalysisMode>("beef");
  const [inputMethod, setInputMethod] = useState<"file" | "camera" | null>(
    null,
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<MeatAnalysisResult | null>(null);
  const [analysisResponse, setAnalysisResponse] =
    useState<AIAnalyzeResponse | null>(null);
  const [meatInfo, setMeatInfo] = useState<MeatInfoByPartNameResponse | null>(
    null,
  );
  const [loadingMeatInfo, setLoadingMeatInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // 이력번호/묶음번호 직접 조회
  const [traceInput, setTraceInput] = useState("");
  const [manualTraceability, setManualTraceability] =
    useState<TraceabilityInfo | null>(null);
  const [manualTraceabilityList, setManualTraceabilityList] = useState<
    TraceabilityInfo[] | null
  >(null);
  const [selectedTraceDetail, setSelectedTraceDetail] =
    useState<TraceabilityInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [manualTraceLoading, setManualTraceLoading] = useState(false);
  const [manualTraceError, setManualTraceError] = useState<string | null>(null);
  const [savingFromTraceability, setSavingFromTraceability] = useState(false);
  const [showRecipeForPartModal, setShowRecipeForPartModal] = useState(false);
  const [recipeForPartContent, setRecipeForPartContent] = useState<string>("");
  const [loadingRecipeForPart, setLoadingRecipeForPart] = useState(false);
  const [showSaveSuccessMessage, setShowSaveSuccessMessage] = useState(false);
  const [showTraceabilitySection, setShowTraceabilitySection] = useState(false);
  const traceabilitySectionRef = useRef<HTMLDivElement>(null);

  // OCR 실패 시 이력번호 조회 섹션 노출
  const ocrFailed =
    mode === "ocr" && result !== null && !result.traceabilityNumber;
  useEffect(() => {
    if (ocrFailed) {
      setShowTraceabilitySection(true);
      setTimeout(
        () =>
          traceabilitySectionRef.current?.scrollIntoView({
            behavior: "smooth",
          }),
        300,
      );
    }
  }, [ocrFailed]);

  // OCR 성공 시 자동 조회 실행 (수입산 + 국내산 모두 처리)
  const [autoLookupDone, setAutoLookupDone] = useState(false);
  useEffect(() => {
    if (
      mode === "ocr" &&
      result?.traceabilityNumber &&
      !autoLookupDone &&
      !manualTraceLoading
    ) {
      const num = result.traceabilityNumber.trim();
      // 국내산 묶음번호(L+숫자) → M-Trace 외부 사이트로 바로 이동 (직접 입력과 동일)
      const isDomesticBundle = /^L\d+$/.test(num);
      if (isDomesticBundle) {
        setAutoLookupDone(true);
        const mtraceUrl = `https://www.mtrace.go.kr/search.do?mtraceNo=${encodeURIComponent(num)}`;
        window.open(mtraceUrl, "_blank");
        toast({
          title: "국내육 이력 조회",
          description:
            "국산육 이력 정보는 M-Trace 공식 웹사이트에서 확인할 수 있습니다.",
        });
        return;
      }
      // 수입 묶음번호(A+숫자) 또는 12자리 숫자 이력번호 → 자동 조회
      const isImport = isBundleNumber(num);
      const is12Digit = /^\d{12}$/.test(num);
      if (isImport || is12Digit) {
        setAutoLookupDone(true);
        handleTraceabilityLookup(num);
      }
    }
  }, [result?.traceabilityNumber, mode, autoLookupDone]);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);

  // 모바일 기기 감지
  const isMobileDevice = () => {
    if (typeof window === "undefined") return false;
    const userAgent = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent,
    );
  };

  // Android 기기 감지
  const isAndroidDevice = () => {
    if (typeof window === "undefined") return false;
    return /android/i.test(navigator.userAgent.toLowerCase());
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // 카메라 스트림이 준비되고 video 요소가 렌더링된 후 연결
  useEffect(() => {
    if (inputMethod === "camera" && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      if (!video.srcObject) {
        video.srcObject = streamRef.current;
        video
          .play()
          .catch((err: any) => console.warn("Video autoplay failed:", err));
      }
    }
  }, [inputMethod]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    // 모바일 기기에서는 네이티브 카메라 앱 사용 (더 안정적)
    if (isMobileDevice()) {
      // 모바일에서는 네이티브 카메라 입력 사용
      if (mobileCameraInputRef.current) {
        mobileCameraInputRef.current.click();
      }
      return;
    }

    // 데스크톱에서는 getUserMedia 사용
    // mediaDevices 지원 여부 확인 (Safari 포함)
    const hasMediaDevices =
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    const hasLegacyGetUserMedia =
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia;

    if (!hasMediaDevices && !hasLegacyGetUserMedia) {
      const userAgent = navigator.userAgent.toLowerCase();
      let browserName = "브라우저";
      if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
        browserName = "Safari";
      } else if (userAgent.includes("chrome")) {
        browserName = "Chrome";
      } else if (userAgent.includes("firefox")) {
        browserName = "Firefox";
      } else if (userAgent.includes("edge")) {
        browserName = "Edge";
      }

      setError(
        `이 ${browserName} 버전은 카메라를 지원하지 않습니다. 최신 버전으로 업데이트하거나 Chrome, Edge, Firefox를 사용해주세요.`,
      );
      return;
    }

    try {
      // 데스크톱에서는 기본 카메라 사용 (facingMode 제거)
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      let stream: MediaStream;
      try {
        // 최신 API 우선 시도
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } else {
          // 레거시 API (Safari 등)
          const legacyGetUserMedia =
            (navigator as any).getUserMedia ||
            (navigator as any).webkitGetUserMedia ||
            (navigator as any).mozGetUserMedia;
          if (legacyGetUserMedia) {
            stream = await new Promise<MediaStream>((resolve, reject) => {
              legacyGetUserMedia.call(navigator, constraints, resolve, reject);
            });
          } else {
            throw new Error("getUserMedia not supported");
          }
        }
      } catch (constraintError: any) {
        // 제약 조건 실패 시 기본 카메라로 재시도
        console.warn(
          "고해상도 카메라 접근 실패, 기본 설정으로 재시도:",
          constraintError,
        );
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } else {
            const legacyGetUserMedia =
              (navigator as any).getUserMedia ||
              (navigator as any).webkitGetUserMedia ||
              (navigator as any).mozGetUserMedia;
            if (legacyGetUserMedia) {
              stream = await new Promise<MediaStream>((resolve, reject) => {
                legacyGetUserMedia.call(
                  navigator,
                  { video: true },
                  resolve,
                  reject,
                );
              });
            } else {
              throw new Error("getUserMedia not supported");
            }
          }
        } catch (fallbackError: any) {
          throw constraintError; // 원래 에러를 다시 던짐
        }
      }

      // 스트림을 먼저 저장하고, inputMethod를 camera로 전환하여
      // video 요소가 렌더링된 후 useEffect에서 스트림을 연결
      streamRef.current = stream;
      setInputMethod("camera");
      setError(null);
    } catch (err: any) {
      console.error("Camera access error:", err);

      // 에러 타입별 구체적인 메시지
      let errorMessage = "카메라를 시작할 수 없습니다.";

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        errorMessage =
          "카메라 접근 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.";
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        errorMessage =
          "사용 가능한 카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.";
      } else if (
        err.name === "NotReadableError" ||
        err.name === "TrackStartError"
      ) {
        errorMessage =
          "카메라가 다른 애플리케이션에서 사용 중입니다. 다른 앱을 종료하고 다시 시도해주세요.";
      } else if (
        err.name === "OverconstrainedError" ||
        err.name === "ConstraintNotSatisfiedError"
      ) {
        errorMessage =
          "요청한 카메라 설정을 지원하지 않습니다. 기본 설정으로 다시 시도해주세요.";
      } else if (err.message === "Video load timeout") {
        errorMessage =
          "카메라 스트림을 로드하는데 시간이 오래 걸립니다. 다시 시도해주세요.";
      } else {
        errorMessage = `카메라 오류: ${
          err.message || err.name || "알 수 없는 오류"
        }`;
      }

      setError(errorMessage);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      // 비디오가 아직 프레임을 받지 못한 경우 방지
      if (
        videoRef.current.videoWidth === 0 ||
        videoRef.current.videoHeight === 0
      ) {
        setError(
          "카메라가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
        );
        return;
      }
      try {
        const dataUrl = captureFromVideo(videoRef.current);
        setSelectedImage(dataUrl);
        stopCamera();
        setInputMethod("file");
      } catch (err) {
        console.error("Capture error:", err);
        setError("사진 촬영에 실패했습니다.");
      }
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || "올바른 이미지 파일이 아닙니다.");
      return;
    }

    try {
      const preview = await createImagePreview(file);
      setSelectedImage(preview);
      setInputMethod("file");
      setError(null);
    } catch (err) {
      console.error("File preview error:", err);
      setError("이미지를 불러오는데 실패했습니다.");
    }

    // 입력 필드 리셋 (같은 파일을 다시 선택할 수 있도록)
    if (event.target) {
      event.target.value = "";
    }
  };

  // 모바일 네이티브 카메라 핸들러
  const handleMobileCameraSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || "올바른 이미지 파일이 아닙니다.");
      return;
    }

    try {
      const preview = await createImagePreview(file);
      setSelectedImage(preview);
      setInputMethod("file");
      setError(null);
    } catch (err) {
      console.error("Mobile camera error:", err);
      setError("사진을 불러오는데 실패했습니다.");
    }

    // 입력 필드 리셋
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || "올바른 이미지 파일이 아닙니다.");
      return;
    }

    try {
      const preview = await createImagePreview(file);
      setSelectedImage(preview);
      setInputMethod("file");
      setError(null);
    } catch (err) {
      console.error("Drop error:", err);
      setError("이미지를 불러오는데 실패했습니다.");
    }
  };

  const analyzeCurrentImage = async () => {
    if (!selectedImage) return;

    setAnalyzing(true);
    setError(null);
    // 새 분석 시작 시 이전 이력 조회 결과 초기화 (국내육 OCR 시 이전 결과가 남는 버그 방지)
    setManualTraceability(null);
    setManualTraceabilityList(null);
    setSelectedTraceDetail(null);
    setManualTraceError(null);
    setAutoLookupDone(false);

    try {
      // Convert dataUrl to File
      const blob = await fetch(selectedImage).then((r) => r.blob());
      const file = new File([blob], "image.jpg", { type: "image/jpeg" });

      // Preprocess image before sending
      const preprocessed = await preprocessImage(file);

      console.log(
        `Image preprocessed: ${preprocessed.originalSize} → ${preprocessed.compressedSize} bytes`,
      );

      // Convert preprocessed dataUrl back to File for multipart upload
      const preprocessedBlob = await fetch(preprocessed.dataUrl).then((r) =>
        r.blob(),
      );
      const preprocessedFile = new File([preprocessedBlob], "image.jpg", {
        type: "image/jpeg",
      });

      // Send to backend API with multipart form data (FormData로 전송)
      console.log(
        `[API REQUEST] POST /api/analyze - mode: ${mode}, file size: ${preprocessedFile.size} bytes, resolution: ${preprocessed.width}x${preprocessed.height}`,
      );
      const analysisResult = await analyzeImage(preprocessedFile, mode, false); // Don't auto-add to fridge (소/돼지/OCR 3모드)
      console.log(`[API RESPONSE SUCCESS] 분석 결과:`, analysisResult);
      setAnalysisResponse(analysisResult);

      // Convert to MeatAnalysisResult format for display
      const displayResult: MeatAnalysisResult = {
        id: Date.now().toString(),
        partName: analysisResult.partName || "알 수 없음",
        confidence: analysisResult.confidence || 0,
        gradCAM: analysisResult.heatmap_image || null,
        timestamp: new Date(),
        origin: analysisResult.raw?.origin,
        grade: analysisResult.raw?.grade,
        traceabilityNumber: analysisResult.historyNo || undefined,
      };

      setResult(displayResult);

      // 분석 응답에 영양정보와 가격정보가 포함되어 있으면 사용
      const hasPrice =
        analysisResult.price && analysisResult.price.currentPrice > 0;
      const hasNutrition = !!analysisResult.nutrition;

      if (hasPrice && hasNutrition) {
        // 영양정보 + 가격정보 모두 있음
        setMeatInfo({
          partName: analysisResult.partName || "",
          calories: analysisResult.nutrition?.calories || null,
          protein: analysisResult.nutrition?.protein || null,
          fat: analysisResult.nutrition?.fat || null,
          carbohydrate: analysisResult.nutrition?.carbohydrate || null,
          currentPrice: analysisResult.price!.currentPrice,
          priceUnit: analysisResult.price!.priceUnit || "100g",
          priceTrend: analysisResult.price!.priceTrend || "flat",
          priceDate: analysisResult.price!.priceDate || null,
          priceSource: analysisResult.price!.priceSource || "api",
          gradePrices: analysisResult.price!.gradePrices || [],
          nutritionSource: analysisResult.nutrition?.source || "fallback",
          storageGuide: null,
        });
      } else if (hasNutrition && !hasPrice && analysisResult.partName) {
        // 영양정보는 있지만 가격정보가 없음 → 먼저 영양정보 설정 후, 별도로 가격 조회
        setMeatInfo({
          partName: analysisResult.partName || "",
          calories: analysisResult.nutrition?.calories || null,
          protein: analysisResult.nutrition?.protein || null,
          fat: analysisResult.nutrition?.fat || null,
          carbohydrate: analysisResult.nutrition?.carbohydrate || null,
          currentPrice: 0,
          priceUnit: "100g",
          priceTrend: "flat",
          priceDate: null,
          priceSource: "unavailable",
          gradePrices: [],
          nutritionSource: analysisResult.nutrition?.source || "fallback",
          storageGuide: null,
        });
        // 별도 가격 조회 시도 (meat info API 경유)
        try {
          const priceInfo = await getMeatInfoByPartName(
            analysisResult.partName,
          );
          if (priceInfo.currentPrice > 0) {
            setMeatInfo((prev) =>
              prev
                ? {
                    ...prev,
                    currentPrice: priceInfo.currentPrice,
                    priceUnit: priceInfo.priceUnit || "100g",
                    priceTrend: priceInfo.priceTrend || "flat",
                    priceDate: priceInfo.priceDate || null,
                    priceSource: priceInfo.priceSource || "api",
                    gradePrices: priceInfo.gradePrices || [],
                  }
                : prev,
            );
          }
        } catch (priceErr) {
          console.warn("[Price fallback] 별도 가격 조회 실패:", priceErr);
        }
      } else if (analysisResult.partName) {
        // 영양정보도 가격정보도 없음 → 전체 별도 조회
        await loadMeatInfo(analysisResult.partName);
      }
    } catch (err: any) {
      console.error(
        "[API RESPONSE ERROR]: ",
        err.response?.data || err.message,
      );
      const errorMsg = err.message || "분석에 실패했습니다. 다시 시도해주세요.";
      setError(errorMsg);
      // window.alert 제거 - UI 통합 알림만 사용
    } finally {
      setAnalyzing(false);
    }
  };

  const loadMeatInfo = async (partName: string) => {
    setLoadingMeatInfo(true);
    try {
      const info = await getMeatInfoByPartName(partName);
      setMeatInfo(info);
    } catch (error: any) {
      console.error("Failed to load meat info:", error);
      // 영양정보 로드 실패는 치명적이지 않으므로 에러 표시하지 않음
    } finally {
      setLoadingMeatInfo(false);
    }
  };

  const handleTraceabilityLookup = async (overrideNum?: string) => {
    const num = (overrideNum ?? traceInput).trim();
    if (!num) {
      toast({
        title: "입력 필요",
        description: "이력번호 또는 묶음번호를 입력해 주세요.",
        variant: "destructive",
      });
      return;
    }

    // L로 시작하는 묶음번호는 확실히 국산 (예: L12601205379002)
    const isDomesticBundle = /^L\d+$/.test(num);

    // 수입 묶음번호 체크 (A + 20자리 이상) - 확실히 수입
    const isImportBundle = isBundleNumber(num);

    // L로 시작하는 묶음번호는 국산으로 바로 처리
    if (isDomesticBundle) {
      const mtraceUrl = `https://www.mtrace.go.kr/search.do?mtraceNo=${encodeURIComponent(
        num,
      )}`;
      window.open(mtraceUrl, "_blank");
      toast({
        title: "웹사이트 열림",
        description:
          "국산육 이력 정보는 M-Trace 공식 웹사이트에서 확인할 수 있습니다.",
      });
      return;
    }

    // 수입 묶음번호는 바로 처리
    if (isImportBundle) {
      setManualTraceError(null);
      setManualTraceability(null);
      setManualTraceabilityList(null);
      setSelectedTraceDetail(null);
      setManualTraceLoading(true);
      try {
        const list = await getTraceabilityBundleList(num);
        setManualTraceabilityList(list);
        toast({
          title: "조회 완료",
          description: `묶음 이력 ${list.length}건을 불러왔습니다. 항목을 클릭하면 상세 정보를 볼 수 있습니다.`,
        });
      } catch (err: any) {
        const msg =
          err.response?.data?.detail ||
          err.message ||
          "묶음번호 조회에 실패했습니다.";
        setManualTraceError(msg);
        toast({
          title: "조회 실패",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setManualTraceLoading(false);
      }
      return;
    }

    // 12자리 숫자 이력번호: 백엔드 API로 먼저 확인 (수입육도 12자리일 수 있음)
    // 백엔드가 성공하면 수입으로 처리, 실패하면 국산으로 처리
    const is12DigitNumber = /^\d{12}$/.test(num);

    setManualTraceError(null);
    setManualTraceability(null);
    setManualTraceabilityList(null);
    setSelectedTraceDetail(null);
    setManualTraceLoading(true);

    try {
      // 백엔드 API로 먼저 조회 시도 (백엔드가 자동으로 국산/수입 구분)
      const info = await getTraceabilityByNumber(num);
      // 성공하면 수입으로 처리 (백엔드가 수입 정보를 반환함)
      setManualTraceability(info);
      toast({ title: "조회 완료", description: "이력 정보를 불러왔습니다." });
    } catch (err: any) {
      // 백엔드가 실패하면 12자리 숫자인 경우 국산으로 판단하고 M-Trace로 리다이렉트
      // 백엔드가 12자리 숫자를 국산으로 판단해서 Domestic API를 호출하고,
      // 실패하면 Import로 재시도하고, Import도 실패하면 503을 반환함
      // 502는 HTML 오류 (국산 API 실패)이지만 백엔드가 Import로 재시도하므로,
      // 최종적으로 503이 반환되면 국산으로 판단
      const errorStatus = err.response?.status;
      const errorDetail = err.response?.data?.detail || err.message || "";

      // 12자리 숫자이고, 백엔드가 "이력제 API 연결 실패" 메시지를 반환하면 (Import도 실패한 경우) 국산으로 판단
      // 또는 502/503 에러인 경우도 국산으로 판단 (백엔드가 Import 재시도 후 실패)
      if (
        is12DigitNumber &&
        (errorStatus === 503 ||
          (errorStatus === 502 && errorDetail.includes("HTML")) ||
          errorDetail.includes("이력제 API 연결 실패"))
      ) {
        const mtraceUrl = `https://www.mtrace.go.kr/search.do?mtraceNo=${encodeURIComponent(
          num,
        )}`;
        window.open(mtraceUrl, "_blank");
        toast({
          title: "웹사이트 열림",
          description:
            "국산육 이력 정보는 M-Trace 공식 웹사이트에서 확인할 수 있습니다.",
        });
      } else {
        const msg = errorDetail || "이력번호 조회에 실패했습니다.";
        setManualTraceError(msg);
        toast({
          title: "조회 실패",
          description: msg,
          variant: "destructive",
        });
      }
    } finally {
      setManualTraceLoading(false);
    }
  };

  const handleSaveTraceabilityToFridge = async (
    traceInfo: TraceabilityInfo | null,
  ) => {
    if (!traceInfo) return;

    // 게스트 모드 체크
    if (getIsGuest() || !getAuthToken()) {
      toast({
        title: "로그인 필요",
        description:
          "냉장고 저장은 로그인 후 이용할 수 있습니다. 게스트 모드에서는 냉장고 기능을 사용할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    let expiry = traceInfo.recommendedExpiry || traceInfo.limitToDt;
    if (!expiry) {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      expiry = d.toISOString().slice(0, 10);
    } else {
      expiry = String(expiry).slice(0, 10);
    }
    // 만료일이 보관일(오늘) 이전이면 보관일+3일로 보정 (이력정보 유통기한이 과거인 경우)
    if (expiry <= today) {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      expiry = d.toISOString().slice(0, 10);
    }
    setSavingFromTraceability(true);
    try {
      await addFridgeItemFromTraceability({
        partName: traceInfo.partName || undefined,
        storageDate: today,
        expiryDate: expiry,
        traceNumber: traceInfo.historyNo || undefined,
        slaughterDate: traceInfo.slaughterDate
          ? String(traceInfo.slaughterDate).slice(0, 10)
          : undefined,
        origin: traceInfo.origin || undefined,
        companyName: traceInfo.companyName || undefined,
      });
      setShowSaveSuccessMessage(true);
      setTimeout(() => setShowSaveSuccessMessage(false), 2500);
      toast({
        title: "저장 완료",
        description: "냉장고에 추가되었습니다.",
        duration: 3000,
      });
      // 부모에게 냉장고 변경 알림 (사이드바 새로고침 등)
      onSaveToFridge?.();
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "냉장고 저장에 실패했습니다.";
      toast({
        title: "저장 실패",
        description: msg,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setSavingFromTraceability(false);
    }
  };

  const handleTraceItemClick = async (historyNo: string | null | undefined) => {
    if (!historyNo?.trim()) return;
    setDetailLoading(true);
    setSelectedTraceDetail(null);
    try {
      // 수입 묶음번호 목록에서 클릭한 이력번호는 수입으로 강제 처리
      const detail = await getTraceabilityByNumber(historyNo.trim(), "import");
      setSelectedTraceDetail(detail);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "상세 조회에 실패했습니다.";
      toast({
        title: "상세 조회 실패",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveToFridge = async () => {
    // 게스트 모드 체크
    if (getIsGuest() || !getAuthToken()) {
      toast({
        title: "로그인 필요",
        description:
          "냉장고 저장은 로그인 후 이용할 수 있습니다. 게스트 모드에서는 냉장고 기능을 사용할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    if (!analysisResponse || !analysisResponse.partName) {
      toast({
        title: "저장 실패",
        description: "분석 결과가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // auto_add_fridge = true로 다시 분석하여 자동 저장
      const blob = await fetch(selectedImage!).then((r) => r.blob());
      const file = new File([blob], "image.jpg", { type: "image/jpeg" });

      await analyzeImage(file, mode, true); // auto_add_fridge = true

      setShowSaveSuccessMessage(true);
      setTimeout(() => setShowSaveSuccessMessage(false), 2500);
      const successMsg = `${getPartDisplayName(analysisResponse.partName, meatInfo?.displayName)}이(가) 냉장고에 저장되었습니다.`;
      toast({
        title: "저장 완료",
        description: successMsg,
        duration: 3000,
      });
      // 부모에게 냉장고 변경 알림 (사이드바 새로고침 등)
      onSaveToFridge?.();
    } catch (error: any) {
      const errorMsg = error.message || "냉장고에 저장하는데 실패했습니다.";
      console.error("[API RESPONSE ERROR]: ", error.response?.data || errorMsg);
      toast({
        title: "저장 실패",
        description: errorMsg,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRecipeForPart = async () => {
    if (!analysisResponse?.partName) {
      toast({
        title: "부위 정보 없음",
        description: "먼저 고기 부위를 분석해주세요.",
        variant: "destructive",
      });
      return;
    }
    // LLMRecipeModal이 자체적으로 레시피를 생성하므로 모달만 열기
    setShowRecipeForPartModal(true);
  };

  const reset = () => {
    setSelectedImage(null);
    setResult(null);
    setAnalysisResponse(null);
    setError(null);
    setInputMethod(null);
    setAutoLookupDone(false);
    setManualTraceability(null);
    setManualTraceabilityList(null);
    setSelectedTraceDetail(null);
    setManualTraceError(null);
    setTraceInput("");
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-6 sm:pb-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3">
        {onBack && <BackButton onClick={onBack} />}
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          고기 분석
        </h2>
      </div>

      {/* AI 분석 모드 선택: 소 버전 | 돼지 버전 | OCR 버전 — 모바일 최적화 */}
      <Card className="bg-card/95 backdrop-blur border-primary/20 shadow-lg shadow-primary/5 rounded-2xl overflow-hidden">
        <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </span>
            부위 판별 모드
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-1">
            분석할 고기 종류 또는 인식 방식을 선택하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {AI_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (mode !== opt.value) {
                    reset();
                    setMode(opt.value);
                  }
                }}
                className={`
                  flex flex-col items-center gap-3 min-h-[100px] sm:min-h-[110px] p-5 rounded-2xl border-2 transition-all duration-200
                  active:scale-[0.98] touch-manipulation
                  ${
                    mode === opt.value
                      ? "border-primary bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-md shadow-primary/10"
                      : "border-border/80 bg-muted/30 hover:border-primary/40 hover:bg-muted/60"
                  }
                `}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                    mode === opt.value ? "bg-primary/25" : "bg-muted"
                  }`}
                >
                  {opt.icon}
                </div>
                <span className="font-bold text-sm sm:text-base">
                  {opt.label}
                </span>
                <span className="text-[11px] sm:text-xs text-muted-foreground text-center leading-tight">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end">
            <Badge
              variant="outline"
              className="gap-1.5 px-3 py-1 text-xs font-medium"
            >
              AI{" "}
              {mode === "beef"
                ? "소 9부위"
                : mode === "pork"
                  ? "돼지 7부위"
                  : "이력번호 조회"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* OCR 모드에서만: 이력번호 직접 입력 링크 — 오른쪽 하단 */}
      {mode === "ocr" && !showTraceabilitySection && (
        <div className="flex justify-end px-2">
          <button
            type="button"
            onClick={() => setShowTraceabilitySection(true)}
            className="text-sm text-primary hover:text-primary/80 hover:underline font-semibold flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all shadow-sm"
          >
            <FileText className="w-4 h-4" />
            이력번호 직접 입력하여 조회
          </button>
        </div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {!selectedImage && inputMethod !== "camera" ? (
          // Input Selection
          <motion.div
            key="input-selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Drag & Drop Zone — 모바일 터치 영역 확대 */}
            <Card
              className="bg-gradient-to-br from-muted/50 to-card border-2 border-dashed border-primary/40 hover:border-primary/60 active:border-primary/70 transition-all cursor-pointer rounded-2xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.995] touch-manipulation"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="py-14 sm:py-16 px-4">
                <div className="text-center">
                  <div className="inline-flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-primary/10 mb-5">
                    <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mb-2 text-foreground">
                    이미지를 드래그하거나 클릭하세요
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-5">
                    JPG, PNG 파일 (최대 10MB)
                  </p>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-primary text-primary hover:bg-primary/10 min-h-12 px-6 font-semibold rounded-xl"
                  >
                    파일 선택
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Camera Button — 모바일 최소 48px 터치 영역 */}
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                onClick={startCamera}
                className="w-full min-h-[56px] sm:min-h-[64px] bg-primary hover:bg-primary/90 text-primary-foreground text-base sm:text-lg font-bold gap-3 rounded-xl shadow-lg shadow-primary/20"
              >
                <Camera className="w-6 h-6" />
                {isMobileDevice() ? "카메라로 촬영하기" : "웹캠으로 촬영하기"}
              </Button>
              {/* 모바일 네이티브 카메라 입력 (숨김) */}
              <input
                ref={mobileCameraInputRef}
                type="file"
                accept="image/*"
                capture={isAndroidDevice() ? "environment" : undefined}
                onChange={handleMobileCameraSelect}
                className="hidden"
              />
            </motion.div>
          </motion.div>
        ) : inputMethod === "camera" && !selectedImage ? (
          // Camera View
          <motion.div
            key="camera-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="bg-card border-primary/20 overflow-hidden">
              <CardContent className="p-0">
                <div className="relative bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto"
                    style={{ minHeight: "400px" }}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        console.log("Video stream ready:", {
                          width: videoRef.current.videoWidth,
                          height: videoRef.current.videoHeight,
                        });
                      }
                    }}
                    onError={(e) => {
                      console.error("Video element error:", e);
                      setError("비디오 스트림을 재생할 수 없습니다.");
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <div className="flex gap-2 justify-center">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Button
                          onClick={capturePhoto}
                          size="lg"
                          className="bg-white text-primary hover:bg-white/90 rounded-full w-16 h-16"
                        >
                          <Camera className="w-6 h-6" />
                        </Button>
                      </motion.div>
                      <Button
                        onClick={reset}
                        variant="secondary"
                        size="lg"
                        className="rounded-full"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : selectedImage ? (
          // Image Preview & Analysis
          <motion.div
            key="analysis-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <Card className="bg-card border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-primary">
                    {result ? "분석 결과" : "이미지 확인"}
                  </CardTitle>
                  <Button onClick={reset} variant="ghost" size="sm">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 분석 완료 알림 - 모드별 출력 (OCR 실패 시에는 표시하지 않음) */}
                {result &&
                  !analyzing &&
                  !(mode === "ocr" && !result.traceabilityNumber) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-2 border-primary/30 p-6 mb-6"
                    >
                      <div className="flex items-center justify-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                        <div className="text-center flex-1">
                          <h3 className="text-xl font-bold text-primary mb-1">
                            {mode === "ocr"
                              ? "이력번호 인식이 완료되었습니다!"
                              : "부위 분석이 완료되었습니다!"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {mode === "ocr" ? (
                              result.traceabilityNumber ? (
                                <>
                                  인식된 번호:{" "}
                                  <span className="font-mono font-semibold">
                                    {result.traceabilityNumber}
                                  </span>
                                </>
                              ) : (
                                "아래에서 이력번호를 직접 입력할 수 있습니다."
                              )
                            ) : (
                              <>
                                {getPartDisplayName(
                                  result.partName,
                                  meatInfo?.displayName,
                                )}{" "}
                                부위가 성공적으로 분석되었습니다.
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                {/* OCR 인식 실패 시 안내 배너 */}
                {result &&
                  mode === "ocr" &&
                  !result.traceabilityNumber &&
                  !analyzing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-yellow-800">
                            이미지에서 이력번호를 찾지 못했습니다
                          </h4>
                          <p className="text-xs text-yellow-700">
                            아래 방법으로 다시 시도해 보세요:
                          </p>
                        </div>
                      </div>
                      <ul className="text-xs text-yellow-700 space-y-1.5 ml-8 list-disc">
                        <li>
                          이력번호가 선명하게 보이도록 가까이 촬영해 주세요
                        </li>
                        <li>빛 반사나 그림자가 없는 환경에서 촬영해 주세요</li>
                        <li>이미지가 회전되지 않았는지 확인해 주세요</li>
                      </ul>
                      <div className="flex flex-col sm:flex-row gap-2 ml-8">
                        <Button
                          onClick={reset}
                          variant="outline"
                          size="sm"
                          className="border-yellow-400 text-yellow-800 hover:bg-yellow-100 gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          다시 촬영하기
                        </Button>
                        <Button
                          onClick={() => setShowTraceabilitySection(true)}
                          variant="outline"
                          size="sm"
                          className="border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
                        >
                          <Keyboard className="w-3.5 h-3.5" />
                          이력번호 직접 입력
                        </Button>
                      </div>
                    </motion.div>
                  )}

                {/* Analysis Result - 반응형 레이아웃 (OCR 모드는 이력 조회 영역으로 연결) */}
                {result && mode === "ocr" ? (
                  <div className="space-y-4">
                    <div className="space-y-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <h4 className="text-sm font-semibold text-primary">
                        OCR 인식 결과
                      </h4>
                      {result.traceabilityNumber ? (
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                              value={result.traceabilityNumber}
                              readOnly
                              className="font-mono"
                            />
                            <Button
                              onClick={() => {
                                handleTraceabilityLookup(
                                  result.traceabilityNumber || "",
                                );
                              }}
                              disabled={manualTraceLoading}
                              className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                            >
                              {manualTraceLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  조회 중...
                                </>
                              ) : (
                                "이력번호로 조회하기"
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            이미지에서 이력번호를 자동으로 인식하지 못했습니다.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              placeholder="이력번호를 직접 입력하세요"
                              value={traceInput}
                              onChange={(e) => {
                                setTraceInput(e.target.value);
                                setManualTraceError(null);
                              }}
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleTraceabilityLookup()
                              }
                              className="font-mono flex-1"
                            />
                            <Button
                              onClick={() => handleTraceabilityLookup()}
                              disabled={
                                manualTraceLoading || !traceInput.trim()
                              }
                              className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                            >
                              {manualTraceLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  조회 중...
                                </>
                              ) : (
                                <>
                                  <Keyboard className="w-4 h-4 mr-2" />
                                  이력번호로 조회
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* OCR 조회 결과 — 수입산 결과 인라인 표시 */}
                    {manualTraceability && !manualTraceabilityList?.length && (
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                        <h4 className="text-sm font-semibold text-primary">
                          이력 정보 (냉장고 연동용)
                        </h4>
                        <TraceabilityDetailSections
                          info={manualTraceability}
                          onSaveToFridge={() =>
                            handleSaveTraceabilityToFridge(manualTraceability)
                          }
                          saving={savingFromTraceability}
                        />
                      </div>
                    )}
                    {manualTraceabilityList &&
                      manualTraceabilityList.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-primary">
                            묶음 이력 목록 ({manualTraceabilityList.length}건) —
                            클릭 시 상세
                          </h4>
                          <ul className="space-y-2 max-h-48 overflow-y-auto">
                            {manualTraceabilityList.map((item, idx) => (
                              <li key={item.historyNo ?? idx}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleTraceItemClick(item.historyNo)
                                  }
                                  disabled={detailLoading}
                                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-primary/10 hover:border-primary/30 transition-colors disabled:opacity-50"
                                >
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {item.historyNo || "(이력번호 없음)"}
                                  </span>
                                  {(item.origin ||
                                    item.partName ||
                                    item.slaughterDate) && (
                                    <span className="ml-2 text-sm">
                                      {[
                                        item.origin,
                                        item.partName,
                                        item.slaughterDate,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </span>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                          {detailLoading && (
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              상세 정보 조회 중...
                            </p>
                          )}
                          {selectedTraceDetail && (
                            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                              <h4 className="text-sm font-semibold text-primary">
                                선택 이력 상세 (냉장고 연동용)
                              </h4>
                              <TraceabilityDetailSections
                                info={selectedTraceDetail}
                                onSaveToFridge={() =>
                                  handleSaveTraceabilityToFridge(
                                    selectedTraceDetail,
                                  )
                                }
                                saving={savingFromTraceability}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    {manualTraceError && (
                      <p className="text-sm text-destructive p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        {manualTraceError}
                      </p>
                    )}

                    {/* 다시 분석하기 버튼 (OCR) */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="pt-2"
                    >
                      <Button
                        onClick={reset}
                        variant="outline"
                        className="w-full min-h-[52px] border-2 border-primary/40 text-primary hover:bg-primary/10 font-bold text-base rounded-xl gap-2"
                      >
                        <Camera className="w-5 h-5" />
                        다시 분석하기 (OCR)
                      </Button>
                    </motion.div>
                  </div>
                ) : result ? (
                  <div className="space-y-5">
                    {/* 상단: 이미지 + 분석 결과 요약 */}
                    <div className="flex flex-col sm:flex-row gap-5">
                      {/* 이미지 */}
                      <div className="flex-shrink-0 sm:w-56 md:w-64">
                        <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-muted/20 shadow-sm aspect-square">
                          <img
                            src={selectedImage}
                            alt="Selected"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* 분석 결과 요약 */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3"
                        >
                          {/* 신뢰도 20% 미만 경고 */}
                          {result.confidence < 0.2 && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2.5">
                              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                              <p className="text-xs text-red-700">
                                인식 신뢰도가 낮습니다. 사진을 더 명확하게
                                찍어주세요.
                              </p>
                            </div>
                          )}

                          {/* 부위명 + 뱃지 */}
                          <div>
                            <h3 className="text-2xl font-extrabold text-primary tracking-tight">
                              {getPartDisplayName(
                                result.partName,
                                meatInfo?.displayName,
                              )}
                            </h3>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <Badge
                                variant="outline"
                                className="text-xs font-semibold border-primary/30 text-primary bg-primary/5"
                              >
                                신뢰도 {(result.confidence * 100).toFixed(1)}%
                              </Badge>
                              {result.origin && (
                                <Badge variant="secondary" className="text-xs">
                                  {result.origin}
                                </Badge>
                              )}
                              {result.grade && (
                                <Badge className="bg-primary text-primary-foreground text-xs">
                                  {result.grade}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* 영양정보 인라인 */}
                          {meatInfo &&
                            (meatInfo.calories !== null ||
                              meatInfo.protein !== null ||
                              meatInfo.fat !== null) && (
                              <div className="p-3 rounded-xl bg-secondary/60 border border-border/40">
                                {meatInfo.nutritionSource &&
                                  (meatInfo.nutritionSource === "fallback" ||
                                    meatInfo.nutritionSource === "timeout" ||
                                    meatInfo.nutritionSource === "error") && (
                                    <div className="mb-2 flex items-center gap-1.5 text-[10px] text-yellow-700">
                                      <AlertCircle className="w-3 h-3" />
                                      실시간 데이터 호출 실패, 기본 데이터 사용
                                      중
                                    </div>
                                  )}
                                <p className="text-[11px] font-bold text-foreground/70 uppercase tracking-wider mb-1.5">
                                  영양정보 (100g)
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                  {meatInfo.calories !== null && (
                                    <div className="text-center p-2 rounded-lg bg-background/80">
                                      <p className="text-xs text-muted-foreground">
                                        칼로리
                                      </p>
                                      <p className="text-sm font-bold text-foreground">
                                        {meatInfo.calories}
                                        <span className="text-[10px] font-normal">
                                          kcal
                                        </span>
                                      </p>
                                    </div>
                                  )}
                                  {meatInfo.protein !== null && (
                                    <div className="text-center p-2 rounded-lg bg-background/80">
                                      <p className="text-xs text-muted-foreground">
                                        단백질
                                      </p>
                                      <p className="text-sm font-bold text-foreground">
                                        {meatInfo.protein.toFixed(1)}
                                        <span className="text-[10px] font-normal">
                                          g
                                        </span>
                                      </p>
                                    </div>
                                  )}
                                  {meatInfo.fat !== null && (
                                    <div className="text-center p-2 rounded-lg bg-background/80">
                                      <p className="text-xs text-muted-foreground">
                                        지방
                                      </p>
                                      <p className="text-sm font-bold text-foreground">
                                        {meatInfo.fat.toFixed(1)}
                                        <span className="text-[10px] font-normal">
                                          g
                                        </span>
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                        </motion.div>
                      </div>
                    </div>

                    {/* 시세 정보 */}
                    {meatInfo && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                      >
                        <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                          <h4 className="text-xs font-bold text-foreground/70 uppercase tracking-wider mb-3">
                            시세 정보
                          </h4>
                          {meatInfo.priceSource === "fallback" && (
                            <div className="mb-2 flex items-center gap-1.5 text-[10px] text-yellow-700">
                              <AlertCircle className="w-3 h-3" />
                              실시간 데이터 호출 실패, 기본 데이터 사용 중
                            </div>
                          )}
                          {meatInfo.currentPrice > 0 ? (
                            <div className="space-y-2">
                              <div className="flex items-baseline justify-between">
                                <span className="text-sm text-muted-foreground">
                                  현재 가격
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-extrabold text-primary">
                                    {meatInfo.currentPrice.toLocaleString()}원
                                  </span>
                                  <Badge
                                    variant={
                                      meatInfo.priceTrend === "up"
                                        ? "default"
                                        : meatInfo.priceTrend === "down"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className="text-[10px]"
                                  >
                                    {meatInfo.priceTrend === "up"
                                      ? "↑ 상승"
                                      : meatInfo.priceTrend === "down"
                                        ? "↓ 하락"
                                        : "→ 보합"}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>단위: {meatInfo.priceUnit}</span>
                                {meatInfo.priceDate && (
                                  <span>기준일: {meatInfo.priceDate}</span>
                                )}
                              </div>
                              {meatInfo.gradePrices &&
                                meatInfo.gradePrices.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-border/40">
                                    <p className="text-[10px] text-muted-foreground mb-1.5">
                                      등급별 가격
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                      {meatInfo.gradePrices.map((gp) => (
                                        <div
                                          key={`${gp.grade}-${gp.price}`}
                                          className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-muted/30"
                                        >
                                          <span className="text-muted-foreground">
                                            {gp.grade}
                                          </span>
                                          <span className="font-semibold">
                                            {gp.price.toLocaleString()}원
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 py-4 px-3 rounded-lg bg-muted/20 border border-dashed border-muted-foreground/20">
                              <FileText className="w-5 h-5 text-muted-foreground/50" />
                              <div>
                                <p className="text-sm font-medium text-foreground/70">
                                  가격 정보 없음
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  이 부위는 시세 API에 등록되지 않았습니다.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* OCR/분석 결과 이력 정보 */}
                    {analysisResponse?.traceability && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-3">
                          <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                            이력 정보 (냉장고 연동용)
                          </h4>
                          <TraceabilityDetailSections
                            info={analysisResponse.traceability ?? null}
                            onSaveToFridge={() =>
                              handleSaveTraceabilityToFridge(
                                analysisResponse.traceability ?? null,
                              )
                            }
                            saving={savingFromTraceability}
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* 액션 버튼 그룹 */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="space-y-2"
                    >
                      {/* 레시피 + 냉장고 저장 */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={handleRecipeForPart}
                          variant="outline"
                          className="h-11 border-primary/30 text-primary hover:bg-primary/10 font-semibold text-sm rounded-xl"
                        >
                          <ChefHat className="w-4 h-4 mr-1.5" />
                          레시피 추천
                        </Button>
                        {!getIsGuest() && getAuthToken() ? (
                          <Button
                            onClick={handleSaveToFridge}
                            disabled={saving}
                            className="h-11 bg-primary hover:bg-primary/90 font-semibold text-sm rounded-xl"
                          >
                            {saving ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                저장 중...
                              </>
                            ) : (
                              "냉장고에 저장"
                            )}
                          </Button>
                        ) : (
                          <div className="flex items-center justify-center h-11 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground">
                            로그인 후 저장 가능
                          </div>
                        )}
                      </div>

                      {/* 다시 분석 + 모드 전환 */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={reset}
                          variant="outline"
                          className="h-11 border-primary/30 text-primary hover:bg-primary/10 font-semibold text-sm rounded-xl gap-1.5"
                        >
                          <Sparkles className="w-4 h-4" />
                          {mode === "beef" ? "소 다시 분석" : "돼지 다시 분석"}
                        </Button>
                        <Button
                          onClick={() => {
                            reset();
                            setMode("ocr");
                          }}
                          variant="outline"
                          className="h-11 border-muted-foreground/25 text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 font-semibold text-sm rounded-xl gap-1.5"
                        >
                          <FileText className="w-4 h-4" />
                          OCR 이력번호
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  /* 이미지 선택 후 분석 전 - 이미지와 분석 버튼 */
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
                      <img
                        src={selectedImage}
                        alt="Selected"
                        className="w-full h-auto object-contain max-h-[500px] mx-auto"
                      />
                    </div>
                    {/* Analyze Button */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={analyzeCurrentImage}
                        disabled={analyzing}
                        className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            AI 분석 중...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            {mode === "ocr"
                              ? "OCR 인식 시작"
                              : mode === "beef"
                                ? "소 부위 분석"
                                : "돼지 부위 분석"}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border-2 border-red-200 bg-red-50 p-4 space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-red-700">
                {mode === "ocr" ? "이력번호 인식 실패" : "부위 분석 실패"}
              </h4>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 ml-8">
            <Button
              onClick={reset}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              다시 시도
            </Button>
            {mode === "ocr" && (
              <Button
                onClick={() => {
                  setError(null);
                  setShowTraceabilitySection(true);
                }}
                variant="outline"
                size="sm"
                className="border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
              >
                <Keyboard className="w-3.5 h-3.5" />
                이력번호 직접 입력
              </Button>
            )}
          </div>
          {mode !== "ocr" && (
            <p className="text-[11px] text-red-500/70 ml-8">
              💡 이미지가 선명한지, 고기 부위가 잘 보이는지 확인해 주세요.
            </p>
          )}
        </motion.div>
      )}

      {/* 저장 성공 시 가운데 메시지 UI */}
      <AnimatePresence>
        {showSaveSuccessMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setShowSaveSuccessMessage(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl shadow-xl border-2 border-primary/30 p-8 max-w-sm w-full text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">
                저장되었습니다
              </h3>
              <p className="text-sm text-muted-foreground">
                냉장고에 추가되었습니다.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 이력번호/묶음번호 조회 — OCR 실패 시 또는 "직접 입력" 클릭 시 노출, 단 OCR 자동조회 결과가 인라인에 이미 표시 중이면 숨김 */}
      {showTraceabilitySection &&
        !(
          mode === "ocr" &&
          autoLookupDone &&
          (manualTraceability || manualTraceabilityList?.length)
        ) && (
          <div ref={traceabilitySectionRef} className="space-y-3">
            {ocrFailed && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-center">
                <p className="text-sm font-medium">
                  이미지에서 이력번호를 인식하지 못했습니다. 아래에서 이력번호를
                  직접 입력해 조회해 보세요.
                </p>
              </div>
            )}
            <Card className="bg-card/95 backdrop-blur border-primary/20 shadow-lg shadow-primary/5 rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="text-base sm:text-lg">
                  이력번호 / 묶음번호로 조회
                </CardTitle>
                <div className="flex gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs sm:text-sm mt-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    <strong>국내육</strong> 12자리 이력번호 또는
                    묶음번호(L+숫자) 조회 시{" "}
                    <strong>M-Trace 등 외부 사이트로 이동</strong>됩니다. 수입육
                    묶음번호(A+숫자)는 이 사이트에서 조회됩니다.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="예: 002188519524 또는 L12601205379002 (국산), A41535850069100026012505 (수입)"
                    value={traceInput}
                    onChange={(e) => {
                      setTraceInput(e.target.value);
                      setManualTraceError(null);
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleTraceabilityLookup()
                    }
                    className="flex-1 min-h-11 sm:min-h-10"
                  />
                  <Button
                    onClick={() => handleTraceabilityLookup()}
                    disabled={manualTraceLoading}
                    variant="secondary"
                    className="shrink-0 min-h-11 sm:min-h-10 font-semibold"
                  >
                    {manualTraceLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "조회"
                    )}
                  </Button>
                </div>
                {manualTraceError && (
                  <p className="text-sm text-destructive">{manualTraceError}</p>
                )}
                {manualTraceabilityList &&
                  manualTraceabilityList.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-primary">
                        묶음 이력 목록 ({manualTraceabilityList.length}건) —
                        클릭 시 상세
                      </h4>
                      <ul className="space-y-2 max-h-48 overflow-y-auto">
                        {manualTraceabilityList.map((item, idx) => (
                          <li key={item.historyNo ?? idx}>
                            <button
                              type="button"
                              onClick={() =>
                                handleTraceItemClick(item.historyNo)
                              }
                              disabled={detailLoading}
                              className="w-full text-left p-3 rounded-lg border border-border hover:bg-primary/10 hover:border-primary/30 transition-colors disabled:opacity-50"
                            >
                              <span className="font-mono text-xs text-muted-foreground">
                                {item.historyNo || "(이력번호 없음)"}
                              </span>
                              {(item.origin ||
                                item.partName ||
                                item.slaughterDate) && (
                                <span className="ml-2 text-sm">
                                  {[
                                    item.origin,
                                    item.partName,
                                    item.slaughterDate,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                      {detailLoading && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          상세 정보 조회 중...
                        </p>
                      )}
                      {selectedTraceDetail && (
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                          <h4 className="text-sm font-semibold text-primary">
                            선택 이력 상세 (냉장고 연동용)
                          </h4>
                          <TraceabilityDetailSections
                            info={selectedTraceDetail}
                            onSaveToFridge={() =>
                              handleSaveTraceabilityToFridge(
                                selectedTraceDetail,
                              )
                            }
                            saving={savingFromTraceability}
                          />
                        </div>
                      )}
                    </div>
                  )}
                {manualTraceability && !manualTraceabilityList?.length && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                    <h4 className="text-sm font-semibold text-primary">
                      이력 정보 (냉장고 연동용)
                    </h4>
                    <TraceabilityDetailSections
                      info={manualTraceability}
                      onSaveToFridge={() =>
                        handleSaveTraceabilityToFridge(manualTraceability)
                      }
                      saving={savingFromTraceability}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      {/* 이 부위 레시피 추천 모달 — LLMRecipeModal 재사용 */}
      <LLMRecipeModal
        open={showRecipeForPartModal}
        onOpenChange={setShowRecipeForPartModal}
        source="part_specific"
        partName={analysisResponse?.partName}
      />
    </div>
  );
}
