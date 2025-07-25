// Prevent ethereum property conflicts from browser extensions
export function preventEthereumConflict() {
  if (typeof window !== 'undefined') {
    // Store original ethereum object if it exists
    const originalEthereum = (window as any).ethereum;
    
    // Define a getter/setter that prevents redefinition errors
    try {
      Object.defineProperty(window, 'ethereum', {
        get() {
          return originalEthereum;
        },
        set(value) {
          // Allow setting but prevent errors
          return value;
        },
        configurable: true,
        enumerable: true
      });
    } catch (error) {
      // If we can't redefine, just ignore the error
      console.log('Ethereum property conflict prevented');
    }
  }
}

// Auto-run on import
if (typeof window !== 'undefined') {
  preventEthereumConflict();
}