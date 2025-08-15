import { PrivateHistoryItem } from "./api";

const PRIVATE_HISTORY_KEY = "private-save-history";
const MAX_HISTORY_ITEMS = 50; // Limit to prevent localStorage from growing too large

export class PrivateHistoryManager {
  /**
   * Get all private history items, sorted by creation date (newest first)
   */
  static getHistory(): PrivateHistoryItem[] {
    try {
      const stored = localStorage.getItem(PRIVATE_HISTORY_KEY);
      if (!stored) return [];
      
      const items: PrivateHistoryItem[] = JSON.parse(stored);
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Failed to load private history:', error);
      return [];
    }
  }

  /**
   * Add a new item to private history
   */
  static addToHistory(item: PrivateHistoryItem): void {
    try {
      const currentHistory = this.getHistory();
      
      // Remove any existing item with the same ID (prevent duplicates)
      const filteredHistory = currentHistory.filter(h => h.id !== item.id);
      
      // Add new item to the beginning
      const newHistory = [item, ...filteredHistory];
      
      // Limit the number of items to prevent localStorage from growing too large
      const limitedHistory = newHistory.slice(0, MAX_HISTORY_ITEMS);
      
      localStorage.setItem(PRIVATE_HISTORY_KEY, JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Failed to save to private history:', error);
    }
  }

  /**
   * Remove an item from private history
   */
  static removeFromHistory(id: string): void {
    try {
      const currentHistory = this.getHistory();
      const filteredHistory = currentHistory.filter(h => h.id !== id);
      localStorage.setItem(PRIVATE_HISTORY_KEY, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error('Failed to remove from private history:', error);
    }
  }

  /**
   * Clear all private history
   */
  static clearHistory(): void {
    try {
      localStorage.removeItem(PRIVATE_HISTORY_KEY);
    } catch (error) {
      console.error('Failed to clear private history:', error);
    }
  }

  /**
   * Get a specific item from history by ID
   */
  static getHistoryItem(id: string): PrivateHistoryItem | null {
    const history = this.getHistory();
    return history.find(item => item.id === id) || null;
  }

  /**
   * Create a content preview (first 100 characters, stripped of HTML)
   */
  static createContentPreview(content: string, isHTML: boolean): string {
    let preview = content;
    
    if (isHTML) {
      // Strip HTML tags for preview
      preview = content.replace(/<[^>]*>/g, '');
    }
    
    // Trim to 100 characters and add ellipsis if needed
    preview = preview.trim();
    if (preview.length > 100) {
      preview = preview.substring(0, 100) + '...';
    }
    
    return preview;
  }

  /**
   * Get the number of items in history
   */
  static getHistoryCount(): number {
    return this.getHistory().length;
  }
}
