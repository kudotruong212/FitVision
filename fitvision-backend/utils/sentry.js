// utils/sentry.js
// Sentry error tracking integration

import * as Sentry from '@sentry/node';
import config from '../config/index.js';

let sentryInitialized = false;

export function initSentry() {
  if (!config.sentry.dsn) {
    return;
  }

  try {
    Sentry.init({
      dsn: config.sentry.dsn,
      environment: config.server.nodeEnv,
      tracesSampleRate: config.server.isProduction ? 0.1 : 1.0,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
      ],
    });
    sentryInitialized = true;
    console.log('✅ Sentry initialized');
  } catch (err) {
    console.error('Failed to initialize Sentry:', err.message);
  }
}

export function captureException(error, context = {}) {
  if (!sentryInitialized) return;
  
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message, level = 'info', context = {}) {
  if (!sentryInitialized) return;
  
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

export function setUser(user) {
  if (!sentryInitialized) return;
  
  Sentry.setUser({
    id: user._id?.toString(),
    email: user.email,
  });
}

export default Sentry;


