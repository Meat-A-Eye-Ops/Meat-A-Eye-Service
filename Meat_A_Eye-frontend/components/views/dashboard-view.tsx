"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Beef,
  BookOpen,
  AlertCircle,
  Ham,
  Snowflake,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Sector,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  getFridgeItems,
  getDashboardPrices,
  getDashboardPriceHistory,
  getDashboardPriceHistoryCheck,
} from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import type {
  FridgeItemResponse,
  PriceItem,
  PriceHistoryPoint,
  DashboardPricesResponse,
  PriceHistoryResponse,
} from "@/src/types/api";

// 17부위 영문 → 한글 표시 (부위별 분포, 냉장고 현황)
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
  Import_Beef_Rib_AU: "수입 소고기/갈비(호주)",
  Import_Beef_Ribeye_AU: "수입 소고기/갈비살(호주)",
  Import_Pork_Belly: "수입 돼지고기/삼겹살",
};
function getPartDisplayName(partName: string): string {
  return PART_DISPLAY_NAMES[partName] ?? partName;
}

interface DashboardViewProps {
  onNavigate: (menu: string) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const [fridgeItems, setFridgeItems] = useState<FridgeItemResponse[]>([]);
  const [priceData, setPriceData] = useState<{
    beef: PriceItem[];
    pork: PriceItem[];
  }>({ beef: [], pork: [] });
  const [priceHistory, setPriceHistory] = useState<{
    beef: PriceHistoryPoint[];
    pork: PriceHistoryPoint[];
  }>({ beef: [], pork: [] });
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [priceInitialLoading, setPriceInitialLoading] = useState(true); // 가격 섹션 초기 로딩 (지연)
  const [monthlyApiConnected, setMonthlyApiConnected] = useState<
    boolean | null
  >(null);

  // 필터 상태
  const [selectedCategory, setSelectedCategory] = useState<string>("소"); // 부류: 소, 돼지, 수입 소고기, 수입 돼지고기
  const [selectedRegion, setSelectedRegion] = useState("전국");
  const [selectedPart, setSelectedPart] = useState<string>("전체"); // 통합 부위 선택
  const [selectedGrade, setSelectedGrade] = useState("00"); // 00 = 전체 평균

  useEffect(() => {
    // 초기 로드: 냉장고 데이터만 먼저 빠르게 로드
    loadFridgeDataOnly();
    // 가격 데이터는 지연 로드 (500ms 후)
    const timer = setTimeout(() => {
      loadInitialPriceData();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // 가격·이력은 "조회" 버튼 클릭 시에만 재조회 (카테고리/등급 변경 시 자동 로딩 없음)

  // 부류 선택 핸들러: 부류 변경 시 품목과 등급 초기화
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    // 수입 돼지고기 선택 시 품종을 자동으로 "삼겹살"로 설정
    if (category === "수입 돼지고기") {
      setSelectedPart("Import_Pork_Belly");
    } else {
      setSelectedPart("전체");
    }
    // 수입 소고기나 돼지 선택 시 등급을 "00"으로 강제 설정
    if (
      category === "돼지" ||
      category === "수입 돼지고기" ||
      category === "수입 소고기"
    ) {
      setSelectedGrade("00");
    } else {
      setSelectedGrade("00");
    }
  };

  // 부위 선택 핸들러: 돼지 선택 시 등급을 자동으로 "00"으로 변경
  const handlePartChange = (part: string) => {
    setSelectedPart(part);
    // 돼지 또는 수입 돼지고기 부위 선택 시 등급을 자동으로 전체 평균으로 변경
    if (
      part !== "전체" &&
      (part.startsWith("Pork_") || part.startsWith("Import_Pork_"))
    ) {
      setSelectedGrade("00");
    }
  };

  // 조회 버튼 클릭 핸들러
  const handleSearch = async () => {
    await Promise.all([loadPriceData(), loadPriceHistory()]);
  };

  useEffect(() => {
    getDashboardPriceHistoryCheck()
      .then((res) => setMonthlyApiConnected(res.connected))
      .catch(() => setMonthlyApiConnected(false));
  }, []);

  // 부류와 품목에 따라 올바른 part_name 결정
  const getPartName = () => {
    if (selectedPart === "전체") {
      // 수입 소고기/수입 돼지고기 선택 시 "전체"는 undefined 반환
      // 프론트엔드에서 해당 카테고리의 기본 부위들을 개별적으로 조회
      return undefined;
    }
    return selectedPart;
  };

  // 카테고리별 기본 부위 목록 반환
  const getDefaultPartsForCategory = () => {
    if (selectedCategory === "소") {
      return {
        beef: ["Beef_Ribeye", "Beef_Rib"], // 등심, 갈비
        pork: [],
      };
    } else if (selectedCategory === "돼지") {
      return {
        beef: [],
        pork: ["Pork_PicnicShoulder", "Pork_Belly", "Pork_Ribs", "Pork_Neck"], // 앞다리, 삼겹살, 갈비, 목심 (가격 제공 4부위)
      };
    } else if (selectedCategory === "수입 소고기") {
      return {
        beef: ["Import_Beef_Rib_AU", "Import_Beef_Ribeye_AU"],
        pork: [],
      };
    } else if (selectedCategory === "수입 돼지고기") {
      return {
        beef: [],
        pork: ["Import_Pork_Belly"],
      };
    }
    return { beef: [], pork: [] };
  };

  // 냉장고 데이터만 먼저 빠르게 로드
  const loadFridgeDataOnly = async () => {
    try {
      const fridgeResponse = await getFridgeItems();
      setFridgeItems(
        fridgeResponse.items.filter((item) => item.status === "stored"),
      );
    } catch (error: any) {
      console.error("Failed to load fridge data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 가격 데이터 지연 로드 (백그라운드)
  const loadInitialPriceData = async () => {
    setPriceInitialLoading(true);
    try {
      const partName = getPartName();
      let pricesResponse: DashboardPricesResponse = { beef: [], pork: [] };
      let historyResponse: PriceHistoryResponse = { beef: [], pork: [] };

      if (partName === undefined) {
        const defaultParts = getDefaultPartsForCategory();
        const beefPromises = defaultParts.beef.map((beefPart) =>
          Promise.all([
            getDashboardPrices(
              selectedRegion,
              beefPart,
              undefined,
              selectedGrade,
            ).catch(() => ({ beef: [] as PriceItem[], pork: [] })),
            getDashboardPriceHistory(
              selectedRegion,
              beefPart,
              undefined,
              selectedGrade,
              6,
            ).catch(() => ({ beef: [] as PriceHistoryPoint[], pork: [] })),
          ]),
        );
        const porkPromises = defaultParts.pork.map((porkPart) =>
          Promise.all([
            getDashboardPrices(
              selectedRegion,
              undefined,
              porkPart,
              selectedGrade,
            ).catch(() => ({ beef: [], pork: [] as PriceItem[] })),
            getDashboardPriceHistory(
              selectedRegion,
              undefined,
              porkPart,
              selectedGrade,
              6,
            ).catch(() => ({ beef: [], pork: [] as PriceHistoryPoint[] })),
          ]),
        );
        const results = await Promise.all([...beefPromises, ...porkPromises]);
        const beefResults = results.slice(0, defaultParts.beef.length) as Array<
          [DashboardPricesResponse, PriceHistoryResponse]
        >;
        const porkResults = results.slice(defaultParts.beef.length) as Array<
          [DashboardPricesResponse, PriceHistoryResponse]
        >;

        pricesResponse = {
          beef: beefResults.flatMap(([p]) => p.beef),
          pork: porkResults.flatMap(([p]) => p.pork),
        };
        historyResponse = {
          beef: beefResults.flatMap(([, h]) => h.beef),
          pork: porkResults.flatMap(([, h]) => h.pork),
        };
      } else {
        const [pricesRes, historyRes] = await Promise.all([
          getDashboardPrices(
            selectedRegion,
            partName &&
              (partName.startsWith("Beef_") ||
                partName.startsWith("Import_Beef_"))
              ? partName
              : undefined,
            partName &&
              (partName.startsWith("Pork_") ||
                partName.startsWith("Import_Pork_"))
              ? partName
              : undefined,
            selectedGrade,
          ).catch((): DashboardPricesResponse => ({ beef: [], pork: [] })),
          getDashboardPriceHistory(
            selectedRegion,
            partName &&
              (partName.startsWith("Beef_") ||
                partName.startsWith("Import_Beef_"))
              ? partName
              : undefined,
            partName &&
              (partName.startsWith("Pork_") ||
                partName.startsWith("Import_Pork_"))
              ? partName
              : undefined,
            selectedGrade,
            6,
          ).catch((): PriceHistoryResponse => ({ beef: [], pork: [] })),
        ]);
        pricesResponse = pricesRes;
        historyResponse = historyRes;
      }

      setPriceData(pricesResponse);
      setPriceHistory(historyResponse);
    } catch (error: any) {
      console.error("Failed to load initial price data:", error);
    } finally {
      setPriceInitialLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const partName = getPartName();

      // "전체" 선택 시: 냉장고 + 모든 부위 가격/이력을 병렬로 한 번에 요청
      let pricesResponse: DashboardPricesResponse = { beef: [], pork: [] };
      let historyResponse: PriceHistoryResponse = { beef: [], pork: [] };

      if (partName === undefined) {
        const defaultParts = getDefaultPartsForCategory();
        const beefPromises = defaultParts.beef.map((beefPart) =>
          Promise.all([
            getDashboardPrices(
              selectedRegion,
              beefPart,
              undefined,
              selectedGrade,
            ).catch(() => ({ beef: [] as PriceItem[], pork: [] })),
            getDashboardPriceHistory(
              selectedRegion,
              beefPart,
              undefined,
              selectedGrade,
              6,
            ).catch(() => ({ beef: [] as PriceHistoryPoint[], pork: [] })),
          ]),
        );
        const porkPromises = defaultParts.pork.map((porkPart) =>
          Promise.all([
            getDashboardPrices(
              selectedRegion,
              undefined,
              porkPart,
              selectedGrade,
            ).catch(() => ({ beef: [], pork: [] as PriceItem[] })),
            getDashboardPriceHistory(
              selectedRegion,
              undefined,
              porkPart,
              selectedGrade,
              6,
            ).catch(() => ({ beef: [], pork: [] as PriceHistoryPoint[] })),
          ]),
        );
        const allPromises = [
          getFridgeItems(),
          ...beefPromises,
          ...porkPromises,
        ];
        const results = await Promise.all(allPromises);
        const fridgeResponse = results[0] as Awaited<
          ReturnType<typeof getFridgeItems>
        >;
        const beefResults = results.slice(
          1,
          1 + defaultParts.beef.length,
        ) as Array<[DashboardPricesResponse, PriceHistoryResponse]>;
        const porkResults = results.slice(
          1 + defaultParts.beef.length,
        ) as Array<[DashboardPricesResponse, PriceHistoryResponse]>;

        pricesResponse = {
          beef: beefResults.flatMap(([p]) => p.beef),
          pork: porkResults.flatMap(([p]) => p.pork),
        };
        historyResponse = {
          beef: beefResults.flatMap(([, h]) => h.beef),
          pork: porkResults.flatMap(([, h]) => h.pork),
        };

        setFridgeItems(
          fridgeResponse.items.filter((item) => item.status === "stored"),
        );
        setPriceData(pricesResponse);
        setPriceHistory(historyResponse);
      } else {
        const [fridgeResponse, pricesRes, historyRes] = await Promise.all([
          getFridgeItems(),
          getDashboardPrices(
            selectedRegion,
            partName &&
              (partName.startsWith("Beef_") ||
                partName.startsWith("Import_Beef_"))
              ? partName
              : undefined,
            partName &&
              (partName.startsWith("Pork_") ||
                partName.startsWith("Import_Pork_"))
              ? partName
              : undefined,
            selectedGrade,
          ).catch((): DashboardPricesResponse => ({ beef: [], pork: [] })),
          getDashboardPriceHistory(
            selectedRegion,
            partName &&
              (partName.startsWith("Beef_") ||
                partName.startsWith("Import_Beef_"))
              ? partName
              : undefined,
            partName &&
              (partName.startsWith("Pork_") ||
                partName.startsWith("Import_Pork_"))
              ? partName
              : undefined,
            selectedGrade,
            6,
          ).catch((): PriceHistoryResponse => ({ beef: [], pork: [] })),
        ]);
        setFridgeItems(
          fridgeResponse.items.filter((item) => item.status === "stored"),
        );
        setPriceData(pricesRes);
        setPriceHistory(historyRes);
      }
    } catch (error: any) {
      console.error("Failed to load dashboard data:", error);
      toast({
        title: "로딩 실패",
        description: error.message || "데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPriceData = async () => {
    setPriceLoading(true);
    try {
      const partName = getPartName();

      if (partName === undefined) {
        const defaultParts = getDefaultPartsForCategory();
        const beefPromises = defaultParts.beef.map((beefPart) =>
          getDashboardPrices(
            selectedRegion,
            beefPart,
            undefined,
            selectedGrade,
          ).catch(() => ({ beef: [], pork: [] })),
        );
        const porkPromises = defaultParts.pork.map((porkPart) =>
          getDashboardPrices(
            selectedRegion,
            undefined,
            porkPart,
            selectedGrade,
          ).catch(() => ({ beef: [], pork: [] })),
        );
        const results = await Promise.all([...beefPromises, ...porkPromises]);
        const beefResults = results.slice(
          0,
          defaultParts.beef.length,
        ) as DashboardPricesResponse[];
        const porkResults = results.slice(
          defaultParts.beef.length,
        ) as DashboardPricesResponse[];
        setPriceData({
          beef: beefResults.flatMap((r) => r.beef),
          pork: porkResults.flatMap((r) => r.pork),
        });
      } else {
        // 특정 부위 선택 시: 해당 부위만 조회
        const pricesResponse = await getDashboardPrices(
          selectedRegion,
          partName &&
            (partName.startsWith("Beef_") ||
              partName.startsWith("Import_Beef_"))
            ? partName
            : undefined,
          partName &&
            (partName.startsWith("Pork_") ||
              partName.startsWith("Import_Pork_"))
            ? partName
            : undefined,
          selectedGrade,
        );
        setPriceData(pricesResponse);
      }
    } catch (error: any) {
      console.error("Failed to load price data:", error);
      setPriceData({ beef: [], pork: [] });
      toast({
        title: "가격 조회 실패",
        description: error.message || "가격 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setPriceLoading(false);
    }
  };

  const loadPriceHistory = async () => {
    setHistoryLoading(true);
    try {
      const partName = getPartName();

      if (partName === undefined) {
        const defaultParts = getDefaultPartsForCategory();
        const beefPromises = defaultParts.beef.map((beefPart) =>
          getDashboardPriceHistory(
            selectedRegion,
            beefPart,
            undefined,
            selectedGrade,
            6,
          ).catch(() => ({ beef: [], pork: [] })),
        );
        const porkPromises = defaultParts.pork.map((porkPart) =>
          getDashboardPriceHistory(
            selectedRegion,
            undefined,
            porkPart,
            selectedGrade,
            6,
          ).catch(() => ({ beef: [], pork: [] })),
        );
        const results = await Promise.all([...beefPromises, ...porkPromises]);
        const beefResults = results.slice(
          0,
          defaultParts.beef.length,
        ) as PriceHistoryResponse[];
        const porkResults = results.slice(
          defaultParts.beef.length,
        ) as PriceHistoryResponse[];
        const res = {
          beef: beefResults.flatMap((r) => r.beef),
          pork: porkResults.flatMap((r) => r.pork),
        };
        setPriceHistory(res);
      } else {
        // 특정 부위 선택 시: 해당 부위만 조회
        const res = await getDashboardPriceHistory(
          selectedRegion,
          partName &&
            (partName.startsWith("Beef_") ||
              partName.startsWith("Import_Beef_"))
            ? partName
            : undefined,
          partName &&
            (partName.startsWith("Pork_") ||
              partName.startsWith("Import_Pork_"))
            ? partName
            : undefined,
          selectedGrade,
          6, // 최근 6주
        );
        console.log("가격 이력 조회 응답:", res);
        console.log("주별 가격 이력 로드 성공:", {
          beef: res.beef.length,
          pork: res.pork.length,
          beefData: res.beef,
          porkData: res.pork,
        });
        setPriceHistory(res);
      }
    } catch (error: any) {
      console.error("Failed to load price history:", error);
      console.error("에러 상세:", {
        message: error.message,
        stack: error.stack,
        region: selectedRegion,
        category: selectedCategory,
        part: selectedPart,
        grade: selectedGrade,
      });
      setPriceHistory({ beef: [], pork: [] });
      toast({
        title: "주별 가격 이력 조회 실패",
        description:
          error.message || "주별 가격 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  // 희망 섭취기간이 있으면 그 기준, 없으면 유통기한 기준 D-day
  const getDDay = (dateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  };

  const getEffectiveDDay = (item: FridgeItemResponse): number => {
    return item.desiredConsumptionDate
      ? getDDay(item.desiredConsumptionDate)
      : item.dDay;
  };

  // Sort fridge items by effective D-day (희망 섭취기간 우선, 없으면 유통기한)
  const sortedFridgeItems = [...fridgeItems].sort(
    (a, b) => getEffectiveDDay(a) - getEffectiveDDay(b),
  );

  // Prepare chart data for meat parts distribution
  const meatPartsData = fridgeItems.reduce(
    (acc, item) => {
      const part = item.name;
      acc[part] = (acc[part] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const pieData = Object.entries(meatPartsData).map(([name, value]) => ({
    name: getPartDisplayName(name),
    value,
  }));

  const COLORS = [
    "#800000",
    "#A52A2A",
    "#CD5C5C",
    "#DC143C",
    "#B22222",
    "#8B0000",
  ];

  // 부위별 분포 차트 호버 상태
  const [activePieIndex, setActivePieIndex] = useState<number | undefined>(
    undefined,
  );

  // 그래프 선 호버 상태
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);

  // 파이 차트 호버 시 확대 렌더링 (조각만 확대, 텍스트는 Tooltip으로)
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
      props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 3}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{
            filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.25))",
            transition: "all 0.2s ease",
          }}
        />
      </g>
    );
  };

  // 파이 차트 커스텀 툴팁
  const PieCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div
          style={{
            background: "#fff",
            border: `2px solid ${data.payload.fill || "#800020"}`,
            borderRadius: 12,
            padding: "10px 16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            minWidth: 120,
          }}
        >
          <p
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: 14,
              color: "#1a1a1a",
            }}
          >
            {data.name}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: data.payload.fill || "#800020",
              fontWeight: 600,
            }}
          >
            {data.value}개 (
            {(
              (data.payload.percent ||
                data.value /
                  pieData.reduce((s: number, e: any) => s + e.value, 0)) * 100
            ).toFixed(0)}
            %)
          </p>
        </div>
      );
    }
    return null;
  };

  // 주별 가격 변동 차트 데이터 (카테고리 가격 아래 그래프용)
  const priceChartData = (() => {
    // 백엔드에서 이미 날짜 순서대로 정렬되어 있으므로, 순서를 유지하면서 주 목록 추출
    const allWeeksMap = new Map<string, number>(); // week -> 최초 등장 순서
    let order = 0;

    // 소고기와 돼지고기 데이터를 순서대로 순회하면서 주 목록 생성
    [...priceHistory.beef, ...priceHistory.pork].forEach((p) => {
      if (!allWeeksMap.has(p.week)) {
        allWeeksMap.set(p.week, order++);
      }
    });

    // 등장 순서대로 정렬 (백엔드에서 이미 정렬되어 있음)
    const weeksSorted = Array.from(allWeeksMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([week]) => week);

    return weeksSorted.map((week) => {
      const row: Record<string, string | number> = { week };
      priceHistory.beef
        .filter((p) => p.week === week)
        .forEach((p) => (row[p.partName] = p.price));
      priceHistory.pork
        .filter((p) => p.week === week)
        .forEach((p) => (row[p.partName] = p.price));
      return row;
    });
  })();
  const priceChartParts = [
    ...new Set([
      ...priceHistory.beef.map((p) => p.partName),
      ...priceHistory.pork.map((p) => p.partName),
    ]),
  ];
  // 주별 가격 차트 Y축: 데이터 범위에 맞춰 변동이 잘 보이도록 domain 계산 (0 고정 X)
  const priceChartYDomain = (() => {
    if (priceChartData.length === 0 || priceChartParts.length === 0)
      return undefined;
    let dataMin = Infinity;
    let dataMax = -Infinity;
    for (const row of priceChartData) {
      for (const key of priceChartParts) {
        const v = row[key];
        if (typeof v === "number" && !Number.isNaN(v)) {
          dataMin = Math.min(dataMin, v);
          dataMax = Math.max(dataMax, v);
        }
      }
    }
    if (dataMin === Infinity || dataMax === -Infinity) return undefined;
    const span = dataMax - dataMin;
    const padding = span > 0 ? Math.max(span * 0.1, 200) : 500;
    const yMin = Math.max(0, Math.floor((dataMin - padding) / 500) * 500);
    const yMax = Math.ceil((dataMax + padding) / 500) * 500;
    return [yMin, yMax] as [number, number];
  })();
  // 부위별 고유 색상 맵 (유사색 방지)
  const PART_COLORS: Record<string, string> = {
    // 소고기: 붉은 계열
    Beef_Tenderloin: "#8B0000", // 다크레드
    Beef_Ribeye: "#C41E3A", // 카디널
    Beef_Round: "#E25822", // 오렌지레드
    Beef_Brisket: "#B22222", // 파이어브릭
    Beef_Rib: "#A0522D", // 시에나
    Beef_Sirloin: "#D2691E", // 초콜릿
    Beef_Chuck: "#CC5500", // 번트오렌지
    Beef_Shank: "#800000", // 마룬
    Beef_Shoulder: "#DC143C", // 크림슨
    // 돼지고기: 확실히 구분되는 다른 계열
    Pork_PicnicShoulder: "#2E86C1", // 파랑 (앞다리)
    Pork_Belly: "#E74C3C", // 빨강 (삼겹살)
    Pork_Ribs: "#27AE60", // 초록 (갈비)
    Pork_Neck: "#8E44AD", // 보라 (목심)
    Pork_Tenderloin: "#F39C12", // 주황
    Pork_Loin: "#1ABC9C", // 청록
    Pork_Ham: "#D35400", // 호박
    // 수입
    Import_Beef_Rib_AU: "#6C3483",
    Import_Beef_Ribeye_AU: "#2874A6",
    Import_Pork_Belly: "#CB4335",
  };
  const CHART_COLORS_FALLBACK = [
    "#800000",
    "#2E86C1",
    "#E74C3C",
    "#27AE60",
    "#8E44AD",
    "#F39C12",
  ];
  const getChartColor = (partName: string, idx: number) =>
    PART_COLORS[partName] ||
    CHART_COLORS_FALLBACK[idx % CHART_COLORS_FALLBACK.length];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 가격 데이터의 날짜 정보 추출 (가장 최근 날짜만 표시)
  const getPriceDateInfo = () => {
    const allDates = [
      ...priceData.beef.map((p) => p.priceDate).filter(Boolean),
      ...priceData.pork.map((p) => p.priceDate).filter(Boolean),
    ];
    if (allDates.length === 0) return null;

    // 가장 최근 날짜 찾기
    const sortedDates = allDates
      .map((d) => {
        try {
          return new Date(d!);
        } catch {
          return null;
        }
      })
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime()); // 내림차순 정렬

    if (sortedDates.length === 0) return null;

    const latestDate = sortedDates[0];

    // 가장 최근 날짜 표시
    return latestDate.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const priceDateInfo = getPriceDateInfo();

  // 부류별 품목(품종) 옵션 정의
  const categoryOptions: Record<string, { value: string; label: string }[]> = {
    소: [
      { value: "전체", label: "전체" },
      { value: "Beef_Tenderloin", label: "안심" },
      { value: "Beef_Ribeye", label: "등심" },
      { value: "Beef_Round", label: "우둔" },
      { value: "Beef_Brisket", label: "양지" },
      { value: "Beef_Rib", label: "갈비" },
    ],
    돼지: [
      { value: "전체", label: "전체" },
      { value: "Pork_PicnicShoulder", label: "앞다리" },
      { value: "Pork_Belly", label: "삼겹살" },
      { value: "Pork_Ribs", label: "갈비" },
      { value: "Pork_Neck", label: "목심" },
    ],
    "수입 소고기": [
      { value: "전체", label: "전체" },
      { value: "Import_Beef_Rib_AU", label: "갈비 - 호주산" },
      { value: "Import_Beef_Ribeye_AU", label: "갈비살 - 호주산" },
    ],
    "수입 돼지고기": [{ value: "Import_Pork_Belly", label: "삼겹살" }],
  };

  // 부류별 등급 옵션 정의
  const gradeOptions: Record<string, { value: string; label: string }[]> = {
    소: [
      { value: "00", label: "전체" },
      { value: "01", label: "1++등급" },
      { value: "02", label: "1+등급" },
      { value: "03", label: "1등급" },
    ],
    돼지: [{ value: "00", label: "전체" }],
    "수입 소고기": [
      { value: "00", label: "전체" },
      { value: "82", label: "호주산" },
    ],
    "수입 돼지고기": [{ value: "00", label: "전체" }],
  };

  // 지역 옵션 정의 (apis.py의 REGION_CODE_MAP과 동일)
  const regionOptions = [
    { value: "전국", label: "전국" },
    { value: "서울", label: "서울" },
    { value: "부산", label: "부산" },
    { value: "대구", label: "대구" },
    { value: "인천", label: "인천" },
    { value: "광주", label: "광주" },
    { value: "대전", label: "대전" },
    { value: "울산", label: "울산" },
    { value: "세종", label: "세종" },
    { value: "수원", label: "수원" },
    { value: "성남", label: "성남" },
    { value: "의정부", label: "의정부" },
    { value: "용인", label: "용인" },
    { value: "고양", label: "고양" },
    { value: "춘천", label: "춘천" },
    { value: "강릉", label: "강릉" },
    { value: "청주", label: "청주" },
    { value: "천안", label: "천안" },
    { value: "전주", label: "전주" },
    { value: "군산", label: "군산" },
    { value: "순천", label: "순천" },
    { value: "목포", label: "목포" },
    { value: "포항", label: "포항" },
    { value: "안동", label: "안동" },
    { value: "창원", label: "창원" },
    { value: "마산", label: "마산" },
    { value: "김해", label: "김해" },
    { value: "제주", label: "제주" },
    { value: "온라인", label: "온라인" },
  ];

  // 현재 부류에 맞는 품목 옵션
  const currentPartOptions = categoryOptions[selectedCategory] || [];
  // 현재 부류에 맞는 등급 옵션
  const currentGradeOptions = gradeOptions[selectedCategory] || [];

  // 등급/원산지 라벨 결정 (수입 소고기는 "원산지", 나머지는 "등급")
  const getGradeLabel = () => {
    if (selectedCategory === "수입 소고기") {
      return "원산지";
    }
    return "등급";
  };

  // 등급 Select가 비활성화되어야 하는지 확인
  const isGradeDisabled = () => {
    return (
      priceLoading ||
      historyLoading ||
      selectedCategory === "돼지" ||
      selectedCategory === "수입 돼지고기"
      // 수입 소고기는 원산지 선택이 가능하므로 비활성화하지 않음
    );
  };

  // 수입 소고기/수입 돼지고기 선택 시 등급/원산지 카테고리 숨기기
  const shouldHideGradeCategory = () => {
    return (
      selectedCategory === "수입 소고기" || selectedCategory === "수입 돼지고기"
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* 왼쪽: 실시간 가격정보 + 그래프 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <Card className="bg-gradient-to-br from-card via-card/95 to-card border-primary/30 shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
          <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-xl sm:text-2xl font-bold text-primary mb-2">
                  <div className="p-1.5 sm:p-2 rounded-xl bg-primary/10 flex-shrink-0">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="truncate">실시간 시세 (100g당)</span>
                </CardTitle>
                <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                  <CardDescription className="text-xs sm:text-sm font-medium">
                    KAMIS 기준 소매가격
                  </CardDescription>
                  {priceDateInfo && (
                    <Badge
                      variant="outline"
                      className="text-[10px] sm:text-xs border-primary/30 text-primary bg-primary/5 whitespace-nowrap"
                    >
                      {priceDateInfo}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
            {/* 카테고리바 - 트렌디한 디자인 */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 ${shouldHideGradeCategory() ? "xl:grid-cols-4" : "xl:grid-cols-5"} gap-4 sm:gap-5 p-4 sm:p-5 bg-gradient-to-br from-primary/8 via-primary/5 to-primary/8 rounded-2xl border-2 border-primary/20 shadow-lg backdrop-blur-sm`}
            >
              {/* 지역 선택 */}
              <div className="space-y-2 min-w-0 overflow-hidden">
                <label className="text-xs sm:text-sm font-bold text-foreground/90 flex items-center gap-1.5 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0"></span>
                  <span className="truncate">지역</span>
                </label>
                <Select
                  value={selectedRegion}
                  onValueChange={setSelectedRegion}
                  disabled={priceLoading || historyLoading}
                >
                  <SelectTrigger className="h-12 sm:h-11 text-sm sm:text-base bg-background/90 border-primary/30 hover:border-primary/50 transition-all shadow-sm hover:shadow-md w-full">
                    <SelectValue placeholder="지역 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {regionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 부류 선택 (품목) */}
              <div className="space-y-2 min-w-0 overflow-hidden">
                <label className="text-xs sm:text-sm font-bold text-foreground/90 flex items-center gap-1.5 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0"></span>
                  <span className="truncate">품목</span>
                </label>
                <Select
                  value={selectedCategory}
                  onValueChange={handleCategoryChange}
                  disabled={priceLoading || historyLoading}
                >
                  <SelectTrigger className="h-12 sm:h-11 text-sm sm:text-base bg-background/90 border-primary/30 hover:border-primary/50 transition-all shadow-sm hover:shadow-md w-full">
                    <SelectValue placeholder="품목 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="소">소</SelectItem>
                    <SelectItem value="돼지">돼지</SelectItem>
                    <SelectItem value="수입 소고기">수입 소고기</SelectItem>
                    <SelectItem value="수입 돼지고기">수입 돼지고기</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 품종 선택 */}
              <div className="space-y-2 min-w-0 overflow-hidden">
                <label className="text-xs sm:text-sm font-bold text-foreground/90 flex items-center gap-1.5 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0"></span>
                  <span className="truncate">품종</span>
                </label>
                <Select
                  value={selectedPart}
                  onValueChange={handlePartChange}
                  disabled={priceLoading || historyLoading}
                >
                  <SelectTrigger className="h-12 sm:h-11 text-sm sm:text-base bg-background/90 border-primary/30 hover:border-primary/50 transition-all shadow-sm hover:shadow-md w-full">
                    <SelectValue placeholder="품종 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentPartOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 등급/원산지 선택 - 수입 소고기/수입 돼지고기 선택 시 숨김 */}
              {!shouldHideGradeCategory() && (
                <div className="space-y-2 min-w-0 overflow-hidden">
                  <label className="text-xs sm:text-sm font-bold text-foreground/90 flex items-center gap-1.5 uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0"></span>
                    <span className="truncate">{getGradeLabel()}</span>
                  </label>
                  <Select
                    value={selectedGrade}
                    onValueChange={(value) => {
                      console.log("등급 변경:", value);
                      setSelectedGrade(value);
                    }}
                    disabled={isGradeDisabled()}
                  >
                    <SelectTrigger className="h-12 sm:h-11 text-sm sm:text-base bg-background/90 border-primary/30 hover:border-primary/50 transition-all shadow-sm hover:shadow-md w-full">
                      <SelectValue placeholder={getGradeLabel() + " 선택"} />
                    </SelectTrigger>
                    <SelectContent>
                      {currentGradeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 조회 버튼 */}
              <div className="flex items-end min-w-0 overflow-hidden">
                <Button
                  onClick={handleSearch}
                  disabled={priceLoading || historyLoading}
                  className="w-full h-12 sm:h-11 text-xs sm:text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {priceLoading || historyLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2"></div>
                      조회 중...
                    </>
                  ) : (
                    "조회"
                  )}
                </Button>
              </div>
            </div>

            {/* 가격 정보 표시 - 트렌디한 디자인 */}
            {priceLoading || priceInitialLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-red-50/40 to-red-100/20 border border-red-200/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-200/50"></div>
                    <div className="h-5 w-20 rounded bg-red-200/50"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-background/60 border border-red-200/20"
                      >
                        <div className="h-4 w-24 rounded bg-muted/60 mb-2"></div>
                        <div className="h-5 w-20 rounded bg-muted/40"></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center py-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    시세 정보를 불러오는 중...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 소고기 섹션 */}
                {(selectedPart === "전체" ||
                  selectedPart.startsWith("Beef_") ||
                  selectedPart.startsWith("Import_Beef_")) && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-6 rounded-2xl bg-gradient-to-br from-red-50/80 via-red-50/60 to-red-100/40 border-2 border-red-200/70 shadow-xl backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-red-200/50">
                      <h4 className="text-lg font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-red-500/20">
                          <Beef className="w-5 h-5 text-red-600" />
                        </div>
                        소고기
                      </h4>
                    </div>
                    {priceData.beef.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {priceData.beef.map((p) => (
                          <motion.div
                            key={p.partName}
                            whileHover={{ scale: 1.02, y: -2 }}
                            className="flex flex-col p-3 sm:p-4 rounded-xl bg-background/80 hover:bg-background shadow-md hover:shadow-lg transition-all border border-red-200/30 gap-2"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm sm:text-base font-bold text-foreground block mb-1 break-words">
                                  {p.partName}
                                </span>
                                {p.priceDate && (
                                  <span className="text-xs sm:text-[10px] text-muted-foreground">
                                    {new Date(p.priceDate).toLocaleDateString(
                                      "ko-KR",
                                      {
                                        month: "short",
                                        day: "numeric",
                                      },
                                    )}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 sm:ml-4 flex-shrink-0">
                                <span className="text-base sm:text-lg font-extrabold text-red-600 tracking-tight whitespace-nowrap">
                                  {p.currentPrice.toLocaleString()}원
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs font-semibold border-red-300/50 text-red-700 bg-red-50/50 px-2 py-1 whitespace-nowrap"
                                >
                                  {p.unit}
                                </Badge>
                              </div>
                            </div>
                            {/* 등급별 가격 표시 (전체 선택 시) */}
                            {p.gradePrices && p.gradePrices.length > 1 && (
                              <div className="mt-1 pt-2 border-t border-red-100/50">
                                <div className="grid grid-cols-3 gap-1.5">
                                  {p.gradePrices.map((gp) => (
                                    <div
                                      key={gp.grade}
                                      className="flex flex-col items-center p-1.5 rounded-lg bg-red-50/50 border border-red-100/40"
                                    >
                                      <span className="text-[10px] text-muted-foreground font-medium">
                                        {gp.grade}
                                      </span>
                                      <span className="text-xs font-bold text-red-600">
                                        {gp.price.toLocaleString()}원
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Beef className="w-16 h-16 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">
                          소고기 가격 정보가 없습니다
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 돼지고기 섹션 */}
                {(selectedPart === "전체" ||
                  selectedPart.startsWith("Pork_") ||
                  selectedPart.startsWith("Import_Pork_")) && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 rounded-2xl bg-gradient-to-br from-pink-50/80 via-pink-50/60 to-pink-100/40 border-2 border-pink-200/70 shadow-xl backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-pink-200/50">
                      <h4 className="text-lg font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-pink-500/20">
                          <Ham className="w-5 h-5 text-pink-600" />
                        </div>
                        돼지고기
                      </h4>
                    </div>
                    {priceData.pork.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {priceData.pork.map((p) => (
                          <motion.div
                            key={p.partName}
                            whileHover={{ scale: 1.02, y: -2 }}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-xl bg-background/80 hover:bg-background shadow-md hover:shadow-lg transition-all border border-pink-200/30 gap-2 sm:gap-0"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-sm sm:text-base font-bold text-foreground block mb-1 break-words">
                                {p.partName}
                              </span>
                              {p.priceDate && (
                                <span className="text-xs sm:text-[10px] text-muted-foreground">
                                  {new Date(p.priceDate).toLocaleDateString(
                                    "ko-KR",
                                    {
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 sm:ml-4 flex-shrink-0">
                              <span className="text-base sm:text-lg font-extrabold text-pink-600 tracking-tight whitespace-nowrap">
                                {p.currentPrice.toLocaleString()}원
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs font-semibold border-pink-300/50 text-pink-700 bg-pink-50/50 px-2 py-1 whitespace-nowrap"
                              >
                                {p.unit}
                              </Badge>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Ham className="w-16 h-16 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">
                          돼지고기 가격 정보가 없습니다
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 주별 가격 변동 그래프 */}
                <div className="mt-8 pt-6 border-t-2 border-border/50 relative z-0">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      주별 가격 변동
                    </h4>
                    <div className="flex items-center gap-2">
                      {monthlyApiConnected === true && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-500/15 text-green-700 border-green-500/40 font-semibold px-2 py-1"
                        >
                          ✓ KAMIS 연동됨
                        </Badge>
                      )}
                      {monthlyApiConnected === false && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-amber-500/15 text-amber-700 border-amber-500/40 font-semibold px-2 py-1"
                        >
                          ⚠ API 미연결
                        </Badge>
                      )}
                    </div>
                  </div>
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent"></div>
                    </div>
                  ) : priceChartData.length === 0 ? (
                    <div className="text-center py-12 bg-muted/30 rounded-xl">
                      <p className="text-sm text-muted-foreground mb-2">
                        주별 가격 데이터가 없습니다.
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {priceHistory.beef.length === 0 &&
                        priceHistory.pork.length === 0
                          ? "선택한 조건에 해당하는 데이터가 없거나 API 연결에 문제가 있을 수 있습니다."
                          : `소고기: ${priceHistory.beef.length}개, 돼지고기: ${priceHistory.pork.length}개 데이터`}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-background/50 rounded-xl p-2 sm:p-4 border border-border/50 overflow-x-auto">
                      <ResponsiveContainer
                        width="100%"
                        height={250}
                        className="min-h-[250px]"
                      >
                        <LineChart
                          data={priceChartData}
                          margin={{ top: 12, right: 12, left: 12, bottom: 12 }}
                          onMouseLeave={() => setActiveLineIndex(null)}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#E8E4DD"
                            opacity={0.5}
                          />
                          <XAxis
                            dataKey="week"
                            stroke="#6B6B6B"
                            style={{ fontSize: "12px", fontWeight: 500 }}
                            tickFormatter={(v) =>
                              typeof v === "string" ? v : String(v)
                            }
                          />
                          <YAxis
                            stroke="#6B6B6B"
                            style={{ fontSize: "12px", fontWeight: 500 }}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                            domain={priceChartYDomain ?? undefined}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#FAF9F6",
                              border: "2px solid #E8E4DD",
                              borderRadius: "12px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                            labelFormatter={(v) =>
                              typeof v === "string" ? v : String(v)
                            }
                            formatter={(value: number) => [
                              `${Number(value).toLocaleString()}원`,
                              "",
                            ]}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: "12px", fontWeight: 500 }}
                            onMouseEnter={(e: any) => {
                              const idx = priceChartParts.indexOf(e.dataKey);
                              if (idx !== -1) setActiveLineIndex(idx);
                            }}
                            onMouseLeave={() => setActiveLineIndex(null)}
                          />
                          {priceChartParts.map((partName, idx) => (
                            <Line
                              key={partName}
                              type="monotone"
                              dataKey={partName}
                              name={partName}
                              stroke={getChartColor(partName, idx)}
                              strokeWidth={activeLineIndex === idx ? 3.5 : 2}
                              strokeOpacity={
                                activeLineIndex === null
                                  ? 0.45
                                  : activeLineIndex === idx
                                    ? 1
                                    : 0.15
                              }
                              dot={{
                                fill: getChartColor(partName, idx),
                                r: activeLineIndex === idx ? 5 : 3,
                                fillOpacity:
                                  activeLineIndex === null
                                    ? 0.5
                                    : activeLineIndex === idx
                                      ? 1
                                      : 0.15,
                                strokeOpacity: 0,
                              }}
                              activeDot={{
                                r: 7,
                                strokeWidth: 2,
                                stroke: getChartColor(partName, idx),
                                fill: "#fff",
                                style: {
                                  filter:
                                    "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
                                },
                              }}
                              style={{
                                transition: "all 0.3s ease",
                                cursor: "pointer",
                                pointerEvents: "stroke",
                                strokeLinejoin: "round" as const,
                              }}
                              strokeLinecap="round"
                              onMouseEnter={() => setActiveLineIndex(idx)}
                              onMouseLeave={() => setActiveLineIndex(null)}
                              connectNulls
                              // 넓은 hover 영역을 위해 투명 배경 stroke 추가
                              legendType="line"
                            />
                          ))}
                          {/* 투명한 넓은 stroke로 hover 영역 확대 */}
                          {priceChartParts.map((partName, idx) => (
                            <Line
                              key={`hover-${partName}`}
                              type="monotone"
                              dataKey={partName}
                              name={partName}
                              stroke="transparent"
                              strokeWidth={16}
                              dot={false}
                              activeDot={false}
                              legendType="none"
                              tooltipType="none"
                              style={{
                                pointerEvents: "stroke",
                                cursor: "pointer",
                              }}
                              onMouseEnter={() => setActiveLineIndex(idx)}
                              onMouseLeave={() => setActiveLineIndex(null)}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 오른쪽: 냉장고 정보 (부위별 분포 + 냉장고 보관 현황) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="space-y-6"
      >
        {/* 부위별 분포 */}
        <Card className="bg-gradient-to-br from-card to-card/95 border-primary/30 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-primary">
              <div className="p-2 rounded-xl bg-primary/10">
                <Beef className="w-5 h-5" />
              </div>
              부위별 분포
            </CardTitle>
            <CardDescription className="font-medium">
              냉장고 고기 부위 비율
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Beef className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">데이터가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={75}
                      innerRadius={30}
                      fill="#8884d8"
                      dataKey="value"
                      activeIndex={activePieIndex}
                      activeShape={renderActiveShape}
                      onMouseEnter={(_, index) => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(undefined)}
                      label={({
                        cx,
                        cy,
                        midAngle,
                        outerRadius,
                        percent,
                        name,
                      }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 28;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text
                            x={x}
                            y={y}
                            textAnchor={x > cx ? "start" : "end"}
                            dominantBaseline="central"
                            fontSize={11}
                            fontWeight={600}
                            fill="#2D2D2D"
                          >
                            {`${name} ${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieCustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 pt-2 border-t border-border/50">
                  {pieData.map((entry, index) => (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="font-medium text-foreground">
                          {entry.name}
                        </span>
                      </div>
                      <span className="font-bold text-primary">
                        {entry.value}개
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 냉장고 보관 현황 */}
        <Card className="bg-gradient-to-br from-card to-card/95 border-primary/30 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-primary">
              <div className="p-2 rounded-xl bg-primary/10">
                <Snowflake className="w-5 h-5" />
              </div>
              냉장고 보관 현황
            </CardTitle>
            <CardDescription className="font-medium">
              유통기한 임박순
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedFridgeItems.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Snowflake className="w-20 h-20 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-bold mb-2 text-foreground">
                    보관 중인 고기가 없습니다
                  </h3>
                  <p className="text-sm mb-6">
                    고기를 분석하고 냉장고에 추가해보세요!
                  </p>
                  <Button
                    onClick={() => onNavigate("analysis")}
                    className="bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    고기 분석하기 →
                  </Button>
                </motion.div>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedFridgeItems.slice(0, 8).map((item, index) => {
                  const daysLeft = getEffectiveDDay(item);
                  const color =
                    daysLeft <= 1 ? "red" : daysLeft <= 3 ? "yellow" : "green";
                  const colorClasses = {
                    red: "border-red-300/60 bg-gradient-to-r from-[#fdf6f0] to-[#faf0ea] shadow-sm",
                    yellow:
                      "border-amber-300/60 bg-gradient-to-r from-[#fdf8f0] to-[#faf5ea] shadow-sm",
                    green:
                      "border-stone-200 bg-gradient-to-r from-[#f8f6f1] to-[#f5f3ee] shadow-sm",
                  };

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      className={`p-4 rounded-xl border overflow-hidden ${colorClasses[color]} transition-all hover:shadow-md cursor-pointer relative`}
                      onClick={() => onNavigate("fridge")}
                    >
                      {/* 버건디 상단 띠 */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#800020] rounded-t-xl" />
                      <div className="flex justify-between items-start mb-2 pt-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-foreground">
                            {getPartDisplayName(item.name)}
                          </h4>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs font-bold px-2 py-1 ${
                            color === "red"
                              ? "border-red-400 text-red-700 bg-red-50"
                              : color === "yellow"
                                ? "border-amber-400 text-amber-700 bg-amber-50"
                                : "border-emerald-400 text-emerald-700 bg-emerald-50"
                          }`}
                        >
                          D{daysLeft >= 0 ? "-" : "+"}
                          {Math.abs(daysLeft)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          유통기한:{" "}
                          {new Date(item.expiryDate).toLocaleDateString(
                            "ko-KR",
                          )}
                        </span>
                        {item.grade && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-primary/30 text-primary"
                          >
                            {item.grade}
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {sortedFridgeItems.length > 8 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onNavigate("fridge")}
                    className="w-full py-3 text-sm font-bold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 rounded-xl transition-all border-2 border-primary/20 hover:border-primary/40"
                  >
                    +{sortedFridgeItems.length - 8}개 더보기 →
                  </motion.button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
