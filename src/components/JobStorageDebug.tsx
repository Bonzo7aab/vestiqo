import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { getStoredJobs, clearStoredJobs, Job } from '../utils/jobStorage';
import { Trash2, RefreshCw } from 'lucide-react';

export const JobStorageDebug: React.FC = () => {
  const [storedJobs, setStoredJobs] = useState<Job[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const loadJobs = () => {
    const jobs = getStoredJobs();
    console.log('🔍 JobStorageDebug - Loading jobs:', jobs.length);
    setStoredJobs(jobs);
  };
  
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      loadJobs();
    }, 0);
    
    // Listen for storage changes (when new jobs are added)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'urbi-jobs') {
        loadJobs();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for direct localStorage changes in the same tab
    const interval = setInterval(loadJobs, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  const handleClearAll = () => {
    if (confirm('Czy na pewno chcesz usunąć wszystkie zapisane ogłoszenia?')) {
      clearStoredJobs();
      loadJobs();
    }
  };
  
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="bg-card shadow-lg border-red-500 text-red-600 hover:bg-red-50"
        >
          🐛 Debug: Zapisane ({storedJobs.length})
        </Button>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Zapisane ogłoszenia ({storedJobs.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadJobs}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={storedJobs.length === 0}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 max-h-64 overflow-y-auto">
          {storedJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Brak zapisanych ogłoszeń
            </p>
          ) : (
            <div className="space-y-2">
              {storedJobs.map((job) => (
                <div key={job.id} className="p-2 border rounded text-xs">
                  <div className="font-medium truncate">{job.title}</div>
                  <div className="text-muted-foreground">{job.company}</div>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {job.location}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {job.postedTime}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};