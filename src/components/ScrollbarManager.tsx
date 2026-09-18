'use client';

import { useEffect } from 'react';

/**
 * Client component to manage scrollbar visibility
 * Adds 'scrolling' class to body when user is actively scrolling
 * Prevents libraries from adding margin to body when scroll is locked
 */
export function ScrollbarManager() {
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    let isScrolling = false;

    const handleScroll = () => {
      if (!isScrolling) {
        isScrolling = true;
        document.documentElement.classList.add('scrolling');
        document.body.classList.add('scrolling');
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
        document.documentElement.classList.remove('scrolling');
        document.body.classList.remove('scrolling');
      }, 150);
    };

    // Monitor body attribute and style changes, and check for injected style tags
    const bodyObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const attrName = mutation.attributeName;
          if (attrName === 'data-scroll-locked' || attrName === 'style') {
            // Force remove margin via inline style (highest priority)
            // Use CSS.supports to check, then set directly
            document.body.style.margin = '0px';
            document.body.style.marginRight = '0px';
            document.body.style.marginLeft = '0px';
            document.body.style.marginTop = '0px';
            document.body.style.marginBottom = '0px';
            document.body.style.paddingRight = '0px';
          }
        }
      });
    });

    // Also monitor for style tag injection in head
    const headObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && (node as Element).tagName === 'STYLE') {
            const styleElement = node as HTMLStyleElement;
            
            // Check if it contains scroll-locked margin rules and remove/override them
            if (styleElement.textContent?.includes('data-scroll-locked') && 
                styleElement.textContent?.includes('margin')) {
              // Force body margin to 0 after a brief delay to override injected styles
              setTimeout(() => {
                document.body.style.margin = '0px';
                document.body.style.marginRight = '0px';
              }, 0);
            }
          }
        });
      });
    });

    // Observe body for attribute and style changes
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-scroll-locked', 'style'],
      attributeOldValue: true,
    });

    // Observe head for style tag injection
    headObserver.observe(document.head, {
      childList: true,
      subtree: false,
    });

    // Inject a high-priority style tag to override library CSS
    const overrideStyle = document.createElement('style');
    overrideStyle.id = 'scrollbar-manager-override';
    overrideStyle.textContent = `
      body[data-scroll-locked],
      html body[data-scroll-locked],
      body[data-scroll-locked="1"],
      html body[data-scroll-locked="1"] {
        margin: 0 !important;
        margin-right: 0 !important;
        margin-left: 0 !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding-right: 0 !important;
        padding-left: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }
    `;
    document.head.appendChild(overrideStyle);

    // Periodic check to prevent margin (in case MutationObserver misses it)
    // Also check computed styles since library might inject CSS
    const marginCheckInterval = setInterval(() => {
      // Force inline styles to override any CSS
      document.body.style.margin = '0px';
      document.body.style.marginRight = '0px';
      document.body.style.marginLeft = '0px';
      document.body.style.marginTop = '0px';
      document.body.style.marginBottom = '0px';
      document.body.style.paddingRight = '0px';
    }, 50);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleScroll);
      clearTimeout(scrollTimeout);
      clearInterval(marginCheckInterval);
      bodyObserver.disconnect();
      headObserver.disconnect();
      // Remove injected style tag
      const overrideStyle = document.getElementById('scrollbar-manager-override');
      if (overrideStyle) {
        overrideStyle.remove();
      }
    };
  }, []);

  return null;
}

