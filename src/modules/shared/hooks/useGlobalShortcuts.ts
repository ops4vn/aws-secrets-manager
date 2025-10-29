import { useEffect } from 'react';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';

export interface GlobalShortcut {
  key: string;
  action: () => void;
  description: string;
}

export function useGlobalShortcuts(shortcuts: GlobalShortcut[]) {
  useEffect(() => {
    const registeredShortcuts: string[] = [];

    const registerShortcuts = async () => {
      for (const shortcut of shortcuts) {
        try {
          await register(shortcut.key, shortcut.action);
          registeredShortcuts.push(shortcut.key);
          console.log(`Registered global shortcut: ${shortcut.key}`);
        } catch (error) {
          console.error(`Failed to register shortcut ${shortcut.key}:`, error);
        }
      }
    };

    registerShortcuts();

    // Cleanup function
    return () => {
      registeredShortcuts.forEach(async (key) => {
        try {
          await unregister(key);
          console.log(`Unregistered global shortcut: ${key}`);
        } catch (error) {
          console.error(`Failed to unregister shortcut ${key}:`, error);
        }
      });
    };
  }, [shortcuts]);
}
