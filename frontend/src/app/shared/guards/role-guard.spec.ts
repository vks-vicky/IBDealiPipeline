import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { roleGuard } from './role-guard';
import { AuthService } from '../../core/services/auth';

describe('roleGuard', () => {
  let authMock: any;
  let routerMock: any;

  beforeEach(() => {
    authMock = {
      getRole: vi.fn()
    };

    routerMock = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('should allow access when role matches', () => {
    authMock.getRole.mockReturnValue('ADMIN');

    const route = {
      data: { role: 'ADMIN' }
    } as any;

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as any)
    );

    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should block access and redirect when role does not match', () => {
    authMock.getRole.mockReturnValue('USER');

    const route = {
      data: { role: 'ADMIN' }
    } as any;

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as any)
    );

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/deals']);
  });
});
