"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { MobileNav } from "@/components/mobile-nav";
import { GuestModeModal } from "@/components/guest-mode-modal";
import { DashboardView } from "@/components/views/dashboard-view";
import { AnalysisView } from "@/components/views/analysis-view";
import { RecipeView } from "@/components/views/recipe-view";
import { FridgeView } from "@/components/views/fridge-view";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { getAuthToken, getIsGuest, getGuestNickname } from "@/lib/api";

export default function MeatAEyeDashboard() {
  const [activeMenu, setActiveMenuState] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("menu") || "dashboard";
    }
    return "dashboard";
  });
  const [guestNickname, setGuestNickname] = useState<string | null>(null);
  const [showEntryGate, setShowEntryGate] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  // activeMenu 변경 시 URL 쿼리 파라미터도 함께 업데이트
  const setActiveMenu = useCallback((menu: string) => {
    setActiveMenuState(menu);
    const url = new URL(window.location.href);
    if (menu === "dashboard") {
      url.searchParams.delete("menu");
    } else {
      url.searchParams.set("menu", menu);
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    setMounted(true);
    const token = getAuthToken();
    const isGuest = getIsGuest();
    const shouldShowGate = !token || isGuest;
    setShowEntryGate(shouldShowGate);
    if (!shouldShowGate) {
      const nickname = getGuestNickname();
      if (nickname) setGuestNickname(nickname);
    } else {
      const nickname = getGuestNickname();
      if (nickname) setGuestNickname(nickname);
    }
  }, []);

  const handleGuestComplete = (nickname: string) => {
    setGuestNickname(nickname);
    setShowEntryGate(false);
    toast({
      title: `환영합니다, ${nickname}님! 🎉`,
      description: "Meat-A-Eye에서 즐거운 시간 보내세요.",
    });
  };

  const handleSaveToFridge = () => {
    toast({
      title: "냉장고에 저장되었습니다! 🥩",
      description: "냉장고 관리 페이지에서 보관 현황을 확인하세요.",
    });
    // 사이드바 최근 분석 결과 새로고침
    setSidebarRefreshKey((prev) => prev + 1);
    // Optionally navigate to fridge
    setTimeout(() => setActiveMenu("fridge"), 1000);
  };

  const renderView = () => {
    const viewVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    };

    switch (activeMenu) {
      case "dashboard":
        return (
          <motion.div
            key="dashboard"
            variants={viewVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <DashboardView onNavigate={setActiveMenu} />
          </motion.div>
        );
      case "analysis":
        return (
          <motion.div
            key="analysis"
            variants={viewVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <AnalysisView
              onSaveToFridge={handleSaveToFridge}
              onBack={() => setActiveMenu("dashboard")}
            />
          </motion.div>
        );
      case "recipe":
        return (
          <motion.div
            key="recipe"
            variants={viewVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <RecipeView />
          </motion.div>
        );
      case "fridge":
        // 게스트 모드 체크
        if (getIsGuest() || !getAuthToken()) {
          return (
            <motion.div
              key="fridge-blocked"
              variants={viewVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <AlertCircle className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">
                    로그인이 필요합니다
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    냉장고 기능은 로그인 후 이용할 수 있습니다.
                  </p>
                </div>
              </div>
            </motion.div>
          );
        }
        return (
          <motion.div
            key="fridge"
            variants={viewVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <FridgeView />
          </motion.div>
        );
      default:
        return (
          <motion.div
            key="dashboard"
            variants={viewVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <DashboardView onNavigate={setActiveMenu} />
          </motion.div>
        );
    }
  };

  // Redirect to login if not authenticated (optional - can be removed if guest mode is allowed)
  // const { isAuthenticated, isLoading } = useAuth()
  // if (!isLoading && !isAuthenticated) {
  //   router.push("/login")
  //   return null
  // }

  if (!mounted) {
    return null; // Prevent hydration issues
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 입장 선택 창: 새로고침/접속 시 게스트면 항상 표시, 로그인 사용자만 생략 */}
      <GuestModeModal
        open={showEntryGate}
        onOpenChange={setShowEntryGate}
        onComplete={handleGuestComplete}
      />

      <div className="flex">
        {/* Desktop Sidebar */}
        <AppSidebar
          activeMenu={activeMenu}
          onMenuChange={setActiveMenu}
          refreshKey={sidebarRefreshKey}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <AppHeader
            activeMenu={activeMenu}
            onMenuChange={setActiveMenu}
            guestNickname={guestNickname || "게스트"}
          />

          {/* Content Area */}
          <main className="flex-1 p-4 pb-20 lg:pb-6 lg:p-6 max-w-7xl mx-auto w-full relative">
            <AnimatePresence mode="wait">{renderView()}</AnimatePresence>
          </main>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
