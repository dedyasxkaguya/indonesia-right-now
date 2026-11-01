'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type SidebarGroupsState = {
  berita: boolean;
  analitik: boolean;
  tools: boolean;
  personal: boolean;
};

type SidebarContextType = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  groups: SidebarGroupsState;
  toggleGroup: (group: keyof SidebarGroupsState) => void;
};

const defaultGroups: SidebarGroupsState = {
  berita: true,
  analitik: true,
  tools: true,
  personal: true,
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [groups, setGroupsState] = useState<SidebarGroupsState>(defaultGroups);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedCollapsed = localStorage.getItem('irn:sidebarCollapsed:v1');
      if (storedCollapsed !== null) {
        setCollapsedState(storedCollapsed === 'true');
      }
      const storedGroups = localStorage.getItem('irn:sidebarGroups:v1');
      if (storedGroups) {
        setGroupsState({ ...defaultGroups, ...JSON.parse(storedGroups) });
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const setCollapsed = (val: boolean | ((prev: boolean) => boolean)) => {
    setCollapsedState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      try {
        localStorage.setItem('irn:sidebarCollapsed:v1', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => !prev);
  };

  const toggleGroup = (group: keyof SidebarGroupsState) => {
    setGroupsState((prev) => {
      const next = { ...prev, [group]: !prev[group] };
      try {
        localStorage.setItem('irn:sidebarGroups:v1', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed,
        toggleCollapsed,
        mobileOpen,
        setMobileOpen,
        groups,
        toggleGroup,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
