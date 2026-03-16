"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  AlertCircle,
  Calendar,
  Edit2,
  Save,
  X,
  ChefHat,
  Loader2,
  Beef,
  Ham,
  Thermometer,
  Snowflake,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getFridgeItems,
  addFridgeItem,
  deleteFridgeItem,
  updateFridgeItemStatus,
  updateFridgeItem,
  getMeatInfoList,
  getNutritionInfo,
  getTraceabilityByNumber,
  getIsGuest,
  getAuthToken,
} from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { LLMRecipeModal } from "@/components/llm-recipe-modal";
import { useRouter } from "next/navigation";
import type { FridgeItemResponse } from "@/src/types/api";
import { getMeatCardImage } from "@/src/lib/meat-image";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function FridgeView() {
  const router = useRouter();
  const [isGuest, setIsGuest] = useState(false);
  const [fridgeItems, setFridgeItems] = useState<FridgeItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [meatInfoList, setMeatInfoList] = useState<
    Array<{
      id: number;
      name: string;
      displayName?: string | null;
      category: string;
      calories: number | null;
      protein: number | null;
      fat: number | null;
      storageGuide: string | null;
    }>
  >([]);
  const [editForm, setEditForm] = useState<{
    meatInfoId: number | null;
    customName: string;
    desiredConsumptionDate: string;
  }>({ meatInfoId: null, customName: "", desiredConsumptionDate: "" });
  const [nutritionData, setNutritionData] = useState<{
    [itemId: number]: {
      calories: number | null;
      protein: number | null;
      fat: number | null;
      carbohydrate: number | null;
    } | null;
  }>({});
  const [loadingNutrition, setLoadingNutrition] = useState<{
    [itemId: number]: boolean;
  }>({});
  const [newItem, setNewItem] = useState({
    meatId: "",
    storageDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
  });
  const [showFridgeRecipeModal, setShowFridgeRecipeModal] = useState(false);
  const [fridgeRecipeMeatCategory, setFridgeRecipeMeatCategory] = useState<
    "beef" | "pork" | undefined
  >(undefined);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [consumeConfirmId, setConsumeConfirmId] = useState<number | null>(null);
  const [addPreviewNutrition, setAddPreviewNutrition] = useState<{
    calories: number | null;
    protein: number | null;
    fat: number | null;
    carbohydrate: number | null;
  } | null>(null);
  const [addPreviewLoading, setAddPreviewLoading] = useState(false);

  useEffect(() => {
    // 게스트 모드 체크
    const checkGuestMode = () => {
      const token = getAuthToken();
      const guest = getIsGuest();
      if (!token || guest) {
        setIsGuest(true);
        return false;
      }
      setIsGuest(false);
      return true;
    };

    if (!checkGuestMode()) {
      return; // 게스트 모드면 초기화하지 않음
    }

    const initialize = async () => {
      await loadMeatInfoList();
      await loadFridgeItems();
    };
    initialize();
  }, []);

  const loadMeatInfoList = async () => {
    try {
      const list = await getMeatInfoList();
      setMeatInfoList(list);
      return list;
    } catch (error: any) {
      console.error("Failed to load meat info list:", error);
      return [];
    }
  };

  const loadFridgeItems = async () => {
    try {
      const response = await getFridgeItems();
      setFridgeItems(response.items);

      // meatInfoList가 로드되지 않았으면 기다림
      let currentMeatInfoList = meatInfoList;
      if (currentMeatInfoList.length === 0) {
        currentMeatInfoList = (await loadMeatInfoList()) || [];
      }

      // 각 아이템의 영양정보 자동 로드
      for (const item of response.items) {
        // meatInfoId가 없거나 0이면 영양정보 로드하지 않음
        if (!item.meatInfoId || item.meatInfoId === 0) {
          continue;
        }

        let grade: string | null = item.grade || null;
        let partName: string | null = null;

        // 이력번호가 있고 등급이 없으면 이력정보 API 호출 (수입 이력번호만)
        if (item.traceNumber && !grade) {
          // 국내 이력번호인지 확인 (12자리 숫자 또는 L로 시작하는 묶음번호)
          const isDomesticTrace = /^\d{12}$/.test(item.traceNumber);
          const isDomesticBundle = /^L\d+$/.test(item.traceNumber);
          const isDomestic = isDomesticTrace || isDomesticBundle;

          // 수입 이력번호만 API 호출 (국내는 API 호출 안 함)
          if (!isDomestic) {
            try {
              const traceInfo = await getTraceabilityByNumber(
                item.traceNumber,
                "import",
              );
              grade = traceInfo.grade || null;
              partName = traceInfo.partName || null;
            } catch (error) {
              console.error(
                `Failed to load traceability for ${item.traceNumber}:`,
                error,
              );
              // API 호출 실패해도 계속 진행 (부위명만으로 영양정보 찾기)
            }
          } else {
            // 국내 이력번호는 API 호출하지 않음 (등급 정보가 JSON에 없음)
            console.log(`국내 이력번호 ${item.traceNumber}는 API 호출 건너뜀`);
          }
        }

        // 부위명이 없으면 currentMeatInfoList에서 가져오기
        if (!partName) {
          const meatInfo = currentMeatInfoList.find(
            (m) => m.id === item.meatInfoId,
          );
          if (meatInfo) {
            partName = meatInfo.name;
          } else if (item.name && item.name !== "부위 선택") {
            // currentMeatInfoList에 없으면 item.name 사용 (백엔드에서 이미 설정된 경우)
            partName = item.name;
          }
        }

        // 부위명이 있으면 영양정보 로드 (등급이 있으면 등급 포함, 없으면 부위명만)
        if (partName) {
          loadNutritionForItem(item.id, item.meatInfoId, partName, grade);
        }
      }
    } catch (error: any) {
      console.error("Failed to load fridge items:", error);
      toast({
        title: "로딩 실패",
        description:
          error.message || "냉장고 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    // 게스트 모드 체크
    if (getIsGuest() || !getAuthToken()) {
      toast({
        title: "로그인 필요",
        description: "냉장고 기능은 로그인 후 이용할 수 있습니다.",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }

    if (!newItem.meatId || !newItem.expiryDate) {
      const errorMsg = "필수 항목을 모두 입력해주세요.";
      // window.alert 제거 - UI 통합 알림만 사용
      toast({
        title: "입력 오류",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await addFridgeItem({
        meatId: parseInt(newItem.meatId),
        storageDate: newItem.storageDate,
        expiryDate: newItem.expiryDate,
      });

      const successMsg = `냉장고에 고기가 추가되었습니다. (ID: ${result.id})`;
      toast({
        title: "추가 완료",
        description: successMsg,
        duration: 3000,
      });

      // Reload items
      await loadFridgeItems();

      // Reset form
      setNewItem({
        meatId: "",
        storageDate: new Date().toISOString().split("T")[0],
        expiryDate: "",
      });
      setIsAddModalOpen(false);
    } catch (error: any) {
      const errorMsg = error.message || "고기 추가에 실패했습니다.";
      console.error("Failed to add item:", error);
      toast({
        title: "추가 실패",
        description: errorMsg,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleDeleteItem = (id: number) => {
    // 게스트 모드 체크
    if (getIsGuest() || !getAuthToken()) {
      toast({
        title: "로그인 필요",
        description: "냉장고 기능은 로그인 후 이용할 수 있습니다.",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmId === null) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await deleteFridgeItem(id);
      toast({
        title: "삭제 완료",
        description: "고기가 삭제되었습니다.",
        duration: 3000,
      });
      setTimeout(() => {
        setFridgeItems((prev) => prev.filter((item) => item.id !== id));
      }, 100);
    } catch (error: any) {
      const errorMsg = error.message || "고기 삭제에 실패했습니다.";
      console.error("Failed to delete item:", error);
      toast({
        title: "삭제 실패",
        description: errorMsg,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleConsumeItem = (id: number) => {
    // 게스트 모드 체크
    if (getIsGuest() || !getAuthToken()) {
      toast({
        title: "로그인 필요",
        description: "냉장고 기능은 로그인 후 이용할 수 있습니다.",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }
    setConsumeConfirmId(id);
  };

  const handleConfirmConsume = async () => {
    if (consumeConfirmId === null) return;
    const id = consumeConfirmId;
    setConsumeConfirmId(null);
    try {
      await updateFridgeItemStatus(id, "consumed");
      toast({
        title: "소비 완료",
        description: "고기가 소비됨으로 표시되었습니다.",
        duration: 3000,
      });
      await loadFridgeItems();
    } catch (error: any) {
      const errorMsg = error.message || "상태 변경에 실패했습니다.";
      console.error("Failed to update item status:", error);
      toast({
        title: "상태 변경 실패",
        description: errorMsg,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleStartEdit = (item: FridgeItemResponse) => {
    setEditingItemId(item.id);
    setEditForm({
      meatInfoId:
        item.meatInfoId && item.meatInfoId > 0 ? item.meatInfoId : null,
      customName: item.customName ?? "",
      desiredConsumptionDate: item.desiredConsumptionDate
        ? new Date(item.desiredConsumptionDate).toISOString().split("T")[0]
        : "",
    });
    // 기존 부위가 있으면 영양정보는 미리 로드 (표시용)
    if (item.meatInfoId && item.meatInfoId > 0) {
      const meatInfo = meatInfoList.find((m) => m.id === item.meatInfoId);
      if (meatInfo) {
        loadNutritionForItem(
          item.id,
          item.meatInfoId,
          meatInfo.name,
          item.grade || null,
        );
      }
    }
  };

  const loadNutritionForItem = async (
    itemId: number,
    meatInfoId: number,
    partName: string,
    grade: string | null = null,
  ) => {
    setLoadingNutrition((prev) => ({ ...prev, [itemId]: true }));
    try {
      // 등급이 있으면 등급과 함께 호출, 없으면 부위명만으로 호출
      const nutrition = await getNutritionInfo(partName, grade || undefined);
      setNutritionData((prev) => ({
        ...prev,
        [itemId]: nutrition.default || null,
      }));
    } catch (error) {
      console.error("Failed to load nutrition:", error);
      setNutritionData((prev) => ({ ...prev, [itemId]: null }));
    } finally {
      setLoadingNutrition((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditForm({
      meatInfoId: null,
      customName: "",
      desiredConsumptionDate: "",
    });
  };

  const handleSaveEdit = async (id: number) => {
    // 게스트 모드 체크
    if (getIsGuest() || !getAuthToken()) {
      toast({
        title: "로그인 필요",
        description: "냉장고 기능은 로그인 후 이용할 수 있습니다.",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }

    if (
      !editForm.meatInfoId ||
      editForm.meatInfoId === 0 ||
      editForm.meatInfoId === null
    ) {
      toast({
        title: "입력 오류",
        description: "고기 부위를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await updateFridgeItem(id, {
        meatInfoId: editForm.meatInfoId,
        customName: editForm.customName?.trim() || null,
        desiredConsumptionDate: editForm.desiredConsumptionDate || null,
      });
      setFridgeItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                name: res.name,
                meatInfoId: res.meatInfoId,
                customName: res.customName,
                desiredConsumptionDate: res.desiredConsumptionDate,
              }
            : i,
        ),
      );

      // 저장 후 즉시 영양정보 로드
      const meatInfo = meatInfoList.find((m) => m.id === editForm.meatInfoId);
      const currentItem = fridgeItems.find((i) => i.id === id);
      if (meatInfo && currentItem) {
        await loadNutritionForItem(
          id,
          editForm.meatInfoId!,
          meatInfo.name,
          currentItem.grade || null,
        );
      }

      toast({
        title: "수정 완료",
        description: "고기 정보가 수정되었습니다.",
        duration: 3000,
      });
      setEditingItemId(null);
      await loadFridgeItems();
    } catch (error: any) {
      const errorMsg = error.message || "수정에 실패했습니다.";
      console.error("Failed to update item:", error);
      toast({
        title: "수정 실패",
        description: errorMsg,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const getDDay = (expiryDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 희망 섭취기간이 있으면 그 기준, 없으면 유통기한 기준 D-day
  const getEffectiveDDay = (item: FridgeItemResponse): number => {
    return item.desiredConsumptionDate
      ? getDDay(item.desiredConsumptionDate)
      : item.dDay;
  };

  const getDDayColor = (daysLeft: number): "red" | "yellow" | "green" => {
    if (daysLeft <= 1) return "red";
    if (daysLeft <= 3) return "yellow";
    return "green";
  };

  // 게스트 모드일 때 접근 차단
  if (isGuest || (!getAuthToken() && !loading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-card border-primary/20 max-w-md w-full">
          <CardContent className="py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-6"
            >
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2 text-foreground">
                  로그인이 필요합니다
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  냉장고 기능은 로그인 후 이용할 수 있습니다.
                  <br />
                  게스트 모드에서는 냉장고 기능을 사용할 수 없습니다.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => router.push("/login")}
                  className="bg-primary hover:bg-primary/90"
                >
                  로그인하기
                </Button>
                <Button
                  onClick={() => router.push("/signup")}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  회원가입
                </Button>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            냉장고 데이터를 불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - 냉장고 테마 배너 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-2 border-primary/20 p-6 shadow-lg"
      >
        {/* 배경 장식 */}
        <div className="absolute top-3 right-4 opacity-10">
          <Snowflake className="w-24 h-24 text-primary" />
        </div>
        <div className="absolute bottom-2 right-28 opacity-[0.07]">
          <Thermometer className="w-16 h-16 text-primary" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-primary/15 border border-primary/20">
                <Snowflake className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-primary tracking-tight">
                나의 냉장고
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-[52px]">
              보관 중인 고기{" "}
              <span className="font-bold text-primary">
                {fridgeItems.filter((i) => i.status === "stored").length}
              </span>
              개
              {fridgeItems.some(
                (i) => getEffectiveDDay(i) <= 3 && i.status === "stored",
              ) && (
                <span className="ml-2 text-red-600 font-medium">
                  · 유통기한 임박{" "}
                  {
                    fridgeItems.filter(
                      (i) => getEffectiveDDay(i) <= 3 && i.status === "stored",
                    ).length
                  }
                  개
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 ml-[52px] sm:ml-0">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 border-primary text-primary hover:bg-primary/10 font-semibold"
                  >
                    <ChefHat className="w-4 h-4" />
                    <span className="hidden sm:inline">냉장고 기반</span> 레시피
                    추천
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-1.5">
                  <DropdownMenuItem
                    onClick={() => {
                      setFridgeRecipeMeatCategory(undefined);
                      setShowFridgeRecipeModal(true);
                    }}
                    className="gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                  >
                    <ChefHat className="w-4 h-4 text-[#800020]" />
                    <span className="font-medium">전체 (랜덤)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setFridgeRecipeMeatCategory("beef");
                      setShowFridgeRecipeModal(true);
                    }}
                    className="gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                  >
                    <Beef className="w-4 h-4 text-red-700" />
                    <span className="font-medium">소고기로 추천</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setFridgeRecipeMeatCategory("pork");
                      setShowFridgeRecipeModal(true);
                    }}
                    className="gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                  >
                    <Ham className="w-4 h-4 text-pink-600" />
                    <span className="font-medium">돼지고기로 추천</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
            <Dialog
              open={isAddModalOpen}
              onOpenChange={(open) => {
                setIsAddModalOpen(open);
                if (!open) {
                  setNewItem({
                    meatId: "",
                    storageDate: new Date().toISOString().split("T")[0],
                    expiryDate: "",
                  });
                  setAddPreviewNutrition(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button className="bg-primary hover:bg-primary/90 gap-2">
                    <Plus className="w-4 h-4" />
                    추가하기
                  </Button>
                </motion.div>
              </DialogTrigger>
              <DialogContent className="bg-card sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-primary">
                    고기 추가하기
                  </DialogTitle>
                  <DialogDescription>
                    냉장고에 보관할 고기 정보를 입력하세요
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="meatPart">고기 부위 *</Label>
                    <Select
                      value={newItem.meatId}
                      onValueChange={async (value) => {
                        setNewItem({ ...newItem, meatId: value });
                        // 부위 선택 시 영양정보 미리보기
                        if (value) {
                          const selectedMeat = meatInfoList.find(
                            (m) => m.id === parseInt(value),
                          );
                          if (selectedMeat) {
                            setAddPreviewLoading(true);
                            try {
                              const nutrition = await getNutritionInfo(
                                selectedMeat.name,
                              );
                              setAddPreviewNutrition(nutrition.default || null);
                            } catch {
                              setAddPreviewNutrition(null);
                            } finally {
                              setAddPreviewLoading(false);
                            }
                          }
                        } else {
                          setAddPreviewNutrition(null);
                        }
                      }}
                    >
                      <SelectTrigger id="meatPart" className="w-full">
                        <SelectValue placeholder="부위를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {meatInfoList.length > 0 ? (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              소고기
                            </div>
                            {meatInfoList
                              .filter((m) => m.category === "beef")
                              .map((meat) => (
                                <SelectItem
                                  key={meat.id}
                                  value={meat.id.toString()}
                                >
                                  {meat.displayName || meat.name}
                                </SelectItem>
                              ))}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
                              돼지고기
                            </div>
                            {meatInfoList
                              .filter((m) => m.category === "pork")
                              .map((meat) => (
                                <SelectItem
                                  key={meat.id}
                                  value={meat.id.toString()}
                                >
                                  {meat.displayName || meat.name}
                                </SelectItem>
                              ))}
                          </>
                        ) : (
                          <SelectItem value="0" disabled>
                            로딩 중...
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 영양정보 미리보기 */}
                  {addPreviewLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/50">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      영양정보 로딩 중...
                    </div>
                  )}
                  {addPreviewNutrition && !addPreviewLoading && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs font-semibold text-primary mb-2">
                        영양정보 (100g당)
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {addPreviewNutrition.calories !== null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              칼로리
                            </span>
                            <span className="font-medium">
                              {addPreviewNutrition.calories}kcal
                            </span>
                          </div>
                        )}
                        {addPreviewNutrition.protein !== null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              단백질
                            </span>
                            <span className="font-medium">
                              {addPreviewNutrition.protein}g
                            </span>
                          </div>
                        )}
                        {addPreviewNutrition.fat !== null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">지방</span>
                            <span className="font-medium">
                              {addPreviewNutrition.fat}g
                            </span>
                          </div>
                        )}
                        {addPreviewNutrition.carbohydrate !== null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              탄수화물
                            </span>
                            <span className="font-medium">
                              {addPreviewNutrition.carbohydrate}g
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="storageDate">보관일 *</Label>
                      <Input
                        id="storageDate"
                        type="date"
                        value={newItem.storageDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            storageDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">유통기한 *</Label>
                      <Input
                        id="expiryDate"
                        type="date"
                        value={newItem.expiryDate}
                        onChange={(e) =>
                          setNewItem({ ...newItem, expiryDate: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleAddItem}
                    disabled={!newItem.meatId || !newItem.expiryDate}
                    className="w-full bg-primary hover:bg-primary/90 font-semibold"
                  >
                    추가하기
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Items List */}
      {fridgeItems.length === 0 ? (
        <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/15 rounded-2xl shadow-sm">
          <CardContent className="py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                <Snowflake className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                아직 분석한 고기가 없습니다
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                카메라로 고기를 찍어보세요!
                <br />
                AI가 부위를 판별하고 냉장고에 자동으로 저장해드립니다.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => {
                    // 분석 페이지로 이동하는 로직 (부모 컴포넌트에서 처리)
                    window.location.href = "/dashboard?menu=analysis";
                  }}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  고기 분석하기
                </Button>
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  수동으로 추가하기
                </Button>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <AnimatePresence>
            {fridgeItems
              .filter((item) => item.status === "stored")
              .sort((a, b) => getEffectiveDDay(a) - getEffectiveDDay(b))
              .map((item, index) => {
                // 희망 섭취기간이 설정되어 있으면 그 날짜 기준, 아니면 유통기한 기준
                const daysLeft = getEffectiveDDay(item);
                const color = getDDayColor(daysLeft);

                const borderColors = {
                  red: "border-red-300/50",
                  yellow: "border-amber-300/50",
                  green: "border-stone-200",
                };

                const bgColors = {
                  red: "bg-gradient-to-br from-[#fdf6f0] to-[#faf0ea]",
                  yellow: "bg-gradient-to-br from-[#fdf8f0] to-[#faf5ea]",
                  green: "bg-gradient-to-br from-[#f8f6f1] to-[#f5f3ee]",
                };

                const badgeColors = {
                  red: "bg-red-500 text-white shadow-red-200 shadow-sm",
                  yellow: "bg-amber-500 text-white shadow-amber-200 shadow-sm",
                  green:
                    "bg-emerald-500 text-white shadow-emerald-200 shadow-sm",
                };

                // 부위 이미지 URL 계산
                const meatInfo = meatInfoList.find(
                  (m) => m.id === item.meatInfoId,
                );
                const meatPartName = meatInfo?.name ?? null;
                const meatImageUrl = getMeatCardImage(meatPartName);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="relative"
                  >
                    <Card
                      className={`relative overflow-hidden border-2 border-[#800020]/30 ${bgColors[color]} shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col rounded-xl`}
                    >
                      {/* 부위 배경 이미지 */}
                      {meatImageUrl && (
                        <div className="absolute top-8 right-0 w-[55%] sm:w-[50%] aspect-[4/3] z-[1] pointer-events-none select-none">
                          <Image
                            src={meatImageUrl}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 55vw, 200px"
                            className="object-contain drop-shadow-md"
                            draggable={false}
                            priority
                          />
                        </div>
                      )}
                      {/* D-Day 뱃지 - 우측 상단 */}
                      <div className="absolute top-3 right-3 z-10">
                        <Badge
                          className={`${badgeColors[color]} border-0 font-bold text-xs shrink-0 rounded-lg px-2.5 py-1`}
                        >
                          D{daysLeft >= 0 ? "-" : "+"}
                          {Math.abs(daysLeft)}
                        </Badge>
                      </div>
                      <CardHeader className="pb-2 pt-3 px-4 relative z-[2]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {editingItemId === item.id ? (
                              <div className="space-y-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">고기 부위</Label>
                                  <Select
                                    value={
                                      editForm.meatInfoId &&
                                      editForm.meatInfoId > 0
                                        ? editForm.meatInfoId.toString()
                                        : ""
                                    }
                                    onValueChange={async (value) => {
                                      const newMeatInfoId =
                                        value && value !== ""
                                          ? parseInt(value)
                                          : null;
                                      setEditForm({
                                        ...editForm,
                                        meatInfoId: newMeatInfoId,
                                      });
                                      const currentItem = fridgeItems.find(
                                        (i) => i.id === editingItemId,
                                      );
                                      if (
                                        currentItem &&
                                        newMeatInfoId &&
                                        newMeatInfoId > 0
                                      ) {
                                        const meatInfo = meatInfoList.find(
                                          (m) => m.id === newMeatInfoId,
                                        );
                                        if (meatInfo) {
                                          await loadNutritionForItem(
                                            currentItem.id,
                                            newMeatInfoId,
                                            meatInfo.name,
                                            currentItem.grade || null,
                                          );
                                        }
                                      } else {
                                        setNutritionData((prev) => {
                                          const updated = { ...prev };
                                          delete updated[currentItem?.id || 0];
                                          return updated;
                                        });
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="text-base font-semibold">
                                      <SelectValue placeholder="부위 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {meatInfoList.length > 0 ? (
                                        meatInfoList.map((meat) => (
                                          <SelectItem
                                            key={meat.id}
                                            value={meat.id.toString()}
                                          >
                                            {meat.displayName || meat.name} (
                                            {meat.category === "beef"
                                              ? "소"
                                              : "돼지"}
                                            )
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <SelectItem value="0" disabled>
                                          로딩 중...
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            ) : (
                              <>
                                {(() => {
                                  const rawName =
                                    item.meatInfoId && item.meatInfoId > 0
                                      ? (() => {
                                          const meat = meatInfoList.find(
                                            (m) => m.id === item.meatInfoId,
                                          );
                                          return meat
                                            ? meat.displayName || meat.name
                                            : item.name &&
                                                item.name !== "알 수 없음"
                                              ? item.name
                                              : "부위 선택";
                                        })()
                                      : item.name && item.name !== "알 수 없음"
                                        ? item.name
                                        : "부위 선택";
                                  const parts = rawName.includes("/")
                                    ? rawName.split("/")
                                    : [null, rawName];
                                  const category = parts[0];
                                  const partName =
                                    parts.length > 1 ? parts[1] : parts[0];
                                  return (
                                    <div className="flex flex-col gap-0.5">
                                      {category && (
                                        <span className="text-[11px] sm:text-xs font-semibold text-primary/70 uppercase tracking-wider">
                                          {category}
                                        </span>
                                      )}
                                      {item.customName ? (
                                        <>
                                          <CardTitle className="text-base sm:text-lg font-bold text-foreground leading-tight">
                                            {item.customName}
                                          </CardTitle>
                                          <span className="text-xs text-muted-foreground">
                                            {partName}
                                          </span>
                                        </>
                                      ) : (
                                        <CardTitle className="text-base sm:text-lg font-bold text-foreground leading-tight">
                                          {partName}
                                        </CardTitle>
                                      )}
                                    </div>
                                  );
                                })()}
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    보관 중
                                  </span>
                                  {item.grade && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 border-primary/30"
                                    >
                                      {item.grade}
                                    </Badge>
                                  )}
                                </div>
                                {item.traceNumber && (
                                  <p className="text-[10px] font-mono text-muted-foreground/70 mt-1 truncate">
                                    {item.traceNumber}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col pt-0 px-4 pb-4 relative z-[2]">
                        {editingItemId === item.id ? (
                          <>
                            {/* 편집 모드 날짜 정보 */}
                            <div className="space-y-1.5 mb-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  유통기한:{" "}
                                  {new Date(item.expiryDate).toLocaleDateString(
                                    "ko-KR",
                                  )}
                                </span>
                              </div>
                            </div>
                          </>
                        ) : null}

                        {editingItemId === item.id ? (
                          <div className="space-y-3 pt-2 border-t border-border/50">
                            {item.grade && (
                              <div className="text-xs text-muted-foreground">
                                등급: {item.grade} (이력번호에서 자동 설정)
                              </div>
                            )}
                            {loadingNutrition[item.id] ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                영양정보 로딩 중...
                              </div>
                            ) : nutritionData[item.id] ? (
                              <div className="text-xs p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                                <div className="font-semibold text-primary mb-1.5">
                                  영양정보 (100g당)
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  {nutritionData[item.id]?.calories !==
                                    null && (
                                    <div>
                                      칼로리: {nutritionData[item.id]?.calories}
                                      kcal
                                    </div>
                                  )}
                                  {nutritionData[item.id]?.protein !== null && (
                                    <div>
                                      단백질: {nutritionData[item.id]?.protein}g
                                    </div>
                                  )}
                                  {nutritionData[item.id]?.fat !== null && (
                                    <div>
                                      지방: {nutritionData[item.id]?.fat}g
                                    </div>
                                  )}
                                  {nutritionData[item.id]?.carbohydrate !==
                                    null && (
                                    <div>
                                      탄수화물:{" "}
                                      {nutritionData[item.id]?.carbohydrate}g
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : null}
                            <div className="space-y-1">
                              <Label className="text-xs">
                                표시 이름 (선택 사항)
                              </Label>
                              <Input
                                placeholder="예: 우리 집 등심"
                                value={editForm.customName}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    customName: e.target.value,
                                  })
                                }
                                className="text-sm h-9"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">희망 섭취기간</Label>
                              <Input
                                type="date"
                                value={editForm.desiredConsumptionDate}
                                min={new Date().toISOString().split("T")[0]}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    desiredConsumptionDate: e.target.value,
                                  })
                                }
                                className="text-sm h-9"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleSaveEdit(item.id)}
                                size="sm"
                                className="flex-1 bg-primary hover:bg-primary/90 h-8"
                              >
                                <Save className="w-3 h-3 mr-1" />
                                저장
                              </Button>
                              <Button
                                onClick={handleCancelEdit}
                                size="sm"
                                variant="outline"
                                className="flex-1 h-8"
                              >
                                <X className="w-3 h-3 mr-1" />
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col mt-auto space-y-2">
                            {/* 날짜 정보 - 하단 고정 그룹 */}
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  유통기한:{" "}
                                  {new Date(item.expiryDate).toLocaleDateString(
                                    "ko-KR",
                                  )}
                                </span>
                              </div>
                              {item.desiredConsumptionDate && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                                  <span>
                                    희망 섭취기간:{" "}
                                    {new Date(
                                      item.desiredConsumptionDate,
                                    ).toLocaleDateString("ko-KR")}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* 영양정보 간단 요약 */}
                            {nutritionData[item.id] && (
                              <div className="text-[11px] p-2.5 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/15">
                                <div className="font-bold text-primary text-[11px] mb-2 flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-primary"></span>
                                  영양정보 (100g)
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                  {nutritionData[item.id]?.calories !==
                                    null && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">
                                        칼로리
                                      </span>
                                      <span className="font-semibold text-foreground">
                                        {nutritionData[item.id]?.calories}
                                        <span className="text-[9px] font-normal text-muted-foreground">
                                          kcal
                                        </span>
                                      </span>
                                    </div>
                                  )}
                                  {nutritionData[item.id]?.protein !== null && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">
                                        단백질
                                      </span>
                                      <span className="font-semibold text-foreground">
                                        {nutritionData[item.id]?.protein}
                                        <span className="text-[9px] font-normal text-muted-foreground">
                                          g
                                        </span>
                                      </span>
                                    </div>
                                  )}
                                  {nutritionData[item.id]?.fat !== null && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">
                                        지방
                                      </span>
                                      <span className="font-semibold text-foreground">
                                        {nutritionData[item.id]?.fat}
                                        <span className="text-[9px] font-normal text-muted-foreground">
                                          g
                                        </span>
                                      </span>
                                    </div>
                                  )}
                                  {nutritionData[item.id]?.carbohydrate !==
                                    null && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">
                                        탄수화물
                                      </span>
                                      <span className="font-semibold text-foreground">
                                        {nutritionData[item.id]?.carbohydrate}
                                        <span className="text-[9px] font-normal text-muted-foreground">
                                          g
                                        </span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 하단 버튼 영역 */}
                            <div className="flex gap-2 pt-3 border-t border-border/40">
                              <Button
                                onClick={() => handleStartEdit(item)}
                                variant="outline"
                                size="sm"
                                className="border-primary/40 text-primary hover:bg-primary/10 h-8 text-xs px-3 rounded-lg"
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                수정
                              </Button>
                              <Button
                                onClick={() => handleConsumeItem(item.id)}
                                size="sm"
                                className="flex-1 border-2 border-[#800020] text-[#800020] bg-[#800020]/5 hover:bg-[#800020]/15 h-8 text-xs font-semibold rounded-lg"
                              >
                                소비 완료
                              </Button>
                              <Button
                                onClick={() => handleDeleteItem(item.id)}
                                variant="outline"
                                size="sm"
                                className="border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600 h-8 text-xs px-3 rounded-lg"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                삭제
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>
      )}

      {/* Warning Message for Expiring Items */}
      {fridgeItems.some(
        (item) => getEffectiveDDay(item) <= 3 && item.status === "stored",
      ) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200/60 flex items-start gap-3 shadow-sm"
        >
          <div className="p-1.5 rounded-lg bg-red-100">
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-red-900">
              유통기한 임박 알림
            </h4>
            <p className="text-xs text-red-700 mt-0.5">
              유통기한이 3일 이내인 고기가 있습니다. 빠른 시일 내에
              소비해주세요!
            </p>
          </div>
        </motion.div>
      )}

      {/* 냉장고 기반 레시피 추천 모달 */}
      <LLMRecipeModal
        open={showFridgeRecipeModal}
        onOpenChange={setShowFridgeRecipeModal}
        source="fridge_random"
        meatCategory={fridgeRecipeMeatCategory}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary">
              고기 삭제
            </AlertDialogTitle>
            <AlertDialogDescription>
              이 고기를 냉장고에서 삭제하시겠습니까? 삭제된 항목은 복구할 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 소비 완료 확인 다이얼로그 */}
      <AlertDialog
        open={consumeConfirmId !== null}
        onOpenChange={(open) => !open && setConsumeConfirmId(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary">
              소비 완료
            </AlertDialogTitle>
            <AlertDialogDescription>
              이 고기를 소비 완료 처리하시겠습니까? 완료 후 냉장고 목록에서
              제거됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleConfirmConsume}
            >
              소비 완료
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
