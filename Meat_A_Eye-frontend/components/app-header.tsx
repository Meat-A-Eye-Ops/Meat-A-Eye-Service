"use client";

import { Beef, Menu, LogOut, User, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

interface AppHeaderProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
  guestNickname?: string;
}

const menuItems = [
  { id: "dashboard", label: "대시보드" },
  { id: "analysis", label: "AI 분석" },
  { id: "fridge", label: "냉장고 관리" },
  { id: "recipe", label: "레시피 탐색" },
];

export function AppHeader({
  activeMenu,
  onMenuChange,
  guestNickname = "게스트",
}: AppHeaderProps) {
  const { isAuthenticated, nickname, mustResetPassword, logout } = useAuth();
  const router = useRouter();
  const displayName = isAuthenticated ? nickname || "사용자" : guestNickname;

  const handleLogout = () => {
    logout();
  };

  const getMenuLabel = (menuId: string) => {
    const menu = menuItems.find((m) => m.id === menuId);
    return menu?.label || "대시보드";
  };

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="flex flex-col">
        <div className="flex items-center justify-between h-14 px-4 relative">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="w-5 h-5" />
                <span className="sr-only">메뉴 열기</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">내비게이션 메뉴</SheetTitle>
              <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                      <Beef className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-foreground">
                        Meat-A-Eye
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        AI 축산물 인식 서비스
                      </p>
                    </div>
                  </div>
                </div>

                {/* Profile */}
                <div className="p-4">
                  <div className="bg-secondary rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {displayName.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {displayName}
                        </p>
                        <Badge
                          variant="secondary"
                          className="text-xs bg-primary/10 text-primary border-0 mt-1"
                        >
                          {isAuthenticated ? "회원" : "게스트"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu */}
                <nav className="flex-1 px-4">
                  <ul className="space-y-1">
                    {menuItems.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => onMenuChange(item.id)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                            activeMenu === item.id
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-secondary"
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo (Mobile) - 클릭시 홈화면 복귀 */}
          <button
            onClick={() => onMenuChange("dashboard")}
            className="lg:hidden flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Beef className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Meat-A-Eye</span>
          </button>

          {/* Desktop Title - 클릭시 홈화면 복귀 */}
          <button
            onClick={() => onMenuChange("dashboard")}
            className="hidden lg:block hover:opacity-80 transition-opacity"
          >
            <h2 className="text-lg font-semibold text-foreground">
              {menuItems.find((m) => m.id === activeMenu)?.label || "대시보드"}
            </h2>
          </button>

          {/* Right side buttons */}
          <div className="flex items-center gap-2">
            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {displayName.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {nickname}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                    <User className="mr-2 h-4 w-4" />
                    대시보드
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/change-password")}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    비밀번호 변경
                    {mustResetPassword && (
                      <span className="ml-auto text-xs text-amber-600 font-medium">
                        필수
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/login")}
                >
                  로그인
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => router.push("/signup")}
                >
                  회원가입
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
