import { createContext, useContext } from "react";

interface TabBarContextType {
  setVisible: (visible: boolean) => void;
}

export const TabBarContext = createContext<TabBarContextType>({
  setVisible: () => {},
});

export function useTabBar() {
  return useContext(TabBarContext);
}
