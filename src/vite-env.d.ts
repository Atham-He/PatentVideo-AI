/// <reference types="vite/client" />
import React from 'react';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey?: () => Promise<boolean>;
      openSelectKey?: () => Promise<void>;
    };
  }

  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        ar?: boolean;
        'camera-controls'?: boolean;
        'touch-action'?: string;
        poster?: string;
        'shadow-intensity'?: string;
        'environment-image'?: string;
        'auto-rotate'?: boolean;
        exposure?: string;
        ref?: React.LegacyRef<HTMLElement>;
        style?: React.CSSProperties;
      };
    }
  }
}
