import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Images as GalleryIcon
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

const Gallery = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [savedOutputs, setSavedOutputs] = useState<SavedOutput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadSavedOutputs();
  }, []);

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

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await apiService.deleteSavedOutput(id);
      setSavedOutputs(prev => prev.filter(output => output.id !== id));
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
    navigate(`/preview/${id}`);
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
    <div className="min-h-screen bg-background p-3 sm:p-6">
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
          
          <div className="flex items-center gap-2">
            <GalleryIcon className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
              Saved Outputs Gallery
            </h1>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {savedOutputs.map((output) => (
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
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete saved output?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{output.title}" and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(output.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        )}
      </div>
    </div>
  );
};

export default Gallery; 