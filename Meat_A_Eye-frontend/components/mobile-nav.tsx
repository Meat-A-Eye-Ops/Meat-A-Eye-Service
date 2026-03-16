"use client"

import { motion } from "framer-motion"
import { LayoutDashboard, ScanLine, BookOpen, Refrigerator } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileNavProps {
  activeMenu: string
  onMenuChange: (menu: string) => void
}

const menuItems = [
  { id: "dashboard", label: "홈", icon: LayoutDashboard },
  { id: "analysis", label: "분석", icon: ScanLine },
  { id: "fridge", label: "냉장고", icon: Refrigerator },
  { id: "recipe", label: "레시피", icon: BookOpen },
]

export function MobileNav({ activeMenu, onMenuChange }: MobileNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 safe-area-inset-bottom shadow-lg">
      <ul className="flex justify-around items-center h-16 px-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeMenu === item.id
          return (
            <li key={item.id} className="flex-1">
              <motion.button
                onClick={() => onMenuChange(item.id)}
                className={cn(
                  "w-full flex flex-col items-center gap-1 py-2 transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                whileTap={{ scale: 0.9 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={cn("w-5 h-5 relative z-10", isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] font-medium relative z-10">{item.label}</span>
              </motion.button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
