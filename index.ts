import { registerRootComponent } from 'expo';

import './src/auth/installRecoveryLinkGuard';
import App from './App';

// The auth deep-link guard is evaluated before App registers its Linking
// listeners. Unexpected veloquest:// hosts/paths and malformed recovery links
// therefore fail closed before session-mutating recovery handling can run.
registerRootComponent(App);
