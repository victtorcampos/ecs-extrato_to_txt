import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';

export const cnpjInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const cnpj = session.activeSession()?.cnpj;

  if (cnpj && req.url.includes('/api/')) {
    const cloned = req.clone({
      headers: req.headers.set('X-CNPJ', cnpj),
    });
    return next(cloned);
  }

  return next(req);
};
