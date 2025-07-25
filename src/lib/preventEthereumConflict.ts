// Prevent ethereum property conflicts from browser extensions
export function preventEthereumConflict() {
  if (typeof window !== 'undefined') {
    try {
      // Store original ethereum if it exists
      const originalEthereum = (window as any).ethereum;
      
      // Create a more robust prevention system
      const originalDefineProperty = Object.defineProperty;
      let isPatched = false;
      
      // Patch Object.defineProperty temporarily
      Object.defineProperty = function(obj: any, prop: string, descriptor: PropertyDescriptor) {
        if (obj === window && prop === 'ethereum' && isPatched) {
          // Silently ignore ethereum redefinition attempts
          console.log('🛡️ Ethereum redefinition blocked');
          return obj;
        }
        return originalDefineProperty.call(this, obj, prop, descriptor);
      };
      
      isPatched = true;
      
      // Restore original defineProperty after extensions load
      setTimeout(() => {
        Object.defineProperty = originalDefineProperty;
        isPatched = false;
      }, 2000);
      
      // Set up ethereum property if it doesn't exist
      if (!originalEthereum) {
        let ethereumValue: any = undefined;
        
        try {
          Object.defineProperty(window, 'ethereum', {
            get() {
              return ethereumValue;
            },
            set(value) {
              ethereumValue = value;
              return value;
            },
            configurable: true,
            enumerable: true
          });
        } catch (defineError) {
          // Property might already exist, that's okay
          console.log('🛡️ Ethereum property handling complete');
        }
      }
      
    } catch (error) {
      // Fail silently - the app should still work
      console.log('🛡️ Ethereum conflict prevention applied');
    }
  }
}

// Run immediately when imported
preventEthereumConflict();