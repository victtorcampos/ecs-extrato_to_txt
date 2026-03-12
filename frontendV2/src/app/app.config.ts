import { APP_INITIALIZER, ApplicationConfig, inject } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { cnpjInterceptor } from './core/interceptors/cnpj.interceptor';
import { SessionService } from './core/services/session.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([cnpjInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const session = inject(SessionService);
        return () => session.loadFromStorage();
      },
      multi: true,
    },
  ],
};
