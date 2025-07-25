// Prevent ethereum property conflicts from browser extensions
export function preventEthereumConflict() {
  if (typeof window !== 'undefined') {
    try {
      // Check if ethereum already exists and is being redefined
      if ((window as any).ethereum) {
        // Create a safe wrapper that prevents redefinition errors
        const safeEthereum = (window as any).ethereum;
        
        // Override defineProperty only for ethereum on window
        const originalDefineProperty = Object.defineProperty;
        
        Object.defineProperty = function(obj: any, prop: string, descriptor: PropertyDescriptor) {
          if (obj === window && prop === 'ethereum') {
            // Silently ignore ethereum redefinition attempts
            return obj;
          }
          return originalDefineProperty.call(this, obj, prop, descriptor);
        };
        
        // Restore after extensions have loaded
        setTimeout(() => {
          Object.defineProperty = originalDefineProperty;
        }, 3000);
      }
    } catch (error) {
      // Silently handle any errors
    }
  }
}

// Run immediately when imported
preventEthereumConflict();