import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    }).compileComponents();

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('should call login endpoint and store tokens', () => {
    const reqBody = { username: 'admin', password: 'pass' };

    service.login(reqBody).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(reqBody);

    req.flush({
      accessToken: 'a1',
      refreshToken: 'r1',
      role: 'ADMIN'
    });

    expect(localStorage.getItem('accessToken')).toBe('a1');
    expect(localStorage.getItem('refreshToken')).toBe('r1');
    expect(localStorage.getItem('role')).toBe('ADMIN');
  });

  it('should clear storage on logout', () => {
    localStorage.setItem('accessToken', 'x');
    service.logout();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('should detect logged in state', () => {
    expect(service.isLoggedIn()).toBe(false);
    localStorage.setItem('accessToken', 'token');
    expect(service.isLoggedIn()).toBe(true);
  });
});
