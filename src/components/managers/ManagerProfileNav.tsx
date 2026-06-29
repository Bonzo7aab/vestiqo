"use client";

import { useState, useEffect } from 'react';
import { cn } from '../ui/utils';

const tabs = [
  { id: 'overview', label: 'Przegląd', hash: '#overview' },
  { id: 'active-jobs', label: 'Aktywne zgłoszenia', hash: '#active-jobs' },
  { id: 'properties', label: 'Nieruchomości', hash: '#properties' },
  { id: 'team', label: 'Zespół', hash: '#team' },
  { id: 'reviews', label: 'Opinie', hash: '#reviews' },
];

interface ManagerProfileNavProps {
  managerId: string;
}

export function ManagerProfileNav({ managerId: _managerId }: ManagerProfileNavProps) {
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#overview' || hash === '') {
        setActiveTab('overview');
      } else if (hash === '#active-jobs') {
        setActiveTab('active-jobs');
      } else if (hash === '#properties') {
        setActiveTab('properties');
      } else if (hash === '#team') {
        setActiveTab('team');
      } else if (hash === '#reviews') {
        setActiveTab('reviews');
      }
    };

    // Set initial hash if none exists (only once)
    if (!window.location.hash) {
      // Use replaceState to avoid adding to history
      window.history.replaceState(null, '', '#overview');
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setActiveTab('overview');
      }, 0);
    } else {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabClick = (hash: string, tabId: string) => {
    // Update hash without scrolling
    window.history.pushState(null, '', hash);
    // Manually trigger hashchange event to update state
    setActiveTab(tabId);
    // Dispatch hashchange event for other listeners
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  return (
    <nav className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={(e) => {
                  e.preventDefault();
                  handleTabClick(tab.hash, tab.id);
                }}
                className={cn(
                  "px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

