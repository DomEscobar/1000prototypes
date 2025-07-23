import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    ArrowLeft,
    Download,
    Users,
    Loader2,
    AlertTriangle,
    Bot,
    Star,
    Eye,
    Zap,
    Code2,
    Palette,
    MessageSquare,
    Camera,
    ShoppingCart,
    FileText,
    Globe,
    Smartphone,
    Plus
} from "lucide-react";
import { Agent, CommunityAgent, apiService } from "@/lib/api";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AgentSubmissionModal } from "@/components/AgentSubmissionModal";

// CommunityAgent interface is now imported from lib/api.ts

const CommunityAgents = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [agents, setAgents] = useState<CommunityAgent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [importingId, setImportingId] = useState<string | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<CommunityAgent | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
    const [selectedTag, setSelectedTag] = useState<string>("all");

    useEffect(() => {
        loadCommunityAgents();
    }, []);

    const loadCommunityAgents = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await apiService.getCommunityAgents();
            setAgents(response.agents);
        } catch (err) {
            console.error('Failed to load community agents:', err);
            setError(err instanceof Error ? err.message : "Failed to load community agents");
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async (communityAgent: CommunityAgent) => {
        try {
            setImportingId(communityAgent.id);

            // Increment download count
            await apiService.incrementCommunityAgentDownloads(communityAgent.id);

            // Convert community agent to regular agent format
            const agentToImport: Omit<Agent, 'id' | 'status' | 'createdAt'> = {
                name: `${communityAgent.name} (Community)`,
                description: communityAgent.description,
                prompts: communityAgent.prompts,
                model: communityAgent.model,
                provider: communityAgent.provider
            };

            // Import the agent using the API service
            await apiService.createAgent(agentToImport);

            // Update local state to reflect new download count
            setAgents(prev => prev.map(agent =>
                agent.id === communityAgent.id
                    ? { ...agent, downloads: agent.downloads + 1 }
                    : agent
            ));

            toast({
                title: "Agent imported successfully!",
                description: `${communityAgent.name} has been added to your agents collection.`,
            });
        } catch (error) {
            console.error('Failed to import agent:', error);
            toast({
                title: "Failed to import agent",
                description: error instanceof Error ? error.message : "Unknown error occurred",
                variant: "destructive"
            });
        } finally {
            setImportingId(null);
        }
    };

    const handlePreview = (agent: CommunityAgent) => {
        setSelectedAgent(agent);
        setIsPreviewOpen(true);
    };

    const getPopularTags = () => {
        const allTags = agents.flatMap(agent => agent.tags);
        const tagCounts = allTags.reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([tag]) => tag);
    };

    const filteredAgents = selectedTag === "all"
        ? agents
        : agents.filter(agent => agent.tags.includes(selectedTag));

    const featuredAgents = agents.filter(agent => agent.featured);

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
                            <span className="text-muted-foreground">Loading community agents...</span>
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
                        <Button onClick={loadCommunityAgents} variant="outline">
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
                {/* Navigation Header */}
                <div className="flex items-center justify-between py-3 mb-4 border-b border-border">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 h-9 px-3"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>


                    <Button
                        onClick={() => setIsSubmissionOpen(true)}
                        className="bg-gradient-primary hover:opacity-90 h-9 px-4"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Publish Agent
                    </Button>
                </div>

                {/* Stats & Category Filter */}
                <div className="mb-6 space-y-4">
                    <Card className="bg-gradient-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Community Agents</p>
                                    <p className="text-2xl font-bold text-foreground">{agents.length}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Total Downloads</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        {agents.reduce((total, agent) => total + agent.downloads, 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tag Filter */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={selectedTag === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTag("all")}
                            className={selectedTag === "all"
                                ? "bg-gradient-primary text-white"
                                : "border-border hover:bg-muted"
                            }
                        >
                            All Agents
                        </Button>
                        {getPopularTags().map((tag) => (
                            <Button
                                key={tag}
                                variant={selectedTag === tag ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedTag(tag)}
                                className={`${selectedTag === tag
                                        ? "bg-gradient-primary text-white"
                                        : "border-border hover:bg-muted"
                                    }`}
                            >
                                #{tag}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Featured Agents Section */}
                {selectedTag === "all" && featuredAgents.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Star className="h-5 w-5 text-yellow-500" />
                            <h2 className="text-lg font-semibold text-foreground">Featured Agents</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {featuredAgents.map((agent) => (
                                <Card
                                    key={agent.id}
                                    className="bg-gradient-card border-border shadow-card hover:shadow-elegant transition-all duration-300 group relative"
                                >
                                    <div className="absolute top-2 right-2">
                                        <Badge className="bg-yellow-500 text-yellow-50 hover:bg-yellow-600">
                                            <Star className="h-3 w-3 mr-1" />
                                            Featured
                                        </Badge>
                                    </div>

                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0 mr-16">
                                                <CardTitle className="text-lg font-semibold text-foreground mb-2 truncate">
                                                    {agent.name}
                                                </CardTitle>
                                            </div>
                                        </div>

                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                            {agent.description}
                                        </p>

                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1">
                                                    <Bot className="h-3 w-3" />
                                                    <span>@{agent.author}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Download className="h-3 w-3" />
                                                    <span>{agent.downloads.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                <span>{agent.rating}</span>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="pt-0">
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {agent.tags.slice(0, 3).map((tag) => (
                                                <Badge key={tag} variant="secondary" className="text-xs h-5 px-1.5">
                                                    {tag}
                                                </Badge>
                                            ))}
                                            {agent.tags.length > 3 && (
                                                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                                    +{agent.tags.length - 3}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handlePreview(agent)}
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                            >
                                                <Eye className="h-3 w-3 mr-1" />
                                                Preview
                                            </Button>

                                            <Button
                                                onClick={() => handleImport(agent)}
                                                disabled={importingId === agent.id}
                                                size="sm"
                                                className="flex-1 bg-gradient-primary hover:opacity-90"
                                            >
                                                {importingId === agent.id ? (
                                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                ) : (
                                                    <Download className="h-3 w-3 mr-1" />
                                                )}
                                                Import
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Agents Grid */}
                <div className="mb-8">
                    {selectedTag !== "all" && (
                        <div className="flex items-center gap-2 mb-4">
                            <Bot className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">#{selectedTag} Agents</h2>
                        </div>
                    )}

                    {filteredAgents.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">No agents found</h3>
                            <p className="text-muted-foreground mb-4">
                                {selectedTag === "all"
                                    ? "No community agents available yet"
                                    : `No agents found with the #${selectedTag} tag`
                                }
                            </p>
                            {selectedTag !== "all" && (
                                <Button onClick={() => setSelectedTag("all")} variant="outline">
                                    View All Agents
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {filteredAgents.map((agent) => (
                                <Card
                                    key={agent.id}
                                    className="bg-gradient-card border-border shadow-card hover:shadow-elegant transition-all duration-300 group"
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-lg font-semibold text-foreground mb-2 truncate">
                                                    {agent.name}
                                                </CardTitle>
                                            </div>
                                        </div>

                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                            {agent.description}
                                        </p>

                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1">
                                                    <Bot className="h-3 w-3" />
                                                    <span>@{agent.author}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Download className="h-3 w-3" />
                                                    <span>{agent.downloads.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                <span>{agent.rating}</span>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="pt-0">
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {agent.tags.slice(0, 3).map((tag) => (
                                                <Badge key={tag} variant="secondary" className="text-xs h-5 px-1.5">
                                                    {tag}
                                                </Badge>
                                            ))}
                                            {agent.tags.length > 3 && (
                                                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                                    +{agent.tags.length - 3}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handlePreview(agent)}
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                            >
                                                <Eye className="h-3 w-3 mr-1" />
                                                Preview
                                            </Button>

                                            <Button
                                                onClick={() => handleImport(agent)}
                                                disabled={importingId === agent.id}
                                                size="sm"
                                                className="flex-1 bg-gradient-primary hover:opacity-90"
                                            >
                                                {importingId === agent.id ? (
                                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                ) : (
                                                    <Download className="h-3 w-3 mr-1" />
                                                )}
                                                Import
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Agent Preview Modal */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-foreground flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            {selectedAgent?.name}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedAgent && (
                        <div className="flex-1 overflow-y-auto space-y-6">
                            {/* Agent Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium text-foreground mb-2">Description</h4>
                                    <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-foreground mb-2">Details</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Author:</span>
                                            <span className="text-foreground">@{selectedAgent.author}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Downloads:</span>
                                            <span className="text-foreground">{selectedAgent.downloads.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Rating:</span>
                                            <div className="flex items-center gap-1">
                                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                <span className="text-foreground">{selectedAgent.rating}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Model:</span>
                                            <span className="text-foreground">{selectedAgent.model}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <h4 className="font-medium text-foreground mb-2">Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedAgent.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Prompt Sequence */}
                            <div>
                                <h4 className="font-medium text-foreground mb-2">Prompt Sequence ({selectedAgent.prompts.length} steps)</h4>
                                <div className="space-y-3">
                                    {selectedAgent.prompts.map((prompt, index) => (
                                        <Card key={index} className="bg-secondary/30 border-border/50 p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline" className="text-xs">
                                                    Step {index + 1}
                                                </Badge>
                                            </div>
                                            <pre className="text-xs text-foreground whitespace-pre-wrap break-words bg-background p-3 rounded border border-border overflow-x-auto">
                                                {prompt}
                                            </pre>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                            variant="outline"
                            onClick={() => setIsPreviewOpen(false)}
                            className="border-border hover:bg-muted"
                        >
                            Close
                        </Button>
                        {selectedAgent && (
                            <Button
                                onClick={() => {
                                    handleImport(selectedAgent);
                                    setIsPreviewOpen(false);
                                }}
                                disabled={importingId === selectedAgent.id}
                                className="bg-gradient-primary hover:opacity-90"
                            >
                                {importingId === selectedAgent.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                )}
                                Import Agent
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Agent Submission Modal */}
            <AgentSubmissionModal
                isOpen={isSubmissionOpen}
                onClose={() => setIsSubmissionOpen(false)}
                onSuccess={(agent) => {
                    // Refresh the agents list to show the new agent
                    loadCommunityAgents();
                    toast({
                        title: "Agent published successfully!",
                        description: "Your agent is now live in the community and available for others to use.",
                    });
                }}
            />
        </div>
    );
};

export default CommunityAgents; 