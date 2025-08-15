import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Eye, 
  Trash2, 
  Calendar, 
  User, 
  Loader2,
  AlertTriangle,
  FileText,
  Code2,
  Images as GalleryIcon,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { apiService, SavedOutput } from "@/lib/api";
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
import Preview from "./Preview";

const ITEMS_PER_PAGE = 6;

const Gallery = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [savedOutputs, setSavedOutputs] = useState<SavedOutput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadSavedOutputs();
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && previewModalOpen) {
        handleClosePreview();
      }
    };

    if (previewModalOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [previewModalOpen]);

  // Reset to first page when outputs change
  useEffect(() => {
    setCurrentPage(1);
  }, [savedOutputs.length]);

  const loadSavedOutputs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getSavedOutputs();
      setSavedOutputs(response.outputs.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (err) {
      console.error('Failed to load saved outputs:', err);
      setError(err instanceof Error ? err.message : "Failed to load saved outputs");
    } finally {
      setIsLoading(false);
    }
  };

  const isDevModeEnabled = () => {
    try {
      return localStorage.getItem('dev') !== null;
    } catch {
      return false;
    }
  };

  const handleDeleteClick = (id: string) => {
    setPendingDeleteId(id);
    setDeleteConfirmText("");
  };

  const handleDeleteCancel = () => {
    setPendingDeleteId(null);
    setDeleteConfirmText("");
  };

  const handleDelete = async (id: string) => {
    // Check if dev mode protection is enabled
    if (isDevModeEnabled() && deleteConfirmText !== "DELETE") {
      toast({
        title: "Delete protection active",
        description: "Type 'DELETE' to confirm deletion in dev mode.",
        variant: "destructive"
      });
      return;
    }

    try {
      setDeletingId(id);
      await apiService.deleteSavedOutput(id);
      setSavedOutputs(prev => prev.filter(output => output.id !== id));
      setPendingDeleteId(null);
      setDeleteConfirmText("");
      toast({
        title: "Deleted successfully",
        description: "The saved output has been removed.",
      });
    } catch (error) {
      console.error('Failed to delete output:', error);
      toast({
        title: "Failed to delete",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (id: string) => {
    setSelectedPreviewId(id);
    setPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setSelectedPreviewId(null);
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Pagination calculations
  const totalPages = Math.ceil(savedOutputs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentOutputs = savedOutputs.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </div>
          
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading gallery...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </div>
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          
          <div className="mt-4">
            <Button onClick={loadSavedOutputs} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6 page-container">
      <div className="max-w-7xl mx-auto">
        {/* Thin Navigation Header */}
        <div className="flex items-center justify-between py-3 mb-4 border-b border-border">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 h-9 px-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <GalleryIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Gallery
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Saved outputs & creations
              </p>
            </div>
          </div>
          
          <div className="w-24"></div> {/* Spacer for balance */}
        </div>

        {/* Stats */}
        <div className="mb-6">
          <Card className="bg-gradient-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Saved Outputs</p>
                  <p className="text-2xl font-bold text-foreground">{savedOutputs.length}</p>
                </div>
                {savedOutputs.length > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Showing {startIndex + 1}-{Math.min(endIndex, savedOutputs.length)} of {savedOutputs.length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gallery Grid */}
        {savedOutputs.length === 0 ? (
          <div className="text-center py-12">
            <GalleryIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No saved outputs yet</h3>
            <p className="text-muted-foreground mb-4">
              Create some AI outputs and save them to see them here
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go Create Something
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {currentOutputs.map((output) => (
                <Card 
                  key={output.id} 
                  className="bg-gradient-card border-border shadow-card hover:shadow-elegant transition-all duration-300 group"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold text-foreground mb-2 truncate">
                          {output.title}
                        </CardTitle>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {truncateText(output.userRequest)}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-20">{output.agentName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(output.createdAt)}</span>
                      </div>
                      <Badge variant="outline" className="text-xs h-5 px-1.5">
                        {output.model}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Content Preview */}
                    {output.isHTML ? (
                      <div className="bg-white rounded-lg border mb-4 overflow-hidden">
                        <iframe
                          srcDoc={output.content}
                          className="w-full h-64 border-0 pointer-events-none"
                          title={`Preview of ${output.title}`}
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation allow-top-navigation-by-user-activation"
                        />
                      </div>
                    ) : (
                      <div className="bg-secondary/30 rounded-lg p-3 mb-4">
                        <pre className="text-xs text-foreground whitespace-pre-wrap break-words overflow-hidden">
                          {truncateText(output.content, 150)}
                        </pre>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleView(output.id)}
                        size="sm"
                        className="flex-1 bg-gradient-primary hover:opacity-90"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      
                      <AlertDialog open={pendingDeleteId === output.id} onOpenChange={(open) => !open && handleDeleteCancel()}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deletingId === output.id}
                            className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleDeleteClick(output.id)}
                          >
                            {deletingId === output.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete saved output?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{output.title}" and cannot be undone.
                              {isDevModeEnabled() && (
                                <span className="block mt-2 text-amber-600 font-medium">
                                  Dev mode protection active: Type "DELETE" below to confirm.
                                </span>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          {isDevModeEnabled() && (
                            <div className="px-6">
                              <Input
                                placeholder="Type DELETE to confirm"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="mt-2"
                                autoFocus
                              />
                            </div>
                          )}
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(output.id)}
                              disabled={isDevModeEnabled() && deleteConfirmText !== "DELETE"}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 py-1 text-muted-foreground">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageClick(page as number)}
                          className={`w-8 h-8 p-0 ${
                            currentPage === page 
                              ? "bg-primary text-primary-foreground" 
                              : ""
                          }`}
                        >
                          {page}
                        </Button>
                      )
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Preview Modal */}
        {previewModalOpen && selectedPreviewId && (
          <div 
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
            onClick={(e) => {
              // Close modal if clicking the backdrop (not the content)
              if (e.target === e.currentTarget) {
                handleClosePreview();
              }
            }}
          >
            <div className="fixed inset-0 overflow-auto">
              <Preview 
                previewId={selectedPreviewId} 
                isModal={true} 
                onClose={handleClosePreview}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery; 