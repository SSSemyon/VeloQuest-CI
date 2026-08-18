import { Linking } from 'react-native';
import { shouldDeliverAppLink } from './recoveryLinkPolicy';

let installed = false;

export function installRecoveryLinkGuard() {
  if (installed) return;
  installed = true;

  const originalGetInitialURL = Linking.getInitialURL.bind(Linking);
  const originalAddEventListener = Linking.addEventListener.bind(Linking);

  Object.defineProperty(Linking, 'getInitialURL', {
    configurable: true,
    value: (async () => {
      const url = await originalGetInitialURL();
      return shouldDeliverAppLink(url) ? url : null;
    }) as typeof Linking.getInitialURL,
  });

  Object.defineProperty(Linking, 'addEventListener', {
    configurable: true,
    value: ((type: 'url', handler: (event: { url: string }) => void) => originalAddEventListener(type, (event) => {
      if (shouldDeliverAppLink(event.url)) handler(event);
    })) as typeof Linking.addEventListener,
  });
}

installRecoveryLinkGuard();
