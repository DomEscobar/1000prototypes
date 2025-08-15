import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Eye, 
  Trash2, 
  Calendar, 
  User, 
  Code2,
  FileText,
  Clock,
  ExternalLink,
  History,
  AlertTriangle
} from "lucide-react";
import { PrivateHistoryManager } from "@/lib/privateHistory";
import { PrivateHistoryItem } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PrivateHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivateHistory({ isOpen, onClose }: PrivateHistoryProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [historyItems, setHistoryItems] = useState<PrivateHistoryItem[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load history when modal opens
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = () => {
    const items = PrivateHistoryManager.getHistory();
    setHistoryItems(items);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      setDeletingId(id);
      PrivateHistoryManager.removeFromHistory(id);
      loadHistory(); // Refresh the list
      
      toast({
        title: "Removed from history",
        description: "The item has been removed from your private history.",
      });
    } catch (error) {
      console.error('Failed to delete history item:', error);
      toast({
        title: "Failed to remove",
        description: "Could not remove the item from history.",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = () => {
    PrivateHistoryManager.clearHistory();
    loadHistory();
    toast({
      title: "History cleared",
      description: "All private history has been cleared.",
    });
  };

  const handleOpenPreview = (item: PrivateHistoryItem) => {
    navigate(item.previewUrl);
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return formatDate(dateString);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] bg-gradient-card border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <DialogTitle>Private History</DialogTitle>
              <Badge variant="secondary" className="text-xs">
                {historyItems.length} items
              </Badge>
            </div>
            {historyItems.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Private History</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove all items from your private history. This action cannot be undone.
                      The actual saved outputs will remain accessible via their direct URLs.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">No Private History</h3>
                <p className="text-sm text-muted-foreground">
                  Your private saves will appear here. Private saves are only accessible via direct URL and don't appear in the public gallery.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto space-y-3 pr-2">
              {historyItems.map((item) => (
                <Card key={item.id} className="bg-background border-border hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-foreground truncate">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0">
                            {item.isHTML ? (
                              <Badge variant="secondary" className="text-xs">
                                <Code2 className="h-3 w-3 mr-1" />
                                HTML
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                Text
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.agentName}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(item.createdAt)}
                          </div>
                        </div>

                        {item.contentPreview && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {item.contentPreview}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground italic truncate">
                          "{item.userRequest}"
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenPreview(item)}
                          className="flex items-center gap-1 h-8 px-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="hidden sm:inline">Open</span>
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingId === item.id}
                              className="flex items-center gap-1 h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove from History</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove "{item.title}" from your private history. 
                                The saved output will still be accessible via its direct URL.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteItem(item.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
