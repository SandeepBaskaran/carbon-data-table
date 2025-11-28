// Constants
const VALID_TABLE_KEYS = [
    "6b3a16747da78eca78b72a55c3c8c9d9d36df736", // Default
    "8971618a46bfae02cb460fa7446bc6df70e32bc0", // Select Checkbox
    "d058d046a73cd37e780d2f5fd085a56ae8212c40", // Select Radio
    "b250ea9da364d1f59483649f645398ef53a2c6b4", // Default + Expandable
    "eb0c6fa56e00a94f56d7f6f1cfe9cde4006c5c20", // Select Checkbox + Expandable
    "de1ec34c361bd21d3410591ce73084161da4898f"  // Select Checkbox + Show Batch Actions
];

const CARBON_LIBRARY_URL = "https://www.figma.com/community/file/1157761560874207208/v11-carbon-design-system";

const PAGINATION_KEYS = {
    ADVANCED: "58c0c9e10294103bb74b4bf9e695d64bbce04786",
    SIMPLE: "bdfc84cb36b45371f93f062cc0aba694c622af80",
    UNBOUND: "f67b83d30935ffaa328a7554a218d94c271b210a"
};

const PAGINATION_KEY_TO_TYPE: Record<string, string> = {
    [PAGINATION_KEYS.ADVANCED]: 'advanced',
    [PAGINATION_KEYS.SIMPLE]: 'simple',
    [PAGINATION_KEYS.UNBOUND]: 'unbound'
};

const KEY_TO_CONFIG: Record<string, TableConfig> = {
    "6b3a16747da78eca78b72a55c3c8c9d9d36df736": { variant: 'default', expandable: false, batchActions: false },
    "8971618a46bfae02cb460fa7446bc6df70e32bc0": { variant: 'checkbox', expandable: false, batchActions: false },
    "d058d046a73cd37e780d2f5fd085a56ae8212c40": { variant: 'radio', expandable: false, batchActions: false },
    "b250ea9da364d1f59483649f645398ef53a2c6b4": { variant: 'default', expandable: true, batchActions: false },
    "eb0c6fa56e00a94f56d7f6f1cfe9cde4006c5c20": { variant: 'checkbox', expandable: true, batchActions: false },
    "de1ec34c361bd21d3410591ce73084161da4898f": { variant: 'checkbox', expandable: false, batchActions: true }
};

const SEARCH_LIMITS = {
    TEXT_SEARCH: 100,
    RECURSIVE_FIND: 1000,
    RECURSIVE_FIND_ALL: 2000
};

// Types
interface TableConfig {
    variant: 'default' | 'checkbox' | 'radio';
    expandable: boolean;
    batchActions: boolean;
}

interface PaginationData {
    type: 'advanced' | 'simple' | 'unbound';
    itemsPerPage?: string;
    totalItems?: string;
    totalPages?: string;
    currentPage?: string;
}

interface PluginMessage {
    type: string;
    rows?: number;
    columns?: number;
    cells?: string[][];
    componentKey?: string;
    paginationKey?: string;
    paginationData?: PaginationData;
    config?: TableConfig;
    validTableSelected?: boolean;
    isEnabled?: boolean;
    libraryUrl?: string;
    message?: string;
    anonymousUserId?: string;
    isFirstTimeUser?: boolean;
    width?: number;
    height?: number;
    prompt?: string;
    requestedRows?: number | null;
    requestedCols?: number | null;
    requestId?: string;
}

// State
let isLibraryEnabled = true; // Default to true, check on demand

// Helper function to check if error is an expected permission/library error
function isExpectedError(error: any): boolean {
    if (!error) return false;
    const message = error.message || String(error) || '';
    const errorString = String(error);
    return message.includes('permission') ||
        message.includes('Permission') ||
        message.includes('Access denied') ||
        message.includes('403') ||
        message.includes('library') ||
        message.includes('Library') ||
        errorString.includes('RuntimeError') ||
        errorString.includes('memory access') ||
        errorString.includes('out of bounds');
}

// Safe wrapper for getMainComponentAsync to prevent WebAssembly crashes
async function safeGetMainComponent(instance: InstanceNode): Promise<ComponentNode | null> {
    if (!isLibraryEnabled) {
        return null;
    }

    // Double-wrap to catch WebAssembly errors that might bypass normal catch
    try {
        try {
            return await instance.getMainComponentAsync();
        } catch (innerError: any) {
            // Catch WebAssembly crashes and permission errors
            if (isExpectedError(innerError)) {
                isLibraryEnabled = false;
                figma.ui.postMessage({
                    type: "library-status",
                    isEnabled: false,
                    libraryUrl: CARBON_LIBRARY_URL
                });
                return null;
            }
            // Re-throw unexpected errors
            throw innerError;
        }
    } catch (outerError: any) {
        // Catch any errors that bypassed the inner catch (including WebAssembly crashes)
        if (isExpectedError(outerError)) {
            isLibraryEnabled = false;
            figma.ui.postMessage({
                type: "library-status",
                isEnabled: false,
                libraryUrl: CARBON_LIBRARY_URL
            });
            return null;
        }
        // For truly unexpected errors, return null instead of throwing to prevent crashes
        return null;
    }
}

// Anonymous User ID Management
async function getOrCreateAnonymousUserId(): Promise<string> {
    const userIdKey = 'mixpanel_anonymous_user_id';
    let userId = await figma.clientStorage.getAsync(userIdKey);

    if (!userId) {
        userId = `figma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await figma.clientStorage.setAsync(userIdKey, userId);
        return userId;
    }

    return userId;
}

async function isFirstTimeUser(): Promise<boolean> {
    const hasUsedPlugin = await figma.clientStorage.getAsync('has_used_plugin');
    if (!hasUsedPlugin) {
        await figma.clientStorage.setAsync('has_used_plugin', true);
        return true;
    }
    return false;
}

async function getPluginContext() {
    const selection = figma.currentPage.selection;
    const fileKey = figma.fileKey || null;
    const pageName = figma.currentPage.name;
    const selectionCount = selection.length;
    const nodeTypes = selection.map(node => node.type);

    const anonymousUserId = await getOrCreateAnonymousUserId();
    const firstTimeUser = await isFirstTimeUser();

    return {
        file_key: fileKey,
        page_name: pageName,
        selection_count: selectionCount,
        node_types: nodeTypes,
        anonymous_user_id: anonymousUserId,
        is_first_time_user: firstTimeUser
    };
}

// Utility Functions
function findTextNode(node: SceneNode & ChildrenMixin, targetName: string, limit: number = SEARCH_LIMITS.TEXT_SEARCH): TextNode | null {
    let count = 0;
    const search = (n: SceneNode & ChildrenMixin): TextNode | null => {
        if (count > limit) return null;
        count++;
        for (const child of n.children) {
            if (child.name === targetName && child.type === "TEXT") return child as TextNode;
            if ('children' in child) {
                const found = search(child as SceneNode & ChildrenMixin);
                if (found) return found;
            }
        }
        return null;
    };
    return search(node);
}

function findOneRecursive(node: SceneNode & ChildrenMixin, name: string, limit: number = SEARCH_LIMITS.RECURSIVE_FIND): SceneNode | null {
    let count = 0;
    const search = (n: SceneNode & ChildrenMixin): SceneNode | null => {
        if (count > limit) return null;
        count++;
        if (n.name === name) return n;
        for (const child of n.children) {
            if (child.name === name) return child;
            if ('children' in child) {
                const found = search(child as SceneNode & ChildrenMixin);
                if (found) return found;
            }
        }
        return null;
    };
    return search(node);
}

function findAllRecursive(node: SceneNode & ChildrenMixin, name: string, limit: number = SEARCH_LIMITS.RECURSIVE_FIND_ALL): SceneNode[] {
    let count = 0;
    const results: SceneNode[] = [];
    const search = (n: SceneNode & ChildrenMixin) => {
        if (count > limit) return;
        count++;
        for (const child of n.children) {
            if (child.name === name) results.push(child);
            if ('children' in child) {
                search(child as SceneNode & ChildrenMixin);
            }
        }
    };
    search(node);
    return results;
}

function sortColumnsByNumber(cols: SceneNode[]): SceneNode[] {
    return cols.sort((a, b) => {
        const numA = parseInt(a.name.replace("Col ", "")) || 0;
        const numB = parseInt(b.name.replace("Col ", "")) || 0;
        return numA - numB;
    });
}

// Text Extraction Functions
function getTextValueSafe(parent: InstanceNode, name: string): string {
    try {
        const textNode = findTextNode(parent, name);
        return textNode ? textNode.characters : "";
    } catch (e) {
        return "";
    }
}

function extractHeaderTextSafe(colNode: InstanceNode): string {
    try {
        const contentNode = colNode.children.find(n => n.name === "Content") as FrameNode;
        if (!contentNode) return "Header";
        const textNode = contentNode.findOne(n => n.type === "TEXT") as TextNode;
        return textNode ? textNode.characters : "Header";
    } catch {
        return "Header";
    }
}

function extractBodyTextSafe(colNode: SceneNode & ChildrenMixin): string {
    try {
        let contentNode: SceneNode & ChildrenMixin | null = null;

        if ('children' in colNode) {
            contentNode = colNode.children.find(n => n.name === "Content" && 'children' in n) as SceneNode & ChildrenMixin;
        }

        if (!contentNode) {
            const findContent = (node: SceneNode & ChildrenMixin): SceneNode & ChildrenMixin | null => {
                for (const child of node.children) {
                    if (child.name === "Content" && 'children' in child) return child as SceneNode & ChildrenMixin;
                    if ('children' in child) {
                        const found = findContent(child as SceneNode & ChildrenMixin);
                        if (found) return found;
                    }
                }
                return null;
            };
            contentNode = findContent(colNode);
        }

        if (!contentNode) return "Content";

        const textGroupNode = contentNode.findOne ?
            contentNode.findOne(n => n.name === "Text group" && 'children' in n) as FrameNode :
            null;

        if (!textGroupNode) {
            const fallbackText = contentNode.findOne ?
                contentNode.findOne(n => n.type === "TEXT" && n.visible) as TextNode :
                null;
            return fallbackText ? fallbackText.characters : "Content";
        }

        const textNode = textGroupNode.findOne(n => n.type === "TEXT" && n.visible) as TextNode;
        return textNode ? textNode.characters : "Content";
    } catch {
        return "Content";
    }
}

// Table Instance Functions
async function findExistingTableInstance(): Promise<InstanceNode | null> {
    const selection = figma.currentPage.selection;
    if (selection.length !== 1 || selection[0].type !== "INSTANCE") return null;

    // Early return if library is not enabled to prevent WebAssembly crashes
    if (!isLibraryEnabled) {
        return null;
    }

    const instance = selection[0];
    try {
        const mainComponent = await safeGetMainComponent(instance);
        if (mainComponent?.key && VALID_TABLE_KEYS.includes(mainComponent.key)) {
            return instance;
        }
    } catch {
        // Invalid selection or error accessing component
    }
    return null;
}

async function fetchTableData(instance: InstanceNode): Promise<void> {
    try {
        // Check library availability first
        if (!isLibraryEnabled) {
            figma.notify("Cannot access table data. Please ensure library is enabled.", { error: true });
            return;
        }

        const mainComponent = await safeGetMainComponent(instance);
        if (!mainComponent) {
            figma.notify("Cannot access table data. Please ensure library is enabled.", { error: true });
            return;
        }

        const key = mainComponent.key || "";
        const config: TableConfig = KEY_TO_CONFIG[key] || { variant: 'default', expandable: false, batchActions: false };

        // Fetch Pagination
        const paginationBar = findOneRecursive(instance, "Pagination - Table bar") as InstanceNode;
        const paginationData: PaginationData = { type: 'advanced', itemsPerPage: '', totalItems: '', totalPages: '', currentPage: '' };

        if (paginationBar) {
            try {
                const pagComponent = await safeGetMainComponent(paginationBar);
                if (pagComponent) {
                    const pagKey = pagComponent.key || "";
                    const type = PAGINATION_KEY_TO_TYPE[pagKey] || 'advanced';
                    paginationData.type = type as 'advanced' | 'simple' | 'unbound';

                    if (type === 'advanced') {
                        paginationData.itemsPerPage = getTextValueSafe(paginationBar, "Option");
                        paginationData.totalItems = getTextValueSafe(paginationBar, "1–100 of 100 items");
                        paginationData.totalPages = getTextValueSafe(paginationBar, "Total pages");
                    } else {
                        paginationData.currentPage = getTextValueSafe(paginationBar, "Total pages");
                    }
                }
            } catch {
                // Silently fail pagination fetch - optional feature
            }
        }

        // Fetch Table Data
        const cells: string[][] = [];
        const headerRow = findOneRecursive(instance, "Data table header row item") as InstanceNode;
        let columns = 0;

        if (headerRow) {
            const colNodes = headerRow.children.filter(n => n.name.startsWith("Col ") && n.visible);
            const sortedCols = sortColumnsByNumber(colNodes);
            columns = sortedCols.length;
            const headerData = sortedCols.map(col => extractHeaderTextSafe(col as InstanceNode));
            cells.push(headerData);
        }

        // Fetch Body Rows
        const bodyRowNodes = findAllRecursive(instance, "Data table body row item");
        const visibleBodyRows = bodyRowNodes.filter(n => n.visible).sort((a, b) => a.y - b.y);

        for (const rowNode of visibleBodyRows) {
            const findAllCols = (node: SceneNode & ChildrenMixin): SceneNode[] => {
                const cols: SceneNode[] = [];
                for (const child of node.children) {
                    if (child.name.startsWith("Col ") && child.visible) cols.push(child);
                    if ('children' in child) cols.push(...findAllCols(child as SceneNode & ChildrenMixin));
                }
                return cols;
            };

            const colNodes = sortColumnsByNumber(findAllCols(rowNode as SceneNode & ChildrenMixin));
            if (colNodes.length > 0) {
                const rowData = colNodes.map(col => extractBodyTextSafe(col as SceneNode & ChildrenMixin));
                cells.push(rowData);
            }
        }

        figma.ui.postMessage({
            type: 'table-data-fetched',
            config,
            paginationData,
            rows: cells.length,
            columns,
            cells
        });
        figma.notify("Table data fetched successfully.");
    } catch (e) {
        if (!isExpectedError(e)) {
            // Only notify for unexpected errors
            figma.notify("Failed to fetch table data.", { error: true });
        } else {
            figma.notify("Cannot access table data. Please ensure library is enabled.", { error: true });
        }
    }
}

// Table Update Functions
async function updatePaginationText(paginationBar: InstanceNode, textNodeName: string, value: string): Promise<void> {
    try {
        const textNode = paginationBar.findOne(n => n.name === textNodeName && n.type === "TEXT") as TextNode;
        if (textNode) {
            await figma.loadFontAsync(textNode.fontName as FontName);
            textNode.characters = value;
        }
    } catch {
        // Silently fail - pagination text update is optional
    }
}

async function updatePagination(instance: InstanceNode, paginationKey: string, paginationData: PaginationData): Promise<void> {
    try {
        // Early return if library is not enabled
        if (!isLibraryEnabled) {
            return;
        }

        const paginationBar = instance.findOne(n => n.name === "Pagination - Table bar" && n.type === "INSTANCE") as InstanceNode;
        if (!paginationBar) return;

        try {
            const currentComponent = await safeGetMainComponent(paginationBar);
            if (!currentComponent) {
                return; // Library not accessible
            }

            if (currentComponent.key !== paginationKey) {
                try {
                    const newPaginationMaster = await figma.importComponentByKeyAsync(paginationKey);
                    paginationBar.swapComponent(newPaginationMaster);
                } catch (importError) {
                    // Silently fail if library access is denied - pagination is optional
                    if (!isExpectedError(importError)) {
                        throw importError;
                    }
                    return;
                }
            }
        } catch {
            // Silently fail if component access fails - pagination is optional
            return;
        }

        if (paginationData.type === 'advanced') {
            await updatePaginationText(paginationBar, "Option", paginationData.itemsPerPage || "");
            await updatePaginationText(paginationBar, "1–100 of 100 items", paginationData.totalItems || "");
            await updatePaginationText(paginationBar, "Total pages", paginationData.totalPages || "");
        } else {
            await updatePaginationText(paginationBar, "Total pages", paginationData.currentPage || "");
        }
    } catch {
        // Silently fail - pagination update is optional
    }
}

async function updateHeaderTextValues(colNode: InstanceNode, colIndex: number, rowData: string[]): Promise<void> {
    let textNode: TextNode | null = null;
    const contentNode = colNode.findOne(n => n.name === "Content");

    if (contentNode && 'children' in contentNode) {
        textNode = (contentNode as FrameNode).findOne(n => n.type === "TEXT") as TextNode;
    }

    if (!textNode) {
        textNode = colNode.findOne(n => n.type === "TEXT") as TextNode;
    }

    if (textNode) {
        try {
            await figma.loadFontAsync(textNode.fontName as FontName);
            textNode.characters = rowData[colIndex] || "Header";
        } catch {
            // Font loading failed
        }
    }
}

async function updateBodyTextValues(colNode: FrameNode, colIndex: number, rowData: string[]): Promise<void> {
    let textNode: TextNode | null = null;
    const contentNode = colNode.findOne(n => n.name === "Content");

    if (contentNode && 'children' in contentNode) {
        const aiSlugNode = (contentNode as FrameNode).findOne(n => n.name === "AI slug + Text");
        if (aiSlugNode && 'children' in aiSlugNode) {
            const textGroupNode = (aiSlugNode as FrameNode).findOne(n => n.name === "Text group");
            if (textGroupNode && 'children' in textGroupNode) {
                textNode = (textGroupNode as FrameNode).findOne(n => n.type === "TEXT" && n.visible) as TextNode;
            }
        }
    }

    if (!textNode) {
        textNode = colNode.findOne(n => n.type === "TEXT" && n.visible) as TextNode;
    }

    if (textNode) {
        try {
            await figma.loadFontAsync(textNode.fontName as FontName);
            textNode.characters = rowData[colIndex] || "Content";
        } catch {
            // Font loading failed
        }
    }
}

async function updateHeaderRow(rowNode: InstanceNode, columns: number, rowData: string[]): Promise<void> {
    const colNodes = rowNode.children.filter(n => n.name.startsWith("Col "));
    const sortedCols = sortColumnsByNumber(colNodes);

    for (let j = 0; j < sortedCols.length; j++) {
        const colNode = sortedCols[j];
        if (j < columns) {
            colNode.visible = true;
            await updateHeaderTextValues(colNode as InstanceNode, j, rowData);
        } else {
            colNode.visible = false;
        }
    }
}

async function updateBodyRow(rowNode: FrameNode, rowIndex: number, columns: number, rowData: string[]): Promise<void> {
    const dataTableRow = rowNode.findOne(n => n.name === "Data table row");
    if (!dataTableRow || !('children' in dataTableRow)) return;

    const colNodes = (dataTableRow as FrameNode).children.filter(n => n.name.startsWith("Col "));
    const sortedCols = sortColumnsByNumber(colNodes);

    for (let j = 0; j < sortedCols.length; j++) {
        const colNode = sortedCols[j];
        if (j < columns) {
            colNode.visible = true;
            await updateBodyTextValues(colNode as FrameNode, j, rowData);
        } else {
            colNode.visible = false;
        }
    }
}

async function updateTable(instance: InstanceNode, rows: number, columns: number, cells: string[][]): Promise<void> {
    // Update Header Row
    const headerRow = instance.findOne(n => n.name === "Data table header row item");
    if (headerRow && headerRow.type === "INSTANCE") {
        await updateHeaderRow(headerRow, columns, cells[0] || []);
    }

    // Update Body Rows
    const bodyRowNodes = instance.findAll(n => n.name === "Data table body row item");
    const bodyRowCount = Math.max(0, rows - 1);

    for (let i = 0; i < bodyRowNodes.length; i++) {
        const rowNode = bodyRowNodes[i];
        if (i < bodyRowCount) {
            rowNode.visible = true;
            await updateBodyRow(rowNode as FrameNode, i, columns, cells[i + 1] || []);
        } else {
            rowNode.visible = false;
        }
    }
}

// Main Table Operations
async function insertTable(rows: number, columns: number, cells: string[][], componentKey: string, paginationKey: string, paginationData: PaginationData): Promise<void> {
    try {
        if (!isLibraryEnabled) {
            figma.notify("Please enable the Carbon Design System library first. See instructions in the plugin.", { error: true, timeout: 4000 });
            return;
        }

        // Defensive check: try to import component with specific error handling
        let master;
        try {
            master = await figma.importComponentByKeyAsync(componentKey);
        } catch (importError: any) {
            // Handle expected permission/library errors silently
            if (isExpectedError(importError)) {
                figma.notify("Permission denied: Cannot access Carbon library. Please enable it.", { error: true });
                return;
            }
            // Re-throw unexpected errors
            throw importError;
        }

        const instance = master.createInstance();
        figma.currentPage.appendChild(instance);

        instance.x = figma.viewport.center.x;
        instance.y = figma.viewport.center.y;

        await updateTable(instance, rows, columns, cells);
        await updatePagination(instance, paginationKey, paginationData);

        figma.currentPage.selection = [instance];
        figma.viewport.scrollAndZoomIntoView([instance]);
        figma.notify("Table inserted successfully.");
        } catch (error: any) {
            // Handle errors appropriately

        if (isExpectedError(error)) {
            isLibraryEnabled = false;
            figma.ui.postMessage({
                type: "library-status",
                isEnabled: false,
                libraryUrl: CARBON_LIBRARY_URL
            });
            figma.notify("Permission denied: Cannot access Carbon library. Please enable it.", { error: true });
        } else {
            figma.notify("Failed to insert table.", { error: true });
        }
    }
}

async function modifyTable(instance: InstanceNode, rows: number, columns: number, cells: string[][], componentKey: string, paginationKey: string, paginationData: PaginationData): Promise<void> {
    try {
        if (!isLibraryEnabled) {
            figma.notify("Please enable the Carbon Design System library first. See instructions in the plugin.", { error: true, timeout: 4000 });
            return;
        }

        try {
            const mainComponent = await safeGetMainComponent(instance);
            if (!mainComponent) {
                // Library not accessible, already handled in safeGetMainComponent
                return;
            }

            if (mainComponent.key !== componentKey) {
                try {
                    const newMaster = await figma.importComponentByKeyAsync(componentKey);
                    instance.swapComponent(newMaster);
                } catch (importError: any) {
                    // Handle expected permission/library errors silently
                    if (isExpectedError(importError)) {
                        isLibraryEnabled = false;
                        figma.ui.postMessage({
                            type: "library-status",
                            isEnabled: false,
                            libraryUrl: CARBON_LIBRARY_URL
                        });
                        figma.notify("Permission denied: Cannot access Carbon library.", { error: true });
                        return;
                    }
                    // Re-throw unexpected errors
                    throw importError;
                }
            }
        } catch (error: any) {
            // Handle expected permission/library errors silently
            if (isExpectedError(error)) {
                isLibraryEnabled = false;
                figma.ui.postMessage({
                    type: "library-status",
                    isEnabled: false,
                    libraryUrl: CARBON_LIBRARY_URL
                });
                figma.notify("Permission denied: Cannot access Carbon library.", { error: true });
                return;
            }
            // Re-throw unexpected errors
            throw error;
        }

    } catch (error: any) {
        if (!isExpectedError(error)) {
            figma.notify("Failed to update table variant.", { error: true });
        }
        return;
    }

    await updateTable(instance, rows, columns, cells);
    await updatePagination(instance, paginationKey, paginationData);
    figma.notify("Table updated successfully.");
}

// Initialization
figma.showUI(__html__, {
    width: 1250,
    height: 650,
    themeColors: true
});

// Initialize library status - strictly check if library is accessible
(async () => {
    // Start with library disabled until we can verify it's accessible
    isLibraryEnabled = false;
    
    try {
        // Try to import a component to verify library is accessible
        // Use the first valid table key as a test
        const testComponent = await figma.importComponentByKeyAsync(VALID_TABLE_KEYS[0]);
        
        // Only mark as enabled if we successfully get a valid component
        if (testComponent && testComponent.type === 'COMPONENT') {
            isLibraryEnabled = true;
            figma.ui.postMessage({
                type: "library-status",
                isEnabled: true,
                libraryUrl: CARBON_LIBRARY_URL
            });
        } else {
            // Component import succeeded but returned invalid result - library not properly accessible
            isLibraryEnabled = false;
            figma.ui.postMessage({
                type: "library-status",
                isEnabled: false,
                libraryUrl: CARBON_LIBRARY_URL
            });
        }
    } catch (error: any) {
        // Any error means library is not accessible - strict check
        // This includes both expected errors (permission/library) and unexpected errors
        isLibraryEnabled = false;
        figma.ui.postMessage({
            type: "library-status",
            isEnabled: false,
            libraryUrl: CARBON_LIBRARY_URL
        });
    }
})();

// Event Handlers
figma.on("selectionchange", async () => {
    try {
        const instance = await findExistingTableInstance();
        figma.ui.postMessage({
            type: "selection-status",
            validTableSelected: !!instance
        });
    } catch (error: any) {
        if (isExpectedError(error)) {
            isLibraryEnabled = false;
            figma.ui.postMessage({
                type: "library-status",
                isEnabled: false,
                libraryUrl: CARBON_LIBRARY_URL
            });
        }
        figma.ui.postMessage({
            type: "selection-status",
            validTableSelected: false
        });
    }
});

// Message Handler
figma.ui.onmessage = async (msg: PluginMessage) => {
    if (msg.type === 'get-plugin-context') {
        const context = await getPluginContext();
        figma.ui.postMessage({
            type: 'plugin-context',
            ...context
        });
    } else if (msg.type === 'get-anonymous-user-id') {
        const userId = await getOrCreateAnonymousUserId();
        const firstTimeUser = await isFirstTimeUser();
        figma.ui.postMessage({
            type: 'anonymous-user-id',
            anonymous_user_id: userId,
            is_first_time_user: firstTimeUser
        });
    } else if (msg.type === 'insert-table') {
        const { rows, columns, cells, componentKey, paginationKey, paginationData } = msg;
        if (rows && columns && cells && componentKey && paginationKey && paginationData) {
            await insertTable(rows, columns, cells, componentKey, paginationKey, paginationData);
        }
    } else if (msg.type === 'modify-table') {
        const { rows, columns, cells, componentKey, paginationKey, paginationData } = msg;
        if (rows && columns && cells && componentKey && paginationKey && paginationData) {
            const instance = await findExistingTableInstance();
            if (instance) {
                await modifyTable(instance, rows, columns, cells, componentKey, paginationKey, paginationData);
            } else {
                figma.notify("Select a table component to modify.");
            }
        }
    } else if (msg.type === 'fetch-table-data') {
        const instance = await findExistingTableInstance();
        if (instance) {
            await fetchTableData(instance);
        } else {
            figma.notify("Select a table component to fetch data from.");
        }
    } else if (msg.type === 'resize') {
        if (msg.width && msg.height) {
            figma.ui.resize(msg.width, msg.height);
        }
    } else if (msg.type === 'notify' && msg.message) {
        figma.notify(msg.message);
    } else if (msg.type === 'generate-ai-table') {
        const { prompt, requestedRows = null, requestedCols = null, requestId } = msg;
        if (prompt) {
            // Notify UI that generation has started
            figma.ui.postMessage({
                type: 'ai-generation-started',
                requestId: requestId || `ai_${Date.now()}`
            });
            generateAITable(prompt, requestedRows, requestedCols, requestId).catch((error: any) => {
                figma.notify(`AI generation error: ${error.message}`, { error: true });
            });
        } else {
            figma.notify('No prompt provided', { error: true });
        }
    }
};

// AI Table Generation (via Vercel proxy server)
async function generateAITable(prompt: string, requestedRows: number | null, requestedCols: number | null, requestId?: string) {
    const apiStartTime = Date.now();
    try {
        const PROXY_URL = 'https://carbon-data-table-server.vercel.app/api/generate-table';
        
        // Default to 6 columns and 5 data rows when not specified
        const rows = requestedRows ?? 5;
        const cols = requestedCols ?? 6;

        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt,
                rows: rows,
                cols: cols
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Proxy request failed (${response.status})`);
        }

        const result = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to generate table data');
        }

        let tableData: string[][] = result.data;
        if (!Array.isArray(tableData) || tableData.length === 0) {
            throw new Error('Invalid table data format');
        }

        tableData = tableData.slice(0, 13).map(row => {
            if (!Array.isArray(row)) return [];
            return row.slice(0, 12).map(cell => String(cell || ''));
        });

        const maxCols = Math.max(...tableData.map(row => row.length));
        const normalizedData = tableData.map(row => {
            const normalized = [...row];
            while (normalized.length < maxCols) normalized.push('');
            return normalized;
        });

        const apiResponseTime = Date.now() - apiStartTime;
        const parsingTime = 5; // Estimated parsing time (minimal)

        // Send data back to UI
        figma.ui.postMessage({
            type: 'ai-table-generated',
            tableData: normalizedData,
            success: true,
            requestId: requestId,
            apiResponseTime: apiResponseTime,
            dataParsingTime: parsingTime
        });

        figma.notify(`Generated ${normalizedData.length - 1} rows with ${normalizedData[0].length} columns`);

    } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
        const generationTime = Date.now() - apiStartTime;
        figma.ui.postMessage({
            type: 'ai-table-generated',
            success: false,
            error: errorMessage,
            requestId: requestId,
            generationTime: generationTime
        });
        figma.notify(`AI generation failed: ${errorMessage}`);
    }
}
