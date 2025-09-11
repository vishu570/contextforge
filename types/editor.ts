export interface EditorTab {
  id: string;
  title: string;
  content: string;
  type: string;
  format: string;
  unsaved?: boolean;
}

export interface FileTreeItem {
  id: string;
  name: string;
  type: string;
  format?: string;
  content?: string;
  children?: FileTreeItem[];
}

export interface EditorState {
  activeTabId: string | null;
  tabs: EditorTab[];
  fileTree: FileTreeItem[];
  sidebarExpanded: boolean;
  previewPanelExpanded: boolean;
}

export interface EditorActions {
  openTab: (item: FileTreeItem) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  saveTab: (tabId: string) => void;
  saveAllTabs: () => void;
  createNewTab: (type: string) => void;
}

export interface EditorLayoutProps {
  initialData?: any;
}