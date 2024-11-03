import { WebContainer } from '@webcontainer/api';
import { TreeNode } from 'primevue/treenode';
import { FileType } from '../types/fileType';
import { FolderItem } from '../types/fileItem';

export class WebContainerService {
  private static instance: WebContainerService;
  private webContainerInstance: WebContainer | null = null;
  private isBooting: boolean = false;

  private constructor() {}

  public static getInstance(): WebContainerService {
    if (!this.instance) {
      this.instance = new WebContainerService();
    }
    return this.instance;
  }

  private async init() {
    if (this.webContainerInstance) {
      console.log('WebContainer already initialized');
      return this.webContainerInstance;
    }

    if (this.isBooting) {
      console.log('WebContainer is currently booting. Please wait.');
      // Consider returning a promise here if desired
      return new Promise((resolve, reject) => {
        const checkInstance = setInterval(() => {
          if (this.webContainerInstance) {
            clearInterval(checkInstance);
            resolve(this.webContainerInstance);
          }
        }, 100);
      });
    }

    this.isBooting = true;
    console.log('Booting WebContainer...');

    try {
      this.webContainerInstance = await WebContainer.boot();
      console.log('WebContainer successfully booted:', this.webContainerInstance);
    } catch (error) {
      console.error("Failed to boot WebContainer:", error);
      this.isBooting = false;
      throw new Error('WebContainer booting failed: ' + error.message);
    }

    this.isBooting = false;
    return this.webContainerInstance;
  }

  public async ensureInitialized() {
    if (!this.webContainerInstance) {
      console.log('Initializing WebContainer...');
      await this.init();
      if (!this.webContainerInstance) {
        console.error('Failed to initialize WebContainer after init call.');
        throw new Error('Failed to initialize WebContainer.');
      }
    }
  }  

  public async mountFiles(files: Record<string, any>) {
    await this.ensureInitialized();
    await this.webContainerInstance?.mount(files);
  }

  public async readFile(filePath: string) {
    await this.ensureInitialized();
    return await this.webContainerInstance?.fs.readFile(filePath, 'utf-8');
  }

  public async writeFile(filePath: string, content: string) {
    await this.ensureInitialized();
    await this.webContainerInstance?.fs.writeFile(filePath, content);
  }

  public async createFolder(folderPath: string) {
    console.log(folderPath)
    await this.ensureInitialized();
    await this.webContainerInstance?.fs.mkdir(folderPath);
  }

  public async installDependencies() {
    await this.ensureInitialized();
    
    if (!this.webContainerInstance) {
      throw new Error('WebContainer is not initialized.');
    }

    const installProcess = await this.webContainerInstance.spawn('npm', ['install']);
    
    // Wait for the exit code
    const exitCode = await installProcess.exit;

    if (exitCode !== 0) {
      console.error("NPM install process failed with exit code:", exitCode);
      throw new Error('Dependency installation failed');
    }

    return exitCode;
  }

  public async listFiles(directory: string) {
    await this.ensureInitialized();
    return await this.webContainerInstance?.fs.readdir(directory);
  }

  public async fetchFolderStructure(directory: string): Promise<any[]> {
    await this.ensureInitialized();
    const entries = await this.listFiles(directory);

    const structure = await Promise.all((entries ?? []).map(async (entry) => {
      const path = `${directory}/${entry}`;
      const isDirectory = await this.checkIfDirectory(path);
      return {
        name: entry,
        type: isDirectory ? 'folder' : 'file',
        ...(isDirectory ? { children: await this.fetchFolderStructure(path) } : {}),
      };
    }));

    return structure;
  }

  private async checkIfDirectory(path: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      const entries = await this.webContainerInstance?.fs.readdir(path);
      return Array.isArray(entries);
    } catch (error) {
      return false;
    }
  }

  public async fetchFolderStructureInTreeNode(directory: string): Promise<TreeNode[]> {
    const data = await this.fetchFolderStructure(directory);

    return Promise.all(data.map(async folder => {
        // Fetch children only if they exist
        const children = folder.children ? await this.fetchFolderStructureInTreeNode(`${directory}/${folder.name}`) : [];
        
        return {
            key: folder.name,
            label: folder.name,
            icon: folder.type === FileType.FILE ? 'pi pi-file' : 'pi pi-folder',
            data: { name: folder.name, type: folder.type },
            children: children,
        } as TreeNode;
    }));
}

  public async removeItem(item: FolderItem): Promise<TreeNode[]> {
    const folderStructure = await this.fetchFolderStructureInTreeNode('/');
    const removeFromArray = (arr: TreeNode[], itemToRemove: { name: string }): TreeNode[] => {
        const index = arr.findIndex(node => node.data?.name === itemToRemove.name);
        if (index !== -1) {
            arr.splice(index, 1);
            return arr;
        } else {
            arr.forEach(node => {
                if (node.children) {
                    const updatedChildren = removeFromArray(node.children, itemToRemove);
                    if (updatedChildren.length < node.children.length) {
                        node.children = updatedChildren;
                    }
                }
            });
        }
        return arr;
    };

  return removeFromArray(folderStructure, item);
}
}
