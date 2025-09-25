export interface CollectionSummary {
  id: string;
  name: string;
  path?: string | null;
  color?: string | null;
  icon?: string | null;
}

export interface EditorTab {
  id: string;
  title: string;
  content: string;
  type: string;
  format: string;
  unsaved?: boolean;
  collections?: CollectionSummary[];
}

export interface FileTreeItem {
  id: string;
  name: string;
  type: string;
  format?: string;
  content?: string;
  children?: FileTreeItem[];
  collections?: CollectionSummary[];
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
  toggleImport?: () => void;
}

export interface EditorLayoutProps {
  initialData?: any;
}
