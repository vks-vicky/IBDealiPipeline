import { HttpRequest } from '@angular/common/http';
import { jwtInterceptor } from './jwt-interceptor';
import { of } from 'rxjs';

describe('jwtInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should add Authorization header when token exists', () => {
    localStorage.setItem('accessToken', 'abc123');

    const req = new HttpRequest('GET', '/test');

    const next = vi.fn().mockReturnValue(of({}));

    jwtInterceptor(req, next);

    const interceptedReq = next.mock.calls[0][0] as HttpRequest<any>;

    expect(interceptedReq.headers.get('Authorization')).toBe('Bearer abc123');
  });

  it('should not modify request when token does not exist', () => {
    const req = new HttpRequest('GET', '/test');
    const next = vi.fn().mockReturnValue(of({}));

    jwtInterceptor(req, next);

    const interceptedReq = next.mock.calls[0][0] as HttpRequest<any>;

    expect(interceptedReq.headers.has('Authorization')).toBe(false);
  });
});
