"use client";

import { Briefcase, Calendar, Clock, DollarSign, Edit, Euro, FolderKanban, MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { SubmissionReviewDialog } from '../../../components/reviews/SubmissionReviewDialog';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { deletePortfolioProject } from '../../../lib/database/contractors';
import {
  fetchPortfolioProjectByIdAction,
  refreshContractorPortfolioAction,
} from '../../../lib/database/contractors-portfolio-actions';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import PortfolioProjectForm from '../../../components/PortfolioProjectForm';
import { toast } from 'sonner';
import Image from 'next/image';
import type { PlatformProject } from '../../../lib/database/contractors';
import { routes } from '../../../lib/routes';

interface PortfolioProject {
  id: string;
  title: string;
  description?: string;
  location?: string;
  images?: string[];
  year?: number;
  budget?: string;
  duration?: string;
  isFeatured?: boolean;
  category?: string;
  projectType?: string;
  completionDate?: string;
  clientName?: string;
  clientFeedback?: string;
}

interface ProjectsContentProps {
  platformProjects: PlatformProject[];
  portfolioProjects: PortfolioProject[];
  companyId: string;
}

export function ProjectsContent({ platformProjects: initialPlatformProjects, portfolioProjects: initialPortfolioProjects, companyId }: ProjectsContentProps) {
  const router = useRouter();
  const [platformProjects] = useState(initialPlatformProjects);
  const [portfolioProjects, setPortfolioProjects] = useState(initialPortfolioProjects);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [reviewProject, setReviewProject] = useState<PlatformProject | null>(null);

  const handleAddPortfolioProject = () => {
    setEditingProject(null);
    setShowPortfolioForm(true);
  };

  const handleEditPortfolioProject = async (project: PortfolioProject) => {
    const fullProject = await fetchPortfolioProjectByIdAction(project.id);
    
    if (fullProject) {
      setEditingProject(fullProject);
      setShowPortfolioForm(true);
    } else {
      toast.error('Nie udało się załadować danych projektu');
    }
  };

  const handleDeletePortfolioProject = (projectId: string) => {
    setDeletingProjectId(projectId);
  };

  const confirmDeletePortfolioProject = async () => {
    if (!deletingProjectId || !companyId) return;

    const supabase = createClient();
    try {
      const { data, error } = await deletePortfolioProject(supabase, deletingProjectId);
      
      if (error || !data) {
        toast.error('Nie udało się usunąć projektu');
        console.error('Error deleting portfolio project:', error);
        return;
      }

      toast.success('Projekt został usunięty');
      
      // Refresh portfolio list
      const portfolio = await refreshContractorPortfolioAction(companyId);
      setPortfolioProjects(portfolio || []);
    } catch (error) {
      console.error('Error in confirmDeletePortfolioProject:', error);
      toast.error('Wystąpił błąd podczas usuwania projektu');
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handlePortfolioSuccess = async () => {
    if (!companyId) return;
    
    try {
      const portfolio = await refreshContractorPortfolioAction(companyId);
      setPortfolioProjects(portfolio || []);
    } catch (error) {
      console.error('Error refreshing portfolio:', error);
    }
  };

  const handlePortfolioFormClose = () => {
    setShowPortfolioForm(false);
    setEditingProject(null);
  };

  return (
    <>
      <div className="space-y-8">
        {/* Section 1: Platform Project History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Historia projektów z platformy</h2>
            </div>
          </div>
          
          {platformProjects.length > 0 ? (
            <div className="grid gap-4">
              {platformProjects.map((project) => (
                <Card key={project.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{project.title}</h3>
                          {project.category && (
                            <Badge variant="outline">{project.category}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span className="font-medium">{project.clientCompany}</span>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{project.location}</span>
                          </div>
                          {project.completionDate && (
                            <span>Ukończono: {new Date(project.completionDate).toLocaleDateString('pl-PL')}</span>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">{project.description}</p>
                        )}
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          {project.proposedPrice && (
                            <div className="flex items-center gap-1">
                              <Euro className="w-4 h-4" />
                              <span>{project.proposedPrice.toLocaleString('pl-PL')} {project.currency}</span>
                            </div>
                          )}
                          {project.duration && (
                            <span>Czas realizacji: {project.duration}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {(project.proposedPrice || project.budget) && (
                          <p className="text-2xl font-bold text-green-600 mb-2">
                            {project.proposedPrice 
                              ? `${project.proposedPrice.toLocaleString('pl-PL')} ${project.currency}`
                              : project.budget 
                              ? `${project.budget.toLocaleString('pl-PL')} ${project.currency}`
                              : ''
                            }
                          </p>
                        )}
                        <div className="flex flex-col gap-2">
                          {project.clientCompanyId ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setReviewProject(project)}
                            >
                              <Star className="w-4 h-4 mr-1" />
                              Oceń Konkurs
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(routes.konkurs(project.jobId, project.title))}
                          >
                            Zobacz szczegóły
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Brak ukończonych projektów z platformy</h3>
                <p className="text-gray-600">
                  Projekty z platformy pojawią się tutaj, gdy Twoja aplikacja zostanie zaakceptowana i projekt zostanie ukończony.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Section 2: Own Portfolio */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderKanban className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Portfolio własne</h2>
            </div>
            {portfolioProjects.length > 0 && (
              <Button onClick={handleAddPortfolioProject}>
                <Plus className="w-4 h-4 mr-2" />
                Dodaj projekt
              </Button>
            )}
          </div>
          
          {portfolioProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolioProjects.map((project) => (
                <Card key={project.id} className="overflow-hidden">
                  {project.images && project.images.length > 0 && (
                    <div className="relative h-48 w-full">
                      <Image
                        src={project.images[0]}
                        alt={project.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-lg line-clamp-2 flex-1">{project.title}</h3>
                      {project.isFeatured && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Star className="w-3 h-3 mr-1" />
                          Wyróżniony
                        </Badge>
                      )}
                    </div>
                    {project.location && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{project.location}</span>
                      </div>
                    )}
                    {project.description && (
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">{project.description}</p>
                    )}
                    <div className="space-y-1 text-xs text-gray-600 mb-4">
                      {project.year && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Rok ukończenia: <span className="font-medium">{project.year}</span></span>
                        </div>
                      )}
                      {project.budget && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>Budżet: <span className="font-medium">{project.budget}</span></span>
                        </div>
                      )}
                      {project.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Czas realizacji: <span className="font-medium">{project.duration}</span></span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditPortfolioProject(project)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edytuj
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeletePortfolioProject(project.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FolderKanban className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Brak projektów w portfolio</h3>
                <p className="text-gray-600 mb-4">
                  Dodaj swoje ukończone projekty spoza platformy, aby pokazać klientom swoje doświadczenie.
                </p>
                <Button onClick={handleAddPortfolioProject}>
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj pierwszy projekt
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Portfolio Project Form Modal */}
      <Dialog open={showPortfolioForm} onOpenChange={setShowPortfolioForm}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Edytuj projekt portfolio' : 'Dodaj nowy projekt portfolio'}
            </DialogTitle>
            <DialogDescription>
              {editingProject 
                ? 'Zaktualizuj informacje o projekcie w swoim portfolio.' 
                : 'Dodaj projekt ukończony poza platformą do swojego portfolio.'}
            </DialogDescription>
          </DialogHeader>
          <PortfolioProjectForm
            projectId={editingProject?.id}
            initialData={editingProject || undefined}
            onClose={handlePortfolioFormClose}
            onSuccess={() => {
              handlePortfolioSuccess();
              handlePortfolioFormClose();
            }}
          />
        </DialogContent>
      </Dialog>

      {reviewProject?.clientCompanyId ? (
        <SubmissionReviewDialog
          open={!!reviewProject}
          onOpenChange={(open) => !open && setReviewProject(null)}
          jobId={reviewProject.jobId}
          managerCompanyId={reviewProject.clientCompanyId}
          managerCompanyName={reviewProject.clientCompany}
          submissionTitle={reviewProject.title}
        />
      ) : null}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingProjectId} onOpenChange={(open) => !open && setDeletingProjectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usunąć projekt?</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć ten projekt z portfolio? Tej operacji nie można cofnąć.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeletingProjectId(null)}
            >
              Anuluj
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeletePortfolioProject}
            >
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

