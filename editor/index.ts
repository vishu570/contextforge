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
  type: 'prompt' | 'agent' | 'rule' | 'template' | 'snippet' | 'other';
  content: string;
  format: string;
  tags?: string[];
  metadata?: any;
  collections?: CollectionSummary[];
  unsaved?: boolean;
  lastModified?: Date;
}

export interface FileTreeItem {
  id: string;
  name: string;
  type: 'prompt' | 'agent' | 'rule' | 'template' | 'snippet' | 'other';
  format: string;
  content: string;
  updatedAt: Date;
  tags?: string[];
  folderPath?: string;
  metadata?: any;
  collections?: CollectionSummary[];
  isFolder?: boolean;
  children?: FileTreeItem[];
  expanded?: boolean;
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
  switchTab: (tabId: string) => void;
  updateTab: (tabId: string, content: string) => void;
  saveTab: (tabId: string) => Promise<void>;
  createFile: (type: string, parentId?: string) => void;
  renameFile: (fileId: string, newName: string) => void;
  deleteFile: (fileId: string) => void;
  toggleSidebar: () => void;
  togglePreviewPanel: () => void;
  toggleImport?: () => void;
}

export interface EditorLayoutProps {
  initialData?: {
    items: any[];
    tags: any[];
  };
}

export type FileOperation = 'create' | 'rename' | 'delete' | 'move';

export interface FileOperationPayload {
  operation: FileOperation;
  fileId?: string;
  fileName?: string;
  fileType?: string;
  parentId?: string;
  content?: string;
}
